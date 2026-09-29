<script>
"use strict";
// ======================= PARTY SYSTEM =======================
const MAX_PARTY = 4;
const firstName = n => String(n||"").replace(/^(Ser|Sister|Brother|Old)\s+/,"").split(" ")[0];
function partyMembers(c){ return (c.partyIds||[c.activeCharId]).map(id => c.characters[id]).filter(ch => ch && (!ch.dead || ch.id === c.activeCharId)); }
function companionsOf(c){ return partyMembers(c).filter(ch => ch.id !== c.activeCharId); }
function knownSpells(ch){ return [...(ch.cantrips||[]), ...(ch.spells||[])].map(n => SPELL[n]).filter(Boolean); }
function slotsTotal(ch){ const mx = slotMax(ch); return Object.keys(mx).reduce((a,l) => a + slotsLeft(ch, +l), 0); }
const INVOCATION_PREFS = ["Agonizing Blast","Armor of Shadows","Fiendish Vigor","Devil's Sight","Repelling Blast","Mask of Many Faces","Eldritch Sight"];

// ---- building companions ----
function pickSpellsFor(cls, minL, maxL, n, known){
  const L = CLASS_LETTER[cls]; if (!L || n <= 0) return [];
  const prefs = (SPELL_PREFS[cls]||[]).map(x => SPELL[x]).filter(Boolean);
  const pool = [...prefs, ...SPELLS].filter(s => s.c.includes(L) && s.l >= minL && s.l <= maxL && !known.includes(s.n));
  const out = [];
  if (maxL >= 1 && minL >= 1){ const top = pool.find(s => s.l === maxL && s.m.k !== "utility"); if (top) out.push(top.n); }
  for (const s of pool){ if (out.length >= n) break; if (!out.includes(s.n)) out.push(s.n); }
  return out.slice(0, n);
}
function autoLevelChoices(ch, subIdx=0){
  const plan = levelPlan(ch); const C0 = CLASSES[ch.cls]; const a = ch.abilities;
  const known = [...ch.cantrips, ...ch.spells];
  let asi = null;
  if (plan.asi){
    const p = C0.prim, cast = C0.caster?.ab;
    if (a[p] <= 18) asi = {inc:{[p]:2}};
    else if (cast && cast !== p && a[cast] <= 18) asi = {inc:{[cast]:2}};
    else if (a.CON <= 18) asi = {inc:{CON:2}};
    else asi = {feat: Object.keys(FEATS).find(f => !(ch.feats||[]).includes(f)) || "Tough"};
  }
  return { hpRoll: Math.floor(C0.hd/2)+1, asi, subclass: plan.subclass ? C0.subs[subIdx % C0.subs.length].n : null,
    cantrips: pickSpellsFor(ch.cls, 0, 0, plan.cantrips, known), spells: pickSpellsFor(ch.cls, 1, plan.maxSpell, plan.spells, known),
    invocations: [...INVOCATION_PREFS.filter(k => INVOCATIONS[k]), ...Object.keys(INVOCATIONS)].filter((k,i,arr) => arr.indexOf(k) === i && !(ch.invocations||[]).includes(k)).slice(0, plan.invocations),
    fightingStyle: plan.fightingStyle ? (ch.cls === "Ranger" ? "Archery" : "Defense") : null,
    expertise: ch.skills.filter(s => !ch.expertise.includes(s)).slice(0, plan.expertise) };
}
function buildCompanion(tpl, level=1){
  const cls = CLASSES[tpl.cls] ? tpl.cls : "Fighter"; const race = RACES[tpl.race] ? tpl.race : "Human";
  const C0 = CLASSES[cls]; const bg = BACKGROUNDS[tpl.bg] ? tpl.bg : "Soldier"; const B0 = BACKGROUNDS[bg];
  const bgs = B0.skills.concat(RACES[race].skills||[]);
  const skills = C0.skills[1].filter(s => !bgs.includes(s)).slice(0, C0.skills[0]);
  const raceSkills = RACES[race].extraSkills ? Object.keys(SKILLS).filter(s => !bgs.includes(s) && !skills.includes(s)).slice(0, RACES[race].extraSkills) : [];
  const caster1 = C0.caster && C0.caster.from === 1;
  const cantrips = caster1 ? pickSpellsFor(cls, 0, 0, CANTRIPS_KNOWN[cls][1], []) : [];
  const spells = caster1 ? pickSpellsFor(cls, 1, 1, SPELLS_KNOWN[cls][1], cantrips) : [];
  const role = tpl.role || (["Fighter","Barbarian","Paladin"].includes(cls) ? "tank" : ["Cleric","Bard"].includes(cls) ? "support" : ["Wizard","Druid"].includes(cls) ? "controller" : "striker");
  const dr = { name: tpl.name, race, cls, background: bg, alignment: tpl.align || "Neutral Good", base: {...C0.array}, skills, raceSkills,
    expertise: cls === "Rogue" ? [...bgs, ...skills].slice(0,2) : [], kit: 0, fightingStyle: role === "tank" ? "Defense" : cls === "Ranger" ? "Archery" : "Dueling",
    cantrips, spells, dragonType: tpl.dragon || "Bronze", appearance: tpl.looks || "", backstory: tpl.hook || "" };
  const ch = buildCharacter(dr);
  ch.companion = { tpl: tpl.id || slug(tpl.name), personality: tpl.personality || "", voice: tpl.voice || "", likes: tpl.likes || [], dislikes: tpl.dislikes || [], hook: tpl.hook || "",
    role, tactic: role === "support" ? "support" : "balanced", ctrl: "ai", approval: 10, joined: null };
  let guard = 0; while (ch.level < clamp(level,1,MAX_LEVEL) && guard++ < 12){ ch.xp = Math.max(ch.xp, XP_TABLE[ch.level]); applyLevelUp(ch, autoLevelChoices(ch, tpl.sub || 0)); }
  ch.hp = maxHp(ch);
  return ch;
}
function companionFromDM(spec, level){
  const tpl = COMPANIONS.find(t => t.name.toLowerCase() === String(spec.name||"").toLowerCase());
  if (tpl) return buildCompanion(tpl, level);
  const cls = Object.keys(CLASSES).find(k => k.toLowerCase() === String(spec.class || spec.cls || "").toLowerCase()) || "Fighter";
  const race = Object.keys(RACES).find(k => k.toLowerCase() === String(spec.race||"").toLowerCase()) || "Human";
  const likes = (Array.isArray(spec.likes) ? spec.likes : []).map(x=>String(x).toLowerCase()).filter(x => APPROVAL_TAGS.includes(x));
  const dislikes = (Array.isArray(spec.dislikes) ? spec.dislikes : []).map(x=>String(x).toLowerCase()).filter(x => APPROVAL_TAGS.includes(x));
  return buildCompanion({ id: slug(spec.name), name: String(spec.name||"Stranger").slice(0,40), race, cls, bg: spec.background, align: spec.alignment,
    personality: String(spec.personality||"").slice(0,200), voice: String(spec.voice||"").slice(0,120), likes: likes.length ? likes : ["bravery","honesty"], dislikes: dislikes.length ? dislikes : ["cruelty","cowardice"],
    hook: String(spec.goal || spec.hook || "").slice(0,200), looks: String(spec.appearance||"").slice(0,200) }, level);
}
function addToParty(c, ch, how){
  if (partyMembers(c).length >= MAX_PARTY) return false;
  c.characters[ch.id] = ch; c.partyIds = [...(c.partyIds||[c.activeCharId]), ch.id];
  ch.companion.joined = c.time.day; ch.companion.how = how || "";
  const main = c.characters[c.activeCharId]; ch.xp = Math.max(ch.xp, XP_TABLE[Math.max(0, ch.level-1)]);
  c.chronicle.push({t: Date.now(), day: c.time.day, text: `${ch.name}, a ${ch.race} ${ch.cls}, joined the party${how ? ` (${how})` : ""}.`});
  return true;
}
function removeFromParty(c, id, why){
  const ch = c.characters[id]; if (!ch || id === c.activeCharId) return;
  c.partyIds = c.partyIds.filter(x => x !== id);
  c.formerCompanions = [...(c.formerCompanions||[]), {id, name: ch.name, why: why || "left", day: c.time.day}];
  c.chronicle.push({t: Date.now(), day: c.time.day, text: `${ch.name} left the party${why ? `: ${why}` : ""}.`});
}
function levelUpCompanions(c, notes){
  for (const ch of companionsOf(c)){
    if (heroAwaitsLevelUp(c, ch)) continue;   // a player makes this hero's level-up choices
    let lv = ch.level, g = 0;
    while (canLevel(ch) && g++ < 10) applyLevelUp(ch, autoLevelChoices(ch, COMPANIONS.find(t => t.id === ch.companion?.tpl)?.sub || 0));
    if (ch.level > lv){ ch.hp = maxHp(ch); notes?.push({kind:"xp", text:`${firstName(ch.name)} reached level ${ch.level}`}); }
  }
  for (const p of c.companions.filter(p => p.beast)){ const main = c.characters[c.activeCharId]; const f = beastCompanion(main); Object.assign(p, {maxHp: f.maxHp, ac: f.ac, attack: f.attack}); }
}
// ---- approval ----
function approvalLabel(v){ return v >= 60 ? "devoted" : v >= 25 ? "friendly" : v > -25 ? "neutral" : v > -60 ? "strained" : "hostile"; }
function applyApproval(c, tags, notes){
  if (!tags?.length) return;
  c.deeds = c.deeds || {}; for (const t of tags) c.deeds[t] = (c.deeds[t]||0) + 1;
  for (const ch of companionsOf(c)){
    if (seatInfo(ch.id) || ch.companion.player) continue;   // a human plays this hero: no AI approval
    const cp = ch.companion; let delta = 0;
    for (const t of tags){ if (cp.likes.includes(t)) delta += 6; if (cp.dislikes.includes(t)) delta -= 6; }
    if (!delta) continue;
    cp.approval = clamp(cp.approval + delta, -100, 100);
    notes?.push({kind:"npc", text:`${firstName(ch.name)} ${delta > 0 ? "approves" : "disapproves"}`});
  }
  checkDesertion(c, notes); checkCompanionQuests(c, notes);
}
function checkDesertion(c, notes){
  for (const ch of companionsOf(c)) if (ch.companion.approval <= -80 && !seatInfo(ch.id) && !ch.companion.player){ removeFromParty(c, ch.id, "lost all faith in the party's leader"); notes?.push({kind:"hurt", text:`${ch.name} has had enough and leaves the party`}); }
}
// ---- barks (short in-character lines during combat) ----
const BARKS = {
  generic:{ start:["Stay close!","Here they come!","Weapons out!"], kill:["One down!","That's one.","Next!"], boss:["It's done! It's finally done!","We did it!"], down:["{x}! Hold on!","{x} is down!","Someone help {x}!"], hurt:["I'm hurt...","Can't take much more!","That one stung."], crit:["Right where it hurts!","Did you see that?"], heal:["Hold still.","Back on your feet."], rage:["RAAAGH!"] },
  brakka:{ start:["Ha! A good day for a brawl!"], kill:["Mother is hungry today!","Hah! Next, little one!"], rage:["BLOOD AND THUNDER!"], hurt:["Just a scratch! Hit harder!"], down:["{x}! Get up, little one!"], boss:["Ha! Sing of this one!"] },
  aldric:{ start:["For honour, then. Again."], kill:["Yield next time."], crit:["Textbook."], down:["To me! Protect {x}!"], hurt:["Merely a flesh wound."] },
  mireille:{ start:["Light keep us."], heal:["Hold still, this will sting.","Not today, friend."], hurt:["I'm... still standing."], down:["{x}! Stay with me!"] },
  quill:{ start:["Fascinating! Also terrifying!"], kill:["Noted: flammable."], crit:["Precisely as calculated!"], hurt:["Ow! That is NOT in the book!"] },
  nix:{ start:["Oh good, violence. My favourite."], kill:["And that's why you don't turn your back."], crit:["Right in the purse strings!"], hurt:["Rude!"], down:["Oi! Nobody gets to kill {x} but me!"] },
  tamsin:{ start:["Quiet now. Aim true."], kill:["Rest now."], crit:["Clean shot."], down:["{x}, no!"] },
  lark:{ start:["Ah, a ballad in the making!"], kill:["That rhymes with 'victory'!"], crit:["Encore!"], hurt:["Not my good side!"], heal:["A song to mend you!"] },
  oren:{ start:["By my oath, you shall not pass!"], kill:["Justice is served."], down:["I will not let {x} fall!"], crit:["For the light!"] },
  moss:{ start:["Hmph. Storm's coming."], kill:["Back to the soil with you."], hurt:["Bark's tougher than it looks."], heal:["Hold still, sapling."] },
  vesper:{ start:["Try not to die. It's paperwork."], kill:["Mm. Delicious."], crit:["Oh, that felt good."], hurt:["You'll pay for that."] },
  ember:{ start:["I've got this! Probably!"], kill:["Sorry! No, actually, not sorry!"], crit:["Did I do that?!"], hurt:["Ow, ow, ow!"] },
  fen:{ start:["Breathe. Then strike."], kill:["The river flows on."], crit:["Stillness, then motion."], hurt:["Pain is a teacher."] }
};
function partyBark(c, ch, kind, chance=0.3, x=""){
  if (!ch || !ch.companion || !c.combat || Math.random() > chance || seatInfo(ch.id) || ch.companion.player) return;
  const set = BARKS[ch.companion.tpl]?.[kind] || BARKS.generic[kind]; if (!set) return;
  defer(c, "party", `_${firstName(ch.name)}: "${pick(set).replace("{x}", firstName(x) || "friend")}"_`);
}

// ---- gear upgrade suggestions ----
function attackScore(ch){ const ws = weaponAttacks(ch).filter(w => !w.stowed && !w.offhand); if (!ws.length) return 0; return Math.max(...ws.map(w => avgDice(w.dmg) * pHit(w.toHit, 14))) * attacksPerAction(ch); }
function gearUpgrades(c){
  const members = partyMembers(c).filter(m => !m.dead); const out = [];
  const pool = members.flatMap(m => m.inventory.filter(it => it.slot && !isEquipped(m, it.id) && !it.quest).map(it => ({it, owner: m})));
  for (const {it, owner} of pool){
    let best = null;
    for (const m of members){
      if (it.weapon && !isProfWeapon(m, it)) continue; if ((it.armor || it.type === "shield") && !isProfArmor(m, it)) continue;
      const sim = structuredClone(m); if (!invItem(sim, it.id)) sim.inventory.push(structuredClone(it));
      let err; try { err = equipItem(sim, it.id); } catch { err = "x"; } if (err) continue;
      if (armorPenalty(sim) && !armorPenalty(m)) continue;
      const dAC = armorClass(sim) - armorClass(m); const dAtk = attackScore(sim) - attackScore(m);
      if (dAC < 0 || dAtk < -0.3) continue;
      const gain = dAC * 1.6 + dAtk; if (gain < (dAC > 0 ? 0.5 : 0.9)) continue;
      const desc = dAC > 0 ? `AC ${armorClass(m)} → ${armorClass(sim)}` : `hits harder (+${dAtk.toFixed(1)} avg damage)`;
      if (!best || gain > best.gain) best = {m, gain, desc};
    }
    if (best) out.push({item: it, owner, to: best.m, desc: best.desc, gain: best.gain});
  }
  const seen = new Set();
  return out.sort((a,b) => b.gain - a.gain).filter(u => { const k = u.to.id + ":" + u.item.slot; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
}
function applyUpgrade(itemId, ownerId, toId){
  let err = null;
  store.camp(c => { const own = c.characters[ownerId], to = c.characters[toId]; const it = invItem(own, itemId); if (!it) return;
    let target = it; if (ownerId !== toId){ unequip(own, itemId); own.inventory = own.inventory.filter(i => i.id !== itemId); target = addItem(to, it); }
    err = equipItem(to, target.id); if (!err) pushLog(c, {kind:"sys", notes:[{kind:"loot", text:`${firstName(to.name)} equips ${it.name}`}]}); });
  if (err) coopNotify(err, "bad"); else Sfx.play("coin");
}
// ======================= COMPANION COMBAT AI =======================
const pHit = (toHit, ac) => clamp((21 - (ac - toHit)) / 20, 0.05, 0.95);
function chooseTarget(c, me, melee){
  const ch = cbChar(c, me); const tactic = ch.companion?.tactic || "balanced";
  const cands = reachableFoes(c, me, melee); if (!cands.length) return null;
  const focus = c.combat.focus && c.combat.cbt[c.combat.focus];
  if (focus && cands.includes(focus) && tactic !== "support") return focus;
  if (tactic === "aggressive") return cands.slice().sort((a,b) => a.hp - b.hp)[0];
  if (tactic === "defensive") return cands.slice().sort((a,b) => b.xp - a.xp)[0];
  return cands.slice().sort((a,b) => (a.hp/a.maxHp - (a.boss?0.2:0)) - (b.hp/b.maxHp - (b.boss?0.2:0)))[0];
}
function bestWeapon(c, me){
  const ch = cbChar(c, me); let best = null;
  for (const w of weaponAttacks(ch).filter(w => !w.offhand)){
    const t = chooseTarget(c, me, !!w.melee); if (!t) continue;
    let exp = pHit(w.toHit, t.ac) * avgDice(w.dmg) - (w.stowed ? 0.5 : 0);
    if (ch.cls === "Rogue" && (w.ranged || invItem(ch, w.itemId)?.weapon?.props.includes("finesse"))) exp += avgDice(sneakDice(ch)) * 0.6;
    if (w.melee && hasCond(ch,"raging")) exp += rageBonus(ch);
    exp *= attacksPerAction(ch);
    if (!best || exp > best.exp) best = {w, t, exp};
  }
  return best;
}
function bestCantrip(c, me, spells){
  const ch = cbChar(c, me); const ci = castInfo(ch); if (!ci) return null; let best = null;
  for (const sp of spells.filter(s => s.l === 0 && ["atk","save"].includes(s.m.k))){
    const t = chooseTarget(c, me, !!sp.m.melee); if (!t) continue;
    const beams = sp.m.beams ? (ch.level >= 11 ? 3 : ch.level >= 5 ? 2 : 1) : 1;
    const dmg = avgDice(spellDice(ch, sp, 0));
    const p = sp.m.k === "atk" ? pHit(ci.atk, t.ac) : clamp((ci.dc - 10 - (t.mods?.[sp.m.save]||0)) / 20 + 0.5, 0.1, 0.95);
    const n = Math.min(sp.m.tgt || 1, enemies(c).filter(e => isUp(c,e)).length);
    const exp = p * dmg * beams * n;
    if (!best || exp > best.exp) best = {sp, t, exp};
  }
  return best;
}
function highestSlotFor(ch, sp){ const mx = slotMax(ch); const ls = Object.keys(mx).map(Number).filter(l => l >= sp.l && slotsLeft(ch, l) > 0).sort((a,b)=>b-a); return ls[0] || 0; }
function foesFirst(c, t){ const up = enemies(c).filter(e => isUp(c,e)); return t ? [t.id, ...up.filter(e => e.id !== t.id).map(e => e.id)] : up.map(e => e.id); }
function aiTryHeal(c, me, tactic){
  const ch = cbChar(c, me), pt = c.combat.pt;
  const deadHero = heroes(c).find(h => h.id !== me.id && cbChar(c,h).dead && !h.fled);
  if (deadHero && ch.spells.includes("Revivify") && pt.action && lowestSlot(ch, 3)){ const fx = doCast(c, "Revivify", {allyId: deadHero.id}); if (!fx.error) return true; }
  const thr = tactic === "support" || ch.companion?.role === "support" ? 0.5 : 0.3;
  const need = party(c).filter(p => !isDeadCb(c,p) && !p.fled).map(p => ({p, r: hpOf(c,p) <= 0 ? -1 : hpOf(c,p)/maxHpOf(c,p)})).filter(x => x.r < thr).sort((a,b) => a.r - b.r);
  if (!need.length) return false;
  const tgt = need[0].p;
  const heals = knownSpells(ch).filter(s => s.m.k === "heal" && !canCastNow(c, s, {}));
  let sp = need.length >= 2 ? heals.find(s => s.m.party) : null;
  if (!sp) sp = heals.find(s => s.m.bonus && !s.m.party) || heals.find(s => !s.m.party);
  if (sp){ const fx = doCast(c, sp.n, {allyId: tgt.id, slot: lowestSlot(ch, sp.l)}); if (!fx.error) return true; }
  if (ch.cls === "Paladin" && resLeft(ch,"layOnHands") && pt.action){ const fx = doAbility(c, "layOnHands", tgt.id); if (!fx.error) return true; }
  if (tgt.id === me.id && ch.cls === "Fighter" && resLeft(ch,"secondWind") && pt.bonus){ const fx = doAbility(c, "secondWind"); if (!fx.error) return true; }
  const pot = ch.inventory.find(i => i.type === "potion" && i.heal);
  if (pot && pt.bonus && need[0].r <= 0.25){ const fx = doUseItem(c, pot.id, tgt.id); if (!fx.error) return true; }
  if (need[0].r === -1 && pt.action && tactic !== "aggressive" && ch.companion?.role === "support"){ const fx = doBasic(c, "stabilize", tgt.id); if (!fx.error) return true; }
  return false;
}
function aiOpeners(c, me, tactic){
  const ch = cbChar(c, me), pt = c.combat.pt; const foes = enemies(c).filter(e => isUp(c,e)); if (!foes.length) return;
  const ab = key => combatAbilities(c).find(a => a.key === key && !a.disabled);
  const tough = foes.some(e => e.boss || e.hp >= 30);
  if (ab("rage")) doAbility(c, "rage");
  if (ab("reckless") && tactic !== "defensive" && ch.hp > maxHp(ch)/2) doAbility(c, "reckless");
  if (!me.conc && pt.bonus){
    const cand = knownSpells(ch).filter(s => s.m.bonus && s.m.conc && s.m.k === "buff" && !canCastNow(c, s, {}));
    const mark = cand.find(s => s.m.mark);
    if (mark && tough){ const t = chooseTarget(c, me, false); if (t) doCast(c, mark.n, {targets:[t.id]}); }
    else if (tough){ const df = cand.find(s => s.m.buff === "divine-favor"); if (df) doCast(c, df.n, {}); }
  }
  if (!me.sw && pt.bonus){ const sw = knownSpells(ch).find(s => s.m.k === "weapon" && !canCastNow(c, s, {})); if (sw){ const t = chooseTarget(c, me, false); if (t) doCast(c, sw.n, {targets:[t.id]}); } }
  if (ab("vow") && tough){ const t = foes.slice().sort((a,b) => b.xp - a.xp)[0]; doAbility(c, "vow", t.id); }
  if (ab("wild") && subMods(ch).moon && !me.conc && tactic !== "support") doAbility(c, "wild");
  if (ab("inspire") && pt.bonus){ const ally = heroes(c).filter(h => h.id !== me.id && isUp(c,h) && !hasC(c,h,"inspired")).sort((a,b) => (cbChar(c,b).companion?.role === "striker" || b.main ? 1 : 0) - (cbChar(c,a).companion?.role === "striker" || a.main ? 1 : 0))[0]; if (ally) doAbility(c, "inspire", ally.id); }
  if (ab("smite") && slotsTotal(ch) >= 2 && tough) doAbility(c, "smite");
  if (ab("maneuver") && tough) doAbility(c, "maneuver");
  if (ab("stun") && resLeft(ch,"ki") >= 2 && tough) doAbility(c, "stun");
}
function aiWeaponAttack(c, me, opts={}){
  const b = bestWeapon(c, me); if (!b) return false;
  const fx = doAttack(c, b.w.id, b.t.id, opts); return !fx.error;
}
function aiMainAction(c, me, tactic){
  const ch = cbChar(c, me), pt = c.combat.pt; const foes = enemies(c).filter(e => isUp(c,e)); if (!foes.length || !pt.action) return;
  const ok = fx => fx && !fx.error;
  const spells = knownSpells(ch).filter(s => !s.m.bonus && !canCastNow(c, s, {}) && !["utility","react","berry","restore","heal","smite"].includes(s.m.k));
  const tough = foes.some(e => e.boss || e.hp >= 40);
  const reserve = ch.companion?.role === "support" || tactic === "support" ? 1 : 0;
  const slots = slotsTotal(ch);
  const turnAb = combatAbilities(c).find(a => a.key === "turn" && !a.disabled);
  if (turnAb && foes.filter(e => e.type === "undead").length >= 2 && ok(doAbility(c, "turn"))) return;
  if (!me.conc){
    const bless = spells.find(s => s.m.k === "buff" && s.m.party && s.m.conc);
    if (bless && c.combat.round <= 2 && foes.length >= 2 && tactic !== "aggressive" && ok(doCast(c, bless.n, {}))) return;
  }
  const sleep = spells.find(s => s.m.pool);
  if (sleep && foes.filter(e => e.hp <= 14 && e.type !== "undead").length >= 2 && ok(doCast(c, sleep.n, {}))) return;
  if (!me.conc && slots > reserve){
    const ctrl = spells.filter(s => s.m.conc && ["cond","zone","summon"].includes(s.m.k) && s.l > 0).sort((a,b) => b.l - a.l);
    for (const s of ctrl){
      if (s.m.k === "cond" && (s.m.tgt||1) >= 3 && foes.length >= 3 && ok(doCast(c, s.n, {targets: foesFirst(c, null).slice(0, s.m.tgt)}))) return;
      if (s.m.k === "cond" && (s.m.tgt||1) === 1 && tough){ const t = foes.filter(f => (!s.m.humanoid || f.type === "humanoid") && !f.conds.some(x => x.n === s.m.cond)).sort((a,b) => b.xp - a.xp)[0]; if (t && ok(doCast(c, s.n, {targets:[t.id]}))) return; }
      if (s.m.k === "zone" && ((s.m.all && foes.length >= 2) || (!s.m.all && (tough || foes.length >= 3)))){ const t = chooseTarget(c, me, false); if (ok(doCast(c, s.n, {targets: foesFirst(c, t).slice(0, s.m.tgt||1)}))) return; }
      if (s.m.k === "summon" && foes.length >= 2 && ok(doCast(c, s.n, {}))) return;
    }
  }
  if (slots > reserve){
    const aoe = spells.filter(s => s.m.k === "save" && (s.m.tgt||1) >= 2 && s.l > 0).sort((a,b) => b.l - a.l);
    for (const s of aoe) if (foes.length >= (s.l >= 3 ? 3 : 2) && ok(doCast(c, s.n, {targets: (s.m.tgt||1) >= 3 ? bestLineTargets(c, s.m.tgt + 1) : foesFirst(c, null).slice(0, s.m.tgt), slot: highestSlotFor(ch, s)}))) return;
    if (tough){ const single = spells.filter(s => ["atk","save","auto"].includes(s.m.k) && s.l > 0).sort((a,b) => b.l - a.l); for (const s of single){ const t = chooseTarget(c, me, !!s.m.melee); if (t && ok(doCast(c, s.n, {targets: foesFirst(c, t)}))) return; } }
  }
  const cantrip = bestCantrip(c, me, spells); const weap = bestWeapon(c, me);
  if (cantrip && (!weap || cantrip.exp > weap.exp) && ok(doCast(c, cantrip.sp.n, {targets: foesFirst(c, cantrip.t)}))) return;
  if (weap && aiWeaponAttack(c, me)) return;
  if (c.combat.pt.move && me.pos === "back" && tactic !== "defensive"){ doMove(c); if (aiWeaponAttack(c, me)) return; }
  doBasic(c, "dodge");
}
function aiBonus(c, me, tactic){
  const ch = cbChar(c, me), pt = c.combat.pt; if (!pt.bonus || !enemies(c).some(e => isUp(c,e))) return;
  const A = key => combatAbilities(c).find(a => a.key === key && !a.disabled);
  const ok = fx => fx && !fx.error;
  if (A("secondWind") && ch.hp < maxHp(ch) * 0.5 && ok(doAbility(c, "secondWind"))) return;
  const hw = knownSpells(ch).find(s => s.m.k === "heal" && s.m.bonus && !canCastNow(c, s, {}));
  if (hw){ const hurt = party(c).filter(p => !isDeadCb(c,p) && !p.fled && hpOf(c,p)/maxHpOf(c,p) < 0.4).sort((a,b) => hpOf(c,a) - hpOf(c,b))[0]; if (hurt && ok(doCast(c, hw.n, {allyId: hurt.id}))) return; }
  for (const k of ["sw","flurry","martial","frenzy","warpriest","offhand"]){
    const ab = A(k); if (!ab) continue; if (k === "flurry" && resLeft(ch,"ki") < 1) continue;
    const t = chooseTarget(c, me, k !== "sw"); if (t && ok(doAbility(c, k, t.id))) return;
  }
  if (ch.cls === "Rogue" && A("cHide") && me.pos === "back" && ok(doAbility(c, "cHide"))) return;
  if (A("cDisengage") && ch.hp < maxHp(ch) * 0.3 && me.pos === "front"){ doAbility(c, "cDisengage"); if (pt.move) doMove(c); return; }
  if (A("patient") && tactic === "defensive" && ch.hp < maxHp(ch) * 0.4) doAbility(c, "patient");
}
function aiHeroTurn(c, me){
  const ch = cbChar(c, me); const cm = c.combat; const pt = cm.pt;
  if (!ch || ch.dead) return;
  if (ch.hp <= 0){ if (!hasCond(ch,"stable")) doDeathSave(c, me); return; }
  if (!canAct(c, me)){ clog(c,"sys",`${ch.name} can't act this turn.`); return; }
  const tactic = ch.companion?.tactic || "balanced";
  const live = () => c.combat && c.combat.status === "active" && isUp(c, me) && enemies(c).some(e => isUp(c,e));
  // positioning: go to the preferred line (but never leave the front line empty)
  const pref = heroPos(ch);
  if (me.pos !== pref && pt.move){ const others = party(c).filter(p => p.id !== me.id && p.pos === "front" && isUp(c,p)); if (pref === "front" || others.length) doMove(c); }
  if (!live()) return;
  aiTryHeal(c, me, tactic); if (!live()) return;
  aiOpeners(c, me, tactic); if (!live()) return;
  if (pt.action) aiMainAction(c, me, tactic); if (!live()) return;
  if (ch.cls === "Fighter" && combatAbilities(c).find(a => a.key === "actionSurge" && !a.disabled) && enemies(c).some(e => isUp(c,e) && (e.boss || e.hp > 25))){ doAbility(c, "actionSurge"); aiMainAction(c, me, tactic); }
  let g = 0; while (pt.attacksLeft > 0 && live() && g++ < 6){ if (!aiWeaponAttack(c, me)) break; }
  if (live()) aiBonus(c, me, tactic);
  if (live() && tactic === "defensive" && pt.action && ch.hp < maxHp(ch) * 0.25) doBasic(c, "dodge");
}
</script>
