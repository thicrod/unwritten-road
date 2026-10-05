<script>
"use strict";
// =====================================================================
//  LEVELS 11-20: tables, class features, 6th-9th level spells, epic monsters & treasure
// =====================================================================
XP_TABLE.push(100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000);
FULL_SLOTS.push([4,3,3,3,2,1], [4,3,3,3,2,1], [4,3,3,3,2,1,1], [4,3,3,3,2,1,1], [4,3,3,3,2,1,1,1], [4,3,3,3,2,1,1,1], [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1], [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1]);
HALF_SLOTS.push([4,3,3], [4,3,3], [4,3,3,1], [4,3,3,1], [4,3,3,2], [4,3,3,2], [4,3,3,3,1], [4,3,3,3,1], [4,3,3,3,2], [4,3,3,3,2]);
PACT.push([3,5], [3,5], [3,5], [3,5], [3,5], [3,5], [4,5], [4,5], [4,5], [4,5]);
for (const k of Object.keys(CANTRIPS_KNOWN)){ const a = CANTRIPS_KNOWN[k]; while (a.length < 21) a.push(a[a.length - 1]); }
Object.assign(SPELLS_KNOWN, {
  Bard: [...SPELLS_KNOWN.Bard, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22], Sorcerer: [...SPELLS_KNOWN.Sorcerer, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  Warlock: [...SPELLS_KNOWN.Warlock, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15], Wizard: [...SPELLS_KNOWN.Wizard, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44],
  Cleric: [...SPELLS_KNOWN.Cleric, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], Druid: [...SPELLS_KNOWN.Druid, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  Paladin: [...SPELLS_KNOWN.Paladin, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16], Ranger: [...SPELLS_KNOWN.Ranger, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11] });
INVOCATIONS_KNOWN.push(5, 6, 6, 6, 7, 7, 7, 8, 8, 8);
Object.assign(XP_THRESH, { 11: [800,1600,2400,3600], 12: [1000,2000,3000,4500], 13: [1100,2200,3400,5100], 14: [1250,2500,3800,5700], 15: [1400,2800,4300,6400], 16: [1600,3200,4800,7200], 17: [2000,3900,5900,8800], 18: [2100,4200,6300,9500], 19: [2400,4900,7300,10900], 20: [2800,5700,8500,12700] });
// class features, levels 11-20
const ASI = "Ability Score Improvement";
const EPIC_FEATS = {
  Barbarian: { 11: ["Relentless Rage"], 12: [ASI], 13: ["Brutal Critical (2 dice)"], 14: ["Path feature"], 15: ["Persistent Rage"], 16: [ASI], 17: ["Brutal Critical (3 dice)"], 18: ["Indomitable Might"], 19: [ASI], 20: ["Primal Champion"] },
  Bard: { 12: [ASI], 13: ["Song of Rest (d10)"], 14: ["Magical Secrets", "College feature"], 15: ["Bardic Inspiration (d12)"], 16: [ASI], 17: ["Song of Rest (d12)"], 18: ["Magical Secrets"], 19: [ASI], 20: ["Superior Inspiration"] },
  Cleric: { 11: ["Destroy Undead (CR 2)"], 12: [ASI], 14: ["Destroy Undead (CR 3)"], 16: [ASI], 17: ["Destroy Undead (CR 4)", "Domain feature"], 18: ["Channel Divinity (3/rest)"], 19: [ASI], 20: ["Divine Intervention Improvement"] },
  Druid: { 12: [ASI], 14: ["Circle feature"], 16: [ASI], 18: ["Timeless Body", "Beast Spells"], 19: [ASI], 20: ["Archdruid"] },
  Fighter: { 11: ["Extra Attack (2)"], 12: [ASI], 13: ["Indomitable (two uses)"], 14: [ASI], 15: ["Archetype feature"], 16: [ASI], 17: ["Action Surge (two uses)", "Indomitable (three uses)"], 18: ["Archetype feature"], 19: [ASI], 20: ["Extra Attack (3)"] },
  Monk: { 11: ["Tradition feature"], 12: [ASI], 13: ["Tongue of the Sun and Moon"], 14: ["Diamond Soul"], 15: ["Timeless Body"], 16: [ASI], 17: ["Tradition feature"], 18: ["Empty Body"], 19: [ASI], 20: ["Perfect Self"] },
  Paladin: { 11: ["Improved Divine Smite"], 12: [ASI], 14: ["Cleansing Touch"], 15: ["Oath feature"], 16: [ASI], 18: ["Aura improvements"], 19: [ASI], 20: ["Sacred Oath capstone"] },
  Ranger: { 11: ["Conclave feature"], 12: [ASI], 14: ["Vanish"], 15: ["Conclave feature"], 16: [ASI], 18: ["Feral Senses"], 19: [ASI], 20: ["Foe Slayer"] },
  Rogue: { 11: ["Reliable Talent"], 12: [ASI], 13: ["Archetype feature"], 14: ["Blindsense"], 15: ["Slippery Mind"], 16: [ASI], 17: ["Archetype feature"], 18: ["Elusive"], 19: [ASI], 20: ["Stroke of Luck"] },
  Sorcerer: { 12: [ASI], 14: ["Origin feature"], 16: [ASI], 17: ["Metamagic"], 18: ["Origin feature"], 19: [ASI], 20: ["Sorcerous Restoration"] },
  Warlock: { 11: ["Mystic Arcanum (6th)"], 12: [ASI], 13: ["Mystic Arcanum (7th)"], 14: ["Patron feature"], 15: ["Mystic Arcanum (8th)"], 16: [ASI], 17: ["Mystic Arcanum (9th)"], 19: [ASI], 20: ["Eldritch Master"] },
  Wizard: { 12: [ASI], 14: ["School feature"], 16: [ASI], 18: ["Spell Mastery"], 19: [ASI], 20: ["Signature Spells"] },
};
for (const [cls, byL] of Object.entries(EPIC_FEATS)) if (CLASSES[cls]) for (const [L, f] of Object.entries(byL)) CLASSES[cls].feats[L] = [...(CLASSES[cls].feats[L] || []), ...f];
// 6th-9th level spells (built on the existing spell mechanics)
const EPIC_SPELLS = [
  { n: "Chain Lightning", l: 6, s: "Evocation", c: "SW", m: { k: "save", save: "DEX", dmg: "10d8", t: "lightning", half: 1, tgt: 4 }, d: "Lightning leaps from foe to foe: up to four targets. DEX save for half." },
  { n: "Disintegrate", l: 6, s: "Transmutation", c: "SW", m: { k: "save", save: "DEX", dmg: "10d6+40", t: "force", tgt: 1 }, d: "A thin green ray that reduces its target to dust. DEX save negates." },
  { n: "Harm", l: 6, s: "Necromancy", c: "C", m: { k: "save", save: "CON", dmg: "14d6", t: "necrotic", half: 1, tgt: 1 }, d: "A virulent disease ravages one foe. CON save for half." },
  { n: "Heal", l: 6, s: "Evocation", c: "CD", m: { k: "heal", heal: "70", mod: 0 }, d: "A surge of positive energy restores 70 hit points." },
  { n: "Sunbeam", l: 6, s: "Evocation", c: "DSW", m: { k: "save", save: "CON", dmg: "6d8", t: "radiant", half: 1, tgt: 3 }, d: "A beam of brilliant light burns up to three foes. CON save for half." },
  { n: "Circle of Death", l: 6, s: "Necromancy", c: "SKW", m: { k: "save", save: "CON", dmg: "8d6", t: "necrotic", half: 1, tgt: 6 }, d: "A sphere of negative energy ripples outward through up to six foes." },
  { n: "Blade Barrier", l: 6, s: "Evocation", c: "C", m: { k: "save", save: "DEX", dmg: "6d10", t: "slashing", half: 1, tgt: 4 }, d: "A wall of whirling blades shreds up to four foes." },
  { n: "Finger of Death", l: 7, s: "Necromancy", c: "SKW", m: { k: "save", save: "CON", dmg: "7d8+30", t: "necrotic", half: 1, tgt: 1 }, d: "Negative energy wracks one creature. CON save for half." },
  { n: "Fire Storm", l: 7, s: "Evocation", c: "CDS", m: { k: "save", save: "DEX", dmg: "7d10", t: "fire", half: 1, tgt: 6 }, d: "Sheets of roaring flame engulf up to six foes." },
  { n: "Prismatic Spray", l: 7, s: "Evocation", c: "SW", m: { k: "save", save: "DEX", dmg: "10d6", t: "fire", half: 1, tgt: 4 }, d: "Seven rays of light flash from your hand." },
  { n: "Regenerate", l: 7, s: "Transmutation", c: "BCD", m: { k: "heal", heal: "4d8+15", mod: 0 }, d: "Restores 4d8 + 15 hit points and knits severed limbs." },
  { n: "Sunburst", l: 8, s: "Evocation", c: "CDSW", m: { k: "save", save: "CON", dmg: "12d6", t: "radiant", half: 1, tgt: 6 }, d: "Brilliant sunlight flashes over up to six foes." },
  { n: "Incendiary Cloud", l: 8, s: "Conjuration", c: "DSW", m: { k: "save", save: "DEX", dmg: "10d8", t: "fire", half: 1, tgt: 6 }, d: "A swirling cloud of smoke and embers." },
  { n: "Power Word Stun", l: 8, s: "Enchantment", c: "BSKW", m: { k: "cond", cond: "stunned", save: "CON", rounds: 2, tgt: 1 }, d: "A word of power that overwhelms a creature's mind." },
  { n: "Holy Aura", l: 8, s: "Abjuration", c: "C", m: { k: "buff", buff: "blessed", party: 1, conc: 1, rounds: 10 }, d: "Divine light washes over your companions." },
  { n: "Meteor Swarm", l: 9, s: "Evocation", c: "SW", m: { k: "save", save: "DEX", dmg: "40d6", t: "fire", half: 1, tgt: 8 }, d: "Blazing orbs of fire plummet to the ground." },
  { n: "Power Word Kill", l: 9, s: "Enchantment", c: "BSKW", m: { k: "auto", darts: 1, each: "20d10", t: "psychic" }, d: "A word of power that can end a life instantly." },
  { n: "Mass Heal", l: 9, s: "Evocation", c: "C", m: { k: "heal", heal: "10d10+40", mod: 0, party: 1 }, d: "A flood of healing energy restores the whole party." },
];
for (const sp of EPIC_SPELLS){ if (!SPELL[sp.n]){ SPELLS.push(sp); SPELL[sp.n] = sp; } }
// epic monsters
Object.assign(BESTIARY, {
  "Hill Giant": { hp: 105, ac: 13, xp: 1800, type: "giant", mods: { STR: 5, CON: 4 }, pp: 12, atk: [["Greatclub", 8, "3d8+5", "bludgeoning"], ["Rock", 8, "3d10+5", "bludgeoning", 1]], beh: "brute" },
  "Frost Giant": { hp: 138, ac: 15, xp: 3900, type: "giant", mods: { STR: 6, CON: 5 }, pp: 13, atk: [["Greataxe", 9, "3d12+6", "slashing"], ["Rock", 9, "4d10+6", "bludgeoning", 1]], beh: "brute" },
  "Fire Giant": { hp: 162, ac: 18, xp: 5000, type: "giant", mods: { STR: 7, CON: 6 }, pp: 16, atk: [["Greatsword", 11, "6d6+7", "slashing"], ["Rock", 11, "4d10+7", "bludgeoning", 1]], beh: "brute" },
  "Stone Golem": { hp: 178, ac: 17, xp: 5900, type: "construct", mods: { STR: 6, CON: 5 }, pp: 10, atk: [["Slam", 10, "3d8+6", "bludgeoning"]], beh: "brute" },
  "Mummy Lord": { hp: 97, ac: 17, xp: 5900, type: "undead", mods: { STR: 4, WIS: 4 }, pp: 14, atk: [["Rotting Fist", 9, "3d6+4", "bludgeoning"]], beh: "brute" },
  "Vampire": { hp: 144, ac: 16, xp: 10000, type: "undead", mods: { STR: 4, DEX: 4, CON: 4 }, pp: 17, atk: [["Claws", 9, "2d8+4", "slashing"], ["Bite", 9, "3d6+4", "necrotic"]], beh: "brute" },
  "Beholder": { hp: 180, ac: 18, xp: 10000, type: "aberration", mods: { INT: 4, WIS: 2 }, pp: 22, atk: [["Eye Ray", 9, "8d8", "necrotic", 1], ["Bite", 5, "4d6", "piercing"]], beh: "brute" },
  "Adult Green Dragon": { hp: 207, ac: 19, xp: 13000, type: "dragon", mods: { STR: 6, CON: 6, WIS: 2 }, pp: 22, atk: [["Bite", 11, "2d10+6", "piercing"], ["Poison Breath", 11, "10d8", "poison", 1]], beh: "brute" },
  "Adult Blue Dragon": { hp: 225, ac: 19, xp: 15000, type: "dragon", mods: { STR: 7, CON: 6, WIS: 2 }, pp: 22, atk: [["Bite", 12, "2d10+7", "piercing"], ["Lightning Breath", 12, "12d10", "lightning", 1]], beh: "brute" },
  "Iron Golem": { hp: 210, ac: 20, xp: 15000, type: "construct", mods: { STR: 7, CON: 5 }, pp: 10, atk: [["Slam", 13, "3d8+7", "bludgeoning"], ["Poison Breath", 13, "10d8", "poison", 1]], beh: "brute" },
  "Death Knight": { hp: 180, ac: 20, xp: 15000, type: "undead", mods: { STR: 5, CON: 5, CHA: 5 }, pp: 13, atk: [["Longsword", 11, "3d8+5", "slashing"], ["Hellfire Orb", 11, "10d6", "fire", 1]], beh: "brute" },
  "Adult Red Dragon": { hp: 256, ac: 19, xp: 18000, type: "dragon", mods: { STR: 8, CON: 7, WIS: 2 }, pp: 23, atk: [["Bite", 14, "2d10+8", "piercing"], ["Fire Breath", 14, "12d6", "fire", 1]], beh: "brute" },
  "Balor": { hp: 262, ac: 19, xp: 22000, type: "fiend", mods: { STR: 8, CON: 6, CHA: 6 }, pp: 13, atk: [["Longsword", 14, "3d8+8", "slashing"], ["Whip", 14, "2d6+8", "slashing", 1]], beh: "brute" },
  "Lich": { hp: 135, ac: 17, xp: 33000, type: "undead", mods: { INT: 5, WIS: 2, CON: 3 }, pp: 19, atk: [["Paralyzing Touch", 12, "3d6", "cold"], ["Finger of Death", 12, "7d8+30", "necrotic", 1]], beh: "brute" },
});
// epic tiers for every encounter theme (tier 4: levels 11-16, tier 5: 17-20)
const EPIC_POOLS = { goblin: [["Hill Giant", "Ogre"], ["Fire Giant", "Frost Giant"]], undead: [["Vampire Spawn", "Mummy Lord", "Wight"], ["Vampire", "Death Knight", "Mummy Lord"]], bandit: [["Veteran", "Hill Giant"], ["Death Knight", "Fire Giant"]], cult: [["Mummy Lord", "Vampire Spawn"], ["Death Knight", "Balor"]], beast: [["Frost Giant", "Hill Giant"], ["Adult Green Dragon", "Fire Giant"]], giant: [["Frost Giant", "Hill Giant"], ["Fire Giant", "Stone Golem"]], dragon: [["Adult Green Dragon", "Stone Golem"], ["Adult Blue Dragon", "Adult Red Dragon"]], swamp: [["Adult Green Dragon", "Mummy Lord"], ["Beholder", "Adult Green Dragon"]] };
const EPIC_BOSSES = [["Vampire", "Adult Green Dragon", "Beholder", "Stone Golem"], ["Lich", "Adult Red Dragon", "Balor", "Iron Golem", "Death Knight"]];
for (const [k, th] of Object.entries(THEMES)){ const extra = EPIC_POOLS[k] || [["Hill Giant", "Stone Golem"], ["Fire Giant", "Death Knight"]];
  while (th.pools.length < 4) th.pools.push(th.pools[th.pools.length - 1]);
  th.pools[4] = [...extra[0], ...(th.pools[3] || []).slice(0, 1)]; th.pools[5] = extra[1];
  if (Array.isArray(th.bosses)) th.bosses.push(...EPIC_BOSSES[0].slice(0, 2)); }
// epic treasure
MAGIC_ITEMS.push(
  [3, { name: "Potion of Supreme Healing", type: "potion", heal: "10d4+20", rarity: "very rare", value: 1350, description: "Glows like a sunrise in a bottle." }],
  [3, { name: "Ring of Protection +2", type: "ring", ac_bonus: 2, save_bonus: 2, rarity: "very rare", value: 4000, description: "A band of starlight that turns blows aside." }],
  [3, { name: "Staff of Power", type: "amulet", spell_attack_bonus: 2, save_bonus: 2, ac_bonus: 2, rarity: "very rare", value: 9000, description: "Thrumming with stored lightning and will." }],
  [4, { name: "Robe of the Archmagi", type: "cloak", ac_bonus: 3, spell_attack_bonus: 2, save_bonus: 2, rarity: "legendary", value: 25000, description: "Woven from the night sky by a wizard long gone." }],
  [4, { name: "Cloak of Invulnerability", type: "cloak", ac_bonus: 2, save_bonus: 3, resist: ["slashing", "piercing", "bludgeoning"], rarity: "legendary", value: 30000, description: "Blades slide off it like rain." }]);
</script>
