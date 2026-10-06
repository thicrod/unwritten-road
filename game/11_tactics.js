<script>
"use strict";
// =====================================================================
//  TACTICAL COMBAT: objectives, morale, reinforcements, cover, flanking,
//  line-wide area spells and the Shove action
// =====================================================================

// ---------- positioning ----------
// Ranged attacks against someone in the back line get +2 AC (half cover) while their front line stands.
function coverBonus(c, att, tgt, a){
  if (!(a.ranged || (a.spell && !a.melee)) || tgt.pos !== "back") return 0;
  if (cbList(c).some(x => x.side === tgt.side && x.id !== tgt.id && x.pos === "front" && isUp(c, x))) return 2;
  return c.combat?.room?.cover ? 2 : 0;   // furniture, pillars and rubble shelter the back line even once the front falls
}
// the room fights too: fire spreads, floors give way, gas chokes, water drags
const ROOM_HAZARDS = {
  fire:     { name: "Flames spread across the room", save: "DEX", t: "fire", cond: "burning" },
  gas:      { name: "Choking fumes fill the air", save: "CON", t: "poison", cond: "poisoned" },
  water:    { name: "The water surges, dragging at legs", save: "STR", t: "bludgeoning", cond: "prone" },
  collapse: { name: "Stones fall from the ceiling", save: "DEX", t: "bludgeoning", cond: "prone" },
  ice:      { name: "The ice cracks and shifts", save: "DEX", t: "cold", cond: "prone" },
};
function roomBattleNote(room){ const bits = []; if (room.cover) bits.push("cover for the back line"); if (room.choke) bits.push("a chokepoint: only two foes can press in at once"); if (room.high) bits.push("the high ground (+1 to ranged attacks)"); if (room.escape) bits.push("an escape route"); if (room.hazard && ROOM_HAZARDS[room.hazard]) bits.push(`a hazard: ${room.hazard}`); return bits.length ? `The ${room.name || "room"} offers ${bits.join(", ")}.` : ""; }
function roomHazardRound(c){
  const cm = c.combat; const hz = cm?.room?.hazard && ROOM_HAZARDS[cm.room.hazard]; if (!hz || cm.status !== "active" || cm.sandbox || cm.round < 2 || cm.round % 2) return;
  const L = partyLevel(c); const dc = 10 + Math.floor(L / 3), dice = `${1 + Math.floor(L / 4)}d6`;
  const heroes = party(c).filter(x => x.kind === "pc" && isUp(c, x)), foes = enemies(c).filter(e => isUp(c, e));
  const hits = [...(heroes.length ? [heroes[rnd(heroes.length)]] : []), ...(foes.length ? [foes[rnd(foes.length)]] : [])];
  clog(c, "sys", `${hz.name}!`); cm.lairFx = { round: cm.round, name: hz.name };
  for (const h of hits){
    const n = dmgOf(dice); let ok;
    if (h.kind === "pc") ok = !!heroSave(c, h, hz.save, dc, hz.t).success; else ok = d(20) + (h.mods?.[hz.save] || 0) >= dc;
    const dealt = ok ? Math.floor(n / 2) : n; const real = hurt(c, h, dealt, hz.t); clog(c, "sys", `${h.name} ${ok ? "weathers it" : "is caught"}${real ? ` (${real} ${hz.t})` : ""}.`); if (!c.combat || cm.status !== "active") return;
    if (!ok && hz.cond && isUp(c, h)) addC(c, h, hz.cond, { rounds: 1 });
  }
}
// Flanking: once an ally has already struck a target in melee this round, further melee attacks on it have advantage.
function tacticalFlank(c, att, tgt){ const m = c.combat?.melee?.[tgt.id]; return !!m && m.some(id => id !== att.id && c.combat.cbt[id]?.side === att.side); }
function noteMelee(c, att, tgt){ const cm = c.combat; if (!cm) return; cm.melee = cm.melee || {}; const m = cm.melee[tgt.id] = cm.melee[tgt.id] || []; if (!m.includes(att.id)) m.push(att.id); }
function lineTargets(c, side, pos){ return cbList(c).filter(x => x.side === side && x.pos === pos && isUp(c, x)); }
// the enemy line where an area spell would hit the most foes
function bestLineTargets(c, n){ const f = lineTargets(c, "enemy", "front"), b = lineTargets(c, "enemy", "back"); return (b.length > f.length ? b : f).slice(0, n).map(x => x.id); }

// ---------- Shove: push a front-line foe back (exposing their allies) or knock them prone ----------
function doShove(c, targetId, mode){
  const cm = c.combat, me = actorCb(c), tgt = cm?.cbt[targetId]; const ch = me && cbChar(c, me);
  if (!cm?.pt?.action) return { error: "No action left." };
  if (!tgt || tgt.side !== "enemy" || !isUp(c, tgt)) return { error: "Pick an enemy to shove." };
  if (!canReach(c, me, tgt, true)) return { error: "You can't reach them." };
  if (["huge", "gargantuan"].includes(tgt.size)) return { error: "It's far too big to shove." };
  cm.pt.action = false; cm.pt.attacksLeft = 0;
  const mine = rollD20({}).kept + (ch ? skillMod(ch, "Athletics") : 0);
  const theirs = rollD20({}).kept + Math.max(tgt.mods?.STR || 0, tgt.mods?.DEX || 0);
  if (mine < theirs){ clog(c, "party", `${B(me.name)} tries to shove ${B(tgt.name)} but can't budge them (${mine} vs ${theirs}).`); return {}; }
  if (mode === "back" && tgt.pos === "front"){ tgt.pos = "back"; clog(c, "party", `${B(me.name)} shoves ${B(tgt.name)} back out of the front line (${mine} vs ${theirs})!`); fx(c, { k: "cond", to: tgt.id, n: "Pushed back" }); }
  else { addC(c, tgt, "prone", { rounds: 1 }); clog(c, "party", `${B(me.name)} knocks ${B(tgt.name)} flat (${mine} vs ${theirs})!`); }
  return {};
}
function pcShove(targetId, mode){ return playerAct(c => doShove(c, targetId, mode)); }

// ---------- objectives ----------
// kinds: survive (hold out N rounds) · protect (keep an ally NPC alive) · ritual (kill the ritualist before N rounds)
function setupTactics(c, spec){
  const cm = c.combat; if (!cm) return;
  if (spec.reinforce?.enemies?.length) cm.reinforce = { round: clamp(Math.round(num(spec.reinforce.round, 3)), 2, 8), enemies: spec.reinforce.enemies.slice(0, 3), text: String(spec.reinforce.text || "Reinforcements arrive!").slice(0, 120) };
  const o = spec.objective; if (!o || !["survive", "protect", "ritual"].includes(o.kind)) return;
  const rounds = clamp(Math.round(num(o.rounds, 4)), 2, 8);
  if (o.kind === "survive") cm.objective = { kind: "survive", rounds, text: String(o.text || `Hold out for ${rounds} rounds`).slice(0, 120), status: "active" };
  if (o.kind === "protect"){
    const id = uid("n"), hp = clamp(Math.round(num(o.hp, 14)), 6, 60);
    cm.cbt[id] = { id, side: "party", kind: "comp", npc: true, name: String(o.name || "the captive").slice(0, 40), hp, maxHp: hp, ac: 11, atk: [{ name: "Improvised weapon", toHit: 2, dmg: "1d4", t: "bludgeoning" }], conds: [], mods: { DEX: 0 }, pos: "back", init: 1 };
    cm.order.push(id);
    cm.objective = { kind: "protect", targetId: id, text: String(o.text || `Keep ${cm.cbt[id].name} alive`).slice(0, 120), status: "active" };
  }
  if (o.kind === "ritual"){
    const foe = enemies(c).filter(e => !e.boss).sort((a, b) => a.hp - b.hp)[0] || enemies(c)[0]; if (!foe) return;
    foe.name = `${foe.name} (ritualist)`;
    cm.objective = { kind: "ritual", rounds, targetId: foe.id, text: String(o.text || `Stop the ritual: defeat ${foe.name} within ${rounds} rounds`).slice(0, 140), status: "active" };
  }
}
function objectiveProgress(c){
  const cm = c.combat, o = cm?.objective; if (!o) return "";
  if (o.status === "done") return "Done!"; if (o.status === "failed") return "Failed";
  if (o.kind === "survive") return `Round ${Math.min(cm.round, o.rounds)} of ${o.rounds}`;
  if (o.kind === "ritual") return `${Math.max(0, o.rounds - cm.round + 1)} round${o.rounds - cm.round + 1 === 1 ? "" : "s"} left`;
  if (o.kind === "protect"){ const t = cm.cbt[o.targetId]; return t ? `${Math.max(0, t.hp)}/${t.maxHp} HP` : ""; }
  return "";
}
// called at the start of every new round
function tacticsRound(c){
  try { if (c.combat?.round === 1 || !c.combat?.factionAlly) factionAllies(c); } catch (e) { console.warn(e); }
  try { lairAction(c); } catch (e) { console.warn("lair action", e); }
  try { roomHazardRound(c); } catch (e) { console.warn("room hazard", e); }
  const cm = c.combat; if (!cm || cm.status !== "active") return;
  cm.melee = {}; cm.chokeUsed = 0;
  if (cm.reinforce && cm.round >= cm.reinforce.round && !cm.reinforce.done){
    cm.reinforce.done = true; clog(c, "enemy", `**${cm.reinforce.text}**`);
    for (const e of cm.reinforce.enemies) for (const x of addEnemies(c, { name: e.name, count: e.count || 1 })){ x.summoned = false; x.pos = x.pos || "front"; fx(c, { k: "cond", to: x.id, n: "Arrives!" }); }
  }
  const o = cm.objective; if (!o || o.status !== "active") return;
  if (o.kind === "survive" && cm.round > o.rounds && party(c).some(p => isUp(c, p))){
    o.status = "done"; clog(c, "sys", `**You held out!** ${o.text}: done.`);
    for (const e of enemies(c).filter(e => isUp(c, e))){ e.fled = true; }
    finishCombat(c, "victory");
  } else if (o.kind === "ritual" && cm.round > o.rounds && isUp(c, cm.cbt[o.targetId])){
    o.status = "failed"; clog(c, "enemy", `**The ritual is complete!** Dark power surges through your enemies.`);
    for (const e of enemies(c).filter(e => isUp(c, e))) addC(c, e, "blessed", {});
    const pool = THEMES[cm.theme]?.pools?.[Math.min(3, lootTier(partyLevel(c)))]; const pick1 = pool && pick(pool);
    if (pick1) for (const x of addEnemies(c, { name: pick1, count: 1 })) fx(c, { k: "cond", to: x.id, n: "Summoned!" });
  }
}
// called whenever the end of combat is checked (after anything dies)
function tacticsCheck(c){
  const cm = c.combat, o = cm?.objective; if (!o || o.status !== "active") return;
  if (o.kind === "protect"){ const t = cm.cbt[o.targetId]; if (!t || t.hp <= 0){ o.status = "failed"; clog(c, "enemy", `**${t?.name || "They"} falls!** The objective is lost.`); } }
  if (o.kind === "ritual"){ const t = cm.cbt[o.targetId]; if (!t || t.dead || t.hp <= 0){ o.status = "done"; clog(c, "sys", `**The ritual is broken!**`); } }
}
// morale: once half the foes are down (or their leader falls), the living ones may run or give up
function moraleCheck(c){
  const cm = c.combat; if (!cm || cm.moraleDone || cm.status !== "active") return;
  const foes = enemies(c).filter(e => !e.summoned); if (foes.length < 3) return;
  const down = foes.filter(e => e.dead || hpOf(c, e) <= 0).length, bossDown = foes.some(e => e.boss && (e.dead || e.hp <= 0));
  if (down * 2 < foes.length && !bossDown) return;
  cm.moraleDone = true;
  for (const e of foes.filter(e => isUp(c, e) && !e.boss && !["undead", "construct", "ooze", "fiend", "elemental"].includes(e.type) && !/\(ritualist\)/.test(e.name))){
    if (d(20) + (e.mods?.WIS || 0) >= (bossDown ? 15 : 12)) continue;
    e.fled = true;
    clog(c, "enemy", e.type === "humanoid" && Math.random() < 0.5 ? `${B(e.name)} throws down their weapon and surrenders!` : `${B(e.name)} breaks and flees!`);
    fx(c, { k: "cond", to: e.id, n: e.type === "humanoid" ? "Gives up" : "Flees" });
  }
}
function objectiveBonus(c, notes){
  const cm = c.combat, o = cm?.objective; if (!o) return;
  if ((o.kind === "protect" || o.kind === "survive") && o.status === "active") o.status = "done";
  if (o.status !== "done") return;
  const bonus = Math.round((cm.xp || 0) * 0.3) + 10 * partyLevel(c);
  cm.xp = (cm.xp || 0) + bonus; notes.push({ kind: "xp", text: `Objective complete (${o.text}): +${bonus} XP each` });
  giveLoot(c, rollLoot(partyLevel(c), "minor"), notes);
}
// random objectives & reinforcements for dungeon fights
function rollRoomTactics(rng, theme, pool, members, L){
  const out = {}; const r = rng();
  if (r < 0.12) out.objective = { kind: "survive", rounds: 4, text: "Hold the chamber until the sealed door grinds open (4 rounds)" };
  else if (r < 0.24 && ["cult", "undead", "swamp"].includes(theme)) out.objective = { kind: "ritual", rounds: 4 };
  else if (r < 0.34 && ["bandit", "goblin", "giant", "beast"].includes(theme)) out.objective = { kind: "protect", name: pick(["the chained prisoner", "a captured scout", "the merchant's daughter", "a wounded pilgrim"]), hp: 10 + 4 * L };
  if (rng() < 0.22){ const x = buildEncounter(pool, encounterBudget(members, "easy", L), 2); if (x.length) out.reinforce = { round: 3, enemies: x, text: "More enemies pour in from a side passage!" }; }
  return out;
}
</script>
