// Online co-op client (website only).
// The host's browser runs the game and sends small state diffs to the server;
// guests apply them and see everything live (read-only until co-op turns arrive).
(function () {
  const LS = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const rid = (n) => { const a = "abcdefghijkmnpqrstuvwxyz23456789"; let s = ""; for (const x of crypto.getRandomValues(new Uint8Array(n))) s += a[x % a.length]; return s; };
  const me = { id: LS.get("ur:pid") || "", token: LS.get("ur:ptoken") || "", name: LS.get("ur:pname") || "" };
  if (!/^p_[a-z0-9]{6,20}$/.test(me.id)) { me.id = "p_" + rid(10); LS.set("ur:pid", me.id); }
  if (!/^[a-z0-9]{16,40}$/.test(me.token)) { me.token = rid(24); LS.set("ur:ptoken", me.token); }

  const Net = window.Net = {
    me, socket: null, room: null, v: 0, status: "offline", orig: {}, applying: false,
    // actions any player may take; the value is what the acting player's own screen does right after
    CALLS: { enterDungeon: "map", moveToRoom: null, leaveDungeon: null, searchRoom: null, restInDungeon: null, engageRoom: null, craft: null, forage: null,
      openShop: "shop", shopBuy: null, shopSell: null, castOutOfCombat: "close", useItemOutOfCombat: "close", doShortRest: "close",
      innRest: "close", innRumors: "close", recruitAt: "close", templeHeal: null, templeCure: null, templeRaise: "close", refreshBoard: null, takeBounty: null,
      gearEquip: null, gearUnequip: null, gearGive: null, gearDrop: null, partySet: null, applyUpgrade: null, applyHeroLevelUp: "close" },
    lastSnap: null, lastRef: null, timer: null, busyTimer: null, lastBusy: null, lastStream: null, inited: false,
    isOnline() { return !!this.room; },
    isHost() { return !!this.room && this.room.hostId === me.id; },
    isGuest() { return !!this.room && this.room.hostId !== me.id; },
    seatOwner(heroId) { return this.room?.seats?.[heroId] || null; },
    mySeat() { return Object.entries(this.room?.seats || {}).find(([, p]) => p === me.id)?.[0] || null; },
    playerName(pid) { return this.room?.players?.find(p => p.id === pid)?.name || "a player"; },
    // who controls this hero right now: a player id, or null for the AI (heroes whose player dropped go to the AI)
    controllerOf(c, cb) {
      if (!this.room || !cb || cb.kind !== "pc") return null;
      const on = (pid) => this.room.players.some(p => p.id === pid && p.connected);
      if (cb.main || cb.ref === c?.activeCharId) return this.room.hostId;
      const pid = this.room.seats?.[cb.ref]; if (pid) return on(pid) ? pid : null;
      return c?.characters?.[cb.ref]?.companion?.ctrl === "manual" ? this.room.hostId : null;
    },
    intent(it) { this.socket?.emit("intent", it); },
    chatSend(text) { this.socket?.emit("chat", { text }); },
    hostName() { return this.room ? this.playerName(this.room.hostId) : ""; },
    notify() { store.set({ online: this.room ? { ...this.room, me: me.id, status: this.status, host: this.isHost() } : (this.status === "offline" ? null : { status: this.status }) }); },

    init() {
      if (this.inited) return; this.inited = true;
      // Guests never change the game themselves: the host's browser is the single source of truth.
      const camp0 = store.camp.bind(store);
      store.camp = (fn) => (this.isGuest() && !this.applying) ? undefined : camp0(fn);
      // A guest's own turn, roll or typed action is sent to the host, who checks it and runs it.
      for (const name of ["pcAttack", "pcCast", "pcAbility", "pcBasic", "pcMove", "pcRunAway", "pcUseItem", "pcDeathSave", "pcCustom", "endPlayerTurn", "pcShove"]) {
        const f = window[name]; if (typeof f !== "function") continue; this.orig[name] = f;
        window[name] = function (...a) {
          if (!Net.isGuest()) return f.apply(this, a);
          // buttons pass click events straight in (onClick={endPlayerTurn}); send only plain data
          const args = a.filter(x => !(x && typeof x === "object" && ("nativeEvent" in x || x instanceof Event)));
          let safe = []; try { safe = JSON.parse(JSON.stringify(args)); } catch {}
          Net.intent({ type: "combat", fn: name, args: safe });
        };
      }
      const rd = window.runDM; this.orig.runDM = rd;
      window.runDM = function (kind, payload) { if (Net.isGuest()) { if (kind === "action" && payload?.text) Net.intent({ type: "action", text: payload.text, mode: payload.mode }); return; } return rd.apply(this, arguments); };
      const pr = window.doPendingRoll; this.orig.doPendingRoll = pr;
      window.doPendingRoll = function (opt) { if (Net.isGuest()) { Net.intent({ type: "roll" }); return; } return pr.apply(this, arguments); };
      // Shared actions (shop, inn, temple, board, dungeon, crafting, gear…) run on the host for everyone.
      for (const [name, after] of Object.entries(this.CALLS)) {
        const f = window[name]; if (typeof f !== "function") continue; this.orig[name] = f;
        window[name] = function (...a) {
          if (!Net.isGuest()) return f.apply(this, a);
          const args = a.filter(x => !(x && typeof x === "object" && ("nativeEvent" in x || x instanceof Event)));
          let safe = []; try { safe = JSON.parse(JSON.stringify(args)); } catch {}
          Net.intent({ type: "call", fn: name, args: safe });
          if (after === "close") closeModal(); else if (after === "shop") openModal({ type: "shop" }); else if (after === "map") store.set({ tab: "map" });
        };
      }
      for (const name of ["combatLoop", "beginTravel", "startCombat", "leaveCombat", "saveNow", "scheduleSave", "resolveEvent", "requestRest", "loadCheckpoint"]) {
        const f = window[name]; if (typeof f !== "function") continue; this.orig[name] = f;
        window[name] = function (...a) { return Net.isGuest() ? undefined : f.apply(this, a); };
      }
      // Moments everyone should see: dice rolls and travel scenes.
      for (const [name, ev] of [["showRoll", "ui:overlay"], ["playJourney", "ui:journey"]]) {
        const f = window[name]; if (typeof f !== "function") continue; this.orig[name] = f;
        window[name] = function (o) { if (Net.isHost() && Net.socket?.connected) Net.socket.emit(ev, o); return f.apply(this, arguments); };
      }
      store.subs.add(() => this.onStore());
      setInterval(() => { try { if (this.isHost()) Coop.tick(); } catch (e) { console.warn(e); } }, 1000);
      const code = (new URLSearchParams(location.search).get("room") || "").toUpperCase(), saved = LS.get("ur:room");
      if (saved && (!code || code === saved)) this.rejoin(saved).then(r => { if (!r.ok && code) openModal({ type: "online", join: code }); });
      else if (code) setTimeout(() => openModal({ type: "online", join: code }), 400);
    },

    connect() {
      if (this.socket) return this.socket;
      const s = this.socket = io({ auth: { pid: me.id, token: me.token } });
      s.on("connect", () => { this.status = "connected"; if (this.room) this.rejoin(this.room.code, true); this.notify(); });
      s.on("disconnect", () => { this.status = this.room ? "reconnecting" : "offline"; this.notify(); });
      s.on("connect_error", (err) => { if (err?.message === "auth") { location.reload(); return; } this.status = this.room ? "reconnecting" : "error"; this.notify(); });
      s.on("toast", ({ text, kind }) => { if (text) toast(String(text).slice(0, 200), kind === "bad" ? "bad" : kind === "gold" ? "gold" : undefined); });
      s.on("server:restart", () => { toast("The server is restarting. You'll reconnect automatically in a moment."); if (this.isHost()) window.saveNow?.(); });
      s.on("room:update", (r) => { const was = this.isHost(); this.room = r; if (!this.inLobby()) this.starting = false; this.remember(); if (!was && this.isHost() && !this.inLobby()) this.becomeHost();
        if (this.inLobby() && !["lobby", "create"].includes(S().view)) store.set({ view: "lobby" });
        this.notify(); });
      s.on("room:kicked", () => { this.leaveLocal(); toast("The host removed you from the room.", "bad"); });
      s.on("host:changed", ({ hostId }) => { if (hostId !== me.id) toast(`${this.playerName(hostId)} is now the host.`); });
      s.on("state:full", (st) => { if (this.isGuest()) this.applyState(st); });
      s.on("state:patch", ({ v, ops }) => {
        if (!this.isGuest()) return;
        if (v !== this.v + 1 || !C()) return this.resync();
        try { const c = JPatch.apply(structuredClone(C()), ops); this.v = v; this.setCampaign(c); } catch { this.resync(); }
      });
      s.on("state:resend", () => { if (this.isHost()) this.sendFull(); });
      s.on("ui:overlay", (o) => { if (this.isGuest()) this.orig.showRoll?.(o); });
      s.on("ui:journey", (j) => { if (this.isGuest()) this.orig.playJourney?.(j); });
      s.on("ui:busy", (b) => { if (this.isGuest()) store.set({ busy: b.busy, stream: b.stream || "" }); });
      s.on("intent", ({ from, intent }) => { if (this.isHost()) { try { Coop.handle(from, intent); } catch (e) { console.warn("intent failed", e); } } });
      s.on("chat", (m) => { const open = S().chatOpen; store.set({ chat: [...(S().chat || []), m].slice(-60), chatUnread: open || m.pid === me.id ? 0 : (S().chatUnread || 0) + 1 }); if (!open && m.pid !== me.id) toast(`💬 ${m.name}: ${m.text.slice(0, 80)}`); });
      return s;
    },
    ack(ev, payload) { return new Promise((res) => { const s = this.connect(); const t = setTimeout(() => res({ ok: false, error: "The server didn't answer. Check your connection." }), 8000); s.emit(ev, payload, (r) => { clearTimeout(t); res(r || { ok: false }); }); }); },

    async create(name) {
      if (!C()) return { ok: false, error: "Start or continue a campaign first." };
      this.setName(name); const data = structuredClone(C());
      const r = await this.ack("room:create", { name, state: { v: 0, data } });
      if (r.ok) { this.enter(r); this.lastSnap = data; this.lastRef = C(); this.v = r.state?.v || 0; }
      return r;
    },
    async createLobby(name) {
      this.setName(name);
      const r = await this.ack("room:create", { name, lobby: true });
      if (r.ok) this.enter(r);
      return r;
    },
    lobbyConfig(cfg) { this.socket?.emit("lobby:config", cfg); },
    lobbyPick(sid, mode) { return this.ack("lobby:pick", { sid, mode }); },
    lobbyDraft(draft) { return this.ack("lobby:draft", { draft }); },
    lobbyRelease() { this.socket?.emit("lobby:release"); },
    lock(heroId, lock) { this.socket?.emit("seat:lock", { heroId, lock }); },
    assignSeat(heroId, playerId) { this.socket?.emit("seat:assign", { heroId, playerId }); },
    inLobby() { return this.room?.lobby?.phase === "setup"; },
    async join(code, name) {
      this.setName(name);
      const r = await this.ack("room:join", { code: String(code || "").trim().toUpperCase(), name });
      if (r.ok) this.enter(r);
      return r;
    },
    async rejoin(code, quiet) {
      let r = await this.ack("room:rejoin", { code, name: me.name });
      // the server restarted and forgot the room: if we hosted it, bring it back under the same code
      if (!r.ok && r.closed && this.canRestore(code)) r = await this.restore(code);
      if (r.ok) { this.retryUntil = 0; this.enter(r); return r; }
      // guests wait a while for the host to restore the room
      if (r.closed && LS.get("ur:room") === code) {
        if (!this.retryUntil) this.retryUntil = Date.now() + 120000;
        if (Date.now() < this.retryUntil) { this.status = "reconnecting"; this.notify(); setTimeout(() => { if (LS.get("ur:room") === code) this.rejoin(code, true); }, 4000); return r; }
        this.retryUntil = 0; toast("The room has closed.", "bad");
      }
      if (!quiet || !this.room || r.closed) { const wasGuest = this.isGuest(); LS.set("ur:room", null); this.room = null; if (wasGuest) store.set({ campaign: null, view: "home" }); this.notify(); }
      return r;
    },
    // what the host needs to rebuild a room after a server restart
    remember() {
      if (!this.room) return;
      const last = { code: this.room.code, seats: this.room.seats, locked: this.room.locked, lobby: this.room.lobby, host: this.isHost(), campaignId: C()?.id || null };
      LS.set("ur:lastroom", JSON.stringify(last));
    },
    canRestore(code) { try { const last = JSON.parse(LS.get("ur:lastroom") || "null"); return !!last && last.code === code && last.host && (last.lobby?.phase === "setup" || (C() && C().id === last.campaignId)); } catch { return false; } },
    async restore(code) {
      const last = JSON.parse(LS.get("ur:lastroom") || "{}");
      const setup = last.lobby?.phase === "setup";
      const r = await this.ack("room:restore", { code, name: me.name, seats: last.seats, locked: last.locked, lobby: setup ? last.lobby : null, state: setup ? null : { v: this.v, data: structuredClone(C()) } });
      if (r.ok) { toast("Room restored after a server restart."); this.lastSnap = setup ? null : structuredClone(C()); this.lastRef = C(); }
      return r;
    },
    enter(r) {
      this.room = r.room; LS.set("ur:room", r.room.code); this.status = "connected";
      if (Array.isArray(r.chat)) store.set({ chat: r.chat });
      if (new URLSearchParams(location.search).has("room")) history.replaceState(null, "", location.pathname);
      if (this.inLobby()) { if (S().view !== "create") store.set({ view: "lobby", campaign: this.isHost() ? S().campaign : null }); }
      else if (r.state?.data && (this.isGuest() || !C() || C().id !== r.state.data.id)) this.applyState(r.state);
      if (this.isHost() && !this.inLobby()) { this.v = r.state?.v || this.v; this.lastSnap = structuredClone(C()); this.lastRef = C(); }
      if (this.isHost() && this.inLobby()) { this.v = 0; this.lastSnap = null; this.lastRef = null; }
      this.remember();
      this.notify();
    },
    leave() { this.socket?.emit("room:leave"); LS.set("ur:lastroom", null); this.leaveLocal(); },
    leaveLocal() {
      const wasGuest = this.isGuest(); this.room = null; LS.set("ur:room", null); this.status = this.socket?.connected ? "connected" : "offline"; store.set({ chat: [], chatOpen: false, chatUnread: 0 });
      if (wasGuest) store.set({ campaign: null, view: "home", busy: null, stream: "", modal: null });
      this.notify();
    },
    claim(heroId) { return this.ack("seat:claim", { heroId }); },
    release(heroId) { this.socket?.emit("seat:release", { heroId }); },
    kick(playerId) { this.socket?.emit("room:kick", { playerId }); },
    setName(n) { me.name = String(n || "").trim().slice(0, 24) || me.name || "Adventurer"; LS.set("ur:pname", me.name); },
    inviteLink() { return this.room ? `${location.origin}/?room=${this.room.code}` : ""; },

    // --- receiving (guests) ---
    applyState(st) { const first = !C() || C().id !== st.data?.id; this.v = st.v || 0; this.setCampaign(migrate(structuredClone(st.data))); if (first && this.isGuest()) window.maybeRecap?.(); },
    setCampaign(c) {
      this.applying = true;
      try { const view = ["home", "lobby"].includes(S().view) ? { view: "game", tab: c.combat ? "combat" : "adventure" } : {}; store.set({ campaign: c, ...view }); }
      finally { this.applying = false; }
    },
    async resync() { const st = await this.ack("state:need", {}); if (st?.data) this.applyState(st); },

    // --- sending (host) ---
    onStore() {
      if (!this.isHost() || !this.socket?.connected) return;
      const c = S().campaign;
      if (c && c !== this.lastRef) { this.lastRef = c; if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 90); }
      const b = S().busy, st = S().stream;
      if ((b !== this.lastBusy || st !== this.lastStream) && !this.busyTimer) this.busyTimer = setTimeout(() => {
        this.busyTimer = null; this.lastBusy = S().busy; this.lastStream = S().stream;
        this.socket.emit("ui:busy", { busy: S().busy, stream: S().stream });
      }, 150);
    },
    flush() {
      const c = S().campaign; if (!c || !this.isHost()) return;
      if (this.inLobby() && !this.starting) return;          // nothing is shared until the lobby starts the game
      if (!this.lastSnap || this.lastSnap.id !== c.id) return this.sendFull();
      const ops = JPatch.diff(this.lastSnap, c); if (!ops.length) return;
      this.v++; this.socket.emit("state:patch", { v: this.v, ops }); this.lastSnap = structuredClone(c);
    },
    sendFull() { const c = S().campaign; if (!c) return; this.v++; const data = structuredClone(c); this.socket.emit("state:full", { v: this.v, data }); this.lastSnap = data; this.lastRef = c; },
    becomeHost() {
      toast("You're now the host: the game runs in your browser.", "gold");
      this.lastSnap = structuredClone(C()); this.lastRef = C();
      store.set({ busy: null, stream: "", overlay: null });
      if (C()?.combat?.status === "active") setTimeout(() => window.combatLoop?.(), 400);
      window.saveNow?.();
    }
  };
})();
