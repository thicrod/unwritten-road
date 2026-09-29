<script>
"use strict";
// =====================================================================
//  SPELL EFFECTS: element-specific animations on a click-through overlay
// =====================================================================
const SFX_COL = { fire: "#ff8a3d", cold: "#9fe3ff", lightning: "#ffe65c", thunder: "#c9b8ff", acid: "#b4ec5f", poison: "#86e25d", necrotic: "#a877ff", radiant: "#fff1a8", force: "#e09cff", psychic: "#ff8fd8", heal: "#72f0a8", buff: "#ffd76a", arcane: "#b9a4ff" };
function fxLayer(){ let l = document.getElementById("spell-fx"); if (!l){ l = document.createElement("div"); l.id = "spell-fx"; document.body.appendChild(l); } return l; }
function ctr(el){ const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
function fxEl(cls, css, parent){ const e = document.createElement("span"); e.className = "sfx " + cls; Object.assign(e.style, css || {}); (parent || fxLayer()).appendChild(e); return e; }
function anim(e, frames, o){ const a = e.animate(frames, { fill: "forwards", ...o }); a.onfinish = () => e.remove(); return a; }
const rr = (a, b) => a + Math.random() * (b - a);
function particles(x, y, color, n = 14, spread = 60, dur = 700, o = {}){ n = Math.round(n * 1.5); spread *= 1.3; o = { ...o, min: (o.min || 3) * 1.4, max: (o.max || 7) * 1.4 };
  for (let i = 0; i < n; i++){
    const ang = o.up ? rr(-Math.PI * 0.85, -Math.PI * 0.15) : rr(0, Math.PI * 2), dist = rr(spread * 0.35, spread), size = rr(o.min || 3, o.max || 7);
    const p = fxEl("sfx-dot" + (o.shard ? " shard" : ""), { left: x + "px", top: y + "px", width: size + "px", height: (o.shard ? size * 2.2 : size) + "px", background: o.colors ? o.colors[i % o.colors.length] : color, boxShadow: `0 0 ${size * 1.6}px ${color}` });
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist + (o.fall ? 30 : 0);
    anim(p, [{ transform: `translate(-50%,-50%) rotate(${rr(0, 360)}deg) scale(1)`, opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rr(0, 540)}deg) scale(${o.grow ? 1.6 : 0.2})`, opacity: 0 }], { duration: dur * rr(0.75, 1.2), easing: "cubic-bezier(.2,.7,.3,1)", delay: rr(0, o.stagger || 60) });
  }
}
function flash(x, y, color, size = 90, dur = 520){ size *= 1.45; dur *= 1.2;
  const f = fxEl("sfx-flash", { left: x + "px", top: y + "px", width: size + "px", height: size + "px", background: `radial-gradient(circle, #fff 0%, ${color} 35%, transparent 70%)` });
  anim(f, [{ transform: "translate(-50%,-50%) scale(.2)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0.95, offset: 0.35 }, { transform: "translate(-50%,-50%) scale(1.35)", opacity: 0 }], { duration: dur, easing: "ease-out" });
}
function ring(x, y, color, size = 70, dur = 650, width = 3){ size *= 1.3; width += 1;
  const r = fxEl("sfx-ring", { left: x + "px", top: y + "px", width: size + "px", height: size + "px", borderColor: color, borderWidth: width + "px", boxShadow: `0 0 14px ${color}, inset 0 0 10px ${color}` });
  anim(r, [{ transform: "translate(-50%,-50%) scale(.15)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0 }], { duration: dur, easing: "cubic-bezier(.1,.7,.3,1)" });
}
function runeCircle(el, color){
  if (!el) return; const c = ctr(el), s = Math.max(70, Math.min(140, c.w * 0.9));
  const d = fxEl("sfx-rune", { left: c.x + "px", top: c.y + "px", width: s + "px", height: s + "px" });
  d.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><g fill="none" stroke="${color}" stroke-width="2"><circle cx="50" cy="50" r="46" opacity=".9"/><circle cx="50" cy="50" r="36" stroke-dasharray="4 5"/>${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${50 + 40 * Math.cos(a)},${50 + 40 * Math.sin(a)} l${3 * Math.cos(a + 1.2)},${3 * Math.sin(a + 1.2)}" stroke-width="3"/>`; }).join("")}<polygon points="50,18 78,66 22,66" opacity=".7"/><polygon points="50,82 22,34 78,34" opacity=".7"/></g></svg>`;
  d.style.filter = `drop-shadow(0 0 6px ${color})`;
  anim(d, [{ transform: "translate(-50%,-50%) rotate(0deg) scale(.4)", opacity: 0 }, { transform: "translate(-50%,-50%) rotate(90deg) scale(1)", opacity: 1, offset: 0.3 }, { transform: "translate(-50%,-50%) rotate(200deg) scale(1.1)", opacity: 0 }], { duration: 900, easing: "ease-out" });
}
function projectile(from, to, color, kind, dur = 380){
  return new Promise(res => {
    if (!from || !to){ res(); return; } const a = ctr(from), b = ctr(to);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const size = kind === "fire" ? 32 : kind === "shard" ? 14 : kind === "dart" ? 11 : 20;
    const p = fxEl("sfx-proj " + kind, { left: "0px", top: "0px", width: (kind === "shard" ? size * 3 : kind === "dart" ? size * 2.6 : size) + "px", height: size + "px", background: kind === "fire" ? `radial-gradient(circle at 60% 50%, #fff6c8, ${color} 45%, #b3261e 80%)` : kind === "shard" ? `linear-gradient(90deg, transparent, #e8fbff 40%, ${color})` : `radial-gradient(circle, #fff, ${color} 60%)`, boxShadow: `0 0 ${size}px ${color}` });
    const arc = kind === "fire" ? -40 : kind === "dart" ? rr(-50, 50) : 0;
    const frames = [0, 0.25, 0.5, 0.75, 1].map(t => { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + arc * Math.sin(Math.PI * t); return { transform: `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${ang}deg) scale(${t === 0 ? 0.5 : 1})`, opacity: t === 0 ? 0.3 : 1 }; });
    anim(p, frames, { duration: dur, easing: "cubic-bezier(.45,0,.7,1)" }).onfinish = () => { p.remove(); res(); };
    if (kind === "fire") { let n = 0; const trail = setInterval(() => { const r = p.getBoundingClientRect(); if (!r.width || n++ > 12){ clearInterval(trail); return; } particles(r.left + r.width / 2, r.top + r.height / 2, color, 2, 14, 380, { colors: ["#ffd36b", color, "#b3261e"] }); }, 32); }
  });
}
function lightning(from, to, color){
  if (!from || !to) return; const a = ctr(from), b = ctr(to);
  const pts = [[a.x, a.y]]; const n = 9; for (let i = 1; i < n; i++){ const t = i / n; pts.push([a.x + (b.x - a.x) * t + rr(-16, 16), a.y + (b.y - a.y) * t + rr(-16, 16)]); } pts.push([b.x, b.y]);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "sfx sfx-svg"); svg.setAttribute("width", innerWidth); svg.setAttribute("height", innerHeight);
  svg.innerHTML = `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="10" stroke-linejoin="round" opacity=".6" style="filter:blur(4px)"/><polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#fffbe0" stroke-width="3.5" stroke-linejoin="round"/>`;
  fxLayer().appendChild(svg);
  anim(svg, [{ opacity: 1 }, { opacity: 0.55, offset: 0.2 }, { opacity: 1, offset: 0.35 }, { opacity: 0.6, offset: 0.55 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 620 });
}
function beamDown(el, color){
  if (!el) return; const c = ctr(el);
  const b = fxEl("sfx-beam", { left: c.x + "px", top: (c.y - 220) + "px", height: "240px", background: `linear-gradient(180deg, transparent, ${color} 60%, #fff)`, boxShadow: `0 0 26px ${color}` });
  anim(b, [{ transform: "translateX(-50%) scaleY(0)", transformOrigin: "bottom", opacity: 0.2 }, { transform: "translateX(-50%) scaleY(1)", opacity: 1, offset: 0.4 }, { transform: "translateX(-50%) scaleY(1) scaleX(.2)", opacity: 0 }], { duration: 700, easing: "ease-out" });
  setTimeout(() => { flash(c.x, c.y, color, 80, 420); particles(c.x, c.y, color, 10, 40, 700, { up: true }); }, 260);
}
function cloud(el, color){
  if (!el) return; const c = ctr(el);
  for (let i = 0; i < 7; i++){ const s = rr(26, 46); const p = fxEl("sfx-cloud", { left: (c.x + rr(-30, 30)) + "px", top: (c.y + rr(-14, 14)) + "px", width: s + "px", height: s + "px", background: color });
    anim(p, [{ transform: "translate(-50%,-50%) scale(.3)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0.55, offset: 0.4 }, { transform: `translate(-50%,calc(-50% - 16px)) scale(1.4)`, opacity: 0 }], { duration: 1000, delay: i * 40, easing: "ease-out" }); }
}
function aura(el, color){ if (!el) return; el.animate([{ boxShadow: `0 0 0 0 transparent` }, { boxShadow: `0 0 22px 7px ${color}` }, { boxShadow: `0 0 0 0 transparent` }], { duration: 900 }); const c = ctr(el); ring(c.x, c.y, color, Math.max(60, c.w * 0.9), 800, 2); particles(c.x, c.y, color, 8, 34, 900, { up: true, min: 2, max: 4 }); }
// one spell cast: rune circle on the caster, then the element's effect on each target
async function spellFx(f, getEl){
  const from = getEl(f.from), tgts = (f.targets || []).map(getEl).filter(Boolean);
  const el = f.kind === "heal" ? "heal" : f.kind === "buff" && !f.dt ? "buff" : (f.dt || "arcane");
  const col = SFX_COL[el] || SFX_COL.arcane;
  runeCircle(from, col);
  if (f.noProjectile) return;
  await new Promise(r => setTimeout(r, 230));
  const centroid = () => { const cs = tgts.map(ctr); return cs.length ? { x: cs.reduce((a, c) => a + c.x, 0) / cs.length, y: cs.reduce((a, c) => a + c.y, 0) / cs.length } : null; };
  switch (el){
    case "fire": {
      if (f.area && tgts.length > 1){ const c = centroid(); const tmp = fxEl("sfx-anchor", { left: c.x + "px", top: c.y + "px" }); await projectile(from, tmp, col, "fire", 420); tmp.remove();
        flash(c.x, c.y, col, 200, 700); ring(c.x, c.y, "#ffb86b", 240, 700, 4); particles(c.x, c.y, col, 26, 130, 900, { colors: ["#fff1a8", "#ffb86b", col, "#b3261e"] });
        tgts.forEach(t => { const p = ctr(t); flash(p.x, p.y, col, 90, 500); });
      } else for (const t of tgts){ await projectile(from, t, col, "fire", 360); const p = ctr(t); flash(p.x, p.y, col, 90, 480); particles(p.x, p.y, col, 12, 50, 650, { colors: ["#fff1a8", col, "#b3261e"] }); }
      break; }
    case "cold": for (const t of tgts){ projectile(from, t, col, "shard", 360).then(() => { const p = ctr(t); flash(p.x, p.y, col, 80, 520); ring(p.x, p.y, "#e8fbff", 70, 500, 2); particles(p.x, p.y, "#e8fbff", 12, 55, 800, { shard: true, colors: ["#ffffff", col, "#5bc0f0"] }); }); await new Promise(r => setTimeout(r, 90)); } break;
    case "lightning": { let prev = from; for (const t of tgts){ lightning(prev, t, col); const p = ctr(t); flash(p.x, p.y, col, 70, 360); particles(p.x, p.y, "#fffbe0", 8, 40, 420); prev = t; await new Promise(r => setTimeout(r, 120)); } break; }
    case "radiant": tgts.forEach((t, i) => setTimeout(() => beamDown(t, col), i * 110)); break;
    case "necrotic": tgts.forEach((t, i) => setTimeout(() => { const p = ctr(t); flash(p.x, p.y, "#5b2a9a", 90, 620); t.animate([{ filter: "none" }, { filter: "grayscale(1) brightness(.6)" }, { filter: "none" }], { duration: 700 }); particles(p.x, p.y, col, 14, 60, 1000, { up: true, colors: [col, "#2a1840", "#6a4a9a"], grow: true }); }, i * 90)); break;
    case "psychic": tgts.forEach((t, i) => { const p = ctr(t); [0, 140, 280].forEach(d => setTimeout(() => ring(p.x, p.y, col, 90, 600, 2), d + i * 80)); }); break;
    case "force": { const list = tgts.length === 1 ? [tgts[0], tgts[0], tgts[0]] : tgts; list.forEach((t, i) => setTimeout(() => projectile(from, t, col, "dart", 330).then(() => { const p = ctr(t); flash(p.x, p.y, col, 46, 300); }), i * 90)); break; }
    case "thunder": { if (from){ const c = ctr(from); ring(c.x, c.y, col, 260, 650, 5); ring(c.x, c.y, "#ffffff", 180, 500, 2); } tgts.forEach(t => { const p = ctr(t); t.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 }); ring(p.x, p.y, col, 80, 500, 3); }); break; }
    case "acid": for (const t of tgts){ await projectile(from, t, col, "blob", 340); const p = ctr(t); particles(p.x, p.y, col, 12, 45, 700, { fall: true, colors: [col, "#e8ff9e", "#6e9a2a"] }); } break;
    case "poison": tgts.forEach((t, i) => setTimeout(() => cloud(t, col), i * 90)); break;
    case "heal": tgts.forEach((t, i) => setTimeout(() => { const p = ctr(t); particles(p.x, p.y + 10, col, 14, 60, 1000, { up: true, min: 3, max: 5, colors: [col, "#e2ffe9", "#b9ffd6"] }); ring(p.x, p.y, col, 90, 700, 2); }, i * 90)); break;
    case "buff": tgts.forEach((t, i) => setTimeout(() => aura(t, col), i * 70)); break;
    default: tgts.forEach((t, i) => setTimeout(() => { const p = ctr(t); ring(p.x, p.y, col, 90, 650, 2); particles(p.x, p.y, col, 8, 40, 700); }, i * 80));
  }
}
</script>
