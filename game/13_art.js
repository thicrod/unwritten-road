<script>
"use strict";
// =====================================================================
//  CHARACTER ART: procedural SVG portraits (race, class, look) and enemy icons
// =====================================================================
function artRng(seed){ let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ART_SKIN = {
  base: ["#f6dcc8", "#eec4a6", "#dfab85", "#c98f68", "#ad7450", "#8d5a3b", "#6e432b", "#4d2f1e"],
  "Half-Orc": ["#9db48a", "#87a174", "#7a9468", "#a3a78c", "#8c917c", "#6e7d5d"],
  Tiefling: ["#c4524e", "#a9443f", "#913b55", "#7b3c70", "#b36a8c", "#cf7f6f"],
  Dragonborn: ["#b87333", "#b8322a", "#2f6fb5", "#2f8f4e", "#cfa020", "#9aa6b2", "#3b3b46", "#a0692c"],
};
const DRAGON_TINT = { Black: "#3b3b46", Blue: "#2f6fb5", Brass: "#a0692c", Bronze: "#b87333", Copper: "#b5653a", Gold: "#cfa020", Green: "#2f8f4e", Red: "#b8322a", Silver: "#9aa6b2", White: "#d8dde3" };
const ART_HAIR = ["#1c1410", "#3b2416", "#5a3620", "#8a5a2b", "#b8834a", "#dcb86f", "#ece0b8", "#a33a1f", "#c9c9c9", "#f4f4f4", "#2d3a5a", "#5a2d5a"];
const ART_EYES = ["#3b6ea5", "#4f7a3a", "#6b4a2b", "#2b2b2b", "#8a6d2b", "#6a3f8f"];
const HAIR_STYLES = ["short", "long", "ponytail", "bun", "braids", "mohawk", "wild", "curly", "bald"];
const BEARDS = ["none", "stubble", "short", "long", "braided"];
// outfit / trim / backdrop per class
const CLASS_ART = {
  Barbarian: { cloth: "#6b4a2e", trim: "#c9a36a", bg: "#7a3b22" }, Bard: { cloth: "#7a2e5a", trim: "#e2b544", bg: "#6a2f63" },
  Cleric: { cloth: "#e6dfcb", trim: "#d1a23a", bg: "#8a7440" }, Druid: { cloth: "#4f6b35", trim: "#a8c46a", bg: "#34502c" },
  Fighter: { cloth: "#7d8a96", trim: "#a33a2e", bg: "#4d5866" }, Monk: { cloth: "#c9772b", trim: "#f0c36a", bg: "#8a4a1e" },
  Paladin: { cloth: "#cdd3db", trim: "#d9b04a", bg: "#5f6f8a" }, Ranger: { cloth: "#4a5a3a", trim: "#9a7a4a", bg: "#2f4a34" },
  Rogue: { cloth: "#2e2e36", trim: "#7a6a58", bg: "#26262e" }, Sorcerer: { cloth: "#3b3f8f", trim: "#f08a4a", bg: "#2f2a6a" },
  Warlock: { cloth: "#3a2440", trim: "#7cffb2", bg: "#241830" }, Wizard: { cloth: "#2f4a8a", trim: "#e6c65a", bg: "#1f3163" },
};
function shade(hex, f){ const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return "#" + [n >> 16 & 255, n >> 8 & 255, n & 255].map(c).map(v => v.toString(16).padStart(2, "0")).join(""); }
// a hero's look: their saved choices, filled in from a stable seed so companions always look the same
function lookFor(ch){
  const race = ch?.race || "Human", seed = ch?.look?.seed || ch?.companion?.tpl || ch?.tpl || ch?.id || ch?.name || "hero";
  const r = artRng(seed + race), pk = (a) => a[Math.floor(r() * a.length)];
  const pal = ART_SKIN[race] || ART_SKIN.base;
  const skin = race === "Dragonborn" ? (DRAGON_TINT[ch?.dragonType] || pk(pal)) : pk(pal);
  const style = race === "Dragonborn" ? "bald" : race === "Dwarf" ? pk(["short", "braids", "long", "bun", "bald"]) : pk(HAIR_STYLES.slice(0, 8));
  const beard = ["Dragonborn", "Tiefling"].includes(race) && r() < 0.8 ? "none" : race === "Dwarf" ? pk(["long", "braided", "short"]) : r() < 0.28 ? pk(["stubble", "short", "long"]) : "none";
  const base = { skin, hair: race === "Tiefling" ? pk(["#1c1410", "#2d1a3a", "#5a2d5a", "#3b2416"]) : pk(ART_HAIR), style, beard, eyes: pk(ART_EYES), gear: true };
  return { ...base, ...Object.fromEntries(Object.entries(ch?.look || {}).filter(([, v]) => v != null && v !== "")) };
}
function Portrait({ ch, size = 48, className = "" }){
  if (!ch) return null;
  const L = lookFor(ch), race = ch.race || "Human", cls = ch.cls || "Fighter", A = CLASS_ART[cls] || CLASS_ART.Fighter;
  const uid0 = "p" + Math.abs([...String((ch.id || ch.tpl || ch.name || "x") + JSON.stringify(L))].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36);
  const skin = L.skin, dk = shade(skin, 0.78), hair = L.hair, hairDk = shade(hair, 0.7), dragon = race === "Dragonborn";
  const gear = L.gear !== false;
  const hooded = gear && (cls === "Rogue" || cls === "Ranger" || cls === "Warlock");
  const headRx = race === "Dwarf" ? 17.5 : race === "Half-Orc" ? 17.5 : race === "Gnome" || race === "Halfling" ? 16.5 : 16;
  const headRy = race === "Dwarf" ? 17.5 : race === "Gnome" ? 17 : 19, headCy = race === "Dwarf" ? 47 : 46;
  const eyeGlow = gear && cls === "Warlock" ? A.trim : race === "Tiefling" ? "#f2c14e" : null;
  const eyeY = headCy, bx = 50;
  const longBack = !hooded && ["long", "braids"].includes(L.style);
  return html`<svg xmlns="http://www.w3.org/2000/svg" className=${"portrait " + className} width=${size} height=${size} viewBox="0 0 100 100" role="img" aria-label=${`Portrait of ${ch.name || "a hero"}`}>
    <defs>
      <radialGradient id=${uid0 + "bg"} cx="50%" cy="35%" r="75%"><stop offset="0%" stopColor=${shade(A.bg, 1.55)}/><stop offset="100%" stopColor=${shade(A.bg, 0.75)}/></radialGradient>
      <radialGradient id=${uid0 + "sk"} cx="42%" cy="38%" r="70%"><stop offset="0%" stopColor=${shade(skin, 1.08)}/><stop offset="100%" stopColor=${shade(skin, 0.86)}/></radialGradient>
      <clipPath id=${uid0 + "c"}><circle cx="50" cy="50" r="50"/></clipPath>
    </defs>
    <g clipPath=${`url(#${uid0}c)`}>
      <rect width="100" height="100" fill=${`url(#${uid0}bg)`}/>
      ${cls === "Ranger" && html`<g><line x1="66" y1="60" x2="80" y2="30" stroke="#6b4a2e" strokeWidth="3"/><path d="M78,26 l4,-6 l2,7 z M80,30 l6,-4 l-1,7 z" fill="#e6e0d0"/></g>`}
      ${hooded && html`<path d="M29,56 Q26,22 50,19 Q74,22 71,56 Q68,76 50,78 Q32,76 29,56 Z" fill=${shade(A.cloth, 0.8)}/>`}
      ${longBack && html`<path d=${L.style === "braids" ? "M33,44 Q31,60 34,74 L38,74 Q36,60 37,46 Z M67,44 Q69,60 66,74 L62,74 Q64,60 63,46 Z" : "M31,44 Q28,66 35,80 L65,80 Q72,66 69,44 Q67,28 50,27 Q33,28 31,44 Z"} fill=${hair}/>`}
      ${!hooded && L.style === "ponytail" && html`<path d="M63,34 Q79,42 72,66 Q69,52 62,44 Z" fill=${hair}/>`}
      ${!hooded && L.style === "bun" && html`<circle cx="50" cy="25" r="7" fill=${hair}/>`}
      <path d="M8,104 C10,80 30,70 50,70 C70,70 90,80 92,104 Z" fill=${A.cloth}/>
      <path d="M36,72 Q50,82 64,72" stroke=${A.trim} strokeWidth="2.2" fill="none"/>
      ${(cls === "Fighter" || cls === "Paladin") && html`<g fill=${shade(A.cloth, 1.12)} stroke=${shade(A.cloth, 0.7)} strokeWidth="1"><ellipse cx="22" cy="80" rx="13" ry="8"/><ellipse cx="78" cy="80" rx="13" ry="8"/></g>`}
      ${cls === "Barbarian" && html`<path d="M12,86 Q18,72 26,78 Q30,68 38,74 Q44,66 50,72 Q56,66 62,74 Q70,68 74,78 Q82,72 88,86 Z" fill="#8a6a44" stroke="#5a4028" strokeWidth="1"/>`}
      ${cls === "Cleric" && html`<g><circle cx="50" cy="86" r="5" fill=${A.trim}/><path d="M50,80 v12 M44,86 h12" stroke="#fff6d8" strokeWidth="1.6"/></g>`}
      ${cls === "Druid" && html`<path d="M50,78 q7,5 0,14 q-7,-9 0,-14 z" fill="#8fbf5a" stroke="#4f6b35" strokeWidth="0.8"/>`}
      ${(cls === "Wizard" || cls === "Sorcerer") && html`<path d="M50,79 l2,4.5 l5,0.5 l-3.8,3.2 l1.2,4.8 l-4.4,-2.6 l-4.4,2.6 l1.2,-4.8 l-3.8,-3.2 l5,-0.5 z" fill=${A.trim}/>`}
      ${cls === "Warlock" && html`<g><ellipse cx="50" cy="86" rx="6" ry="3.6" fill="#10141a" stroke=${A.trim} strokeWidth="1"/><circle cx="50" cy="86" r="1.8" fill=${A.trim}/></g>`}
      ${cls === "Monk" && html`<path d="M30,92 L70,80" stroke=${A.trim} strokeWidth="4"/>`}
      ${cls === "Rogue" && html`<path d="M28,78 L70,100" stroke="#5a4636" strokeWidth="4"/>`}
      ${cls === "Bard" && html`<path d="M40,76 l10,8 l10,-8" stroke=${A.trim} strokeWidth="2" fill="none"/>`}
      <rect x="44" y="58" width="12" height="14" rx="3" fill=${dk}/>
      ${!dragon && (race === "Elf" || race === "Half-Elf" ? html`<g fill=${skin} stroke=${dk} strokeWidth="0.8"><path d=${race === "Elf" ? "M35.5,47 L24,33 L37,42 Z" : "M35,48 L28,39 L36.5,44 Z"}/><path d=${race === "Elf" ? "M64.5,47 L76,33 L63,42 Z" : "M65,48 L72,39 L63.5,44 Z"}/></g>`
        : html`<g fill=${skin} stroke=${dk} strokeWidth="0.8"><ellipse cx=${bx - headRx + 0.6} cy=${headCy + 1} rx="2.8" ry="4.4"/><ellipse cx=${bx + headRx - 0.6} cy=${headCy + 1} rx="2.8" ry="4.4"/></g>`)}
      ${dragon ? html`<g>
          <path d="M34,40 Q34,25 50,24 Q66,25 66,40 Q66,52 59,60 Q55,66 50,66 Q45,66 41,60 Q34,52 34,40 Z" fill=${`url(#${uid0}sk)`} stroke=${shade(skin, 0.6)} strokeWidth="1"/>
          <path d="M40,31 l-4,-10 l7,7 z M47,27 l0,-11 l4,9 z M55,28 l5,-10 l0,11 z M61,32 l7,-8 l-3,10 z" fill=${shade(skin, 0.7)}/>
          <g stroke=${shade(skin, 0.72)} strokeWidth="0.7" fill="none"><path d="M40,36 q2,-2 4,0 M46,33 q2,-2 4,0 M52,33 q2,-2 4,0 M58,36 q-2,-2 -4,0 M43,52 q2,-2 4,0 M53,52 q2,-2 4,0"/></g>
          <ellipse cx="46.5" cy="61.5" rx="1.1" ry="0.8" fill=${shade(skin, 0.45)}/><ellipse cx="53.5" cy="61.5" rx="1.1" ry="0.8" fill=${shade(skin, 0.45)}/>
          <path d="M42,59 Q50,63 58,59" stroke=${shade(skin, 0.5)} strokeWidth="1" fill="none"/>
          <ellipse cx="43" cy="44" rx="3" ry="2.2" fill="#f5c542"/><ellipse cx="57" cy="44" rx="3" ry="2.2" fill="#f5c542"/>
          <rect x="42.5" y="42.2" width="1" height="3.6" rx="0.5" fill="#1a1a1a"/><rect x="56.5" y="42.2" width="1" height="3.6" rx="0.5" fill="#1a1a1a"/>
          <path d="M38.5,39.5 L47,41 M61.5,39.5 L53,41" stroke=${shade(skin, 0.55)} strokeWidth="1.6" strokeLinecap="round"/>
        </g>` : html`<g>
          <ellipse cx=${bx} cy=${headCy} rx=${headRx} ry=${headRy} fill=${`url(#${uid0}sk)`} stroke=${shade(skin, 0.7)} strokeWidth="0.8"/>
          ${race === "Half-Orc" && html`<path d="M34.5,50 Q37,63 50,66 Q63,63 65.5,50" fill=${skin} stroke=${shade(skin, 0.7)} strokeWidth="0.8"/>`}
          <path d=${`M${bx - 10.5},${eyeY - 4.2} Q${bx - 7},${eyeY - 6} ${bx - 3.6},${eyeY - 4.6} M${bx + 10.5},${eyeY - 4.2} Q${bx + 7},${eyeY - 6} ${bx + 3.6},${eyeY - 4.6}`} stroke=${race === "Half-Orc" ? shade(hair, 0.8) : hairDk} strokeWidth=${race === "Half-Orc" || race === "Dwarf" ? 2.2 : 1.5} strokeLinecap="round" fill="none"/>
          ${eyeGlow ? html`<g fill=${eyeGlow}><ellipse cx=${bx - 7} cy=${eyeY} rx="2.8" ry="1.9"/><ellipse cx=${bx + 7} cy=${eyeY} rx="2.8" ry="1.9"/></g>`
            : html`<g><ellipse cx=${bx - 7} cy=${eyeY} rx="2.8" ry="1.9" fill="#fbf8f2"/><ellipse cx=${bx + 7} cy=${eyeY} rx="2.8" ry="1.9" fill="#fbf8f2"/>
              <circle cx=${bx - 6.6} cy=${eyeY + 0.2} r="1.35" fill=${L.eyes}/><circle cx=${bx + 7.4} cy=${eyeY + 0.2} r="1.35" fill=${L.eyes}/>
              <circle cx=${bx - 6.3} cy=${eyeY - 0.3} r="0.4" fill="#fff"/><circle cx=${bx + 7.7} cy=${eyeY - 0.3} r="0.4" fill="#fff"/></g>`}
          ${race === "Gnome" ? html`<ellipse cx=${bx} cy=${eyeY + 6.5} rx="3.4" ry="3" fill=${shade(skin, 0.92)} stroke=${dk} strokeWidth="0.7"/>`
            : html`<path d=${race === "Dwarf" || race === "Half-Orc" ? `M${bx},${eyeY + 1} Q${bx - 3},${eyeY + 8} ${bx + 1.5},${eyeY + 8.4}` : `M${bx},${eyeY + 1.5} Q${bx - 1.8},${eyeY + 6.8} ${bx + 1},${eyeY + 7.2}`} stroke=${dk} strokeWidth="1.1" fill="none" strokeLinecap="round"/>`}
          ${(race === "Halfling" || race === "Gnome") && html`<g fill="#e88a7a" opacity="0.35"><circle cx=${bx - 9.5} cy=${eyeY + 7} r="2.6"/><circle cx=${bx + 9.5} cy=${eyeY + 7} r="2.6"/></g>`}
        </g>`}
      ${!dragon && ["short", "long", "braided"].includes(L.beard) && html`<path d=${L.beard === "short" ? "M35.5,50 Q37,64 50,66.5 Q63,64 64.5,50 Q60,58.5 50,58.8 Q40,58.5 35.5,50 Z" : "M34.5,49 Q35,73 50,82 Q65,73 65.5,49 Q61,59 50,59.2 Q39,59 34.5,49 Z"} fill=${hair}/>`}
      ${!dragon && L.beard === "braided" && html`<path d="M47,70 v12 M53,70 v12" stroke=${hairDk} strokeWidth="1.2"/>`}
      ${!dragon && L.beard === "stubble" && html`<path d="M36,51 Q38,63 50,65 Q62,63 64,51 Q60,58.5 50,59 Q40,58.5 36,51 Z" fill=${hair} opacity="0.3"/>`}
      ${!dragon && ["short", "long", "braided"].includes(L.beard) && html`<path d=${`M${bx - 6},${eyeY + 9} Q${bx},${eyeY + 7} ${bx + 6},${eyeY + 9}`} stroke=${hairDk} strokeWidth="2.2" fill="none" strokeLinecap="round"/>`}
      ${!dragon && html`<path d=${`M${bx - 3.8},${eyeY + 10.6} Q${bx},${eyeY + 12.4} ${bx + 3.8},${eyeY + 10.6}`} stroke="#7a3b2e" strokeWidth="1.2" fill="none" strokeLinecap="round"/>`}
      ${race === "Half-Orc" && html`<g fill="#f4efe2" stroke="#b9b09a" strokeWidth="0.4"><path d=${`M${bx - 4.2},${eyeY + 11} l-0.9,-4 l2.6,3.4 z`}/><path d=${`M${bx + 4.2},${eyeY + 11} l0.9,-4 l-2.6,3.4 z`}/></g>`}
      ${gear && cls === "Barbarian" && !dragon && html`<g stroke="#2f5fa8" strokeWidth="1.6" strokeLinecap="round" opacity="0.85"><path d=${`M${bx - 11},${eyeY + 3.5} l4,1 M${bx - 11},${eyeY + 6} l4,1 M${bx + 11},${eyeY + 3.5} l-4,1 M${bx + 11},${eyeY + 6} l-4,1`}/></g>`}
      ${gear && cls === "Sorcerer" && html`<path d=${`M${bx + 9},${eyeY + 4} l2,3 l-2,3 l2,3`} stroke=${A.trim} strokeWidth="1.2" fill="none" opacity="0.9"/>`}
      ${!dragon && !hooded && L.style !== "bald" && L.style !== "mohawk" && html`<path d=${L.style === "wild" ? "M32.5,47 L30,36 L35,38 L34,28 L40,32 L42,24 L47,29 L50,22 L53,29 L58,24 L60,32 L66,28 L65,38 L70,36 L67.5,47 Q64,34 50,33 Q36,34 32.5,47 Z"
          : L.style === "curly" ? "M33,46 Q29,40 32,35 Q31,29 37,28 Q39,23 45,24 Q50,20 55,24 Q61,23 63,28 Q69,29 68,35 Q71,40 67,46 Q64,34 50,33 Q36,34 33,46 Z"
          : "M33.5,46 Q31.5,27 50,25.5 Q68.5,27 66.5,46 Q64.5,33.5 50,32.5 Q38,33 36,40 Q35,43 33.5,46 Z"} fill=${hair}/>`}
      ${!dragon && L.style === "mohawk" && !hooded && html`<path d="M46.5,34 Q48,19 50,16 Q52,19 53.5,34 Q50,31 46.5,34 Z" fill=${hair}/>`}
      ${race === "Tiefling" && html`<g fill="#3a2a2a" stroke="#1d1414" strokeWidth="0.8"><path d="M38,31 Q30,24 31,12 Q35,22 42,27 Z"/><path d="M62,31 Q70,24 69,12 Q65,22 58,27 Z"/></g>`}
      ${hooded && html`<path d="M31,52 Q30,24 50,22 Q70,24 69,52 L66,52 Q66,31 50,29.5 Q34,31 34,52 Z" fill=${A.cloth} stroke=${shade(A.cloth, 0.6)} strokeWidth="1"/>`}
      ${gear && cls === "Wizard" && html`<g><ellipse cx="50" cy="31" rx="23" ry="4.6" fill=${shade(A.cloth, 0.85)}/><path d="M35,31 Q43,20 52,6 Q56,1 58,8 Q60,20 65,31 Z" fill=${A.cloth}/><path d="M36.5,29 Q50,33 63.5,29" stroke=${A.trim} strokeWidth="2" fill="none"/><circle cx="54" cy="17" r="1.6" fill=${A.trim}/></g>`}
      ${gear && cls === "Paladin" && html`<g><path d="M32,47 Q30.5,23 50,21 Q69.5,23 68,47 L64,47 Q63,31 50,30 Q37,31 36,47 Z" fill=${A.cloth} stroke=${shade(A.cloth, 0.6)} strokeWidth="1"/><path d="M50,21 v9" stroke=${A.trim} strokeWidth="2"/><path d="M36,32 Q50,26 64,32" stroke=${A.trim} strokeWidth="1.4" fill="none"/></g>`}
      ${gear && cls === "Cleric" && !dragon && html`<g><path d="M34,38 Q50,33 66,38" stroke=${A.trim} strokeWidth="1.8" fill="none"/><circle cx="50" cy="35" r="2" fill="#7fd0ff" stroke=${A.trim} strokeWidth="0.8"/></g>`}
      ${gear && cls === "Druid" && html`<g fill="#6f9a3e" stroke="#3d5a22" strokeWidth="0.5">${[[36, 35, -40], [41, 30, -20], [47, 28, -5], [53, 28, 5], [59, 30, 20], [64, 35, 40]].map(([x, y, a], i) => html`<ellipse key=${i} cx=${x} cy=${y} rx="2.4" ry="4.2" transform=${`rotate(${a} ${x} ${y})`}/>`)}</g>`}
      ${gear && cls === "Bard" && html`<g><path d="M30,35 Q38,21 58,22 Q72,25 69,35 Q50,30 30,35 Z" fill=${A.cloth} stroke=${shade(A.cloth, 0.6)} strokeWidth="0.8"/><path d="M64,26 Q78,14 84,6 Q76,20 68,29 Z" fill=${A.trim}/></g>`}
      ${gear && cls === "Monk" && !dragon && html`<path d="M33.5,39 Q50,34 66.5,39" stroke="#b8322a" strokeWidth="2.6" fill="none"/>`}
      ${gear && cls === "Warlock" && html`<path d="M50,33 l2,3 l-2,3 l-2,-3 z" fill=${A.trim}/>`}
    </g>
    <circle cx="50" cy="50" r="48.8" fill="none" stroke=${A.trim} strokeWidth="2.4" opacity="0.9"/>
  </svg>`;
}
// small type glyphs for enemies
const ENEMY_ART = {
  humanoid: { c: "#6b5b4a", d: "M12,4 a4.5,4.5 0 1,1 -0.01,0 z M5,21 q1,-8 7,-8 q6,0 7,8 z" },
  beast: { c: "#7a5a2e", d: "M12,13 q5,0 5,5 q0,3 -5,3 q-5,0 -5,-3 q0,-5 5,-5 z M6,11 a2,2.4 0 1,1 0.01,0 z M18,11 a2,2.4 0 1,1 0.01,0 z M9,7 a2,2.4 0 1,1 0.01,0 z M15,7 a2,2.4 0 1,1 0.01,0 z" },
  undead: { c: "#5a5a66", d: "M12,3 q7,0 7,7 q0,4 -3,5.5 v3.5 h-8 v-3.5 q-3,-1.5 -3,-5.5 q0,-7 7,-7 z M9,9 a1.8,1.8 0 1,0 0.01,0 z M15,9 a1.8,1.8 0 1,0 0.01,0 z" },
  dragon: { c: "#8a2e22", d: "M3,18 q4,-12 13,-13 q-2,3 -1,5 q4,-1 6,2 q-3,1 -4,3 q-4,-1 -6,2 q-3,1 -8,1 z" },
  fiend: { c: "#7a1f2a", d: "M5,3 q2,5 5,6 h4 q3,-1 5,-6 q1,6 -2,9 q0,7 -5,9 q-5,-2 -5,-9 q-3,-3 -2,-9 z" },
  fey: { c: "#3f7a5a", d: "M12,12 q-8,-9 -9,-2 q0,5 9,2 q-7,4 -5,7 q3,2 5,-7 q2,9 5,7 q2,-3 -5,-7 q9,3 9,-2 q-1,-7 -9,2 z" },
  giant: { c: "#6a5238", d: "M7,21 v-6 q-2,-2 -2,-5 q0,-3 3,-3 h8 q3,0 3,3 v11 z M8,7 v-3 h2 v3 M12,7 v-4 h2 v4" },
  construct: { c: "#5a6470", d: "M10.5,2 h3 l0.6,3 l2.6,1.1 l2.5,-1.8 l2.1,2.1 l-1.8,2.5 l1.1,2.6 l3,0.6 v3 l-3,0.6 l-1.1,2.6 l1.8,2.5 l-2.1,2.1 l-2.5,-1.8 l-2.6,1.1 l-0.6,3 h-3 l-0.6,-3 l-2.6,-1.1 l-2.5,1.8 l-2.1,-2.1 l1.8,-2.5 l-1.1,-2.6 l-3,-0.6 v-3 l3,-0.6 l1.1,-2.6 l-1.8,-2.5 l2.1,-2.1 l2.5,1.8 l2.6,-1.1 z M12,9 a3,3 0 1,0 0.01,0 z" },
  ooze: { c: "#4f7a2e", d: "M3,19 q0,-6 4,-8 q1,-6 6,-6 q5,0 5,5 q4,2 3,9 z" },
  elemental: { c: "#b8541e", d: "M12,2 q6,6 5,11 q3,-2 2,-5 q4,5 1,10 q-3,4 -8,4 q-6,0 -8,-5 q-2,-5 3,-9 q0,4 3,4 q-2,-5 2,-10 z" },
  monstrosity: { c: "#6a3a2a", d: "M3,8 h18 l-2,4 l-2,-2 l-2,3 l-2,-3 l-2,3 l-2,-3 l-2,2 z M3,16 h18 l-2,-4 l-2,2 l-2,-3 l-2,3 l-2,-3 l-2,3 l-2,-2 z" },
  aberration: { c: "#4a2f6a", d: "M12,4 q7,0 8,6 q-1,6 -8,6 q-7,0 -8,-6 q1,-6 8,-6 z M12,7 a3,3 0 1,0 0.01,0 z M6,15 q-1,5 -3,6 M10,16 q0,4 -1,6 M14,16 q0,4 1,6 M18,15 q1,5 3,6" },
  plant: { c: "#3d6a2a", d: "M12,21 v-8 M12,13 q-9,-1 -8,-9 q8,0 8,9 M12,11 q8,0 8,-8 q-8,0 -8,8" },
};
function EnemyIcon({ type, boss, size = 20 }){
  const a = ENEMY_ART[String(type || "").toLowerCase()] || ENEMY_ART.humanoid;
  const stroked = ["plant", "aberration"].includes(String(type).toLowerCase());
  return html`<svg className="enemy-icon" width=${size} height=${size} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill=${a.c}/><path d=${a.d} fill=${stroked ? "none" : "#f3e7cf"} stroke=${stroked ? "#f3e7cf" : "none"} strokeWidth=${stroked ? 1.6 : 0} strokeLinecap="round" transform="translate(2.4 2.4) scale(0.8)"/>${boss ? html`<circle cx="12" cy="12" r="11" fill="none" stroke="#e6c65a" strokeWidth="1.6"/>` : null}</svg>`;
}
// the portrait designer shown in the character creator
function LookPicker({ dr, setDr }){
  const L = lookFor({ ...dr, id: "draft-" + (dr.name || "hero") }), set = (patch) => setDr({ ...dr, look: { ...L, ...patch, seed: L.seed || String(Math.random()).slice(2, 10) } });
  const race = dr.race, pal = race === "Dragonborn" ? Object.values(DRAGON_TINT) : ART_SKIN[race] || ART_SKIN.base;
  const Sw = ({ colors, k }) => html`<div className="swatches">${colors.map(col => html`<button key=${col} type="button" className=${"swatch" + (L[k] === col ? " on" : "")} style=${{ background: col }} aria-label=${col} onClick=${() => set({ [k]: col })}></button>`)}</div>`;
  return html`<div className="look-picker">
    <div className="look-preview"><${Portrait} ch=${{ ...dr, id: "draft", look: L }} size=${132}/>
      <button type="button" className="btn sm ghost" onClick=${() => setDr({ ...dr, look: { seed: String(Math.random()).slice(2, 10) } })}>🎲 Random look</button></div>
    <div className="look-opts grow">
      <div className="field"><label>${race === "Dragonborn" ? "Scales" : "Skin"}</label><${Sw} colors=${pal} k="skin"/></div>
      ${race !== "Dragonborn" && html`<div className="field"><label>Hair</label><${Seg} value=${L.style} options=${HAIR_STYLES.map(x => [x, cap(x)])} onChange=${v => set({ style: v })}/><${Sw} colors=${ART_HAIR} k="hair"/></div>`}
      ${race !== "Dragonborn" && html`<div className="field"><label>Beard</label><${Seg} value=${L.beard} options=${BEARDS.map(x => [x, cap(x)])} onChange=${v => set({ beard: v })}/></div>`}
      ${race !== "Dragonborn" && race !== "Tiefling" && html`<div className="field"><label>Eyes</label><${Sw} colors=${ART_EYES} k="eyes"/></div>`}
      <label className="row" style=${{ gap: 6, fontSize: 13.5 }}><input type="checkbox" checked=${L.gear !== false} onChange=${e => set({ gear: e.target.checked })}/> Show class gear (hat, hood, helm…)</label>
    </div></div>`;
}
</script>
<script>
"use strict";
// ======================= MONSTER PORTRAITS =======================
// Humanoid foes reuse the hero generator (dressed by role); other families get their own drawings.
function monsterKind(e){
  const n = String(e?.base || e?.name || "").toLowerCase(), t = String(e?.type || "").toLowerCase();
  const has = (...w) => w.some(x => n.includes(x));
  if (has("mimic")) return "mimic";
  if (has("goblin", "kobold", "hobgoblin", "bugbear")) return "goblin";
  if (has("skeleton", "lich", "bone")) return "skeleton";
  if (has("zombie", "ghoul", "wight", "mummy", "drowned")) return "zombie";
  if (has("ghost", "wraith", "specter", "spectre", "banshee", "shadow", "wisp", "phantom")) return "ghost";
  if (has("spider")) return "spider";
  if (has("troll")) return "troll";
  if (has("ogre", "giant", "ettin", "cyclops")) return "ogre";
  if (has("dragon", "wyrm", "drake", "wyvern", "lizard")) return "dragon";
  if (has("ooze", "slime", "jelly", "cube", "pudding")) return "ooze";
  if (has("demon", "devil", "imp", "fiend", "quasit")) return "demon";
  if (has("elemental", "mephit")) return "elemental";
  if (has("golem", "construct", "animated", "gargoyle")) return "golem";
  if (has("hag", "vampire", "necromancer", "witch")) return "humanoid";
  if (has("wolf", "hound", "hyena", "gnoll", "bear", "boar", "panther", "lion", "rat", "worg", "dog", "minotaur", "harpy", "stirge", "ettercap")) return "beast";
  if (t === "undead") return "zombie"; if (t === "beast" || t === "monstrosity") return "beast"; if (t === "fiend") return "demon";
  if (t === "ooze") return "ooze"; if (t === "construct") return "golem"; if (t === "elemental") return "elemental"; if (t === "dragon") return "dragon"; if (t === "giant") return "ogre";
  if (t === "humanoid" || has("bandit", "cult", "thug", "guard", "knight", "mage", "priest", "orc", "scout", "captain", "soldier", "berserker", "assassin", "acolyte", "fanatic", "veteran")) return "humanoid";
  return null;
}
function humanoidAs(e){
  const n = String(e?.base || e?.name || "").toLowerCase(), has = (...w) => w.some(x => n.includes(x));
  const cls = has("cult", "fanatic", "acolyte", "warlock", "necromancer", "hag", "witch", "vampire") ? "Warlock" : has("mage", "wizard", "apprentice", "sorcer") ? "Wizard" : has("priest") ? "Cleric" : has("berserker", "orc") ? "Barbarian" : has("scout", "archer", "hunter") ? "Ranger" : has("knight", "guard", "soldier", "veteran", "captain") ? "Fighter" : "Rogue";
  const look = has("hag") ? { skin: "#6f8f4a", hair: "#2d3a2a", beard: "none" } : has("vampire") ? { skin: "#e8e2e6", hair: "#1c1410", beard: "none" } : has("necromancer") ? { skin: "#c9c4b8", hair: "#f4f4f4" } : null;
  return { race: has("orc") ? "Half-Orc" : has("elf") ? "Elf" : has("dwarf") ? "Dwarf" : "Human", cls, tpl: "foe-" + n, name: e?.name, look };
}
const MON_COL = { goblin: ["#6f8f3a", "#3f5a22"], skeleton: ["#e8e0c8", "#8a8272"], zombie: ["#8a9a72", "#4f5a40"], ghost: ["#bfe4ff", "#6a8fb0"], spider: ["#2a2230", "#120d16"], troll: ["#5f7f4a", "#34482a"], ogre: ["#a8845a", "#6a4f32"], dragon: ["#b8322a", "#6a1a14"], ooze: ["#7fd05a", "#3f7a2a"], demon: ["#b8322a", "#5a1414"], elemental: ["#ff8a3d", "#a33a1e"], golem: ["#8a8f96", "#4a4f56"], beast: ["#8a6a4a", "#4a3624"], mimic: ["#8a5a2e", "#4a2e14"] };
const MON_BG = { goblin: "#2f3a1e", skeleton: "#2a2a34", zombie: "#2a3326", ghost: "#1d2a3a", spider: "#3a1d2a", troll: "#1f3326", ogre: "#3a2a1a", dragon: "#3a1410", ooze: "#1f3a1a", demon: "#3a0f10", elemental: "#3a1c0e", golem: "#26292e", beast: "#33261a", mimic: "#2e1f10" };
function MonsterPortrait({ e, size = 26, className = "" }){
  const kind = monsterKind(e);
  if (!kind) return html`<${EnemyIcon} type=${e?.type} boss=${e?.boss} size=${size}/>`;
  if (kind === "humanoid") return html`<${Portrait} ch=${humanoidAs(e)} size=${size} className=${className}/>`;
  const r = artRng(String(e?.base || e?.name) + kind); let [c1, c2] = MON_COL[kind];
  if (kind === "dragon"){ const n = String(e?.base || e?.name).toLowerCase(); c1 = /lizard/.test(n) ? "#5a8a3a" : /blue/.test(n) ? "#2f6fb5" : /green/.test(n) ? "#2f8f4e" : /black/.test(n) ? "#3b3b46" : /white/.test(n) ? "#d8dde3" : /gold/.test(n) ? "#cfa020" : /silver/.test(n) ? "#9aa6b2" : c1; c2 = shade(c1, 0.55); }
  const bn = String(e?.base || e?.name).toLowerCase();
  const beastV = kind !== "beast" ? null : /owlbear/.test(bn) ? "owl" : /bear/.test(bn) ? "bear" : /rat/.test(bn) ? "rat" : /minotaur/.test(bn) ? "bull" : /boar/.test(bn) ? "boar" : /harpy|stirge/.test(bn) ? "bird" : /ettercap/.test(bn) ? "bug" : "wolf";
  if (kind === "beast"){ c1 = { owl: "#8a6a4a", bear: "#6b4a2e", rat: "#7a7a82", bull: "#5a3a24", boar: "#6a5040", bird: "#7a6a8a", bug: "#5a6a3a", wolf: ["#8a8a92", "#8a6a4a", "#4a4a52", "#a88a5a"][Math.floor(r() * 4)] }[beastV]; c2 = shade(c1, 0.55); }
  if (kind === "elemental"){ const n = String(e?.base || e?.name).toLowerCase(); c1 = /water|ice/.test(n) ? "#4aa8e0" : /earth|stone/.test(n) ? "#8a6a4a" : /air|storm/.test(n) ? "#c8d8e8" : c1; c2 = shade(c1, 0.6); }
  const gid = "m" + kind + Math.floor(r() * 1e6);
  const eyes = (y, col, rx = 3, ry = 2.2, gap = 8) => html`<g fill=${col}><ellipse cx=${50 - gap} cy=${y} rx=${rx} ry=${ry}/><ellipse cx=${50 + gap} cy=${y} rx=${rx} ry=${ry}/></g>`;
  const body = {
    goblin: html`<g><path d="M30,48 L6,30 L32,40 Z M70,48 L94,30 L68,40 Z" fill=${c1} stroke=${c2} strokeWidth="1.2"/><ellipse cx="50" cy="52" rx="20" ry="18" fill=${c1} stroke=${c2} strokeWidth="1.2"/>${eyes(48, "#ffe14a", 3.4, 2.4)}<circle cx="42" cy="48" r="1.1" fill="#111"/><circle cx="58" cy="48" r="1.1" fill="#111"/><path d="M50,50 l-3,6 h5 z" fill=${c2}/><path d="M38,60 Q50,68 62,60 L60,63 L57,60 L54,64 L51,60 L48,64 L45,60 L42,63 Z" fill="#f4efe2" stroke="#3a2a1a" strokeWidth="0.8"/></g>`,
    skeleton: html`<g><path d="M30,48 Q30,26 50,25 Q70,26 70,48 Q70,58 63,62 L62,72 L38,72 L37,62 Q30,58 30,48 Z" fill=${c1} stroke=${c2} strokeWidth="1.4"/><ellipse cx="41" cy="48" rx="6" ry="6.5" fill="#15121a"/><ellipse cx="59" cy="48" rx="6" ry="6.5" fill="#15121a"/><circle cx="41" cy="49" r="1.6" fill="#7cf0ff"/><circle cx="59" cy="49" r="1.6" fill="#7cf0ff"/><path d="M50,54 l-2.5,5 h5 z" fill="#15121a"/><path d="M40,64 v7 M44,64 v8 M48,64 v8 M52,64 v8 M56,64 v8 M60,64 v7" stroke=${c2} strokeWidth="1.2"/></g>`,
    zombie: html`<g><ellipse cx="50" cy="50" rx="19" ry="21" fill=${c1} stroke=${c2} strokeWidth="1.2"/><path d="M34,36 Q44,28 58,32" stroke="#3a2a1a" strokeWidth="3" fill="none"/>${eyes(48, "#f2f0d0", 3.4, 3)}<circle cx="42" cy="48.5" r="0.9" fill="#222"/><circle cx="58.5" cy="47.5" r="0.9" fill="#222"/><path d="M40,62 Q48,58 60,63" stroke="#3a1a1a" strokeWidth="2.2" fill="none"/><path d="M56,38 l6,8 M57,42 l3,-2 M59,45 l3,-2" stroke="#3a2a1a" strokeWidth="1"/></g>`,
    ghost: html`<g opacity="0.9"><path d="M30,74 Q28,40 34,32 Q42,20 50,20 Q58,20 66,32 Q72,40 70,74 Q66,68 62,74 Q58,68 54,74 Q50,68 46,74 Q42,68 38,74 Q34,68 30,74 Z" fill=${`url(#${gid})`}/><ellipse cx="42" cy="44" rx="4" ry="6" fill="#0e1622"/><ellipse cx="58" cy="44" rx="4" ry="6" fill="#0e1622"/><ellipse cx="50" cy="60" rx="4" ry="6" fill="#0e1622"/></g>`,
    spider: html`<g><g stroke=${c1} strokeWidth="3" fill="none" strokeLinecap="round">${[[-1, 34], [-1, 44], [-1, 54], [-1, 64], [1, 34], [1, 44], [1, 54], [1, 64]].map(([sd, y], i) => html`<path key=${i} d=${`M50,${50} Q${50 + sd * 30},${y - 14} ${50 + sd * 40},${y + 6}`}/>`)}</g><ellipse cx="50" cy="56" rx="17" ry="15" fill=${c1} stroke="#5a1a2a" strokeWidth="1.2"/><circle cx="50" cy="40" r="11" fill=${c1}/><g fill="#ff3b3b">${[[44, 37], [56, 37], [41, 42], [59, 42], [47, 34], [53, 34], [46, 42], [54, 42]].map(([x, y], i) => html`<circle key=${i} cx=${x} cy=${y} r=${i < 2 ? 2.4 : 1.4}/>`)}</g><path d="M46,48 l-2,5 M54,48 l2,5" stroke="#e8e0c8" strokeWidth="1.6"/></g>`,
    troll: html`<g><ellipse cx="50" cy="52" rx="21" ry="21" fill=${c1} stroke=${c2} strokeWidth="1.2"/><path d="M30,40 Q24,30 28,24 Q34,32 38,34 Z M70,40 Q76,30 72,24 Q66,32 62,34 Z" fill=${c2}/><path d="M36,42 L46,45 M64,42 L54,45" stroke=${c2} strokeWidth="3" strokeLinecap="round"/>${eyes(48, "#ffcf4a", 2.4, 1.8, 7)}<path d="M50,47 Q44,62 52,64 Q56,60 50,47 Z" fill=${shade(c1, 0.85)} stroke=${c2} strokeWidth="0.8"/><path d="M38,66 Q50,72 62,66" stroke="#2a1a10" strokeWidth="2" fill="none"/><path d="M42,66 l1,-5 l2,5 M58,66 l-1,-5 l-2,5" fill="#f4efe2"/></g>`,
    ogre: html`<g><ellipse cx="50" cy="52" rx="23" ry="21" fill=${c1} stroke=${c2} strokeWidth="1.2"/><path d="M33,42 L46,46 M67,42 L54,46" stroke=${c2} strokeWidth="3.4" strokeLinecap="round"/>${eyes(49, "#fbf8f2", 2.6, 1.8, 7)}<circle cx="43" cy="49" r="1.2" fill="#2a1a10"/><circle cx="57" cy="49" r="1.2" fill="#2a1a10"/><ellipse cx="50" cy="56" rx="4" ry="3" fill=${shade(c1, 0.8)}/><path d="M36,64 Q50,74 64,64 Q50,68 36,64 Z" fill="#3a1a10"/><path d="M40,65 l2,-5 l2,5 M56,65 l2,-5 l2,5" fill="#f4efe2"/></g>`,
    dragon: html`<g><path d="M34,36 Q26,20 20,14 Q34,20 40,30 Z M66,36 Q74,20 80,14 Q66,20 60,30 Z" fill=${shade(c1, 0.7)}/><path d="M32,44 Q32,26 50,25 Q68,26 68,44 Q68,58 60,66 Q55,72 50,72 Q45,72 40,66 Q32,58 32,44 Z" fill=${`url(#${gid})`} stroke=${c2} strokeWidth="1.2"/><g stroke=${c2} strokeWidth="0.8" fill="none"><path d="M40,36 q2,-2 4,0 M47,33 q2,-2 4,0 M54,33 q2,-2 4,0 M58,38 q2,-2 4,0"/></g><ellipse cx="41" cy="46" rx="4" ry="2.6" fill="#ffd23a"/><ellipse cx="59" cy="46" rx="4" ry="2.6" fill="#ffd23a"/><rect x="40.4" y="43.6" width="1.3" height="4.8" rx="0.6" fill="#111"/><rect x="58.4" y="43.6" width="1.3" height="4.8" rx="0.6" fill="#111"/><ellipse cx="46" cy="66" rx="1.3" ry="1" fill=${c2}/><ellipse cx="54" cy="66" rx="1.3" ry="1" fill=${c2}/><path d="M42,70 l2,-4 l2,4 M54,70 l2,-4 l2,4" fill="#f4efe2"/></g>`,
    ooze: html`<g><path d="M22,74 Q20,56 30,50 Q30,32 50,30 Q70,32 70,48 Q82,54 78,74 Z" fill=${`url(#${gid})`} stroke=${c2} strokeWidth="1.2" opacity="0.92"/><circle cx="38" cy="58" r="3" fill="#e8ffd8" opacity="0.6"/><circle cx="62" cy="64" r="2" fill="#e8ffd8" opacity="0.6"/><circle cx="56" cy="42" r="1.6" fill="#e8ffd8" opacity="0.6"/>${eyes(50, "#1a2a12", 2.6, 3, 7)}<path d="M26,74 q2,6 4,0 M66,74 q2,7 4,0" stroke=${c1} strokeWidth="3" strokeLinecap="round"/></g>`,
    demon: html`<g><path d="M36,34 Q22,22 26,6 Q32,22 42,28 Z M64,34 Q78,22 74,6 Q68,22 58,28 Z" fill="#2a1414" stroke="#120808" strokeWidth="1"/><path d="M31,46 Q31,26 50,25 Q69,26 69,46 Q69,62 58,69 L50,74 L42,69 Q31,62 31,46 Z" fill=${`url(#${gid})`} stroke=${c2} strokeWidth="1.2"/><path d="M36,42 L46,46 M64,42 L54,46" stroke="#2a0a0a" strokeWidth="2.6" strokeLinecap="round"/>${eyes(49, "#ffd23a", 3.2, 2)}<path d="M40,60 Q50,66 60,60 Q50,63 40,60 Z" fill="#1a0808"/><path d="M43,61 l1,4 l1,-4 M55,61 l1,4 l1,-4" fill="#f4efe2"/></g>`,
    elemental: html`<g><path d="M50,14 Q66,30 64,44 Q72,40 70,32 Q82,48 74,64 Q66,78 50,78 Q34,78 26,64 Q20,50 30,38 Q30,48 38,50 Q32,34 50,14 Z" fill=${`url(#${gid})`}/>${eyes(52, "#fffbe0", 3.6, 2.4, 8)}<path d="M42,62 Q50,66 58,62" stroke="#fffbe0" strokeWidth="1.6" fill="none"/></g>`,
    golem: html`<g><rect x="30" y="28" width="40" height="44" rx="6" fill=${`url(#${gid})`} stroke=${c2} strokeWidth="1.4"/><path d="M30,40 h40 M36,28 v12 M60,58 l10,6" stroke=${c2} strokeWidth="1"/><rect x="37" y="45" width="9" height="5" rx="1" fill="#7cf0ff"/><rect x="54" y="45" width="9" height="5" rx="1" fill="#7cf0ff"/><rect x="40" y="60" width="20" height="4" rx="1" fill=${c2}/></g>`,
    beast: html`<g>${beastV === "bull" ? html`<path d="M32,38 Q14,34 10,20 Q22,30 36,32 Z M68,38 Q86,34 90,20 Q78,30 64,32 Z" fill="#e8dcc0" stroke="#8a7a5a" strokeWidth="1"/>` : null}
      ${beastV === "bear" || beastV === "rat" ? html`<g fill=${c1} stroke=${c2} strokeWidth="1.2"><circle cx=${beastV === "rat" ? 30 : 34} cy=${beastV === "rat" ? 32 : 34} r=${beastV === "rat" ? 9 : 6.5}/><circle cx=${beastV === "rat" ? 70 : 66} cy=${beastV === "rat" ? 32 : 34} r=${beastV === "rat" ? 9 : 6.5}/></g>` : null}
      ${beastV === "rat" ? html`<g fill="#e8a0a8"><circle cx="30" cy="32" r="5"/><circle cx="70" cy="32" r="5"/></g>` : null}
      ${beastV === "owl" || beastV === "bird" ? html`<path d="M34,36 L30,22 L42,32 Z M66,36 L70,22 L58,32 Z" fill=${shade(c1, 0.8)}/>` : null}
      ${beastV === "wolf" || beastV === "boar" || beastV === "bull" || beastV === "bug" ? html`<path d="M32,40 L28,20 L42,32 Z M68,40 L72,20 L58,32 Z" fill=${c1} stroke=${c2} strokeWidth="1.2"/>` : null}<ellipse cx="50" cy="48" rx="19" ry="18" fill=${c1} stroke=${c2} strokeWidth="1.2"/><path d="M40,54 Q50,48 60,54 Q62,68 50,72 Q38,68 40,54 Z" fill=${shade(c1, 1.15)} stroke=${c2} strokeWidth="1"/>${beastV === "owl" || beastV === "bird" ? html`<path d="M45,52 L50,62 L55,52 Z" fill="#d9a23a" stroke="#6a4a1a" strokeWidth="0.8"/>` : html`<ellipse cx="50" cy="56" rx=${beastV === "boar" || beastV === "bull" ? 6 : 4} ry=${beastV === "boar" || beastV === "bull" ? 4 : 2.8} fill=${beastV === "boar" || beastV === "bull" ? "#c89a8a" : "#1a1410"}/>`}
      ${beastV === "owl" ? html`<g><circle cx="42" cy="44" r="6.5" fill="#f4e6b0" stroke=${c2} strokeWidth="1"/><circle cx="58" cy="44" r="6.5" fill="#f4e6b0" stroke=${c2} strokeWidth="1"/><circle cx="42" cy="44" r="3" fill="#111"/><circle cx="58" cy="44" r="3" fill="#111"/></g>` : html`<g>${eyes(45, beastV === "bug" ? "#ff3b3b" : "#ffcf4a", 2.6, 2, 8)}<circle cx="42" cy="45" r="1" fill="#111"/><circle cx="58" cy="45" r="1" fill="#111"/></g>`}
      ${beastV === "boar" ? html`<path d="M42,62 Q38,54 40,50 L43,58 Z M58,62 Q62,54 60,50 L57,58 Z" fill="#f4efe2"/>` : beastV === "rat" ? html`<path d="M47,64 h2.5 v4 h-2.5 z M50.5,64 h2.5 v4 h-2.5 z" fill="#f4efe2"/>` : beastV === "owl" || beastV === "bird" ? null : html`<path d="M45,66 l1.5,3 l1.5,-3 M52,66 l1.5,3 l1.5,-3" fill="#f4efe2"/>`}</g>`,
    mimic: html`<g><rect x="24" y="44" width="52" height="30" rx="3" fill=${c1} stroke=${c2} strokeWidth="1.4"/><path d="M24,44 Q50,18 76,44 Z" fill=${shade(c1, 1.1)} stroke=${c2} strokeWidth="1.4" transform="rotate(-14 24 44)"/><path d="M26,46 l4,6 l4,-6 l4,6 l4,-6 l4,6 l4,-6 l4,6 l4,-6 l4,6 l4,-6 l4,6" fill="#f4efe2" stroke="#3a2a1a" strokeWidth="0.6"/><path d="M34,58 Q50,70 66,58" stroke="#b8322a" strokeWidth="5" fill="none" strokeLinecap="round"/>${eyes(37, "#ffd23a", 2.6, 2, 9)}<path d="M24,58 h52" stroke="#d9b04a" strokeWidth="2"/></g>`,
  }[kind];
  return html`<svg className=${"portrait monster " + className} width=${size} height=${size} viewBox="0 0 100 100" role="img" aria-label=${e?.name || kind}>
    <defs><radialGradient id=${gid} cx="45%" cy="35%" r="75%"><stop offset="0%" stopColor=${shade(c1, 1.25)}/><stop offset="100%" stopColor=${c2}/></radialGradient>
      <radialGradient id=${gid + "bg"} cx="50%" cy="40%" r="75%"><stop offset="0%" stopColor=${shade(MON_BG[kind], 1.8)}/><stop offset="100%" stopColor=${MON_BG[kind]}/></radialGradient>
      <clipPath id=${gid + "c"}><circle cx="50" cy="50" r="50"/></clipPath></defs>
    <g clipPath=${`url(#${gid}c)`}><rect width="100" height="100" fill=${`url(#${gid}bg)`}/>${body}</g>
    <circle cx="50" cy="50" r="48.8" fill="none" stroke=${e?.boss ? "#e6c65a" : "#7a2e22"} strokeWidth=${e?.boss ? 3 : 2.2}/>
  </svg>`;
}
// dramatic boss introduction when a boss fight begins
function BossIntro({ cm }){
  const boss = cm && Object.values(cm.cbt || {}).find(x => x.side === "enemy" && x.boss);
  const [shown, setShown] = useState(null); const key = cm?.id;
  useEffect(() => { if (!boss || !key || shown === key || cm.round > 1 || S().settings.reduceMotion) return; setShown(key); Sfx.play("phase"); const t = setTimeout(() => setShown(k => k === key ? "done:" + key : k), 2600); return () => clearTimeout(t); }, [key, !!boss]);
  if (!boss || shown !== key) return null;
  const c = C(); const title = c?.villain && c.combat?.origin?.loc === c.villain.lair ? (c.villain.title || "The villain") : boss.name.includes("(") ? "" : (monsterKind(boss) === "humanoid" ? "A deadly foe" : "A terrible foe");
  return html`<div className="boss-intro" onClick=${() => setShown("done:" + key)}><div className="bi-band"><${MonsterPortrait} e=${boss} size=${150}/><div className="bi-text"><div className="bi-kicker">${title || "Boss"}</div><div className="bi-name">${boss.name}</div><div className="bi-sub">${boss.type ? cap(boss.type) : ""}${boss.cr != null ? ` · CR ${boss.cr}` : ""} · ${boss.maxHp} HP</div></div></div></div>`;
}
</script>
