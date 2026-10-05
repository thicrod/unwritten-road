// Problem reports from players: saved to Postgres (DATABASE_URL) or SAVES_DIR, always logged.
// Read them at /api/reports?key=ADMIN_KEY (set ADMIN_KEY in the server environment).
import express from "express";
import fs from "node:fs";
import path from "node:path";

let pool = null, file = null, seq = 0; const mem = []; const hits = new Map();
export async function initReports(p) {
  try {
    if (p) { pool = p; await pool.query("create table if not exists ur_reports (id serial primary key, at timestamptz not null default now(), data jsonb not null)"); }
    else if (process.env.SAVES_DIR) { fs.mkdirSync(process.env.SAVES_DIR, { recursive: true }); file = path.join(process.env.SAVES_DIR, "reports.jsonl"); }
  } catch (e) { console.warn("Reports store unavailable:", e.message); pool = null; }
}
const clip = (v, n) => String(v ?? "").slice(0, n);
export function reportsRouter() {
  const r = express.Router();
  r.use(express.json({ limit: "300kb" }));
  r.post("/", async (req, res) => {
    const now = Date.now(), l = (hits.get(req.ip) || []).filter(t => now - t < 600000);
    if (l.length >= 12) return res.status(429).json({ error: "Too many reports. Try again in a few minutes." }); l.push(now); hits.set(req.ip, l);
    const b = req.body || {};
    const d = { note: clip(b.note, 2000), kind: clip(b.kind || "report", 30), summary: b.summary && typeof b.summary === "object" ? b.summary : null,
      lastDM: b.lastDM && typeof b.lastDM === "object" ? { kind: clip(b.lastDM.kind, 30), ok: !!b.lastDM.ok, ms: Number(b.lastDM.ms) || null, raw: clip(b.lastDM.raw, 12000), prompt: clip(b.lastDM.prompt, 6000) } : null,
      checkup: Array.isArray(b.checkup) ? b.checkup.slice(0, 6) : null, ua: clip(req.headers["user-agent"], 200) };
    try {
      let id;
      if (pool) id = (await pool.query("insert into ur_reports (data) values ($1) returning id", [JSON.stringify(d)])).rows[0].id;
      else { id = ++seq; mem.unshift({ id, at: new Date().toISOString(), data: d }); mem.length = Math.min(mem.length, 100); if (file) fs.appendFileSync(file, JSON.stringify({ id, at: new Date().toISOString(), ...d }) + "\n"); }
      console.log(`[report] #${id} (${d.kind}) ${JSON.stringify(d.note).slice(0, 160)} · ${d.summary?.campaign || "?"}, day ${d.summary?.day ?? "?"}${d.lastDM ? ` · last DM reply ${d.lastDM.ok ? "parsed" : "FAILED TO PARSE"}` : ""}`);
      res.json({ id });
    } catch (e) { console.warn("report save failed:", e.message); res.status(500).json({ error: "Couldn't save the report." }); }
  });
  r.get("/", async (req, res) => {
    if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) return res.status(403).json({ error: "Set ADMIN_KEY on the server, then open /api/reports?key=YOUR_ADMIN_KEY" });
    if (pool) { const q = await pool.query("select id, at, data from ur_reports order by id desc limit 50"); return res.json(q.rows); }
    res.json(mem.slice(0, 50));
  });
  return r;
}
