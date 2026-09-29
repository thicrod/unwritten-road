// Web platform layer for The Unwritten Road.
// Inside Claude, the game uses window.claude (Claude's artifact runtime).
// On the website, this file provides the same interface, but sends the
// Dungeon Master's requests to our own server (/api/dm), which calls the
// Anthropic API with the server's key, or with the player's own key if they
// added one in Settings.
(function () {
  window.__WEB__ = true;
  // On Gemini's free tier, save requests: "Smart enemy tactics" starts off (players can turn it on in Settings).
  try {
    const cfg = window.__UR_CONFIG || {};
    if (cfg.provider === "gemini") { const s = JSON.parse(localStorage.getItem("ur:settings") || "{}"); if (s.aiTactics === undefined) { s.aiTactics = false; localStorage.setItem("ur:settings", JSON.stringify(s)); } }
  } catch {}
  const KEY_STORE = "ur:apikey";
  const userKey = () => { try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; } };

  async function call(input, opts = {}, json = false) {
    let system = null, body = String(input);
    // Send the long, fixed DM rules separately so the server can cache them.
    if (typeof DM_RULES === "string" && body.startsWith(DM_RULES)) { system = DM_RULES; body = body.slice(DM_RULES.length).trim(); }
    let res;
    try {
      res = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(userKey() ? { "X-User-Key": userKey() } : {}) },
        body: JSON.stringify({ system, input: body, tier: opts.modelTier || "default", json }),
        signal: opts.signal,
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw { code: "not_available", message: "Can't reach the Dungeon Master server. Check your internet connection." };
    }
    if (!res.ok || !res.body) {
      let err = {}; try { err = await res.json(); } catch {}
      throw { code: err.code || (res.status === 429 ? "rate_limited" : "upstream_error"), message: err.message || `Server error (${res.status}).` };
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "", text = "", meta = {};
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = chunk.split("\n").find(l => l.startsWith("data:"));
          if (!line) continue;
          const ev = JSON.parse(line.slice(5));
          if (ev.error) throw ev.error;
          if (ev.delta) { text += ev.delta; opts.onText && opts.onText({ text, delta: ev.delta }); }
          if (ev.done) meta = ev;
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw e && e.code ? e : { code: "upstream_error", message: "The connection to the Dungeon Master dropped. Try again." };
    }
    if (!text.trim()) throw { code: "empty_completion", message: "The Dungeon Master returned nothing. Try again." };
    return { text, truncated: !!meta.truncated, modelTierApplied: meta.tier || opts.modelTier || "default" };
  }

  const sample = (input, opts) => call(input, opts, false);
  sample.json = async (input, opts = {}) => {
    const r = await call(input, opts, true);
    const t = r.text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    try { return JSON.parse(t); } catch {}
    if (typeof tolerantJSON === "function") { const p = tolerantJSON(t); if (p) return p; }
    throw { code: "upstream_error", message: "The Dungeon Master's reply couldn't be read. Try again." };
  };

  window.urApiKey = { get: userKey, set: (k) => { try { k ? localStorage.setItem(KEY_STORE, k.trim()) : localStorage.removeItem(KEY_STORE); } catch {} } };
  // Only the AI is provided on the web; saves use the browser's storage.
  window.claude = { use: async (name) => (name === "sample" ? sample : null) };
})();
