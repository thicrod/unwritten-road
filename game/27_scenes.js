<script>
"use strict";
// =====================================================================
//  SCENE ILLUSTRATIONS: a painted banner for wherever the party is, lit by the time of day.
//  When the server has SCENE_ART_MODEL set, an AI illustration replaces it (made once per place).
// =====================================================================
const PHASE_LIGHT = {
  morning: { tint: "rgba(255,190,120,.18)", stars: 0 }, afternoon: { tint: "rgba(0,0,0,0)", stars: 0 },
  evening: { tint: "rgba(150,60,90,.32)", stars: 0.3 }, night: { tint: "rgba(10,18,50,.62)", stars: 1 },
};
function sceneKindFor(loc){ if (!loc) return "plains"; const byType = battleScene(loc.type || ""); return byType !== "plains" || /plain|road|field|meadow/.test(loc.type || "") ? byType : battleScene(`${loc.name || ""} ${loc.description || ""}`); }
// full-width silhouettes for the banner: a far layer and a near layer, shaped by the kind of place
function bannerLayers(kind, seed){
  const r = artRng("banner" + seed + kind); const far = "rgba(40,30,50,.45)", near = "rgba(20,14,22,.82)";
  const hills = (y, amp, fill, n = 9) => { let d = `M0,300 L0,${y}`; for (let i = 0; i <= n; i++){ const x = (1000 / n) * i; d += ` Q${x - 1000 / n / 2},${y - amp * (0.4 + r())} ${x},${y - amp * r() * 0.5}`; } return html`<path d=${d + " L1000,300 Z"} fill=${fill}/>`; };
  const peaks = (y, h, fill, n) => { let d = `M0,300 L0,${y}`; for (let i = 0; i < n; i++){ const x0 = (1000 / n) * i, x1 = x0 + 1000 / n; const ph = h * (0.55 + r() * 0.6); d += ` L${(x0 + x1) / 2},${y - ph} L${x1},${y}`; } return html`<path d=${d + " L1000,300 Z"} fill=${fill}/>`; };
  const trees = (y, n, sz, fill) => html`<g fill=${fill}>${Array.from({ length: n }, (_, i) => { const x = (i + r() * 0.8) * (1000 / n), h = sz * (0.7 + r() * 0.6); return html`<path key=${i} d=${`M${x},${y - h} L${x - h * 0.32},${y} L${x + h * 0.32},${y} Z M${x},${y - h * 1.3} L${x - h * 0.24},${y - h * 0.55} L${x + h * 0.24},${y - h * 0.55} Z`}/>`; })}</g>`;
  const houses = (y, n, fill) => html`<g>${Array.from({ length: n }, (_, i) => { const w = 50 + r() * 40, h = 40 + r() * 50, x = (i * 1000) / n + r() * 20; return html`<g key=${i}><rect x=${x} y=${y - h} width=${w} height=${h} fill=${fill}/><path d=${`M${x - 6},${y - h} L${x + w / 2},${y - h - 26 - r() * 14} L${x + w + 6},${y - h} Z`} fill=${fill}/>${r() < 0.75 ? html`<rect x=${x + w * 0.3} y=${y - h * 0.6} width="9" height="11" fill="#ffcf6a" opacity=".85"/>` : null}${r() < 0.4 ? html`<rect x=${x + w * 0.65} y=${y - h * 0.6} width="9" height="11" fill="#ffcf6a" opacity=".7"/>` : null}</g>`; })}</g>`;
  switch (kind){
    case "town": return html`<g>${hills(230, 50, far)}${houses(268, 11, near)}</g>`;
    case "forest": return html`<g>${trees(240, 26, 70, far)}${trees(290, 18, 110, near)}</g>`;
    case "mountain": return html`<g>${peaks(250, 170, far, 5)}${peaks(290, 110, near, 7)}<g fill="#f4f6fa" opacity=".55">${null}</g></g>`;
    case "cave": case "dungeon": return html`<g><path d="M0,0 H1000 V300 H760 Q760,90 500,80 Q240,90 240,300 H0 Z" fill=${near}/><g fill="#ffb347" opacity=".9"><circle cx="280" cy="170" r="7"/><circle cx="720" cy="170" r="7"/></g></g>`;
    case "swamp": return html`<g>${hills(250, 25, far)}<g stroke=${near} strokeWidth="7" fill="none">${Array.from({ length: 6 }, (_, i) => { const x = 80 + i * 170 + r() * 40; return html`<path key=${i} d=${`M${x},300 L${x + 6},170 M${x + 4},210 L${x + 40},180 M${x + 3},240 L${x - 30},215`}/>`; })}</g><rect y="240" width="1000" height="60" fill="rgba(200,220,200,.18)"/></g>`;
    case "desert": return html`<g>${hills(250, 60, "rgba(160,110,60,.55)", 5)}${hills(290, 40, "rgba(120,80,40,.8)", 4)}</g>`;
    case "snow": return html`<g>${peaks(250, 140, "rgba(230,236,245,.55)", 5)}${trees(292, 16, 90, "rgba(30,40,55,.8)")}</g>`;
    case "ruins": return html`<g>${hills(250, 40, far)}<g fill=${near}>${Array.from({ length: 7 }, (_, i) => { const x = 60 + i * 140 + r() * 30, h = 60 + r() * 120; return html`<rect key=${i} x=${x} y=${292 - h} width="26" height=${h}/>`; })}<rect x="40" y="286" width="920" height="14"/></g></g>`;
    case "water": return html`<g>${hills(220, 40, far)}<rect y="230" width="1000" height="70" fill="rgba(40,90,130,.75)"/><path d="M0,250 q25,-8 50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0" stroke="rgba(255,255,255,.35)" strokeWidth="3" fill="none"/><path d="M620,232 l40,-60 v60 z M600,232 h80 l-12,14 h-56 z" fill=${near}/></g>`;
    default: return html`<g>${hills(240, 45, far)}${hills(285, 30, near, 6)}<path d="M380,300 Q480,250 520,230" stroke="rgba(200,170,120,.6)" strokeWidth="14" fill="none"/></g>`;
  }
}
function SceneBanner({ c }){
  const s = useStore(); const loc = topLoc(c, c.currentLocationId); const here = c.locations?.[c.currentLocationId] || loc;
  const [art, setArt] = useState(null); const key = here ? `${c.id}:${here.id}` : null;
  useEffect(() => { setArt(null); if (!key || !window.__UR_CONFIG?.art) return; let alive = true;
    fetch("/api/art", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, desc: `${here.name}, a ${here.type || "place"}: ${(here.description || "").slice(0, 300)} Time of day: ${c.time?.phase || "day"}.` }) })
      .then(r => r.ok ? r.json() : null).then(j => { if (alive && j?.url) setArt(j.url); }).catch(() => {}); return () => { alive = false; }; }, [key]);
  if (!here || s.settings.sceneArt === false) return null;
  const kind = sceneKindFor(here), ph = PHASE_LIGHT[c.time?.phase] || PHASE_LIGHT.afternoon, seed = Math.abs(talkHash(here.id || here.name));
  const stars = ph.stars ? Array.from({ length: 26 }, (_, i) => { const x = (seed * (i + 3) * 37) % 1000, y = (seed * (i + 7) * 11) % 120; return html`<circle key=${i} cx=${x} cy=${y} r=${(i % 3) * 0.6 + 0.8} fill="#fff" opacity=${ph.stars * (0.5 + (i % 4) * 0.12)} className="twinkle" style=${{ animationDelay: (i % 7) * 0.4 + "s" }}/>`; }) : null;
  const sunX = 140 + (seed % 700);
  return html`<div className=${"scene-banner" + (art ? " has-art" : "")} aria-label=${`${here.name}, ${c.time?.phase || ""}`}>
    ${art ? html`<img src=${art} alt="" onError=${() => setArt(null)}/>` : html`<div className=${"scene-svg sky-" + (c.time?.phase || "afternoon")}>
      <div className=${"sky-orb " + (c.time?.phase === "night" ? "moon" : c.time?.phase === "evening" ? "dusk" : "sun")} style=${{ left: (sunX / 10) + "%", top: c.time?.phase === "evening" ? "48%" : c.time?.phase === "morning" ? "34%" : "14%" }}></div>
      <svg className="scene-light" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">${stars}${bannerLayers(kind, seed)}<rect width="1000" height="300" fill=${ph.tint}/></svg></div>`}
    <div className="scene-cap"><b>${here.name}</b><span>${cap(c.time?.phase || "")}${c.weather ? ` · ${c.weather}` : ""}</span></div>
  </div>`;
}
</script>
