// Co-op rooms over Socket.IO.
// One player's browser (the host) runs the game. It sends state changes here;
// the server keeps the latest copy and forwards changes to everyone else.
// If the host drops, another player is promoted and continues from that copy.
import { Server } from "socket.io";
import { apply } from "../shared/jpatch.js";
import { isAuthed } from "./auth.js";

const MAX_PLAYERS = 4;
const HOST_GRACE_MS = Number(process.env.HOST_GRACE_MS) || 20000;   // wait this long for a dropped host before handing over
const ROOM_IDLE_MS = 30 * 60 * 1000;                                  // close rooms nobody has been in for 30 min
const ROOMS_MAX = Number(process.env.ROOMS_MAX) || 300;                // memory guard
const CREATES_PER_10MIN = Number(process.env.ROOMS_PER_IP_10MIN) || 6;   // per IP
const createLog = new Map();
const clientIp = (socket) => String(socket.handshake.headers["x-forwarded-for"] || "").split(",")[0].trim() || socket.handshake.address;
function allowCreate(ip) { const now = Date.now(); const list = (createLog.get(ip) || []).filter(t => now - t < 600000); if (list.length >= CREATES_PER_10MIN) return false; list.push(now); createLog.set(ip, list); return true; }
export function roomStats() { let players = 0, online = 0; for (const r of rooms.values()) for (const p of r.players.values()) { players++; if (p.socketId) online++; } return { rooms: rooms.size, players, online }; }
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const rooms = new Map();

const newCode = () => { let c; do { c = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(""); } while (rooms.has(c)); return c; };
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

function summary(room) {
  const party = room.state?.data;
  const heroes = party ? (party.partyIds || []).map(id => party.characters?.[id]).filter(Boolean)
    .map(ch => ({ id: ch.id, name: ch.name, cls: ch.cls, level: ch.level, main: ch.id === party.activeCharId, player: !!ch.companion?.player })) : [];
  return { code: room.code, hostId: room.hostId, seats: room.seats, locked: room.locked, lobby: room.lobby, heroes, campaign: party?.name || room.lobby?.premise?.name || "",
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, connected: !!p.socketId, host: p.id === room.hostId })) };
}

function freeLobbySeat(room, pid) {
  if (room.lobby?.phase !== "setup") return;
  for (const s of room.lobby.seats) if (s.pid === pid && s.sid !== "s0") Object.assign(s, { pid: null, draft: null, hero: null, ready: false });
}

export function attachRooms(httpServer) {
  const io = new Server(httpServer, { maxHttpBufferSize: 3e6, pingInterval: 20000, pingTimeout: 25000 });
  const update = (room) => io.to(room.code).emit("room:update", summary(room));
  const socketOf = (room, pid) => { const p = room.players.get(pid); return p?.socketId ? io.sockets.sockets.get(p.socketId) : null; };

  function promoteHost(room) {
    const next = [...room.players.values()].filter(p => p.socketId && p.id !== room.hostId).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (!next) return false;
    room.hostId = next.id;
    io.to(room.code).emit("host:changed", { hostId: next.id });
    update(room);
    return true;
  }

  io.use((socket, next) => {
    if (!isAuthed(socket.handshake.headers.cookie)) return next(new Error("auth"));
    const { pid, token } = socket.handshake.auth || {};
    if (!/^p_[a-z0-9]{6,20}$/.test(pid || "") || !/^[a-z0-9]{16,40}$/.test(token || "")) return next(new Error("bad_auth"));
    socket.data.pid = pid; socket.data.token = token; next();
  });

  io.on("connection", (socket) => {
    const pid = socket.data.pid;
    const roomOf = () => rooms.get(socket.data.room);
    const isHost = (room) => room && room.hostId === pid;

    function enter(room, name, ack, extra = {}) {
      const existing = room.players.get(pid);
      if (existing && existing.token !== socket.data.token) return ack?.({ ok: false, error: "That player name is taken in this room." });
      if (!existing && room.players.size >= MAX_PLAYERS) return ack?.({ ok: false, error: `This room is full (${MAX_PLAYERS} players).` });
      const old = existing?.socketId && io.sockets.sockets.get(existing.socketId);
      if (old && old.id !== socket.id) old.disconnect(true);
      room.players.set(pid, { id: pid, token: socket.data.token, name: clean(name, 24) || existing?.name || "Adventurer", socketId: socket.id, joinedAt: existing?.joinedAt || Date.now() });
      if (room.hostGone && room.hostId === pid) { clearTimeout(room.hostGone); room.hostGone = null; }
      room.lastActive = Date.now();
      socket.join(room.code); socket.data.room = room.code;
      ack?.({ ok: true, room: summary(room), state: room.state, chat: room.chat, ...extra });
      update(room);
    }

    // simple per-socket flood guard for the chattier events
    let bucket = 30, lastFill = Date.now();
    const flood = () => { const now = Date.now(); bucket = Math.min(30, bucket + (now - lastFill) / 1000 * 15); lastFill = now; if (bucket < 1) return true; bucket--; return false; };

    socket.on("room:create", ({ name, state, lobby } = {}, ack) => {
      if (!lobby && (!state || typeof state.data !== "object")) return ack?.({ ok: false, error: "Start or load a campaign before hosting." });
      if (rooms.size >= ROOMS_MAX) return ack?.({ ok: false, error: "The server is full right now. Try again in a few minutes." });
      if (!allowCreate(clientIp(socket))) return ack?.({ ok: false, error: "Too many rooms created from your network. Wait a few minutes." });
      const old = roomOf(); if (old) leave(old);
      const room = { code: newCode(), hostId: pid, players: new Map(), seats: {}, locked: {}, chat: [], createdAt: Date.now(), lastActive: Date.now(),
        state: lobby ? null : { v: Number(state.v) || 0, data: state.data },
        lobby: lobby ? { phase: "setup", size: 4, premise: { name: "", tone: "Heroic", setting: "Classic kingdoms", difficulty: "standard", custom: "" },
          seats: [0, 1, 2, 3].map(i => ({ sid: "s" + i, kind: i < 2 ? "human" : "ai", tpl: null, lock: false, pid: i === 0 ? pid : null, draft: null, hero: null, ready: false })) } : { phase: "playing" } };
      rooms.set(room.code, room);
      enter(room, name, ack);
    });

    socket.on("room:join", ({ code, name } = {}, ack) => {
      const room = rooms.get(clean(code, 8).toUpperCase());
      if (!room) return ack?.({ ok: false, error: "No room with that code. Check it with the host." });
      enter(room, name, ack);
    });

    socket.on("room:rejoin", ({ code, name } = {}, ack) => {
      const room = rooms.get(clean(code, 8).toUpperCase());
      if (!room) return ack?.({ ok: false, closed: true, error: "That room has closed." });
      enter(room, room.players.get(pid)?.name || name, ack);   // after a server restart, players re-enter a restored room this way
    });

    // After a restart the server has forgotten every room. The host's browser still has the whole game,
    // so it recreates the room under the same code; everyone else rejoins it automatically.
    socket.on("room:restore", ({ code, name, state, seats, locked, lobby } = {}, ack) => {
      const c = clean(code, 8).toUpperCase(); if (!/^[A-Z0-9]{5}$/.test(c)) return ack?.({ ok: false });
      const existing = rooms.get(c); if (existing) return enter(existing, name, ack);
      if (rooms.size >= ROOMS_MAX) return ack?.({ ok: false, error: "The server is full right now." });
      const setup = lobby?.phase === "setup" && Array.isArray(lobby.seats);
      if (!setup && (!state || typeof state.data !== "object")) return ack?.({ ok: false });
      const strMap = (o) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([k, v]) => typeof k === "string" && (typeof v === "string" || v === true)).slice(0, 12));
      const room = { code: c, hostId: pid, players: new Map(), seats: strMap(seats), locked: strMap(locked), chat: [], createdAt: Date.now(), lastActive: Date.now(), restored: true,
        state: setup ? null : { v: Number(state.v) || 0, data: state.data },
        lobby: setup ? { phase: "setup", size: lobby.seats.length, premise: lobby.premise || {}, seats: lobby.seats.slice(0, MAX_PLAYERS).map((s, i) => ({ sid: "s" + i, kind: s.kind === "ai" ? "ai" : "human", tpl: s.tpl || null, lock: !!s.lock, pid: s.pid || null, draft: s.draft || null, hero: s.hero || null, ready: !!s.ready })) } : { phase: "playing" } };
      if (room.lobby.seats) room.lobby.seats[0].pid = pid;
      rooms.set(c, room); enter(room, name, ack);
    });

    function leave(room) {
      room.players.delete(pid); freeLobbySeat(room, pid);
      for (const [hero, owner] of Object.entries(room.seats)) if (owner === pid) delete room.seats[hero];
      socket.leave(room.code); socket.data.room = null;
      if (!room.players.size) { rooms.delete(room.code); return; }
      if (room.hostId === pid) promoteHost(room) || null;
      update(room);
    }
    socket.on("room:leave", () => { const room = roomOf(); if (room) leave(room); });

    // seats: which player controls which party member (unclaimed heroes stay AI)
    socket.on("seat:claim", ({ heroId } = {}, ack) => {
      const room = roomOf(); if (!room) return ack?.({ ok: false });
      const data = room.state?.data;
      if (!data?.partyIds?.includes(heroId) || heroId === data.activeCharId) return ack?.({ ok: false, error: "You can't take that hero." });
      if (room.seats[heroId] && room.seats[heroId] !== pid) return ack?.({ ok: false, error: "Someone else already controls that hero." });
      if (room.locked?.[heroId]) return ack?.({ ok: false, error: "The host has set that hero to AI only." });
      for (const [h, owner] of Object.entries(room.seats)) if (owner === pid) delete room.seats[h];
      room.seats[heroId] = pid; ack?.({ ok: true }); update(room);
    });
    socket.on("seat:release", ({ heroId } = {}) => {
      const room = roomOf(); if (!room) return;
      if (room.seats[heroId] === pid || isHost(room)) { delete room.seats[heroId]; update(room); }
    });
    socket.on("room:kick", ({ playerId } = {}) => {
      const room = roomOf(); if (!isHost(room) || playerId === pid) return;
      const s = socketOf(room, playerId); room.players.delete(playerId);
      for (const [h, owner] of Object.entries(room.seats)) if (owner === playerId) delete room.seats[h];
      freeLobbySeat(room, playerId);
      if (s){ s.emit("room:kicked"); s.leave(room.code); s.data.room = null; }
      update(room);
    });

    // ---- lobby (new co-op games): the host sets up seats, players create heroes or take over AI companions ----
    const inSetup = (room) => room?.lobby?.phase === "setup";
    socket.on("lobby:config", ({ size, seats, premise } = {}) => {
      const room = roomOf(); if (!isHost(room) || !inSetup(room)) return;
      const L = room.lobby; const n = Math.max(2, Math.min(MAX_PLAYERS, Number(size) || L.size));
      L.seats = Array.from({ length: n }, (_, i) => {
        const prev = L.seats[i] || { sid: "s" + i, pid: null, draft: null, hero: null, ready: false };
        const want = i === 0 ? "human" : (seats?.[i]?.kind === "ai" ? "ai" : seats?.[i]?.kind === "human" ? "human" : prev.kind || "human");
        const tpl = want === "ai" ? clean(seats?.[i]?.tpl ?? prev.tpl, 20) || null : null;
        const next = { ...prev, sid: "s" + i, kind: want, tpl, lock: want === "ai" && !!(seats?.[i]?.lock ?? prev.lock) };
        const kindChanged = prev.kind && prev.kind !== want, tplChanged = want === "ai" && prev.tpl !== tpl;
        if (i > 0 && prev.pid && (kindChanged || tplChanged || next.lock)) Object.assign(next, { pid: null, draft: null, hero: null, ready: false });
        return next;
      });
      if (premise && typeof premise === "object") L.premise = { name: clean(premise.name, 60), tone: clean(premise.tone, 30) || "Heroic", setting: clean(premise.setting, 40) || "Classic kingdoms",
        difficulty: ["story", "standard", "deadly"].includes(premise.difficulty) ? premise.difficulty : "standard", mode: premise.mode === "quick" ? "quick" : "campaign", custom: clean(premise.custom, 500) };
      update(room);
    });
    socket.on("lobby:pick", ({ sid, mode } = {}, ack) => {
      const room = roomOf(); if (!inSetup(room)) return ack?.({ ok: false });
      const seat = room.lobby.seats.find(s => s.sid === sid); if (!seat) return ack?.({ ok: false, error: "That seat no longer exists." });
      if (seat.pid && seat.pid !== pid) return ack?.({ ok: false, error: "Someone already took that seat." });
      if (mode === "create" && seat.kind !== "human") return ack?.({ ok: false, error: "That seat is played by the AI." });
      if (mode === "takeover" && (seat.kind !== "ai" || seat.lock || !seat.tpl)) return ack?.({ ok: false, error: "That companion can't be taken over." });
      if (room.lobby.seats[0].pid === pid && seat.sid !== "s0") return ack?.({ ok: false, error: "The host plays the first seat." });
      freeLobbySeat(room, pid);
      Object.assign(seat, { pid, draft: null, hero: null, ready: mode === "takeover" });
      ack?.({ ok: true }); update(room);
    });
    socket.on("lobby:draft", ({ draft } = {}, ack) => {
      const room = roomOf(); if (!inSetup(room)) return ack?.({ ok: false });
      const seat = room.lobby.seats.find(s => s.pid === pid && s.kind === "human"); if (!seat) return ack?.({ ok: false, error: "Pick a seat first." });
      let size = 0; try { size = JSON.stringify(draft).length; } catch {}
      if (!draft || typeof draft !== "object" || size > 30000 || typeof draft.name !== "string" || typeof draft.cls !== "string") return ack?.({ ok: false, error: "That hero couldn't be saved." });
      Object.assign(seat, { draft, hero: { name: clean(draft.name, 40), race: clean(draft.race, 20), cls: clean(draft.cls, 20) }, ready: true });
      ack?.({ ok: true }); update(room);
    });
    socket.on("lobby:release", () => { const room = roomOf(); if (!inSetup(room) || room.lobby.seats[0].pid === pid) return; freeLobbySeat(room, pid); update(room); });
    socket.on("lobby:start", ({ seatMap, locked } = {}) => {
      const room = roomOf(); if (!isHost(room) || !inSetup(room)) return;
      room.seats = {}; for (const [hero, owner] of Object.entries(seatMap || {})) if (room.players.has(owner)) room.seats[clean(hero, 40)] = owner;
      room.locked = {}; for (const [hero, v] of Object.entries(locked || {})) if (v) room.locked[clean(hero, 40)] = true;
      room.lobby = { phase: "playing" }; update(room);
    });
    // ---- during play: the host locks companions to AI or hands a new hero to a player ----
    socket.on("seat:lock", ({ heroId, lock } = {}) => {
      const room = roomOf(); if (!isHost(room)) return; room.locked = room.locked || {};
      if (lock){ room.locked[heroId] = true; delete room.seats[heroId]; } else delete room.locked[heroId];
      update(room);
    });
    socket.on("seat:assign", ({ heroId, playerId } = {}) => {
      const room = roomOf(); if (!isHost(room) || !room.players.has(playerId)) return;
      for (const [h, owner] of Object.entries(room.seats)) if (owner === playerId) delete room.seats[h];
      room.seats[clean(heroId, 40)] = playerId; delete room.locked?.[heroId]; update(room);
    });

    // game state: only the host may write
    socket.on("state:full", ({ v, data } = {}) => {
      const room = roomOf(); if (!isHost(room) || typeof data !== "object") return;
      room.state = { v: Number(v) || 0, data }; room.lastActive = Date.now();
      socket.to(room.code).emit("state:full", room.state); update(room);
    });
    socket.on("state:patch", ({ v, ops } = {}) => {
      const room = roomOf(); if (!isHost(room) || !Array.isArray(ops)) return;
      if (!room.state || v !== room.state.v + 1) { socket.emit("state:resend"); return; }
      try { room.state.data = apply(room.state.data, ops); room.state.v = v; } catch { socket.emit("state:resend"); return; }
      room.lastActive = Date.now();
      socket.to(room.code).emit("state:patch", { v, ops });
      if (ops.some(o => o.p[0] === "partyIds" || o.p[0] === "characters" && o.p.length <= 3)) update(room);
    });
    socket.on("state:need", (_, ack) => { const room = roomOf(); if (room) ack?.(room.state); });

    // moments everyone should see: dice rolls, travel scenes, the DM "typing"
    for (const ev of ["ui:overlay", "ui:journey", "ui:busy"]) {
      socket.on(ev, (payload) => { const room = roomOf(); if (!isHost(room)) return; (ev === "ui:busy" ? socket.to(room.code).volatile : socket.to(room.code)).emit(ev, payload); });
    }
    // the host's game answers one player (e.g. "Not enough gold" after their purchase)
    socket.on("toast:to", ({ to, text, kind } = {}) => { const room = roomOf(); if (!isHost(room)) return; socketOf(room, to)?.emit("toast", { text: clean(text, 200), kind: clean(kind, 10) }); });
    // player intents go to the host, who decides what happens (used for co-op turns)
    socket.on("intent", (intent) => { if (flood()) return; const room = roomOf(); if (!room || isHost(room)) return; socketOf(room, room.hostId)?.emit("intent", { from: pid, intent }); });

    // out-of-character party chat (kept for late joiners, not seen by the DM)
    let lastChat = 0;
    socket.on("chat", ({ text } = {}) => {
      const room = roomOf(); const t = clean(text, 300); if (!room || !t || Date.now() - lastChat < 400) return; lastChat = Date.now();
      const msg = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), pid, name: room.players.get(pid)?.name || "Player", text: t, at: Date.now() };
      room.chat.push(msg); if (room.chat.length > 50) room.chat.shift();
      io.to(room.code).emit("chat", msg);
    });

    socket.on("disconnect", () => {
      const room = roomOf(); if (!room) return;
      const p = room.players.get(pid); if (!p || p.socketId !== socket.id) return;
      p.socketId = null; room.lastActive = Date.now(); update(room);
      if (room.hostId === pid && !room.hostGone) room.hostGone = setTimeout(() => { room.hostGone = null; if (!room.players.get(room.hostId)?.socketId) promoteHost(room); }, HOST_GRACE_MS);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      const anyone = [...room.players.values()].some(p => p.socketId);
      if (!anyone && now - room.lastActive > ROOM_IDLE_MS) rooms.delete(code);
    }
  }, 60 * 1000).unref();
  return io;
}
