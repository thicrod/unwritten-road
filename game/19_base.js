<script>
"use strict";
// =====================================================================
//  PARTY BASE (a hall in a town, with upgrades) · FAST TRAVEL between visited towns
// =====================================================================
const BASE_COST = 600;
const BASE_UPGRADES = [
  { id: "forge", icon: "🔨", name: "Forge", cost: 400, d: "+2 to all crafting checks." },
  { id: "library", icon: "📚", name: "Library", cost: 500, d: "Spend a day researching: a clue about the villain (or XP once the story moves on)." },
  { id: "chapel", icon: "⛪", name: "Chapel", cost: 450, d: "Resting at your base also lifts curses and cures disease." },
  { id: "stables", icon: "🐎", name: "Stables", cost: 350, d: "Fast travel is free and takes half the time." },
  { id: "training", icon: "🎯", name: "Training yard", cost: 500, d: "Spend a day training: every hero gains XP." },
  { id: "treasury", icon: "💰", name: "Treasury", cost: 600, d: "Earns 10 gold per party level each day, collected when you visit." },
];
const hasUp = (c, id) => !!c.base?.up?.[id];
function inBaseTown(c){ const t = townOf(c); return !!(t && c.base && c.base.town === t.id); }
function canBuyBase(c){ const t = townOf(c); return !!(t && !c.base && !t.fallen && standing(c, t) > -20); }
function buyBase(){
  const c0 = C(); const t = townOf(c0); if (!t || c0.base || t.fallen) return;
  if (standing(c0, t) <= -20) return coopNotify(`No one in ${t.name} will sell to you.`, "bad");
  if (partyGold(c0) < BASE_COST) return coopNotify(`You need ${BASE_COST} gold to buy a hall.`, "bad");
  store.camp(c => { spend(c, BASE_COST); c.base = { town: t.id, name: `${t.name} Hall`, up: {}, day: c.time.day, collected: c.time.day }; sysNote(c, { kind: "loot", text: `You bought a hall in ${t.name}: your party's base` }); });
  hostUI(() => setTimeout(() => openModal({ type: "base" }), 80));
  runDM("event", { text: `The party buys an old hall in ${t.name} to serve as their base: describe the building, its quirks, and a local who comes to welcome them. Keep it short.`, offline: `The old hall in ${t.name} is yours.` });
}
function buyUpgrade(id){
  const c0 = C(); const u = BASE_UPGRADES.find(x => x.id === id); if (!c0.base || !u || hasUp(c0, id)) return;
  if (!inBaseTown(c0)) return coopNotify("You need to be at your base to build.", "bad");
  if (partyGold(c0) < u.cost) return coopNotify("Not enough gold in the party purse.", "bad");
  store.camp(c => { spend(c, u.cost); c.base.up = { ...(c.base.up || {}), [id]: c.time.day }; sysNote(c, { kind: "loot", text: `Built: ${u.name}` }); });
  Sfx.play("coin");
}
function baseIncome(c){ return hasUp(c, "treasury") ? Math.max(0, c.time.day - (c.base.collected ?? c.time.day)) * 10 * partyLevel(c) : 0; }
function baseCollect(){ const c0 = C(); const g = baseIncome(c0); if (!g || !inBaseTown(c0)) return; store.camp(c => { c.characters[c.activeCharId].gold += g; c.base.collected = c.time.day; sysNote(c, { kind: "loot", text: `Collected ${g} gold from your treasury` }); }); Sfx.play("coin"); }
function baseRest(){
  const c0 = C(); if (!inBaseTown(c0) || S().busy) return;
  store.camp(c => { doLongRestAll(c); if (hasUp(c, "chapel")) for (const m of partyMembers(c)) m.conditions = m.conditions.filter(k => !["cursed", "diseased"].includes(k.name)); advanceTime(c, 1); c.time.phase = "morning"; sysNote(c, { kind: "loot", text: `Rested at ${c.base.name}${hasUp(c, "chapel") ? ": the chapel's blessing lifts any curse or sickness" : ""}` }); });
  hostUI(closeModal);
  runDM("event", { text: `The party rests a night at their own base, ${C().base.name}. Write a short, cozy scene: companions settling in, one small moment of banter. It's morning now.`, offline: "You wake rested in your own hall." });
}
function baseStudy(){
  const c0 = C(); if (!inBaseTown(c0) || !hasUp(c0, "library")) return;
  if (c0.base.studied === c0.time.day) return coopNotify("You've already studied today.", "bad");
  store.camp(c => { advanceTime(c, 1); c.base.studied = c.time.day; const n = []; if (c.story?.act === 1) addClue(c, "old records in your library", n); else for (const m of partyMembers(c)) gainXP(c, m, 30 * partyLevel(c), n, "study", m.id !== c.activeCharId); n.unshift({ kind: "npc", text: "A day of research in the library" }); pushLog(c, { kind: "sys", notes: n }); });
}
function baseTrain(){
  const c0 = C(); if (!inBaseTown(c0) || !hasUp(c0, "training")) return;
  if (c0.base.trained === c0.time.day) return coopNotify("You've already trained today.", "bad");
  store.camp(c => { advanceTime(c, 1); c.base.trained = c.time.day; const n = [{ kind: "npc", text: "A day of hard training in the yard" }]; for (const m of partyMembers(c)) gainXP(c, m, 40 * partyLevel(c), n, "training", m.id !== c.activeCharId); pushLog(c, { kind: "sys", notes: n }); });
}
function BaseModal(){
  const s = useStore(); const c = s.campaign; if (!c?.base) return null; const here = inBaseTown(c), inc = baseIncome(c), gold = partyGold(c);
  return html`<${Modal} title=${c.base.name} onClose=${closeModal} wide=${true}>
    <p className="faint" style=${{ marginTop: 0 }}>Your party's base in ${c.locations[c.base.town]?.name}. ${here ? "Resting here is free." : "Travel here to rest, build and use your upgrades."}</p>
    ${here && html`<div className="row wrap" style=${{ gap: 8, marginBottom: 12 }}>
      <button className="btn primary" disabled=${!!s.busy} onClick=${baseRest}>🛏 Rest here (free)</button>
      ${hasUp(c, "library") && html`<button className="btn" onClick=${baseStudy}>📚 Research (1 day)</button>`}
      ${hasUp(c, "training") && html`<button className="btn" onClick=${baseTrain}>🎯 Train (1 day)</button>`}
      ${inc > 0 && html`<button className="btn gold" onClick=${baseCollect}>💰 Collect ${inc} gold</button>`}</div>`}
    <h3 className="panel-title">Upgrades <span className="chip">Party purse: ${gold} gp</span></h3>
    <div className="ach-grid">${BASE_UPGRADES.map(u => { const built = hasUp(c, u.id);
      return html`<div key=${u.id} className=${"ach" + (built ? " got" : "")} style=${{ opacity: 1, filter: "none" }}><span className="ach-ico">${u.icon}</span><div className="grow"><b>${u.name}</b><div className="faint" style=${{ fontSize: 12.5 }}>${u.d}</div>
        ${built ? html`<div className="faint" style=${{ fontSize: 12 }}>Built ✓</div>` : html`<button className="btn sm" style=${{ marginTop: 6 }} disabled=${!here || gold < u.cost} title=${!here ? "Be at your base to build" : ""} onClick=${() => buyUpgrade(u.id)}>Build · ${u.cost} gp</button>`}</div></div>`; })}</div>
  <//>`;
}
// ---------- fast travel ----------
function fastTravelInfo(c, toId){
  const from = topLoc(c, c.currentLocationId), to = c.locations[toId];
  if (!from || !to || from.id === to.id || !isSettlement(from) || !isSettlement(to) || !to.visited || to.fallen) return null;
  const dist = Math.hypot((to.gx ?? 0) - (from.gx ?? 0), (to.gy ?? 0) - (from.gy ?? 0));
  const stables = hasUp(c, "stables"); let days = Math.max(1, Math.round(dist / 6)); if (stables) days = Math.max(1, Math.ceil(days / 2));
  return { days, cost: stables ? 0 : 5 * partyMembers(c).length + 2 * days, from, to, stables };
}
function fastTravel(toId){
  const c0 = C(); const f = fastTravelInfo(c0, toId); if (!f || S().busy || c0.combat) return;
  if (partyGold(c0) < f.cost) return coopNotify(`The coach costs ${f.cost} gold.`, "bad");
  closeModal?.();
  store.camp(c => { const notes = []; spend(c, f.cost); advanceTime(c, f.days); const to = c.locations[toId]; moveTo(c, to); onArrive(c, to, notes); tallyOf(c).fastTravels++;
    notes.unshift({ kind: "map", text: `Fast travel to ${to.name}: ${f.days} day${f.days > 1 ? "s" : ""}${f.cost ? `, ${f.cost} gold` : " (your stables)"}` }); pushLog(c, { kind: "sys", notes }); });
  hostUI(() => store.set({ tab: "adventure" }));
  runDM("event", { text: `The party travels safely by coach and well-kept roads to ${f.to.name} (${f.days} day${f.days > 1 ? "s" : ""}). In 2-3 sentences, describe arriving: what's changed, and one detail that catches their eye.`, offline: `You arrive at ${f.to.name}.` });
}
function coopFastTravel(id){ closeModal(); if (Coop.active()) return Coop.propose("fast", { to: id }, "yes"); return fastTravel(id); }
</script>
