// Optional site password (SITE_PASSWORD). Keeps strangers who find your URL from using your AI key.
// Friends sign in once; a signed cookie keeps them in for 30 days. Changing the password signs everyone out.
import crypto from "node:crypto";
import express from "express";

const PASS = process.env.SITE_PASSWORD || "";
const COOKIE = "ur_auth";
const MAX_TRIES = 8, WINDOW_MS = 10 * 60 * 1000;
const tries = new Map();
export const authEnabled = () => !!PASS;
const token = () => crypto.createHmac("sha256", PASS).update("unwritten-road-v1").digest("hex");
const sameText = (a, b) => { const h = (x) => crypto.createHash("sha256").update(String(x ?? "")).digest(); return crypto.timingSafeEqual(h(a), h(b)); };
function cookie(header, name) { for (const part of String(header || "").split(";")) { const [k, ...v] = part.trim().split("="); if (k === name) return decodeURIComponent(v.join("=")); } return ""; }
export function isAuthed(cookieHeader) { if (!PASS) return true; const v = cookie(cookieHeader, COOKIE); return v.length === 64 && sameText(v, token()); }
const safeNext = (n) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && n.length < 200) ? n : "/";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function page(next, error) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Unwritten Road</title><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎲</text></svg>">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,#3a2a1c,#15100b 70%);font-family:Georgia,"Times New Roman",serif;color:#2a1f15}
.card{width:min(360px,calc(100vw - 32px));padding:28px 26px;border-radius:14px;background:linear-gradient(180deg,#f3e6c4,#e3cfa3);box-shadow:0 20px 60px rgba(0,0,0,.55);text-align:center}
h1{margin:0 0 4px;font-size:28px;font-weight:400;letter-spacing:.02em} p{margin:0 0 18px;color:#5b4630;font-style:italic}
input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1px solid #9a7b52;background:#fffaf0;font-size:16px}
button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:linear-gradient(180deg,#e08a3c,#b8621f);color:#fff;font-size:16px;font-weight:700;cursor:pointer}
.err{margin:12px 0 0;color:#8b1e16;font-style:normal;font-weight:700}
</style></head><body><form class="card" method="post" action="/login">
<div style="font-size:38px">🎲</div><h1>The Unwritten Road</h1><p>Enter the password your host shared with you.</p>
<input type="password" name="password" autocomplete="current-password" placeholder="Password" autofocus required>
<input type="hidden" name="next" value="${esc(next)}"><button type="submit">Enter</button>
${error ? `<p class="err">${esc(error)}</p>` : ""}</form></body></html>`;
}

export function attachAuth(app) {
  if (!PASS) return;
  app.post("/login", express.urlencoded({ extended: false, limit: "4kb" }), (req, res) => {
    const now = Date.now(), list = (tries.get(req.ip) || []).filter(t => now - t < WINDOW_MS);
    if (list.length >= MAX_TRIES) return res.status(429).type("html").send(page(safeNext(req.body?.next), "Too many attempts. Wait a few minutes."));
    if (!sameText(req.body?.password, PASS)) { list.push(now); tries.set(req.ip, list); return res.status(401).type("html").send(page(safeNext(req.body?.next), "That's not the password.")); }
    res.cookie(COOKIE, token(), { httpOnly: true, sameSite: "lax", secure: req.secure, maxAge: 30 * 24 * 3600 * 1000, path: "/" });
    res.redirect(303, safeNext(req.body?.next));
  });
  app.use((req, res, next) => {
    if (isAuthed(req.headers.cookie) || req.path === "/api/health") return next();
    if (req.path.startsWith("/api/")) return res.status(401).json({ code: "auth", message: "Your sign-in expired. Reload the page to sign in again." });
    if (req.method === "GET" && req.accepts("html")) return res.status(401).type("html").send(page(req.originalUrl, ""));
    res.status(401).end();
  });
  setInterval(() => { const now = Date.now(); for (const [ip, l] of tries) if (!l.some(t => now - t < WINDOW_MS)) tries.delete(ip); }, WINDOW_MS).unref();
}
