<script>
"use strict";
/* =========================================================================
   THE UNWRITTEN ROAD — a browser tabletop RPG with an AI Dungeon Master
   Architecture:  DATA → RULES (pure) → STORE/PERSIST → DM (AI) → COMBAT → UI
   Multiplayer seam: a campaign holds `characters{}` + `partyIds[]`; every
   log entry and combatant carries an actor/ref id, so shared play later means
   moving the campaign doc to a shared path and syncing turns over `room`.
   ========================================================================= */
const ABILS = ["STR","DEX","CON","INT","WIS","CHA"];
const ABIL_NAME = {STR:"Strength",DEX:"Dexterity",CON:"Constitution",INT:"Intelligence",WIS:"Wisdom",CHA:"Charisma"};
const SKILLS = {"Acrobatics":"DEX","Animal Handling":"WIS","Arcana":"INT","Athletics":"STR","Deception":"CHA","History":"INT","Insight":"WIS","Intimidation":"CHA","Investigation":"INT","Medicine":"WIS","Nature":"INT","Perception":"WIS","Performance":"CHA","Persuasion":"CHA","Religion":"INT","Sleight of Hand":"DEX","Stealth":"DEX","Survival":"WIS"};
const XP_TABLE = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000];
const MAX_LEVEL = 20;
const ALIGNMENTS = ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"];

const RACES = {
  "Human":{bonus:{STR:1,DEX:1,CON:1,INT:1,WIS:1,CHA:1},speed:30,desc:"Restless and ambitious, humans are found in every city, farmstead and ruin of the realm.",traits:["Versatile: +1 to every ability score."]},
  "Elf":{bonus:{DEX:2,INT:1},speed:30,skills:["Perception"],desc:"Long-lived and graceful, elves carry centuries of memory and a quiet disdain for haste.",traits:["Darkvision: you see in dim light as if bright.","Keen Senses: proficient in Perception.","Fey Ancestry: advantage on saves against being charmed; magic can't put you to sleep."]},
  "Dwarf":{bonus:{CON:2,WIS:1},speed:25,resist:["poison"],hpPerLevel:1,desc:"Stout, stubborn and hard as the mountains that birthed them.",traits:["Darkvision.","Dwarven Resilience: advantage on saves against poison; resistance to poison damage.","Dwarven Toughness: +1 hit point per level."]},
  "Halfling":{bonus:{DEX:2,CHA:1},speed:25,lucky:true,desc:"Small, cheerful and uncannily fortunate, halflings slip through danger that flattens bigger folk.",traits:["Lucky: when you roll a natural 1 on a d20, reroll it once.","Brave: advantage on saves against being frightened.","Nimble: move through the space of larger creatures."]},
  "Dragonborn":{bonus:{STR:2,CHA:1},speed:30,breath:true,desc:"Proud scions of dragons, with scaled hides and the fire of their ancestors in their lungs.",traits:["Draconic Ancestry: resistance to your ancestry's damage type.","Breath Weapon: exhale energy at your foes (DEX save, 2d6; 3d6 at level 6), once per short rest."]},
  "Gnome":{bonus:{INT:2,CON:1},speed:25,desc:"Curious tinkerers and tricksters whose minds burn bright and quick.",traits:["Darkvision.","Gnome Cunning: advantage on Intelligence, Wisdom and Charisma saving throws."]},
  "Half-Elf":{bonus:{CHA:2,DEX:1,WIS:1},speed:30,extraSkills:2,desc:"Caught between two worlds, half-elves are diplomats, wanderers and born charmers.",traits:["Darkvision.","Fey Ancestry: advantage on saves against being charmed.","Skill Versatility: proficiency in two skills of your choice."]},
  "Half-Orc":{bonus:{STR:2,CON:1},speed:30,skills:["Intimidation"],relentless:true,savage:true,desc:"Fierce and enduring, half-orcs are remembered for refusing to fall.",traits:["Darkvision.","Menacing: proficient in Intimidation.","Relentless Endurance: once per long rest, drop to 1 HP instead of 0.","Savage Attacks: roll one extra weapon die on a melee critical hit."]},
  "Tiefling":{bonus:{CHA:2,INT:1},speed:30,resist:["fire"],cantrip:"Thaumaturgy",desc:"Marked by an infernal bloodline, tieflings meet suspicion with wit and cold resolve.",traits:["Darkvision.","Hellish Resistance: resistance to fire damage.","Infernal Legacy: you know the Thaumaturgy cantrip."]}
};
const DRAGON_TYPES = {Red:"fire",Gold:"fire",Brass:"fire",Blue:"lightning",Bronze:"lightning",White:"cold",Silver:"cold",Black:"acid",Copper:"acid",Green:"poison"};

const FIGHTING_STYLES = {
  "Archery":"+2 to attack rolls with ranged weapons.",
  "Defense":"+1 AC while wearing armor.",
  "Dueling":"+2 damage with a one-handed melee weapon and no other weapon.",
  "Great Weapon Fighting":"Reroll 1s and 2s on damage dice with two-handed melee weapons.",
  "Two-Weapon Fighting":"Add your ability modifier to the damage of your off-hand attack."
};
const INVOCATIONS = {
  "Agonizing Blast":"Add your Charisma modifier to Eldritch Blast damage.",
  "Armor of Shadows":"Mage Armor on yourself at will (AC 13 + DEX while unarmored).",
  "Fiendish Vigor":"Out of combat, grant yourself 1d4+4 temporary HP at will.",
  "Devil's Sight":"See normally in darkness, magical or not, out to 120 feet.",
  "Mask of Many Faces":"Cast Disguise Self at will.",
  "Beast Speech":"Speak with animals at will."
};
const FEATS = {
  "Tough":"+2 maximum HP per character level.",
  "Alert":"+5 to initiative; you can't be surprised.",
  "Lucky":"3 luck points per long rest; spend one to roll a d20 with advantage.",
  "Great Weapon Master":"Heavy melee weapons: take -5 to hit for +10 damage (toggle in combat).",
  "Sharpshooter":"Ranged weapons: take -5 to hit for +10 damage (toggle in combat).",
  "War Caster":"Advantage on Constitution saves to keep concentration.",
  "Resilient (CON)":"+1 Constitution and proficiency in Constitution saving throws."
};

// caster: {ab, type: full|half|pact, from}
const CLASSES = {
  "Barbarian":{hd:12,saves:["STR","CON"],armor:["light","medium","shield"],weapons:"martial",skills:[2,["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"]],prim:"STR",
    desc:"A storm of muscle and fury. Rage turns wounds into fuel and every swing into a landslide.",
    kits:[{n:"Greataxe & handaxes",i:["Greataxe","Handaxe","Handaxe","Javelin","Javelin","Explorer's Pack"]},{n:"Greatsword & javelins",i:["Greatsword","Javelin","Javelin","Javelin","Explorer's Pack"]}],gold:12,
    array:{STR:15,CON:14,DEX:13,WIS:12,CHA:10,INT:8},
    subs:[{n:"Path of the Berserker",m:{frenzy:1},d:"While raging, make one extra weapon attack as a bonus action each turn."},{n:"Path of the Totem Warrior",m:{totemBear:1},d:"Bear spirit: while raging you resist every damage type except psychic."}],
    feats:{1:["Rage","Unarmored Defense"],2:["Reckless Attack"],3:["Primal Path"],4:["Ability Score Improvement"],5:["Extra Attack"],6:["Path Feature"],7:["Feral Instinct"],8:["Ability Score Improvement"],9:["Brutal Critical"],10:["Path Feature"]}},
  "Bard":{hd:8,saves:["DEX","CHA"],armor:["light"],weapons:["simple","Longsword","Rapier","Shortsword"],skills:[3,Object.keys(SKILLS)],prim:"CHA",caster:{ab:"CHA",type:"full",from:1},
    desc:"A weaver of song and story whose words mend allies and unravel enemies.",
    kits:[{n:"Rapier & lute",i:["Rapier","Leather Armor","Dagger","Lute","Entertainer's Pack"]},{n:"Longsword & lute",i:["Longsword","Leather Armor","Dagger","Lute","Diplomat's Pack"]}],gold:15,
    array:{CHA:15,DEX:14,CON:13,WIS:12,INT:10,STR:8},
    subs:[{n:"College of Lore",m:{cuttingWords:1},d:"Cutting Words: when an enemy's attack would hit you, spend Bardic Inspiration to make it miss (automatic)."},{n:"College of Valor",m:{valor:1},d:"Proficiency with medium armor and shields; Extra Attack at level 6."}],
    feats:{1:["Spellcasting","Bardic Inspiration"],2:["Jack of All Trades","Song of Rest"],3:["Bard College","Expertise"],4:["Ability Score Improvement"],5:["Font of Inspiration"],6:["College Feature"],8:["Ability Score Improvement"],10:["Expertise"]}},
  "Cleric":{hd:8,saves:["WIS","CHA"],armor:["light","medium","shield"],weapons:"simple",skills:[2,["History","Insight","Medicine","Persuasion","Religion"]],prim:"WIS",caster:{ab:"WIS",type:"full",from:1},
    desc:"A conduit for divine power who heals the faithful and burns the unholy.",
    kits:[{n:"Mace & scale mail",i:["Mace","Scale Mail","Shield","Light Crossbow","Holy Symbol","Priest's Pack"]},{n:"Mace & light kit",i:["Mace","Leather Armor","Shield","Light Crossbow","Holy Symbol","Explorer's Pack"]}],gold:15,
    array:{WIS:15,CON:14,STR:13,CHA:12,DEX:10,INT:8},
    subs:[{n:"Life Domain",m:{lifeHeal:1},d:"Disciple of Life: healing spells restore an extra 2 + spell level HP."},{n:"War Domain",m:{warPriest:1},d:"War Priest: make a weapon attack as a bonus action (Wisdom modifier times per long rest)."}],
    feats:{1:["Spellcasting"],2:["Channel Divinity: Turn Undead"],3:["Divine Domain"],4:["Ability Score Improvement"],5:["Destroy Undead"],6:["Channel Divinity (2/rest)"],8:["Ability Score Improvement","Divine Strike"],10:["Divine Intervention"]}},
  "Druid":{hd:8,saves:["INT","WIS"],armor:["light","medium","shield"],weapons:["Club","Dagger","Dart","Javelin","Mace","Quarterstaff","Scimitar","Spear"],skills:[2,["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"]],prim:"WIS",caster:{ab:"WIS",type:"full",from:1},
    desc:"A keeper of the old wild ways who calls storms and wears the shapes of beasts.",
    kits:[{n:"Scimitar & wooden shield",i:["Scimitar","Leather Armor","Shield","Druidic Focus","Explorer's Pack"]},{n:"Quarterstaff & javelins",i:["Quarterstaff","Leather Armor","Javelin","Javelin","Druidic Focus","Explorer's Pack"]}],gold:10,
    array:{WIS:15,CON:14,DEX:13,INT:12,CHA:10,STR:8},
    subs:[{n:"Circle of the Moon",m:{moon:1},d:"Wild Shape as a bonus action into mightier beasts (more HP, harder hits)."},{n:"Circle of the Land",m:{landRecovery:1},d:"Natural Recovery: recover spell slots during a short rest, once per day."}],
    feats:{1:["Druidic","Spellcasting"],2:["Wild Shape"],3:["Druid Circle"],4:["Ability Score Improvement"],6:["Circle Feature"],8:["Ability Score Improvement"],10:["Circle Feature"]}},
  "Fighter":{hd:10,saves:["STR","CON"],armor:["light","medium","heavy","shield"],weapons:"martial",skills:[2,["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"]],prim:"STR",
    desc:"A master of arms and armor. Relentless, disciplined, and very hard to kill.",
    kits:[{n:"Knight: chain & sword",i:["Chain Mail","Longsword","Shield","Light Crossbow","Explorer's Pack"]},{n:"Archer: leather & bow",i:["Leather Armor","Longbow","Shortsword","Shortsword","Explorer's Pack"]}],gold:15,
    array:{STR:15,CON:14,DEX:13,WIS:12,CHA:10,INT:8},
    subs:[{n:"Champion",m:{critRange:19},d:"Improved Critical: your weapon attacks score a critical hit on a roll of 19 or 20."},{n:"Battle Master",m:{battleDice:1},d:"Four d8 superiority dice per short rest; spend one on a hit to add it to damage."}],
    feats:{1:["Fighting Style","Second Wind"],2:["Action Surge"],3:["Martial Archetype"],4:["Ability Score Improvement"],5:["Extra Attack"],6:["Ability Score Improvement"],7:["Archetype Feature"],8:["Ability Score Improvement"],9:["Indomitable"],10:["Archetype Feature"]}},
  "Monk":{hd:8,saves:["STR","DEX"],armor:[],weapons:["simple","Shortsword"],skills:[2,["Acrobatics","Athletics","History","Insight","Religion","Stealth"]],prim:"DEX",
    desc:"A disciple of breath and motion whose body is the sharpest weapon.",
    kits:[{n:"Shortsword & darts",i:["Shortsword","Dart","Dart","Dart","Dart","Dart","Explorer's Pack"]},{n:"Quarterstaff & darts",i:["Quarterstaff","Dart","Dart","Dart","Dart","Dart","Explorer's Pack"]}],gold:6,
    array:{DEX:15,WIS:14,CON:13,STR:12,INT:10,CHA:8},
    subs:[{n:"Way of the Open Hand",m:{openHand:1},d:"Flurry of Blows hits can knock the target prone (DEX save)."},{n:"Way of Shadow",m:{shadowArts:1},d:"Slip into shadows as a bonus action for free, gaining advantage on your next attack."}],
    feats:{1:["Unarmored Defense","Martial Arts"],2:["Ki","Unarmored Movement"],3:["Monastic Tradition","Deflect Missiles"],4:["Ability Score Improvement","Slow Fall"],5:["Extra Attack","Stunning Strike"],6:["Ki-Empowered Strikes"],7:["Evasion"],8:["Ability Score Improvement"],10:["Purity of Body"]}},
  "Paladin":{hd:10,saves:["WIS","CHA"],armor:["light","medium","heavy","shield"],weapons:"martial",skills:[2,["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"]],prim:"STR",caster:{ab:"CHA",type:"half",from:2},
    desc:"A sworn champion whose oath turns steel into judgment and faith into light.",
    kits:[{n:"Sword & shield",i:["Longsword","Shield","Chain Mail","Javelin","Javelin","Holy Symbol","Priest's Pack"]},{n:"Greatsword",i:["Greatsword","Chain Mail","Javelin","Javelin","Holy Symbol","Explorer's Pack"]}],gold:15,
    array:{STR:15,CHA:14,CON:13,WIS:12,DEX:10,INT:8},
    subs:[{n:"Oath of Devotion",m:{sacredWeapon:1},d:"Sacred Weapon (Channel Divinity): add your Charisma modifier to attack rolls for 10 rounds."},{n:"Oath of Vengeance",m:{vowEnmity:1},d:"Vow of Enmity (Channel Divinity): advantage on attacks against one foe for 10 rounds."}],
    feats:{1:["Divine Sense","Lay on Hands"],2:["Fighting Style","Spellcasting","Divine Smite"],3:["Sacred Oath","Divine Health"],4:["Ability Score Improvement"],5:["Extra Attack"],6:["Aura of Protection"],8:["Ability Score Improvement"],10:["Aura of Courage"]}},
  "Ranger":{hd:10,saves:["STR","DEX"],armor:["light","medium","shield"],weapons:"martial",skills:[3,["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"]],prim:"DEX",caster:{ab:"WIS",type:"half",from:2},
    desc:"A hunter of the borderlands who reads the wild like a book and never misses twice.",
    kits:[{n:"Longbow & twin blades",i:["Leather Armor","Longbow","Shortsword","Shortsword","Explorer's Pack"]},{n:"Scale & spear",i:["Scale Mail","Spear","Shortbow","Explorer's Pack"]}],gold:12,
    array:{DEX:15,WIS:14,CON:13,STR:12,INT:10,CHA:8},
    subs:[{n:"Hunter",m:{colossus:1},d:"Colossus Slayer: once per turn, +1d8 damage to a creature that is already wounded."},{n:"Beast Master",m:{beastCompanion:1},d:"A loyal wolf companion fights at your side and grows with you."}],
    feats:{1:["Favored Enemy","Natural Explorer"],2:["Fighting Style","Spellcasting"],3:["Ranger Archetype","Primeval Awareness"],4:["Ability Score Improvement"],5:["Extra Attack"],6:["Favored Enemy Improvement"],8:["Ability Score Improvement","Land's Stride"],10:["Hide in Plain Sight"]}},
  "Rogue":{hd:8,saves:["DEX","INT"],armor:["light"],weapons:["simple","Longsword","Rapier","Shortsword"],skills:[4,["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"]],prim:"DEX",
    desc:"A specialist in shadows and precise violence who finds the gap in every armor.",
    kits:[{n:"Rapier & shortbow",i:["Rapier","Shortbow","Leather Armor","Dagger","Dagger","Thieves' Tools","Burglar's Pack"]},{n:"Twin shortswords",i:["Shortsword","Shortsword","Leather Armor","Dagger","Dagger","Thieves' Tools","Burglar's Pack"]}],gold:15,
    array:{DEX:15,CON:14,WIS:13,CHA:12,INT:10,STR:8},
    subs:[{n:"Assassin",m:{assassin:1},d:"Assassinate: advantage on attacks against any creature that hasn't taken a turn yet this combat."},{n:"Swashbuckler",m:{swash:1},d:"Rakish Audacity: Sneak Attack works whenever you face a single enemy."}],
    feats:{1:["Expertise","Sneak Attack","Thieves' Cant"],2:["Cunning Action"],3:["Roguish Archetype"],4:["Ability Score Improvement"],5:["Uncanny Dodge"],6:["Expertise"],7:["Evasion"],8:["Ability Score Improvement"],9:["Archetype Feature"],10:["Ability Score Improvement"]}},
  "Sorcerer":{hd:6,saves:["CON","CHA"],armor:[],weapons:["Dagger","Dart","Quarterstaff","Light Crossbow"],skills:[2,["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"]],prim:"CHA",caster:{ab:"CHA",type:"full",from:1},
    desc:"Magic runs in your blood, raw and wild, bending to will rather than study.",
    kits:[{n:"Crossbow & daggers",i:["Light Crossbow","Dagger","Dagger","Arcane Focus","Dungeoneer's Pack"]},{n:"Quarterstaff & daggers",i:["Quarterstaff","Dagger","Dagger","Arcane Focus","Explorer's Pack"]}],gold:10,
    array:{CHA:15,CON:14,DEX:13,WIS:12,INT:10,STR:8},
    subs:[{n:"Draconic Bloodline",m:{draconic:1},d:"+1 HP per level; unarmored AC of 13 + DEX."},{n:"Wild Magic",m:{wildMagic:1},d:"Casting a leveled spell has a chance to unleash an unpredictable surge."}],
    feats:{1:["Spellcasting"],2:["Font of Magic"],3:["Sorcerous Origin","Metamagic: Quickened Spell"],4:["Ability Score Improvement"],6:["Origin Feature"],8:["Ability Score Improvement"],10:["Metamagic"]}},
  "Warlock":{hd:8,saves:["WIS","CHA"],armor:["light"],weapons:"simple",skills:[2,["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"]],prim:"CHA",caster:{ab:"CHA",type:"pact",from:1},
    desc:"You made a bargain with something vast. It answered, and now it expects things.",
    kits:[{n:"Crossbow & leather",i:["Light Crossbow","Leather Armor","Dagger","Dagger","Arcane Focus","Scholar's Pack"]},{n:"Quarterstaff & leather",i:["Quarterstaff","Leather Armor","Dagger","Dagger","Arcane Focus","Dungeoneer's Pack"]}],gold:10,
    array:{CHA:15,CON:14,DEX:13,WIS:12,INT:10,STR:8},
    subs:[{n:"The Fiend",m:{fiend:1},d:"Dark One's Blessing: gain CHA + level temporary HP whenever you drop a foe to 0."},{n:"The Archfey",m:{feyPresence:1},d:"Fey Presence: once per short rest, force all foes to make a WIS save or be charmed for a round."}],
    feats:{1:["Pact Magic"],2:["Eldritch Invocations"],3:["Otherworldly Patron","Pact Boon"],4:["Ability Score Improvement"],6:["Patron Feature"],8:["Ability Score Improvement"],10:["Patron Feature"]}},
  "Wizard":{hd:6,saves:["INT","WIS"],armor:[],weapons:["Dagger","Dart","Quarterstaff","Light Crossbow"],skills:[2,["Arcana","History","Insight","Investigation","Medicine","Religion"]],prim:"INT",caster:{ab:"INT",type:"full",from:1},
    desc:"A scholar of the arcane whose spellbook holds answers to almost any problem.",
    kits:[{n:"Quarterstaff & scholar's pack",i:["Quarterstaff","Spellbook","Arcane Focus","Scholar's Pack"]},{n:"Dagger & explorer's pack",i:["Dagger","Spellbook","Component Pouch","Explorer's Pack"]}],gold:10,
    array:{INT:15,CON:14,DEX:13,WIS:12,CHA:10,STR:8},
    subs:[{n:"School of Evocation",m:{evoker:1},d:"Empowered Evocation: add your Intelligence modifier to the damage of evocation spells."},{n:"School of Abjuration",m:{abjurer:1},d:"Arcane Ward: a shimmering ward of temporary HP (2 × level + INT) after each long rest."}],
    feats:{1:["Spellcasting","Arcane Recovery"],2:["Arcane Study"],3:["Arcane Tradition"],4:["Ability Score Improvement"],6:["Tradition Feature"],8:["Ability Score Improvement"],10:["Tradition Feature"]}}
};
const FEATURE_TEXT = {
  "Arcane Study":"Your spellbook grows: you learn two new spells.",
  "Rage":"Bonus action. +2 melee damage (STR), resistance to bludgeoning, piercing and slashing, advantage on STR checks and saves. Lasts 10 rounds.",
  "Unarmored Defense":"Without armor, your AC adds a second ability modifier (CON for Barbarians, WIS for Monks).",
  "Reckless Attack":"Attack with advantage this turn; enemies have advantage against you until your next turn.",
  "Extra Attack":"Attack twice when you take the Attack action.",
  "Feral Instinct":"Advantage on initiative rolls.","Brutal Critical":"Roll one extra weapon die on critical hits.",
  "Bardic Inspiration":"Bonus action: grant an inspiration die that adds to your (or a companion's) next d20 roll. House rule for solo play: you may inspire yourself.",
  "Jack of All Trades":"Add half your proficiency bonus to ability checks you aren't proficient in.",
  "Song of Rest":"Short rests heal you an extra 1d6.","Expertise":"Double proficiency on two chosen skills.",
  "Font of Inspiration":"Bardic Inspiration returns on a short rest and uses a d8.",
  "Channel Divinity: Turn Undead":"Action: undead foes must make a WIS save or be turned (frightened, skip turns) for 10 rounds.",
  "Destroy Undead":"Turned undead of low strength are destroyed outright.","Divine Strike":"Once per turn, +1d8 damage on a weapon hit.",
  "Divine Intervention":"Call on your deity for aid (ask the DM).",
  "Wild Shape":"Take a beast form: gain temporary HP and natural attacks until the form drops or you revert.",
  "Fighting Style":"A combat specialty chosen at creation or when gained.","Second Wind":"Bonus action: regain 1d10 + fighter level HP. Once per short rest.",
  "Action Surge":"Take one additional action on your turn. Once per short rest.","Indomitable":"Reroll a failed saving throw (automatic), once per long rest.",
  "Martial Arts":"Use DEX for unarmed strikes and monk weapons; after attacking, make an unarmed strike as a bonus action.",
  "Ki":"Spend ki (level points per short rest) for Flurry of Blows, Patient Defense and Step of the Wind.",
  "Stunning Strike":"When you hit, spend 1 ki: the target makes a CON save or is stunned until the end of your next turn.",
  "Evasion":"DEX saves for half damage deal no damage on a success.",
  "Lay on Hands":"A pool of healing equal to 5 × paladin level. Action: restore HP from the pool.",
  "Divine Smite":"When you hit with a melee weapon, spend a spell slot to deal +2d8 radiant (+1d8 per slot level above 1st, +1d8 vs undead).",
  "Aura of Protection":"Add your Charisma modifier to all your saving throws.","Divine Sense":"Sense celestials, fiends and undead nearby.",
  "Favored Enemy":"Advantage on Survival checks to track and on recalling lore about your chosen quarry.","Natural Explorer":"You can't become lost in the wilds by nonmagical means.",
  "Sneak Attack":"Once per turn, deal extra damage when you have advantage, a companion flanks the foe, or the foe is hampered.",
  "Cunning Action":"Dash, Disengage or Hide as a bonus action.","Uncanny Dodge":"Halve the damage of the first attack that hits you each round (automatic).",
  "Arcane Recovery":"Once per day on a short rest, recover spell slots totaling half your level (rounded up).",
  "Font of Magic":"Sorcery points (one per level) that can become spell slots.","Metamagic: Quickened Spell":"Spend 2 sorcery points to cast an action spell as a bonus action.",
  "Pact Magic":"Few spell slots, always cast at your highest level, and they return on a short rest.","Eldritch Invocations":"Occult fragments of power chosen as you level.",
  "Spellcasting":"Cast spells from your list using your spellcasting ability."
};

const BACKGROUNDS = {
  "Acolyte":{skills:["Insight","Religion"],gold:15,feat:"Shelter of the Faithful: temples of your faith offer you aid and a bed.",item:"Prayer Beads"},
  "Charlatan":{skills:["Deception","Sleight of Hand"],gold:15,feat:"False Identity: a second identity with papers and contacts.",item:"Disguise Kit"},
  "Criminal":{skills:["Deception","Stealth"],gold:15,feat:"Criminal Contact: a reliable link to the underworld.",item:"Crowbar"},
  "Entertainer":{skills:["Acrobatics","Performance"],gold:15,feat:"By Popular Demand: you can always find a stage and a free meal.",item:"Admirer's Favor"},
  "Folk Hero":{skills:["Animal Handling","Survival"],gold:10,feat:"Rustic Hospitality: common folk shelter and hide you.",item:"Shovel"},
  "Guild Artisan":{skills:["Insight","Persuasion"],gold:15,feat:"Guild Membership: your guild offers lodging and connections.",item:"Artisan's Tools"},
  "Hermit":{skills:["Medicine","Religion"],gold:5,feat:"Discovery: in seclusion you uncovered a secret truth.",item:"Herbalism Kit"},
  "Noble":{skills:["History","Persuasion"],gold:25,feat:"Position of Privilege: high society welcomes you.",item:"Signet Ring"},
  "Outlander":{skills:["Athletics","Survival"],gold:10,feat:"Wanderer: you always find food and water in the wild.",item:"Hunting Trap"},
  "Sage":{skills:["Arcana","History"],gold:10,feat:"Researcher: you know where to find lost knowledge.",item:"Ink and Quill"},
  "Soldier":{skills:["Athletics","Intimidation"],gold:10,feat:"Military Rank: soldiers recognize your authority.",item:"Rank Insignia"},
  "Urchin":{skills:["Sleight of Hand","Stealth"],gold:10,feat:"City Secrets: you know the hidden alleys of any city.",item:"Lucky Charm"}
};

// ---- Items -------------------------------------------------------------
// weapons: [dmg, type, props, cost, category]
const WEAPONS = {
  "Club":["1d4","bludgeoning",["light"],0.1,"simple"],"Dagger":["1d4","piercing",["finesse","light","thrown"],2,"simple"],
  "Handaxe":["1d6","slashing",["light","thrown"],5,"simple"],"Javelin":["1d6","piercing",["thrown"],0.5,"simple"],
  "Mace":["1d6","bludgeoning",[],5,"simple"],"Quarterstaff":["1d6","bludgeoning",["versatile:1d8"],0.2,"simple"],
  "Spear":["1d6","piercing",["thrown","versatile:1d8"],1,"simple"],"Dart":["1d4","piercing",["finesse","thrown"],0.05,"simple"],
  "Light Crossbow":["1d8","piercing",["ranged","two-handed"],25,"simple"],"Shortbow":["1d6","piercing",["ranged","two-handed"],25,"simple"],
  "Scimitar":["1d6","slashing",["finesse","light"],25,"martial"],"Shortsword":["1d6","piercing",["finesse","light"],10,"martial"],
  "Rapier":["1d8","piercing",["finesse"],25,"martial"],"Longsword":["1d8","slashing",["versatile:1d10"],15,"martial"],
  "Battleaxe":["1d8","slashing",["versatile:1d10"],10,"martial"],"Warhammer":["1d8","bludgeoning",["versatile:1d10"],15,"martial"],
  "Morningstar":["1d8","piercing",[],15,"martial"],"Flail":["1d8","bludgeoning",[],10,"martial"],"Whip":["1d4","slashing",["finesse","reach"],2,"martial"],
  "Greataxe":["1d12","slashing",["heavy","two-handed"],30,"martial"],"Greatsword":["2d6","slashing",["heavy","two-handed"],50,"martial"],
  "Maul":["2d6","bludgeoning",["heavy","two-handed"],10,"martial"],"Glaive":["1d10","slashing",["heavy","reach","two-handed"],20,"martial"],
  "Longbow":["1d8","piercing",["ranged","heavy","two-handed"],50,"martial"],"Heavy Crossbow":["1d10","piercing",["ranged","heavy","two-handed"],50,"martial"]
};
// armor: [type, base, cost, strReq, stealthDis]
const ARMORS = {
  "Padded Armor":["light",11,5,0,1],"Leather Armor":["light",11,10,0,0],"Studded Leather":["light",12,45,0,0],
  "Hide Armor":["medium",12,10,0,0],"Chain Shirt":["medium",13,50,0,0],"Scale Mail":["medium",14,50,0,1],"Breastplate":["medium",14,400,0,0],"Half Plate":["medium",15,750,0,1],
  "Ring Mail":["heavy",14,30,0,1],"Chain Mail":["heavy",16,75,13,1],"Splint Armor":["heavy",17,200,15,1],"Plate Armor":["heavy",18,1500,15,1]
};
const GEAR = {
  "Explorer's Pack":["gear",10,"Bedroll, mess kit, torches, rations, waterskin and rope."],"Burglar's Pack":["gear",16,"Ball bearings, string, bell, candles, crowbar, lantern, rope."],
  "Dungeoneer's Pack":["gear",12,"Crowbar, hammer, pitons, torches, tinderbox, rations, rope."],"Scholar's Pack":["gear",40,"A book of lore, ink, pen, parchment, sand and a small knife."],
  "Diplomat's Pack":["gear",39,"Fine clothes, ink, parchment, perfume, sealing wax, soap."],"Entertainer's Pack":["gear",40,"Costumes, candles, rations, a disguise kit."],
  "Priest's Pack":["gear",19,"Candles, alms box, incense, vestments, rations."],"Thieves' Tools":["tool",25,"Picks and files for locks and traps."],
  "Holy Symbol":["focus",5,"A sacred emblem used to channel divine magic."],"Arcane Focus":["focus",10,"A crystal or wand that channels arcane power."],
  "Druidic Focus":["focus",1,"A sprig of mistletoe or yew wand."],"Component Pouch":["focus",25,"Pouches of spell components."],
  "Spellbook":["book",50,"Your precious record of arcane formulae."],"Lute":["tool",35,"A well-loved instrument."],
  "Torch":["gear",0.01,"Burns for an hour."],"Rope (50 ft)":["gear",1,"Hempen rope."],"Rations":["gear",0.5,"A day of dried food."],
  "Antitoxin":["potion",50,"Drink to end the poisoned condition."],"Healer's Kit":["tool",5,"Bandages and salves; stabilize a dying creature."]
};
const POTIONS = {
  "Potion of Healing":{heal:"2d4+2",value:50,rarity:"common"},"Potion of Greater Healing":{heal:"4d4+4",value:150,rarity:"uncommon"},
  "Potion of Superior Healing":{heal:"8d4+8",value:500,rarity:"rare"},"Goodberry":{heal:"1",value:0,rarity:"common"}
};

// ---- Spells --------------------------------------------------------------
// classes: B bard C cleric D druid P paladin R ranger S sorcerer K warlock W wizard
// m.k: atk | save | auto | heal | cond | buff | zone | summon | weapon | smite | react | restore | berry | utility
const SPELLS = [
 // cantrips
 {n:"Fire Bolt",l:0,s:"Evocation",c:"SW",m:{k:"atk",dmg:"1d10",t:"fire"},d:"Hurl a mote of fire. Ranged spell attack."},
 {n:"Ray of Frost",l:0,s:"Evocation",c:"SW",m:{k:"atk",dmg:"1d8",t:"cold"},d:"A frigid beam. Ranged spell attack."},
 {n:"Shocking Grasp",l:0,s:"Evocation",c:"SW",m:{k:"atk",dmg:"1d8",t:"lightning",melee:1},d:"Lightning springs from your hand. Melee spell attack."},
 {n:"Chill Touch",l:0,s:"Necromancy",c:"SKW",m:{k:"atk",dmg:"1d8",t:"necrotic"},d:"A ghostly hand grips the target. Ranged spell attack."},
 {n:"Acid Splash",l:0,s:"Conjuration",c:"SW",m:{k:"save",save:"DEX",dmg:"1d6",t:"acid",tgt:2},d:"A bubble of acid bursts over up to two foes. DEX save."},
 {n:"Poison Spray",l:0,s:"Conjuration",c:"DSKW",m:{k:"save",save:"CON",dmg:"1d12",t:"poison"},d:"A puff of noxious gas. CON save."},
 {n:"Eldritch Blast",l:0,s:"Evocation",c:"K",m:{k:"atk",dmg:"1d10",t:"force",beams:1},d:"A crackling beam of force. More beams at levels 5 and 11."},
 {n:"Sacred Flame",l:0,s:"Evocation",c:"C",m:{k:"save",save:"DEX",dmg:"1d8",t:"radiant"},d:"Radiance descends on a foe. DEX save, no cover helps."},
 {n:"Toll the Dead",l:0,s:"Necromancy",c:"CKW",m:{k:"save",save:"WIS",dmg:"1d8",t:"necrotic",toll:1},d:"A dolorous bell. WIS save; d12 damage if the target is wounded."},
 {n:"Vicious Mockery",l:0,s:"Enchantment",c:"B",m:{k:"save",save:"WIS",dmg:"1d4",t:"psychic",mock:1},d:"A cutting insult laced with magic. WIS save; the target has disadvantage on its next attack."},
 {n:"Produce Flame",l:0,s:"Conjuration",c:"D",m:{k:"atk",dmg:"1d8",t:"fire"},d:"Flame flickers in your palm, then flies. Ranged spell attack."},
 {n:"Thorn Whip",l:0,s:"Transmutation",c:"D",m:{k:"atk",dmg:"1d6",t:"piercing",melee:1},d:"A thorny vine lashes out. Melee spell attack."},
 {n:"Guidance",l:0,s:"Divination",c:"CD",m:{k:"buff",buff:"guided",self:1},d:"Add 1d4 to your next ability check."},
 {n:"Thaumaturgy",l:0,s:"Transmutation",c:"C",m:{k:"utility"},d:"Minor wonders: booming voice, flickering flames, tremors."},
 {n:"Druidcraft",l:0,s:"Transmutation",c:"D",m:{k:"utility"},d:"Whisper to the natural world: predict weather, bloom flowers."},
 {n:"Light",l:0,s:"Evocation",c:"BCSW",m:{k:"utility"},d:"An object sheds bright light for an hour."},
 {n:"Mage Hand",l:0,s:"Conjuration",c:"BSKW",m:{k:"utility"},d:"A spectral hand manipulates objects at range."},
 {n:"Minor Illusion",l:0,s:"Illusion",c:"BSKW",m:{k:"utility"},d:"Create a sound or small image."},
 {n:"Prestidigitation",l:0,s:"Transmutation",c:"BSKW",m:{k:"utility"},d:"Small magical tricks: clean, chill, flavor, spark."},
 // level 1
 {n:"Magic Missile",l:1,s:"Evocation",c:"SW",m:{k:"auto",darts:3,each:"1d4+1",t:"force"},d:"Three unerring darts of force (one more per slot level)."},
 {n:"Burning Hands",l:1,s:"Evocation",c:"SW",m:{k:"save",save:"DEX",dmg:"3d6",t:"fire",half:1,tgt:3,up:"1d6"},d:"A fan of flame hits up to three foes. DEX save for half."},
 {n:"Thunderwave",l:1,s:"Evocation",c:"BDSW",m:{k:"save",save:"CON",dmg:"2d8",t:"thunder",half:1,tgt:2,up:"1d8"},d:"A wave of force hits up to two foes. CON save for half."},
 {n:"Chromatic Orb",l:1,s:"Evocation",c:"SW",m:{k:"atk",dmg:"3d8",t:"fire",up:"1d8"},d:"An orb of elemental energy. Ranged spell attack."},
 {n:"Sleep",l:1,s:"Enchantment",c:"BSW",m:{k:"cond",pool:"5d8",upPool:"2d8",cond:"asleep",rounds:10},d:"Roll 5d8: foes with the lowest HP fall asleep until damaged."},
 {n:"Shield",l:1,s:"Abjuration",c:"SW",m:{k:"react",react:"shield"},d:"Reaction (automatic): +5 AC against an attack that would hit you."},
 {n:"Mage Armor",l:1,s:"Abjuration",c:"SW",m:{k:"buff",buff:"mage-armor",self:1,long:1},d:"Your AC becomes 13 + DEX until your next long rest (no armor)."},
 {n:"Cure Wounds",l:1,s:"Evocation",c:"BCDPR",m:{k:"heal",heal:"1d8",mod:1,up:"1d8"},d:"A touch restores 1d8 + modifier HP."},
 {n:"Healing Word",l:1,s:"Evocation",c:"BCD",m:{k:"heal",heal:"1d4",mod:1,up:"1d4",bonus:1},d:"Bonus action: a word restores 1d4 + modifier HP."},
 {n:"Guiding Bolt",l:1,s:"Evocation",c:"C",m:{k:"atk",dmg:"4d6",t:"radiant",up:"1d6",guiding:1},d:"A flash of light; the next attack against the target has advantage."},
 {n:"Inflict Wounds",l:1,s:"Necromancy",c:"C",m:{k:"atk",dmg:"3d10",t:"necrotic",up:"1d10",melee:1},d:"A touch of rot. Melee spell attack."},
 {n:"Bless",l:1,s:"Enchantment",c:"CP",m:{k:"buff",buff:"blessed",party:1,conc:1,rounds:10},d:"You and your companions add 1d4 to attack rolls and saves."},
 {n:"Shield of Faith",l:1,s:"Abjuration",c:"CP",m:{k:"buff",buff:"shield-of-faith",self:1,conc:1,rounds:10,bonus:1},d:"Bonus action: +2 AC for 10 rounds."},
 {n:"Hex",l:1,s:"Enchantment",c:"K",m:{k:"buff",buff:"hex",mark:1,conc:1,bonus:1},d:"Bonus action: curse a foe; your hits deal +1d6 necrotic to it."},
 {n:"Hunter's Mark",l:1,s:"Divination",c:"R",m:{k:"buff",buff:"hunters-mark",mark:1,conc:1,bonus:1},d:"Bonus action: mark a foe; your weapon hits deal +1d6 to it."},
 {n:"Hellish Rebuke",l:1,s:"Evocation",c:"K",m:{k:"react",react:"rebuke",dmg:"2d10",t:"fire",up:"1d10"},d:"Reaction (automatic): when damaged, the attacker makes a DEX save or takes 2d10 fire."},
 {n:"Armor of Agathys",l:1,s:"Abjuration",c:"K",m:{k:"buff",buff:"agathys",self:1},d:"Gain 5 temp HP per slot level; melee attackers take that much cold damage while it lasts."},
 {n:"Dissonant Whispers",l:1,s:"Enchantment",c:"B",m:{k:"save",save:"WIS",dmg:"3d6",t:"psychic",half:1,up:"1d6"},d:"A maddening melody. WIS save for half."},
 {n:"Faerie Fire",l:1,s:"Evocation",c:"BD",m:{k:"cond",save:"DEX",cond:"outlined",tgt:4,rounds:10,conc:1},d:"Foes glow; attacks against them have advantage. DEX save."},
 {n:"Entangle",l:1,s:"Conjuration",c:"D",m:{k:"cond",save:"STR",cond:"restrained",tgt:3,rounds:10,repeat:1,conc:1},d:"Grasping weeds restrain up to three foes. STR save, repeated each turn."},
 {n:"Tasha's Hideous Laughter",l:1,s:"Enchantment",c:"BW",m:{k:"cond",save:"WIS",cond:"laughing",tgt:1,rounds:10,repeat:1,conc:1},d:"A foe collapses in laughter, unable to act. WIS save, repeated each turn."},
 {n:"Charm Person",l:1,s:"Enchantment",c:"BDSKW",m:{k:"cond",save:"WIS",cond:"charmed",tgt:1,rounds:10,endsOnDamage:1},d:"A humanoid regards you as a friend. WIS save. Out of combat: social magic."},
 {n:"Heroism",l:1,s:"Enchantment",c:"BP",m:{k:"buff",buff:"heroism",self:1,conc:1,rounds:10},d:"Gain temporary HP equal to your modifier at the start of each of your turns."},
 {n:"Divine Favor",l:1,s:"Evocation",c:"P",m:{k:"buff",buff:"divine-favor",self:1,conc:1,rounds:10,bonus:1},d:"Bonus action: your weapon hits deal +1d4 radiant."},
 {n:"Goodberry",l:1,s:"Transmutation",c:"DR",m:{k:"berry"},d:"Ten magical berries, each restoring 1 HP."},
 {n:"Detect Magic",l:1,s:"Divination",c:"BCDPRSW",m:{k:"utility"},d:"Sense magic within 30 feet for 10 minutes."},
 {n:"Disguise Self",l:1,s:"Illusion",c:"BSW",m:{k:"utility"},d:"Change your appearance for an hour."},
 {n:"Identify",l:1,s:"Divination",c:"BW",m:{k:"utility"},d:"Learn the properties of a magic item."},
 {n:"Feather Fall",l:1,s:"Transmutation",c:"BSW",m:{k:"utility"},d:"Falling creatures drift down gently."},
 {n:"Comprehend Languages",l:1,s:"Divination",c:"BSKW",m:{k:"utility"},d:"Understand any spoken or written language for an hour."},
 {n:"Speak with Animals",l:1,s:"Divination",c:"BDR",m:{k:"utility"},d:"Converse with beasts for 10 minutes."},
 // level 2
 {n:"Scorching Ray",l:2,s:"Evocation",c:"SW",m:{k:"atk",dmg:"2d6",t:"fire",rays:3},d:"Three rays of fire (one more per slot level). Ranged spell attacks."},
 {n:"Shatter",l:2,s:"Evocation",c:"BSKW",m:{k:"save",save:"CON",dmg:"3d8",t:"thunder",half:1,tgt:3,up:"1d8"},d:"A ringing burst hits up to three foes. CON save for half."},
 {n:"Misty Step",l:2,s:"Conjuration",c:"SKW",m:{k:"buff",buff:"misty",self:1,bonus:1},d:"Bonus action: teleport 30 feet. In combat you slip free (escape without a check)."},
 {n:"Hold Person",l:2,s:"Enchantment",c:"BCDSKW",m:{k:"cond",save:"WIS",cond:"paralyzed",tgt:1,rounds:10,repeat:1,conc:1,humanoid:1},d:"A humanoid is paralyzed. WIS save, repeated each turn."},
 {n:"Spiritual Weapon",l:2,s:"Evocation",c:"C",m:{k:"weapon",dmg:"1d8",t:"force",rounds:10,bonus:1},d:"Bonus action: a floating weapon strikes each turn (bonus action)."},
 {n:"Moonbeam",l:2,s:"Evocation",c:"D",m:{k:"zone",save:"CON",dmg:"2d10",t:"radiant",half:1,tgt:1,rounds:10,conc:1,up:"1d10"},d:"A beam of pale light burns a foe at the start of each of its turns. CON save for half."},
 {n:"Flaming Sphere",l:2,s:"Conjuration",c:"DW",m:{k:"zone",save:"DEX",dmg:"2d6",t:"fire",half:1,tgt:1,rounds:10,conc:1,up:"1d6"},d:"A rolling ball of fire scorches a foe each round. DEX save for half."},
 {n:"Cloud of Daggers",l:2,s:"Conjuration",c:"BSKW",m:{k:"zone",dmg:"4d4",t:"slashing",tgt:1,rounds:10,conc:1,up:"2d4"},d:"Spinning daggers shred a foe at the start of each of its turns."},
 {n:"Invisibility",l:2,s:"Illusion",c:"BSKW",m:{k:"buff",buff:"invisible",self:1,conc:1},d:"You vanish until you attack or cast. Attacks against you have disadvantage; your next attack has advantage."},
 {n:"Blur",l:2,s:"Illusion",c:"SW",m:{k:"buff",buff:"blurred",self:1,conc:1,rounds:10},d:"Your form wavers; attacks against you have disadvantage."},
 {n:"Lesser Restoration",l:2,s:"Abjuration",c:"BCDPR",m:{k:"restore"},d:"End a disease or one condition: blinded, deafened, paralyzed or poisoned."},
 {n:"Aid",l:2,s:"Abjuration",c:"CP",m:{k:"buff",buff:"aid",self:1,long:1},d:"Your maximum and current HP rise by 5 until a long rest."},
 {n:"Prayer of Healing",l:2,s:"Evocation",c:"C",m:{k:"heal",heal:"2d8",mod:1,up:"1d8",party:1,noCombat:1},d:"Ten minutes of prayer heal you and your companions."},
 {n:"Barkskin",l:2,s:"Transmutation",c:"DR",m:{k:"buff",buff:"barkskin",self:1,conc:1,rounds:600},d:"Your skin turns bark-hard: AC can't be lower than 16."},
 {n:"Branding Smite",l:2,s:"Evocation",c:"P",m:{k:"smite",dmg:"2d6",t:"radiant",bonus:1},d:"Bonus action: your next weapon hit deals +2d6 radiant."},
 {n:"Suggestion",l:2,s:"Enchantment",c:"BSKW",m:{k:"utility"},d:"Magically influence a creature to follow a reasonable course of action."},
 {n:"Pass without Trace",l:2,s:"Abjuration",c:"DR",m:{k:"utility"},d:"+10 to Stealth checks for you and allies for an hour."},
 {n:"Knock",l:2,s:"Transmutation",c:"BSW",m:{k:"utility"},d:"A loud knock opens a lock."},
 {n:"Silence",l:2,s:"Illusion",c:"BCR",m:{k:"utility"},d:"A 20-foot sphere of utter silence."},
 // level 3
 {n:"Fireball",l:3,s:"Evocation",c:"SW",m:{k:"save",save:"DEX",dmg:"8d6",t:"fire",half:1,tgt:6,up:"1d6"},d:"A roaring explosion engulfs up to six foes. DEX save for half."},
 {n:"Lightning Bolt",l:3,s:"Evocation",c:"SW",m:{k:"save",save:"DEX",dmg:"8d6",t:"lightning",half:1,tgt:3,up:"1d6"},d:"A line of lightning strikes up to three foes. DEX save for half."},
 {n:"Spirit Guardians",l:3,s:"Conjuration",c:"C",m:{k:"zone",save:"WIS",dmg:"3d8",t:"radiant",half:1,all:1,rounds:10,conc:1,up:"1d8"},d:"Spirits swirl around you, searing every foe at the start of its turn. WIS save for half."},
 {n:"Mass Healing Word",l:3,s:"Evocation",c:"C",m:{k:"heal",heal:"1d4",mod:1,up:"1d4",party:1,bonus:1},d:"Bonus action: heal yourself and all companions."},
 {n:"Hypnotic Pattern",l:3,s:"Illusion",c:"BSKW",m:{k:"cond",save:"WIS",cond:"entranced",tgt:4,rounds:10,endsOnDamage:1,conc:1},d:"A twisting pattern of color entrances up to four foes until they're hurt."},
 {n:"Hunger of Hadar",l:3,s:"Conjuration",c:"K",m:{k:"zone",dmg:"2d6",t:"cold",tgt:3,rounds:10,conc:1},d:"A void of freezing darkness chills up to three foes each round."},
 {n:"Vampiric Touch",l:3,s:"Necromancy",c:"KW",m:{k:"atk",dmg:"3d6",t:"necrotic",melee:1,drain:1,up:"1d6"},d:"A shadowy touch; you regain half the damage dealt."},
 {n:"Call Lightning",l:3,s:"Conjuration",c:"D",m:{k:"save",save:"DEX",dmg:"3d10",t:"lightning",half:1,tgt:1,up:"1d10"},d:"A bolt from a storm cloud. DEX save for half."},
 {n:"Haste",l:3,s:"Transmutation",c:"SW",m:{k:"buff",buff:"hasted",self:1,conc:1,rounds:10},d:"+2 AC and one extra weapon attack each turn for 10 rounds."},
 {n:"Fear",l:3,s:"Illusion",c:"BSKW",m:{k:"cond",save:"WIS",cond:"frightened",tgt:4,rounds:10,repeat:1,conc:1},d:"Phantasmal terror frightens up to four foes."},
 {n:"Conjure Animals",l:3,s:"Conjuration",c:"DR",m:{k:"summon",what:"Spirit Wolf",count:2,rounds:10,conc:1},d:"Two spirit wolves appear and fight at your side for 10 rounds."},
 {n:"Crusader's Mantle",l:3,s:"Evocation",c:"P",m:{k:"buff",buff:"crusader",party:1,conc:1,rounds:10},d:"You and companions deal +1d4 radiant on weapon hits."},
 {n:"Revivify",l:3,s:"Necromancy",c:"CP",m:{k:"utility"},d:"Return a creature that died within the last minute to life."},
 {n:"Counterspell",l:3,s:"Abjuration",c:"SKW",m:{k:"utility"},d:"Interrupt a creature casting a spell."},
 {n:"Dispel Magic",l:3,s:"Abjuration",c:"BCDPSKW",m:{k:"utility"},d:"End spells on a creature, object or area."},
 {n:"Fly",l:3,s:"Transmutation",c:"SKW",m:{k:"utility"},d:"Gain a flying speed of 60 feet for 10 minutes."},
 {n:"Speak with Dead",l:3,s:"Necromancy",c:"BC",m:{k:"utility"},d:"Ask a corpse five questions."},
 {n:"Remove Curse",l:3,s:"Abjuration",c:"CPW",m:{k:"utility"},d:"End all curses on a creature."},
 // level 4
 {n:"Ice Storm",l:4,s:"Evocation",c:"DSW",m:{k:"save",save:"DEX",dmg:"2d8+4d6",t:"cold",half:1,tgt:4,up:"1d8"},d:"Hail pounds up to four foes. DEX save for half."},
 {n:"Blight",l:4,s:"Necromancy",c:"DSKW",m:{k:"save",save:"CON",dmg:"8d8",t:"necrotic",half:1,tgt:1,up:"1d8"},d:"Withering necromancy drains a foe. CON save for half."},
 {n:"Greater Invisibility",l:4,s:"Illusion",c:"BSW",m:{k:"buff",buff:"greater-invisible",self:1,conc:1,rounds:10},d:"Invisible even while attacking: advantage on attacks, disadvantage against you."},
 {n:"Polymorph",l:4,s:"Transmutation",c:"BDSW",m:{k:"cond",save:"WIS",cond:"polymorphed",tgt:1,rounds:10,endsOnDamage:1,conc:1},d:"Turn a foe into a harmless creature until it's hurt."},
 {n:"Banishment",l:4,s:"Abjuration",c:"CPSKW",m:{k:"cond",save:"CHA",cond:"banished",tgt:1,rounds:10,conc:1},d:"Send a foe to a harmless demiplane. CHA save."},
 {n:"Death Ward",l:4,s:"Abjuration",c:"CP",m:{k:"buff",buff:"death-ward",self:1,long:1},d:"The first time you would drop to 0 HP, you drop to 1 instead."},
 {n:"Stoneskin",l:4,s:"Abjuration",c:"DRSW",m:{k:"buff",buff:"stoneskin",self:1,conc:1,rounds:600},d:"Resistance to bludgeoning, piercing and slashing damage."},
 {n:"Dimension Door",l:4,s:"Conjuration",c:"BSKW",m:{k:"buff",buff:"misty",self:1},d:"Teleport up to 500 feet. In combat you slip free."},
 // level 5
 {n:"Cone of Cold",l:5,s:"Evocation",c:"SW",m:{k:"save",save:"CON",dmg:"8d8",t:"cold",half:1,tgt:5,up:"1d8"},d:"A blast of frost hits up to five foes. CON save for half."},
 {n:"Flame Strike",l:5,s:"Evocation",c:"C",m:{k:"save",save:"DEX",dmg:"8d6",t:"radiant",half:1,tgt:3,up:"1d6"},d:"A column of divine fire hits up to three foes. DEX save for half."},
 {n:"Mass Cure Wounds",l:5,s:"Evocation",c:"BCD",m:{k:"heal",heal:"3d8",mod:1,up:"1d8",party:1},d:"Heal yourself and every companion."},
 {n:"Hold Monster",l:5,s:"Enchantment",c:"BSKW",m:{k:"cond",save:"WIS",cond:"paralyzed",tgt:1,rounds:10,repeat:1,conc:1},d:"Any creature is paralyzed. WIS save, repeated each turn."},
 {n:"Insect Plague",l:5,s:"Conjuration",c:"CDS",m:{k:"zone",save:"CON",dmg:"4d10",t:"piercing",half:1,tgt:4,rounds:10,conc:1,up:"1d10"},d:"Biting locusts swarm up to four foes each round. CON save for half."},
 {n:"Synaptic Static",l:5,s:"Enchantment",c:"BSKW",m:{k:"save",save:"INT",dmg:"8d6",t:"psychic",half:1,tgt:5},d:"A psychic detonation hits up to five foes. INT save for half."},
 {n:"Greater Restoration",l:5,s:"Abjuration",c:"BCD",m:{k:"restore",all:1},d:"End every harmful condition affecting you."},
 {n:"Raise Dead",l:5,s:"Necromancy",c:"BCP",m:{k:"utility"},d:"Return a dead creature to life (ask the DM)."}
];
const SPELL = Object.fromEntries(SPELLS.map(s=>[s.n,s]));
const CLASS_LETTER = {Bard:"B",Cleric:"C",Druid:"D",Paladin:"P",Ranger:"R",Sorcerer:"S",Warlock:"K",Wizard:"W"};

// ---- Bestiary (own stat lines, 5e-style) ----------------------------------
// hp, ac, xp, type, mods{}, pp, atk:[name,toHit,dmg,type,ranged?,rider?], multi:[names], abil:[...], traits{}
const BESTIARY = {
  "Giant Rat":{hp:7,ac:12,xp:25,type:"beast",mods:{DEX:2},pp:10,atk:[["Bite",4,"1d4+2","piercing"]],traits:{pack:1},beh:"swarm"},
  "Kobold":{hp:5,ac:12,xp:25,type:"humanoid",mods:{DEX:2},pp:8,atk:[["Dagger",4,"1d4+2","piercing"],["Sling",4,"1d4+2","bludgeoning",1]],traits:{pack:1},beh:"cowardly"},
  "Bandit":{hp:11,ac:12,xp:25,type:"humanoid",mods:{STR:1,DEX:1},pp:10,atk:[["Scimitar",3,"1d6+1","slashing"],["Light Crossbow",3,"1d8+1","piercing",1]],beh:"cowardly"},
  "Cultist":{hp:9,ac:12,xp:25,type:"humanoid",mods:{DEX:1,WIS:1},pp:10,atk:[["Scimitar",3,"1d6+1","slashing"]],beh:"fanatic"},
  "Goblin":{hp:7,ac:15,xp:50,type:"humanoid",mods:{DEX:2},pp:9,atk:[["Scimitar",4,"1d6+2","slashing"],["Shortbow",4,"1d6+2","piercing",1]],traits:{nimble:1},beh:"skirmisher"},
  "Wolf":{hp:11,ac:13,xp:50,type:"beast",mods:{STR:1,DEX:2},pp:13,atk:[["Bite",4,"2d4+2","piercing",0,{save:"STR",dc:11,cond:"prone"}]],traits:{pack:1},beh:"pack"},
  "Skeleton":{hp:13,ac:13,xp:50,type:"undead",mods:{DEX:2,CON:2},pp:9,atk:[["Shortsword",4,"1d6+2","piercing"],["Shortbow",4,"1d6+2","piercing",1]],vuln:["bludgeoning"],immune:["poison"],beh:"relentless"},
  "Zombie":{hp:22,ac:8,xp:50,type:"undead",mods:{STR:1,CON:3},pp:8,atk:[["Slam",3,"1d6+1","bludgeoning"]],immune:["poison"],traits:{undeadFortitude:1},beh:"relentless"},
  "Shadow":{hp:16,ac:12,xp:100,type:"undead",mods:{DEX:2},pp:10,atk:[["Strength Drain",4,"2d6+2","necrotic"]],resist:["bludgeoning","piercing","slashing"],beh:"relentless"},
  "Orc":{hp:15,ac:13,xp:100,type:"humanoid",mods:{STR:3,CON:3},pp:10,atk:[["Greataxe",5,"1d12+3","slashing"],["Javelin",5,"1d6+3","piercing",1]],beh:"brute"},
  "Hobgoblin":{hp:11,ac:18,xp:100,type:"humanoid",mods:{STR:1,CON:1},pp:10,atk:[["Longsword",3,"1d8+1","slashing"],["Longbow",3,"1d8+1","piercing",1]],traits:{martialAdv:"2d6"},beh:"tactical"},
  "Gnoll":{hp:22,ac:15,xp:100,type:"humanoid",mods:{STR:2,DEX:1},pp:10,atk:[["Spear",4,"1d8+2","piercing"],["Longbow",3,"1d8+1","piercing",1]],beh:"brute"},
  "Giant Spider":{hp:26,ac:14,xp:200,type:"beast",mods:{STR:2,DEX:3,CON:1},pp:10,atk:[["Bite",5,"1d8+3","piercing",0,{save:"CON",dc:11,dmg:"2d8",t:"poison",half:1}]],abil:[{n:"Web",k:"atk",toHit:5,cond:"restrained",rounds:3,recharge:5,d:"Sticky webbing restrains the target."}],beh:"ambusher"},
  "Ghoul":{hp:22,ac:12,xp:200,type:"undead",mods:{DEX:2},pp:10,atk:[["Claws",4,"2d4+2","slashing",0,{save:"CON",dc:10,cond:"paralyzed",rounds:1}],["Bite",2,"2d6+2","piercing"]],immune:["poison"],beh:"relentless"},
  "Bugbear":{hp:27,ac:16,xp:200,type:"humanoid",mods:{STR:2,DEX:2},pp:10,atk:[["Morningstar",4,"2d8+2","piercing"],["Javelin",4,"2d6+2","piercing",1]],beh:"brute"},
  "Dire Wolf":{hp:37,ac:14,xp:200,type:"beast",mods:{STR:3,DEX:2,CON:2},pp:13,atk:[["Bite",5,"2d6+3","piercing",0,{save:"STR",dc:13,cond:"prone"}]],traits:{pack:1},beh:"pack"},
  "Cult Fanatic":{hp:33,ac:13,xp:450,type:"humanoid",mods:{DEX:2,WIS:2,CHA:2},pp:11,atk:[["Dagger",4,"1d4+2","piercing"]],multi:["Dagger","Dagger"],abil:[{n:"Inflict Wounds",k:"atk",toHit:4,dmg:"3d10",t:"necrotic",uses:1,d:"A touch of rot."},{n:"Hold Person",k:"save",save:"WIS",dc:11,cond:"paralyzed",rounds:2,uses:1,d:"Paralyzing prayer."}],beh:"caster"},
  "Bandit Captain":{hp:65,ac:15,xp:450,type:"humanoid",mods:{STR:2,DEX:3,CON:2},pp:10,atk:[["Scimitar",5,"1d6+3","slashing"],["Dagger",5,"1d4+3","piercing"]],multi:["Scimitar","Scimitar","Dagger"],beh:"tactical"},
  "Ogre":{hp:59,ac:11,xp:450,type:"giant",mods:{STR:4,CON:3},pp:8,atk:[["Greatclub",6,"2d8+4","bludgeoning"],["Javelin",6,"2d6+4","piercing",1]],beh:"brute"},
  "Owlbear":{hp:59,ac:13,xp:700,type:"monstrosity",mods:{STR:5,CON:3},pp:13,atk:[["Beak",7,"1d10+5","piercing"],["Claws",7,"2d8+5","slashing"]],multi:["Beak","Claws"],beh:"brute"},
  "Wight":{hp:45,ac:14,xp:700,type:"undead",mods:{STR:2,DEX:2,CON:3},pp:13,atk:[["Longsword",4,"1d8+2","slashing"],["Life Drain",4,"1d6+2","necrotic"]],multi:["Longsword","Life Drain"],resist:["necrotic"],immune:["poison"],beh:"tactical"},
  "Troll":{hp:84,ac:15,xp:1800,type:"giant",mods:{STR:4,DEX:1,CON:5},pp:12,atk:[["Bite",7,"1d6+4","piercing"],["Claw",7,"2d6+4","slashing"]],multi:["Bite","Claw","Claw"],traits:{regen:10,regenStop:["fire","acid"]},beh:"brute"},
  "Young Green Dragon":{hp:136,ac:18,xp:3900,type:"dragon",mods:{STR:4,DEX:1,CON:3,WIS:1,CHA:2},pp:17,atk:[["Bite",7,"2d10+4","piercing",0,{dmg:"2d6",t:"poison"}],["Claw",7,"2d6+4","slashing"]],multi:["Bite","Claw","Claw"],abil:[{n:"Poison Breath",k:"save",save:"CON",dc:14,dmg:"12d6",t:"poison",half:1,aoe:1,recharge:5,d:"A cone of choking green gas."}],immune:["poison"],beh:"tactical"}
};
const SUMMONS = {"Spirit Wolf":{hp:11,ac:13,atk:{name:"Bite",toHit:4,dmg:"2d4+2",t:"piercing"}}};

// ---- Class resource & progression tables ---------------------------------
const FULL_SLOTS = [[],[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2]];
const HALF_SLOTS = [[],[],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2]];
const PACT = [[0,0],[1,1],[2,1],[2,2],[2,2],[2,3],[2,3],[2,4],[2,4],[2,5],[2,5]]; // [slots, level]
const CANTRIPS_KNOWN = {Bard:[2,2,2,2,3,3,3,3,3,3,4],Cleric:[3,3,3,3,4,4,4,4,4,4,5],Druid:[2,2,2,2,3,3,3,3,3,3,4],Sorcerer:[4,4,4,4,5,5,5,5,5,5,6],Warlock:[2,2,2,2,3,3,3,3,3,3,4],Wizard:[3,3,3,3,4,4,4,4,4,4,5]};
const SPELLS_KNOWN = {Bard:[0,4,5,6,7,8,9,10,11,12,14],Sorcerer:[0,2,3,4,5,6,7,8,9,10,11],Warlock:[0,2,3,4,5,6,7,8,9,10,10],Wizard:[0,6,8,10,12,14,16,18,20,22,24],Cleric:[0,4,5,6,7,9,10,11,12,14,15],Druid:[0,4,5,6,7,9,10,11,12,14,15],Paladin:[0,0,3,4,5,6,7,8,9,10,11],Ranger:[0,0,2,3,3,4,4,5,5,6,6]};
const INVOCATIONS_KNOWN = [0,0,2,2,2,3,3,4,4,5,5];

// ---- Icons (24px stroke) --------------------------------------------------
const ICONS = {
  up:["M12 19V6","M6 12l6-6 6 6","M5 21h14"],
  home:["M3 11 12 4l9 7","M5 10v10h14V10","M10 20v-6h4v6"],
  scroll:["M7 4h11a2 2 0 0 1 2 2v11","M7 4a2 2 0 0 0-2 2v2h4","M9 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1H11","M12 9h5","M12 12h5"],
  helm:["M5 14a7 7 0 0 1 14 0v5h-4v-5h-6v5H5z","M12 7V4","M12 14v5"],
  map:["M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z","M9 4v14","M15 6v14"],
  quest:["M6 3h12v18l-6-3.5L6 21z","M12 7v5","M12 14.8v.2"],
  book:["M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z","M4 19V5","M8 7h8","M8 11h5"],
  swords:["M14.5 17.5 3 6V3h3l11.5 11.5","M13 19l6-6","M16 16l4 4","M19 21l2-2","M9.5 17.5 21 6V3h-3L6.5 14.5","M11 19l-6-6","M8 16l-4 4","M5 21l-2-2"],
  gear:["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
  d20:["M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3z","M12 7.5l4.2 7.3H7.8z","M12 2.5v5","M20.5 7.3l-4.3 7.5","M3.5 7.3l4.3 7.5","M12 21.5l-4.2-6.7","M12 21.5l4.2-6.7"],
  plus:["M12 5v14","M5 12h14"], x:["M6 6l12 12","M18 6 6 18"], menu:["M4 7h16","M4 12h16","M4 17h16"], user:["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M4 21a8 8 0 0 1 16 0"],
  save:["M5 3h11l3 3v15H5z","M8 3v5h7V3","M8 21v-7h8v7"], send:["M4 12 20 4l-6 16-3-7z","M11 13l9-9"], stop:["M7 7h10v10H7z"],
  moon:["M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"], sun:["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M12 2v2","M12 20v2","M4.9 4.9l1.4 1.4","M17.7 17.7l1.4 1.4","M2 12h2","M20 12h2","M4.9 19.1l1.4-1.4","M17.7 6.3l1.4-1.4"],
  eye:["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z","M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"], trash:["M4 7h16","M9 7V4h6v3","M6 7l1 13h10l1-13"],
  upload:["M12 16V4","M7 9l5-5 5 5","M5 20h14"], download:["M12 4v12","M7 11l5 5 5-5","M5 20h14"], refresh:["M20 11a8 8 0 1 0-2.3 5.7","M20 5v6h-6"],
  // classes
  axe:["M6 21 17 5","M13 4c3 0 6 2 7 6-3 0-6-1-8-3","M13 4l-1.5 3"], lute:["M9 15a4 4 0 1 1-4-4c2 0 3-1 5-3l6-6 2 2-6 6c-2 2-3 3-3 5z","M7 13l2 2","M15 5l2 2"],
  sun2:["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z","M12 1v3","M12 20v3","M1 12h3","M20 12h3","M4.2 4.2l2.1 2.1","M17.7 17.7l2.1 2.1","M4.2 19.8l2.1-2.1","M17.7 6.3l2.1-2.1"],
  leaf:["M5 19c0-9 5-14 15-15-1 10-6 15-15 15z","M5 19c3-4 6-7 10-10"], swordshield:["M4 20l9-9","M13 11l5-5V3h-3l-5 5","M6 15l3 3","M17 12h4v4c0 3-2 5-4 6-2-1-4-3-4-6"],
  fist:["M7 11V6a1.5 1.5 0 0 1 3 0v4","M10 10V5a1.5 1.5 0 0 1 3 0v5","M13 10V6a1.5 1.5 0 0 1 3 0v5","M16 11V8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-2a2 2 0 0 1 2-2h3"],
  shieldx:["M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z","M12 7v10","M8 11h8"], bow:["M5 3c9 3 12 8 9 18","M5 3v18","M5 21c3-1 6-2 9 0","M3 12h17","M17 9l3 3-3 3"],
  dagger:["M14 3l7 0 0 7-9 9-4-4z","M8 15l-4 4 1 1 4-4","M6 13l5 5"], flame:["M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-2 4-2 5-1-1-3-3-3-6-3 3-5 7-5 11 0 4 3 7 7 7z","M12 22c-2 0-3-1.5-3-3.5 0-2 1.5-3 3-5 1.5 2 3 3 3 5 0 2-1 3.5-3 3.5z"],
  eye2:["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z","M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M12 11.5v1"], hat:["M3 20h18","M5 20l7-17 7 17","M9 13h6"],
  // locations
  town:["M3 21V11l5-4 5 4v10","M13 21V8l4-3 4 3v13","M7 21v-4h2v4","M16 12h2","M3 21h18"], city:["M3 21V9h4V5h4v4h2V3h4v6h4v12","M3 21h18","M7 13h1","M11 13h1","M16 13h1","M7 17h1","M16 17h1"],
  village:["M4 21v-8l8-6 8 6v8","M9 21v-5h6v5","M2 14 12 6l10 8"], forest:["M8 3l5 8H10l4 6H9v4","M8 21v-4H3l4-6H4z","M16 5l4 6h-2l3 5h-5v5"],
  mountain:["M2 20 9 7l4 6 3-4 6 11z","M7.5 10l1.5 2 1.5-1"], dungeon:["M4 21V9a8 8 0 0 1 16 0v12","M8 21v-8a4 4 0 0 1 8 0v8","M8 17h8","M4 21h16"],
  castle:["M4 21V6h3v3h3V6h4v3h3V6h3v15","M10 21v-5a2 2 0 0 1 4 0v5","M4 21h16","M4 12h16"], cave:["M2 20c1-8 5-14 10-14s9 6 10 14","M8 20c0-4 2-7 4-7s4 3 4 7","M2 20h20"],
  ruins:["M4 21V8","M4 8h4","M8 21v-9","M13 21V6l2-2","M13 6h5","M18 21V9","M2 21h20","M10 12l1 1"], tavern:["M5 8h10v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z","M15 11h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2","M5 8c0-2 1-4 5-4s5 2 5 4","M8 12v5","M12 12v5"],
  shop:["M3 9l2-5h14l2 5","M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z","M5 13v8h14v-8","M10 21v-5h4v5"], temple:["M3 9l9-6 9 6","M4 9h16","M6 9v9","M10 9v9","M14 9v9","M18 9v9","M3 21h18","M4 18h16"],
  camp:["M3 20 12 5l9 15","M12 5v15","M8 20l4-6 4 6","M2 20h20"], road:["M12 3v18","M12 6h6l2 2-2 2h-6","M12 12H6l-2 2 2 2h6"], swamp:["M2 18c2-1 4-1 6 0s4 1 6 0 4-1 6 0","M7 15V7","M5 9l2-2 2 2","M16 15V9","M14 11l2-2 2 2"],
  lake:["M2 12c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0","M2 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0","M2 7c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"], tower:["M8 21V9l-2-2V3h3v2h2V3h2v2h2V3h3v4l-2 2v12","M5 21h14","M11 21v-4h2v4","M11 11h2"],
  port:["M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z","M12 7v14","M5 12H3a9 9 0 0 0 18 0h-2","M8 10h8"], unknown:["M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.7V15","M12 18.5v.5"],
  // items
  sword:["M14.5 17.5 3 6V3h3l11.5 11.5","M13 19l6-6","M16 16l4 4","M19 21l2-2"], armor:["M6 4l3-1h6l3 1 3 4-3 2v11H6V10L3 8z","M9 3c0 2 1 3 3 3s3-1 3-3","M12 6v15"], shield:["M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"],
  potion:["M9 3h6","M10 3v5L5 17a3 3 0 0 0 2.7 4h8.6a3 3 0 0 0 2.7-4l-5-9V3","M7 15h10"], ring:["M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12z","M9 9l3-5 3 5"], amulet:["M5 3c1 5 3 8 7 9 4-1 6-4 7-9","M12 12v2","M12 21a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"],
  gem:["M6 3h12l4 6-10 12L2 9z","M2 9h20","M9 3l3 6 3-6","M12 9v12"], key:["M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M11 11h10","M18 11v3","M21 11v3"], bag:["M6 8h12l2 13H4z","M9 8V6a3 3 0 0 1 6 0v2"],
  coin:["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z","M12 7v10","M15 9.5c0-1.4-1.3-2-3-2s-3 .7-3 2c0 3 6 1.5 6 4.5 0 1.4-1.3 2-3 2s-3-.6-3-2"], cloak:["M8 3h8l1 4 3 14H4L7 7z","M8 3c0 2 1.5 3 4 3s4-1 4-3"], tool:["M14 7l3-3 3 3-3 3","M15 8 5 18l1 2 2 1 10-10"],
  heart:["M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"], star:["M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"], bolt:["M13 2 4 14h7l-1 8 9-12h-7z"],
  run:["M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z","M7 21l3-6 3 2v5","M5 10l4-3 4 1 3 4 3 1","M10 15l1-5"], hand:["M8 13V5a1.5 1.5 0 0 1 3 0v6","M11 11V4a1.5 1.5 0 0 1 3 0v7","M14 11V5.5a1.5 1.5 0 0 1 3 0V14","M17 10a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3l-3-5a1.5 1.5 0 0 1 2.5-1.5L8 15"],
  wand:["M4 20 16 8","M15 4v2","M18 7h2","M19 3l-1 1","M12 3v1","M20 11h1"], rest:["M3 18h18","M5 18v-5h14v5","M7 13v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2","M17 6h3l-3 3h3"], chat:["M4 5h16v11H9l-5 4z","M8 9h8","M8 12h5"],
  compass:["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z","M15.5 8.5l-2 5-5 2 2-5z"], skull:["M5 11a7 7 0 1 1 14 0v4h-3v4H8v-4H5z","M9 12a1.2 1.2 0 1 0 0-.1","M15 12a1.2 1.2 0 1 0 0-.1","M11 19v-2","M13 19v-2"]
};
const CLASS_ICON = {Barbarian:"axe",Bard:"lute",Cleric:"sun2",Druid:"leaf",Fighter:"swordshield",Monk:"fist",Paladin:"shieldx",Ranger:"bow",Rogue:"dagger",Sorcerer:"flame",Warlock:"eye2",Wizard:"hat"};
const LOC_TYPES = ["town","city","village","forest","mountain","dungeon","castle","cave","ruins","tavern","shop","temple","camp","road","swamp","lake","tower","port","sewer","guardhouse","hall","house","warehouse","docks","farm","cemetery","market"];
// icons for the building types that towns are made of
Object.assign(ICONS, {
  sewer:["M4 10h16","M4 14h16","M8 6v12","M12 6v12","M16 6v12","M3 18h18"], guardhouse:["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z","M12 8v6","M9 11h6"],
  hall:["M3 21h18","M5 21V9h14v12","M12 3 3 9h18z","M9 21v-6h6v6"], house:["M3 11 12 4l9 7","M5 10v10h14V10","M10 20v-6h4v6"],
  warehouse:["M3 21V9l9-5 9 5v12","M3 21h18","M7 21v-6h4v6","M13 21v-6h4v6","M7 12h10"], docks:["M3 12h18","M6 12v8","M12 12v8","M18 12v8","M3 20h18","M8 4v8","M8 4h7l-2 3 2 3H8"],
  farm:["M3 21h18","M4 21v-9l6-5 6 5v9","M8 21v-5h4v5","M17 12h4v9h-4","M19 7v5"], cemetery:["M8 21V9a4 4 0 0 1 8 0v12","M6 21h12","M12 11v5","M10 13h4","M3 21h18"],
  market:["M3 10l2-6h14l2 6","M3 10h18","M5 10v10h14V10","M9 20v-5h6v5","M3 10c0 2 2 2 2 0s2-2 2 0 2 2 2 0 2-2 2 0 2 2 2 0 2-2 2 0 2 2 2 0"],
});
</script>
