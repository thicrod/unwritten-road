import fs from "node:fs";
// The Unwritten Road: web server.
// Serves the game, proxies Dungeon Master requests to the Anthropic API (the key never reaches
// the browser), and runs co-op rooms over Socket.IO.
import express from "express";
import compression from "compression";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dmHandler, dmStatus, checkKey } from "./dm.js";
import { attachRooms, roomStats } from "./rooms.js";
import { attachAuth, authEnabled } from "./auth.js";
import { initSaves, savesRouter, savesEnabled, savesPool } from "./saves.js";
import { initTTS, serveClip, ttsConfigured, ttsStatus } from "./tts.js";
import { initReports, reportsRouter } from "./reports.js";
import { initArt, artRouter, artEnabled } from "./art.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = express();
app.set("trust proxy", 1);                 // behind Render/Railway/Fly proxies: use the real client IP
app.disable("x-powered-by");
app.use(compression());                    // the game page is ~700 KB; gzip makes it ~5x smaller
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'self'", "base-uri 'self'", "form-action 'self'",
    ].join("; "),
  });
  next();
});
attachAuth(app);                           // SITE_PASSWORD: everything below requires signing in
app.use(express.json({ limit: "600kb" }));

// lets the page know which AI runs the DM (e.g. Gemini's free tier: fewer requests by default)
app.get("/config.js", (req, res) => { res.type("application/javascript").set("Cache-Control", "no-cache").send(`window.__UR_CONFIG = ${JSON.stringify({ provider: dmStatus().provider, mock: dmStatus().mock, cloud: savesEnabled(), voice: ttsConfigured(), art: artEnabled() })};`); });
app.use("/api/art", artRouter());
app.get("/api/tts/:id", serveClip);
app.use("/api/reports", reportsRouter());
app.use("/api/saves", savesRouter());
app.get("/api/health", (req, res) => res.json({ tts: ttsStatus(), ok: true, ...dmStatus(), ...roomStats(), uptimeSec: Math.round(process.uptime()), memoryMB: Math.round(process.memoryUsage().rss / 1048576) }));
app.post("/api/dm", dmHandler);
// the game page: send the pre-compressed Brotli copy when the browser accepts it
app.get(["/", "/index.html"], (req, res, next) => {
  const br = path.join(root, "public", "index.html.br");
  if (!/\bbr\b/.test(req.headers["accept-encoding"] || "") || !fs.existsSync(br)) return next();
  res.set({ "Content-Type": "text/html; charset=utf-8", "Content-Encoding": "br", "Vary": "Accept-Encoding", "Cache-Control": "public, max-age=300" });
  res.sendFile(br);
});
app.use(express.static(path.join(root, "public"), { extensions: ["html"], maxAge: "5m" }));

const server = createServer(app);
const io = attachRooms(server);
const PORT = Number(process.env.PORT) || 3000;
const savesMode = await initSaves().catch(e => { console.warn("Cloud saves failed to start:", e.message); return null; });
const tts = await initTTS(savesPool()).catch(e => { console.warn("DM voice failed to start:", e.message); return null; });
await initReports(savesPool());
const art = initArt(); if (art) console.log(`Scene art: AI illustrations with ${art.model} (up to ${art.perDay} new images a day)`);
server.listen(PORT, () => {
  console.log(tts ? `DM voice: ElevenLabs (eleven_flash_v2_5, voice ${tts.voice})${tts.cap ? `, cap ${tts.cap.toLocaleString()} chars/month, ${tts.used.toLocaleString()} used` : ""}` : "DM voice: browser voice only (set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID for ElevenLabs)");
  console.log(savesMode ? `Cloud saves: ON (${savesMode})` : "Cloud saves: off (set DATABASE_URL to enable)");
  const s = dmStatus();
  console.log(`The Unwritten Road is running on http://localhost:${PORT}`);
  const who = s.provider === "gemini" ? "Gemini (Google)" : "Claude (Anthropic)";
  console.log(s.mock ? "Dungeon Master: MOCK mode (canned replies, no API calls)" : s.keyConfigured ? `Dungeon Master: the AI, ${who}, with the server's API key (${s.models.default})` : "Dungeon Master: no server key; players must add their own key in Settings");
  console.log(authEnabled() ? "Site password: ON (players sign in once)" : "Site password: off (set SITE_PASSWORD to require one)");
  if (!s.mock && s.keyConfigured) checkKey().then(r => console.log(r.ok ? `API key check: OK (${r.model} answered in ${r.ms} ms)` : `API key check FAILED: ${r.error}`));
});

// Render (and most hosts) send SIGTERM before replacing the server, e.g. on every deploy.
// Warn players first; their browsers reconnect and the host's browser restores the room.
let stopping = false;
function shutdown(signal) {
  if (stopping) return; stopping = true;
  console.log(`${signal}: telling players the server is restarting…`);
  io.emit("server:restart");
  setTimeout(() => { io.close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); }, 1500);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
export { app, server };
