// Load test: ROOMS rooms x 4 players. Each host sends a small state diff every 150 ms
// (roughly a busy fight); guests measure delivery delay. Usage: node tools/loadtest.js [rooms] [seconds] [url]
import { io } from "socket.io-client";
import fs from "node:fs";
const ROOMS = Number(process.argv[2]) || 25, SECS = Number(process.argv[3]) || 20, URL = process.argv[4] || "http://localhost:3000";
const rid = (n) => Math.random().toString(36).slice(2, 2 + n).padEnd(n, "x");
const campaign = fs.existsSync("/home/claude/test/camp.json") ? JSON.parse(fs.readFileSync("/home/claude/test/camp.json", "utf8")) : { id: "k1", log: [] };
const lat = []; let sent = 0, recv = 0, fails = 0;
const conn = () => io(URL, { auth: { pid: "p_" + rid(10), token: rid(24) }, transports: ["websocket"], forceNew: true });
const ack = (s, ev, p) => new Promise(r => s.emit(ev, p, r));
const health = async () => (await fetch(URL + "/api/health")).json();
const h0 = await health();
const sockets = [];
for (let i = 0; i < ROOMS; i++) {
  const host = conn(); sockets.push(host);
  const r = await ack(host, "room:create", { name: "Host" + i, state: { v: 0, data: { ...campaign, id: "k" + i } } });
  if (!r?.ok) { fails++; continue; }
  for (let g = 0; g < 3; g++) {
    const s = conn(); sockets.push(s);
    s.on("state:patch", ({ ops }) => { recv++; const t = ops?.[0]?.v; if (typeof t === "number") lat.push(Date.now() - t); });
    const j = await ack(s, "room:join", { code: r.room.code, name: `G${i}-${g}` }); if (!j?.ok) fails++;
  }
  let v = 0;
  const timer = setInterval(() => { v++; sent++; host.emit("state:patch", { v, ops: [{ p: ["t"], v: Date.now() }, { p: ["log"], a: [{ id: "l" + v, kind: "sys", notes: [{ kind: "xp", text: "Round " + v }] }] }] }); }, 150);
  host.timer = timer;
}
console.log(`${ROOMS} rooms, ${sockets.length} connections open (${fails} failures). Running ${SECS}s…`);
await new Promise(r => setTimeout(r, SECS * 1000));
for (const s of sockets) { clearInterval(s.timer); }
await new Promise(r => setTimeout(r, 500));
const h1 = await health();
lat.sort((a, b) => a - b);
const pct = (q) => lat[Math.min(lat.length - 1, Math.floor(lat.length * q))];
console.log(`patches sent ${sent}, delivered ${recv} (expected ${sent * 3}) · delay avg ${Math.round(lat.reduce((a, b) => a + b, 0) / lat.length)} ms, p95 ${pct(0.95)} ms, max ${lat[lat.length - 1]} ms`);
console.log(`server: rooms ${h1.rooms}, online ${h1.online}, memory ${h0.memoryMB} → ${h1.memoryMB} MB`);
for (const s of sockets) s.close();
process.exit(0);
