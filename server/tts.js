// DM voice: ElevenLabs text-to-speech, generated once per narration and shared with every player.
// Config: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, optional ELEVENLABS_MAX_CHARS_PER_MONTH.
// The key never leaves the server. Failures, timeouts, quota errors and the monthly cap all mean
// "fallback": players hear their browser's built-in voice instead, and the server logs why.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const E = process.env;
const KEY = E.ELEVENLABS_API_KEY || "", VOICE = E.ELEVENLABS_VOICE_ID || "";
const BASE = (E.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").replace(/\/$/, "");
const MODEL = "eleven_flash_v2_5", FORMAT = E.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_64";
const CAP = Number(E.ELEVENLABS_MAX_CHARS_PER_MONTH) || 0;          // 0 = no cap of our own
const MAX_TEXT = 2500, CACHE_BYTES = 40 * 1024 * 1024, CONCURRENCY = 2, TIMEOUT_MS = Number(E.ELEVENLABS_TIMEOUT_MS) || 15000;

const cache = new Map();            // id -> { text, chunks, bytes, done, failed, subs:Set, at }
let cacheBytes = 0, active = 0; const waiting = [];
let usage = { month: monthKey(), chars: 0 }, quotaMonth = null, pool = null, usageFile = null;

function monthKey(){ return new Date().toISOString().slice(0, 7); }
export const ttsConfigured = () => !!(KEY && VOICE);
export const ttsStatus = () => ({ enabled: ttsConfigured(), month: usage.month, chars: usage.chars, cap: CAP || null, fallback: !!fallbackReason() });

// Narration only, as plain speech: no markdown, emoji, bracketed tags or the game-state block.
export function cleanForSpeech(t){
  return String(t || "")
    .replace(/<{2,3}\s*STATE[\s\S]*$/i, "")
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "").replace(/^\s*[-*•]\s+/gm, "").replace(/^\s*>\s?/gm, "")
    .replace(/\*\*|__|\*|_|`|~~/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\[[^\]]*\]/g, "")
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, "")
    .replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}
function rollMonth(){ const m = monthKey(); if (usage.month !== m){ usage = { month: m, chars: 0 }; quotaMonth = null; } }
function fallbackReason(){
  rollMonth();
  if (!ttsConfigured()) return "not_configured";
  if (quotaMonth === usage.month) return "quota_exceeded";
  if (CAP && usage.chars >= CAP) return "monthly_cap";
  return null;
}
async function saveUsage(){
  try {
    if (pool) await pool.query("insert into ur_tts_usage (month, chars) values ($1, $2) on conflict (month) do update set chars = excluded.chars", [usage.month, usage.chars]);
    else if (usageFile) fs.writeFileSync(usageFile, JSON.stringify(usage));
  } catch (e) { console.warn("[tts] couldn't save usage:", e.message); }
}
// Restore this month's running total after a restart (Postgres or SAVES_DIR), then reconcile with ElevenLabs.
export async function initTTS(dbPool){
  if (!ttsConfigured()) return null;
  try {
    if (dbPool){ pool = dbPool; await pool.query("create table if not exists ur_tts_usage (month text primary key, chars integer not null)"); const r = await pool.query("select chars from ur_tts_usage where month = $1", [usage.month]); if (r.rows[0]) usage.chars = r.rows[0].chars; }
    else if (E.SAVES_DIR){ usageFile = path.join(E.SAVES_DIR, "tts-usage.json"); if (fs.existsSync(usageFile)){ const u = JSON.parse(fs.readFileSync(usageFile, "utf8")); if (u.month === usage.month) usage.chars = u.chars; } }
  } catch (e) { console.warn("[tts] usage store unavailable:", e.message); }
  try {
    const r = await fetch(`${BASE}/v1/user/subscription`, { headers: { "xi-api-key": KEY }, signal: AbortSignal.timeout(8000) });
    if (r.ok){ const s = await r.json(); console.log(`[tts] ElevenLabs account: ${s.character_count ?? "?"} of ${s.character_limit ?? "?"} credits used this period`); }
  } catch {}
  return { voice: VOICE, model: MODEL, cap: CAP, used: usage.chars };
}
function evict(){
  for (const [id, e] of [...cache.entries()].sort((a, b) => a[1].at - b[1].at)){ if (cacheBytes <= CACHE_BYTES) break; if (!e.done || e.subs.size) continue; cacheBytes -= e.bytes; cache.delete(id); }
}
function runQueued(){ while (active < CONCURRENCY && waiting.length){ active++; const job = waiting.shift(); job().finally(() => { active--; runQueued(); }); } }
function finish(e, failed){ e.done = true; e.failed = failed; for (const r of e.subs){ try { r.end(); } catch {} } e.subs.clear(); }
async function generate(id, e, lang){
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/v1/text-to-speech/${encodeURIComponent(VOICE)}/stream?output_format=${FORMAT}`, {
      method: "POST", signal: ctl.signal,
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: e.text, model_id: MODEL, ...(lang ? { language_code: lang } : {}) }),
    });
    if (!res.ok){
      let status = String(res.status), msg = ""; try { const j = await res.json(); status = j?.detail?.status || status; msg = j?.detail?.message || ""; } catch {}
      if (status === "quota_exceeded"){ quotaMonth = usage.month; }
      console.warn(`[tts] ElevenLabs failed (${status}) ${msg}`.trim()); return finish(e, true);
    }
    const reader = res.body.getReader();
    for (;;){
      const { value, done } = await reader.read(); if (done) break;
      clearTimeout(timer);                                      // the timeout covers waiting for audio to start
      const b = Buffer.from(value); e.chunks.push(b); e.bytes += b.length; cacheBytes += b.length;
      for (const r of e.subs){ try { r.write(b); } catch {} }
    }
    usage.chars += e.text.length; saveUsage();
    console.log(`[tts] ${e.text.length} chars · ${usage.month} total ${usage.chars.toLocaleString()}${CAP ? ` / ${CAP.toLocaleString()}` : ""}`);
    finish(e, false); evict();
  } catch (err) {
    console.warn(`[tts] ElevenLabs ${err?.name === "AbortError" ? "timed out" : "error"}: ${err?.message || err}`); finish(e, true);
  } finally { clearTimeout(timer); }
}
// Voice a narration: returns {id} for the shared clip, or {fallback, reason} for the browser voice.
export function narrate(raw, lang){
  const text = cleanForSpeech(raw); if (text.length < 2) return null;
  const why = fallbackReason(); if (why) return { fallback: true, reason: why, text };
  const id = crypto.createHash("sha256").update(`${VOICE}|${MODEL}|${FORMAT}|${lang || ""}|${text}`).digest("hex").slice(0, 24);
  const hit = cache.get(id);
  if (hit && !hit.failed){ hit.at = Date.now(); return { id, text, cached: hit.done }; }       // repeats cost nothing
  const e = { text, chunks: [], bytes: 0, done: false, failed: false, subs: new Set(), at: Date.now() };
  cache.set(id, e); waiting.push(() => generate(id, e, lang)); runQueued();
  return { id, text };
}
// GET /api/tts/:id: every player streams the same clip; late listeners get what's buffered, then the rest live.
export function serveClip(req, res){
  const e = cache.get(String(req.params.id || ""));
  if (!e) return res.status(404).end();
  if (e.failed) return res.status(502).json({ error: "voice unavailable" });
  res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600", "X-Accel-Buffering": "no" });
  for (const b of e.chunks) res.write(b);
  if (e.done) return res.end();
  e.subs.add(res); res.on("close", () => e.subs.delete(res));
}
