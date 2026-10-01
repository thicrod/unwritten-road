<script>
"use strict";
// ======================= COMBAT ENGINE (party edition) =======================
// Every party character is a combatant of kind "pc" (backed by a full character sheet).
// Simple followers & summons are kind "comp". Enemies are kind "enemy".
// Positioning: each combatant stands in the "front" or "back" line. Melee attacks can only
// reach the back line once that side's front line has fallen (reach/skirmishers ignore this).
const INCAP = ["paralyzed","stunned","asleep","laughing","entranced","polymorphed","banished","turned","unconscious"];
const HELPLESS = ["restrained","paralyzed","stunned","asleep","laughing","entranced","blinded","outlined","unconscious","polymorphed"];
const PLANS = {};
const ENEMY_COND_TEXT = {asleep:"Asleep until damaged",outlined:"Glowing: attacks against it have advantage",laughing:"Helpless with laughter",entranced:"Entranced until damaged",charmed:"Charmed: won't attack",turned:"Turned: flees from holy power",banished:"Banished (gone for now)",polymorphed:"Turned into a harmless creature",mocked:"Disadvantage on next attack","guided-target":"Next attack against it has advantage",helped:"Advantage on next attack",vow:"Sworn enemy: advantage against it",hex:"Hexed","hunters-mark":"Marked",warded:"Magical ward: +5 AC",enraged:"Enraged: +2 to hit, extra attack",blessed:"Rallied: +1d4 to attacks"};

function cbList(c){ return c.combat ? c.combat.order.map(id=>c.combat.cbt[id]).filter(Boolean) : []; }
function cbChar(c, cb){ return cb && cb.kind === "pc" ? c.characters[cb.ref] : null; }
function hpOf(c, cb){ return cb.kind === "pc" ? c.characters[cb.ref].hp : cb.hp; }
function maxHpOf(c, cb){ return cb.kind === "pc" ? maxHp(c.characters[cb.ref]) : cb.maxHp; }
function condsOf(c, cb){ return cb.kind === "pc" ? (c.characters[cb.ref].conditions||[]).map(x=>x.name) : (cb.conds||[]).map(x=>x.n); }
function hasC(c, cb, n){ return condsOf(c, cb).includes(n); }
const FX_COND = { asleep:"Asleep", paralyzed:"Paralyzed", stunned:"Stunned", frightened:"Frightened", prone:"Knocked prone", restrained:"Restrained", charmed:"Charmed", poisoned:"Poisoned", blinded:"Blinded", blessed:"Blessed", hex:"Hexed", "hunters-mark":"Marked", raging:"RAGE", enraged:"ENRAGED", dodging:"Dodging", "faerie-fire":"Outlined", turned:"Turned", banished:"Banished", laughing:"Laughing" };
function addC(c, cb, n, extra={}){ if (FX_COND[n] && c.combat) fx(c, {k:"cond", to: cb.id, n: FX_COND[n], good: condKind(n) === "good"}); if (cb.kind === "pc"){ addCond(c.characters[cb.ref], n, extra); return; } cb.conds = (cb.conds||[]).filter(x=>x.n!==n); cb.conds.push({n, ...extra}); }
function remC(c, cb, n){ if (cb.kind === "pc"){ remCond(c.characters[cb.ref], n); return; } cb.conds = (cb.conds||[]).filter(x=>x.n!==n); }
function isDeadCb(c, cb){ return cb.kind === "pc" ? !!c.characters[cb.ref].dead : !!cb.dead; }
function isUp(c, cb){ return !!cb && !isDeadCb(c, cb) && !cb.fled && hpOf(c, cb) > 0 && !hasC(c, cb, "banished"); }
function canAct(c, cb){ return isUp(c, cb) && !condsOf(c, cb).some(n => INCAP.includes(n)); }
function acOf(c, cb){ if (cb.kind === "pc") return armorClass(c.characters[cb.ref]) + (cb.shieldUp ? 5 : 0); return cb.ac + (hasC(c, cb, "warded") ? 5 : 0); }
function enemies(c){ return cbList(c).filter(x=>x.side==="enemy"); }
function party(c){ return cbList(c).filter(x=>x.side==="party"); }
function heroes(c){ return cbList(c).filter(x=>x.kind==="pc"); }
function mainCb(c){ return cbList(c).find(x=>x.kind==="pc" && x.main); }
const pcCb = mainCb;
function curCb(c){ const cm = c.combat; return cm && cm.cbt[cm.order[cm.turn]]; }
function actorCb(c){ const cb = curCb(c); return cb && cb.kind === "pc" ? cb : null; }
function actorCh(c){ return cbChar(c, actorCb(c)); }
// A hero waits for input when a human controls it: offline, the leader (and companions set to "I control");
// online, whoever holds that hero's seat (a hero whose player dropped is played by the AI).
function isPlayerCtrl(c, cb){ if (!cb || cb.kind !== "pc") return false; const N = window.Net; if (N?.isOnline()) return !!N.controllerOf(c, cb); if (cb.main) return true; return (c.characters[cb.ref].companion?.ctrl || "ai") === "manual"; }
function isPlayerTurn(c){ return !!c?.combat && c.combat.status === "active" && isPlayerCtrl(c, curCb(c)); }
// is it this screen's turn? (online: only the player controlling the current hero)
function isMyTurn(c){ if (!isPlayerTurn(c)) return false; const N = window.Net; return !N?.isOnline() || N.controllerOf(c, curCb(c)) === N.me.id; }
function clog(c, side, text){ const cm = c.combat; if (text) cm.log.push({id: uid("g"), side, text, r: cm.round}); if (cm.deferred?.length){ for (const x of cm.deferred) cm.log.push({id: uid("g"), side: x.side, text: x.text, r: cm.round}); cm.deferred = []; } if (cm.log.length > 160) cm.log = cm.log.slice(-160); }
function defer(c, side, text){ const cm = c.combat; (cm.deferred = cm.deferred || []).push({side, text}); }
const B = s => `**${s}**`;
function dmgMult(cb, t, amt){ if (!t) return amt; if ((cb.immune||[]).includes(t)) return 0; if ((cb.vuln||[]).includes(t)) return amt*2; if ((cb.resist||[]).includes(t)) return Math.floor(amt/2); return amt; }
function sideOf(c, cb){ return cb.side === "enemy" ? enemies(c) : party(c); }
// can `att` hit `tgt` in melee given the battle lines?
function canReach(c, att, tgt, melee){
  if (!melee) return true;
  if (tgt.pos !== "back") return true;
  if (att.traits?.reach || att.beh === "skirmisher" || att.beh === "swarm") return true;
  return !sideOf(c, tgt).some(x => x.id !== tgt.id && x.pos === "front" && isUp(c, x));
}
function reachableFoes(c, att, melee){ return (att.side === "enemy" ? party(c) : enemies(c)).filter(t => isUp(c, t) && canReach(c, att, t, melee)); }

// ---- building foes ----
function buildEnemy(spec, n, diff, lvl){
  const key = Object.keys(BESTIARY).find(k => k.toLowerCase() === String(spec.name||"").toLowerCase());
  const base = BESTIARY[key];
  const hpMul = diff === "story" ? 0.8 : diff === "deadly" ? 1.2 : 1; const hitAdd = diff === "deadly" ? 1 : 0;
  let hp = spec.hp != null ? (typeof spec.hp === "string" && /d/.test(spec.hp) ? avgDice(spec.hp) : num(spec.hp, 10)) : base?.hp ?? 10;
  hp = clamp(Math.round(hp * hpMul * (spec.hpMul || 1)), 1, 900);
  const atks = Array.isArray(spec.attacks) && spec.attacks.length ? spec.attacks.map(a => ({ name: String(a.name||"Strike"), toHit: clamp(num(a.to_hit ?? a.toHit, 3),-1,14) + hitAdd, dmg: String(a.damage||a.dmg||"1d6+1").replace(/\s/g,""), t: String(a.type||a.damage_type||"bludgeoning").toLowerCase(), ranged: !!a.ranged,
      rider: a.condition ? {save: a.save || "STR", dc: num(a.dc,12), cond: String(a.condition).toLowerCase(), rounds: num(a.rounds,1)} : (a.extra_damage ? {dmg: a.extra_damage, t: a.extra_damage_type||"poison"} : null) }))
    : (base?.atk || [["Strike",3,"1d6+1","bludgeoning"]]).map(a => ({ name:a[0], toHit:a[1]+hitAdd, dmg:a[2], t:a[3], ranged: !!a[4], rider: a[5] || null }));
  const abil = (Array.isArray(spec.abilities) && spec.abilities.length ? spec.abilities.map(a => ({ n: String(a.name||"Ability"), k: /atk|attack/.test(a.kind) ? "atk" : /heal/.test(a.kind) ? "heal" : /summon/.test(a.kind) ? "summon" : "save", save: String(a.save||"DEX").toUpperCase().slice(0,3), dc: clamp(num(a.dc,12),8,22), dmg: a.damage||a.dmg||null, t: String(a.type||"force").toLowerCase(), half: a.half !== false, cond: a.condition ? String(a.condition).toLowerCase() : null, rounds: num(a.rounds, 2), recharge: a.recharge ? clamp(num(a.recharge,5),2,6) : null, uses: a.uses ? num(a.uses,1) : (a.recharge ? null : 1), aoe: !!(a.aoe || a.area), toHit: num(a.to_hit ?? a.toHit, 4), d: String(a.description||"").slice(0,140), summon: a.summon || null }))
    : (base?.abil || []).map(a => ({...a, dc: a.dc || 12, half: a.half !== false}))).map(a => ({...a, charged: true, used: 0}));
  const name = spec.displayName || spec.name || "Foe";
  const bt = spec.boss ? (BOSS_TRAITS[key] || {legendary:1, phase:{text:"roars in fury!", enrage:true}}) : null;
  const beh = base?.beh || "brute";
  const rangedOnly = atks.every(a => a.ranged);
  const e = { id: uid("e"), side:"enemy", kind:"enemy", name: n ? `${name} ${n}` : name, base: key || name, hp, maxHp: hp, ac: clamp(num(spec.ac, base?.ac ?? 12),5,25),
    mods: {...(base?.mods||{}), ...(spec.mods||{})}, atk: atks, multi: Array.isArray(spec.multiattack) ? spec.multiattack.map(String) : (base?.multi || null), abil,
    type: String(spec.type || base?.type || "humanoid").toLowerCase(), resist: spec.resist || base?.resist || [], immune: spec.immune || base?.immune || [], vuln: spec.vulnerable || base?.vuln || [],
    traits: {...(base?.traits || {})}, beh, tactics: String(spec.tactics || "").slice(0,200), xp: clamp(num(spec.xp, base?.xp ?? 50),0,30000), pp: base?.pp ?? 10, conds: [], acted:false,
    pos: rangedOnly || beh === "caster" || beh === "ranged" ? "back" : "front", boss: !!spec.boss, legendary: bt?.legendary || 0, legUsed: 0, phase: bt?.phase || null, phase2: false };
  if (spec.boss && lvl){ e.hp = e.maxHp = Math.round(e.maxHp * (1 + 0.1 * Math.max(0, (spec.partySize||1) - 2))); }
  return e;
}
function addEnemies(c, spec, afterCb){
  const cm = c.combat; const diff = c.premise?.difficulty || "standard"; const n = clamp(Math.round(num(spec.count,1)),1,4); const added = [];
  const existing = enemies(c).filter(e => e.base === spec.name).length;
  for (let i=0;i<n;i++){ const e = buildEnemy({name: spec.name}, existing + i + 1, diff); e.init = afterCb?.init ?? 10; e.summoned = true; cm.cbt[e.id] = e; added.push(e); }
  let at = afterCb ? cm.order.indexOf(afterCb.id) + 1 : cm.order.length; if (at <= 0) at = cm.order.length;
  cm.order.splice(at, 0, ...added.map(e=>e.id)); if (at <= cm.turn) cm.turn += added.length;
  return added;
}
function heroPos(ch){
  const pref = ch.companion?.pos; if (pref) return pref;
  if (ch.formation) return ch.formation;
  const main = ch.equipped?.mainHand && invItem(ch, ch.equipped.mainHand);
  const ranged = main?.weapon?.props.includes("ranged");
  if (["Wizard","Sorcerer","Warlock"].includes(ch.cls) || ranged) return "back";
  if (["Bard","Druid","Cleric"].includes(ch.cls) && armorClass(ch) < 16) return "back";
  return "front";
}
function startCombat(spec, o={}){
  store.camp((c) => {
    const main = c.characters[c.activeCharId];
    const diff = c.premise?.difficulty || "standard";
    const list = Array.isArray(spec.enemies) && spec.enemies.length ? spec.enemies : [{name:"Bandit", count:2}];
    const foes = []; const members = partyMembers(c);
    for (const e of list.slice(0,8)){ const n = clamp(Math.round(num(e.count,1)),1,8); for (let i=0;i<n && foes.length<12;i++) foes.push(buildEnemy({...e, partySize: members.length}, n>1 ? i+1 : 0, diff, main.level)); }
    const cbt = {};
    for (const ch of members){ const id = "h-" + ch.id; cbt[id] = { id, side:"party", kind:"pc", ref: ch.id, main: ch.id === c.activeCharId, name: ch.name, conds:[], pos: heroPos(ch), rx:{}, conc:null, sw:null }; }
    for (const p of c.companions) if (p.hp > 0) cbt[p.id] = { id:p.id, side:"party", kind:"comp", ref:p.id, name:p.name, hp:p.hp, maxHp:p.maxHp, ac:p.ac, atk:[{name:p.attack.name, toHit:p.attack.toHit, dmg:p.attack.dmg, t:p.attack.t}], conds:[], mods:{DEX:1}, pos:"front" };
    for (const f of foes) cbt[f.id] = f;
    const alert = members.some(ch => (ch.feats||[]).includes("Alert"));
    const surprise = spec.surprise === "enemies" ? "enemies" : spec.surprise === "player" && !alert ? "player" : "none";
    for (const cb of Object.values(cbt)){
      if (cb.kind === "pc"){ const ch = c.characters[cb.ref]; const r = rollD20({adv: ch.cls==="Barbarian" && ch.level>=7, lucky: RACES[ch.race].lucky}); cb.init = r.kept + initMod(ch); }
      else cb.init = d(20) + (cb.mods?.DEX||0);
      cb.surprised = (surprise==="enemies" && cb.side==="enemy") || (surprise==="player" && cb.side==="party");
    }
    const order = Object.values(cbt).sort((a,b)=> b.init - a.init || (a.side==="party"?-1:1)).map(x=>x.id);
    c.combat = { id: uid("f"), round:1, turn:-1, order, cbt, log:[], status:"active", pt:{}, zones:[], terrain: String(spec.terrain||"").slice(0,120), xp:0, kills:[], focus:null,
      origin: o.origin || spec.origin || null, sandbox: !!o.sandbox, snapshot: o.sandbox ? structuredClone(c.characters) : null, bossName: foes.find(f=>f.boss)?.name || null };    c.combat.theme = spec.theme || null; setupTactics(c, spec);
    c.pendingRoll = null;
    clog(c, "sys", `Battle begins${c.combat.terrain?` (${c.combat.terrain})`:""}! Initiative: ${order.map(id=>`${cbt[id].name} ${cbt[id].init}`).join(", ")}.`);
    if (surprise !== "none") clog(c, "sys", surprise === "enemies" ? "Your foes are caught by surprise!" : "The party is caught by surprise!");
    const boss = foes.find(f => f.boss); if (boss) clog(c, "enemy", `${B(boss.name)} is a formidable foe${boss.legendary ? ` (legendary actions: ${boss.legendary} per round)` : ""}.`);
    for (const ch of members) partyBark(c, ch, "start", 0.35);
    pushLog(c, {kind:"sys", notes:[{kind:"hurt", text:`Combat: ${foes.map(f=>f.name).join(", ")}`}]});
    advanceTurn(c);
  });
  store.set({tab:"combat", combatUI:{}});
  combatLoop();
}

// ---- turn flow ----
function endTurnEffects(c, cb){
  const cm = c.combat; if (!cb) return;
  if (cb.kind === "pc"){
    const ch = cbChar(c, cb);
    ch.conditions = (ch.conditions||[]).map(x => x.rounds ? {...x, rounds: x.rounds - 1} : x).filter(x => !(x.rounds !== undefined && x.rounds !== null && x.rounds <= 0));
    if (cb.conc){ cb.conc.rounds = (cb.conc.rounds ?? 10) - 1; if (cb.conc.rounds <= 0) dropConc(c, cb, "the spell's duration ends"); }
    if (cb.sw){ cb.sw.rounds--; if (cb.sw.rounds <= 0){ cb.sw = null; clog(c,"sys",`${ch.name}'s spiritual weapon fades.`); } }
    for (const s of cbList(c).filter(x=>x.summoned && x.owner === cb.id)){ s.rounds--; if (s.rounds <= 0 && !s.fled){ s.fled = true; clog(c,"sys",`${s.name} fades away.`); } }
    // legendary actions happen at the end of a hero's turn
    for (const e of enemies(c).filter(e => e.legendary && e.legUsed < e.legendary && canAct(c, e))){
      const tg = reachableFoes(c, e, true); const tgt = tg.length ? pick(tg) : null; if (!tgt) continue;
      e.legUsed++; const a = e.atk.find(x=>!x.ranged) || e.atk[0];
      const r = resolveAttack(c, e, tgt, {...a, melee: !a.ranged}); clog(c, "enemy", `Legendary action! ${attackText(e, tgt, a, r)}`);
      if (checkEndQuiet(c)) return;
    }
  } else {
    const keep = [];
    for (const x of cb.conds||[]){
      let gone = false;
      if (x.save && x.dc){ const r = d(20) + (cb.mods?.[x.save]||0); if (r >= x.dc){ gone = true; clog(c,"sys",`${cb.name} shakes off being ${x.n} (${r} vs DC ${x.dc}).`); } }
      if (!gone && x.rounds != null){ x.rounds -= 1; if (x.rounds <= 0){ gone = true; if (!["mocked","helped","guided-target","warded","blessed","dodging"].includes(x.n)) clog(c,"sys",`${cb.name} is no longer ${x.n}.`); } }
      if (!gone) keep.push(x);
    }
    cb.conds = keep;
  }
}
function startTurnEffects(c, cb){
  const cm = c.combat;
  if (cb.kind === "pc"){
    const ch = cbChar(c, cb);
    cm.pt = { actor: cb.id, action:1, bonus:1, move:1, attacksLeft:0, attackAction:false, sneak:false, colossus:false, dstrike:false, dashed:false, disengaged:false, surged:false };
    cb.rx = {}; cb.shieldUp = false; cb.acted = true;
    remCond(ch,"dodging"); remCond(ch,"reckless");
    if (hasCond(ch,"heroism")){ const m = mods(ch)[castInfo(ch)?.ab||"CHA"]; ch.tempHp = Math.max(ch.tempHp||0, Math.max(1,m)); }
  } else if (cb.side === "enemy"){
    cb.acted = true; cb.legUsed = 0;
    for (const z of cm.zones){
      if (!isUp(c, cb)) break;
      if (!(z.all || z.targets.includes(cb.id))) continue;
      const amt = rollDice(z.dmg).total; let dealt = amt;
      if (z.save){ const r = d(20) + (cb.mods?.[z.save]||0); if (r >= z.dc) dealt = z.half ? Math.floor(amt/2) : 0; }
      if (dealt) { const real = hurt(c, cb, dealt, z.t, {src: z.owner}); clog(c, "party", `${z.spell} sears ${B(cb.name)} for ${real} ${z.t}.`); }
    }
    if (cb.traits?.regen && isUp(c, cb) && !cb.noRegen && cb.hp < cb.maxHp){ cb.hp = Math.min(cb.maxHp, cb.hp + cb.traits.regen); clog(c,"enemy",`${B(cb.name)}'s flesh knits back together (+${cb.traits.regen}).`); }
    cb.noRegen = false;
    for (const a of cb.abil||[]) if (a.recharge && !a.charged && d(6) >= a.recharge) a.charged = true;
  }
}
function advanceTurn(c){
  const cm = c.combat; if (!cm || cm.status !== "active") return;
  if (cm.turn >= 0){ endTurnEffects(c, curCb(c)); if (!c.combat || cm.status !== "active") return; }
  for (let guard = 0; guard < 60; guard++){
    cm.turn++;
    if (cm.turn >= cm.order.length){ cm.turn = 0; cm.round++; clog(c, "sys", `Round ${cm.round}.`); tacticsRound(c); if (!c.combat || cm.status !== "active") return; }
    const cb = curCb(c); if (!cb) continue;
    if (isDeadCb(c, cb) || cb.fled) continue;
    if (cb.kind !== "pc" && hpOf(c, cb) <= 0) continue;
    if (cb.kind === "pc" && hpOf(c, cb) <= 0 && hasCond(cbChar(c, cb), "stable")) continue;
    if (cm.round === 1 && cb.surprised){ clog(c, "sys", `${cb.name} is surprised and loses the turn.`); cb.surprised = false; continue; }
    startTurnEffects(c, cb);
    if (checkEnd(c)) return;
    if (cb.kind !== "pc" && !isUp(c, cb)) continue;
    return;
  }
}
function checkEndQuiet(c){ return checkEnd(c); }
function checkEnd(c){
  const cm = c.combat; if (!cm || cm.status !== "active") return true;
  const main = c.characters[c.activeCharId];
  if (main.dead){ finishCombat(c, "dead"); return true; }
  tacticsCheck(c); moraleCheck(c);
  if (!enemies(c).some(e => isUp(c, e))){ finishCombat(c, "victory"); return true; }
  if (!party(c).some(p => isUp(c, p))){ finishCombat(c, "defeat"); return true; }
  return false;
}
function finishCombat(c, status){
  const cm = c.combat; cm.status = status;
  const dead = enemies(c).filter(e=>e.dead), fled = enemies(c).filter(e=>e.fled && !e.dead);
  let xp = dead.reduce((a,e)=>a+e.xp,0) + Math.floor(fled.reduce((a,e)=>a+e.xp,0)/2);
  if (status === "surrender") xp = enemies(c).reduce((a,e)=>a+e.xp,0);
  const nParty = Math.max(1, partyMembers(c).length);
  cm.xp = Math.round((status === "victory" || status === "surrender" ? xp : dead.reduce((a,e)=>a+e.xp,0)) / nParty * XP_PACE);
  for (const h of heroes(c)) dropConc(c, h, null, true);
  cm.zones = [];
  for (const h of heroes(c)){
    const ch = cbChar(c, h); h.sw = null;
    ch.conditions = (ch.conditions||[]).filter(x => x.long || (!x.rounds && !["dodging","reckless","hidden","raging","misty","inspired","unconscious","stable","helped","blessed"].includes(x.name)));
    if (hasCond(ch,"wildshape")) { remCond(ch,"wildshape"); ch.tempHp = 0; ch.wild = null; }
    if (!ch.dead && ch.hp <= 0 && (status === "victory" || status === "surrender" || status === "fled")) ch.hp = 1;
    ch.deathSaves = {s:0, f:0};
  }
  clog(c, "sys", ({victory:"Victory!", surrender:"Your foes surrender!", fled:"The party escaped.", defeat:"The party falls...", dead:`${c.characters[c.activeCharId].name} has fallen.`})[status] + (cm.xp ? ` ${cm.xp} XP each.` : ""));
  if (cm.sandbox) return;
  const members = partyMembers(c);
  const objNotes = []; if (status === "victory" || status === "surrender") objectiveBonus(c, objNotes); if (objNotes.length) pushLog(c, {kind:"sys", notes: objNotes});
  if (cm.xp){ const notes = []; for (const ch of members) gainXP(c, ch, cm.xp, notes, "combat", ch.id !== c.activeCharId); pushLog(c, {kind:"sys", notes}); }
  const main = c.characters[c.activeCharId]; main.stats.kills = (main.stats.kills||0) + dead.length;
  for (const p of c.companions){ const cb = cm.cbt[p.id]; if (cb) p.hp = Math.max(1, cb.hp); }
  // fallen companions leave the party (they can be raised at a temple)
  for (const ch of members.filter(ch => ch.dead && ch.id !== c.activeCharId)){
    c.partyIds = c.partyIds.filter(id => id !== ch.id); c.fallen = [...(c.fallen||[]), {id: ch.id, name: ch.name, day: c.time.day}];
    c.chronicle.push({t:Date.now(), day:c.time.day, text:`${ch.name} fell in battle${cm.bossName?` against ${cm.bossName}`:""}.`});
    pushLog(c, {kind:"sys", notes:[{kind:"hurt", text:`${ch.name} has died. A temple could still raise them.`}]});
  }
  if (status === "victory" || status === "surrender"){ const hn = []; harvest(c, cm, hn); if (hn.length) pushLog(c, {kind:"sys", notes: hn}); onCombatWon(c, cm); }
  else onCombatLost(c, cm);
}
function combatSummary(c){
  const cm = c.combat;
  const dead = enemies(c).filter(e=>e.dead).map(e=>e.name), fled = enemies(c).filter(e=>e.fled&&!e.dead).map(e=>e.name), up = enemies(c).filter(e=>isUp(c,e)).map(e=>e.name);
  const ps = partyMembers(c).map(ch => `${ch.name} ${ch.hp}/${maxHp(ch)} HP`).join(", ");
  return `Combat ended in ${cm.status.toUpperCase()} after ${cm.round} rounds${cm.terrain?` (${cm.terrain})`:""}. Defeated: ${dead.join(", ")||"none"}. Fled: ${fled.join(", ")||"none"}. Still standing: ${up.join(", ")||"none"}. Party: ${ps}. Combat XP already awarded: ${cm.xp} each. Key moments: ${cm.log.filter(l=>l.side!=="sys").slice(-6).map(l=>l.text.replace(/\*\*|_/g,"")).join(" | ")}`;
}
async function leaveCombat(){
  const c = C(); const cm = c?.combat; if (!cm) return; const status = cm.status;
  if (cm.sandbox){ store.camp((c) => { Object.assign(c.characters, cm.snapshot); c.combat = null; }); store.set({tab:"adventure"}); toast("Practice bout over; the party is restored."); return; }
  if (status === "dead") return;
  let ev = combatSummary(c);
  const origin = cm.origin || {};
  if (status === "victory" || status === "surrender") ev += origin.kind === "room" ? " The chamber is now clear. Describe the aftermath briefly (loot has already been handled by the game unless you add something special)." : " Narrate the aftermath: what remains of the foes, anything they carried (award fitting loot with items_add/gold), and any consequences.";
  if (status === "fled") ev += " The party escaped. Narrate where they end up and whether they're pursued.";
  if (status === "defeat") ev += " The whole party was beaten unconscious but survived. Decide what happens next (captured, robbed, left for dead, rescued by someone) and narrate them coming to. Everyone wakes with 1 HP.";
  const arrival = c.pendingArrival;
  store.camp((c) => {
    if (status === "defeat") for (const ch of partyMembers(c)) { ch.hp = Math.max(1, ch.hp); remCond(ch,"unconscious"); remCond(ch,"stable"); }
    if ((status === "fled" || status === "defeat") && c.explore){ const lname = c.locations[c.explore.loc]?.name; c.explore = null; if (status === "defeat") ev += ` They come to outside the entrance of ${lname}, which is still held by its surviving monsters.`; }
    pushLog(c, {kind:"sys", notes:[{kind: status==="victory"?"xp":"hurt", text:`Battle: ${status}`}]}); c.combat = null;
    if (arrival && status !== "defeat"){ const l = c.locations[arrival]; if (l){ moveTo(c, l); const n2 = []; onArrive(c, l, n2); if (n2.length) pushLog(c, {kind:"sys", notes: n2}); ev += ` Afterwards the party continues and arrives at ${l.name}; describe the arrival.${lairHint(c)}`; } }
    c.pendingArrival = null;
  });
  store.set({tab:"adventure"});
  const lairNext = !!C().pendingLair;
  await runDM("event", {text: ev, offline: ({victory:"The last foe falls, and the party catches its breath amid the wreckage.", surrender:"Your enemies throw down their weapons and beg for mercy.", fled:"The party breaks away and runs until the sounds of pursuit fade.", defeat:"Darkness takes the party... You wake hours later, bruised and aching, with 1 HP each."})[status]});
  if (lairNext) startPendingLair();
}
function divineIntervention(byRevivify){
  store.camp((c, ch) => { ch.dead = false; ch.hp = 1; ch.deathSaves = {s:0,f:0}; remCond(ch,"unconscious");
    if (byRevivify){ const caster = partyMembers(c).find(m => m.id !== ch.id && !m.dead && m.hp > 0 && m.spells.includes("Revivify") && lowestSlot(m, 3)); if (caster){ const l = lowestSlot(caster, 3); caster.slotsUsed[l] = (caster.slotsUsed[l]||0)+1; } }
    else ch.gold = Math.floor(ch.gold/2);
    c.chronicle.push({t:Date.now(), day:c.time.day, text: byRevivify ? `${ch.name} died and was brought back by a companion's Revivify.` : `${ch.name} died in battle and was dragged back from death by a mysterious power. Something now expects repayment.`});
    for (const m of partyMembers(c)) if (m.hp <= 0) m.hp = 1;
    if (c.explore) c.explore = null;
    c.combat = null; });
  store.set({tab:"adventure"});
  runDM("event", {text: byRevivify ? "The main character DIED in combat, but a companion cast Revivify and brought them back at 1 HP. Narrate the desperate moment and the gasping return. Companions react." : "The main character DIED in combat, but a mysterious power returned them to life at 1 HP (half their gold is gone). Narrate their return from death somewhere safe-ish, hint at who or what intervened and what it will want. Record it in memory."});
}

// ---- damage & healing ----
// visual effects queue: the UI plays these as floating numbers, shakes and flashes
function fx(c, e){ const cm = c.combat; if (!cm || !e.to && !e.from) return; cm.fx = cm.fx || []; cm.fx.push({ id: uid("x"), at: Date.now(), ...e }); if (cm.fx.length > 40) cm.fx = cm.fx.slice(-40); }
function hurt(c, cb, amt, t, o={}){
  const cm = c.combat;
  if (cb.kind === "pc") return hurtHero(c, cb, amt, t, o);
  let a = dmgMult(cb, t, amt); if (a <= 0){ fx(c, {k:"cond", to: cb.id, n:"immune"}); return 0; }
  if (cb.kind === "enemy" && (cb.traits?.regenStop || ["fire","acid"]).includes(t)) cb.noRegen = true;
  cb.hp -= a; fx(c, {k: o.crit ? "crit" : "dmg", to: cb.id, n: a, dt: t});
  for (const x of (cb.conds||[]).filter(x=>x.endsOnDamage)) { remC(c, cb, x.n); defer(c,"sys",`${cb.name} snaps out of it.`); }
  if (cb.kind === "enemy" && cb.boss && !cb.phase2 && cb.hp > 0 && cb.hp <= cb.maxHp/2 && cb.phase){ cb.phase2 = true; bossPhase(c, cb); }
  if (cb.hp <= 0){
    if (cb.kind === "enemy" && cb.traits?.undeadFortitude && t !== "radiant" && !o.crit){ const r = d(20) + (cb.mods?.CON||0); if (r >= 5 + a){ cb.hp = 1; defer(c,"enemy",`${B(cb.name)} refuses to fall (Undead Fortitude)!`); return a; } }
    cb.hp = 0; fx(c, {k:"down", to: cb.id, boss: !!cb.boss});
    if (cb.kind === "enemy"){ cb.dead = true; cm.kills.push(cb.id); defer(c, "party", `${B(cb.name)} falls!`);
      const killer = o.src && cm.cbt[o.src]; const kch = cbChar(c, killer);
      if (kch && subMods(kch).fiend){ const t2 = Math.max(1, mods(kch).CHA + kch.level); kch.tempHp = Math.max(kch.tempHp||0, t2); defer(c,"party",`Dark One's Blessing: ${kch.name} gains ${t2} temporary HP.`); }
      if (kch) partyBark(c, kch, cb.boss ? "boss" : "kill", cb.boss ? 1 : 0.3);
    } else { defer(c, "enemy", `${B(cb.name)} goes down!`); }
  }
  return a;
}
function bossPhase(c, e){
  const ph = e.phase; defer(c, "enemy", `${B(e.name)} ${ph.text}`); fx(c, {k:"phase", to: e.id});
  if (ph.heal){ e.hp = Math.min(e.maxHp, e.hp + ph.heal); }
  if (ph.enrage){ addC(c, e, "enraged", {}); e.atk = e.atk.map(a => ({...a, toHit: a.toHit + 2})); e.multi = e.multi ? [...e.multi, e.multi[0]] : [e.atk[0].name, e.atk[0].name]; }
  if (ph.summon){ const added = addEnemies(c, ph.summon, e); defer(c, "enemy", `${added.map(x=>x.name).join(", ")} join${added.length===1?"s":""} the fight!`); }
}
function hurtHero(c, cb, amt, t, o={}){
  const cm = c.combat, ch = cbChar(c, cb); cb.rx = cb.rx || {};
  if (t && resistances(ch).includes(t)) amt = Math.floor(amt/2);
  if (o.attack && ch.cls==="Rogue" && ch.level>=5 && !cb.rx.uncanny && ch.hp > 0){ cb.rx.uncanny = true; amt = Math.floor(amt/2); defer(c,"party",`${ch.name}'s Uncanny Dodge halves the blow.`); }
  if (amt <= 0) return 0;
  fx(c, {k: o.crit ? "crit" : "dmg", to: cb.id, n: amt, dt: t});
  let rest = amt; if (ch.tempHp){ const tt = Math.min(ch.tempHp, rest); ch.tempHp -= tt; rest -= tt; }
  if (hasCond(ch,"wildshape") && !ch.tempHp){ remCond(ch,"wildshape"); ch.wild = null; defer(c,"party",`${ch.name} is forced back into their true form.`); }
  if (hasCond(ch,"agathys") && o.attacker && o.melee && ch.tempHp > 0){ const ag = (ch.conditions.find(x=>x.name==="agathys")?.amount)||5; const real = hurt(c, o.attacker, ag, "cold", {src: cb.id}); defer(c,"party",`Frost bites back: ${B(o.attacker.name)} takes ${real} cold.`); }
  if (hasCond(ch,"agathys") && !ch.tempHp) remCond(ch,"agathys");
  if (ch.hp <= 0){
    if (rest > 0){ ch.deathSaves.f += o.crit ? 2 : 1; remCond(ch,"stable"); defer(c,"enemy",`${ch.name} suffers a death save failure (${ch.deathSaves.f}/3).`); if (ch.deathSaves.f >= 3){ ch.dead = true; defer(c,"sys",`${ch.name} dies.`); } }
    return amt;
  }
  ch.hp -= rest;
  if (rest > 0 && cb.conc){
    const dc = Math.max(10, Math.floor(rest/2)); const r = rollD20({adv: (ch.feats||[]).includes("War Caster")}); const tot = r.kept + saveMod(ch,"CON");
    if (tot < dc) dropConc(c, cb, `${ch.name}'s concentration breaks (${tot} vs DC ${dc})`);
  }
  if (rest > 0 && o.attacker && !cb.rx.rebuke && ch.spells.includes("Hellish Rebuke") && ch.hp > 0){
    const lvl = lowestSlot(ch, 1); if (lvl && !armorPenalty(ch)){ cb.rx.rebuke = true; ch.slotsUsed[lvl] = (ch.slotsUsed[lvl]||0)+1; const ci = castInfo(ch);
      const dmg = rollDice(joinExpr("2d10", lvl>1?`${lvl-1}d10`:"")).total; const sv = d(20) + (o.attacker.mods?.DEX||0) >= ci.dc; const real = hurt(c, o.attacker, sv?Math.floor(dmg/2):dmg, "fire", {src: cb.id});
      defer(c,"party",`Hellish Rebuke! Flames engulf ${B(o.attacker.name)} for ${real} fire.`); }
  }
  if (ch.hp <= 0){
    if (hasCond(ch,"death-ward")){ ch.hp = 1; remCond(ch,"death-ward"); defer(c,"party",`Death Ward flares: ${ch.name} stays standing at 1 HP!`); return amt; }
    if (ch.race==="Half-Orc" && resLeft(ch,"relentless")){ ch.hp = 1; useRes(ch,"relentless"); defer(c,"party",`Relentless Endurance: ${ch.name} refuses to fall!`); return amt; }
    if (-ch.hp >= maxHp(ch)){ ch.hp = 0; ch.dead = true; defer(c,"sys",`${ch.name} is slain outright by the massive blow.`); return amt; }
    ch.hp = 0; fx(c, {k:"down", to: cb.id}); addCond(ch,"unconscious"); remCond(ch,"raging"); dropConc(c, cb, `${ch.name} fell unconscious`);
    ch.deathSaves = {s:0, f:0}; defer(c,"enemy",`${B(ch.name)} collapses, dying!`);
    for (const m of heroes(c).filter(h => h.id !== cb.id && isUp(c, h))) { partyBark(c, cbChar(c, m), "down", 0.5, ch.name); break; }
  } else if (ch.hp < maxHp(ch)/4) partyBark(c, ch, "hurt", 0.25);
  return amt;
}
function healCb(c, cb, amt){ const got = healCb0(c, cb, amt); if (got > 0) fx(c, {k:"heal", to: cb.id, n: got}); return got; }
function healCb0(c, cb, amt){
  if (cb.kind === "pc"){ const ch = cbChar(c, cb); if (ch.dead) return 0; const was = ch.hp; ch.hp = Math.min(maxHp(ch), Math.max(0,ch.hp) + amt); if (was <= 0 && ch.hp > 0){ remCond(ch,"unconscious"); remCond(ch,"stable"); ch.deathSaves = {s:0,f:0}; } return ch.hp - Math.max(0,was); }
  const was = cb.hp; cb.hp = Math.min(cb.maxHp, Math.max(0,cb.hp) + amt); return cb.hp - Math.max(0,was);
}
function dropConc(c, cb, why, silent){
  const cm = c.combat; if (!cm || !cb?.conc) return; const k = cb.conc; cb.conc = null;
  for (const x of cbList(c)){ if (x.kind !== "pc") x.conds = (x.conds||[]).filter(y => y.src !== k.id); if (x.summoned && x.src === k.id) x.fled = true; }
  for (const ch of Object.values(c.characters)) ch.conditions = (ch.conditions||[]).filter(y => y.src !== k.id);
  cm.zones = cm.zones.filter(z => z.src !== k.id);
  if (!silent) clog(c, "sys", `${k.spell} ends${why?`: ${why}`:""}.`);
}
function heroSave(c, cb, ab, dc, reason=""){
  const ch = cbChar(c, cb);
  const adv = (ab==="DEX" && hasCond(ch,"dodging")) || (hasCond(ch,"raging") && ab==="STR") || (ch.race==="Gnome" && ["INT","WIS","CHA"].includes(ab)) || (ch.race==="Dwarf" && /poison/.test(reason)) || (["Elf","Half-Elf"].includes(ch.race) && /charm/.test(reason)) || (ch.race==="Halfling" && /fright/.test(reason));
  if (["STR","DEX"].includes(ab) && condsOf(c, cb).some(n=>["paralyzed","stunned","unconscious"].includes(n))) return { success:false, total:0, text:"auto-fail" };
  let r = rollD20({adv, lucky: RACES[ch.race].lucky}); const bonus = hasCond(ch,"blessed") ? d(4) : 0; let tot = r.kept + saveMod(ch, ab) + bonus;
  if (tot < dc && resLeft(ch,"indomitable")){ useRes(ch,"indomitable"); const r2 = rollD20({}); tot = r2.kept + saveMod(ch,ab) + bonus; defer(c,"party",`${ch.name} is Indomitable and rerolls the save.`); r = r2; }
  return { success: tot >= dc, total: tot, nat: r.kept, text:`${tot} vs DC ${dc}` };
}
const pcSave = (c, ab, dc, reason) => heroSave(c, actorCb(c) || mainCb(c), ab, dc, reason);

// ---- attacks ----
function attackMods(c, att, tgt, a){
  let adv = false, dis = false; const why = [];
  const ac = condsOf(c, att), tc = condsOf(c, tgt);
  if (a.melee && c.combat && tacticalFlank(c, att, tgt)){ adv = true; why.push("flanking"); }
  if (ac.some(n => ["poisoned","frightened","restrained","blinded","prone"].includes(n))){ dis = true; why.push("hampered"); }
  if (ac.includes("mocked")){ dis = true; remC(c, att, "mocked"); why.push("mocked"); }
  if (ac.includes("hidden") || ac.includes("invisible") || ac.includes("greater-invisible")){ adv = true; why.push("unseen"); }
  if (ac.includes("helped")){ adv = true; remC(c, att, "helped"); why.push("helped"); }
  if (att.kind === "pc" && ac.includes("reckless") && a.melee) { adv = true; why.push("reckless"); }
  if (tc.some(n => HELPLESS.includes(n))){ adv = true; why.push("target helpless"); }
  if (tc.includes("prone")){ if (a.melee) adv = true; else dis = true; }
  if (tc.includes("reckless")) adv = true;
  if (tc.includes("guided-target")){ adv = true; remC(c, tgt, "guided-target"); why.push("guiding bolt"); }
  if (tc.includes("dodging") || tc.includes("blurred") || tc.includes("invisible") || tc.includes("greater-invisible")){ dis = true; why.push("target evasive"); }
  if (!a.melee && att.pos === "front" && att.kind !== "enemy" && reachableFoes(c, att, true).some(e => e.pos === "front" && canAct(c, e)) && !a.spell) { dis = true; why.push("ranged in melee"); }
  if (att.kind === "pc"){
    const ch = cbChar(c, att);
    if (tgt.conds?.some(x=>x.n==="vow" && x.by === att.id)){ adv = true; why.push("vow"); }
    if (subMods(ch).assassin && !tgt.acted && c.combat.round === 1){ adv = true; why.push("assassinate"); }
    if (armorPenalty(ch)){ dis = true; why.push("armor"); }
    if (c.combat.pt.actor === att.id && c.combat.pt.luck && resLeft(ch,"luck")){ adv = true; why.push("luck"); }
  }
  if (att.kind === "enemy" && att.traits?.pack && enemies(c).filter(e=>e.id!==att.id && isUp(c,e)).length){ adv = true; why.push("pack tactics"); }
  return { adv, dis, why };
}
function resolveAttack(c, att, tgt, a, o={}){
  const cm = c.combat; const am = attackMods(c, att, tgt, a);
  if (a.melee) noteMelee(c, att, tgt);
  const ch = cbChar(c, att);
  if (ch && am.why.includes("luck")) { useRes(ch,"luck"); cm.pt.luck = false; }
  const r = rollD20({adv: am.adv, dis: am.dis, lucky: ch ? RACES[ch.race].lucky : false});
  let toHit = a.toHit; const extra = [];
  if (ch && hasCond(ch, "cursed")) toHit -= 2;
  if (ch && hasCond(ch,"blessed")){ const b = d(4); toHit += b; extra.push(`bless ${b}`); }
  if (!ch && hasC(c, att, "blessed")) toHit += d(4);
  if (ch && hasCond(ch,"sacred-weapon") && !a.spell) toHit += Math.max(1, mods(ch).CHA);
  if (ch && hasCond(ch,"inspired")){ const die = (ch.conditions.find(x=>x.name==="inspired")?.die)||6; const b = d(die); toHit += b; extra.push(`inspiration ${b}`); remCond(ch,"inspired"); }
  if (!ch && hasC(c, att, "inspired")){ toHit += d(6); remC(c, att, "inspired"); }
  if (ch && o.power) toHit -= 5;
  const critOn = ch && !a.spell ? (subMods(ch).critRange || 20) : 20;
  const nat = r.kept; let total = nat + toHit; let ac = acOf(c, tgt) + coverBonus(c, att, tgt, a);
  let hit = nat !== 1 && (nat >= critOn || total >= ac); let crit = hit && nat >= critOn;
  if (hit && a.melee && condsOf(c, tgt).some(n => ["paralyzed","asleep","unconscious"].includes(n))) crit = true;
  // reactions of defending heroes
  if (hit && !crit && tgt.kind === "pc"){
    const tch = cbChar(c, tgt); tgt.rx = tgt.rx || {};
    if (!tgt.shieldUp && !tgt.rx.shield && tch.spells.includes("Shield") && total < ac + 5 && tch.hp > 0){ const l = lowestSlot(tch, 1); if (l && !armorPenalty(tch)){ tch.slotsUsed[l] = (tch.slotsUsed[l]||0)+1; tgt.shieldUp = true; tgt.rx.shield = true; ac += 5; clog(c,"party",`${tch.name} snaps up a Shield spell (+5 AC)!`); hit = total >= ac; } }
  }
  if (hit && !crit && att.side === "enemy"){
    const bard = heroes(c).find(h => { const b = cbChar(c, h); return isUp(c, h) && subMods(b).cuttingWords && resLeft(b,"inspiration") && !(h.rx||{}).cutting; });
    if (bard){ const b = cbChar(c, bard); const die = b.level>=10?10:b.level>=5?8:6; if (total - die < ac){ bard.rx = bard.rx || {}; bard.rx.cutting = true; useRes(b,"inspiration"); const cw = d(die); total -= cw; hit = total >= ac; clog(c,"party",`${b.name}'s Cutting Words sap ${cw} from the attack${hit?", but it still lands":", and it misses"}.`); } }
  }
  const res = { nat, rolls: r.rolls, total, ac, hit, crit, fumble: nat === 1, adv: r.adv, dis: r.dis, why: am.why, extra, dmg: 0, parts: [] };
  fx(c, {k:"lunge", from: att.id, to: tgt.id, ranged: !!(a.ranged || a.spell), spell: !!a.spell, dt: a.t});
  if (!hit) fx(c, {k:"miss", to: tgt.id, fumble: nat === 1});
  if (ch){ remCond(ch, "hidden"); if (hasCond(ch,"invisible")) { remCond(ch,"invisible"); clog(c,"party",`${ch.name} flickers back into view.`); } }
  if (!hit) return res;
  const savage = ch && ch.race==="Half-Orc" && crit && a.melee;
  let dmg = rollDice(a.dmg, {crit, gwf: a.gwf, extraDie: savage}).total; res.parts.push(`${dmg} ${a.t||""}`.trim());
  const addDmg = (expr, t, label) => { const v = rollDice(expr, {crit}).total; dmg += v; res.parts.push(`${v} ${label||t}`); };
  if (ch && !a.spell){
    const sm = subMods(ch); const pt = cm.pt;
    if (hasCond(ch,"raging") && a.melee && a.ab === "STR"){ dmg += rageBonus(ch); res.parts.push(`${rageBonus(ch)} rage`); }
    if (o.power){ dmg += 10; res.parts.push("10 power"); }
    if (a.extra) addDmg(a.extra.dmg, a.extra.t);
    const mark = (tgt.conds||[]).find(x => (x.n === "hex" || x.n === "hunters-mark") && x.by === att.id); if (mark) addDmg("1d6", mark.n==="hex"?"necrotic":a.t, mark.n==="hex"?"hex":"hunter's mark");
    if (hasCond(ch,"divine-favor")) addDmg("1d4","radiant","divine favor");
    if (hasCond(ch,"crusader")) addDmg("1d4","radiant","crusader");
    if (ch.cls === "Rogue" && !pt.sneak && (a.ranged || invItem(ch, a.itemId)?.weapon?.props.includes("finesse"))){
      const allyNear = party(c).some(p => p.id !== att.id && isUp(c, p));
      const foesUp = enemies(c).filter(e => isUp(c, e)).length;
      if ((res.adv || allyNear || (sm.swash && foesUp === 1) || HELPLESS.some(n => condsOf(c,tgt).includes(n))) && !res.dis){ pt.sneak = true; addDmg(sneakDice(ch), a.t, "sneak attack"); }
    }
    if (sm.colossus && !pt.colossus && tgt.hp < tgt.maxHp){ pt.colossus = true; addDmg("1d8", a.t, "colossus slayer"); }
    if (ch.cls === "Cleric" && ch.level >= 8 && !pt.dstrike){ pt.dstrike = true; addDmg("1d8", a.t, "divine strike"); }
    if (pt.smite && a.melee){ const l = lowestSlot(ch, 1); if (l){ ch.slotsUsed[l] = (ch.slotsUsed[l]||0)+1; const dice = Math.min(5, 1 + l) + (["undead","fiend"].includes(tgt.type) ? 1 : 0); addDmg(`${dice}d8`, "radiant", "divine smite"); pt.smite = false; } }
    if (pt.branding){ addDmg(pt.branding.dmg, pt.branding.t, "branding smite"); pt.branding = null; }
    if (pt.maneuver && resLeft(ch,"superiority")){ useRes(ch,"superiority"); addDmg("1d8", a.t, "superiority"); pt.maneuver = false; }
  }
  if (att.kind === "enemy" && att.traits?.martialAdv && att.maRound !== cm.round && enemies(c).filter(e=>e.id!==att.id && isUp(c,e)).length){ att.maRound = cm.round; addDmg(att.traits.martialAdv, a.t, "martial advantage"); }
  res.dmg = dmg;
  const real = hurt(c, tgt, dmg, a.t, {crit, attack:true, attacker: att, melee: a.melee, src: att.id});
  res.real = real;
  if (a.rider && isUp(c, tgt)){
    const rd = a.rider;
    if (rd.save){ const sv = tgt.kind === "pc" ? heroSave(c, tgt, rd.save, rd.dc, rd.cond||rd.t||"") : {success: d(20) + (tgt.mods?.[rd.save]||0) >= rd.dc};
      if (!sv.success){ if (rd.cond){ addC(c, tgt, rd.cond, {rounds: rd.rounds || (rd.cond==="prone"?1:2)}); res.rider = `${tgt.name} is ${rd.cond}!`; }
        if (rd.dmg){ const x = rollDice(rd.dmg).total; const rr = hurt(c, tgt, x, rd.t, {}); res.rider = (res.rider?res.rider+" ":"") + `+${rr} ${rd.t}`; } }
      else if (rd.dmg && rd.half){ const x = Math.floor(rollDice(rd.dmg).total/2); const rr = hurt(c, tgt, x, rd.t, {}); res.rider = `+${rr} ${rd.t} (saved)`; }
    } else if (rd.dmg){ const x = rollDice(rd.dmg).total; const rr = hurt(c, tgt, x, rd.t, {}); res.rider = `+${rr} ${rd.t}`; }
  }
  if (ch && isUp(c, tgt)){
    const pt = cm.pt;
    if (pt.stun && a.melee && resLeft(ch,"ki")){ useRes(ch,"ki"); pt.stun = false; const dc = 8 + profBonus(ch.level) + mods(ch).WIS; if (d(20) + (tgt.mods?.CON||0) < dc){ addC(c, tgt, "stunned", {rounds:1}); res.rider = `${tgt.name} is stunned!`; } else res.rider = `${tgt.name} resists the stunning strike.`; }
    if (o.openHand && subMods(ch).openHand){ const dc = 8 + profBonus(ch.level) + mods(ch).WIS; if (d(20) + (tgt.mods?.DEX||0) < dc){ addC(c, tgt, "prone", {rounds:1}); res.rider = `${tgt.name} is knocked prone!`; } }
  }
  if (crit && ch){ ch.stats = ch.stats || {}; ch.stats.crits = (ch.stats.crits||0) + 1; partyBark(c, ch, "crit", 0.4); }
  return res;
}
function attackText(att, tgt, a, r){
  const dice = r.rolls.length > 1 ? `[${r.rolls.join(",")}→${r.nat}]` : `[${r.nat}]`;
  if (!r.hit) return `${B(att.name)} ${a.spell?"casts "+a.name+" at":"attacks"} ${B(tgt.name)}${a.spell||/strike|attack/i.test(a.name)?"":" with "+a.name}: ${dice} ${r.total} vs AC ${r.ac}, ${r.fumble?"a clumsy miss":"miss"}.`;
  return `${B(att.name)} ${r.crit?"lands a CRITICAL hit on":"hits"} ${B(tgt.name)}${a.spell?` with ${a.name}`:/strike|attack/i.test(a.name)?"":" with "+a.name}: ${dice} ${r.total} vs AC ${r.ac}, ${B(r.real ?? r.dmg)} damage${r.parts.length>1?` (${r.parts.join(" + ")})`:""}.${r.rider?" "+r.rider:""}`;
}

// ---- enemy AI ----
function decideLocal(c, e){
  const hpPct = e.hp / e.maxHp;
  const any = party(c).filter(p => isUp(c, p)); if (!any.length) return {do:"wait"};
  if (!e.boss && ["cowardly","skirmisher"].includes(e.beh) && hpPct < 0.3 && rnd(2) === 0) return {do:"flee"};
  if (hasC(c, e, "turned") || (hasC(c, e, "frightened") && rnd(3)===0)) return {do:"flee"};
  const hasRanged = e.atk.some(a => a.ranged);
  let pool = reachableFoes(c, e, true); if (!pool.length && hasRanged) pool = any; if (!pool.length) pool = any;
  let target;
  if (e.beh === "pack" || e.beh === "swarm") target = pool.slice().sort((a,b)=>hpOf(c,a)-hpOf(c,b))[0];
  else if (e.beh === "tactical" || e.beh === "caster" || e.boss) target = pool.slice().sort((a,b)=> (acOf(c,a) + hpOf(c,a)/5) - (acOf(c,b) + hpOf(c,b)/5))[0];
  else target = pool[rnd(pool.length)];
  const ab = (e.abil||[]).find(a => a.charged && (a.uses == null || a.used < a.uses) && (a.k !== "heal" || enemies(c).some(x=>isUp(c,x) && x.hp < x.maxHp/2)) && (a.k !== "rally" || enemies(c).filter(x=>isUp(c,x)).length > 1) && (a.k !== "self" || e.hp < e.maxHp*0.7));
  if (ab && rnd(100) < (e.boss || e.beh === "caster" ? 80 : 60)) return {do:"ability", use: ab.n, target: target.id};
  return {do:"attack", target: target.id};
}
async function planRound(snapshot){
  const c = snapshot; const foes = enemies(c).filter(e => isUp(c, e)); if (!foes.length) return null;
  const pty = party(c).filter(p => isUp(c, p));
  const prompt = `You control the enemies in a turn-based 5e-style fight against an adventuring party. Decide what each enemy does THIS ROUND, true to its nature: beasts go for the weak, cowards flee when badly hurt, casters use abilities, fanatics fight to the death, clever foes focus the healer or the most dangerous hero. Melee enemies can only reach back-line heroes once the party's front line has fallen. Vary it; don't repeat lines.
Terrain: ${c.combat.terrain||"unspecified"}. Round ${c.combat.round}.
PARTY: ${pty.map(p=>`[${p.id}] ${p.name}${p.kind==="pc"?` (${cbChar(c,p).cls})`:""} ${p.pos} line, HP ${hpOf(c,p)}/${maxHpOf(c,p)} AC ${acOf(c,p)}${condsOf(c,p).length?` (${condsOf(c,p).join(", ")})`:""}`).join("; ")}
ENEMIES: ${foes.map(e=>`[${e.id}] ${e.name} (${e.type}${e.boss?", BOSS":""}) ${e.pos} line, HP ${e.hp}/${e.maxHp}; attacks: ${e.atk.map(a=>`${a.name}${a.ranged?" (ranged)":""}`).join(", ")}; abilities ready: ${(e.abil||[]).filter(a=>a.charged && (a.uses==null||a.used<a.uses)).map(a=>a.n).join(", ")||"none"}${e.conds.length?`; conditions: ${e.conds.map(x=>x.n).join(", ")}`:""}${e.tactics?`; tactics: ${e.tactics}`:""}`).join("\n")}
RECENT: ${c.combat.log.slice(-6).map(l=>l.text.replace(/\*\*|_/g,"")).join(" | ")}
Reply with only JSON: {"actions":[{"enemy":"enemy id","do":"attack|ability|flee|dodge","use":"attack or ability name","target":"party id","line":"one vivid sentence (max 18 words) of what it does or says, present tense"}]}`;
  try { const res = await askJSON(prompt, {tier:"quick"}); const acts = {}; for (const a of (res?.actions||[])) if (a && a.enemy) acts[a.enemy] = a; return acts; } catch { return null; }
}
function ensurePlan(c){
  const cm = c.combat; if (!cm || cm.status !== "active" || !S().settings.aiTactics || !SAMPLE) return;
  const key = cm.id + ":" + cm.round; if (PLANS[key]) return;
  PLANS[key] = planRound(structuredClone(c));
}
async function getPlan(c, e){
  const key = c.combat.id + ":" + c.combat.round; const p = PLANS[key]; if (!p) return null;
  const acts = await Promise.race([p, sleep(8000).then(()=>null)]); return acts?.[e.id] || null;
}
function enemyTurn(c, e, plan){
  if (!isUp(c, e)) return;
  const cs = condsOf(c, e);
  const blocker = cs.find(n => ["paralyzed","stunned","asleep","laughing","entranced","polymorphed","banished"].includes(n));
  if (blocker){ clog(c, "sys", `${e.name} is ${blocker} and can't act.`); return; }
  if (cs.includes("charmed")){ clog(c, "sys", `${e.name} hesitates, charmed.`); return; }
  let act = decideLocal(c, e);
  if (plan && ["attack","ability","flee","dodge"].includes(plan.do)){
    const tgt = c.combat.cbt[plan.target]; const valid = tgt && tgt.side === "party" && isUp(c, tgt);
    if (plan.do === "flee" && !e.boss) act = {do:"flee"};
    else if (plan.do === "dodge") act = {do:"dodge"};
    else if (plan.do === "ability"){ const ab = (e.abil||[]).find(a => a.n.toLowerCase() === String(plan.use||"").toLowerCase() && a.charged && (a.uses==null || a.used < a.uses)); act = ab ? {do:"ability", use: ab.n, target: valid ? tgt.id : act.target} : {do:"attack", target: valid ? tgt.id : act.target}; }
    else if (plan.do === "attack") act = {do:"attack", use: plan.use, target: valid ? tgt.id : act.target};
  }
  if (cs.includes("turned")) act = {do:"flee"};
  const line = plan?.line ? `_${String(plan.line).slice(0,160)}_ ` : "";
  if (act.do === "wait") return;
  if (act.do === "flee"){ e.fled = true; clog(c, "enemy", `${line}${B(e.name)} flees the fight!`); return; }
  if (act.do === "dodge"){ addC(c, e, "dodging", {rounds:1}); clog(c, "enemy", `${line}${B(e.name)} takes a defensive stance.`); return; }
  let tgt = c.combat.cbt[act.target] || party(c).find(p=>isUp(c,p)); if (!tgt) return;
  if (act.do === "ability"){ const ab = e.abil.find(a => a.n === act.use); if (ab){ enemyAbility(c, e, ab, tgt, line); return; } }
  const pickAtk = (name, t) => { const reach = canReach(c, e, t, true); const named = e.atk.find(a => a.name.toLowerCase() === String(name||"").toLowerCase()); if (named && (named.ranged || reach)) return named; return reach ? (e.atk.find(a=>!a.ranged) || e.atk[0]) : (e.atk.find(a=>a.ranged) || null); };
  // retarget if the chosen hero can't be reached in melee and we have no ranged option
  if (!pickAtk(act.use, tgt)){ const alt = reachableFoes(c, e, true); if (alt.length) tgt = alt[rnd(alt.length)]; }
  const seq = e.multi && e.multi.length && canReach(c, e, tgt, true) ? e.multi : [act.use];
  let first = true;
  for (const nm of seq){
    let t = tgt; if (!isUp(c, t)){ const alt = reachableFoes(c, e, true); if (!alt.length) break; t = alt[0]; }
    const a = pickAtk(nm, t); if (!a) break;
    const r = resolveAttack(c, e, t, {...a, melee: !a.ranged});
    clog(c, "enemy", (first ? line : "") + attackText(e, t, a, r)); first = false;
    if (c.characters[c.activeCharId].dead) break;
  }
}
function enemyAbility(c, e, ab, tgt, line){
  if (ab.recharge) ab.charged = false; ab.used = (ab.used||0) + 1;
  if (ab.k === "heal"){ const ally = enemies(c).filter(x=>isUp(c,x)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0] || e; const h = rollDice(ab.dmg || "2d8").total; ally.hp = Math.min(ally.maxHp, ally.hp + h); clog(c,"enemy",`${line}${B(e.name)} uses ${ab.n}: ${ally.name} regains ${h} HP.`); return; }
  if (ab.k === "rally"){ for (const x of enemies(c).filter(x=>isUp(c,x))) addC(c, x, ab.cond || "blessed", {rounds: ab.rounds || 3}); clog(c,"enemy",`${line}${B(e.name)} uses ${B(ab.n)}: its allies surge with confidence!`); return; }
  if (ab.k === "self"){ addC(c, e, ab.cond || "warded", {rounds: ab.rounds || 1}); clog(c,"enemy",`${line}${B(e.name)} uses ${B(ab.n)}.`); return; }
  if (ab.k === "summon"){ const added = addEnemies(c, ab.summon || {name:"Skeleton", count:2}, e); clog(c,"enemy",`${line}${B(e.name)} uses ${B(ab.n)}: ${added.map(x=>x.name).join(", ")} rise to fight!`); return; }
  if (ab.k === "atk"){
    const r = resolveAttack(c, e, tgt, {name: ab.n, toHit: ab.toHit || 4, dmg: ab.dmg || "0", t: ab.t, melee: true});
    if (r.hit && ab.cond && isUp(c, tgt)) addC(c, tgt, ab.cond, {rounds: ab.rounds || 2});
    clog(c, "enemy", `${line}${attackText(e, tgt, {name:ab.n, spell:true}, r)}${r.hit && ab.cond ? ` ${tgt.name} is ${ab.cond}!` : ""}`); return;
  }
  const targets = ab.aoe ? party(c).filter(p=>isUp(c,p)) : [tgt]; const dmg = ab.dmg ? rollDice(ab.dmg).total : 0; const out = [];
  for (const t of targets){
    let ok; if (t.kind === "pc"){ const sv = heroSave(c, t, ab.save, ab.dc, ab.cond || ab.t || ""); ok = sv.success; } else ok = d(20) + (t.mods?.[ab.save]||0) >= ab.dc;
    let dealt = dmg ? (ok ? (ab.half ? Math.floor(dmg/2) : 0) : dmg) : 0;
    const tch = cbChar(c, t);
    if (tch && ab.save === "DEX" && tch.level >= 7 && ["Rogue","Monk"].includes(tch.cls) && ab.half) dealt = ok ? 0 : Math.floor(dmg/2);
    const real = dealt ? hurt(c, t, dealt, ab.t, {}) : 0;
    if (!ok && ab.cond && isUp(c, t)) addC(c, t, ab.cond, {rounds: ab.rounds || 2});
    out.push(`${t.name} ${ok?"saves":"fails"}${real?` (${real} ${ab.t})`:""}${!ok && ab.cond?`, ${ab.cond}`:""}`);
  }
  clog(c, "enemy", `${line}${B(e.name)} unleashes ${B(ab.n)} (DC ${ab.dc} ${ab.save}): ${out.join("; ")}.`);
}
function companionTurn(c, p){
  if (!canAct(c, p)) { if (isUp(c,p)) clog(c,"sys",`${p.name} can't act.`); return; }
  const foes = reachableFoes(c, p, true); if (!foes.length) return;
  const focus = c.combat.focus && c.combat.cbt[c.combat.focus];
  const tgt = focus && foes.includes(focus) ? focus : foes.slice().sort((a,b)=>a.hp-b.hp)[0];
  const a = p.atk[0]; const r = resolveAttack(c, p, tgt, {...a, melee:true});
  clog(c, "party", attackText(p, tgt, a, r));
}

// ---- the loop that runs everyone the player isn't controlling ----
let loopRunning = false;
async function combatLoop(){
  if (loopRunning) return; loopRunning = true;
  try {
    for (let guard = 0; guard < 400; guard++){
      const c = C(); const cm = c?.combat; if (!cm || cm.status !== "active") break;
      ensurePlan(c);
      const cur = curCb(c); if (!cur) break;
      if (isPlayerCtrl(c, cur)) break;
      store.set({combatUI: {...S().combatUI, acting: cur.id}});
      const pace = S().settings.reduceMotion ? 250 : cur.kind === "pc" ? 900 : 750;
      let plan = null;
      if (cur.side === "enemy" && canAct(c, cur)) { const t0 = Date.now(); plan = await getPlan(c, cur); const left = pace - (Date.now()-t0); if (left > 0) await sleep(left); }
      else await sleep(pace);
      if (C()?.combat?.id !== cm.id) break;
      store.camp(c => {
        const cb = curCb(c); if (!cb) return;
        if (cb.side === "enemy") enemyTurn(c, cb, plan);
        else if (cb.kind === "pc") aiHeroTurn(c, cb);
        else companionTurn(c, cb);
        clog(c, "sys", "");
        if (!checkEnd(c)) advanceTurn(c);
      });
      if (!S().settings.reduceMotion){ const added = (C()?.combat?.fx || []).filter(f => f.at >= Date.now() - 400).length; if (added > 2) await sleep(Math.min(1300, (added - 2) * 210)); }
    }
  } finally {
    loopRunning = false; store.set({combatUI: {...S().combatUI, acting: null}});
    const c = C(); if (c?.combat?.status === "active" && curCb(c) && !isPlayerCtrl(c, curCb(c))) setTimeout(combatLoop, 0);
  }
}

// ======================= HERO ACTIONS =======================
// Core "do" functions mutate a campaign clone for the current actor and return effects.
function useAttackSlot(c){ const pt = c.combat.pt; const ch = actorCh(c); if (pt.attacksLeft > 0){ pt.attacksLeft--; return true; } if (!pt.action) return false; pt.action = 0; pt.attackAction = true; pt.attacksLeft = attacksPerAction(ch) - 1; return true; }
function doAttack(c, weaponId, targetId, opts={}){
  const ch = actorCh(c), me = actorCb(c), tgt = c.combat.cbt[targetId]; if (!ch) return {error:"Not a hero's turn."};
  if (!tgt || !isUp(c, tgt) || tgt.side !== "enemy") return {error:"Choose a living enemy."};
  const w = weaponAttacks(ch).find(x=>x.id===weaponId); if (!w) return {error:"That weapon isn't available."};
  if (w.melee && !canReach(c, me, tgt, true)) return {error:`${tgt.name} is behind their front line. Use a ranged attack or a spell.`};
  if (w.stowed) equipItem(ch, w.itemId);
  const pt = c.combat.pt;
  if (opts.bonus){ if (!pt.bonus) return {error:"Your bonus action is spent."}; pt.bonus = 0; }
  else if (!useAttackSlot(c)) return {error:"No attacks left this turn."};
  const a = {...w}; const r = resolveAttack(c, me, tgt, a, {power: opts.power, openHand: opts.openHand});
  clog(c, "party", attackText(me, tgt, a, r));
  return { overlay: { label: `${ch.name}: ${w.name} vs ${tgt.name}`, dice:[{sides:20, values:r.rolls, kept:r.nat}], mod: r.total - r.nat, total: r.total, dc: r.ac, dcLabel:"AC", success: r.hit, crit: r.crit, fumble: r.fumble, adv: r.adv, dis: r.dis, after: r.hit ? `${r.real ?? r.dmg} damage` : "" } };
}
function spellDice(ch, sp, slot){
  const m = sp.m; let dice = m.dmg || "0";
  if (sp.l === 0 && !m.beams){ const k = cantripScale(ch); dice = parseDice(dice).map(t => t.k != null ? t.k : `${t.n*k}d${t.sides}`).join("+"); }
  if (m.up && slot > sp.l && sp.l > 0){ const up = parseDice(m.up)[0]; dice += `+${up.n*(slot-sp.l)}d${up.sides}`; }
  let bonus = 0; const ci = castInfo(ch);
  if (subMods(ch).evoker && sp.s === "Evocation" && m.dmg) bonus += Math.max(0, ci.mod);
  if (sp.n === "Eldritch Blast" && (ch.invocations||[]).includes("Agonizing Blast")) bonus += Math.max(0, ci.mod);
  return bonus ? `${dice}+${bonus}` : dice;
}
function canCastNow(c, sp, o={}){
  const ch = o.ch || actorCh(c), pt = c.combat?.pt;
  if (!ch) return "Not your turn.";
  if (hasCond(ch,"wildshape")) return "Can't cast in beast form.";
  if (armorPenalty(ch)) return "Armor hampers spellcasting.";
  if (sp.m.k === "react") return "Cast automatically as a reaction.";
  if (pt && c.combat?.status === "active"){ const bonus = sp.m.bonus || o.quicken; if (bonus && !pt.bonus) return "Bonus action spent."; if (!bonus && !pt.action) return "Action spent."; }
  if (sp.l > 0 && !o.fromScroll){ const l = o.slot || lowestSlot(ch, sp.l); if (!l || !slotsLeft(ch, l)) return "No spell slots left."; }
  return null;
}
function doCast(c, spellName, o={}){
  const sp = SPELL[spellName]; if (!sp) return {error:"Unknown spell."};
  const ch = actorCh(c), me = actorCb(c), cm = c.combat, pt = cm.pt, ci = castInfo(ch) || {dc:12, atk:4, mod:2, ab:"INT"};
  const err = canCastNow(c, sp, o); if (err) return {error: err};
  const m = sp.m; const allyCb = o.allyId ? cm.cbt[o.allyId] : null;
  if (sp.n === "Revivify"){ if (!allyCb || allyCb.kind !== "pc" || !cbChar(c, allyCb).dead) return {error:"Choose a fallen ally to revive."}; }
  const slot = sp.l === 0 ? 0 : o.fromScroll ? Math.max(1, sp.l) : (o.slot || lowestSlot(ch, sp.l));
  if (m.bonus || o.quicken) pt.bonus = 0; else pt.action = 0;
  if (o.quicken) useRes(ch, "sorcery", 2);
  if (slot && !o.fromScroll) ch.slotsUsed[slot] = (ch.slotsUsed[slot]||0) + 1;
  if (o.fromScroll && o.itemId){ const it = invItem(ch, o.itemId); if (it){ it.qty--; if (it.qty <= 0) dropItem(ch, it.id); } }
  if (hasCond(ch,"invisible")) remCond(ch,"invisible");
  const foes = (o.targets||[]).map(id=>cm.cbt[id]).filter(t=>t && isUp(c,t) && t.side === "enemy");
  { const allies = m.party ? party(c).filter(x => isUp(c, x)).map(x => x.id) : allyCb ? [allyCb.id] : (m.k === "heal" || m.k === "buff") ? [me.id] : [];
    fx(c, { k: "cast", from: me.id, targets: foes.length ? foes.map(x => x.id) : allies, dt: m.t || null, spell: sp.n, kind: m.k, area: (m.tgt || 1) >= 2, noProjectile: m.k === "atk" }); }
  const conc = m.conc ? (dropConc(c, me, `${ch.name} began another spell`), { id: uid("k"), spell: sp.n, rounds: m.rounds || 10, targets: foes.map(f=>f.id) }) : null;
  if (conc) me.conc = conc;
  const src = conc?.id;
  const head = `${B(ch.name)} casts ${B(sp.n)}${slot && slot > sp.l ? ` (level ${slot})` : ""}.`;
  let overlay = null; const lines = [head];
  if (sp.n === "Revivify"){ const t = cbChar(c, allyCb); t.dead = false; t.hp = 1; t.deathSaves = {s:0,f:0}; remCond(t,"unconscious"); lines.push(`${t.name} gasps back to life!`); }
  else if (m.k === "atk"){
    const n = m.rays ? m.rays + Math.max(0, slot - sp.l) : m.beams ? (ch.level >= 11 ? 3 : ch.level >= 5 ? 2 : 1) : 1;
    if (!foes.length) return {error:"Choose a target."};
    const dice = spellDice(ch, sp, slot);
    for (let i=0;i<n;i++){ const t2 = isUp(c, foes[i % foes.length]) ? foes[i % foes.length] : enemies(c).find(e=>isUp(c,e)); if (!t2) break;
      if (m.melee && !canReach(c, me, t2, true)) { lines.push(`${t2.name} is out of reach.`); continue; }
      const a = {name: sp.n, toHit: ci.atk, dmg: dice, t: m.t, melee: !!m.melee, spell:true};
      const r = resolveAttack(c, me, t2, a); lines.push(attackText(me, t2, a, r));
      if (r.hit && m.guiding && isUp(c, t2)) addC(c, t2, "guided-target", {rounds: 2});
      if (r.hit && m.drain){ const h = healCb(c, me, Math.floor((r.real||0)/2)); lines.push(`${ch.name} drinks in ${h} HP.`); }
      if (!overlay) overlay = { label: `${ch.name}: ${sp.n} vs ${t2.name}`, dice:[{sides:20, values:r.rolls, kept:r.nat}], mod: r.total - r.nat, total: r.total, dc: r.ac, dcLabel:"AC", success: r.hit, crit: r.crit, fumble: r.fumble, after: r.hit ? `${r.real ?? r.dmg} damage` : "" };
    }
  } else if (m.k === "save"){
    if (!foes.length) return {error:"Choose at least one target."};
    const dmg = rollDice(spellDice(ch, sp, slot)).total; const out = [];
    for (const t of foes.slice(0, m.tgt || 1)){
      const auto = ["STR","DEX"].includes(m.save) && condsOf(c,t).some(n=>["paralyzed","stunned","asleep","unconscious"].includes(n));
      const sv = auto ? 0 : d(20) + (t.mods?.[m.save]||0); const ok = sv >= ci.dc;
      const x = m.toll && t.hp < t.maxHp ? rollDice(spellDice(ch, sp, slot).replace(/d8/,"d12")).total : dmg;
      const dealt = ok ? (m.half ? Math.floor(x/2) : 0) : x; const real = dealt ? hurt(c, t, dealt, m.t, {src: me.id}) : 0;
      if (!ok && m.mock && isUp(c,t)) addC(c, t, "mocked", {rounds: 2});
      if (!ok && m.cond && isUp(c,t)) addC(c, t, m.cond, {rounds: m.rounds || 1});
      out.push(`${t.name} ${ok?"saves":"fails"} (${sv}) → ${real} ${m.t}`);
    }
    lines.push(`DC ${ci.dc} ${m.save}: ${out.join("; ")}.`);
  } else if (m.k === "auto"){
    if (!foes.length) return {error:"Choose a target."};
    const darts = m.darts + Math.max(0, slot - sp.l); const per = {};
    for (let i=0;i<darts;i++){ const t = foes[i % foes.length]; if (!isUp(c,t)) continue; const real = hurt(c, t, rollDice(m.each).total, m.t, {src: me.id}); per[t.name] = (per[t.name]||0) + real; }
    lines.push(`${darts} darts streak out: ${Object.entries(per).map(([k,v])=>`${k} takes ${v}`).join(", ")}.`);
  } else if (m.k === "heal"){
    const lifeB = subMods(ch).lifeHeal ? 2 + Math.max(1,slot) : 0;
    const tg = m.party ? party(c).filter(p=>!isDeadCb(c,p) && !p.fled) : [allyCb && !isDeadCb(c, allyCb) ? allyCb : me];
    const up = m.up && slot > sp.l ? `${parseDice(m.up)[0].n*(slot-sp.l)}d${parseDice(m.up)[0].sides}` : "";
    const expr = joinExpr(m.heal, up, m.mod ? Math.max(0, ci.mod) : 0, lifeB);
    for (const t of tg){ const h = healCb(c, t, rollDice(expr).total); lines.push(`${t.name} regains ${h} HP.`); }
    partyBark(c, ch, "heal", 0.3);
  } else if (m.k === "cond"){
    if (m.pool){
      let pool = rollDice(joinExpr(m.pool, slot > 1 ? `${2*(slot-1)}d8` : "")).total; const slept = [];
      for (const t of enemies(c).filter(e=>isUp(c,e) && e.type !== "undead").sort((a,b)=>a.hp-b.hp)){ if (t.hp > pool) break; pool -= t.hp; addC(c, t, "asleep", {rounds: 10, endsOnDamage: true}); slept.push(t.name); }
      lines.push(slept.length ? `${slept.join(", ")} slump${slept.length===1?"s":""} into magical sleep.` : "The foes are too hardy; nothing sleeps.");
    } else {
      if (!foes.length) return {error:"Choose a target."};
      const out = [];
      for (const t of foes.slice(0, m.tgt || 1)){
        if (m.humanoid && t.type !== "humanoid"){ out.push(`${t.name} is unaffected (not humanoid)`); continue; }
        const sv = d(20) + (t.mods?.[m.save]||0) + (t.boss ? 2 : 0); const ok = sv >= ci.dc;
        if (!ok){ addC(c, t, m.cond, { rounds: m.rounds || 10, src, save: m.repeat ? m.save : null, dc: m.repeat ? ci.dc : null, endsOnDamage: !!m.endsOnDamage }); out.push(`${t.name} is ${m.cond} (${sv})`); }
        else out.push(`${t.name} resists (${sv})`);
      }
      lines.push(`DC ${ci.dc} ${m.save}: ${out.join("; ")}.`);
    }
  } else if (m.k === "buff"){
    const rounds = m.rounds || null;
    if (m.mark){ const t = foes[0] || enemies(c).find(e=>isUp(c,e)); if (!t) return {error:"Choose a target."}; addC(c, t, m.buff, {by: me.id, src}); lines.push(`${t.name} is marked.`); }
    else if (m.buff === "agathys"){ const amt = 5 * Math.max(1,slot); ch.tempHp = Math.max(ch.tempHp||0, amt); addCond(ch, "agathys", {amount: amt}); lines.push(`Frost armor: ${amt} temporary HP.`); }
    else if (m.buff === "aid"){ for (const h of heroes(c).filter(h=>isUp(c,h))){ const hc = cbChar(c,h); if (!hasCond(hc,"aid")){ addCond(hc, "aid", {long:true}); hc.hp += 5; } } lines.push("The party's vitality swells (+5 max HP)."); }
    else if (m.party){ for (const p of party(c).filter(p=>isUp(c,p))) addC(c, p, m.buff, {rounds, src}); lines.push(`The party is ${m.buff}.`); }
    else { const t = allyCb && allyCb.kind === "pc" && isUp(c, allyCb) && ["shield-of-faith","heroism","haste","hasted","barkskin","greater-invisible","invisible","stoneskin","death-ward","blurred"].some(b => b === m.buff) ? cbChar(c, allyCb) : ch; addCond(t, m.buff, {rounds, src, long: !!m.long}); lines.push(`${t.name}: ${COND_INFO[m.buff]?.[1] || "empowered"}`); }
  } else if (m.k === "zone"){
    if (!m.all && !foes.length) return {error:"Choose a target."};
    const z = { id: uid("z"), spell: sp.n, all: !!m.all, targets: foes.slice(0, m.tgt||1).map(f=>f.id), dmg: spellDice(ch, sp, slot), t: m.t, save: m.save || null, dc: ci.dc, half: !!m.half, src, owner: me.id };
    cm.zones.push(z);
    const hitList = m.all ? enemies(c).filter(e=>isUp(c,e)) : z.targets.map(id=>cm.cbt[id]);
    const out = []; for (const t of hitList){ const amt = rollDice(z.dmg).total; let dealt = amt; if (z.save && d(20)+(t.mods?.[z.save]||0) >= z.dc) dealt = z.half ? Math.floor(amt/2) : 0; const real = dealt ? hurt(c, t, dealt, z.t, {src: me.id}) : 0; out.push(`${t.name} ${real}`); }
    lines.push(`It strikes at once: ${out.join(", ")}. It keeps burning each round.`);
  } else if (m.k === "summon"){
    const tpl = SUMMONS[m.what]; for (let i=0;i<m.count;i++){ const id = uid("s"); cm.cbt[id] = { id, side:"party", kind:"comp", summoned:true, src, owner: me.id, rounds: m.rounds, name: `${m.what} ${i+1}`, hp: tpl.hp, maxHp: tpl.hp, ac: tpl.ac, atk:[tpl.atk], conds:[], mods:{DEX:2}, pos:"front" }; const at = cm.order.indexOf(me.id); cm.order.splice(at+1+i, 0, id); }
    lines.push(`${m.count} ${m.what}s answer the call.`);
  } else if (m.k === "weapon"){
    const dice = joinExpr(`${1 + Math.floor(Math.max(0, slot-2)/2)}d8`, Math.max(0, ci.mod));
    me.sw = { rounds: m.rounds, dmg: dice, t: m.t, toHit: ci.atk };
    const t = foes[0] || enemies(c).find(e=>isUp(c,e));
    if (t){ const a = {name:"Spiritual Weapon", toHit: ci.atk, dmg: dice, t: m.t, melee:false, spell:true}; const r = resolveAttack(c, me, t, a); lines.push(attackText(me, t, a, r)); }
  } else if (m.k === "smite"){ pt.branding = { dmg: m.dmg, t: m.t }; lines.push("A weapon glows; the next hit will blaze."); }
  else if (m.k === "restore"){ const t = allyCb && allyCb.kind === "pc" ? cbChar(c, allyCb) : ch; const bad = ["poisoned","blinded","paralyzed","frightened","stunned","charmed","restrained","exhausted"]; const had = t.conditions.filter(x=>bad.includes(x.name)); t.conditions = t.conditions.filter(x=>!bad.includes(x.name) || (!m.all && had.indexOf(x) > 0)); lines.push(had.length ? `${t.name} is cured of ${m.all?had.map(x=>x.name).join(", "):had[0].name}.` : "Nothing to cure."); }
  else if (m.k === "berry"){ addItem(ch, makeItem({name:"Goodberry", type:"potion", heal:"1", qty:10, value:0})); lines.push("Ten glowing berries appear."); }
  if (sp.n === "Misty Step" || sp.n === "Dimension Door"){ addCond(ch, "misty", {rounds: 1}); me.pos = "back"; }
  if (subMods(ch).wildMagic && slot > 0 && d(20) === 1) lines.push(wildSurge(c, me));
  clog(c, "party", lines.join(" "));
  return { overlay };
}
function wildSurge(c, me){
  const ch = cbChar(c, me);
  const opts = [
    () => { const h = healCb(c, me, rollDice("2d10").total); return `Wild Magic! A warm light heals ${ch.name} for ${h}.`; },
    () => { addCond(ch, "blurred", {rounds:3}); return `Wild Magic! ${ch.name} flickers like a mirage.`; },
    () => { const x = rollDice("1d10").total; ch.hp = Math.max(1, ch.hp - x); return `Wild Magic! Sparks lash back for ${x}.`; },
    () => { for (const e of enemies(c).filter(e=>isUp(c,e))) hurt(c, e, rollDice("1d6").total, "fire", {src: me.id}); return "Wild Magic! Flames burst out, singeing every foe."; },
    () => { ch.tempHp = Math.max(ch.tempHp||0, 8); return `Wild Magic! ${ch.name}'s skin turns hard as crystal (8 temp HP).`; },
    () => { const t = enemies(c).find(e=>isUp(c,e)); if (t) addC(c, t, "blinded", {rounds:1}); return "Wild Magic! A flash of color blinds a foe."; }
  ];
  return pick(opts)();
}
function combatAbilities(c){
  const ch = actorCh(c), me = actorCb(c); if (!ch) return [];
  const cm = c.combat, pt = cm.pt, sm = subMods(ch), L = ch.level, out = [];
  const A = (key, name, cost, desc, ok, extra={}) => out.push({key, name, cost, desc, disabled: ok === true ? null : ok || null, ...extra});
  const act = pt.action ? true : "Action spent.", bon = pt.bonus ? true : "Bonus action spent.";
  const res = (k) => resLeft(ch,k) ? true : "None left.";
  const both = (...xs) => xs.find(x => x !== true) || true;
  if (ch.cls==="Fighter"){ A("secondWind","Second Wind","bonus",`Regain 1d10+${L} HP.`, both(bon,res("secondWind")));
    if (L>=2) A("actionSurge","Action Surge","free","Take one more action this turn.", pt.action ? "You still have your action." : both(res("actionSurge"), pt.surged ? "Already surged." : true));
    if (sm.battleDice) A("maneuver", pt.maneuver ? "Superiority die armed" : "Arm superiority die","free","Your next hit adds 1d8 damage.", both(res("superiority"), pt.maneuver ? "Already armed." : true)); }
  if (ch.cls==="Barbarian"){ A("rage", hasCond(ch,"raging") ? "Raging" : "Rage","bonus","+2 melee damage, resist physical damage, 10 rounds.", hasCond(ch,"raging") ? "Already raging." : both(bon,res("rage")));
    if (L>=2) A("reckless", hasCond(ch,"reckless") ? "Reckless (on)" : "Reckless Attack","free","Advantage on your melee attacks this turn; foes gain advantage on you.", hasCond(ch,"reckless") ? "Already reckless." : true);
    if (sm.frenzy) A("frenzy","Frenzied Strike","bonus","One extra weapon attack while raging.", both(bon, hasCond(ch,"raging") ? true : "Only while raging."), {needsTarget:true}); }
  if (ch.cls==="Rogue" && L>=2){ A("cDash","Cunning Action: Dash","bonus","Extra movement; advantage on escaping.", bon); A("cDisengage","Cunning Action: Disengage","bonus","Move or flee without opportunity attacks.", bon); A("cHide","Cunning Action: Hide","bonus","Stealth vs their perception: advantage on your next attack.", bon); }
  if (ch.cls==="Monk"){ A("martial","Martial Arts strike","bonus","One unarmed strike after you attack.", both(bon, pt.attackAction ? true : "Attack first."), {needsTarget:true});
    if (L>=2){ A("flurry","Flurry of Blows (1 ki)","bonus","Two unarmed strikes after you attack.", both(bon, res("ki"), pt.attackAction ? true : "Attack first."), {needsTarget:true}); A("patient","Patient Defense (1 ki)","bonus","Dodge as a bonus action.", both(bon,res("ki"))); A("step","Step of the Wind (1 ki)","bonus","Disengage and dash.", both(bon,res("ki"))); }
    if (L>=5) A("stun", pt.stun ? "Stunning Strike armed" : "Arm Stunning Strike","free","Your next melee hit spends 1 ki to try to stun.", both(res("ki"), pt.stun ? "Already armed." : true));
    if (sm.shadowArts) A("cHide","Shadow Step","bonus","Melt into shadow: advantage on your next attack.", bon); }
  if (ch.cls==="Paladin"){ A("layOnHands",`Lay on Hands (${resLeft(ch,"layOnHands")} left)`,"action","Heal yourself or the selected ally from your pool.", both(act, res("layOnHands")), {allyTarget:true});
    if (L>=2) A("smite", pt.smite ? "Divine Smite armed" : "Arm Divine Smite","free","Your next melee hit spends a spell slot for radiant damage.", pt.smite ? "Already armed." : lowestSlot(ch,1) ? true : "No slots.");
    if (sm.sacredWeapon) A("sacred","Sacred Weapon","action","Add CHA to attack rolls for 10 rounds.", both(act,res("channel")));
    if (sm.vowEnmity) A("vow","Vow of Enmity","bonus","Advantage on attacks against one foe.", both(bon,res("channel")), {needsTarget:true}); }
  if (ch.cls==="Cleric"){ if (L>=2) A("turn","Turn Undead","action","Undead must make a WIS save or flee in terror.", both(act,res("channel")));
    if (sm.warPriest) A("warpriest","War Priest strike","bonus","One extra weapon attack.", both(bon,res("warPriest")), {needsTarget:true}); }
  if (ch.cls==="Druid" && L>=2){ if (!hasCond(ch,"wildshape")) A("wild","Wild Shape", sm.moon ? "bonus" : "action", sm.moon ? "Become a dire beast (lots of temp HP, hard hits)." : "Become a wolf or bear (temp HP, natural attacks).", both(sm.moon ? bon : act, res("wildshape")));
    else A("revert","Revert to normal form","bonus","Leave beast form.", bon); }
  if (ch.cls==="Bard") A("inspire","Bardic Inspiration","bonus","Grant a die to the selected ally's (or your own) next attack.", both(bon,res("inspiration")), {allyTarget:true});
  if (ch.cls==="Sorcerer" && L>=2){
    for (const [l,cost] of [[1,2],[2,3],[3,5]]) if (slotMax(ch)[l] && (ch.slotsUsed[l]||0) > 0) A("font"+l, `Create level ${l} slot (${cost} SP)`,"bonus","Turn sorcery points into a spell slot.", both(bon, resLeft(ch,"sorcery") >= cost ? true : "Not enough points."), {slot:l, cost});
    if (L>=3) A("quicken", S().combatUI.quicken ? "Quickened Spell (on)" : "Quickened Spell","free","Your next action spell costs a bonus action (2 SP).", resLeft(ch,"sorcery") >= 2 ? true : "Not enough points."); }
  if (sm.feyPresence) A("fey","Fey Presence","action","All foes: WIS save or charmed for a round.", both(act,res("fey")));
  if (ch.race==="Dragonborn") A("breath","Breath Weapon","action",`${L>=6?3:2}d6 ${DRAGON_TYPES[ch.dragonType]||"fire"} to up to 3 foes (save for half).`, both(act,res("breath")));
  if (me.sw) A("sw","Spiritual Weapon","bonus",`${me.sw.dmg} force, ${me.sw.rounds} rounds left.`, bon, {needsTarget:true});
  const main = ch.equipped?.mainHand && invItem(ch, ch.equipped.mainHand), off = ch.equipped?.offHand && invItem(ch, ch.equipped.offHand);
  if (main?.weapon?.props.includes("light") && off?.weapon) A("offhand","Off-hand attack","bonus","Strike with your off-hand weapon.", both(bon, pt.attackAction ? true : "Attack first."), {needsTarget:true});
  if ((ch.feats||[]).includes("Lucky")) A("luck", pt.luck ? "Luck armed" : `Spend luck (${resLeft(ch,"luck")})`,"free","Your next attack roll has advantage.", pt.luck ? "Already armed." : res("luck"));
  if (ch.inspiration) A("heroic", "Spend Inspiration","free","Your next attack roll has advantage.", true);
  return out;
}
function doAbility(c, key, targetId){
  const ch = actorCh(c), me = actorCb(c); if (!ch) return {error:"Not a hero's turn."};
  const cm = c.combat, pt = cm.pt, L = ch.level;
  const ab = combatAbilities(c).find(a => a.key === key); if (!ab) return {error:"Not available."}; if (ab.disabled) return {error: ab.disabled};
  const tgt = targetId ? cm.cbt[targetId] : null;
  if (ab.needsTarget && !(tgt && isUp(c, tgt) && tgt.side === "enemy")) return {error:"Pick an enemy first."};
  const say = t => clog(c, "party", t);
  const weaponFor = (t) => weaponAttacks(ch).filter(w => !w.stowed && !w.offhand && w.id !== "unarmed").find(w => !w.melee || canReach(c, me, t, true)) || weaponAttacks(ch).find(w => w.id === "unarmed");
  const unarmed = () => weaponAttacks(ch).find(w => w.id === "unarmed");
  const strike = (a, label, o={}) => { if (a.melee && !canReach(c, me, tgt, true)){ say(`${tgt.name} is out of reach.`); return null; } const r = resolveAttack(c, me, tgt, a, o); say(`${label ? label + ": " : ""}${attackText(me, tgt, a, r)}`); return r; };
  if (ab.needsTarget && ["frenzy","martial","flurry","warpriest","offhand"].includes(key) && !canReach(c, me, tgt, true) && key !== "warpriest") return {error:`${tgt.name} is out of melee reach.`};
  if (ab.cost === "bonus") pt.bonus = 0; if (ab.cost === "action") pt.action = 0;
  switch (key){
    case "secondWind": { useRes(ch,"secondWind"); const h = healCb(c, me, rollDice(`1d10+${L}`).total); say(`${B(ch.name)} catches a second wind: +${h} HP.`); break; }
    case "actionSurge": { useRes(ch,"actionSurge"); pt.action = 1; pt.surged = true; pt.attacksLeft = 0; say(`${B(ch.name)} surges with renewed vigor (extra action)!`); break; }
    case "maneuver": pt.maneuver = true; say(`${ch.name} readies a combat maneuver.`); break;
    case "rage": useRes(ch,"rage"); addCond(ch,"raging",{rounds:10}); say(`${B(ch.name)} flies into a RAGE!`); partyBark(c, ch, "rage", 0.6); break;
    case "reckless": addCond(ch,"reckless",{}); say(`${B(ch.name)} attacks with reckless abandon.`); break;
    case "frenzy": strike(weaponFor(tgt), "Frenzy"); break;
    case "cDash": pt.dashed = true; pt.move += 1; say(`${ch.name} darts about, ready to move.`); break;
    case "cDisengage": pt.disengaged = true; say(`${ch.name} slips out of reach.`); break;
    case "cHide": { const pp = Math.max(10, ...enemies(c).filter(e=>isUp(c,e)).map(e=>e.pp||10)); const r = d(20) + skillMod(ch,"Stealth"); if (r >= pp || subMods(ch).shadowArts){ addCond(ch,"hidden",{}); say(`${ch.name} vanishes into cover (Stealth ${r} vs ${pp}).`); } else say(`${ch.name} tries to hide but is spotted (Stealth ${r} vs ${pp}).`); break; }
    case "martial": strike(unarmed(), "Martial Arts"); break;
    case "flurry": useRes(ch,"ki"); for (let i=0;i<2;i++){ if (!isUp(c,tgt)) break; strike(unarmed(), "Flurry", {openHand:true}); } break;
    case "patient": useRes(ch,"ki"); addCond(ch,"dodging",{}); say(`${ch.name} falls into a patient, flowing defense.`); break;
    case "step": useRes(ch,"ki"); pt.disengaged = true; pt.dashed = true; pt.move += 1; say(`${ch.name} moves like the wind.`); break;
    case "stun": pt.stun = true; say(`${ch.name} focuses ki into their fists.`); break;
    case "layOnHands": { const t = tgt && tgt.side === "party" ? tgt : me; const need = maxHpOf(c,t) - Math.max(0,hpOf(c,t)); const amt = Math.min(resLeft(ch,"layOnHands"), Math.max(1, need)); useRes(ch,"layOnHands", amt); const h = healCb(c, t, amt); say(`${B(ch.name)} lays on hands: ${t.name} regains ${h} HP.`); break; }
    case "smite": pt.smite = true; say(`Holy light gathers along ${ch.name}'s weapon.`); break;
    case "sacred": useRes(ch,"channel"); addCond(ch,"sacred-weapon",{rounds:10}); say(`${ch.name}'s weapon blazes with sacred light.`); break;
    case "vow": useRes(ch,"channel"); addC(c, tgt, "vow", {rounds:10, by: me.id}); say(`${ch.name} swears a vow of enmity against ${B(tgt.name)}.`); break;
    case "turn": { useRes(ch,"channel"); const dc = castInfo(ch).dc; const und = enemies(c).filter(e=>isUp(c,e) && e.type==="undead"); if (!und.length){ say(`${ch.name} brandishes a holy symbol, but no undead are here.`); break; }
      const out = und.map(e => { const ok = d(20) + (e.mods?.WIS||0) + (e.boss?3:0) >= dc; if (!ok){ if (L>=5 && e.xp <= 100){ e.hp = 0; e.dead = true; c.combat.kills.push(e.id); return `${e.name} crumbles to dust`; } addC(c, e, "turned", {rounds:10, endsOnDamage:true}); return `${e.name} is turned`; } return `${e.name} resists`; });
      say(`${B(ch.name)} presents the holy symbol! ${out.join("; ")}.`); break; }
    case "warpriest": useRes(ch,"warPriest"); strike(weaponFor(tgt), "War Priest"); break;
    case "wild": { useRes(ch,"wildshape"); const moon = subMods(ch).moon; const p = profBonus(L), wm = Math.max(mods(ch).WIS, mods(ch).STR);
      ch.wild = moon ? { form:"Dire Bear", ac:14, attack:"Maul & Claws", toHit: p + wm + 2, dmg:`2d8+${3+Math.floor(L/2)}`, t:"slashing" } : { form: L>=4 ? "Brown Bear" : "Wolf", ac:13, attack: L>=4 ? "Claws" : "Bite", toHit: p + wm, dmg:`2d6+${2+Math.floor(L/3)}`, t: L>=4?"slashing":"piercing" };
      ch.tempHp = Math.max(ch.tempHp||0, moon ? 5*L + 10 : 3*L + 8); addCond(ch,"wildshape",{}); me.pos = "front"; say(`${B(ch.name)} twists into the shape of a ${ch.wild.form} (${ch.tempHp} temp HP)!`); break; }
    case "revert": remCond(ch,"wildshape"); ch.tempHp = 0; ch.wild = null; say(`${ch.name} sheds beast form.`); break;
    case "inspire": { useRes(ch,"inspiration"); const die = L>=10?10:L>=5?8:6; const t = tgt && tgt.side==="party" ? tgt : me; addC(c, t, "inspired", {die}); say(`${B(ch.name)} inspires ${t.id===me.id?"themself":t.name} (d${die}).`); break; }
    case "quicken": store.set({combatUI:{...S().combatUI, quicken: !S().combatUI.quicken}}); return {};
    case "fey": { useRes(ch,"fey"); const dc = castInfo(ch).dc; const out = enemies(c).filter(e=>isUp(c,e)).map(e => { const ok = d(20)+(e.mods?.WIS||0) >= dc; if (!ok) addC(c, e, "charmed", {rounds:1}); return `${e.name} ${ok?"resists":"is charmed"}`; }); say(`Fey Presence: ${out.join("; ")}.`); break; }
    case "breath": { useRes(ch,"breath"); const t = DRAGON_TYPES[ch.dragonType]||"fire"; const save = ["cold","poison"].includes(t) ? "CON" : "DEX"; const dc = 8 + mods(ch).CON + profBonus(L); const dmg = rollDice(`${L>=6?3:2}d6`).total;
      const tg = (tgt && tgt.side==="enemy" ? [tgt] : []).concat(enemies(c).filter(e=>isUp(c,e) && e.id!==targetId)).filter(Boolean).slice(0,3);
      const out = tg.map(e => { const ok = d(20)+(e.mods?.[save]||0) >= dc; const real = hurt(c, e, ok?Math.floor(dmg/2):dmg, t, {src: me.id}); return `${e.name} ${real}`; }); say(`${B(ch.name)} exhales ${t}! ${out.join(", ")}.`); break; }
    case "sw": { const a = {name:"Spiritual Weapon", toHit: me.sw.toHit, dmg: me.sw.dmg, t: me.sw.t, melee:false, spell:true}; strike(a, ""); break; }
    case "offhand": { const w = weaponAttacks(ch).find(x=>x.offhand); if (w) strike(w, ""); break; }
    case "luck": pt.luck = true; say(`${ch.name} feels lucky.`); break;
    case "heroic": ch.inspiration = false; addCond(ch, "hidden", {}); say(`${ch.name} steels themself for a perfect strike (advantage).`); break;
    default: if (key.startsWith("font")){ useRes(ch,"sorcery", ab.cost); ch.slotsUsed[ab.slot] = Math.max(0, (ch.slotsUsed[ab.slot]||0) - 1); say(`${ch.name} shapes raw sorcery into a level ${ab.slot} spell slot.`); }
  }
  return {};
}
function doBasic(c, kind, targetId){
  const ch = actorCh(c), me = actorCb(c), cm = c.combat, pt = cm.pt; if (!ch) return {error:"Not a hero's turn."};
  if (!pt.action) return {error:"Your action is spent."};
  if (kind === "dodge"){ pt.action = 0; addCond(ch,"dodging",{}); clog(c,"party",`${B(ch.name)} takes the Dodge action.`); }
  if (kind === "dash"){ pt.action = 0; pt.dashed = true; pt.move += 1; clog(c,"party",`${B(ch.name)} dashes.`); }
  if (kind === "disengage"){ pt.action = 0; pt.disengaged = true; clog(c,"party",`${B(ch.name)} disengages carefully.`); }
  if (kind === "hide"){ pt.action = 0; const pp = Math.max(10, ...enemies(c).filter(e=>isUp(c,e)).map(e=>e.pp||10)); const r = d(20) + skillMod(ch,"Stealth"); if (r >= pp){ addCond(ch,"hidden",{}); clog(c,"party",`${B(ch.name)} hides (Stealth ${r} vs ${pp}).`); } else clog(c,"party",`${B(ch.name)} fails to hide (Stealth ${r} vs ${pp}).`); }
  if (kind === "help"){ const t = cm.cbt[targetId]; if (!t || t.side !== "party" || t.id === me.id || !isUp(c, t)) return {error:"Choose an ally to help."}; pt.action = 0; addC(c, t, "helped", {}); clog(c,"party",`${B(ch.name)} creates an opening for ${B(t.name)} (advantage on its next attack).`); }
  if (kind === "stabilize"){ const t = cm.cbt[targetId]; const tc = cbChar(c, t); if (!tc || tc.hp > 0 || tc.dead) return {error:"Choose a dying ally."}; pt.action = 0; const kit = ch.inventory.some(i=>/Healer's Kit/.test(i.name)); const r = d(20) + skillMod(ch,"Medicine"); if (kit || r >= 10){ addCond(tc,"stable"); tc.deathSaves = {s:0,f:0}; clog(c,"party",`${B(ch.name)} stabilizes ${B(tc.name)}${kit?" with a healer's kit":` (Medicine ${r})`}.`); } else clog(c,"party",`${B(ch.name)} fails to stabilize ${tc.name} (Medicine ${r}).`); }
  return {};
}
function doMove(c){
  const ch = actorCh(c), me = actorCb(c), pt = c.combat.pt; if (!ch) return {error:"Not a hero's turn."};
  if (!pt.move) return {error:"No movement left this turn (Dash for more)."};
  pt.move--; const to = me.pos === "front" ? "back" : "front";
  if (to === "back" && !pt.disengaged && !hasCond(ch,"misty")){
    const threats = enemies(c).filter(e => canAct(c, e) && e.pos === "front" && e.atk.some(a => !a.ranged));
    if (threats.length){ const e = pick(threats); const a = e.atk.find(x=>!x.ranged); const r = resolveAttack(c, e, me, {...a, melee:true}); clog(c,"enemy",`Opportunity attack! ${attackText(e, me, a, r)}`); }
  }
  if (isUp(c, me)){ me.pos = to; clog(c,"party",`${B(ch.name)} moves to the ${to} line.`); }
  return {};
}
function doRunAway(c){
  const ch = actorCh(c), me = actorCb(c), cm = c.combat, pt = cm.pt; if (!ch) return {error:"Not a hero's turn."};
  const free = pt.disengaged || hasCond(ch,"misty");
  if (!free){ for (const e of enemies(c).filter(e => canAct(c, e) && e.pos === "front").slice(0,3)){ const a = e.atk.find(x=>!x.ranged) || e.atk[0]; const r = resolveAttack(c, e, me, {...a, melee:true}); clog(c,"enemy",`Parting blow! ${attackText(e, me, a, r)}`); if (ch.hp <= 0) return {}; } }
  const foes = enemies(c).filter(e => canAct(c, e)).length; const dc = 8 + 2*foes;
  const sk = skillMod(ch,"Athletics") >= skillMod(ch,"Acrobatics") ? "Athletics" : "Acrobatics";
  const r = free ? {kept: 20} : rollD20({adv: pt.dashed}); const tot = r.kept + skillMod(ch, sk);
  if (free || tot >= dc){ clog(c,"party",`${B(ch.name)} breaks away and the party retreats${free?"":` (${sk} ${tot} vs DC ${dc})`}!`); finishCombat(c, "fled"); }
  else { pt.action = 0; clog(c,"party",`${B(ch.name)} tries to pull the party out but is cut off (${sk} ${tot} vs DC ${dc}).`); return {endTurn:true}; }
  return {};
}
function doUseItem(c, itemId, targetId){
  const ch = actorCh(c), me = actorCb(c), cm = c.combat, pt = cm.pt; if (!ch) return {error:"Not a hero's turn."};
  const item = invItem(ch, itemId); if (!item) return {error:"Item not found."};
  if (item.type === "scroll"){ const sp = SPELL[item.spell]; if (!sp) return {error:"The scroll's magic is unclear."}; return doCast(c, sp.n, {fromScroll:true, itemId, targets: targetId ? [targetId, ...enemies(c).filter(e=>isUp(c,e) && e.id!==targetId).map(e=>e.id)].slice(0, sp.m.tgt||1) : enemies(c).filter(e=>isUp(c,e)).map(e=>e.id).slice(0, sp.m.tgt||1), allyId: targetId}); }
  if (item.type !== "potion") return {error:"Only potions and scrolls can be used in combat (try Custom)."};
  if (!pt.bonus) return {error:"Drinking a potion takes a bonus action."}; pt.bonus = 0;
  const t = targetId && cm.cbt[targetId]?.side === "party" && !isDeadCb(c, cm.cbt[targetId]) ? cm.cbt[targetId] : me;
  item.qty--; if (item.qty <= 0) dropItem(ch, item.id);
  const parts = [];
  if (item.heal){ const h = healCb(c, t, rollDice(item.heal).total); parts.push(`${t.name} regains ${h} HP`); }
  if (item.cures){ remC(c, t, item.cures); parts.push(`no longer ${item.cures}`); }
  clog(c,"party",`${B(ch.name)} ${t.id===me.id?"drinks":"feeds "+t.name} ${item.name}: ${parts.join(", ")||"nothing obvious happens"}.`);
  return {};
}
function doDeathSave(c, cb){
  const ch = cbChar(c, cb); const r = rollD20({lucky: RACES[ch.race].lucky}); const nat = r.kept;
  if (nat === 20){ ch.hp = 1; ch.deathSaves = {s:0,f:0}; remCond(ch,"unconscious"); clog(c,"party",`${B(ch.name)} surges back to consciousness with 1 HP!`); return nat; }
  if (nat >= 10) ch.deathSaves.s++; else ch.deathSaves.f += nat === 1 ? 2 : 1;
  clog(c,"sys",`${ch.name} death save: ${nat} (${ch.deathSaves.s} successes, ${ch.deathSaves.f} failures).`);
  if (ch.deathSaves.f >= 3){ ch.dead = true; clog(c,"sys",`${ch.name} dies.`); }
  else if (ch.deathSaves.s >= 3){ addCond(ch,"stable"); clog(c,"sys",`${ch.name} is stable, but unconscious.`); }
  return nat;
}

// ---- player-facing wrappers (animate, then commit) ----
async function playerAct(fn){
  const cur = C(); if (!cur?.combat || cur.combat.status !== "active" || !isPlayerTurn(cur)) return;
  let c = structuredClone(cur); let fx = fn(c) || {};
  if (fx.error){ toast(fx.error, "bad"); return; }
  if (fx.overlay && manualDice() && !Coop.remoteRoll){
    await rollPrompt({ label: fx.overlay.label, sides: 20 });
    const now = C();
    if (now !== cur){ if (!now?.combat || now.combat.status !== "active" || !isPlayerTurn(now)) return; c = structuredClone(now); fx = fn(c) || {}; if (fx.error){ toast(fx.error, "bad"); return; } }
  }
  clog(c, "sys", "");
  if (fx.overlay && S().settings.diceAnim !== "off") await showRoll({...fx.overlay, quick: true});
  c.updatedAt = Date.now(); store.set({campaign: c}); scheduleSave();
  if (c.combat && c.combat.status === "active"){ if (!checkEndCommit() && fx.endTurn) endPlayerTurn(); }
}
function checkEndCommit(){ let ended = false; store.camp(c => { ended = checkEnd(c); }); return ended; }
function endPlayerTurn(){ store.camp(c => { if (c.combat?.status === "active" && isPlayerTurn(c)) advanceTurn(c); }); store.set({combatUI:{...S().combatUI, quicken:false}}); combatLoop(); }
function pcAttack(weaponId, targetId, opts={}){ return playerAct(c => doAttack(c, weaponId, targetId, opts)); }
function pcCast(spellName, o={}){ const sp = SPELL[spellName]; if (sp && sp.m.k === "utility" && sp.n !== "Revivify") return pcCustom(`${actorCh(C())?.name} casts ${sp.n}${o.slot?` using a level ${o.slot} slot`:""}: ${sp.d}`, {spell: sp, slot: o.slot, fromScroll: o.fromScroll, itemId: o.itemId}); return playerAct(c => doCast(c, spellName, o)); }
function pcAbility(key, targetId){ return playerAct(c => doAbility(c, key, targetId)); }
function pcBasic(kind, targetId){ return playerAct(c => doBasic(c, kind, targetId)); }
function pcMove(){ return playerAct(c => doMove(c)); }
function pcRunAway(){ return playerAct(c => doRunAway(c)); }
function pcUseItem(itemId, targetId){ const it = invItem(actorCh(C()), itemId); if (it && !["potion","scroll"].includes(it.type)) return pcCustom(`${actorCh(C()).name} uses the ${it.name}.`); return playerAct(c => doUseItem(c, itemId, targetId)); }
async function pcDeathSave(){
  if (manualDice() && !Coop.remoteRoll && isPlayerTurn(C())) await rollPrompt({ label: `${actorCh(C())?.name || "You"}: death saving throw`, sides: 20 });
  const c = C(); const cb = actorCb(c); const ch = cbChar(c, cb); if (!c?.combat || !ch || ch.hp > 0 || ch.dead) return;
  const cl = structuredClone(c); const nat = doDeathSave(cl, actorCb(cl));
  await showRoll({label:`${ch.name}: death saving throw`, dice:[{sides:20, values:[nat], kept:nat}], mod:0, total:nat, dc:10, success: nat>=10, crit: nat===20, fumble: nat===1});
  store.set({campaign: cl}); scheduleSave();
  if (!checkEndCommit()) endPlayerTurn();
}
async function pcCustom(text, o={}){
  const c0 = C(); if (!c0?.combat || !isPlayerTurn(c0)) return;
  if (o.spell){ const err = canCastNow(c0, o.spell, o); if (err) { toast(err, "bad"); return; } }
  if (!SAMPLE){ toast("Custom actions need the AI Dungeon Master (open in Claude).", "bad"); return; }
  if (S().busy) return;
  const ch = actorCh(c0); const cm = c0.combat;
  const prompt = `You are the Dungeon Master adjudicating ONE creative action in a turn-based 5e-style fight. Be fair and cinematic; reward creativity but keep effects proportionate: improvised damage 1d4 to 2d6 (environmental hazards up to 3d6), conditions like prone, restrained, blinded, frightened for 1-2 rounds; forcing surrender or escape needs a strong position and a hard check. Typical DC 10-15.
ACTING CHARACTER
${charSummary(ch)}
COMBAT (round ${cm.round}${cm.terrain?`, terrain: ${cm.terrain}`:""})
Party: ${party(c0).filter(p=>!p.fled).map(p=>`[${p.id}] ${p.name} ${p.pos} line, HP ${hpOf(c0,p)}/${maxHpOf(c0,p)}`).join("; ")}
Enemies: ${enemies(c0).filter(e=>isUp(c0,e)).map(e=>`[${e.id}] ${e.name} (${e.type}) ${e.pos} line, HP ${e.hp}/${e.maxHp} AC ${e.ac}${e.conds.length?` [${e.conds.map(x=>x.n).join(", ")}]`:""}`).join("; ")}
Recent: ${cm.log.slice(-5).map(l=>l.text.replace(/\*\*|_/g,"")).join(" | ")}
${o.spell ? `${ch.name} casts ${o.spell.n} (${o.spell.d}); its slot is spent. Decide how it works here.` : ""}
ACTION: "${text}"
Reply with only JSON:
{"cost":"action|bonus|free","narration":"1-2 sentences describing the attempt","roll":{"kind":"skill|ability|save|attack|none","skill":"Athletics","ability":"STR","dc":13},"success":{"text":"1-2 sentences","effects":[{"target":"enemy id | self | all_enemies","damage":"1d6","damage_type":"bludgeoning","condition":"prone","rounds":1,"heal":"","end_combat":null}]},"failure":{"text":"1-2 sentences","effects":[]}}
end_combat may be "surrender" (foes give up) or "escape" (the party gets away) when truly earned.`;
  store.set({busy:"combat"});
  let res;
  try { res = await askJSON(prompt, {tier: S().settings.tier === "complex" ? "default" : S().settings.tier}); }
  catch(e){ store.set({busy:null}); toast((window.__WEB__ && e?.message) || DM_ERR[e?.code] || "The DM couldn't rule on that. Try again.", "bad"); return; }
  store.set({busy:null});
  if (!res || typeof res !== "object"){ toast("The DM's ruling was unclear. Try rephrasing.", "bad"); return; }
  const roll = res.roll || {kind:"none"}; const kind = String(roll.kind||"none");
  let success = true, overlay = null;
  if (kind !== "none"){
    let mod = 0, dc = clamp(num(roll.dc, 12), 5, 25), label;
    const sk = Object.keys(SKILLS).find(k=>k.toLowerCase()===String(roll.skill||"").toLowerCase()); const ab = ABILS.includes(String(roll.ability).toUpperCase()) ? String(roll.ability).toUpperCase() : (sk ? SKILLS[sk] : "STR");
    if (kind === "attack"){ const w = weaponAttacks(ch)[0]; mod = o.spell ? (castInfo(ch)?.atk ?? w.toHit) : w.toHit; const tid = res.success?.effects?.[0]?.target; const t = c0.combat.cbt[tid]; if (t) dc = t.ac; label = "Attack roll"; }
    else if (kind === "save"){ mod = saveMod(ch, ab); label = `${ABIL_NAME[ab]} save`; }
    else if (sk){ mod = skillMod(ch, sk); label = `${sk} check`; } else { mod = mods(ch)[ab]; label = `${ABIL_NAME[ab]} check`; }
    const r = rollD20({lucky: RACES[ch.race].lucky}); const total = r.kept + mod; success = r.kept === 20 || (r.kept !== 1 && total >= dc);
    overlay = {label: `${ch.name}: ${label}`, dice:[{sides:20, values:r.rolls, kept:r.kept}], mod, total, dc, dcLabel: kind==="attack"?"AC":"DC", success, crit: r.kept===20, fumble: r.kept===1};
  }
  return playerAct(c => {
    const ch = actorCh(c), me = actorCb(c), cm = c.combat, pt = cm.pt;
    const cost = o.spell ? (o.spell.m.bonus ? "bonus" : "action") : ["bonus","free"].includes(res.cost) ? res.cost : "action";
    if (cost === "action"){ if (!pt.action) return {error:"The action is already used."}; pt.action = 0; }
    if (cost === "bonus"){ if (!pt.bonus) return {error:"The bonus action is already used."}; pt.bonus = 0; }
    if (o.spell && o.spell.l > 0){ if (o.fromScroll && o.itemId){ const it = invItem(ch, o.itemId); if (it){ it.qty--; if (it.qty<=0) dropItem(ch, it.id); } } else { const l = o.slot || lowestSlot(ch, o.spell.l); if (l) ch.slotsUsed[l] = (ch.slotsUsed[l]||0)+1; } }
    const branch = success ? res.success : res.failure; const lines = [];
    if (res.narration) lines.push(String(res.narration));
    if (overlay) lines.push(`(${overlay.label}: ${overlay.total} vs ${overlay.dcLabel} ${overlay.dc}, ${success?"success":"failure"})`);
    if (branch?.text) lines.push(String(branch.text));
    let end = null;
    for (const ef of (branch?.effects || []).slice(0,6)){
      const tg = ef.target === "all_enemies" ? enemies(c).filter(e=>isUp(c,e)) : (ef.target === "self" || ef.target === "pc") ? [me] : [cm.cbt[ef.target]].filter(Boolean);
      for (const t of tg){
        if (ef.damage){ const real = hurt(c, t, rollDice(String(ef.damage)).total, String(ef.damage_type||"bludgeoning").toLowerCase(), {src: me.id}); lines.push(`${t.name} takes ${real} damage.`); }
        if (ef.heal){ const h = healCb(c, t, rollDice(String(ef.heal)).total); lines.push(`${t.name} regains ${h} HP.`); }
        if (ef.condition && isUp(c, t)) addC(c, t, String(ef.condition).toLowerCase(), {rounds: clamp(num(ef.rounds,1),1,10)});
      }
      if (ef.end_combat === "surrender" || ef.end_combat === "escape") end = ef.end_combat;
    }
    clog(c, "party", `${B(ch.name)}: ${lines.join(" ")}`);
    if (end === "surrender"){ for (const e of enemies(c).filter(e=>isUp(c,e))) e.fled = true; finishCombat(c, "surrender"); }
    if (end === "escape") finishCombat(c, "fled");
    return { overlay };
  });
}
function startPractice(){
  const c = C(); if (!c) return; const members = partyMembers(c);
  const lvl = Math.round(members.reduce((a,m)=>a+m.level,0)/members.length);
  const theme = pick(Object.keys(THEMES)); const tier = lootTier(lvl);
  const enc = buildEncounter(THEMES[theme].pools[Math.min(3, tier)], encounterBudget(members, "medium"));
  startCombat({enemies: enc, terrain:"a practice ring of packed earth", surprise:"none"}, {sandbox:true});
}
</script>
