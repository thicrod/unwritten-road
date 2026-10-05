<script>
"use strict";
// =====================================================================
//  FACTIONS: groups that remember what you do. Standing opens doors (discounts, allies, secrets)
//  or closes them; the DM weaves them into the story; the epilogue says how each remembers you.
// =====================================================================
const FACTION_KINDS = {
  order:     { icon: "⚔", names: ["The Grey Watch", "The Silver Shields", "The Lantern Wardens"], what: "the realm's watch and knights",
               perks: { 1: "They vouch for you: the DM treats the law as on your side", 2: "A sergeant of the order joins your boss fights" } },
  merchants: { icon: "⚖", names: ["The Lantern Guild", "The Gilded Scale", "The Copper Road Company"], what: "the merchants' guild",
               perks: { 1: "10% off everything you buy", 2: "20% off everything you buy" } },
  mages:     { icon: "✶", names: ["The Ember College", "The Starlit Athenaeum"], what: "a college of mages",
               perks: { 1: "A gift: an enchanted item", 2: "A gift: a rare enchanted item" } },
  wild:      { icon: "❦", names: ["The Thorn Circle", "The Green Wardens"], what: "druids and rangers of the wilds",
               perks: { 1: "Foraging is easier (DC −2)", 2: "The Circle's blessing: healed and blessed" } },
  thieves:   { icon: "🗝", names: ["The Velvet Hand", "The Quiet Knives"], what: "the thieves' guild",
               perks: { 1: "They whisper about a hidden place", 2: "They sell you a secret about your enemy" } },
  cult:      { icon: "☠", names: [], what: "the villain's followers", perks: {} },
};
const TIERS = [[-50, "Hated"], [-10, "Disliked"], [25, "Neutral"], [60, "Liked"], [Infinity, "Honored"]];
const tierOf = (rep) => rep <= -50 ? -2 : rep < -10 ? -1 : rep < 25 ? 0 : rep < 60 ? 1 : 2;
const TIER_NAME = { "-2": "Hated", "-1": "Disliked", 0: "Neutral", 1: "Liked", 2: "Honored" };
function ensureFactions(c){
  if (c.factions?.length) return;
  const seed = talkHash(c.id || c.name || "x"); const pickN = (arr, k) => arr[Math.abs(seed >> k) % arr.length];
  const kinds = ["order", "merchants", Math.abs(seed) % 2 ? "mages" : "wild", "thieves"];
  c.factions = kinds.map((k, i) => ({ id: k, kind: k, name: pickN(FACTION_KINDS[k].names, i * 3), rep: 0, perks: {} }));
  const v = c.villain?.name ? c.villain.name.replace(/^the\s+/i, "") : null;
  c.factions.push({ id: "cult", kind: "cult", name: v ? `Followers of ${v}` : "The Ashen Choir", rep: -60, perks: {}, hostile: true });
}
const factionBy = (c, idOrName) => (c.factions || []).find(f => f.id === idOrName || f.name.toLowerCase() === String(idOrName || "").toLowerCase() || f.name.toLowerCase().replace(/^the\s+/, "") === String(idOrName || "").toLowerCase().replace(/^the\s+/, ""));
const factionTier = (c, kind) => { const f = (c.factions || []).find(x => x.kind === kind); return f ? tierOf(f.rep) : 0; };
function changeRep(c, idOrName, delta, notes, why){
  const f = factionBy(c, idOrName); if (!f || !delta) return;
  if (f.hostile && delta > 0) delta = Math.min(delta, 5);                     // the villain's cult never really warms up
  const before = tierOf(f.rep); f.rep = clamp(f.rep + Math.round(delta), -100, 100); const after = tierOf(f.rep);
  notes?.push({ kind: delta > 0 ? "rep" : "hurt", text: `${FACTION_KINDS[f.kind].icon} ${f.name} ${delta > 0 ? "+" : ""}${Math.round(delta)}${why ? ` (${why})` : ""}` });
  if (after !== before) notes?.push({ kind: after > before ? "quest" : "hurt", text: `${f.name} now consider you ${TIER_NAME[after]}${after > before && FACTION_KINDS[f.kind].perks[after] ? `: ${FACTION_KINDS[f.kind].perks[after]}` : ""}` });
  if (after > before) for (let t = Math.max(1, before + 1); t <= after; t++) unlockPerk(c, f, t, notes);
}
// one-time rewards when you first reach Liked (1) or Honored (2)
function unlockPerk(c, f, t, notes){
  if (f.perks[t]) return; f.perks[t] = c.time?.day ?? 1;
  if (f.kind === "mages") giveLoot(c, { gold: 0, items: [pickMagic(t === 2 ? "rare" : "uncommon")] }, notes);
  if (f.kind === "wild" && t === 2){ for (const m of partyMembers(c)){ m.hp = maxHp(m); if (!hasCond(m, "blessed")) addCond(m, "blessed", { note: "The Circle's blessing" }); } notes?.push({ kind: "loot", text: "The Circle's blessing heals the party" }); }
  if (f.kind === "thieves" && t === 1){ const hidden = topLevelLocs(c).find(l => !l.discovered && !l.visited); if (hidden){ hidden.discovered = true; hidden.hidden = false; notes?.push({ kind: "map", text: `${f.name} whisper of a hidden place: ${hidden.name}` }); } }
  if (f.kind === "thieves" && t === 2) addClue(c, `${f.name} sold you a secret`, notes);
}
function applyFactionRep(c, raw, notes){
  if (!raw || typeof raw !== "object") return; ensureFactions(c);
  for (const [k, v] of Object.entries(raw).slice(0, 4)){ const n = clamp(Number(v) || 0, -20, 20); if (n) changeRep(c, k, n, notes); }
}
// what the DM needs to know, in one line
function factionContext(c){ ensureFactions(c); return (c.factions || []).map(f => `${f.name} (${FACTION_KINDS[f.kind].what}; ${TIER_NAME[tierOf(f.rep)]} ${f.rep})`).join("; "); }
// shop prices: the merchants' guild takes care of its friends
const factionPriceMult = (c) => { const t = factionTier(c, "merchants"); return t >= 2 ? 0.8 : t === 1 ? 0.9 : t <= -2 ? 1.25 : 1; };
// fights shift standing: bandits and cultists make the law (and the cult) take notice
function factionsAfterFight(c, cm, notes){
  ensureFactions(c); let law = 0, cult = 0;
  for (const id of cm.kills || []){ const e = cm.cbt[id]; const n = String(e?.base || e?.name || "").toLowerCase();
    if (/bandit|thug|brigand|raider/.test(n)) law += 2; if (/cult|fanatic|acolyte|necromancer/.test(n)){ cult -= 3; law += 1; } }
  if (law) changeRep(c, "order", Math.min(law, 8), notes, "outlaws defeated");
  if (cult) changeRep(c, "cult", Math.max(cult, -12), notes, "cultists slain");
}
// the order's sergeant answers the call in boss fights once you're Honored
function factionAllies(c){
  const cm = c.combat; if (!cm || factionTier(c, "order") < 2 || !Object.values(cm.cbt).some(x => x.side === "enemy" && x.boss) || cm.factionAlly) return;
  const f = c.factions.find(x => x.kind === "order"); const L = partyLevel(c); const id = uid("n"), hp = 20 + 6 * L;
  cm.cbt[id] = { id, side: "party", kind: "comp", npc: true, name: `Sergeant of ${f.name.replace(/^The /, "the ")}`.slice(0, 40), hp, maxHp: hp, ac: 17, pos: "front", conds: [], mods: { DEX: 1, STR: 3 },
    atk: [{ name: "Longsword", toHit: 3 + profBonus(L), dmg: `${L >= 11 ? 2 : 1}d8+3`, t: "slashing" }], type: "humanoid" };
  cm.order.push(id); cm.factionAlly = id; clog(c, "sys", `${cm.cbt[id].name} arrives to fight at your side!`);
}
function FactionsPanel({ c }){
  if (!c.factions?.length) return null;
  return html`<div className="parch panel"><h3 className="panel-title">Factions</h3>${c.factions.map(f => { const t = tierOf(f.rep), K = FACTION_KINDS[f.kind];
    return html`<div key=${f.id} className="faction"><div className="row" style=${{gap:8, alignItems:"center"}}><span className="fac-ico">${K.icon}</span><b className="grow">${f.name}</b><span className=${"fac-tier t" + t}>${TIER_NAME[t]}</span></div>
      <div className="fac-bar"><i style=${{ left: "50%", width: Math.abs(f.rep) / 2 + "%", transform: f.rep < 0 ? "translateX(-100%)" : "none", background: f.rep < 0 ? "#b2372d" : "#2f8f4e" }}></i></div>
      <div className="faint" style=${{fontSize:12.5}}>${K.what}${f.hostile ? " · hostile" : ""}${Object.entries(K.perks).map(([lv, txt]) => html` · <span className=${t >= +lv ? "perk on" : "perk"}>${TIER_NAME[lv]}: ${txt}</span>`)}</div></div>`; })}</div>`;
}
</script>
