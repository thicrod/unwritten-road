<script>
"use strict";
// =====================================================================
//  BATTLEFIELD: a live map of the fight (front/back lines, tokens, turns)
// =====================================================================
function battleScene(terrain){
  const t = String(terrain || "").toLowerCase();
  for (const [re, k] of [[/forest|wood|grove|tree|glade|thicket/, "forest"], [/cave|cavern|mine|tunnel|grotto/, "cave"], [/crypt|tomb|catacomb|dungeon|cellar|vault|sewer|keep|chamber|hall|room|altar|shrine|sanctum|lair|temple/, "dungeon"], [/swamp|marsh|bog|fen|mire/, "swamp"], [/desert|sand|dune/, "desert"], [/snow|ice|frost|glacier|tundra/, "snow"], [/town|street|tavern|market|alley|village|city|square|inn|dock|harbor|port|camp/, "town"], [/ruin/, "ruins"], [/mountain|cliff|pass|peak|ridge|crag/, "mountain"], [/river|lake|shore|beach|coast|sea|bridge|ford/, "water"]]) if (re.test(t)) return k;
  return "plains";
}
const SCENE_ART = {
  plains:   { sky: ["#3a5a7a", "#8aa6b8"], ground: ["#5a7a3a", "#3f5a2a"] },
  forest:   { sky: ["#1f3a2e", "#3f6a4a"], ground: ["#3a5a2a", "#26401c"] },
  cave:     { sky: ["#141218", "#2a2630"], ground: ["#3a3530", "#221e1a"] },
  dungeon:  { sky: ["#18161c", "#2e2a34"], ground: ["#4a4440", "#2a2622"] },
  swamp:    { sky: ["#26322a", "#4a5a44"], ground: ["#3f4a2a", "#2a321c"] },
  desert:   { sky: ["#a86a3a", "#e8c08a"], ground: ["#d8b07a", "#b08a54"] },
  snow:     { sky: ["#5a6a80", "#c8d8e8"], ground: ["#e8eef4", "#b8c8d8"] },
  town:     { sky: ["#3a3a5a", "#8a8aa8"], ground: ["#7a7068", "#5a524a"] },
  ruins:    { sky: ["#3a3a44", "#6a6a74"], ground: ["#6a645a", "#4a443a"] },
  mountain: { sky: ["#4a5a7a", "#a8b8d0"], ground: ["#6a6a5a", "#4a4a3a"] },
  water:    { sky: ["#2a4a6a", "#8ab0c8"], ground: ["#5a7a4a", "#3a5a3a"] },
};
function SceneArt({ kind }){
  const A = SCENE_ART[kind] || SCENE_ART.plains, id = "sc" + kind;
  const props = {
    forest: html`<g fill="#14261a" opacity=".85">${[40, 120, 210, 800, 880, 960].map((x, i) => html`<path key=${i} d=${`M${x},${150 - (i % 2) * 12} l-26,60 h52 z M${x},${120 - (i % 2) * 12} l-20,50 h40 z`}/>`)}</g>`,
    cave: html`<g fill="#0c0a0e">${[60, 180, 330, 520, 690, 840, 950].map((x, i) => html`<path key=${i} d=${`M${x - 18},0 L${x},${40 + (i % 3) * 18} L${x + 18},0 z`}/>`)}</g>`,
    dungeon: html`<g fill="#24202a" stroke="#3a3440" strokeWidth="2">${[70, 930].map((x, i) => html`<g key=${i}><rect x=${x - 22} y="40" width="44" height="160"/><rect x=${x - 30} y="30" width="60" height="14"/></g>`)}<path d="M150,60 h700" stroke="#3a3440" strokeWidth="3" opacity=".6"/></g>`,
    swamp: html`<g stroke="#26321c" strokeWidth="3" opacity=".8">${Array.from({ length: 14 }, (_, i) => html`<path key=${i} d=${`M${30 + i * 70},230 q4,-30 -6,-52`} fill="none"/>`)}</g>`,
    desert: html`<path d="M0,170 Q160,120 320,165 T640,160 T1000,150 V200 H0 Z" fill="#c89a62" opacity=".7"/>`,
    snow: html`<g fill="#ffffff" opacity=".7">${Array.from({ length: 28 }, (_, i) => html`<circle key=${i} cx=${(i * 137) % 1000} cy=${(i * 53) % 150} r="2"/>`)}</g>`,
    town: html`<g fill="#2a2a3a" opacity=".85">${[[40, 90], [130, 70], [830, 80], [930, 100]].map(([x, h], i) => html`<g key=${i}><rect x=${x - 34} y=${200 - h} width="68" height=${h}/><path d=${`M${x - 40},${200 - h} L${x},${170 - h} L${x + 40},${200 - h} z`}/><rect x=${x - 8} y=${200 - h + 20} width="14" height="14" fill="#e8c06a" opacity=".6"/></g>`)}</g>`,
    ruins: html`<g fill="#4a4a54" opacity=".85"><rect x="40" y="90" width="34" height="110"/><rect x="110" y="140" width="34" height="60"/><rect x="900" y="110" width="34" height="90"/><path d="M820,200 l20,-70 l18,70 z"/></g>`,
    mountain: html`<path d="M0,170 L120,70 L220,150 L340,60 L470,160 L600,80 L730,150 L860,60 L1000,140 V200 H0 Z" fill="#4a5466" opacity=".7"/>`,
    water: html`<g><rect x="0" y="236" width="1000" height="64" fill="#3a6a8a" opacity=".55"/><path d="M0,250 q25,-8 50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0" stroke="#bfe4ff" strokeWidth="2" fill="none" opacity=".5"/></g>`,
    plains: html`<path d="M0,175 Q250,150 500,172 T1000,165 V200 H0 Z" fill="#4f6f34" opacity=".6"/>`,
  }[kind];
  return html`<svg className="bt-scene" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id=${id + "s"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor=${A.sky[0]}/><stop offset="1" stopColor=${A.sky[1]}/></linearGradient>
      <linearGradient id=${id + "g"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor=${A.ground[0]}/><stop offset="1" stopColor=${A.ground[1]}/></linearGradient>
      <radialGradient id=${id + "v"} cx="50%" cy="55%" r="70%"><stop offset="60%" stopColor="#000" stopOpacity="0"/><stop offset="100%" stopColor="#000" stopOpacity=".55"/></radialGradient></defs>
    <rect width="1000" height="300" fill=${`url(#${id}s)`}/>${props}
    <rect y="190" width="1000" height="110" fill=${`url(#${id}g)`}/>
    <path d="M500,10 V290" stroke="#fff" strokeOpacity=".12" strokeWidth="2" strokeDasharray="6 10"/>
    <rect width="1000" height="300" fill=${`url(#${id}v)`}/>
  </svg>`;
}
// a fight inside a mapped room: the battlefield is the room itself, furniture and all
function RoomScene({ room }){
  const st = SITE_STYLES[room.style] || SITE_STYLES.stone; const sx = 1000 / Math.max(1, room.w), sy = 300 / Math.max(1, room.h);
  const dark = room.light === "dark", dim = room.light === "dim";
  return html`<svg className="bt-scene" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="bt-floor" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill=${st.floor}/><path d=${st.rough ? "M10,15 q8,-8 16,0 q8,8 16,0" : "M0,0 h50 v50 M25,25 h25"} stroke=${st.floor2} strokeWidth="1.5" fill="none"/></pattern>
      <radialGradient id="bt-vig" cx="50%" cy="55%" r="70%"><stop offset="60%" stopColor="#000" stopOpacity="0"/><stop offset="100%" stopColor="#000" stopOpacity=".55"/></radialGradient></defs>
    <rect width="1000" height="300" fill="url(#bt-floor)"/>
    <rect x="6" y="6" width="988" height="288" fill="none" stroke=${st.wall} strokeWidth="12" rx="6"/>
    ${(room.objects || []).map((o, i) => html`<g key=${i} transform=${`translate(${o.x * sx} ${o.y * sy}) scale(${Math.min(sx, sy) / SU * 0.8})`} opacity=".85"><${ObjGlyph} o=${{ ...o, id: "b" + i }} style=${st}/></g>`)}
    ${room.hazard && html`<rect width="1000" height="300" fill=${{ fire: "rgba(255,120,40,.18)", water: "rgba(40,90,140,.3)", gas: "rgba(120,180,60,.22)", collapse: "rgba(120,100,80,.25)", ice: "rgba(200,230,255,.3)" }[room.hazard] || "none"}/>`}
    ${(dark || dim) && html`<rect width="1000" height="300" fill=${dark ? "rgba(5,3,8,.5)" : "rgba(5,3,8,.25)"}/>`}
    <path d="M500,10 V290" stroke="#fff" strokeOpacity=".12" strokeWidth="2" strokeDasharray="6 10"/>
    <rect width="1000" height="300" fill="url(#bt-vig)"/>
  </svg>`;
}
const COND_GLYPH = { raging: "🔥", blessed: "✦", poisoned: "☠", prone: "⤓", frightened: "!", stunned: "★", restrained: "⛓", paralyzed: "⛓", invisible: "◌", dodging: "↺", hasted: "»", slowed: "«", blinded: "◐", charmed: "♥", hidden: "◌", asleep: "z", grappled: "✊", burning: "🔥", shielded: "⛨", hexed: "✶", marked: "◎", inspired: "♪" };
function hpRing(frac, size, color){ const r = size / 2 - 2, L = 2 * Math.PI * r; return html`<svg className="bt-ring" width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`} aria-hidden="true"><circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="4"/><circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke=${color} strokeWidth="4" strokeDasharray=${`${Math.max(0, frac) * L} ${L}`} strokeLinecap="round" transform=${`rotate(-90 ${size / 2} ${size / 2})`}/></svg>`; }
function Battlefield({ c, cm, sel, ally, cur, myTurn, onFoe, onAlly }){
  const [hidden, setHidden] = useState(() => S().settings.battleMap === false);
  const [banner, setBanner] = useState(null);
  const barks = useBarks(c, cm);
  // caption: the latest thing that happened, in plain words, for a few seconds
  const [caption, setCaption] = useState(null);
  useEffect(() => { const l = [...(cm.log || [])].reverse().find(x => x.text && x.kind !== "sys" && !/^Round \d/.test(x.text)); if (!l) return;
    const t = l.text.replace(/\*\*/g, "").replace(/\[(\d+)\] \d+ vs AC \d+,?\s*/g, "").replace(/\s+/g, " ").trim(); if (!t) return;
    setCaption({ t: t.length > 110 ? t.slice(0, 108) + "…" : t, k: cm.log.length }); const h = setTimeout(() => setCaption(p => p && p.k === cm.log.length ? null : p), 3600); return () => clearTimeout(h); }, [cm.log?.length]);
  const order = (cm.order || []).filter(id => { const x = cm.cbt[id]; return x && !x.fled && isUp(c, x); });
  const curIdx = order.indexOf(cur?.id);
  const turnKey = `${cm.id}:${cm.round}:${cm.turn}`;
  useEffect(() => { if (!myTurn || !cur) return; setBanner(turnKey); Sfx.play("buff"); const t = setTimeout(() => setBanner(b => b === turnKey ? null : b), 1300); return () => clearTimeout(t); }, [turnKey, myTurn]);
  const mobile = typeof innerWidth === "number" && innerWidth < 700;
  const all = cbList(c).filter(x => !x.fled && !(x.side === "enemy" && x.dead && !x.boss && x.deadAt != null && false));
  const groups = { "party-back": [], "party-front": [], "enemy-front": [], "enemy-back": [] };
  for (const x of all) (groups[`${x.side === "enemy" ? "enemy" : "party"}-${x.pos === "back" ? "back" : "front"}`] || groups["party-front"]).push(x);
  const COLX = { "party-back": 13, "party-front": 33, "enemy-front": 67, "enemy-back": 87 };
  // size tokens so each line's rows never overlap (lines of 4+ split into two sub-columns)
  const H = mobile ? 205 : 250, maxSize = mobile ? 46 : 62;
  const colsOf = (n) => n >= 4 ? 2 : 1;
  let size = maxSize;
  for (const list of Object.values(groups)){ const per = Math.ceil(list.length / colsOf(list.length)); if (per >= 2) size = Math.min(size, Math.floor((H * 0.54) / (per - 1)) - 16); }
  size = Math.max(26, size);
  const place = [];
  for (const [g, list] of Object.entries(groups)){
    const cols = colsOf(list.length), per = Math.ceil(list.length / cols);
    list.forEach((x, i) => { const col = Math.floor(i / per), row = i % per, n = Math.min(per, list.length - col * per);
      const bossOn = Object.values(cm.cbt).some(e => e.side === "enemy" && e.boss && !e.fled);
      const y = (bossOn ? 30 : 18) + (n === 1 ? (bossOn ? 22 : 27) : (row * (bossOn ? 44 : 54)) / (n - 1));
      const dx = cols === 2 ? (col === 0 ? -1 : 1) * (mobile ? 6.5 : 5.5) * (g.startsWith("party") ? 1 : -1) : 0;
      place.push({ x, left: COLX[g] + dx, top: y }); });
  }
  if (hidden) return html`<div className="bt-collapsed"><button className="btn sm ghost" onClick=${() => { setHidden(false); store.set({ settings: { ...S().settings, battleMap: true } }); }}>🗺 Show battle map</button></div>`;
  const label = (x) => x.kind === "pc" ? firstName(cbChar(c, x)?.name || x.name) : x.name.replace(/\s*\(ritualist\)/, "");
  return html`<div className=${"battlefield scene-" + battleScene(cm.terrain)} role="group" aria-label="Battle map">
    ${cm.room && cm.room.objects ? html`<${RoomScene} room=${cm.room}/>` : html`<${SceneArt} kind=${battleScene(cm.terrain)}/>`}
    ${cm.room && (cm.room.cover || cm.room.choke || cm.room.high || cm.room.escape || cm.room.hazard) ? html`<div className="bt-room">${[cm.room.cover && "cover", cm.room.choke && "chokepoint", cm.room.high && "high ground", cm.room.escape && "escape route", cm.room.hazard && `hazard: ${cm.room.hazard}`].filter(Boolean).join(" · ")}</div>` : null}
    <div className="bt-lbl" style=${{ left: "13%" }}>Back</div><div className="bt-lbl" style=${{ left: "33%" }}>Front</div><div className="bt-lbl" style=${{ left: "67%" }}>Front</div><div className="bt-lbl" style=${{ left: "87%" }}>Back</div>
    <div className="bt-side" style=${{ left: "4%" }}>Your party</div><div className="bt-side right" style=${{ right: "4%" }}>Enemies</div>
    ${place.map(({ x, left, top }) => {
      const pc = x.kind === "pc" ? cbChar(c, x) : null; const up = isUp(c, x), hp = hpOf(c, x), max = x.kind === "pc" ? maxHp(pc) : (x.maxHp || 1);
      const frac = hp / max, col = frac > 0.5 ? "#4fd18b" : frac > 0.25 ? "#e6c65a" : "#e0503c";
      const isFoe = x.side === "enemy", acting = cur?.id === x.id, isSel = isFoe && x.id === sel, isAlly = !isFoe && ally === x.id;
      const blocked = myTurn && isFoe && up && cur && !canReach(c, cur, x, true);
      const conds = condsOf(c, x).filter(n => !["concentrating"].includes(n)).slice(0, 3);
      return html`<button key=${x.id} data-cb=${x.id} className=${"bt-token" + (isFoe ? " foe" : " ally") + (acting ? " acting" : "") + (isSel ? " sel" : "") + (isAlly ? " pick" : "") + (!up ? " down" : "") + (x.boss ? " boss" : "") + (x.npc ? " npc" : "")}
        style=${{ left: left + "%", top: top + "%", width: size + "px", height: size + "px" }}
        title=${`${x.name} · ${Math.max(0, hp)}/${max} HP${blocked ? " · behind their front line (ranged attacks and spells only)" : ""}`}
        onClick=${() => isFoe ? (up && onFoe(x.id)) : onAlly(x.id)}>
        ${isFoe ? html`<${MonsterPortrait} e=${x} size=${size}/>` : pc ? html`<${Portrait} ch=${pc} size=${size}/>` : html`<${Portrait} ch=${{ name: x.name, race: "Human", cls: x.summoned ? "Druid" : "Bard", tpl: "npc-" + x.name, look: { gear: false } }} size=${size}/>`}
        ${hpRing(frac, size + 8, col)}
        ${acting ? html`<span className="bt-turn">▼</span>` : null}
        ${blocked ? html`<span className="bt-shield" title="Behind the front line">🛡</span>` : null}
        ${!up ? html`<span className="bt-x">${x.side === "party" && pc && !pc.dead ? "DOWN" : "✕"}</span>` : null}
        ${conds.length ? html`<span className="bt-conds">${conds.map(n => html`<i key=${n} title=${cap(n)}>${COND_GLYPH[n] || n.slice(0, 1).toUpperCase()}</i>`)}</span>` : null}
        <span className="bt-name">${label(x)}</span>
        ${(() => { const i = order.indexOf(x.id); if (i < 0 || curIdx < 0 || i === curIdx) return null; const rel = (i - curIdx + order.length) % order.length; return rel <= 3 ? html`<span className=${"bt-order" + (rel === 1 ? " next" : "")} title=${rel === 1 ? "Acts next" : `Acts in ${rel} turns`}>${rel}</span>` : null; })()}
        ${barks[x.id] ? html`<span className=${"bt-bubble" + (isFoe ? " foe" : "")} key=${barks[x.id].at}>${barks[x.id].text}</span>` : null}
      </button>`; })}
    ${banner === turnKey && cur ? html`<div className="bt-banner">Your turn: ${label(cur)}</div>` : null}
    ${caption ? html`<div className="bt-caption" key=${caption.k}>${caption.t}</div>` : null}
    <button className="bt-hide" onClick=${() => { setHidden(true); store.set({ settings: { ...S().settings, battleMap: false } }); }} aria-label="Hide battle map" title="Hide battle map">✕</button>
    <div className="bt-round">Round ${cm.round}</div>
    <${BossBar} c=${c} cm=${cm}/>
    ${cm.lairFx?.round === cm.round ? html`<div className="bt-banner lair" key=${"lair" + cm.round}>⚠ ${cm.lairFx.name}!</div>` : null}
  </div>`;
}
// ---------- first-time coach tips ----------
function coachFor(tab, c){
  if (tab === "combat") return html`<${CoachTip} id="combat">Your party stands on the left, enemies on the right. <b>Melee attacks must get past the enemy's front line</b> (🛡 marks foes you can only hit with ranged attacks or spells). Tap an enemy to target it, then pick an action below. Hiding behind your own front line protects you too.<//>`;
  if (tab === "map" && !c?.explore && townOf(c)) return html`<${CoachTip} id="town">This is the town. <b>Tap a building to see what it is, then walk inside</b> to see its rooms and the people in it. Taverns, shops and temples have their services inside; back alleys and cellars hide ways down.<//>`;
  if (tab === "map") return c?.explore ? (dungeonOf(c)?.hostile === false ? html`<${CoachTip} id="site">You're inside a place with a floor plan. <b>Tap a glowing room to walk there</b>, and tap furniture or people in your room to examine, search, open, read or talk. Private rooms are off limits unless you sneak. Searching finds hidden doors and stashes.<//>` : html`<${CoachTip} id="dungeon">You're inside a dungeon. Tap a connected room to move there. Rooms can hold fights, traps, treasure or mysteries; the boss waits at the end. Furniture gives cover in a fight, doorways are chokepoints, and some rooms are hazardous. You can leave from any safe room.<//>`) : html`<${CoachTip} id="map">Tap a place to see what's there, then <b>Travel</b>. Roads are safer and faster. Places marked with skulls are dangerous: check your level first.<//>`;
  if (tab === "party") return html`<${CoachTip} id="party">Set each companion's role and tactics, and who stands in the front or back line. Companions have opinions: their approval changes with your choices.<//>`;
  if (tab === "adventure") return html`<${CoachTip} id="adventure">This is your story. <b>Type anything you want to do</b> ("I sneak past the guard", "I ask the innkeeper about the abbey") or tap a suggestion. The Dungeon Master answers and asks for dice rolls when the outcome is uncertain.<//>`;
  return null;
}
function CoachTip({ id, children }){
  const s = useStore(); const seen = s.settings.tipsSeen || {};
  if (seen[id] || s.settings.tipsOff) return null;
  const done = () => store.set({ settings: { ...S().settings, tipsSeen: { ...(S().settings.tipsSeen || {}), [id]: true } } });
  return html`<div className="coach" role="note"><span className="coach-ico">💡</span><div className="grow">${children}</div><button className="btn sm" onClick=${done}>Got it</button></div>`;
}
</script>
