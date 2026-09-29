<script>
"use strict";
// ======================= EXPANDED CONTENT =======================
// ---- More monsters & bosses ----
Object.assign(BESTIARY, {
  "Stirge":{hp:3,ac:14,xp:25,type:"beast",mods:{DEX:3},pp:9,atk:[["Blood Drain",5,"1d4+3","piercing"]],traits:{reach:1},beh:"swarm"},
  "Lizardfolk":{hp:22,ac:15,xp:100,type:"humanoid",mods:{STR:2,CON:1},pp:13,atk:[["Bite",4,"1d6+2","piercing"],["Heavy Club",4,"1d6+2","bludgeoning"],["Javelin",4,"1d6+2","piercing",1]],multi:["Bite","Heavy Club"],beh:"brute"},
  "Thug":{hp:32,ac:11,xp:100,type:"humanoid",mods:{STR:2,CON:2},pp:10,atk:[["Mace",4,"1d6+2","bludgeoning"],["Heavy Crossbow",2,"1d10","piercing",1]],multi:["Mace","Mace"],traits:{pack:1},beh:"brute"},
  "Scout":{hp:16,ac:13,xp:100,type:"humanoid",mods:{DEX:2,WIS:1},pp:15,atk:[["Shortsword",4,"1d6+2","piercing"],["Longbow",4,"1d8+2","piercing",1]],multi:["Longbow","Longbow"],beh:"ranged"},
  "Acolyte":{hp:18,ac:13,xp:100,type:"humanoid",mods:{WIS:2},pp:12,atk:[["Mace",2,"1d6","bludgeoning"]],abil:[{n:"Cure Wounds",k:"heal",dmg:"1d8+2",uses:2},{n:"Sacred Flame",k:"save",save:"DEX",dc:12,dmg:"1d8",t:"radiant",half:false,uses:3}],beh:"caster"},
  "Worg":{hp:26,ac:13,xp:100,type:"monstrosity",mods:{STR:3,DEX:1,CON:1},pp:14,atk:[["Bite",5,"2d6+3","piercing",0,{save:"STR",dc:13,cond:"prone"}]],traits:{pack:1},beh:"pack"},
  "Brown Bear":{hp:34,ac:11,xp:200,type:"beast",mods:{STR:4,CON:3},pp:13,atk:[["Bite",6,"1d8+4","piercing"],["Claws",6,"2d6+4","slashing"]],multi:["Bite","Claws"],beh:"brute"},
  "Harpy":{hp:38,ac:11,xp:200,type:"monstrosity",mods:{STR:1,DEX:1,CHA:1},pp:10,atk:[["Claws",3,"2d4+1","slashing"]],abil:[{n:"Luring Song",k:"save",save:"WIS",dc:11,cond:"charmed",rounds:2,aoe:true,recharge:5}],traits:{reach:1},beh:"skirmisher"},
  "Goblin Boss":{hp:21,ac:17,xp:200,type:"humanoid",mods:{DEX:2},pp:9,atk:[["Scimitar",4,"1d6+2","slashing"],["Javelin",2,"1d6","piercing",1]],multi:["Scimitar","Scimitar"],abil:[{n:"Rally the Pack",k:"rally",cond:"blessed",rounds:3,uses:1}],beh:"tactical"},
  "Ghast":{hp:36,ac:13,xp:450,type:"undead",mods:{DEX:3,CON:3},pp:10,atk:[["Claws",5,"2d6+3","slashing",0,{save:"CON",dc:10,cond:"paralyzed",rounds:1}],["Bite",3,"2d8+3","piercing"]],abil:[{n:"Stench",k:"save",save:"CON",dc:10,cond:"poisoned",rounds:2,aoe:true,recharge:5}],resist:["necrotic"],immune:["poison"],beh:"relentless"},
  "Ettercap":{hp:44,ac:13,xp:450,type:"monstrosity",mods:{STR:2,DEX:2,CON:1},pp:13,atk:[["Bite",4,"1d8+2","piercing",0,{save:"CON",dc:11,dmg:"1d8",t:"poison"}],["Claws",4,"2d4+2","slashing"]],multi:["Bite","Claws"],abil:[{n:"Web",k:"atk",toHit:4,cond:"restrained",rounds:2,recharge:5}],beh:"skirmisher"},
  "Gnoll Pack Lord":{hp:49,ac:15,xp:450,type:"humanoid",mods:{STR:3,DEX:2},pp:10,atk:[["Glaive",5,"1d10+3","slashing"],["Longbow",4,"1d8+2","piercing",1]],multi:["Glaive","Glaive"],abil:[{n:"Incite Rampage",k:"rally",cond:"blessed",rounds:3,recharge:5}],beh:"brute"},
  "Hobgoblin Captain":{hp:39,ac:17,xp:450,type:"humanoid",mods:{STR:2,DEX:2,CON:1,CHA:1},pp:10,atk:[["Greatsword",4,"2d6+2","slashing"],["Javelin",4,"1d6+2","piercing",1]],multi:["Greatsword","Greatsword"],traits:{martialAdv:"2d6"},abil:[{n:"Leadership",k:"rally",cond:"blessed",rounds:3,uses:1}],beh:"tactical"},
  "Veteran":{hp:58,ac:17,xp:700,type:"humanoid",mods:{STR:3,DEX:1,CON:2},pp:12,atk:[["Longsword",5,"1d8+3","slashing"],["Shortsword",5,"1d6+3","piercing"],["Heavy Crossbow",3,"1d10+1","piercing",1]],multi:["Longsword","Longsword","Shortsword"],beh:"tactical"},
  "Minotaur":{hp:76,ac:14,xp:700,type:"monstrosity",mods:{STR:4,CON:3},pp:17,atk:[["Greataxe",6,"2d12+4","slashing"],["Gore",6,"2d8+4","piercing"]],abil:[{n:"Charge",k:"atk",toHit:6,dmg:"4d8+4",t:"piercing",cond:"prone",rounds:1,recharge:5}],beh:"brute"},
  "Green Hag":{hp:82,ac:17,xp:700,type:"fey",mods:{STR:4,DEX:1,CON:3,INT:1,WIS:2,CHA:2},pp:14,atk:[["Claws",6,"2d8+4","slashing"]],multi:["Claws","Claws"],abil:[{n:"Hex of Dread",k:"save",save:"WIS",dc:13,cond:"frightened",rounds:2,aoe:true,recharge:5},{n:"Vanish in Fog",k:"self",cond:"invisible",rounds:1,uses:1}],beh:"caster"},
  "Mage":{hp:40,ac:12,xp:1100,type:"humanoid",mods:{DEX:2,INT:3,WIS:1},pp:11,atk:[["Arcane Bolt",6,"2d10","force",1],["Dagger",5,"1d4+2","piercing"]],abil:[{n:"Fireball",k:"save",save:"DEX",dc:14,dmg:"8d6",t:"fire",aoe:true,uses:1},{n:"Hold Person",k:"save",save:"WIS",dc:14,cond:"paralyzed",rounds:2,uses:1},{n:"Shield",k:"self",cond:"warded",rounds:1,uses:2}],beh:"caster"},
  "Orc War Chief":{hp:93,ac:16,xp:1100,type:"humanoid",mods:{STR:4,DEX:1,CON:4,CHA:3},pp:10,atk:[["Greataxe",6,"1d12+4","slashing"],["Spear",6,"1d6+4","piercing",1]],multi:["Greataxe","Greataxe"],abil:[{n:"Battle Cry",k:"rally",cond:"blessed",rounds:3,uses:1}],beh:"brute"},
  "Bone Knight":{hp:68,ac:18,xp:1100,type:"undead",mods:{STR:4,CON:3},pp:12,atk:[["Greatsword",7,"2d6+4","slashing",0,{dmg:"1d8",t:"necrotic"}]],multi:["Greatsword","Greatsword"],resist:["necrotic","piercing"],immune:["poison"],vuln:["bludgeoning","radiant"],beh:"relentless"},
  "Necromancer":{hp:66,ac:12,xp:1800,type:"humanoid",mods:{DEX:2,CON:1,INT:4,WIS:1},pp:11,atk:[["Chill Touch",7,"3d8","necrotic",1],["Bone Dagger",5,"1d4+2","piercing"]],abil:[{n:"Blight",k:"save",save:"CON",dc:15,dmg:"8d8",t:"necrotic",uses:1},{n:"Raise the Dead",k:"summon",summon:{name:"Skeleton",count:2},recharge:5},{n:"Ray of Sickness",k:"save",save:"CON",dc:15,dmg:"3d8",t:"poison",cond:"poisoned",rounds:2,recharge:4}],resist:["necrotic"],beh:"caster"},
  "Vampire Spawn":{hp:82,ac:15,xp:1800,type:"undead",mods:{STR:3,DEX:3,CON:3},pp:13,atk:[["Claws",6,"2d4+3","slashing"],["Bite",6,"1d6+3","piercing",0,{dmg:"3d6",t:"necrotic"}]],multi:["Claws","Bite"],traits:{regen:10,regenStop:["radiant"]},resist:["necrotic"],beh:"skirmisher"},
  "Young Red Dragon":{hp:178,ac:18,xp:5900,type:"dragon",mods:{STR:6,CON:5,WIS:1,CHA:4},pp:18,atk:[["Bite",10,"2d10+6","piercing",0,{dmg:"1d6",t:"fire"}],["Claw",10,"2d6+6","slashing"]],multi:["Bite","Claw","Claw"],abil:[{n:"Fire Breath",k:"save",save:"DEX",dc:17,dmg:"16d6",t:"fire",half:true,aoe:true,recharge:5}],immune:["fire"],beh:"brute"}
});
// boss behaviour: legendary actions per round, and a second phase at half HP
const BOSS_TRAITS = {
  "Goblin Boss":{legendary:1, phase:{text:"shrieks for help, and more goblins pour in!", summon:{name:"Goblin",count:2}}},
  "Bugbear":{legendary:1, phase:{text:"roars and swings with brutal fury!", enrage:true}},
  "Bandit Captain":{legendary:1, phase:{text:"whistles, and hidden archers rise from cover!", summon:{name:"Bandit",count:2}}},
  "Hobgoblin Captain":{legendary:1, phase:{text:"barks an order; reinforcements lock shields!", summon:{name:"Hobgoblin",count:2}}},
  "Cult Fanatic":{legendary:1, phase:{text:"slashes their own palm and the dark answers with fresh zeal!", heal:20, enrage:true}},
  "Green Hag":{legendary:1, phase:{text:"cackles and drinks from a black vial, wounds closing!", heal:25}},
  "Owlbear":{legendary:1, phase:{text:"rears up with a deafening screech, frenzied!", enrage:true}},
  "Gnoll Pack Lord":{legendary:1, phase:{text:"howls, and hyena-men answer from the dark!", summon:{name:"Gnoll",count:2}}},
  "Minotaur":{legendary:2, phase:{text:"snorts and paws the ground, eyes burning red!", enrage:true}},
  "Wight":{legendary:1, phase:{text:"raises a withered hand; the fallen rise to serve!", summon:{name:"Zombie",count:2}}},
  "Veteran":{legendary:1, phase:{text:"grits their teeth and fights with desperate skill!", enrage:true}},
  "Mage":{legendary:1, phase:{text:"wreathes themselves in crackling wards!", heal:15}},
  "Orc War Chief":{legendary:2, phase:{text:"bellows a war cry that shakes the walls; orcs charge in!", summon:{name:"Orc",count:2}}},
  "Bone Knight":{legendary:2, phase:{text:"plants its sword; ghostly chains bind its broken bones back together!", heal:25}},
  "Necromancer":{legendary:2, phase:{text:"screams a word of death; the dead claw up through the floor!", summon:{name:"Zombie",count:2}}},
  "Vampire Spawn":{legendary:2, phase:{text:"hisses and becomes a blur of fangs and claws!", enrage:true}},
  "Troll":{legendary:2, phase:{text:"howls, its wounds bubbling shut!", heal:20}},
  "Young Green Dragon":{legendary:2, phase:{text:"takes to the air in fury, poison dripping from its jaws!", enrage:true}},
  "Young Red Dragon":{legendary:3, phase:{text:"roars, and the chamber fills with rising heat!", enrage:true}}
};
const THEMES = {
  goblin:{label:"goblin warren", pools:[["Goblin","Kobold","Giant Rat"],["Goblin","Worg","Hobgoblin"],["Hobgoblin","Bugbear","Worg"],["Bugbear","Hobgoblin Captain","Ogre"]], bosses:["Goblin Boss","Bugbear","Hobgoblin Captain","Orc War Chief"]},
  undead:{label:"haunted crypt", pools:[["Skeleton","Zombie"],["Skeleton","Zombie","Ghoul"],["Ghoul","Shadow","Ghast"],["Wight","Ghast","Bone Knight"]], bosses:["Wight","Wight","Necromancer","Vampire Spawn"]},
  bandit:{label:"bandit hideout", pools:[["Bandit","Kobold"],["Bandit","Thug","Scout"],["Thug","Scout","Veteran"],["Veteran","Thug","Mage"]], bosses:["Bandit Captain","Bandit Captain","Veteran","Mage"]},
  cult:{label:"cult sanctum", pools:[["Cultist","Giant Rat"],["Cultist","Acolyte","Shadow"],["Cult Fanatic","Acolyte","Ghoul"],["Cult Fanatic","Mage","Ghast"]], bosses:["Cult Fanatic","Cult Fanatic","Necromancer","Necromancer"]},
  beast:{label:"beast den", pools:[["Wolf","Giant Rat","Stirge"],["Wolf","Giant Spider","Brown Bear"],["Dire Wolf","Giant Spider","Brown Bear"],["Owlbear","Dire Wolf","Ettercap"]], bosses:["Dire Wolf","Owlbear","Owlbear","Troll"]},
  swamp:{label:"drowned lair", pools:[["Lizardfolk","Stirge","Giant Rat"],["Lizardfolk","Zombie","Giant Spider"],["Lizardfolk","Ghoul","Ettercap"],["Ettercap","Ghast","Troll"]], bosses:["Green Hag","Green Hag","Green Hag","Troll"]},
  giant:{label:"brute stronghold", pools:[["Orc","Gnoll"],["Orc","Gnoll","Ogre"],["Ogre","Gnoll Pack Lord","Minotaur"],["Minotaur","Troll","Ogre"]], bosses:["Gnoll Pack Lord","Ogre","Minotaur","Orc War Chief"]},
  dragon:{label:"dragon's lair", pools:[["Kobold","Giant Rat"],["Kobold","Goblin","Worg"],["Hobgoblin","Bugbear","Worg"],["Ogre","Veteran","Hobgoblin Captain"]], bosses:["Owlbear","Young Green Dragon","Young Green Dragon","Young Red Dragon"]}
};
const BIOME_THEMES = { g:["bandit","beast","goblin"], f:["beast","goblin","bandit"], h:["goblin","giant","bandit"], m:["giant","goblin","dragon"], s:["swamp","undead","beast"], a:["bandit","undead","giant"], t:["beast","giant","undead"], w:["swamp","bandit"] };
// encounter difficulty thresholds per character level: [easy, medium, hard, deadly]
const XP_THRESH = {1:[25,50,75,100],2:[50,100,150,200],3:[75,150,225,400],4:[125,250,375,500],5:[250,500,750,1100],6:[300,600,900,1400],7:[350,750,1100,1700],8:[450,900,1400,2100],9:[550,1100,1600,2400],10:[600,1200,1900,2800]};
const ENC_MULT = n => n <= 1 ? 1 : n === 2 ? 1.5 : n <= 6 ? 2 : 2.5;

// ---- Companion roster (one per class, each with a personality) ----
const COMPANIONS = [
  {id:"brakka", name:"Brakka Stonejaw", race:"Half-Orc", cls:"Barbarian", bg:"Outlander", align:"Chaotic Good", sub:0, role:"tank",
   personality:"Loud, loyal and fearless; treats every fight as a festival and every friend as family.", voice:"Blunt, short sentences, laughs at danger, calls people 'little one'.",
   likes:["bravery","mercy","honesty"], dislikes:["cowardice","cruelty","deceit"], hook:"Hunting the warlord who burned her clan's longhouse.", looks:"Scarred green arms, a braid of bone beads, a greataxe named Mother."},
  {id:"aldric", name:"Ser Aldric Vane", race:"Human", cls:"Fighter", bg:"Noble", align:"Lawful Good", sub:0, role:"tank",
   personality:"A disgraced knight trying to earn back his name; stiff, honourable, secretly funny.", voice:"Formal and courtly; dry understatement.",
   likes:["honesty","mercy","piety"], dislikes:["deceit","greed","cruelty"], hook:"Stripped of his title for a crime he did not commit.", looks:"Dented plate polished to a mirror, a greying moustache, a torn heraldic tabard."},
  {id:"mireille", name:"Sister Mireille", race:"Human", cls:"Cleric", bg:"Acolyte", align:"Neutral Good", sub:0, role:"support",
   personality:"Gentle healer with a spine of iron; will patch up anyone, even enemies.", voice:"Warm, patient, occasional sharp scolding.",
   likes:["mercy","piety","honesty"], dislikes:["cruelty","greed","violence"], hook:"Searching for the plague-cure her abbey lost to raiders.", looks:"Grey habit stained with herbs, a sunburst pendant, calloused kind hands."},
  {id:"quill", name:"Quillon Ferrowick", race:"Gnome", cls:"Wizard", bg:"Sage", align:"Chaotic Good", sub:0, role:"controller",
   personality:"Endlessly curious gnome scholar who catalogues everything, including danger.", voice:"Rapid, excited, full of footnotes and big words.",
   likes:["curiosity","caution","honesty"], dislikes:["violence","greed","cruelty"], hook:"Writing the definitive bestiary of the realm, preferably from a safe distance.", looks:"Ink-stained fingers, six pairs of spectacles, a satchel bursting with notes."},
  {id:"nix", name:"Nix Underbough", race:"Halfling", cls:"Rogue", bg:"Criminal", align:"Chaotic Neutral", sub:1, role:"striker",
   personality:"Sarcastic, light-fingered and charming; hides a soft heart under a pile of jokes.", voice:"Quick quips, nicknames for everyone, never a straight answer.",
   likes:["gold","curiosity","deceit"], dislikes:["piety","cowardice","honesty"], hook:"Owes a very large debt to a very patient guild.", looks:"Curly hair, a dozen hidden pockets, a grin that's already planning something."},
  {id:"tamsin", name:"Tamsin Reed", race:"Elf", cls:"Ranger", bg:"Outlander", align:"Neutral Good", sub:0, role:"striker",
   personality:"Quiet tracker who trusts animals more than people and notices everything.", voice:"Soft-spoken, few words, nature metaphors.",
   likes:["caution","mercy","curiosity"], dislikes:["cruelty","greed","violence"], hook:"Tracking the blight that is killing her home forest.", looks:"Moss-green cloak, a longbow of pale ash, leaves woven in her hair."},
  {id:"lark", name:"Lark Everlyn", race:"Half-Elf", cls:"Bard", bg:"Entertainer", align:"Chaotic Good", sub:0, role:"support",
   personality:"Dramatic, flirtatious bard collecting stories worth singing; brave when it counts.", voice:"Theatrical, rhymes when nervous, compliments everyone.",
   likes:["curiosity","bravery","deceit"], dislikes:["cowardice","cruelty","piety"], hook:"Wants to write the ballad that makes them immortal.", looks:"Feathered hat, patched velvet doublet, a lute covered in carved names."},
  {id:"oren", name:"Oren Brightshield", race:"Dragonborn", cls:"Paladin", bg:"Soldier", align:"Lawful Good", sub:0, role:"tank",
   personality:"Earnest holy warrior sworn to protect the weak; struggles with humour.", voice:"Solemn, speaks in oaths and promises.",
   likes:["piety","mercy","bravery"], dislikes:["deceit","cruelty","cowardice"], hook:"Sworn to recover the relic his order lost a century ago.", looks:"Bronze scales, a battered tower shield, a warm rumbling voice."},
  {id:"moss", name:"Old Moss", race:"Dwarf", cls:"Druid", bg:"Hermit", align:"True Neutral", sub:0, role:"controller",
   personality:"Grumpy hermit who talks to trees and distrusts cities; fiercely protective of the wild.", voice:"Gruff mutters, weather proverbs, calls everyone 'sapling'.",
   likes:["caution","mercy","curiosity"], dislikes:["greed","violence","cruelty"], hook:"Something is poisoning the old places, and Moss means to find it.", looks:"A beard full of lichen, bark-brown robes, a staff with a living branch."},
  {id:"vesper", name:"Vesper Ashgrave", race:"Tiefling", cls:"Warlock", bg:"Charlatan", align:"Chaotic Neutral", sub:0, role:"striker",
   personality:"Wry and guarded, bound to a patron she doesn't fully trust; pragmatic above all.", voice:"Dry wit, cutting remarks, rare flashes of sincerity.",
   likes:["deceit","gold","bravery"], dislikes:["piety","cowardice","honesty"], hook:"Looking for a way out of her infernal contract.", looks:"Ashen skin, curled horns hung with silver rings, eyes like banked coals."},
  {id:"ember", name:"Ember Kaltra", race:"Human", cls:"Sorcerer", bg:"Folk Hero", align:"Chaotic Good", sub:0, role:"striker",
   personality:"Hot-headed farm kid with draconic blood and more power than control.", voice:"Impulsive, eager, apologises after things catch fire.",
   likes:["bravery","mercy","curiosity"], dislikes:["cowardice","cruelty","caution"], hook:"Wants to learn who the dragon in her bloodline was.", looks:"Freckles, singed sleeves, faint copper scales on her neck."},
  {id:"fen", name:"Brother Fen", race:"Human", cls:"Monk", bg:"Hermit", align:"Lawful Neutral", sub:0, role:"striker",
   personality:"Serene wandering monk who answers questions with questions; deadly calm in a fight.", voice:"Measured, riddling, occasionally deadpan hilarious.",
   likes:["caution","honesty","mercy"], dislikes:["greed","violence","deceit"], hook:"On a pilgrimage to the ruined monastery where his order fell.", looks:"Shaved head, simple ochre wraps, bare feet that never seem to get dirty."}
];
const APPROVAL_TAGS = ["bravery","cowardice","mercy","cruelty","honesty","deceit","greed","gold","piety","curiosity","caution","violence"];
const ROLE_INFO = { tank:"Front line: draws attacks and protects allies.", striker:"Damage dealer: focuses down dangerous foes.", support:"Healer and buffer: keeps the party standing.", controller:"Crowd control: sleep, hold, area spells." };
const TACTICS = { balanced:"Balanced", aggressive:"Aggressive", defensive:"Defensive", support:"Support first" };
// preferred spells per class for automatic picks (companions)
const SPELL_PREFS = {
  Bard:["Vicious Mockery","Healing Word","Dissonant Whispers","Faerie Fire","Tasha's Hideous Laughter","Shatter","Hold Person","Hypnotic Pattern","Heroism","Polymorph","Greater Invisibility","Mass Cure Wounds","Synaptic Static"],
  Cleric:["Sacred Flame","Toll the Dead","Guidance","Healing Word","Cure Wounds","Bless","Guiding Bolt","Shield of Faith","Spiritual Weapon","Aid","Lesser Restoration","Spirit Guardians","Mass Healing Word","Revivify","Death Ward","Flame Strike","Mass Cure Wounds","Greater Restoration"],
  Druid:["Produce Flame","Thorn Whip","Guidance","Healing Word","Entangle","Cure Wounds","Goodberry","Moonbeam","Barkskin","Flaming Sphere","Call Lightning","Conjure Animals","Ice Storm","Blight","Insect Plague","Mass Cure Wounds"],
  Paladin:["Bless","Cure Wounds","Divine Favor","Shield of Faith","Branding Smite","Aid","Lesser Restoration","Crusader's Mantle","Revivify","Death Ward"],
  Ranger:["Hunter's Mark","Cure Wounds","Goodberry","Entangle","Barkskin","Pass without Trace","Conjure Animals","Lightning Bolt"],
  Sorcerer:["Fire Bolt","Ray of Frost","Chill Touch","Poison Spray","Magic Missile","Shield","Chromatic Orb","Burning Hands","Scorching Ray","Misty Step","Fireball","Haste","Lightning Bolt","Greater Invisibility","Ice Storm","Cone of Cold","Synaptic Static"],
  Warlock:["Eldritch Blast","Chill Touch","Hex","Armor of Agathys","Hellish Rebuke","Misty Step","Shatter","Hunger of Hadar","Fear","Dimension Door","Banishment","Hold Monster"],
  Wizard:["Fire Bolt","Ray of Frost","Shocking Grasp","Mage Hand","Magic Missile","Shield","Sleep","Mage Armor","Burning Hands","Thunderwave","Scorching Ray","Misty Step","Hold Person","Shatter","Fireball","Hypnotic Pattern","Lightning Bolt","Haste","Polymorph","Ice Storm","Greater Invisibility","Cone of Cold","Hold Monster","Synaptic Static"]
};

// ---- Loot ----
const LOOT_WEAPONS = ["Longsword","Shortsword","Rapier","Greataxe","Longbow","Mace","Dagger","Warhammer","Battleaxe","Quarterstaff","Handaxe","Scimitar","Light Crossbow","Greatsword"];
const LOOT_ARMOR = ["Leather Armor","Studded Leather","Chain Shirt","Breastplate","Chain Mail","Scale Mail"];
const GEMS = [["Moss Agate",10],["Blue Quartz",10],["Bloodstone",50],["Moonstone",50],["Jade Figurine",75],["Silver Chalice",100],["Pearl",100],["Garnet",100],["Gold Locket",150],["Topaz",500]];
const MAGIC_ITEMS = [
  // [tier min, spec]
  [0,{name:"Potion of Healing",type:"potion"}],[0,{name:"Antitoxin",type:"potion"}],[0,{name:"Scroll of Cure Wounds",type:"scroll",spell:"Cure Wounds"}],[0,{name:"Scroll of Magic Missile",type:"scroll",spell:"Magic Missile"}],
  [0,{name:"Scroll of Shield of Faith",type:"scroll",spell:"Shield of Faith"}],[1,{name:"Potion of Greater Healing",type:"potion"}],[1,{name:"Scroll of Misty Step",type:"scroll",spell:"Misty Step"}],
  [1,{name:"Scroll of Scorching Ray",type:"scroll",spell:"Scorching Ray"}],[1,{name:"Ring of Protection",type:"ring",ac_bonus:1,save_bonus:1,rarity:"rare",value:800,description:"A plain silver band that turns blows aside."}],
  [1,{name:"Cloak of Protection",type:"cloak",ac_bonus:1,save_bonus:1,rarity:"uncommon",value:500,description:"A grey cloak that shimmers when struck."}],
  [1,{name:"Bracers of Archery",type:"wondrous",slot:"hands",rarity:"uncommon",value:300,description:"Leather bracers etched with fletching runes. +1 AC in this realm's reckoning.",ac_bonus:1}],
  [1,{name:"Ring of Fire Resistance",type:"ring",resist:["fire"],rarity:"rare",value:600,description:"Warm to the touch, it drinks heat."}],
  [2,{name:"Gauntlets of Ogre Power",type:"wondrous",slot:"hands",ability_set:{STR:19},rarity:"uncommon",value:800,description:"Heavy iron gauntlets. Your Strength becomes 19."}],
  [2,{name:"Headband of Intellect",type:"wondrous",slot:"head",ability_set:{INT:19},rarity:"uncommon",value:800,description:"A thin circlet set with a clear stone. Your Intelligence becomes 19."}],
  [2,{name:"Amulet of the Devout",type:"amulet",spell_attack_bonus:1,save_bonus:1,rarity:"rare",value:900,description:"A holy symbol that sharpens divine focus."}],
  [2,{name:"Scroll of Fireball",type:"scroll",spell:"Fireball"}],[2,{name:"Potion of Superior Healing",type:"potion"}],
  [3,{name:"Amulet of Health",type:"amulet",ability_set:{CON:19},rarity:"rare",value:2000,description:"A red gem on a gold chain. Your Constitution becomes 19."}],
  [3,{name:"Belt-Cloak of the Drake",type:"cloak",resist:["fire","cold"],ac_bonus:1,rarity:"very rare",value:3000,description:"Scaled leather that shrugs off flame and frost."}]
];
function lootTier(level){ return level <= 2 ? 0 : level <= 4 ? 1 : level <= 7 ? 2 : 3; }
function rollLoot(level, kind="minor"){
  const t = lootTier(level); const out = { gold: 0, items: [] };
  const goldDice = {minor:[`${1+t}d6`,5], chest:[`${2+t}d6`,10], boss:[`${3+t}d6`,15]}[kind] || ["1d6",5];
  out.gold = rollDice(goldDice[0]).total * goldDice[1] * (t+1) / 2 | 0;
  const nItems = kind === "boss" ? 2 + rnd(2) : kind === "chest" ? 1 + rnd(2) : rnd(2);
  for (let i=0;i<nItems;i++){
    const r = rnd(100);
    if (r < 30){ const [g,v] = pick(GEMS.filter(([,v]) => v <= 100 * (t+1))); out.items.push({name:g, type:"treasure", value:v, description:"A valuable to sell or trade."}); }
    else if (r < (kind === "minor" ? 85 : 55)){ const [, s] = pick(MAGIC_ITEMS.filter(([m,sp]) => m <= t && (sp.type==="potion"||sp.type==="scroll"))); out.items.push({...s}); }
    else {
      const bonus = t >= 3 && rnd(3)===0 ? 2 : 1;
      const roll = rnd(10);
      if (roll < 4){ const base = pick(LOOT_WEAPONS); const flame = t >= 2 && rnd(4)===0; out.items.push(flame ? {name:`Flame Tongue ${base}`, type:"weapon", base, extra_damage:"2d6", extra_damage_type:"fire", rarity:"rare", value:1500, description:"Speak the word and fire runs along the blade."} : {name:`${base} +${bonus}`, type:"weapon", base, bonus, rarity: bonus>1?"rare":"uncommon", value: 500*bonus}); }
      else if (roll < 6){ const base = pick(LOOT_ARMOR); out.items.push({name:`${base} +1`, type:"armor", base, bonus:1, rarity:"rare", value:1000}); }
      else { const pool = MAGIC_ITEMS.filter(([m,s]) => m <= t && !["potion","scroll"].includes(s.type)); if (pool.length) out.items.push({...pick(pool)[1]}); else out.items.push({name:"Potion of Healing", type:"potion"}); }
    }
  }
  return out;
}

// ---- Exploration events (engine-resolved, DM-narrated) ----
// effects: xp, gold, loot, damage/dtype/who, cond, heal, reveal, shop, combat(theme|"biome"), flag, tags (companion approval)
const EVENTS = [
  {id:"wounded", biomes:"gfhat", title:"A wounded traveler", text:"A traveler lies bleeding beside the road, clutching a torn satchel. They claim raiders jumped them an hour ago.",
   choices:[{label:"Tend their wounds", check:{skill:"Medicine", dc:12}, tags:["mercy"], ok:{xp:25, reveal:true, flag:"helped_traveler", text:"You stop the bleeding. Grateful, they tell you where the raiders make camp."}, fail:{text:"You do what you can, but they slip into fever. You leave them with a passing cart."}},
            {label:"Search the satchel while they're weak", check:{skill:"Sleight of Hand", dc:13}, tags:["greed","cruelty"], ok:{gold:"2d10", text:"Your fingers find a purse. The traveler never notices."}, fail:{text:"They catch your wrist and spit a curse. Word of this may travel.", flag:"robbed_traveler"}},
            {label:"Keep moving", tags:["caution"], ok:{text:"You leave them to the road."}}]},
  {id:"tripwire", biomes:"fhgs", title:"Too quiet", text:"The birds have gone silent. The trail narrows between two thick trunks.",
   choices:[{label:"Scout ahead carefully", check:{skill:"Perception", dc:13, group:true}, tags:["caution"], ok:{xp:25, text:"You spot a tripwire strung with rusted blades and step around it."}, fail:{damage:"2d6", dtype:"piercing", who:"one", text:"A snare whips blades across the lead scout."}},
            {label:"Charge through before anyone can react", tags:["bravery"], ok:{combat:"biome", text:"Ambushers burst from the undergrowth!"}}]},
  {id:"shrine", biomes:"gfhmt", title:"A mossy wayshrine", text:"A weathered shrine to a forgotten god stands at a crossroads, a few coins still glinting in the offering bowl.",
   choices:[{label:"Pray and leave an offering (5 gp)", cost:{gold:5}, check:{skill:"Religion", dc:10}, tags:["piety"], ok:{cond:"blessed", condNote:"shrine blessing, until your next battle", text:"Warmth settles over the party; you feel watched over."}, fail:{text:"The shrine stays silent, but the gesture feels right."}},
            {label:"Pocket the old coins", tags:["greed"], ok:{gold:"1d10", flag:"robbed_shrine", text:"The coins are cold. The wind picks up behind you."}},
            {label:"Study the carvings", check:{skill:"History", dc:13}, tags:["curiosity"], ok:{xp:50, reveal:true, text:"The carvings point toward a lost site nearby."}, fail:{text:"The script is too worn to read."}}]},
  {id:"herbs", biomes:"fgs", title:"Healing herbs", text:"A patch of silver-leaf and bloodroot grows in a sunlit hollow.",
   choices:[{label:"Gather herbs", check:{skill:"Nature", dc:11}, tags:["curiosity"], ok:{items:[{name:"Potion of Healing", type:"potion", qty:2}], text:"You brew two healing draughts from the herbs."}, fail:{cond:"poisoned", condNote:"until long rest", who:"one", text:"One of the leaves was nightshade. Someone feels awful."}},
            {label:"Move on", ok:{text:"You press on."}}]},
  {id:"caravan", biomes:"gha", title:"A merchant caravan", text:"A line of wagons creaks along the road, guarded by bored sellswords. The merchant waves you over.",
   choices:[{label:"Browse their wares", ok:{shop:true, text:"The merchant throws back a canvas cover with a flourish."}},
            {label:"Swap news with the guards", check:{skill:"Persuasion", dc:10}, tags:["curiosity"], ok:{reveal:true, xp:25, text:"The guards share rumors of a place off the beaten path."}, fail:{text:"The guards aren't in a talking mood."}}]},
  {id:"river", biomes:"gfsw", title:"A swollen river", text:"Spring floods have swept the bridge away. The water runs fast and cold.",
   choices:[{label:"Wade across together", check:{skill:"Athletics", dc:12, group:true}, tags:["bravery"], ok:{text:"Arm in arm, you make it across."}, fail:{damage:"1d6", dtype:"cold", who:"all", text:"The current batters you against the rocks before you reach the far bank."}},
            {label:"Search for a ford (costs time)", check:{skill:"Survival", dc:12}, tags:["caution"], ok:{text:"You find a shallow crossing downstream."}, fail:{text:"Hours of searching. You cross eventually, soaked and tired.", cond:"exhausted", condNote:"until long rest", who:"one"}}]},
  {id:"storm", biomes:"hmt", title:"A mountain storm", text:"Black clouds pile over the peaks. Hail begins to fall.",
   choices:[{label:"Find shelter", check:{skill:"Survival", dc:13}, tags:["caution"], ok:{xp:25, text:"You find a dry cave and wait out the storm."}, fail:{damage:"1d8", dtype:"cold", who:"all", text:"The storm catches you in the open."}},
            {label:"Push on through", check:{skill:"Athletics", dc:14, group:true}, tags:["bravery"], ok:{text:"You march through the hail and gain precious time."}, fail:{cond:"exhausted", condNote:"until long rest", who:"all", text:"The storm leaves everyone drained."}}]},
  {id:"lights", biomes:"fsm", title:"Strange lights", text:"Pale lights drift between the trees, bobbing just out of reach.",
   choices:[{label:"Follow the lights", check:{skill:"Arcana", dc:13}, tags:["curiosity"], ok:{items:[{name:"Scroll of Misty Step", type:"scroll", spell:"Misty Step"}], xp:50, text:"The lights lead you to a hollow tree with a scroll tucked inside."}, fail:{combat:"swamp", text:"The lights were bait. Something lurches from the dark."}},
            {label:"Look away and keep to the path", tags:["caution"], ok:{text:"The lights fade behind you."}}]},
  {id:"camp", biomes:"gfh", title:"An abandoned camp", text:"A fire still smoulders in a hastily abandoned camp. Bedrolls lie tangled, and there's a strongbox under a cart.",
   choices:[{label:"Search the camp", check:{skill:"Investigation", dc:12}, tags:["curiosity"], ok:{loot:"minor", text:"You find what the campers left behind."}, fail:{combat:"bandit", text:"The campers come back, and they're not happy to see you."}},
            {label:"Leave it alone", tags:["caution"], ok:{text:"Whatever happened here isn't your business."}}]},
  {id:"battlefield", biomes:"gha", title:"An old battlefield", text:"Rusted helms and bones poke from the grass. The air is cold here.",
   choices:[{label:"Scavenge the field", check:{skill:"Perception", dc:12}, tags:["greed"], ok:{loot:"minor", text:"Among the rust you find a few treasures."}, fail:{combat:"undead", text:"The dead do not like being disturbed."}},
            {label:"Say a prayer for the fallen", check:{skill:"Religion", dc:10}, tags:["piety","mercy"], ok:{xp:25, text:"The cold lifts a little. You feel lighter."}, fail:{text:"The silence doesn't answer."}}]},
  {id:"toll", biomes:"gh", title:"The toll bridge", text:"Three armed toughs block a bridge. 'Toll's ten gold,' says the biggest. 'Each.'",
   choices:[{label:"Pay the toll (10 gp)", cost:{gold:10}, tags:["caution"], ok:{text:"They step aside with mocking bows."}},
            {label:"Intimidate them", check:{skill:"Intimidation", dc:13}, tags:["bravery"], ok:{xp:50, text:"They look at your weapons, then at each other, and scatter."}, fail:{combat:"bandit", text:"They draw steel."}},
            {label:"Talk your way through", check:{skill:"Deception", dc:13}, tags:["deceit"], ok:{xp:50, text:"You convince them you're tax collectors. They pay YOU."}, fail:{combat:"bandit", text:"'Nice try.' Swords come out."}}]},
  {id:"tracks", biomes:"fhmt", title:"Enormous tracks", text:"Fresh tracks, far too large for a wolf, cross the trail and head into the brush.",
   choices:[{label:"Hunt the beast", check:{skill:"Survival", dc:13}, tags:["bravery"], ok:{combat:"beast", text:"You find it first and strike before it can charge."}, fail:{combat:"beast", surprised:true, text:"It finds you first."}},
            {label:"Give it a wide berth", check:{skill:"Stealth", dc:12, group:true}, tags:["caution"], ok:{text:"You slip past its territory."}, fail:{combat:"beast", text:"A roar. It's seen you."}}]},
  {id:"child", biomes:"gfh", title:"A lost child", text:"A small child sits crying on a stump, insisting their village is 'that way', pointing nowhere in particular.",
   choices:[{label:"Help them home", check:{skill:"Survival", dc:11}, tags:["mercy"], ok:{xp:50, gold:"2d6", flag:"returned_child", text:"You find the village; the parents press a few coins on you and the whole hamlet cheers."}, fail:{xp:25, text:"It takes all day, but you get them home."}},
            {label:"Point them to the road and go", tags:["caution","cruelty"], ok:{text:"You leave the child on the road."}}]},
  {id:"hermit", biomes:"fmst", title:"A hermit's hut", text:"Smoke rises from a crooked hut. An old hermit peers out and beckons with a bony finger.",
   choices:[{label:"Accept their hospitality", check:{skill:"Insight", dc:12}, tags:["curiosity"], ok:{heal:"all", reveal:true, text:"The hermit is kind and knows these lands. You leave rested and wiser."}, fail:{cond:"poisoned", condNote:"until long rest", who:"all", text:"The stew was 'seasoned' with something awful."}},
            {label:"Politely decline", tags:["caution"], ok:{text:"The hermit shrugs and shuts the door."}}]}
];

// ---- Bounty board templates ----
const BOUNTIES = [
  {kind:"clear", title:"Clear out {place}", text:"Something has made its lair at {place}, and travellers keep vanishing on the roads nearby. End it.", mult:1.2},
  {kind:"clear", title:"Bounty: the beasts of {place}", text:"Farmers near {place} have lost livestock, then a shepherd. The reeve pays for proof the killers are dead.", mult:1.1},
  {kind:"clear", title:"The trouble at {place}", text:"The council offers a purse to anyone who ends the threat lurking at {place}.", mult:1.0},
  {kind:"recover", title:"Recover the {relic}", text:"The {relic} was stolen and taken to {place}. Bring it back.", mult:1.3},
  {kind:"deliver", title:"Deliver a letter to {town}", text:"A sealed letter must reach {town}, quickly and unopened.", mult:0.5},
  {kind:"scout", title:"Scout {place}", text:"The watch wants eyes on {place}. Go there and report what you find.", mult:0.6},
  {kind:"recover", title:"The lost {relic}", text:"A dying pilgrim swore the {relic} lies somewhere in {place}. The temple pays well for its return.", mult:1.4},
  {kind:"deliver", title:"Medicine for {town}", text:"A fever has struck {town}. Carry this sealed crate of remedies there before it spreads.", mult:0.6}
];
const RELICS = ["Silver Reliquary","Mayor's Signet","Moonlit Chalice","Book of Tides","Ancestor's Blade","Glass Crown","Saint's Lantern"];

// ---- Name generators ----
const NAME_PARTS = {
  town:[["Ash","Bram","Cold","Dun","Elder","Fair","Gold","Hollow","Iron","Kings","Marsh","North","Oak","Raven","Salt","Stone","Thorn","West","Wolf","Wyn"],["ford","wick","mere","haven","by","stead","holm","gate","bridge","vale","moor","wood","crest","fall","hollow","reach"]],
  wild:[["Whispering","Black","Grey","Sunken","Weeping","Old","Silent","Red","Frost","Shadow","Bleak","Thorn","Howling","Misty"],{forest:["Wood","Weald","Thicket","Forest"],mountain:["Peaks","Crag","Spire","Heights"],swamp:["Fen","Mire","Bog","Marsh"],lake:["Mere","Lake","Tarn","Water"],road:["Road","Pass","Crossing"],hills:["Downs","Hills","Barrows"]}],
  dungeon:[["The Sunken","The Forgotten","The Shattered","The Howling","The Black","The Drowned","The Ashen","The Bone","The Whispering","The Hollow"],{dungeon:["Vault","Halls","Keep","Catacombs"],cave:["Caves","Grotto","Delve","Warren"],ruins:["Ruins","Abbey","Citadel","Temple"],castle:["Keep","Fortress","Bastion"],tower:["Tower","Spire","Observatory"],temple:["Shrine","Sanctum","Temple"]}],
  person:{first:["Ada","Bram","Cora","Dain","Edda","Finn","Greta","Hal","Isra","Jory","Kell","Lio","Mara","Ned","Osk","Pell","Rhea","Sten","Tova","Ulf","Vira","Wade","Yeva","Zan"], last:["Ashby","Brook","Crane","Dell","Fairweather","Grange","Holt","Kettle","Marsh","Oakes","Pike","Reed","Stone","Thatcher","Vale","Wren"]},
  tavern:[["The Drunken","The Prancing","The Rusty","The Laughing","The Sleeping","The Gilded","The Crooked","The Wandering","The Salty","The Three"],["Dragon","Pony","Anchor","Goblin","Giant","Goose","Lantern","Barrel","Crow","Kettles"]]
};
function genName(kind, sub){
  const P = NAME_PARTS[kind];
  if (kind === "town") return pick(P[0]) + pick(P[1]);
  if (kind === "tavern") return pick(P[0]) + " " + pick(P[1]);
  if (kind === "person") return pick(P.first) + " " + pick(P.last);
  const nouns = P[1][sub] || Object.values(P[1])[0]; return pick(P[0]) + " " + pick(nouns);
}
const SERVICES = { city:["inn","market","temple","smith","board","guild"], town:["inn","market","temple","smith","board"], village:["inn","market","board"], port:["inn","market","temple","board"], camp:["market"], temple:["temple"], tavern:["inn"], shop:["market"] };
const SERVICE_INFO = {
  inn:{label:"Tavern", icon:"tavern", desc:"Rest, hear rumors, recruit companions."},
  market:{label:"Market", icon:"shop", desc:"Buy supplies and sell loot."},
  temple:{label:"Temple", icon:"temple", desc:"Healing, cures and resurrection."},
  smith:{label:"Smithy", icon:"sword", desc:"Weapons and armor."},
  board:{label:"Notice board", icon:"quest", desc:"Bounties and odd jobs."},
  guild:{label:"Adventurers' guild", icon:"star", desc:"Veteran recruits and rare wares."}
};
</script>
<script>
"use strict";
// ======================= MORE ENCOUNTERS =======================
Object.assign(BESTIARY, {
  "Mimic":{hp:58,ac:12,xp:450,type:"monstrosity",mods:{STR:3,DEX:1,CON:2},pp:11,atk:[["Pseudopod",5,"1d8+3","bludgeoning",0,{save:"STR",dc:13,cond:"restrained"}],["Bite",5,"1d8+3","piercing"]],multi:["Pseudopod","Bite"],beh:"brute"}
});
EVENTS.push(
  {id:"chest", biomes:"fhmgs", title:"An unattended chest", text:"An iron-bound chest sits in the middle of the path, lid slightly open. No cart, no tracks, no owner.",
   choices:[{label:"Study it before touching anything", check:{skill:"Investigation", dc:13}, tags:["caution"], ok:{enemies:[{name:"Mimic",count:1}], surprise:"enemies", text:"The 'wood grain' is breathing. It's a mimic, and now it knows you know."}, fail:{loot:"minor", xp:10, text:"Just an abandoned chest after all, with a few coins inside."}},
            {label:"Throw it open", tags:["greed","bravery"], ok:{enemies:[{name:"Mimic",count:1}], surprise:"player", text:"The lid snaps shut on your arm. The chest has teeth!"}},
            {label:"Leave it well alone", tags:["caution"], ok:{text:"Some treasures are better left on the road."}}]},
  {id:"procession", biomes:"gsft", title:"The procession of the dead", text:"At dusk, pale lanterns drift along the road: a silent funeral procession of translucent mourners carrying an empty bier.",
   choices:[{label:"Step aside and bow your head", check:{skill:"Religion", dc:12}, tags:["piety","mercy"], ok:{cond:"blessed", who:"all", condNote:"the dead's blessing, until your next battle", xp:20, text:"The last mourner pauses and touches each of your brows with cold fingers. A strange calm settles on you."}, fail:{text:"The procession passes without a glance, leaving frost on the grass."}},
            {label:"Follow them to their destination", check:{skill:"WIS", dc:13, group:true, save:true}, tags:["curiosity","bravery"], ok:{reveal:true, xp:30, text:"They lead you to a forgotten place before fading with the dawn."}, fail:{cond:"frightened", who:"all", condNote:"until your next rest", text:"Their hollow eyes turn toward you all at once. You run and don't stop for a mile."}},
            {label:"Attack the apparitions", tags:["violence"], ok:{combat:"undead", text:"The lanterns flare green and the mourners draw rusted blades."}}]},
  {id:"rivals", biomes:"gfh", title:"A rival company", text:"A band of well-armed adventurers blocks the road, sporting crimson pennants and a smug leader who's heard of you. 'Heading to our dungeon, are we?'",
   choices:[{label:"Share a drink and trade news", check:{skill:"Persuasion", dc:13}, tags:["honesty","mercy"], ok:{reveal:true, xp:25, flag:"befriended_crimson_pennants", text:"After a skin of wine they're almost pleasant, and they mark a place on your map."}, fail:{text:"They laugh at you and ride on. You'll probably meet again."}},
            {label:"Wager on an arm-wrestling match", check:{skill:"Athletics", dc:14}, cost:{gold:25}, tags:["bravery"], ok:{gold:60, xp:20, text:"Their champion's arm hits the table. The purse is yours."}, fail:{text:"Your arm hits the table. They pocket your coin, grinning."}},
            {label:"Teach them some manners", tags:["violence","bravery"], ok:{combat:"bandit", text:"Steel rings out. The Crimson Pennants were hoping you'd say that.", flag:"fought_crimson_pennants"}}]},
  {id:"bridge", biomes:"hmf", title:"The groaning bridge", text:"A rope bridge spans a deep gorge. Several planks are missing, and the ropes creak in the wind.",
   choices:[{label:"Cross carefully, one at a time", check:{skill:"Acrobatics", dc:12, group:true}, tags:["bravery"], ok:{xp:20, text:"Everyone makes it across, hearts pounding."}, fail:{damage:"2d6", dtype:"bludgeoning", who:"one", text:"A plank snaps. Someone dangles over the drop before being hauled up, battered."}},
            {label:"Take the long way around", tags:["caution"], ok:{days:1, text:"The detour costs you a full day."}}]},
  {id:"feyring", biomes:"f", title:"The fairy ring", text:"A ring of pale mushrooms glows in a clearing, and music without musicians drifts from its center.",
   choices:[{label:"Join the dance", check:{skill:"Performance", dc:13}, tags:["curiosity"], ok:{loot:"chest", xp:30, text:"Invisible partners whirl you until dawn, then leave a gift in the grass."}, fail:{cond:"exhausted", who:"all", days:1, text:"You dance for what feels like minutes. It was a full day and a night, and your legs ache."}},
            {label:"Leave an offering of silver", cost:{gold:10}, tags:["piety","mercy"], ok:{heal:true, cond:"blessed", who:"all", condNote:"fey favor, until your next battle", text:"The music softens. Your wounds knit and the air tastes sweet."}},
            {label:"Walk around it", tags:["caution"], ok:{text:"Wise. Fey bargains rarely end well."}}]},
  {id:"childfog", biomes:"sf", title:"A lost child", text:"A little girl sobs in the fog, begging you to help her find her grandmother's cottage 'just past the dead trees'.",
   choices:[{label:"Something's wrong. Look closer", check:{skill:"Insight", dc:14}, tags:["caution"], ok:{combat:"swamp", surprise:"enemies", xp:20, text:"Her feet don't touch the ground. The illusion shatters, and the hag's servants lunge from the reeds too late."}, fail:{combat:"swamp", surprise:"player", text:"You follow her into the dead trees. The fog closes. Something laughs."}},
            {label:"Follow her home", tags:["mercy"], ok:{combat:"swamp", surprise:"player", text:"The 'cottage' is a ring of bones, and the child is gone."}},
            {label:"Refuse and keep moving", tags:["caution","cruelty"], ok:{text:"Her sobbing turns to laughter behind you. You don't look back."}}]},
  {id:"shadowoverhead", biomes:"mhg", title:"A shadow in the sky", text:"A vast shadow slides across the land. Something enormous circles overhead, scanning the ground.",
   choices:[{label:"Everyone hide", check:{skill:"Stealth", dc:13, group:true}, tags:["caution"], ok:{xp:30, text:"It passes. Its roar echoes from the mountains for a long time."}, fail:{combat:"dragon", text:"It doesn't land, but its kobold scouts saw you, and they're coming."}},
            {label:"Keep walking and look unappetizing", tags:["bravery"], ok:{text:"It's hunting bigger prey today. Probably."}}]},
  {id:"cache", biomes:"gfhmsat", title:"A ranger's mark", text:"An old ranger's sign is carved into a stone: three notches and an arrow pointing to a cairn.",
   choices:[{label:"Search the cairn", check:{skill:"Survival", dc:12}, tags:["curiosity"], ok:{loot:"chest", text:"Beneath the stones: a sealed cache left for travellers who can read the signs."}, fail:{text:"Just stones. Someone got here first."}},
            {label:"Leave it for someone who needs it more", tags:["mercy"], ok:{xp:15, text:"You add a stone to the cairn and move on."}}]},
  {id:"deserter", biomes:"gh", title:"The deserter", text:"A young soldier in a torn tabard begs you not to report him. 'They were going to hang us for losing the fort. I just ran.'",
   choices:[{label:"Let him go and share some food", tags:["mercy"], ok:{reveal:true, xp:15, flag:"spared_deserter", text:"Grateful, he tells you about a place the army avoids."}},
            {label:"Turn him in for the reward", tags:["honesty","gold"], ok:{gold:30, flag:"turned_in_deserter", text:"The patrol pays well. He doesn't look at you as they take him."}},
            {label:"Question him hard", check:{skill:"Intimidation", dc:12}, tags:["cruelty"], ok:{reveal:true, text:"He babbles everything he knows, then flees."}, fail:{text:"He bolts into the trees."}}]},
  {id:"fallenstar", biomes:"ghat", title:"A falling star", text:"A streak of fire splits the night sky and slams into a hillside nearby, lighting it up like day.",
   choices:[{label:"Examine the crater", check:{skill:"Arcana", dc:14}, tags:["curiosity"], ok:{loot:"boss", xp:25, text:"At the center, cooling, is a lump of star-metal, and something else that hums with power."}, fail:{damage:"2d6", dtype:"fire", who:"one", text:"The rock is still molten under its crust. Someone gets burned."}},
            {label:"Keep away from it", tags:["caution"], ok:{text:"By morning, the hillside is crawling with scavengers. Good call."}}]},
  {id:"storm", biomes:"gfhmsat", title:"A sudden storm", text:"The sky turns the color of a bruise. Wind rips at your cloaks and the first hail stones start to fall.",
   choices:[{label:"Find shelter fast", check:{skill:"Survival", dc:13}, tags:["caution"], ok:{reveal:true, text:"You find a cave just in time, and it goes deeper than you expected."}, fail:{cond:"exhausted", who:"all", text:"You spend a miserable night in the open."}},
            {label:"Push through it", check:{skill:"CON", dc:12, group:true, save:true}, tags:["bravery"], ok:{xp:20, text:"Soaked and freezing, you make good time."}, fail:{damage:"1d6", dtype:"cold", who:"all", text:"The hail hammers you all bloody."}}]}
);
// things that happen when you arrive in a town
const TOWN_EVENTS = [
  {id:"pickpocket", title:"Light fingers", text:"In the crowd, a hand brushes your belt pouch and a small figure darts away between the stalls.",
   choices:[{label:"Give chase", check:{skill:"Athletics", dc:13}, tags:["bravery"], ok:{gold:"3d6", xp:15, text:"You catch the urchin by the collar. They drop your coins and a few other people's."}, fail:{gold:-10, text:"They vanish into the alleys with 10 of your gold."}},
            {label:"Shout for the watch", tags:["honesty"], ok:{gold:-5, text:"The watch shrugs. Five gold lighter, you move on."}}]},
  {id:"brawl", title:"A street brawl", text:"A tavern fight spills into the street: fists, bottles, and one very determined goat.",
   choices:[{label:"Break it up", check:{skill:"Intimidation", dc:13}, tags:["bravery","mercy"], ok:{gold:15, xp:20, flag:"stopped_brawl", text:"One roar and the brawlers freeze. The grateful innkeeper presses a purse into your hand."}, fail:{damage:"1d4", dtype:"bludgeoning", who:"one", text:"Someone hits you with a chair for your trouble."}},
            {label:"Join in!", check:{skill:"Athletics", dc:12, group:true}, tags:["violence","bravery"], ok:{xp:25, text:"When the dust settles, you're buying rounds for your new best friends."}, fail:{damage:"1d6", dtype:"bludgeoning", who:"all", text:"You all wake up in the gutter, but it was worth it."}},
            {label:"Walk around it", tags:["caution"], ok:{text:"Not your fight."}}]},
  {id:"messenger", title:"A messenger in livery", text:"A breathless messenger in a noble's colors pushes through the crowd. 'You're the adventurers? My lady has work, and she pays in gold.'",
   choices:[{label:"Hear the offer", tags:["gold","curiosity"], ok:{bounty:true, text:"A sealed contract changes hands. The job is yours if you want it."}},
            {label:"Not interested", tags:["caution"], ok:{text:"The messenger looks offended and hurries off."}}]},
  {id:"doomsayer", title:"The doomsayer", text:"A wild-eyed preacher stands on a barrel, screaming about the coming darkness and the one who brings it.",
   choices:[{label:"Listen closely", check:{skill:"Insight", dc:11}, tags:["curiosity"], ok:{revealLair:true, xp:20, text:"Between the ravings are real details: a name, and a place."}, fail:{text:"Just ravings. The crowd pelts him with cabbages."}},
            {label:"Toss him a coin", cost:{gold:2}, tags:["mercy"], ok:{revealLair:true, text:"'Bless you,' he whispers, and tells you exactly where the darkness waits."}}]},
  {id:"festival", title:"A festival!", text:"Bunting, music and the smell of roasting meat: the town is celebrating a harvest saint's day.",
   choices:[{label:"Perform for the crowd", check:{skill:"Performance", dc:12}, tags:["bravery"], ok:{gold:"4d6", xp:20, text:"The crowd roars and coins rain on the cobbles."}, fail:{text:"A heckler steals the show. At least the food is good."}},
            {label:"Eat, drink and rest", cost:{gold:5}, tags:["gold"], ok:{heal:true, text:"A long afternoon of feasting mends body and spirit."}}]}
];
</script>
