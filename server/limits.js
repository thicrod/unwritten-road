// Simple in-memory limits for requests paid by the server's own API key.
// Players who add their own key in Settings are not limited here.
const WINDOW_MS = 10 * 60 * 1000;
// In co-op only the host's browser calls the DM, so one IP serves a whole table: limits are sized for that.
const PER_WINDOW = Number(process.env.DM_LIMIT_PER_10MIN) || 60;      // per IP per 10 minutes
const PER_DAY = Number(process.env.DM_LIMIT_PER_DAY) || 500;          // per IP per day
const GLOBAL_DAY = Number(process.env.DM_GLOBAL_DAILY_CAP) || 3000;   // whole server per day

const today = () => new Date().toISOString().slice(0, 10);
const hits = new Map();
let global = { day: today(), n: 0 };

export function checkLimit(ip) {
  const now = Date.now(), d = today();
  if (global.day !== d) global = { day: d, n: 0 };
  if (global.n >= GLOBAL_DAY) return { ok: false, message: "The shared Dungeon Master budget is used up for today. Add your own Anthropic API key in Settings to keep playing." };
  let h = hits.get(ip);
  if (!h || h.day !== d) h = { day: d, n: 0, recent: [] };
  h.recent = h.recent.filter(t => now - t < WINDOW_MS);
  if (h.recent.length >= PER_WINDOW) return { ok: false, message: "Too many Dungeon Master requests in a short time. Wait a few minutes, or add your own API key in Settings." };
  if (h.n >= PER_DAY) return { ok: false, message: "You've reached today's limit on the shared key. Add your own Anthropic API key in Settings to keep playing." };
  h.recent.push(now); h.n++; global.n++; hits.set(ip, h);
  return { ok: true };
}
setInterval(() => { const d = today(); for (const [ip, h] of hits) if (h.day !== d) hits.delete(ip); }, 60 * 60 * 1000).unref();
