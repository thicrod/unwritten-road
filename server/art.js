// Optional AI scene art: one image per place, generated once with SCENE_ART_MODEL (a Gemini image model)
// and shared by every player. Without SCENE_ART_MODEL the game shows its built-in illustrated scenes.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";

const MODEL = process.env.SCENE_ART_MODEL || "", KEY = process.env.GEMINI_API_KEY || "";
const BASE = (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const MAX_DAY = Number(process.env.SCENE_ART_MAX_PER_DAY) || 20;
const mem = new Map(), inflight = new Map(); let day = "", made = 0, dir = null;
export const artEnabled = () => !!(MODEL && KEY);
export function initArt(){ if (!artEnabled()) return null; if (process.env.SAVES_DIR){ dir = path.join(process.env.SAVES_DIR, "art"); fs.mkdirSync(dir, { recursive: true }); } return { model: MODEL, perDay: MAX_DAY }; }
function load(id){ if (mem.has(id)) return mem.get(id); if (dir){ const f = path.join(dir, id + ".bin"); if (fs.existsSync(f)){ const v = JSON.parse(fs.readFileSync(f + ".json", "utf8")); const img = { mime: v.mime, buf: fs.readFileSync(f) }; mem.set(id, img); return img; } } return null; }
async function generate(id, prompt){
  const today = new Date().toISOString().slice(0, 10); if (day !== today){ day = today; made = 0; }
  if (made >= MAX_DAY) throw new Error("daily art limit reached");
  const r = await fetch(`${BASE}/models/${encodeURIComponent(MODEL)}:generateContent?key=${KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(45000),
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }) });
  if (!r.ok){ let m = r.statusText; try { m = (await r.json()).error?.message || m; } catch {} throw new Error(`${r.status} ${m}`); }
  const j = await r.json(); const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
  if (!part) throw new Error("no image in the reply");
  const img = { mime: part.inlineData.mimeType || "image/png", buf: Buffer.from(part.inlineData.data, "base64") };
  made++; mem.set(id, img); if (dir){ fs.writeFileSync(path.join(dir, id + ".bin"), img.buf); fs.writeFileSync(path.join(dir, id + ".bin.json"), JSON.stringify({ mime: img.mime })); }
  console.log(`[art] generated ${id} (${Math.round(img.buf.length / 1024)} KB, ${made}/${MAX_DAY} today)`); return img;
}
export function artRouter(){
  const r = express.Router(); r.use(express.json({ limit: "20kb" }));
  r.post("/", async (req, res) => {
    if (!artEnabled()) return res.status(404).json({ error: "off" });
    const key = String(req.body?.key || "").slice(0, 200), desc = String(req.body?.desc || "").slice(0, 600); if (!key) return res.status(400).json({ error: "key" });
    const id = crypto.createHash("sha256").update(MODEL + "|" + key).digest("hex").slice(0, 24);
    if (load(id)) return res.json({ url: `/api/art/${id}` });
    const prompt = `A painterly fantasy illustration for a tabletop role-playing game, wide landscape banner, no text, no letters, no borders. Scene: ${desc}. Warm storybook colors, atmospheric lighting, rich detail.`;
    try { if (!inflight.has(id)) inflight.set(id, generate(id, prompt).finally(() => inflight.delete(id))); await inflight.get(id); res.json({ url: `/api/art/${id}` }); }
    catch (e) { console.warn(`[art] failed: ${e.message}`); res.status(502).json({ error: "unavailable" }); }
  });
  r.get("/:id", (req, res) => { const img = load(String(req.params.id).replace(/[^a-f0-9]/g, "")); if (!img) return res.status(404).end(); res.set({ "Content-Type": img.mime, "Cache-Control": "public, max-age=86400" }); res.end(img.buf); });
  return r;
}
