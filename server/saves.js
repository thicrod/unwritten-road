// Cloud saves: campaigns stored under a private save code, so players can continue on any device.
// Uses Postgres when DATABASE_URL is set (e.g. a free Neon database), or JSON files in SAVES_DIR (local testing).
import express from "express";
import fs from "node:fs";
import path from "node:path";

let mode = null, pool = null, dir = null;
const okCode = (c) => /^[a-z0-9]{12,40}$/.test(c || "");
const okId = (i) => /^[A-Za-z0-9_-]{1,80}$/.test(i || "");
const writes = new Map();
function allowWrite(ip){ const now = Date.now(), l = (writes.get(ip) || []).filter(t => now - t < 600000); if (l.length >= 300) return false; l.push(now); writes.set(ip, l); return true; }

export async function initSaves(injectedPool){
  if (injectedPool || process.env.DATABASE_URL){
    if (injectedPool) pool = injectedPool;
    else { const { default: pg } = await import("pg"); const url = process.env.DATABASE_URL; pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 4 }); }
    await pool.query("create table if not exists ur_saves (code text not null, id text not null, data jsonb not null, updated_at timestamptz not null default now(), primary key (code, id))");
    mode = "postgres";
  } else if (process.env.SAVES_DIR){ dir = process.env.SAVES_DIR; fs.mkdirSync(dir, { recursive: true }); mode = "files"; }
  return mode;
}
export const savesEnabled = () => !!mode;
export const savesPool = () => pool;
async function getDoc(code, id){
  if (mode === "postgres"){ const r = await pool.query("select data from ur_saves where code = $1 and id = $2", [code, id]); return r.rows[0]?.data ?? null; }
  const f = path.join(dir, code, id + ".json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
}
async function setDoc(code, id, data){
  if (mode === "postgres"){ await pool.query("insert into ur_saves (code, id, data, updated_at) values ($1, $2, $3, now()) on conflict (code, id) do update set data = excluded.data, updated_at = now()", [code, id, JSON.stringify(data)]); return; }
  fs.mkdirSync(path.join(dir, code), { recursive: true }); fs.writeFileSync(path.join(dir, code, id + ".json"), JSON.stringify(data));
}
async function delDoc(code, id){
  if (mode === "postgres"){ await pool.query("delete from ur_saves where code = $1 and id = $2", [code, id]); return; }
  const f = path.join(dir, code, id + ".json"); if (fs.existsSync(f)) fs.unlinkSync(f);
}
export function savesRouter(){
  const r = express.Router();
  r.use(express.json({ limit: "3mb" }));
  r.get("/status", (req, res) => res.json({ enabled: savesEnabled(), mode }));
  r.use("/:code/:id", (req, res, next) => { if (!mode) return res.status(503).json({ error: "Cloud saves aren't set up on this server." }); if (!okCode(req.params.code) || !okId(req.params.id)) return res.status(400).json({ error: "Bad save code." }); next(); });
  r.get("/:code/:id", async (req, res) => { try { const d = await getDoc(req.params.code, req.params.id); if (d == null) return res.status(404).json({ error: "Not found" }); res.json({ data: d }); } catch (e) { console.warn("save get", e.message); res.status(500).json({ error: "Load failed" }); } });
  r.put("/:code/:id", async (req, res) => {
    if (!allowWrite(req.ip)) return res.status(429).json({ error: "Too many saves. Slow down." });
    if (!req.body || typeof req.body.data !== "object") return res.status(400).json({ error: "Missing data" });
    try { await setDoc(req.params.code, req.params.id, req.body.data); res.json({ ok: true }); } catch (e) { console.warn("save set", e.message); res.status(500).json({ error: "Save failed" }); }
  });
  r.delete("/:code/:id", async (req, res) => { try { await delDoc(req.params.code, req.params.id); res.json({ ok: true }); } catch { res.status(500).json({ error: "Delete failed" }); } });
  return r;
}
