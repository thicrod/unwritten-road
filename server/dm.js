import { narrate } from "./tts.js";
import { voiceToRoom } from "./rooms.js";
// Dungeon Master proxy: streams the AI's reply back to the browser as
// server-sent events: {delta} chunks, then {done} or {error}.
// Providers: "anthropic" (Claude) or "gemini" (Google; has a free tier).
import Anthropic from "@anthropic-ai/sdk";
import { checkLimit } from "./limits.js";
import { mockReply } from "./mockdm.js";

const ENV = process.env;
export const PROVIDER = (ENV.DM_PROVIDER || (ENV.GEMINI_API_KEY && !ENV.ANTHROPIC_API_KEY ? "gemini" : "anthropic")).toLowerCase();
const MODELS = {
  anthropic: { quick: ENV.DM_MODEL_QUICK || "claude-haiku-4-5-20251001", default: ENV.DM_MODEL_DEFAULT || "claude-sonnet-5", complex: ENV.DM_MODEL_DEEP || "claude-opus-5-5" },
  // free tier: Flash-Lite allows far more requests per day than Flash, so it is the default storyteller
  gemini: { quick: ENV.GEMINI_MODEL_QUICK || "gemini-3.5-flash-lite", default: ENV.GEMINI_MODEL_DEFAULT || "gemini-3.5-flash-lite", complex: ENV.GEMINI_MODEL_DEEP || "gemini-3.8-flash" },
};
const GEMINI_BASE = ENV.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const MAX_TOKENS = { quick: 1500, default: 2500, complex: 3000 };
const MAX_INPUT_CHARS = 150000;
const MOCK = !!ENV.MOCK_DM;
const serverKey = () => PROVIDER === "gemini" ? ENV.GEMINI_API_KEY : ENV.ANTHROPIC_API_KEY;
let keyCheck = null, anthropicClient = null;

export const dmStatus = () => ({ mock: MOCK, provider: PROVIDER, keyConfigured: !!serverKey(), keyCheck, models: MODELS[PROVIDER] });
// a player's own key picks its provider by its format
const providerOfKey = (k) => k.startsWith("sk-ant-") ? "anthropic" : /^AIza[\w-]{20,}$/.test(k) ? "gemini" : null;

// ---------- Anthropic ----------
async function streamAnthropic({ key, model, system, input, json, maxTokens, send, onAbort }) {
  const client = key === ENV.ANTHROPIC_API_KEY ? (anthropicClient ||= new Anthropic({ apiKey: key })) : new Anthropic({ apiKey: key });
  const sys = [];
  if (system) sys.push({ type: "text", text: system, cache_control: { type: "ephemeral" } });   // cached: repeat turns cost far less
  if (json) sys.push({ type: "text", text: "Respond with only valid JSON: no prose, no markdown code fences." });
  const stream = client.messages.stream({ model, max_tokens: maxTokens, ...(sys.length ? { system: sys } : {}), messages: [{ role: "user", content: input }] });
  onAbort(() => stream.abort());
  stream.on("text", (delta) => send({ delta }));
  const msg = await stream.finalMessage();
  return { truncated: msg.stop_reason === "max_tokens" };
}

// ---------- Gemini (REST: models/{model}:streamGenerateContent?alt=sse) ----------
async function geminiRequest({ key, model, system, input, json, maxTokens, signal }) {
  const body = { contents: [{ role: "user", parts: [{ text: input }] }], generationConfig: { maxOutputTokens: maxTokens } };
  const sys = [system, json ? "Respond with only valid JSON: no prose, no markdown code fences." : null].filter(Boolean).join("\n\n");
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  return fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body), signal });
}
async function geminiError(res) {
  let err = {}; try { err = (await res.json())?.error || {}; } catch {}
  const e = new Error(err.message || `Gemini error ${res.status}`); e.status = res.status; e.gstatus = err.status; e.provider = "gemini";
  const retry = (err.details || []).find(d => String(d["@type"] || "").includes("RetryInfo"))?.retryDelay;
  e.retryMs = retry ? Math.ceil(parseFloat(retry) * 1000) : null;
  return e;
}
async function streamGemini(opts) {
  const ctl = new AbortController(); opts.onAbort(() => ctl.abort());
  let res = await geminiRequest({ ...opts, signal: ctl.signal });
  if (res.status === 429) {                       // free tier per-minute cap: wait briefly and try once more
    const e = await geminiError(res);
    if (e.retryMs != null && e.retryMs > 20000) throw e;
    await new Promise(r => setTimeout(r, Math.min(e.retryMs ?? 6000, 20000)));
    res = await geminiRequest({ ...opts, signal: ctl.signal });
  }
  if (!res.ok || !res.body) throw await geminiError(res);
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = "", finish = null, wrote = false, blocked = null;
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
      if (ev.error) { const e = new Error(ev.error.message || "Gemini error"); e.status = ev.error.code; e.gstatus = ev.error.status; e.provider = "gemini"; throw e; }
      if (ev.promptFeedback?.blockReason) blocked = ev.promptFeedback.blockReason;
      const cand = ev.candidates?.[0];
      const text = (cand?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
      if (text) { wrote = true; opts.send({ delta: text }); }
      if (cand?.finishReason) finish = cand.finishReason;
    }
  }
  if (!wrote && (blocked || finish === "SAFETY" || finish === "PROHIBITED_CONTENT")) { const e = new Error("blocked"); e.blocked = blocked || finish; throw e; }
  return { truncated: finish === "MAX_TOKENS" };
}

function mapError(e, provider) {
  const s = e?.status, m = String(e?.message || "");
  if (e?.blocked) return { code: "upstream_error", message: "The AI's safety filter refused to narrate that. Try describing it differently." };
  if (provider === "gemini") {
    if ((s === 400 && /api key/i.test(m)) || s === 401 || s === 403) return { code: "bad_key", message: "The Gemini API key was rejected. Check it in Google AI Studio." };
    if (s === 429) return { code: "rate_limited", message: "The free Gemini quota is used up for now. Wait a minute (per-minute limit) or try again tomorrow (daily limit)." };
    if (s === 404) return { code: "upstream_error", message: "That Gemini model isn't available to this key. Set GEMINI_MODEL_DEFAULT to a model listed in Google AI Studio." };
  }
  if (s === 401 || s === 403) return { code: "bad_key", message: "The API key was rejected. Check the key in Settings." };
  if (s === 429) return { code: "rate_limited", message: "The AI service is rate-limiting this key. Wait a moment and try again." };
  if (s === 529 || s === 503 || s === 500) return { code: "overloaded", message: "The AI service is busy right now. Try again in a moment." };
  if (s === 400 && /too long|token/i.test(m)) return { code: "prompt_too_large", message: "The story grew too long to send." };
  return { code: "upstream_error", message: "The connection to the Dungeon Master dropped. Try again." };
}

// One tiny request at startup, so the logs say right away whether the AI Dungeon Master works.
export async function checkKey() {
  const t0 = Date.now(), model = MODELS[PROVIDER].quick; let text = "";
  try {
    const run = PROVIDER === "gemini" ? streamGemini : streamAnthropic;
    await run({ key: serverKey(), model, system: null, input: "Reply with the word OK.", json: false, maxTokens: 20, send: (o) => { if (o.delta) text += o.delta; }, onAbort: () => {} });
    keyCheck = { ok: true, provider: PROVIDER, model, ms: Date.now() - t0, at: new Date().toISOString() };
  } catch (e) {
    keyCheck = { ok: false, provider: PROVIDER, status: e?.status || null, error: `${e?.status || ""} ${mapError(e, PROVIDER).message} (${String(e?.message || e).slice(0, 160)})`.trim(), at: new Date().toISOString() };
  }
  return keyCheck;
}

// Matches the start of the game-state block that follows the narration (same forms the game accepts).
const STATE_RX = /(?:^|\n)[ \t*_#>`]*(?:<{2,3}\s*STATE\s*>{2,3}|STATE\s*(?:JSON)?\s*:)/i;
export async function dmHandler(req, res) {
  const { system = null, input, tier = "default", json = false } = req.body || {};
  const voice = !json && req.body?.voice && typeof req.body.voice === "object" ? req.body.voice : null;
  if (typeof input !== "string" || !input.trim()) return res.status(400).json({ code: "invalid_request", message: "Missing input." });
  if (input.length + (system ? String(system).length : 0) > MAX_INPUT_CHARS) return res.status(413).json({ code: "prompt_too_large", message: "The story grew too long to send." });
  const t = MODELS.anthropic[tier] ? tier : "default";
  const userKey = String(req.get("x-user-key") || "").trim() || null;
  const userProvider = userKey ? providerOfKey(userKey) : null;
  if (userKey && !userProvider) return res.status(400).json({ code: "bad_key", message: "That doesn't look like an Anthropic key (sk-ant-…) or a Gemini key (AIza…)." });
  const provider = userProvider || PROVIDER, key = userKey || serverKey();
  if (!MOCK && !userKey) {
    if (!key) return res.status(503).json({ code: "not_configured", message: "This server has no API key. Add your own Anthropic or Gemini API key in Settings to play." });
    const lim = checkLimit(req.ip);
    if (!lim.ok) return res.status(429).json({ code: "rate_limited", message: lim.message });
  }

  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  const sendRaw = (o) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(o)}\n\n`); };
  // DM voice: as soon as the narration is complete (the state block starts), generate the clip once
  // and tell the solo player over this stream, or everyone in the room over their sockets.
  let acc = "", voiced = false;
  const speak = (final) => {
    if (!voice || voiced) return;
    let narr = acc;
    if (/^\s*\{/.test(acc)) { if (!final) return; try { narr = String(JSON.parse(acc).narration || ""); } catch { narr = ""; } }
    else { const m = acc.match(STATE_RX); if (m) narr = acc.slice(0, m.index); else if (!final) return; }
    voiced = true;
    const v = narrate(narr.replace(/^\s*narration\s*:\s*/i, ""), ["en", "pt", "es"].includes(voice.lang) ? voice.lang : undefined); if (!v) return;
    const payload = { ...v, at: Date.now() };
    const roomed = voice.room ? voiceToRoom(voice.room, voice.pid, voice.token, payload) : false;
    sendRaw({ voice: { ...payload, roomed } });
  };
  let sentAny = false;
  const send = (o) => { if (o.delta) sentAny = true; sendRaw(o); if (voice && o.delta && !voiced) { acc += o.delta; speak(false); } };
  if (MOCK) { await mockReply({ input: (system ? system + "\n\n" : "") + input, json }, send); speak(true); return res.end(); }

  let abort = null, clientGone = false;
  res.on("close", () => { if (!res.writableEnded) { clientGone = true; abort?.(); } });
  try {
    const run = provider === "gemini" ? streamGemini : streamAnthropic;
    // If a model is busy or unavailable, fall back to the next lighter one (only before any text has streamed).
    const chain = [...new Set([t, ...(t === "complex" ? ["default", "quick"] : t === "default" ? ["quick"] : [])].map(x => MODELS[provider][x]))];
    const retryable = (e) => [404, 429, 500, 502, 503, 504].includes(Number(e?.status)) || /overload|high demand|unavailable|not found|exhausted|try again/i.test(String(e?.message || ""));
    let out;
    for (let i = 0; i < chain.length; i++) {
      try { out = await run({ key, model: chain[i], system: system ? String(system) : null, input, json, maxTokens: MAX_TOKENS[t], send, onAbort: (f) => { abort = f; } }); break; }
      catch (e) {
        if (clientGone || sentAny || !retryable(e) || i === chain.length - 1) throw e;
        console.warn(`DM model ${chain[i]} unavailable (${e?.status || "error"}): falling back to ${chain[i + 1]}`);
        sendRaw({ notice: "The storyteller model was busy, so this reply uses a lighter model." });
      }
    }
    speak(true);
    send({ done: true, truncated: out.truncated, tier: t });
  } catch (e) {
    if (!clientGone) { console.warn(`DM error (${provider}):`, e?.status || "", String(e?.message || e).slice(0, 200)); send({ error: mapError(e, provider) }); }
  }
  res.end();
}
