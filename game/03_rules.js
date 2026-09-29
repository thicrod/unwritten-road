<script>
"use strict";
// ======================= UTIL =======================
const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
const d = n => 1 + rnd(n);
const uid = (p="") => p + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-3);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const abMod = s => Math.floor(((+s||10) - 10) / 2);
const fmt = m => (m >= 0 ? "+" : "") + m;
const slug = s => String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || uid("x");
const pick = arr => arr[rnd(arr.length)];
const cap = s => String(s||"").charAt(0).toUpperCase() + String(s||"").slice(1);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = (v, def=0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

// ---- Dice ----
function parseDice(expr){
  const terms = []; const s = String(expr ?? "0").replace(/\s+/g,"").toLowerCase();
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g; let m;
  while ((m = re.exec(s))){
    if (m[3]) terms.push({sign: m[1]==="-"?-1:1, n: Math.min(60, +(m[2]||1)), sides: +m[3]});
    else if (m[5]) terms.push({sign: m[4]==="-"?-1:1, k: +m[5]});
  }
  return terms;
}
function rollDice(expr, o={}){
  const terms = parseDice(expr); let total = 0; const dice = []; let flat = 0;
  for (const t of terms){
    if (t.k != null){ flat += t.sign*t.k; continue; }
    const n = t.n * (o.crit ? 2 : 1) + (o.extraDie && t === terms.find(x=>x.sides) ? 1 : 0);
    for (let i=0;i<n;i++){
      let v = d(t.sides);
      if (o.gwf && v <= 2) v = d(t.sides);
      dice.push({sides:t.sides, v}); total += t.sign*v;
    }
  }
  total += flat;
  return { total: Math.max(0,total), dice, flat, expr: String(expr) };
}
const avgDice = expr => Math.floor(parseDice(expr).reduce((a,t)=> a + (t.k!=null ? t.sign*t.k : t.sign*t.n*(t.sides+1)/2), 0));
function rollD20(o={}){
  let a = d(20), b = d(20); const rer = [];
  if (o.lucky){ if (a===1){ rer.push(a); a=d(20);} if (b===1){ rer.push(b); b=d(20);} }
  const adv = o.adv && !o.dis, dis = o.dis && !o.adv;
  const kept = adv ? Math.max(a,b) : dis ? Math.min(a,b) : a;
  return { rolls: (adv||dis)?[a,b]:[a], kept, nat: kept, adv, dis, rerolled: rer };
}
function joinExpr(...parts){ return parts.filter(p=>p!==""&&p!=null&&p!==0).map(String).join("+").replace(/\+-/g,"-").replace(/\+\+/g,"+") || "0"; }

// ======================= ITEMS =======================
const SLOTS = ["mainHand","offHand","armor","head","cloak","hands","feet","amulet","ring1","ring2"];
const SLOT_LABEL = {mainHand:"Main hand",offHand:"Off hand",armor:"Armor",head:"Head",cloak:"Cloak",hands:"Hands",feet:"Feet",amulet:"Neck",ring1:"Ring",ring2:"Ring"};
function catalogFind(name){
  const n = String(name||"").trim();
  const exact = k => Object.keys(k).find(x => x.toLowerCase() === n.toLowerCase());
  let k;
  if ((k = exact(WEAPONS))) return {kind:"weapon", key:k};
  if ((k = exact(ARMORS))) return {kind:"armor", key:k};
  if (/^shield$/i.test(n)) return {kind:"shield", key:"Shield"};
  if ((k = exact(POTIONS))) return {kind:"potion", key:k};
  if ((k = exact(GEAR))) return {kind:"gear", key:k};
  return null;
}
function fuzzyBase(name, table){
  const low = String(name||"").toLowerCase();
  return Object.keys(table).sort((a,b)=>b.length-a.length).find(k => low.includes(k.toLowerCase().replace(/ armor$/,"")));
}
function makeItem(spec){
  if (typeof spec === "string"){
    let name = spec.trim(), qty = 1; const mm = name.match(/^(.*?)\s*[x×]\s*(\d+)$/i); if (mm){ name = mm[1]; qty = +mm[2]; }
    spec = {name, qty};
  }
  const s = spec || {}; const name = String(s.name || s.base || "Curious Trinket").slice(0,60);
  const it = { id: uid("i"), name, qty: clamp(Math.round(num(s.qty ?? s.quantity,1)),1,999), value: num(s.value ?? s.price, 0),
    rarity: String(s.rarity||"common").toLowerCase().replace(/\s+/g,""), desc: String(s.description||s.desc||"").slice(0,300), type: String(s.type||"").toLowerCase(), magic: !!s.magic };
  const cat = catalogFind(s.base || name) || catalogFind(name);
  let wKey = cat?.kind==="weapon" ? cat.key : null, aKey = cat?.kind==="armor" ? cat.key : null;
  const t = it.type;
  if (!cat){
    if (t==="weapon" || (!t && s.damage)) wKey = fuzzyBase(s.base||name, WEAPONS);
    if (t==="armor") aKey = fuzzyBase(s.base||name, ARMORS);
  }
  const bonus = clamp(Math.round(num(s.bonus ?? s.magic_bonus, 0)),0,3);
  if (wKey || t==="weapon"){
    const w = WEAPONS[wKey] || null;
    const props = Array.isArray(s.properties) ? s.properties.map(p=>String(p).toLowerCase()) : (w ? w[2] : []);
    it.type = "weapon"; it.slot = "mainHand";
    it.weapon = { dmg: String(s.damage || (w&&w[0]) || "1d6").replace(/\s/g,""), t: String(s.damage_type || (w&&w[1]) || "slashing").toLowerCase(), props, cat: w ? w[4] : (s.category||"martial"), base: wKey || null, bonus,
      extra: s.extra_damage ? {dmg:String(s.extra_damage), t:String(s.extra_damage_type||"fire").toLowerCase()} : null };
    if (!it.value && w) it.value = w[3];
  } else if (aKey || t==="armor"){
    const a = ARMORS[aKey] || null;
    it.type = "armor"; it.slot = "armor";
    it.armor = { kind: String(s.armor || (a&&a[0]) || "light").toLowerCase(), base: clamp(num(s.ac, a?a[1]:11),10,20) + bonus, str: a?a[3]:0, stealthDis: a?!!a[4]:false };
    if (!it.value && a) it.value = a[2];
  } else if (cat?.kind==="shield" || t==="shield"){
    it.type = "shield"; it.slot = "offHand"; it.acBonus = 2 + bonus; if (!it.value) it.value = 10;
  } else if (cat?.kind==="potion" || t==="potion"){
    it.type = "potion"; const p = POTIONS[cat?.key] || {};
    it.heal = s.heal || p.heal || null; if (s.cures) it.cures = String(s.cures).toLowerCase();
    if (!it.value) it.value = p.value || 50; if (p.rarity && it.rarity==="common") it.rarity = p.rarity;
    if (/antitoxin/i.test(name)) it.cures = "poisoned";
  } else if (t==="scroll" || /^scroll of /i.test(name)){
    it.type = "scroll"; const sp = s.spell || name.replace(/^scroll of\s+/i,"");
    const found = SPELLS.find(x=>x.n.toLowerCase()===String(sp).toLowerCase());
    it.spell = found ? found.n : String(sp); it.spellLevel = found ? Math.max(found.l,1) : clamp(num(s.level,1),1,5);
    if (!it.value) it.value = 25 * it.spellLevel * it.spellLevel;
  } else if (cat?.kind==="gear"){
    const g = GEAR[cat.key]; it.type = g[0]==="potion" ? "potion" : g[0]; if (!it.desc) it.desc = g[2]; if (!it.value) it.value = g[1];
    if (/antitoxin/i.test(name)) it.cures = "poisoned";
  } else {
    it.type = ["ring","amulet","cloak","wondrous","quest","gear","treasure","key","food","tool","book","focus","gem"].includes(t) ? t : (t||"gear");
  }
  if (s.slot && SLOTS.concat(["ring"]).includes(s.slot)) it.slot = s.slot === "ring" ? "ring1" : s.slot;
  if (!it.slot){
    if (it.type==="ring") it.slot = "ring1"; else if (it.type==="amulet") it.slot = "amulet"; else if (it.type==="cloak") it.slot = "cloak";
    else if (it.type==="wondrous"){
      const low = name.toLowerCase();
      it.slot = /helm|hat|circlet|crown|hood|headband/.test(low) ? "head" : /boot|slipper|shoe/.test(low) ? "feet" : /glove|gauntlet|bracer/.test(low) ? "hands" : /cloak|cape|mantle/.test(low) ? "cloak" : /amulet|necklace|pendant|periapt|medallion/.test(low) ? "amulet" : /ring/.test(low) ? "ring1" : null;
    }
  }
  if (s.ac_bonus && it.type!=="shield") it.acBonus = clamp(num(s.ac_bonus,0),0,3);
  if (s.ability_bonus && typeof s.ability_bonus==="object"){ it.abilityBonus = {}; for (const k of ABILS){ const v = num(s.ability_bonus[k]||s.ability_bonus[ABIL_NAME[k]],0); if (v) it.abilityBonus[k]=clamp(v,-2,4);} }
  if (s.ability_set && typeof s.ability_set==="object"){ it.abilitySet = {}; for (const k of ABILS){ const v = num(s.ability_set[k],0); if (v) it.abilitySet[k]=clamp(v,10,23);} }
  if (s.save_bonus) it.saveBonus = clamp(num(s.save_bonus,0),0,3);
  if (s.spell_attack_bonus) it.spellBonus = clamp(num(s.spell_attack_bonus,0),0,3);
  if (Array.isArray(s.resist)) it.resist = s.resist.map(x=>String(x).toLowerCase()).slice(0,4);
  if (bonus || it.acBonus || it.abilityBonus || it.saveBonus || it.spellBonus || it.resist || ["uncommon","rare","veryrare","legendary"].includes(it.rarity)) it.magic = true;
  if (bonus && !/\+\d/.test(it.name)) it.name = `${it.name} +${bonus}`;
  if (s.quest || it.type==="quest") it.quest = true;
  return it;
}
const itemIcon = it => ({weapon: it.weapon && it.weapon.props.includes("ranged") ? "bow" : "sword", armor:"armor", shield:"shield", potion:"potion", scroll:"scroll", ring:"ring", amulet:"amulet", cloak:"cloak", gem:"gem", treasure:"gem", key:"key", quest:"key", book:"book", tool:"tool", focus:"wand", wondrous:"star"})[it.type] || "bag";
function itemLine(it){
  const bits = [];
  if (it.weapon) bits.push(`${it.weapon.dmg} ${it.weapon.t}${it.weapon.bonus?`, +${it.weapon.bonus}`:""}${it.weapon.extra?` +${it.weapon.extra.dmg} ${it.weapon.extra.t}`:""}${it.weapon.props.length?` (${it.weapon.props.map(p=>p.replace("versatile:","versatile ")).join(", ")})`:""}`);
  if (it.armor) bits.push(`AC ${it.armor.base}${it.armor.kind==="light"?" + DEX":it.armor.kind==="medium"?" + DEX (max 2)":""}, ${it.armor.kind}`);
  if (it.type==="shield") bits.push(`+${it.acBonus} AC`);
  if (it.acBonus && it.type!=="shield") bits.push(`+${it.acBonus} AC`);
  if (it.abilityBonus) bits.push(Object.entries(it.abilityBonus).map(([k,v])=>`${k} ${fmt(v)}`).join(", "));
  if (it.abilitySet) bits.push(Object.entries(it.abilitySet).map(([k,v])=>`${k} becomes ${v}`).join(", "));
  if (it.saveBonus) bits.push(`+${it.saveBonus} saves`); if (it.spellBonus) bits.push(`+${it.spellBonus} spell attacks`);
  if (it.resist) bits.push(`resist ${it.resist.join(", ")}`); if (it.heal) bits.push(`heals ${it.heal}`); if (it.cures) bits.push(`cures ${it.cures}`);
  if (it.spell) bits.push(`casts ${it.spell}`);
  return bits.join("; ");
}

// ======================= CHARACTER =======================
const profBonus = lvl => 2 + Math.floor((Math.max(1,lvl)-1)/4);
const subMods = ch => (CLASSES[ch.cls]?.subs.find(s=>s.n===ch.subclass)?.m) || {};
const hasCond = (ch, n) => (ch.conditions||[]).some(c => c.name === n);
const invItem = (ch, id) => (ch.inventory||[]).find(i => i.id === id);
const equipped = ch => SLOTS.map(s => ch.equipped?.[s] && invItem(ch, ch.equipped[s])).filter(Boolean);
function abilities(ch){
  const a = {...ch.abilities};
  for (const it of equipped(ch)){
    if (it.abilityBonus) for (const [k,v] of Object.entries(it.abilityBonus)) a[k] = Math.min(30, a[k] + v);
    if (it.abilitySet) for (const [k,v] of Object.entries(it.abilitySet)) a[k] = Math.max(a[k], v);
  }
  return a;
}
function mods(ch){ const a = abilities(ch); return Object.fromEntries(ABILS.map(k=>[k, abMod(a[k])])); }
function isProfWeapon(ch, it){
  const w = CLASSES[ch.cls].weapons; const base = it.weapon?.base || it.name; const cat = it.weapon?.cat || "martial";
  if (w === "martial") return true; if (w === "simple") return cat === "simple";
  return w.includes(base) || (w.includes("simple") && cat === "simple");
}
function isProfArmor(ch, it){
  const a = CLASSES[ch.cls].armor.slice(); if (subMods(ch).valor) a.push("medium","shield");
  if (it.type === "shield") return a.includes("shield"); return a.includes(it.armor?.kind);
}
function maxHp(ch){
  const m = mods(ch), lvl = ch.level, sm = subMods(ch);
  let hp = (ch.hpRolls||[]).reduce((a,b)=>a+b,0) + lvl*m.CON;
  if (RACES[ch.race]?.hpPerLevel) hp += lvl; if ((ch.feats||[]).includes("Tough")) hp += 2*lvl; if (sm.draconic) hp += lvl;
  if (hasCond(ch,"aid")) hp += 5;
  return Math.max(lvl, hp);
}
function resistances(ch){
  const r = new Set(RACES[ch.race]?.resist || []); if (ch.race === "Dragonborn" && ch.dragonType) r.add(DRAGON_TYPES[ch.dragonType]);
  for (const it of equipped(ch)) (it.resist||[]).forEach(x=>r.add(x));
  if (hasCond(ch,"stoneskin")) ["bludgeoning","piercing","slashing"].forEach(x=>r.add(x));
  if (hasCond(ch,"raging")){ ["bludgeoning","piercing","slashing"].forEach(x=>r.add(x)); if (subMods(ch).totemBear) ["acid","cold","fire","force","lightning","necrotic","poison","radiant","thunder"].forEach(x=>r.add(x)); }
  return [...r];
}
function armorClass(ch){
  const m = mods(ch); const armor = ch.equipped?.armor && invItem(ch, ch.equipped.armor); const off = ch.equipped?.offHand && invItem(ch, ch.equipped.offHand);
  const sm = subMods(ch); let ac;
  if (hasCond(ch,"wildshape")) { ac = ch.wild?.ac || 13; }
  else if (armor?.armor){
    const k = armor.armor.kind; ac = armor.armor.base + (k==="light" ? m.DEX : k==="medium" ? Math.min(2,m.DEX) : 0);
    if (ch.fightingStyle === "Defense") ac += 1;
  } else {
    const opts = [10 + m.DEX];
    if (ch.cls === "Barbarian") opts.push(10 + m.DEX + m.CON);
    if (ch.cls === "Monk" && !(off && off.type==="shield")) opts.push(10 + m.DEX + m.WIS);
    if (sm.draconic || hasCond(ch,"mage-armor") || (ch.invocations||[]).includes("Armor of Shadows")) opts.push(13 + m.DEX);
    ac = Math.max(...opts);
  }
  if (off && off.type === "shield" && !hasCond(ch,"wildshape")) ac += off.acBonus || 2;
  for (const it of equipped(ch)) if (it.acBonus && it.type !== "shield") ac += it.acBonus;
  if (hasCond(ch,"shield-of-faith")) ac += 2; if (hasCond(ch,"hasted")) ac += 2;
  if (hasCond(ch,"barkskin")) ac = Math.max(ac, 16);
  return ac;
}
function saveMod(ch, ab){
  const m = mods(ch); let v = m[ab];
  const profs = CLASSES[ch.cls].saves.concat((ch.feats||[]).includes("Resilient (CON)") ? ["CON"] : []);
  if (profs.includes(ab)) v += profBonus(ch.level);
  for (const it of equipped(ch)) v += it.saveBonus || 0;
  if (ch.cls === "Paladin" && ch.level >= 6) v += Math.max(1, m.CHA);
  return v;
}
function skillMod(ch, sk){
  const m = mods(ch), p = profBonus(ch.level); let v = m[SKILLS[sk]];
  if ((ch.expertise||[]).includes(sk)) v += 2*p; else if ((ch.skills||[]).includes(sk)) v += p;
  else if (ch.cls === "Bard" && ch.level >= 2) v += Math.floor(p/2);
  return v;
}
const initMod = ch => mods(ch).DEX + ((ch.feats||[]).includes("Alert") ? 5 : 0);
const passivePerception = ch => 10 + skillMod(ch, "Perception");
const speed = ch => (RACES[ch.race]?.speed||30) + (ch.cls==="Monk" && ch.level>=2 ? 10 : 0) + (ch.cls==="Barbarian" && ch.level>=5 ? 10 : 0);
function castInfo(ch){
  const c = CLASSES[ch.cls].caster; if (!c) return null; const m = mods(ch)[c.ab]; const p = profBonus(ch.level);
  const bonus = equipped(ch).reduce((a,i)=>a+(i.spellBonus||0),0);
  return { ab:c.ab, mod:m, dc: 8 + p + m + bonus, atk: p + m + bonus, type:c.type };
}
function slotMax(ch){
  const c = CLASSES[ch.cls].caster; if (!c) return {};
  if (c.type === "pact"){ const [n, l] = PACT[ch.level]; return n ? {[l]: n} : {}; }
  const row = (c.type === "full" ? FULL_SLOTS : HALF_SLOTS)[ch.level] || [];
  return Object.fromEntries(row.map((n,i)=>[i+1,n]));
}
function slotsLeft(ch, l){ const mx = slotMax(ch)[l]||0; return Math.max(0, mx - (ch.slotsUsed?.[l]||0)); }
function lowestSlot(ch, min){ const mx = slotMax(ch); for (let l=Math.max(1,min); l<=5; l++) if ((mx[l]||0) - (ch.slotsUsed?.[l]||0) > 0) return l; return 0; }
function maxSpellLevel(ch, lvl=ch.level){
  const c = CLASSES[ch.cls].caster; if (!c) return 0;
  if (c.type === "pact") return Math.min(5, PACT[lvl][1]);
  const row = (c.type === "full" ? FULL_SLOTS : HALF_SLOTS)[lvl] || []; return row.length;
}
function classSpells(cls, maxL, minL=0){ const L = CLASS_LETTER[cls]; if (!L) return []; return SPELLS.filter(s => s.c.includes(L) && s.l >= minL && s.l <= maxL); }
function cantripScale(ch){ return ch.level >= 11 ? 3 : ch.level >= 5 ? 2 : 1; }
function resourceMax(ch){
  const r = {}, lvl = ch.level, m = mods(ch), sm = subMods(ch), c = ch.cls;
  if (c==="Barbarian") r.rage = {max: lvl>=6?4:lvl>=3?3:2, rest:"long", label:"Rage"};
  if (c==="Bard") r.inspiration = {max: Math.max(1,m.CHA), rest: lvl>=5?"short":"long", label:`Bardic Inspiration (d${lvl>=10?10:lvl>=5?8:6})`};
  if (c==="Cleric" && lvl>=2) r.channel = {max: lvl>=6?2:1, rest:"short", label:"Channel Divinity"};
  if (c==="Cleric" && sm.warPriest) r.warPriest = {max: Math.max(1,m.WIS), rest:"long", label:"War Priest"};
  if (c==="Druid" && lvl>=2) r.wildshape = {max:2, rest:"short", label:"Wild Shape"};
  if (c==="Druid" && sm.landRecovery) r.recovery = {max:1, rest:"long", label:"Natural Recovery"};
  if (c==="Fighter"){ r.secondWind = {max:1, rest:"short", label:"Second Wind"}; if (lvl>=2) r.actionSurge = {max:1, rest:"short", label:"Action Surge"}; if (lvl>=9) r.indomitable = {max:1, rest:"long", label:"Indomitable"}; if (sm.battleDice) r.superiority = {max:4, rest:"short", label:"Superiority Dice (d8)"}; }
  if (c==="Monk" && lvl>=2) r.ki = {max:lvl, rest:"short", label:"Ki"};
  if (c==="Paladin"){ r.layOnHands = {max:5*lvl, rest:"long", label:"Lay on Hands pool", pool:1}; if (lvl>=3) r.channel = {max:1, rest:"short", label:"Channel Divinity"}; }
  if (c==="Sorcerer" && lvl>=2) r.sorcery = {max:lvl, rest:"long", label:"Sorcery Points"};
  if (c==="Warlock" && sm.feyPresence) r.fey = {max:1, rest:"short", label:"Fey Presence"};
  if (c==="Wizard") r.recovery = {max:1, rest:"long", label:"Arcane Recovery"};
  if (ch.race==="Dragonborn") r.breath = {max:1, rest:"short", label:"Breath Weapon"};
  if (ch.race==="Half-Orc") r.relentless = {max:1, rest:"long", label:"Relentless Endurance"};
  if ((ch.feats||[]).includes("Lucky")) r.luck = {max:3, rest:"long", label:"Luck Points"};
  return r;
}
const resLeft = (ch, k) => { const r = resourceMax(ch)[k]; return r ? Math.max(0, r.max - (ch.res?.[k]||0)) : 0; };
function useRes(ch, k, n=1){ ch.res = ch.res || {}; ch.res[k] = (ch.res[k]||0) + n; }
const sneakDice = ch => `${Math.ceil(ch.level/2)}d6`;
const martialDie = ch => ch.level >= 5 ? "1d6" : "1d4";
const rageBonus = ch => ch.level >= 9 ? 3 : 2;
function attacksPerAction(ch){
  let n = 1; const sm = subMods(ch);
  if (["Fighter","Barbarian","Paladin","Ranger","Monk"].includes(ch.cls) && ch.level >= 5) n = 2;
  if (ch.cls==="Bard" && sm.valor && ch.level >= 6) n = 2;
  if (hasCond(ch,"hasted")) n += 1;
  return n;
}
function weaponAttacks(ch){
  const m = mods(ch), p = profBonus(ch.level), out = [];
  if (hasCond(ch,"wildshape") && ch.wild){ out.push({id:"wild", name: ch.wild.attack, toHit: ch.wild.toHit, dmg: ch.wild.dmg, t: ch.wild.t||"slashing", melee:true, beast:true}); return out; }
  const main = ch.equipped?.mainHand && invItem(ch, ch.equipped.mainHand); const off = ch.equipped?.offHand && invItem(ch, ch.equipped.offHand);
  const monkWeapon = it => ch.cls==="Monk" && it.weapon && (it.weapon.base==="Shortsword" || (it.weapon.cat==="simple" && !it.weapon.props.some(x=>["heavy","two-handed"].includes(x))));
  const build = (it, offhand=false) => {
    const w = it.weapon, props = w.props; const ranged = props.includes("ranged");
    let ab = ranged ? "DEX" : props.includes("finesse") || monkWeapon(it) ? (m.DEX >= m.STR ? "DEX" : "STR") : "STR";
    let dice = w.dmg; const vers = props.find(x=>x.startsWith("versatile:"));
    const twoHanding = vers && !off; if (twoHanding) dice = vers.split(":")[1];
    if (monkWeapon(it) && avgDice(martialDie(ch)) > avgDice(dice)) dice = martialDie(ch);
    const prof = isProfWeapon(ch, it);
    let toHit = m[ab] + (prof ? p : 0) + (w.bonus||0) + (ranged && ch.fightingStyle==="Archery" ? 2 : 0);
    let dmgMod = (offhand && ch.fightingStyle!=="Two-Weapon Fighting") ? Math.min(0,m[ab]) : m[ab];
    dmgMod += (w.bonus||0);
    const oneHandMelee = !ranged && !props.includes("two-handed") && !(off && off.weapon) && !offhand;
    if (ch.fightingStyle==="Dueling" && oneHandMelee) dmgMod += 2;
    return { id: it.id + (offhand?":off":""), itemId: it.id, name: it.name + (offhand ? " (off-hand)" : "") + (twoHanding ? " (two hands)" : ""), toHit, dmg: joinExpr(dice, dmgMod), dice, dmgMod, t: w.t,
      melee: !ranged, ranged, heavy: props.includes("heavy"), twoHanded: props.includes("two-handed") || !!twoHanding, ab, offhand, extra: w.extra, prof, gwf: ch.fightingStyle==="Great Weapon Fighting" && (props.includes("two-handed")||twoHanding) && !ranged };
  };
  if (main?.weapon) out.push(build(main));
  if (off?.weapon) out.push(build(off, true));
  // backup weapons from pack (thrown/ranged) so you can switch without the sheet
  for (const it of ch.inventory||[]) if (it.weapon && it.id !== main?.id && it.id !== off?.id && out.length < 4 && !out.some(o=>o.name.startsWith(it.name))) out.push({...build(it), stowed:true});
  const ua = ch.cls==="Monk" ? {dice: martialDie(ch), ab: m.DEX >= m.STR ? "DEX" : "STR"} : {dice:"1", ab:"STR"};
  out.push({ id:"unarmed", name:"Unarmed Strike", toHit: m[ua.ab] + p, dmg: joinExpr(ua.dice, m[ua.ab]), dice: ua.dice, dmgMod: m[ua.ab], t:"bludgeoning", melee:true, ab: ua.ab, prof:true });
  return out;
}
function armorWarnings(ch){
  const w = []; for (const it of equipped(ch)) if ((it.type==="armor"||it.type==="shield") && !isProfArmor(ch,it)) w.push(`Not proficient with ${it.name}: disadvantage on attacks and no spellcasting.`);
  const a = ch.equipped?.armor && invItem(ch, ch.equipped.armor); if (a?.armor?.str && abilities(ch).STR < a.armor.str) w.push(`${a.name} needs STR ${a.armor.str}: your speed drops by 10 ft.`);
  return w;
}
const armorPenalty = ch => equipped(ch).some(it => (it.type==="armor"||it.type==="shield") && !isProfArmor(ch,it));
const xpForNext = lvl => XP_TABLE[Math.min(lvl, XP_TABLE.length-1)];
const canLevel = ch => ch.level < MAX_LEVEL && ch.xp >= XP_TABLE[ch.level];

// ---- Build a new character from the creator draft ----
function buildCharacter(dr){
  const C = CLASSES[dr.cls], R = RACES[dr.race], B = BACKGROUNDS[dr.background];
  const ab = {}; for (const k of ABILS) ab[k] = (dr.base[k]||10) + (R.bonus[k]||0);
  const skills = [...new Set([...(B.skills||[]), ...(R.skills||[]), ...(dr.skills||[]), ...(dr.raceSkills||[])])];
  const ch = { id: uid("c"), name: dr.name.trim() || "Nameless", race: dr.race, cls: dr.cls, background: dr.background, alignment: dr.alignment,
    level:1, xp:0, abilities: ab, hpRolls:[C.hd], hp:0, tempHp:0, hitDiceUsed:0, skills, expertise: dr.expertise||[], fightingStyle: dr.fightingStyle||null,
    subclass:null, feats:[], invocations:[], cantrips: [...(dr.cantrips||[])], spells: [...(dr.spells||[])], slotsUsed:{}, res:{}, conditions:[], inventory:[], equipped:{},
    gold: C.gold + B.gold, deathSaves:{s:0,f:0}, dead:false, inspiration:false, dragonType: dr.dragonType||null, backstory: (dr.backstory||"").slice(0,800), appearance:(dr.appearance||"").slice(0,300), look: dr.look && typeof dr.look === "object" ? {...dr.look} : null, stats:{kills:0,crits:0,rolls:0} };
  if (R.cantrip && !ch.cantrips.includes(R.cantrip)) ch.cantrips.push(R.cantrip);
  const kit = C.kits[dr.kit||0].i.concat([B.item, "Potion of Healing"]);
  for (const nm of kit) addItem(ch, makeItem(nm));
  autoEquip(ch);
  ch.hp = maxHp(ch);
  return ch;
}
function addItem(ch, it){
  const same = !it.magic && !it.weapon && !it.armor && it.type!=="shield" && ch.inventory.find(x => x.name === it.name && !x.magic);
  if (same){ same.qty += it.qty; return same; }
  ch.inventory.push(it); return it;
}
function removeItemByName(ch, name, qty=1){
  const low = String(name).toLowerCase();
  const it = ch.inventory.find(x=>x.name.toLowerCase()===low) || ch.inventory.find(x=>x.name.toLowerCase().includes(low)) || ch.inventory.find(x=>low.includes(x.name.toLowerCase()));
  if (!it) return null; it.qty -= qty; if (it.qty <= 0) dropItem(ch, it.id); return it;
}
function dropItem(ch, id){ for (const s of SLOTS) if (ch.equipped[s]===id) delete ch.equipped[s]; ch.inventory = ch.inventory.filter(x=>x.id!==id); }
function autoEquip(ch){
  const inv = ch.inventory;
  const armor = inv.filter(i=>i.armor && isProfArmor(ch,i)).sort((a,b)=>b.armor.base-a.armor.base)[0]; if (armor) ch.equipped.armor = armor.id;
  const weapons = inv.filter(i=>i.weapon);
  const melee = weapons.filter(w=>!w.weapon.props.includes("ranged"));
  const pickW = (melee.length ? melee : weapons).sort((a,b)=>avgDice(b.weapon.dmg)-avgDice(a.weapon.dmg) || (isProfWeapon(ch,b)-isProfWeapon(ch,a)))[0];
  const preferRanged = ["Ranger"].includes(ch.cls) || (ch.cls==="Fighter" && weapons.some(w=>w.weapon.base==="Longbow"));
  const main = preferRanged ? (weapons.find(w=>w.weapon.props.includes("ranged")) || pickW) : pickW;
  if (main) ch.equipped.mainHand = main.id;
  const shield = inv.find(i=>i.type==="shield");
  if (shield && main && !main.weapon.props.includes("two-handed") && isProfArmor(ch, shield)) ch.equipped.offHand = shield.id;
  else if (main && main.weapon.props.includes("light")){ const o = inv.find(i=>i.weapon && i.id!==main.id && i.weapon.props.includes("light") && !i.weapon.props.includes("thrown")); if (o) ch.equipped.offHand = o.id; }
}
function equipItem(ch, id, slot){
  const it = invItem(ch, id); if (!it) return "No such item.";
  let s = slot || it.slot; if (!s) return `${it.name} can't be equipped.`;
  if (it.type==="ring" || s==="ring1"){ s = !ch.equipped.ring1 ? "ring1" : !ch.equipped.ring2 ? "ring2" : "ring1"; }
  if (s==="offHand" && it.weapon && !it.weapon.props.includes("light")) return "Only light weapons fit in the off hand.";
  for (const k of SLOTS) if (ch.equipped[k]===id) delete ch.equipped[k];
  if (s==="mainHand" && it.weapon?.props.includes("two-handed")) delete ch.equipped.offHand;
  if (s==="offHand"){ const main = ch.equipped.mainHand && invItem(ch, ch.equipped.mainHand); if (main?.weapon?.props.includes("two-handed")) delete ch.equipped.mainHand; }
  ch.equipped[s] = id; ch.hp = Math.min(ch.hp, maxHp(ch)); return null;
}
function unequip(ch, id){ for (const k of SLOTS) if (ch.equipped[k]===id) delete ch.equipped[k]; ch.hp = Math.min(ch.hp, maxHp(ch)); }
const isEquipped = (ch, id) => SLOTS.some(k => ch.equipped?.[k] === id);

// ---- Conditions (character) ----
const COND_INFO = {
  "raging":["good","Rage: +damage, resist physical, advantage on STR."],"blessed":["good","+1d4 to attacks and saves."],"shield-of-faith":["good","+2 AC."],
  "mage-armor":["good","AC 13 + DEX while unarmored."],"hasted":["good","+2 AC, one extra attack."],"blurred":["good","Attacks against you have disadvantage."],
  "greater-invisible":["good","Invisible: advantage on attacks; attacks against you have disadvantage."],"invisible":["good","Invisible until you attack or cast."],
  "barkskin":["good","AC at least 16."],"stoneskin":["good","Resist bludgeoning, piercing, slashing."],"heroism":["good","Temp HP each turn."],"divine-favor":["good","+1d4 radiant on weapon hits."],
  "crusader":["good","+1d4 radiant on weapon hits."],"agathys":["good","Frost armor: melee attackers take cold damage."],"aid":["good","+5 max HP."],"death-ward":["good","Drop to 1 HP instead of 0, once."],
  "guided":["good","+1d4 to your next ability check."],"wildshape":["good","Beast form."],"sacred-weapon":["good","+CHA to attack rolls."],"dodging":["good","Attacks against you have disadvantage."],
  "hidden":["good","Advantage on your next attack."],"reckless":["bad","Attacks against you have advantage."],"misty":["good","You can slip away freely."],
  "poisoned":["bad","Disadvantage on attacks and ability checks."],"frightened":["bad","Disadvantage on attacks and checks."],"restrained":["bad","Attacks against you have advantage; your attacks have disadvantage."],
  "prone":["bad","Melee attacks against you have advantage; your attacks have disadvantage."],"blinded":["bad","Your attacks have disadvantage; attacks against you have advantage."],
  "paralyzed":["bad","You can't act; hits against you are critical."],"stunned":["bad","You can't act."],"charmed":["bad","You can't attack the charmer."],"exhausted":["bad","Disadvantage on ability checks."],
  "unconscious":["bad","Dying: roll death saves."],"cursed":["bad","A curse lingers."],"diseased":["bad","You are sick."],"stable":["good","Stabilized at 0 HP."]
};
const condKind = n => (COND_INFO[n]||["bad"])[0];
function addCond(ch, name, extra={}){ ch.conditions = (ch.conditions||[]).filter(c=>c.name!==name); ch.conditions.push({name, ...extra}); }
function remCond(ch, name){ ch.conditions = (ch.conditions||[]).filter(c=>c.name!==name); }

// ---- Level up ----
function levelPlan(ch){
  const L = ch.level + 1, C = CLASSES[ch.cls], feats = C.feats[L] || [];
  const plan = { level:L, hd:C.hd, feats, asi: feats.includes("Ability Score Improvement"), subclass: L===3, invocations:0, cantrips:0, spells:0, maxSpell:0, fightingStyle:false, expertise:0, companion:false };
  if (C.caster){
    if (CANTRIPS_KNOWN[ch.cls]) plan.cantrips = Math.max(0, CANTRIPS_KNOWN[ch.cls][L] - CANTRIPS_KNOWN[ch.cls][ch.level]);
    plan.spells = Math.max(0, SPELLS_KNOWN[ch.cls][L] - (ch.spells||[]).length);
    plan.maxSpell = maxSpellLevel(ch, L);
  }
  if (ch.cls==="Warlock") plan.invocations = Math.max(0, INVOCATIONS_KNOWN[L] - (ch.invocations||[]).length);
  if ((ch.cls==="Paladin"||ch.cls==="Ranger") && L===2) plan.fightingStyle = true;
  if ((ch.cls==="Bard" && (L===3||L===10)) || (ch.cls==="Rogue" && L===6)) plan.expertise = 2;
  return plan;
}
function applyLevelUp(ch, ch2){ // ch2 = choices
  const plan = levelPlan(ch); ch.level = plan.level; ch.hpRolls.push(ch2.hpRoll);
  if (ch2.asi){ if (ch2.asi.feat){ ch.feats.push(ch2.asi.feat); if (ch2.asi.feat==="Resilient (CON)") ch.abilities.CON = Math.min(20, ch.abilities.CON+1); }
    else for (const [k,v] of Object.entries(ch2.asi.inc||{})) ch.abilities[k] = Math.min(20, ch.abilities[k] + v); }
  if (ch2.subclass) ch.subclass = ch2.subclass;
  if (ch2.cantrips) ch.cantrips.push(...ch2.cantrips);
  if (ch2.spells) ch.spells.push(...ch2.spells);
  if (ch2.swapOut && ch2.swapIn){ ch.spells = ch.spells.filter(s=>s!==ch2.swapOut); ch.spells.push(ch2.swapIn); }
  if (ch2.invocations) ch.invocations.push(...ch2.invocations);
  if (ch2.fightingStyle) ch.fightingStyle = ch2.fightingStyle;
  if (ch2.expertise) ch.expertise.push(...ch2.expertise);
  const before = ch.hp; ch.hp = Math.min(maxHp(ch), before + ch2.hpRoll + mods(ch).CON + (RACES[ch.race].hpPerLevel?1:0) + ((ch.feats||[]).includes("Tough")?2:0));
  if (ch2.asi?.feat === "Tough") ch.hp = Math.min(maxHp(ch), ch.hp + 2*ch.level);
  return plan;
}

// ---- Rests ----
function shortRest(ch, diceToSpend){
  const C = CLASSES[ch.cls], m = mods(ch); let healed = 0; const avail = ch.level - (ch.hitDiceUsed||0); const n = clamp(diceToSpend,0,avail);
  for (let i=0;i<n;i++) healed += Math.max(1, d(C.hd) + m.CON);
  if (n && ch.cls==="Bard" && ch.level>=2) healed += d(6);
  ch.hitDiceUsed = (ch.hitDiceUsed||0) + n; ch.hp = Math.min(maxHp(ch), ch.hp + healed);
  const rm = resourceMax(ch); for (const [k,r] of Object.entries(rm)) if (r.rest==="short") ch.res[k] = 0;
  if (C.caster?.type==="pact") ch.slotsUsed = {};
  ch.conditions = ch.conditions.filter(c=>c.long || !c.rounds);
  return healed;
}
function arcaneRecovery(ch){
  let budget = Math.ceil(ch.level/2); const got = [];
  for (let l=Math.min(5,budget); l>=1; l--){ while (budget >= l && (ch.slotsUsed[l]||0) > 0 && l <= 5){ ch.slotsUsed[l]--; budget -= l; got.push(l); } }
  useRes(ch, "recovery"); return got;
}
function longRest(ch){
  ch.hp = maxHp(ch); ch.tempHp = 0; ch.slotsUsed = {}; ch.res = {}; ch.hitDiceUsed = Math.max(0, (ch.hitDiceUsed||0) - Math.max(1, Math.floor(ch.level/2)));
  ch.conditions = (ch.conditions||[]).filter(c => !c.long && !c.rounds && condKind(c.name)==="bad" && !["poisoned","prone","restrained","frightened","stunned","paralyzed","unconscious","stable","charmed","exhausted","blessed"].includes(c.name));
  ch.deathSaves = {s:0,f:0};
  if (subMods(ch).abjurer) ch.tempHp = 2*ch.level + mods(ch).INT;
}

// ---- Summaries for the DM prompt ----
function charSummary(ch){
  const m = mods(ch), a = abilities(ch), ci = castInfo(ch), rm = resourceMax(ch);
  const lines = [];
  lines.push(`${ch.name}: level ${ch.level} ${ch.race} ${ch.cls}${ch.subclass?` (${ch.subclass})`:""}, ${ch.background}, ${ch.alignment}.`);
  lines.push(`HP ${ch.hp}/${maxHp(ch)}${ch.tempHp?` (+${ch.tempHp} temp)`:""}, AC ${armorClass(ch)}, speed ${speed(ch)} ft, proficiency +${profBonus(ch.level)}, initiative ${fmt(initMod(ch))}, passive Perception ${passivePerception(ch)}. XP ${ch.xp}/${XP_TABLE[ch.level]||"max"}. Gold ${ch.gold}.`);
  lines.push("Abilities: " + ABILS.map(k=>`${k} ${a[k]} (${fmt(m[k])})`).join(", ") + ".");
  lines.push("Saves: " + ABILS.map(k=>`${k} ${fmt(saveMod(ch,k))}`).join(", ") + ".");
  lines.push("Skills: " + Object.keys(SKILLS).map(s=>`${s} ${fmt(skillMod(ch,s))}${(ch.expertise||[]).includes(s)?"**":(ch.skills||[]).includes(s)?"*":""}`).join(", ") + " (* proficient, ** expertise).");
  const feats = Object.entries(CLASSES[ch.cls].feats).filter(([l])=>+l<=ch.level).flatMap(([,f])=>f).filter(f=>!/Ability Score|Feature$|Archetype$|Path$|College$|Domain$|Circle$|Tradition$|Oath$|Origin$/.test(f));
  lines.push("Features: " + [...feats, ...(ch.fightingStyle?[`Fighting Style: ${ch.fightingStyle}`]:[]), ...(ch.feats||[]), ...(ch.invocations||[]), ...(RACES[ch.race].traits.map(t=>t.split(":")[0]))].join(", ") + ".");
  if (ci) lines.push(`Spellcasting (${ci.ab}): save DC ${ci.dc}, attack ${fmt(ci.atk)}. Slots left: ${Object.entries(slotMax(ch)).map(([l,n])=>`L${l} ${n-(ch.slotsUsed[l]||0)}/${n}`).join(", ")||"none"}. Cantrips: ${ch.cantrips.join(", ")||"none"}. Spells: ${ch.spells.join(", ")||"none"}.`);
  const res = Object.entries(rm).map(([k,r])=>`${r.label} ${r.max-(ch.res[k]||0)}/${r.max}`); if (res.length) lines.push("Resources: " + res.join(", ") + ".");
  lines.push("Equipped: " + (equipped(ch).map(i=>`${i.name}${itemLine(i)?` [${itemLine(i)}]`:""}`).join("; ")||"nothing") + ".");
  const pack = ch.inventory.filter(i=>!isEquipped(ch,i.id)).map(i=>`${i.name}${i.qty>1?` x${i.qty}`:""}`);
  lines.push("Pack: " + (pack.join(", ")||"empty") + ".");
  if (ch.conditions?.length) lines.push("Conditions: " + ch.conditions.map(c=>c.name + (c.note?` (${c.note})`:"")).join(", ") + ".");
  if (ch.appearance) lines.push("Appearance: " + ch.appearance);
  if (ch.backstory) lines.push("Backstory: " + ch.backstory);
  return lines.join("\n");
}
</script>
