<script>
"use strict";
// =====================================================================
//  SITES: visual, explorable floor plans for every kind of place.
//  A site is a set of floors; each floor holds rooms (rectangles in 5-ft units) joined by doors,
//  stairs, trapdoors and grates. Rooms hold furniture, interactive objects, people, enemies,
//  secrets and hazards. Dungeons, taverns, castles, sewers and towns all use the same system.
//  Everything is generated from a seed (the place's id), so a place always looks the same,
//  and every change the party makes (opened chests, freed prisoners, burned rooms) is kept.
// =====================================================================
const SITE_V = 2;
const SITE_STYLES = {
  wood:   { floor: "#8a6a44", floor2: "#7a5c3a", wall: "#3a2a1a", line: "#5a4328", label: "timber and plaster" },
  stone:  { floor: "#8f8a80", floor2: "#7e7970", wall: "#2e2a26", line: "#5a554d", label: "cut stone" },
  marble: { floor: "#cfc9bd", floor2: "#bfb8aa", wall: "#4a4440", line: "#8a847a", label: "marble and gilt" },
  cave:   { floor: "#6a6058", floor2: "#5a5048", wall: "#1e1a18", line: "#3e3632", label: "raw rock", rough: true },
  sewer:  { floor: "#4e5a52", floor2: "#3e4a44", wall: "#1c201e", line: "#324039", label: "slick brick", rough: false },
  crypt:  { floor: "#6b6866", floor2: "#5b5856", wall: "#1a1818", line: "#3b3836", label: "old bone-grey stone" },
  ruin:   { floor: "#8a8270", floor2: "#78705e", wall: "#3a362e", line: "#6a6454", label: "broken masonry", rough: true },
  ship:   { floor: "#9a7a4e", floor2: "#8a6a40", wall: "#3a2a18", line: "#5a4328", label: "tarred planks" },
  fey:    { floor: "#6a8a7a", floor2: "#5a7a6a", wall: "#243a30", line: "#3e6a52", label: "living wood and moss", rough: true },
  tent:   { floor: "#9a8a62", floor2: "#8a7a52", wall: "#4a3a22", line: "#6a5a3a", label: "trampled earth and canvas" },
  field:  { floor: "#7f9d58", floor2: "#6f8d48", wall: "#2a3a1a", line: "#4a6a30", label: "open ground", rough: true },
  ice:    { floor: "#c8d8e4", floor2: "#b4c6d4", wall: "#3a4a5a", line: "#7a8a9a", label: "ice and snow" },
};
// what an object can do, how it looks, how it is described
const OBJ = {
  table:{ n:"table", w:2, h:1, cover:true }, chair:{ n:"chair", w:1, h:1 }, bar:{ n:"bar counter", w:4, h:1, wall:true, cover:true }, stool:{ n:"stool", w:1, h:1 },
  fireplace:{ n:"fireplace", w:2, h:1, wall:true, acts:["examine"], lit:true }, bed:{ n:"bed", w:2, h:1, wall:true, acts:["rest"] }, bedroll:{ n:"bedroll", w:1, h:1, acts:["rest"] },
  shelf:{ n:"shelves", w:2, h:1, wall:true, acts:["search"] }, bookshelf:{ n:"bookshelf", w:2, h:1, wall:true, acts:["read","search"] }, chest:{ n:"chest", w:1, h:1, wall:true, acts:["open"], container:true },
  crate:{ n:"crates", w:1, h:1, acts:["search"], container:true, cover:true }, barrel:{ n:"barrels", w:1, h:1, acts:["search"], container:true, cover:true }, sack:{ n:"sacks", w:1, h:1, acts:["search"], container:true },
  altar:{ n:"altar", w:2, h:1, wall:true, acts:["pray","examine"] }, statue:{ n:"statue", w:1, h:1, acts:["examine"], cover:true }, well:{ n:"well", w:1, h:1, acts:["examine"] }, lever:{ n:"lever", w:1, h:1, wall:true, acts:["use"] },
  pillar:{ n:"pillar", w:1, h:1, cover:true }, cage:{ n:"cage", w:1, h:1, acts:["open"] }, pool:{ n:"pool", w:2, h:2, acts:["examine"] }, rubble:{ n:"rubble", w:2, h:1, acts:["search"], cover:true },
  bones:{ n:"bones", w:1, h:1, acts:["search"] }, campfire:{ n:"campfire", w:1, h:1, acts:["rest"], lit:true }, forge:{ n:"forge", w:2, h:1, wall:true, acts:["examine"], lit:true }, anvil:{ n:"anvil", w:1, h:1 },
  cauldron:{ n:"cauldron", w:1, h:1, acts:["examine"] }, lectern:{ n:"lectern", w:1, h:1, acts:["read"] }, candles:{ n:"candles", w:1, h:1, lit:true }, cart:{ n:"cart", w:2, h:1, acts:["search"], cover:true },
  boat:{ n:"boat", w:3, h:1, acts:["examine"] }, coffin:{ n:"coffin", w:2, h:1, acts:["open"], container:true }, sarcophagus:{ n:"sarcophagus", w:2, h:1, acts:["open"], container:true }, rack:{ n:"weapon rack", w:2, h:1, wall:true, acts:["take"] },
  desk:{ n:"desk", w:2, h:1, acts:["search"], container:true }, wardrobe:{ n:"wardrobe", w:1, h:1, wall:true, acts:["search"], container:true }, painting:{ n:"painting", w:1, h:1, wall:true, acts:["examine"] }, notice:{ n:"notice board", w:2, h:1, wall:true, acts:["read"] },
  throne:{ n:"throne", w:1, h:1, wall:true, acts:["examine"] }, torch:{ n:"torch", w:1, h:1, wall:true, lit:true }, hay:{ n:"hay", w:2, h:1, acts:["search"] }, grave:{ n:"grave", w:1, h:2, acts:["search"] }, web:{ n:"thick webs", w:2, h:2, acts:["examine"] },
  mushrooms:{ n:"giant mushrooms", w:2, h:1, acts:["examine"] }, crystal:{ n:"glowing crystals", w:1, h:1, acts:["examine"], lit:true }, rune:{ n:"rune circle", w:2, h:2, acts:["examine"] }, fountain:{ n:"fountain", w:2, h:2, acts:["examine"] },
  tree:{ n:"tree", w:1, h:1, cover:true }, stall:{ n:"market stall", w:2, h:1, acts:["examine"] }, tent:{ n:"tent", w:2, h:2, acts:["search"], container:true }, keg:{ n:"kegs", w:1, h:1, acts:["search"], container:true },
  gallows:{ n:"gallows", w:2, h:1, acts:["examine"] }, bars:{ n:"iron bars", w:1, h:1 }, loom:{ n:"loom", w:2, h:1 }, trough:{ n:"trough", w:2, h:1 }, brazier:{ n:"brazier", w:1, h:1, lit:true, acts:["examine"] },
  body:{ n:"body", w:2, h:1, acts:["search"], container:true }, stain:{ n:"dark stain", w:1, h:1, acts:["examine"], flat:true }, debris:{ n:"broken furniture", w:2, h:1, acts:["examine"], cover:true }, cloth:{ n:"torn cloth", w:1, h:1, acts:["examine"], flat:true },
  marks:{ n:"drag marks", w:2, h:1, acts:["examine"], flat:true }, footprints:{ n:"footprints", w:2, h:1, acts:["examine"], flat:true }, chains:{ n:"chains", w:1, h:1, wall:true, acts:["examine"] }, idol:{ n:"idol", w:1, h:1, acts:["examine"] },
  window:{ n:"window", w:1, h:1, wall:true, flat:true }, portal:{ n:"shimmering portal", w:2, h:2, acts:["examine"], lit:true }, egg:{ n:"great eggs", w:2, h:2, acts:["examine"] }, hoard:{ n:"heap of coins", w:2, h:2, acts:["open"], container:true, lit:true },
  cannon:{ n:"ballista", w:2, h:1, acts:["examine"] }, wheel:{ n:"ship's wheel", w:1, h:1, acts:["examine"] }, hammock:{ n:"hammocks", w:2, h:1, acts:["rest"] }, map:{ n:"map table", w:2, h:1, acts:["read"] },
  bell:{ n:"bell", w:1, h:1, wall:true, acts:["use"] }, plaque:{ n:"plaque", w:1, h:1, wall:true, acts:["read"], flat:true }, grate:{ n:"sewer grate", w:1, h:1, acts:["examine"], flat:true },
  stairs:{ n:"stairs", w:1, h:1, flat:true }, ladder:{ n:"ladder", w:1, h:1, flat:true }, trapdoor:{ n:"trapdoor", w:1, h:1, flat:true },
};
// names drawn from the site's own seed, so a place's people stay the same
function seedName(rng, kind = "person"){ const P = NAME_PARTS[kind]; const at = (a) => a[Math.floor(rng() * a.length)]; if (kind === "person") return `${at(P.first)} ${at(P.last)}`; if (kind === "tavern") return `${at(P[0])} ${at(P[1])}`; if (kind === "town") return at(P[0]) + at(P[1]); return at(P[0]); }
const ROOM_LIGHT = { lit: "lit", dim: "dim", dark: "dark" };
// one of these is picked for a site to make its map tell a story
const VIGNETTES = {
  brawl:     { kinds:["tavern","inn","guildhall"], add:[["debris","social"],["stain","social"],["chair","social"]], note:"Broken chairs and a dark stain: there was a fight here not long ago, and someone lost.", loot:{items:[{name:"Dagger", type:"weapon", base:"Dagger"}]}, dm:"A brawl happened here recently; the loser was dragged out. The regulars know who started it." },
  taken:     { kinds:["tavern","inn","house","manor","farm"], add:[["cloth","private"],["marks","private"],["chair","private"]], note:"A torn sleeve, an overturned chair and drag marks leading toward the door. Someone was taken from here.", dm:"Someone was kidnapped from this room recently. The drag marks lead outside; the kidnappers may use the cellar or the sewers." },
  meeting:   { kinds:["tavern","inn","warehouse","docks"], add:[["candles","private"],["map","private"]], note:"Candle stubs around a map scored with knife marks: a meeting, planned in secret.", dm:"Smugglers (or cultists) hold secret meetings in the private room. The map on the table marks a place in the wilds." },
  ransacked: { kinds:["house","manor","library","lab","shop","alchemist","guildhall"], add:[["debris","any"],["footprints","any"]], note:"Drawers emptied onto the floor, muddy footprints everywhere: someone searched this place in a hurry.", dm:"This place was ransacked by people looking for something specific; they did not find it, so it is still hidden here." },
  ritual:    { kinds:["sewer","crypt","cave","ruins","temple","lab","cemetery"], add:[["candles","any"],["rune","any"],["stain","any"]], note:"A circle of runes, burnt candles and old blood: a ritual was performed here, more than once.", dm:"Cultists perform rituals here. Their next one is soon; evidence of who they are can be found nearby." },
  battle:    { kinds:["ruins","castle","tower","dungeon","mine","camp","lair"], add:[["bones","any"],["body","any"],["debris","any"]], note:"Scattered bones, a rusted blade still gripped by a skeletal hand, scorch marks up the walls: a battle, long ago.", loot:{items:[{name:"Shortsword", type:"weapon", base:"Shortsword"}]}, dm:"A battle was fought here years ago; the dead were never buried, and something keeps them restless." },
  smuggling: { kinds:["warehouse","docks","ship","sewer","tavern"], add:[["crate","storage"],["crate","storage"],["barrel","storage"]], note:"Crates with false bottoms and barrels that slosh too lightly: smuggled goods pass through here.", loot:{gold:40}, dm:"A smuggling ring uses this place. The crates hold contraband; the merchants' guild would pay for proof." },
  escape:    { kinds:["prison","guardhouse","castle"], add:[["chains","cell"],["rubble","cell"]], note:"A loosened bar, scratch marks counting days, and a hole hidden behind a straw mat: someone broke out of here.", dm:"A prisoner escaped through a tunnel from a cell. The guards have not noticed yet." },
  plague:    { kinds:["house","farm","temple","village"], add:[["body","any"],["candles","any"]], note:"Shuttered windows, a wrapped body, bowls of vinegar at every door: sickness came through here.", dm:"A sickness swept this place. The survivors blame a traveler, or a curse." },
};
// people a kind of place is likely to hold (stable per site): role, where they stand, a line they might say
const EXTRAS = {
  tavern:[["innkeeper","service","\"Room's two silver, meal's one. No fighting.\""],["barmaid","social","\"Mind the step, loves.\""],["patron","social","\"Haven't seen you before.\""],["patron","social","\"...and then the bridge just... wasn't there.\""],["minstrel","social","\"A song for a coin, a tale for two.\""],["drunk","social","\"They say it walks at night, y'know.\""]],
  inn:[["innkeeper","service","\"Welcome, welcome. Clean sheets, honest prices.\""],["cook","work","\"Out of my kitchen!\""],["traveler","social","\"The roads are bad this year.\""],["stable hand","any","\"Horses are fed. Yours?\""]],
  shop:[["shopkeeper","service","\"Everything's for sale. Nearly everything.\""],["apprentice","work","\"Don't touch that, please.\""]],
  smith:[["blacksmith","service","\"Steel doesn't lie. People do.\""],["apprentice","work","\"Mind the sparks.\""]],
  alchemist:[["alchemist","service","\"Careful with the green one.\""],["cat","any","\"...\""]],
  temple:[["priest","service","\"The gods see what we do in the dark.\""],["acolyte","any","\"Peace be with you.\""],["pilgrim","social","\"I came a long way to pray here.\""]],
  guardhouse:[["sergeant","service","\"State your business.\""],["guard","any","\"Move along.\""],["guard","any","\"Not another one...\""],["prisoner","cell","\"Psst. Get me out and I'll make it worth your while.\""]],
  prison:[["warden","private","\"Nobody leaves without my seal.\""],["guard","any","\"Keep walking.\""],["prisoner","cell","\"I didn't do it. Well. Not that.\""],["prisoner","cell","\"They took the one in cell three last night. Nobody heard a scream.\""]],
  manor:[["steward","service","\"The master is not receiving visitors.\""],["servant","work","\"Please wipe your boots.\""],["noble","private","\"Do I know you?\""]],
  house:[["resident","any","\"Can I help you?\""]],
  library:[["librarian","service","\"Quiet, please. The books are listening.\""],["scholar","social","\"Fascinating... utterly fascinating.\""]],
  guildhall:[["guildmaster","service","\"Dues are paid on the first of the month.\""],["clerk","work","\"Sign here. And here.\""],["mercenary","social","\"Looking for work, or workers?\""]],
  warehouse:[["foreman","service","\"Deliveries round the back.\""],["porter","work","\"Heavy, this one.\""]],
  docks:[["harbormaster","service","\"Berthing fees are posted.\""],["sailor","social","\"Three days out there's a wreck still burning.\""],["fishwife","social","\"Fresh! Mostly fresh!\""]],
  ship:[["captain","private","\"My ship, my rules.\""],["first mate","any","\"Captain's busy.\""],["sailor","work","\"Haul!\""]],
  farm:[["farmer","any","\"Wolves took two sheep last week.\""],["farmhand","work","\"Mind the bull.\""]],
  cemetery:[["gravedigger","any","\"Ground's soft after rain. Easier for everyone.\""],["mourner","any","\"She was only thirty.\""]],
  market:[["merchant","service","\"Best prices in the valley!\""],["pickpocket","social","\"Sorry, didn't see you there.\""],["town crier","social","\"Hear ye!\""]],
  square:[["town crier","social","\"By order of the council...\""],["beggar","social","\"A coin for an old soldier?\""],["child","social","\"Are you real adventurers?\""]],
  lab:[["wizard","private","\"Don't. Touch. Anything.\""],["homunculus","any","\"Master is working.\""]],
  shrine:[["hermit","any","\"The shrine asks nothing. It gives less.\""]],
};
const SITE_KIND_WORDS = [[/sewer|drain|undercity|cistern/i,"sewer"],[/prison|jail|gaol|dungeon of|cells/i,"prison"],[/guard|watch|barrack|garrison/i,"guardhouse"],[/manor|estate|mansion|villa|hall of lord|palace/i,"manor"],[/cottage|hut|house|home|hovel|cabin/i,"house"],[/librar|archive|athenaeum/i,"library"],[/guild/i,"guildhall"],[/warehouse|storehouse|granary/i,"warehouse"],[/dock|pier|harbor|harbour|wharf|quay/i,"docks"],[/ship|galley|barge|cog\b|vessel/i,"ship"],[/cemeter|graveyard|burial|barrow/i,"cemetery"],[/farm|barn|mill|stable|orchard/i,"farm"],[/mine|quarry|pit\b/i,"mine"],[/crypt|tomb|catacomb|ossuary|mausoleum/i,"crypt"],[/shrine|chapel/i,"shrine"],[/laborator|lab\b|workshop of|sanctum of the mage|alchemist/i,"lab"],[/forge|smith|anvil|armou?rer/i,"smith"],[/apothecar|potion|alchem|herbal/i,"alchemist"],[/market|bazaar/i,"market"],[/square|plaza|commons/i,"square"],[/inn\b|lodge|hostel/i,"inn"],[/tavern|pub|alehouse|taproom|bar\b/i,"tavern"],[/temple|cathedral|abbey|monastery|church/i,"temple"],[/camp|hideout|lair of the bandit|outpost/i,"camp"],[/den|lair|nest|warren/i,"lair"],[/tower|spire|observatory/i,"tower"],[/castle|keep|fort|citadel|bastion|stronghold/i,"castle"],[/cave|cavern|grotto|hollow/i,"cave"],[/ruin|abbey|temple of|forgotten/i,"ruins"]];
const KIND_BY_TYPE = { tavern:"tavern", shop:"shop", temple:"temple", castle:"castle", tower:"tower", cave:"cave", ruins:"ruins", dungeon:"dungeon", camp:"camp", forest:"grove", swamp:"grove", mountain:"cave", lake:"grove", sewer:"sewer", guardhouse:"guardhouse", hall:"guildhall", house:"house", warehouse:"warehouse", docks:"docks", farm:"farm", cemetery:"cemetery", market:"market" };
function siteKindFor(loc, hint){
  if (hint && SITE_PLANS[hint]) return hint;
  if (loc.site?.kind && SITE_PLANS[loc.site.kind]) return loc.site.kind;
  const t = `${loc.name} ${loc.description || ""}`;
  for (const [re, k] of SITE_KIND_WORDS) if (re.test(t) && SITE_PLANS[k]){ if (k === "lab" && loc.type !== "tower" && !/laborator|alchem|workshop/i.test(t)) continue; if (k === "ruins" && loc.type !== "ruins") continue; if ((k === "inn" || k === "tavern") && loc.type !== "tavern" && !/inn\b|tavern/i.test(loc.name)) continue; return k; }
  if (loc.fallen) return "castle";
  if (loc.type === "dungeon"){ const th = loc.theme || loc.villain?.theme; return th === "undead" ? "crypt" : th === "cult" ? "temple-dark" : th === "dragon" ? "lair" : th === "beast" ? "lair" : "dungeon"; }
  return KIND_BY_TYPE[loc.type] || "dungeon";
}
// ---------- room specs: a tiny language for floor plans ----------
// spec: { key, name, type, w, h, from, side, floor, door, p, objs:[...], light, private, service, desc, exit, secret, ... }
const rri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
function R(key, name, o){ return { key, name, ...o }; }
// each plan returns the room specs for a kind of site. `o` carries size, mood, theme, danger.
const SITE_PLANS = {
  tavern(rng, o){
    const big = o.size === "large", small = o.size === "small";
    const sp = [
      R("common", "Common room", { type:"room", entrance:true, w:rri(rng, big?9:7, big?11:8), h:rri(rng,5,6), objs:["bar@wall","fireplace@wall",`table*${big?5:3}`,`chair*${big?8:5}`, "barrel"], light:"lit", desc:"A low-beamed room thick with smoke, ale and talk.", service:"inn", social:true }),
      R("kitchen", "Kitchen", { type:"room", from:"common", w:rri(rng,3,4), h:rri(rng,3,4), objs:["fireplace@wall","table","sack","barrel","keg"], light:"lit", work:true, desc:"Pots clatter; something is always burning a little." }),
      R("store", "Storeroom", { type:"room", from:"kitchen", w:3, h:rri(rng,2,3), objs:["crate*2","barrel","sack"], light:"dim", private:true, storage:true, desc:"Sacks of flour, kegs, and a smell of damp." }),
      R("back", "Back door", { type:"room", from:"kitchen", w:2, h:2, objs:[], light:"dim", exit:"alley", desc:"A narrow door onto the alley behind the inn.", p: 0.85 }),
      R("private", "Private room", { type:"room", from:"common", w:rri(rng,3,4), h:3, objs:["table","chair*3","candles"], light:"dim", private:true, desc:"A room for talk that shouldn't be overheard.", p: small ? 0.5 : 0.9 }),
      R("stairs", "Landing", { type:"room", from:"common", floor:1, door:"stairs", w:3, h:2, objs:[], light:"dim", desc:"A creaking landing above the common room." }),
      R("guest1", "Guest room", { type:"room", from:"stairs", floor:1, w:3, h:3, objs:["bed","chest","chair"], light:"dim", bed:true, desc:"A narrow bed and a shuttered window." }),
      R("guest2", "Guest room", { type:"room", from:"stairs", floor:1, w:3, h:3, objs:["bed","wardrobe"], light:"dim", bed:true, desc:"A bed, a basin, a lock that doesn't quite work.", p: small ? 0.4 : 1 }),
      R("owner", "Owner's room", { type:"room", from:"stairs", floor:1, w:rri(rng,3,4), h:3, objs:["bed","desk","chest","painting@wall"], light:"dim", private:true, owner:true, desc:"The innkeeper's own room: a desk, a strongbox, and a view of the yard." }),
      R("balcony", "Balcony", { type:"room", from:"stairs", floor:1, w:3, h:2, objs:["chair"], light:"lit", high:true, desc:"A balcony over the street.", p: big ? 0.8 : 0.3 }),
      R("cellar", "Cellar", { type:"room", from:"store", floor:-1, door:"trapdoor", w:rri(rng,4,6), h:rri(rng,3,4), objs:["barrel*3","keg","crate","rubble"], light:"dark", private:true, storage:true, desc:"Rows of casks sweat in the dark; the floor is older than the inn." }),
      R("hidden", "Hidden room", { type:"room", from:"cellar", floor:-1, w:3, h:2, objs:["chest","crate"], light:"dark", secret:true, stash:true, desc:"A bricked-off nook behind the casks.", p: 0.55 }),
      R("tunnel", "Smugglers' tunnel", { type:"room", from:"cellar", floor:-1, w:2, h:4, objs:[], light:"dark", secret:true, exit:"sewer", desc:"A damp passage sloping down toward the town's sewers.", p: o.undercity ? 0.8 : 0.3 }),
    ];
    if (o.mood === "noble") { sp[0].name = "Great room"; sp[0].objs = ["bar@wall","fireplace@wall","table*4","chair*8","painting@wall","candles"]; sp[0].desc = "Polished oak, a roaring hearth and the hush of money."; }
    if (o.mood === "rough") { sp[0].objs.push("debris","stain"); sp[0].desc = "Sawdust, spilled ale, and eyes that follow you to the bar."; }
    if (o.mood === "haunted") { sp[0].light = "dark"; sp[0].objs = ["bar@wall","fireplace@wall","table*2","debris*2","web","stain"]; sp[0].desc = "Cold hearth, overturned tables, and dust on every tankard."; }
    return sp;
  },
  inn(rng, o){ const sp = SITE_PLANS.tavern(rng, o); sp[0].name = "Taproom"; sp[0].desc = "A warm taproom where travelers trade news for ale."; sp.push(R("stable", "Stable", { type:"room", from:"common", w:3, h:4, objs:["hay*2","trough","cart"], light:"dim", desc:"Straw, horses, and a sleeping stable hand." })); return sp; },
  shop(rng, o){
    return [
      R("front", "Shop floor", { type:"room", entrance:true, w:rri(rng,5,7), h:rri(rng,4,5), objs:["bar@wall","shelf@wall*2","crate","barrel","candles"], light:"lit", service: o.service || "market", social:true, desc:"Shelves to the ceiling; everything has a price tag, and a second price." }),
      R("back", "Back room", { type:"room", from:"front", w:rri(rng,3,4), h:3, objs:["desk","chest","crate*2"], light:"dim", private:true, storage:true, desc:"Ledgers, strongbox, and the good stock." }),
      R("yard", "Yard", { type:"room", from:"back", w:3, h:3, objs:["cart","crate"], light:"lit", exit:"alley", desc:"A muddy yard with a gate to the alley.", p:0.7 }),
      R("loft", "Loft", { type:"room", from:"back", floor:1, door:"ladder", w:4, h:3, objs:["bed","chest","sack"], light:"dim", private:true, bed:true, desc:"Where the shopkeeper sleeps, above the stock.", p:0.8 }),
      R("cellar", "Cellar", { type:"room", from:"back", floor:-1, door:"trapdoor", w:4, h:3, objs:["crate*3","barrel"], light:"dark", private:true, storage:true, desc:"Stock, dust and rats.", p:0.5 }),
    ];
  },
  smith(rng, o){
    return [
      R("forge", "Forge", { type:"room", entrance:true, w:rri(rng,6,7), h:rri(rng,4,5), objs:["forge@wall","anvil","rack@wall","barrel","table"], light:"lit", service:"smith", social:true, desc:"Heat, hammer-song and the stink of quenched steel." }),
      R("store", "Stock room", { type:"room", from:"forge", w:3, h:3, objs:["crate*2","rack@wall","chest"], light:"dim", private:true, storage:true, desc:"Ingots, blanks and the pieces not for sale." }),
      R("yard", "Coal yard", { type:"room", from:"forge", w:3, h:3, objs:["cart","sack*2"], light:"lit", exit:"alley", desc:"Coal, slag, and a water trough.", p:0.8 }),
      R("loft", "Loft", { type:"room", from:"store", floor:1, door:"ladder", w:4, h:3, objs:["bed","chest"], light:"dim", private:true, bed:true, desc:"The smith's bed, warm from the chimney.", p:0.7 }),
    ];
  },
  alchemist(rng, o){
    return [
      R("front", "Apothecary", { type:"room", entrance:true, w:rri(rng,5,6), h:rri(rng,4,5), objs:["bar@wall","shelf@wall*2","cauldron","candles"], light:"dim", service:"market", social:true, desc:"Jars of things that were alive, things that will be, and things that shouldn't." }),
      R("lab", "Laboratory", { type:"room", from:"front", w:rri(rng,4,5), h:4, objs:["table*2","cauldron","bookshelf@wall","brazier"], light:"dim", private:true, hazard:"gas", desc:"Glassware bubbles; the air tastes of copper." }),
      R("garden", "Herb garden", { type:"room", from:"lab", w:4, h:3, objs:["mushrooms","trough","well"], light:"lit", exit:"alley", desc:"Rows of herbs, some of which lean toward you.", p:0.7 }),
      R("cellar", "Cold cellar", { type:"room", from:"lab", floor:-1, door:"trapdoor", w:4, h:3, objs:["crate*2","cage","chest"], light:"dark", private:true, desc:"Specimens in jars. One jar is empty, and its lid is off.", p:0.6 }),
    ];
  },
  temple(rng, o){
    const dark = o.kind === "temple-dark";
    return [
      R("nave", dark ? "Dark nave" : "Nave", { type: dark ? "combat" : "room", entrance:true, w:rri(rng,7,9), h:rri(rng,6,8), objs:["pillar*4","candles*2","statue", dark ? "brazier" : "lectern"], light: dark ? "dark" : "lit", service: dark ? null : "temple", social: !dark, desc: dark ? "Pews smashed for firewood; the god here has a new name." : "Pews, incense, and light falling through colored glass." }),
      R("altar", dark ? "Blood altar" : "Sanctuary", { type: dark ? "boss" : "room", from:"nave", w:rri(rng,4,5), h:3, objs:["altar@wall","candles*2", dark ? "stain" : "painting@wall"], light:"lit", private: !dark, desc: dark ? "The altar is wet." : "The altar, the relic, the quiet." }),
      R("vestry", "Vestry", { type: dark ? "treasure" : "room", from:"nave", w:3, h:3, objs:["wardrobe","desk","chest"], light:"dim", private:true, desc:"Robes, records, and the offering box." }),
      R("cloister", dark ? "Robing room" : "Cloister", { type: dark ? "trap" : "room", from:"nave", w:4, h:rri(rng,3,4), objs:[dark ? "rack@wall" : "fountain","chair*2"], light:"lit", desc: dark ? "Masks hang on pegs, each with a different smile." : "A quiet garden walk.", p:0.75 }),
      R("crypt", dark ? "Ossuary" : "Crypt", { type: dark ? "combat" : "room", from:"altar", floor:-1, door:"stairs", w:rri(rng,5,6), h:rri(rng,3,4), objs:["coffin*2","candles","bones"], light:"dark", private:true, hazard: dark ? null : null, desc:"Old priests sleep in the wall niches. Some of them snore." }),
      R("secret", dark ? "Hidden shrine" : "Reliquary", { type: dark ? "mystery" : "room", from:"crypt", floor:-1, w:3, h:2, objs:["idol","chest"], light:"dark", secret:true, stash:true, desc:"A sealed niche the mortar does not quite hide.", p:0.6 }),
    ];
  },
  "temple-dark"(rng, o){ return SITE_PLANS.temple(rng, {...o, kind:"temple-dark"}); },
  guardhouse(rng, o){
    return [
      R("hall", "Guard hall", { type:"room", entrance:true, w:rri(rng,6,7), h:rri(rng,4,5), objs:["table*2","chair*4","rack@wall","notice@wall","brazier"], light:"lit", service:"board", social:true, guards:true, desc:"Benches, a duty roster, and bored men in mail." }),
      R("office", "Captain's office", { type:"room", from:"hall", w:4, h:3, objs:["desk","chest","map","painting@wall"], light:"dim", private:true, owner:true, evidence:true, desc:"Reports, a strongbox and a locked drawer." }),
      R("armory", "Armory", { type:"room", from:"hall", w:3, h:3, objs:["rack@wall*2","chest","crate"], light:"dim", private:true, storage:true, desc:"Spears, shields and a lonely ballista bolt." }),
      R("cells", "Cells", { type:"room", from:"hall", w:rri(rng,5,6), h:3, objs:["bars*3","hay*2","chains@wall","bedroll"], light:"dark", private:true, cell:true, desc:"Three cells, two prisoners, one bucket." }),
      R("yard", "Drill yard", { type:"room", from:"hall", w:4, h:4, objs:["rack@wall","trough","gallows"], light:"lit", exit:"alley", desc:"A training yard with a post hacked half through.", p:0.75 }),
      R("barracks", "Barracks", { type:"room", from:"hall", floor:1, door:"stairs", w:5, h:4, objs:["bed*3","chest*2"], light:"dim", private:true, bed:true, desc:"Rows of cots and the smell of boot grease.", p:0.8 }),
      R("tunnel", "Escape tunnel", { type:"room", from:"cells", floor:-1, door:"trapdoor", w:2, h:4, objs:["rubble"], light:"dark", secret:true, exit:"sewer", desc:"A hole behind the straw, dug with spoons and years.", p: o.undercity ? 0.8 : 0.4 }),
    ];
  },
  prison(rng, o){
    return [
      R("gate", "Gatehouse", { type:"room", entrance:true, w:rri(rng,5,6), h:4, objs:["table","chair*2","rack@wall","brazier"], light:"lit", guards:true, desc:"A portcullis, a logbook, and a guard who reads slowly." }),
      R("yard", "Prison yard", { type:"room", from:"gate", w:rri(rng,6,8), h:rri(rng,5,6), objs:["gallows","well","trough"], light:"lit", desc:"High walls, a gallows, and crows that know the schedule." }),
      R("block", "Cell block", { type:"room", from:"yard", w:rri(rng,7,9), h:3, objs:["bars*5","hay*3","chains@wall*2","bedroll*2"], light:"dark", private:true, cell:true, desc:"A corridor of iron doors; every one of them has a story and a smell." }),
      R("interrog", "Interrogation room", { type:"room", from:"block", w:3, h:3, objs:["chair","table","chains@wall","stain","brazier"], light:"dim", private:true, evidence:true, desc:"One chair is bolted to the floor." }),
      R("warden", "Warden's office", { type:"room", from:"gate", floor:1, door:"stairs", w:4, h:3, objs:["desk","chest","bookshelf@wall","painting@wall"], light:"dim", private:true, owner:true, evidence:true, desc:"Keys on a ring, ledgers of bribes." }),
      R("armory", "Armory", { type:"room", from:"gate", w:3, h:3, objs:["rack@wall*2","chest"], light:"dim", private:true, storage:true, desc:"Crossbows, manacles, and a rack of confiscated weapons.", evidence:true }),
      R("deep", "The deep cells", { type:"room", from:"block", floor:-1, door:"stairs", w:5, h:3, objs:["bars*2","chains@wall","bones","bedroll"], light:"dark", private:true, cell:true, important:true, desc:"Where they keep the ones nobody is supposed to ask about." }),
      R("tunnel", "Forgotten tunnel", { type:"room", from:"deep", floor:-1, w:2, h:5, objs:["rubble","bones"], light:"dark", secret:true, exit:"sewer", desc:"Older than the prison. Something used it before the prisoners did.", p: 0.7 }),
    ];
  },
  manor(rng, o){
    return [
      R("foyer", "Entrance hall", { type:"room", entrance:true, w:rri(rng,5,6), h:rri(rng,4,5), objs:["statue","painting@wall*2","candles"], light:"lit", social:true, desc:"A sweeping stair, portraits that judge you, and a servant who does too." }),
      R("parlor", "Parlor", { type:"room", from:"foyer", w:rri(rng,4,5), h:4, objs:["chair*4","table","fireplace@wall","painting@wall"], light:"lit", social:true, desc:"Where guests are received and measured." }),
      R("dining", "Dining hall", { type:"room", from:"foyer", w:rri(rng,5,7), h:4, objs:["table*3","chair*6","candles*2"], light:"lit", desc:"A table that seats twenty and has seated worse." }),
      R("kitchen", "Kitchen", { type:"room", from:"dining", w:4, h:3, objs:["fireplace@wall","table","sack","barrel"], light:"lit", work:true, desc:"Copper pans and a cook with opinions." }),
      R("study", "Study", { type:"room", from:"parlor", w:4, h:3, objs:["desk","bookshelf@wall*2","chest","painting@wall"], light:"dim", private:true, owner:true, evidence:true, desc:"Letters, a safe behind a painting, and a decanter kept company." }),
      R("gallery", "Gallery", { type:"room", from:"foyer", floor:1, door:"stairs", w:rri(rng,5,7), h:2, objs:["painting@wall*3","statue"], light:"dim", high:true, desc:"A balcony of ancestors over the hall." }),
      R("master", "Master bedroom", { type:"room", from:"gallery", floor:1, w:rri(rng,4,5), h:4, objs:["bed","wardrobe","chest","painting@wall"], light:"dim", private:true, bed:true, desc:"A bed like a ship and a jewel box like a lure." }),
      R("guest", "Guest bedroom", { type:"room", from:"gallery", floor:1, w:3, h:3, objs:["bed","chest"], light:"dim", private:true, bed:true, desc:"Made up for a guest who never came.", p:0.8 }),
      R("servants", "Servants' quarters", { type:"room", from:"kitchen", floor:1, door:"stairs", w:4, h:3, objs:["bed*2","chest"], light:"dim", private:true, desc:"Narrow beds, thin walls, good gossip.", p:0.7 }),
      R("cellar", "Wine cellar", { type:"room", from:"kitchen", floor:-1, door:"stairs", w:rri(rng,4,6), h:3, objs:["barrel*4","keg*2","rubble"], light:"dark", private:true, storage:true, desc:"Vintages older than the family's title." }),
      R("vault", "Family vault", { type:"room", from:"cellar", floor:-1, w:3, h:3, objs:["chest","coffin","idol"], light:"dark", secret:true, stash:true, desc:"Behind the oldest cask: the family keeps more than wine.", p:0.65 }),
      R("tunnel", "Escape passage", { type:"room", from:"study", floor:-1, door:"trapdoor", w:2, h:5, objs:[], light:"dark", secret:true, exit:"sewer", desc:"Every noble house has one. This one was used recently.", p: o.undercity ? 0.6 : 0.3 }),
    ];
  },
  house(rng, o){
    return [
      R("main", "Main room", { type:"room", entrance:true, w:rri(rng,4,5), h:rri(rng,3,4), objs:["table","chair*3","fireplace@wall","shelf@wall"], light:"lit", social:true, desc:"A hearth, a table, and the smell of yesterday's stew." }),
      R("bedroom", "Bedroom", { type:"room", from:"main", w:3, h:3, objs:["bed","chest","wardrobe"], light:"dim", private:true, bed:true, desc:"A bed, a trunk, and a window onto the street." }),
      R("yard", "Yard", { type:"room", from:"main", w:3, h:3, objs:["well","trough","hay"], light:"lit", exit:"alley", desc:"Chickens, a woodpile, a gate.", p:0.7 }),
      R("loft", "Loft", { type:"room", from:"main", floor:1, door:"ladder", w:3, h:2, objs:["bedroll","crate"], light:"dark", private:true, desc:"Under the thatch, where the children sleep.", p:0.5 }),
      R("cellar", "Root cellar", { type:"room", from:"main", floor:-1, door:"trapdoor", w:3, h:2, objs:["sack*2","barrel","chest"], light:"dark", private:true, storage:true, desc:"Turnips, and something buried under the turnips.", p:0.5 }),
    ];
  },
  library(rng, o){
    return [
      R("hall", "Reading hall", { type:"room", entrance:true, w:rri(rng,7,9), h:rri(rng,5,6), objs:["bookshelf@wall*4","table*3","chair*6","lectern","candles"], light:"lit", social:true, service:"library", desc:"Galleries of books, the creak of ladders, and a silence with weight." }),
      R("archive", "Archive", { type:"room", from:"hall", w:rri(rng,4,5), h:3, objs:["bookshelf@wall*3","desk","chest"], light:"dim", private:true, evidence:true, desc:"Records nobody has asked for in a century. Until now." }),
      R("scriptorium", "Scriptorium", { type:"room", from:"hall", w:4, h:3, objs:["desk*2","lectern","candles"], light:"lit", work:true, desc:"Scribes copying, ink on every finger." }),
      R("gallery", "Upper gallery", { type:"room", from:"hall", floor:1, door:"stairs", w:rri(rng,6,8), h:2, objs:["bookshelf@wall*3","chair"], light:"dim", high:true, desc:"Rare shelves, chained books." }),
      R("restricted", "Restricted stacks", { type:"room", from:"gallery", floor:1, w:4, h:3, objs:["bookshelf@wall*2","cage","rune"], light:"dark", private:true, important:true, desc:"Books that bite, and one that hums.", locked:true }),
      R("vault", "Hidden vault", { type:"room", from:"archive", floor:-1, door:"trapdoor", w:3, h:3, objs:["chest","lectern","idol"], light:"dark", secret:true, stash:true, desc:"A book-shaped hole in the world.", p:0.6 }),
    ];
  },
  guildhall(rng, o){
    return [
      R("hall", "Great hall", { type:"room", entrance:true, w:rri(rng,7,9), h:rri(rng,5,6), objs:["table*3","chair*6","notice@wall","fireplace@wall","painting@wall"], light:"lit", social:true, service:"guild", desc:"Banners, contracts, and people who make a living with their names." }),
      R("office", "Guildmaster's office", { type:"room", from:"hall", w:4, h:3, objs:["desk","chest","bookshelf@wall","map"], light:"dim", private:true, owner:true, evidence:true, desc:"Where the real deals are signed." }),
      R("vault", "Strongroom", { type:"room", from:"office", w:3, h:2, objs:["chest*2","bars"], light:"dark", private:true, locked:true, stash:true, desc:"Iron door, iron boxes, iron rules." }),
      R("training", "Training hall", { type:"room", from:"hall", w:5, h:4, objs:["rack@wall*2","statue","hay"], light:"lit", desc:"Dummies hacked to splinters and a floor of sweat.", p:0.8 }),
      R("quarters", "Members' quarters", { type:"room", from:"hall", floor:1, door:"stairs", w:5, h:3, objs:["bed*2","chest*2","table"], light:"dim", private:true, bed:true, desc:"Cots for members between jobs.", p:0.8 }),
      R("cellar", "Cellar", { type:"room", from:"hall", floor:-1, door:"stairs", w:4, h:3, objs:["barrel*2","crate*2","rubble"], light:"dark", private:true, storage:true, exit: o.undercity ? "sewer" : null, secret: !!o.undercity, desc:"Supplies, and a wall that sounds hollow.", p:0.7 }),
    ];
  },
  warehouse(rng, o){
    return [
      R("floor", "Warehouse floor", { type:"room", entrance:true, w:rri(rng,8,10), h:rri(rng,5,7), objs:["crate*6","barrel*3","cart","sack*2","pillar*2"], light:"dim", desc:"Stacks of crates to the rafters; every aisle a hiding place." }),
      R("office", "Foreman's office", { type:"room", from:"floor", w:3, h:3, objs:["desk","chest","notice@wall"], light:"dim", private:true, evidence:true, desc:"Manifests that don't add up." }),
      R("loading", "Loading dock", { type:"room", from:"floor", w:4, h:3, objs:["cart*2","crate"], light:"lit", exit:"alley", desc:"Big doors, bigger wagons." }),
      R("loft", "Loft", { type:"room", from:"floor", floor:1, door:"ladder", w:5, h:3, objs:["crate*3","sack","bedroll"], light:"dark", private:true, high:true, desc:"Where the night watchman sleeps instead of watching.", p:0.8 }),
      R("hidden", "Hidden stock", { type:"room", from:"floor", w:3, h:3, objs:["crate*2","chest"], light:"dark", secret:true, stash:true, desc:"A false wall between two stacks.", p:0.7 }),
      R("tunnel", "Smugglers' tunnel", { type:"room", from:"hidden", floor:-1, door:"trapdoor", w:2, h:5, objs:[], light:"dark", secret:true, exit:"sewer", desc:"Goods go down here that never came through the front.", p: o.undercity ? 0.7 : 0.3 }),
    ];
  },
  docks(rng, o){
    return [
      R("quay", "Quay", { type:"room", entrance:true, w:rri(rng,9,12), h:3, objs:["crate*3","barrel*2","boat","cart"], light:"lit", social:true, outdoor:true, desc:"Gulls, ropes, and shouting; the sea slaps the stones." }),
      R("harbor", "Harbormaster's house", { type:"room", from:"quay", w:4, h:3, objs:["desk","chest","map","notice@wall"], light:"lit", service:"board", social:true, desc:"Berthing ledgers and a spyglass." }),
      R("pier", "Long pier", { type:"room", from:"quay", w:2, h:rri(rng,5,7), objs:["boat","crate"], light:"lit", outdoor:true, desc:"Planks that end in deep water.", escape:true }),
      R("shed", "Net shed", { type:"room", from:"quay", w:4, h:3, objs:["sack*2","crate","web"], light:"dark", private:true, storage:true, desc:"Nets, tar, and something that isn't fish." }),
      R("ship", "Moored ship", { type:"room", from:"pier", w:4, h:6, objs:["wheel","hammock","crate*2","barrel"], light:"dim", private:true, desc:"A trader riding at the pier, crew ashore.", p:0.7, boat:true }),
      R("hold", "Ship's hold", { type:"room", from:"ship", floor:-1, door:"ladder", w:4, h:4, objs:["crate*4","barrel*2","chest"], light:"dark", private:true, storage:true, stash:true, desc:"Cargo that's been sealed with more than tar.", p:0.7 }),
      R("tunnel", "Tide tunnel", { type:"room", from:"shed", floor:-1, door:"trapdoor", w:2, h:4, objs:["pool"], light:"dark", secret:true, exit:"sewer", desc:"A passage the sea fills twice a day.", p: o.undercity ? 0.7 : 0.35 }),
    ];
  },
  ship(rng, o){
    return [
      R("deck", "Main deck", { type:"room", entrance:true, w:rri(rng,4,5), h:rri(rng,8,10), objs:["wheel","cannon*2","barrel*2","crate"], light:"lit", outdoor:true, social:true, desc:"Rigging creaks; the deck heaves under you." }),
      R("cabin", "Captain's cabin", { type:"room", from:"deck", w:4, h:3, objs:["bed","desk","map","chest","painting@wall"], light:"dim", private:true, owner:true, evidence:true, desc:"Charts, a locked chest, a bottle with a letter in it." }),
      R("crew", "Crew deck", { type:"room", from:"deck", floor:-1, door:"ladder", w:4, h:6, objs:["hammock*3","table","chest","barrel"], light:"dim", bed:true, desc:"Hammocks swing in the dark; someone is always snoring." }),
      R("galley", "Galley", { type:"room", from:"crew", floor:-1, w:3, h:3, objs:["fireplace@wall","table","sack*2","keg"], light:"lit", work:true, desc:"A stove and a cook with one eye." }),
      R("hold", "Hold", { type:"room", from:"crew", floor:-2, door:"ladder", w:4, h:7, objs:["crate*5","barrel*3","sack*2","cage"], light:"dark", private:true, storage:true, stash:true, hazard:"water", desc:"Bilgewater, rats, and the real cargo." }),
      R("brig", "Brig", { type:"room", from:"hold", floor:-2, w:2, h:3, objs:["bars","chains@wall","bedroll"], light:"dark", private:true, cell:true, desc:"One cell, one prisoner, one secret.", p:0.7 }),
    ];
  },
  farm(rng, o){
    return [
      R("yard", "Farmyard", { type:"room", entrance:true, w:rri(rng,7,9), h:rri(rng,5,6), objs:["well","cart","trough","hay","tree"], light:"lit", outdoor:true, social:true, desc:"Mud, geese and a dog that hasn't decided about you." }),
      R("house", "Farmhouse", { type:"room", from:"yard", w:5, h:4, objs:["table","chair*3","fireplace@wall","bed","chest"], light:"lit", private:true, bed:true, desc:"One room for everything, including the lambs in winter." }),
      R("barn", "Barn", { type:"room", from:"yard", w:5, h:5, objs:["hay*3","cart","rack@wall","trough"], light:"dim", desc:"Hay to the rafters and a loft nobody climbs to." }),
      R("loft", "Hayloft", { type:"room", from:"barn", floor:1, door:"ladder", w:4, h:3, objs:["hay*2","bedroll","chest"], light:"dark", private:true, desc:"Someone's been sleeping here. Not the farmer.", p:0.7 }),
      R("cellar", "Root cellar", { type:"room", from:"house", floor:-1, door:"trapdoor", w:3, h:3, objs:["sack*2","barrel","crate"], light:"dark", private:true, storage:true, desc:"Cold, dark, and full of winter.", p:0.6 }),
      R("field", "Fields", { type:"room", from:"yard", w:rri(rng,6,8), h:4, objs:["tree*2","hay"], light:"lit", outdoor:true, escape:true, desc:"Furrows to the treeline. Something has been crossing them at night.", p:0.8 }),
    ];
  },
  cemetery(rng, o){
    return [
      R("gate", "Lychgate", { type:"room", entrance:true, w:3, h:2, objs:["candles"], light:"dim", outdoor:true, desc:"A roofed gate where coffins rest before they go in." }),
      R("graves", "Old graves", { type:"room", from:"gate", w:rri(rng,7,9), h:rri(rng,5,6), objs:["grave*6","tree*2","statue"], light:"dim", outdoor:true, hazard: null, desc:"Leaning stones, names worn to whispers." }),
      R("new", "New graves", { type:"room", from:"graves", w:5, h:4, objs:["grave*3","cart","marks"], light:"dim", outdoor:true, desc:"Fresh earth, and one grave that's been opened from the inside. Or the outside." }),
      R("chapel", "Chapel", { type:"room", from:"graves", w:4, h:4, objs:["altar@wall","candles*2","lectern"], light:"dim", service:"temple", desc:"A small chapel for the mourners." }),
      R("mausoleum", "Mausoleum", { type: o.hostile ? "combat" : "room", from:"graves", w:4, h:3, objs:["sarcophagus","statue","candles"], light:"dark", private:true, important:true, desc:"A noble family's house of the dead, door ajar." }),
      R("crypt", "Lower crypt", { type: o.hostile ? "boss" : "mystery", from:"mausoleum", floor:-1, door:"stairs", w:rri(rng,5,6), h:4, objs:["coffin*3","bones","rune"], light:"dark", private:true, desc:"Where the family keeps what it won't bury." }),
      R("tunnel", "Robbers' tunnel", { type:"room", from:"crypt", floor:-1, w:2, h:5, objs:["rubble","bones"], light:"dark", secret:true, exit:"sewer", desc:"Grave robbers dug this, and something dug back.", p: o.undercity ? 0.6 : 0.3 }),
    ];
  },
  market(rng, o){
    return [
      R("square", "Market square", { type:"room", entrance:true, w:rri(rng,9,12), h:rri(rng,6,8), objs:["stall*6","fountain","cart","barrel","crate"], light:"lit", outdoor:true, social:true, service:"market", desc:"Stalls, cries, pickpockets and the smell of frying onions." }),
      R("alley", "Back alley", { type:"room", from:"square", w:2, h:rri(rng,4,6), objs:["crate","barrel","grate"], light:"dim", outdoor:true, exit:"alley", desc:"Where the stallholders empty their slops, and worse." }),
      R("tent", "Fortune-teller's tent", { type:"room", from:"square", w:3, h:3, objs:["table","chair*2","candles","crystal"], light:"dim", private:true, desc:"Incense thick enough to chew; a woman who already knows your name.", p:0.6 }),
      R("pens", "Livestock pens", { type:"room", from:"square", w:5, h:3, objs:["hay*2","trough","bars"], light:"lit", outdoor:true, desc:"Goats, geese and a bear on a chain.", p:0.6 }),
    ];
  },
  square(rng, o){
    return [
      R("square", "Town square", { type:"room", entrance:true, w:rri(rng,8,11), h:rri(rng,6,8), objs:["fountain","notice@wall","statue","tree*2","cart"], light:"lit", outdoor:true, social:true, service:"board", desc:"The town's heart: a fountain, a statue of someone, and everyone's business." }),
      R("alley", "Back alley", { type:"room", from:"square", w:2, h:rri(rng,4,6), objs:["crate","barrel","grate"], light:"dim", outdoor:true, exit:"alley", desc:"Narrow, dark, and shorter than it looks." }),
      R("stocks", "The stocks", { type:"room", from:"square", w:3, h:2, objs:["gallows","chains@wall"], light:"lit", outdoor:true, desc:"Public shame, with rotten fruit provided.", p:0.5 }),
    ];
  },
  lab(rng, o){
    return [
      R("study", "Study", { type:"room", entrance:true, w:rri(rng,5,6), h:4, objs:["bookshelf@wall*2","desk","chair","candles","rune"], light:"dim", private:true, desc:"Books stacked in towers; a chalk circle on the floor, half-erased." }),
      R("lab", "Laboratory", { type: o.hostile ? "combat" : "room", from:"study", w:rri(rng,5,7), h:rri(rng,4,5), objs:["table*2","cauldron","brazier","crystal","cage"], light:"dim", private:true, hazard:"gas", desc:"Glass, brass and something in a jar that watches." }),
      R("observatory", "Observatory", { type: o.hostile ? "trap" : "room", from:"study", floor:1, door:"stairs", w:5, h:5, objs:["lectern","map","crystal","statue"], light:"dark", high:true, desc:"A brass orrery turns on its own; the dome is open to a sky that isn't ours." }),
      R("vault", "Spell vault", { type: o.hostile ? "treasure" : "room", from:"lab", floor:-1, door:"trapdoor", w:3, h:3, objs:["chest","rune","idol"], light:"dark", secret:true, stash:true, locked:true, desc:"Warded, locked, and humming." }),
      R("pit", "Summoning pit", { type: o.hostile ? "boss" : "mystery", from:"lab", floor:-1, door:"stairs", w:5, h:4, objs:["rune","candles*2","chains@wall","stain"], light:"dark", private:true, hazard:"fire", desc:"The circle here is not half-erased.", p:0.8 }),
    ];
  },
  shrine(rng, o){
    return [
      R("path", "Pilgrims' path", { type:"room", entrance:true, w:3, h:rri(rng,4,6), objs:["tree*2","candles"], light:"lit", outdoor:true, desc:"Ribbons tied to branches; prayers left in a hundred languages." }),
      R("shrine", "Shrine", { type: o.hostile ? "combat" : "shrine", from:"path", w:rri(rng,4,5), h:4, objs:["altar@wall","statue","candles*2","pool"], light:"dim", desc:"A weathered god under a roof of moss. The pool is very still." }),
      R("cave", "Hermit's cave", { type: o.hostile ? "boss" : "room", from:"shrine", w:4, h:3, objs:["bedroll","campfire","bookshelf@wall","chest"], light:"dark", private:true, desc:"A hermit lived here. Perhaps still does.", p:0.8 }),
    ];
  },
  grove(rng, o){
    return [
      R("edge", "Forest edge", { type:"entrance", entrance:true, w:4, h:rri(rng,5,7), objs:["tree*3"], light:"lit", outdoor:true, desc:"The trees close behind you like a door." }),
      R("clearing", "Clearing", { type:"combat", from:"edge", w:rri(rng,6,8), h:rri(rng,5,7), objs:["tree*2","campfire","bones"], light:"lit", outdoor:true, desc:"A ring of trampled grass; something feeds here." }),
      R("stream", "Stream", { type:"trap", from:"clearing", w:rri(rng,5,7), h:2, objs:["pool","tree"], light:"lit", outdoor:true, hazard:"water", desc:"Fast, cold and deeper than it looks." }),
      R("hollow", "Hollow tree", { type:"treasure", from:"clearing", w:3, h:3, objs:["tree","chest","mushrooms"], light:"dark", desc:"A trunk wide as a house, hollow as a promise.", p:0.8 }),
      R("ring", "Fairy ring", { type:"mystery", from:"stream", w:4, h:4, objs:["mushrooms*2","rune","crystal"], light:"dim", outdoor:true, desc:"Mushrooms in a perfect circle. Don't step inside. Or do.", p:0.7 }),
      R("den", "Den", { type:"boss", from:"clearing", w:5, h:4, objs:["bones*2","web","hoard"], light:"dark", desc:"The hole under the roots goes further than it should." }),
      R("camp", "Hunter's camp", { type:"camp", from:"edge", w:3, h:3, objs:["campfire","bedroll","sack"], light:"dim", outdoor:true, desc:"A cold fire and a dry place to sleep.", p:0.7 }),
    ];
  },
  camp(rng, o){
    const big = o.size === "large";
    return [
      R("gate", "Palisade gate", { type:"entrance", entrance:true, w:3, h:2, objs:["torch@wall","crate"], light:"dim", outdoor:true, desc:"Sharpened stakes, a lookout who's drunk or dead." }),
      R("yard", "Camp yard", { type:"combat", from:"gate", w:rri(rng,7,9), h:rri(rng,5,7), objs:["campfire","tent*3","cart","barrel","rack@wall"], light:"lit", outdoor:true, desc:"Tents around a fire, loot in a heap, dogs on ropes." }),
      R("pens", "Prisoner pens", { type:"trap", from:"yard", w:4, h:3, objs:["cage*2","chains@wall","hay"], light:"dim", outdoor:true, cell:true, desc:"Cages with people in them, waiting for a ransom or a buyer." }),
      R("loot", "Loot tent", { type:"treasure", from:"yard", w:3, h:3, objs:["tent","chest","crate*2","sack"], light:"dark", desc:"Everything they've taken, sorted by what sells." }),
      R("shrine", "Captain's tent", { type:"boss", from:"yard", w:4, h:4, objs:["tent","bed","map","chest","idol"], light:"dim", desc:"The biggest tent, the loudest snoring." }),
      R("latrine", "Latrine ditch", { type:"camp", from:"yard", w:2, h:3, objs:["sack"], light:"dark", outdoor:true, escape:true, desc:"Nobody guards this. For reasons.", p: 0.8 }),
      R("well", "Spring", { type:"shrine", from:"gate", w:3, h:3, objs:["pool","tree","candles"], light:"dim", outdoor:true, desc:"A spring the bandits fear to foul.", p: big ? 0.7 : 0.4 }),
      R("cave", "Back cave", { type:"mystery", from:"shrine", w:4, h:3, objs:["rubble","bones","crystal"], light:"dark", secret:true, stash:true, desc:"Behind the captain's tent: a cave they dug into, and stopped.", p:0.6 }),
    ];
  },
  cave(rng, o){
    return [
      R("mouth", "Cave mouth", { type:"entrance", entrance:true, w:4, h:3, objs:["rubble","bones"], light:"dim", desc:"Cold air breathes out of the dark." }),
      R("gallery", "Dripping gallery", { type:"combat", from:"mouth", w:rri(rng,6,8), h:rri(rng,4,5), objs:["pillar*2","pool","mushrooms"], light:"dark", desc:"Stalactites drip into pools that ripple when you aren't looking." }),
      R("crawl", "Low crawl", { type:"trap", from:"gallery", w:rri(rng,4,6), h:2, objs:["rubble","web"], light:"dark", desc:"On your belly, with the ceiling pressing down." }),
      R("pool", "Underground lake", { type:"mystery", from:"gallery", w:rri(rng,5,6), h:rri(rng,4,5), objs:["pool","crystal","boat"], light:"dark", hazard:"water", desc:"Black water, and a boat that shouldn't be here." }),
      R("nest", "Nest", { type:"combat", from:"crawl", w:5, h:4, objs:["web*2","bones*2","cage"], light:"dark", desc:"Bones in heaps. Cocoons in rows." }),
      R("shelf", "Dry shelf", { type:"camp", from:"pool", w:3, h:3, objs:["campfire","bedroll","sack"], light:"dim", desc:"Someone camped here before you. Their gear is still here." }),
      R("glow", "Crystal cavern", { type:"treasure", from:"nest", w:4, h:4, objs:["crystal*3","chest","mushrooms"], light:"dim", desc:"Light without fire; veins of something precious." }),
      R("depths", "The depths", { type:"boss", from:"glow", floor:-1, door:"stairs", w:rri(rng,6,8), h:rri(rng,5,6), objs:["pillar*2","bones*2","hoard","pool"], light:"dark", desc:"The cave's throat, and whatever it swallowed." }),
      R("vein", "Hidden vein", { type:"treasure", from:"depths", floor:-1, w:3, h:3, objs:["crystal*2","rubble","chest"], light:"dim", secret:true, stash:true, desc:"A seam of gold behind a curtain of stone.", p:0.6 }),
      R("shrine", "Drowned shrine", { type:"shrine", from:"pool", w:3, h:3, objs:["altar@wall","idol","candles"], light:"dark", desc:"An altar older than the cave.", p:0.6 }),
    ];
  },
  mine(rng, o){
    return [
      R("head", "Mine head", { type:"entrance", entrance:true, w:4, h:3, objs:["cart","crate","rack@wall","torch@wall"], light:"dim", desc:"Rails run into the dark; a winch hangs slack." }),
      R("shaft", "Main shaft", { type:"combat", from:"head", w:2, h:rri(rng,6,8), objs:["cart","torch@wall"], light:"dark", choke:true, desc:"A corridor of timber props, groaning." }),
      R("gallery1", "Upper gallery", { type:"trap", from:"shaft", w:rri(rng,5,6), h:3, objs:["rubble*2","cart","pillar"], light:"dark", hazard:"collapse", desc:"The props here are split. Walk softly." }),
      R("gallery2", "Flooded gallery", { type:"mystery", from:"shaft", w:rri(rng,5,6), h:4, objs:["pool","crate","bones"], light:"dark", hazard:"water", desc:"Water up to the knee, and the drip of something deeper." }),
      R("camp", "Miners' camp", { type:"camp", from:"shaft", w:4, h:3, objs:["campfire","bedroll*2","sack","chest"], light:"dim", desc:"Cold food, warm blankets, a tally on the wall that stops." }),
      R("lower", "Lower workings", { type:"combat", from:"gallery2", floor:-1, door:"ladder", w:rri(rng,6,8), h:rri(rng,4,5), objs:["cart*2","rubble","crystal"], light:"dark", desc:"They dug too deep, as they always do." }),
      R("vein", "Rich vein", { type:"treasure", from:"lower", floor:-1, w:4, h:3, objs:["crystal*3","chest","cart"], light:"dim", desc:"Ore glittering in the lamplight. The reason for everything." }),
      R("breach", "The breach", { type:"boss", from:"lower", floor:-1, w:rri(rng,6,7), h:rri(rng,5,6), objs:["rubble*2","bones*2","pool","rune"], light:"dark", desc:"The wall they broke through. What came out is still here." }),
      R("secret", "Sealed drift", { type:"treasure", from:"gallery1", w:3, h:3, objs:["bones","chest","rubble"], light:"dark", secret:true, stash:true, desc:"Bricked up in a hurry, with men still inside.", p:0.6 }),
    ];
  },
  crypt(rng, o){
    return [
      R("stair", "Descending stair", { type:"entrance", entrance:true, w:2, h:4, objs:["torch@wall","bones"], light:"dark", choke:true, desc:"Steps worn into bowls by the feet of mourners." }),
      R("hall", "Hall of niches", { type:"combat", from:"stair", w:rri(rng,7,9), h:rri(rng,4,5), objs:["pillar*4","coffin*2","candles"], light:"dark", desc:"Niches to the ceiling, each with a sleeper, some restless." }),
      R("chapel", "Collapsed chapel", { type:"trap", from:"hall", w:rri(rng,5,6), h:4, objs:["altar@wall","rubble*2","statue"], light:"dark", hazard:"collapse", desc:"The ceiling has come down once and is thinking about it again." }),
      R("embalm", "Embalming hall", { type:"mystery", from:"hall", w:5, h:3, objs:["table*2","cauldron","shelf@wall","stain"], light:"dark", hazard:"gas", desc:"Tables, hooks, jars, and the smell of bitter resin." }),
      R("ossuary", "Ossuary", { type:"combat", from:"chapel", w:rri(rng,5,6), h:4, objs:["bones*4","pillar"], light:"dark", desc:"Bones stacked like firewood, sorted by kind." }),
      R("rest", "Mourners' rest", { type:"camp", from:"embalm", w:3, h:3, objs:["chair*2","candles","fountain"], light:"dim", desc:"A dry antechamber with a dead fountain. Quiet." }),
      R("flooded", "Flooded tomb", { type:"treasure", from:"ossuary", w:4, h:4, objs:["pool","sarcophagus","coffin"], light:"dark", hazard:"water", desc:"Black water lapping at a stone lid." }),
      R("deep", "Lower crypt", { type:"combat", from:"ossuary", floor:-1, door:"stairs", w:rri(rng,6,7), h:4, objs:["coffin*3","pillar*2","rune"], light:"dark", desc:"The older dead, the colder air." }),
      R("throne", "Tomb of the lord", { type:"boss", from:"deep", floor:-1, w:rri(rng,6,8), h:rri(rng,5,6), objs:["sarcophagus","throne@wall","candles*2","statue*2","hoard"], light:"dark", desc:"A throne of bone and a crown that does not rust." }),
      R("vault", "Hidden reliquary", { type:"treasure", from:"deep", floor:-1, w:3, h:3, objs:["chest","idol","candles"], light:"dark", secret:true, stash:true, desc:"Walled up with the family's one honest treasure.", p:0.6 }),
      R("shrine", "Forgotten shrine", { type:"shrine", from:"hall", w:3, h:3, objs:["altar@wall","idol","candles"], light:"dark", desc:"A god the dead still remember.", p:0.6 }),
    ];
  },
  dungeon(rng, o){
    return [
      R("gate", "Entry hall", { type:"entrance", entrance:true, w:rri(rng,4,5), h:3, objs:["torch@wall*2","rubble","statue"], light:"dim", desc:"Iron-bound doors hang open; the dark beyond is listening." }),
      R("corr1", "Pillared corridor", { type:"combat", from:"gate", w:rri(rng,6,8), h:2, objs:["pillar*3","torch@wall"], light:"dark", choke:true, desc:"A long corridor of pillars; good for an ambush, theirs or yours." }),
      R("guard", "Guard room", { type:"combat", from:"corr1", w:5, h:4, objs:["table","chair*3","rack@wall","brazier","barrel"], light:"dim", desc:"Dice on the table, a game interrupted." }),
      R("well", "Well chamber", { type:"trap", from:"corr1", w:4, h:4, objs:["well","chains@wall","bones"], light:"dark", desc:"A well in the middle of the floor. The rope is new." }),
      R("store", "Storeroom", { type:"treasure", from:"guard", w:3, h:3, objs:["crate*3","barrel","chest"], light:"dark", desc:"Supplies for a long stay." }),
      R("lib", "Collapsed library", { type:"mystery", from:"well", w:5, h:4, objs:["bookshelf@wall*2","rubble","lectern","candles"], light:"dark", desc:"Shelves slumped into a drift of pages." }),
      R("pit", "Pit room", { type:"trap", from:"lib", w:4, h:4, objs:["bones*2","chains@wall"], light:"dark", hazard:"collapse", desc:"A floor that sounds different in the middle." }),
      R("altar", "Altar room", { type:"shrine", from:"guard", w:4, h:3, objs:["altar@wall","idol","candles*2"], light:"dark", desc:"A shrine to something that still listens.", p:0.8 }),
      R("camp", "Dry cell", { type:"camp", from:"store", w:3, h:3, objs:["bedroll","campfire","sack"], light:"dim", desc:"Bars on a door that locks from the inside." }),
      R("lower", "Lower halls", { type:"combat", from:"pit", floor:-1, door:"stairs", w:rri(rng,6,8), h:4, objs:["pillar*2","stain","bones","brazier"], light:"dark", desc:"Older stone, worse smells." }),
      R("heart", "The heart", { type:"boss", from:"lower", floor:-1, w:rri(rng,7,9), h:rri(rng,5,6), objs:["throne@wall","brazier*2","statue*2","hoard","rune"], light:"dark", desc:"The master of this place keeps court here." }),
      R("vault", "Hidden vault", { type:"treasure", from:"lower", floor:-1, w:3, h:3, objs:["chest*2","idol"], light:"dark", secret:true, stash:true, desc:"A door disguised as wall, worth the search.", p:0.65 }),
      R("escape", "Escape tunnel", { type:"room", from:"heart", floor:-1, w:2, h:5, objs:["rubble"], light:"dark", secret:true, escape:true, desc:"The master's own way out.", p:0.5 }),
    ];
  },
  ruins(rng, o){
    return [
      R("gate", "Broken gate", { type:"entrance", entrance:true, w:4, h:3, objs:["rubble*2","statue"], light:"lit", outdoor:true, desc:"Two pillars and no door; the roof is sky." }),
      R("court", "Overgrown court", { type:"combat", from:"gate", w:rri(rng,7,9), h:rri(rng,5,7), objs:["tree*2","rubble*2","fountain","pillar*2"], light:"lit", outdoor:true, desc:"Flagstones heaved by roots; a dry fountain full of leaves." }),
      R("hall", "Roofless hall", { type:"trap", from:"court", w:rri(rng,6,7), h:4, objs:["pillar*4","rubble","debris"], light:"lit", outdoor:true, hazard:"collapse", desc:"Walls still stand; the ceiling is on the floor." }),
      R("chapel", "Ruined chapel", { type:"shrine", from:"court", w:4, h:4, objs:["altar@wall","statue","candles"], light:"dim", desc:"The god left; the altar didn't." }),
      R("tower", "Watchtower", { type:"mystery", from:"hall", floor:1, door:"stairs", w:3, h:3, objs:["rubble","lectern","rune"], light:"lit", high:true, desc:"A view of everything, and a riddle carved in the parapet." }),
      R("cellar", "Buried cellar", { type:"combat", from:"hall", floor:-1, door:"stairs", w:rri(rng,5,7), h:4, objs:["barrel*2","bones*2","web"], light:"dark", desc:"Dry, dark, and claimed by something that nests." }),
      R("crypt", "Lost crypt", { type:"boss", from:"cellar", floor:-1, w:rri(rng,6,7), h:5, objs:["sarcophagus","pillar*2","candles","hoard"], light:"dark", desc:"The founders' tomb, and their last guardian." }),
      R("treasury", "Collapsed treasury", { type:"treasure", from:"cellar", floor:-1, w:3, h:3, objs:["rubble*2","chest","crystal"], light:"dark", secret:true, stash:true, desc:"Half a room full of rubble, half of something better.", p:0.65 }),
      R("camp", "Sheltered corner", { type:"camp", from:"court", w:3, h:3, objs:["campfire","bedroll"], light:"dim", desc:"Two walls and a roof, which here counts as luxury.", p:0.8 }),
    ];
  },
  tower(rng, o){
    const h = o.hostile;
    return [
      R("ground", "Ground floor", { type: h ? "entrance" : "room", entrance:true, w:rri(rng,5,6), h:rri(rng,5,6), objs:["statue*2","torch@wall*2","rubble"], light:"dim", desc:"A round hall, a stair curling up, a stair curling down." }),
      R("library", "Library", { type: h ? "combat" : "room", from:"ground", floor:1, door:"stairs", w:5, h:5, objs:["bookshelf@wall*3","lectern","chair","candles"], light:"dim", desc:"Books in languages that moved while you weren't reading." }),
      R("lab", "Laboratory", { type: h ? "trap" : "room", from:"library", floor:2, door:"stairs", w:5, h:5, objs:["table*2","cauldron","crystal","cage","brazier"], light:"dim", hazard:"gas", desc:"Alembics and a smell of burnt sugar and lightning." }),
      R("bed", "Wizard's chamber", { type: h ? "treasure" : "room", from:"lab", floor:3, door:"stairs", w:4, h:4, objs:["bed","wardrobe","chest","painting@wall"], light:"dim", private:true, owner:true, bed:true, desc:"Where the tower's master sleeps, if sleep is the word." }),
      R("top", "Observatory", { type: h ? "boss" : "mystery", from:"bed", floor:4, door:"stairs", w:5, h:5, objs:["lectern","map","rune","crystal*2"], light:"dark", high:true, desc:"The dome opens on stars arranged like a warning." }),
      R("cellar", "Cellar", { type: h ? "combat" : "room", from:"ground", floor:-1, door:"stairs", w:5, h:4, objs:["barrel*2","crate","cage","chains@wall"], light:"dark", private:true, desc:"Cold, damp, and lately occupied." }),
      R("vault", "Warded vault", { type: h ? "treasure" : "room", from:"cellar", floor:-1, w:3, h:3, objs:["chest","rune","idol"], light:"dark", secret:true, stash:true, locked:true, desc:"Runes crawl across the door when you're not looking.", p:0.7 }),
      R("portal", "Portal room", { type: h ? "mystery" : "room", from:"cellar", floor:-1, w:4, h:4, objs:["portal","rune","candles*2"], light:"dim", secret:true, desc:"A door that opens somewhere else entirely.", p: o.mood === "magical" ? 0.9 : 0.35 }),
    ];
  },
  castle(rng, o){
    const h = o.hostile;
    const T = (hostileType, calmType) => h ? hostileType : calmType;
    return [
      R("gate", "Gatehouse", { type: T("entrance","room"), entrance:true, w:4, h:3, objs:["torch@wall*2","rack@wall","brazier"], light:"dim", guards:true, choke:true, desc:"Portcullis, murder holes, and a guard who wants a name." }),
      R("court", "Courtyard", { type: T("combat","room"), from:"gate", w:rri(rng,8,10), h:rri(rng,6,7), objs:["well","cart","trough","tree","rack@wall"], light:"lit", outdoor:true, social: !h, desc:"Cobbles, stables, a well, and walls on every side." }),
      R("guard", "Guard room", { type: T("combat","room"), from:"gate", w:4, h:3, objs:["table","chair*3","rack@wall","brazier"], light:"dim", private:true, guards:true, desc:"Where the watch plays dice and loses." }),
      R("hall", "Great hall", { type: T("combat","room"), from:"court", w:rri(rng,8,10), h:rri(rng,5,6), objs:["table*4","chair*8","fireplace@wall","painting@wall*2","candles*2"], light:"lit", social: !h, desc:"A hall for a hundred, hung with banners and the smell of roast." }),
      R("kitchen", "Kitchen", { type: T("trap","room"), from:"hall", w:5, h:4, objs:["fireplace@wall","table*2","sack*2","barrel","keg"], light:"lit", work:true, desc:"Spits, cauldrons, and a cook who rules absolutely." }),
      R("chapel", "Chapel", { type: T("shrine","room"), from:"court", w:4, h:4, objs:["altar@wall","candles*2","statue","lectern"], light:"dim", service: h ? null : "temple", desc:"Stained glass and a knight carved on his tomb." }),
      R("armory", "Armory", { type: T("treasure","room"), from:"guard", w:4, h:3, objs:["rack@wall*3","chest","crate"], light:"dim", private:true, storage:true, locked: !h, desc:"Pikes in rows, mail on stands, oil on everything." }),
      R("throne", "Throne room", { type: T("boss","room"), from:"hall", floor:1, door:"stairs", w:rri(rng,7,9), h:rri(rng,5,6), objs:["throne@wall","pillar*4","candles*2","painting@wall","statue*2"], light:"lit", private: !h, important:true, desc:"A dais, a throne, and a silence that expects kneeling." }),
      R("royal", "Royal chambers", { type: T("treasure","room"), from:"throne", floor:1, w:5, h:4, objs:["bed","wardrobe","chest","painting@wall","desk"], light:"dim", private:true, owner:true, bed:true, evidence:true, desc:"Silk, gold, and a letter half-burned in the hearth." }),
      R("library", "Library", { type: T("mystery","room"), from:"throne", floor:1, w:5, h:4, objs:["bookshelf@wall*3","desk","lectern","candles"], light:"dim", private:true, evidence:true, desc:"Histories, maps, and a ledger of debts." }),
      R("wiz", "Wizard's tower", { type: T("trap","room"), from:"library", floor:2, door:"stairs", w:4, h:4, objs:["cauldron","crystal","bookshelf@wall","rune"], light:"dark", private:true, high:true, desc:"The court mage keeps odd hours and odder pets.", p:0.8 }),
      R("dungeon", "Dungeon", { type: T("combat","room"), from:"guard", floor:-1, door:"stairs", w:rri(rng,6,8), h:3, objs:["bars*4","chains@wall*2","hay*2","bedroll"], light:"dark", private:true, cell:true, desc:"Cells below the guard room; the screams don't carry up." }),
      R("crypt", "Ancient crypt", { type: T("boss","mystery"), from:"dungeon", floor:-2, door:"stairs", w:rri(rng,6,7), h:5, objs:["sarcophagus*2","pillar*2","candles","rune"], light:"dark", private:true, desc:"Older than the castle; the castle was built to keep it shut.", p: h ? 0.5 : 0.8 }),
      R("treasury", "Treasury", { type: T("treasure","room"), from:"throne", floor:1, w:3, h:3, objs:["chest*3","hoard"], light:"dark", secret:true, stash:true, locked:true, desc:"Behind the throne: the coin that pays for the banners." }),
      R("escape", "Escape tunnel", { type:"room", from:"royal", floor:-1, door:"trapdoor", w:2, h:6, objs:["rubble"], light:"dark", secret:true, exit: o.undercity ? "sewer" : null, escape:true, desc:"Every king plans for the day the walls fail.", p:0.7 }),
      R("servants", "Servants' hall", { type: T("camp","room"), from:"kitchen", w:4, h:3, objs:["table","chair*4","bed"], light:"dim", desc:"Where the people who run the place eat standing up.", p:0.8 }),
    ];
  },
  lair(rng, o){
    const dragon = o.theme === "dragon";
    return [
      R("mouth", "Lair mouth", { type:"entrance", entrance:true, w:4, h:3, objs:["bones*2","rubble"], light:"dim", desc:"Bones at the threshold, arranged like a warning or a welcome." }),
      R("tunnel", "Scraped tunnel", { type:"combat", from:"mouth", w:2, h:rri(rng,5,7), objs:["bones","web"], light:"dark", choke:true, desc:"Claw marks score the walls at shoulder height. Your shoulder, if you were twice as tall." }),
      R("den", "Den", { type:"combat", from:"tunnel", w:rri(rng,6,8), h:rri(rng,5,6), objs:["bones*3","hay","cage","web"], light:"dark", desc:"Warm, foul, and littered with the belongings of the eaten." }),
      R("nursery", dragon ? "Egg chamber" : "Nursery", { type:"trap", from:"den", w:5, h:4, objs:[dragon ? "egg" : "web*2","bones","mushrooms"], light:"dark", desc: dragon ? "Three eggs in a nest of melted gold." : "Where the young are kept. They're hungry." }),
      R("pool", "Drinking pool", { type:"camp", from:"den", w:4, h:3, objs:["pool","crystal"], light:"dim", desc:"Clear water in a basin of stone. Even monsters need to drink." }),
      R("hoard", dragon ? "Hoard" : "Trophy heap", { type:"boss", from:"den", w:rri(rng,7,9), h:rri(rng,5,7), objs:["hoard","pillar*2","bones*2","statue"], light:"dim", desc: dragon ? "Coins in drifts, and the mountain breathing on top of them." : "The alpha's throne of skulls." }),
      R("secret", "Hidden grotto", { type:"treasure", from:"pool", w:3, h:3, objs:["chest","crystal*2"], light:"dim", secret:true, stash:true, desc:"A crack in the rock, too narrow for the lair's master.", p:0.7 }),
      R("shrine", "Bone shrine", { type:"shrine", from:"tunnel", w:3, h:3, objs:["idol","bones*2","candles"], light:"dark", desc:"Someone worships what lives here.", p:0.5 }),
    ];
  },
  sewer(rng, o){
    return [
      R("grate", "Sewer entrance", { type:"entrance", entrance:true, w:3, h:3, objs:["grate","torch@wall","rubble"], light:"dim", desc:"A ladder down into the stink." }),
      R("main", "Main channel", { type:"combat", from:"grate", w:rri(rng,8,11), h:3, objs:["pool","barrel","bones"], light:"dark", hazard:"water", choke:true, desc:"A brick river of filth; walkways on either side, half-collapsed." }),
      R("junction", "Junction chamber", { type:"trap", from:"main", w:5, h:5, objs:["pillar*4","pool","crate"], light:"dark", hazard:"gas", desc:"Four tunnels meet under a dome of dripping brick." }),
      R("cistern", "Old cistern", { type:"mystery", from:"junction", w:rri(rng,5,6), h:rri(rng,4,5), objs:["pool","statue","boat"], light:"dark", hazard:"water", desc:"A flooded hall from an older city; something glints at the bottom." }),
      R("hideout", "Smugglers' hideout", { type:"combat", from:"junction", w:rri(rng,5,6), h:4, objs:["crate*3","barrel*2","table","chair*2","bedroll*2","candles"], light:"dim", desc:"Dry, lit, and furnished with other people's cargo." }),
      R("nest", "Rat warren", { type:"combat", from:"main", w:4, h:4, objs:["bones*2","hay","web"], light:"dark", desc:"Something has been breeding the rats. Or feeding them." }),
      R("shrine", "Drowned shrine", { type:"shrine", from:"cistern", w:3, h:3, objs:["altar@wall","idol","candles"], light:"dark", desc:"A forgotten god, worshipped by the forgotten.", p:0.7 }),
      R("ledge", "Dry ledge", { type:"camp", from:"main", w:3, h:2, objs:["bedroll","campfire","sack"], light:"dim", desc:"Above the waterline: a place to breathe.", p:0.8 }),
      R("cult", "Cult chamber", { type:"boss", from:"cistern", floor:-1, door:"stairs", w:rri(rng,6,8), h:rri(rng,5,6), objs:["rune","altar@wall","candles*3","stain","chains@wall"], light:"dark", desc:"Under the city's bones: a circle of candles and a reason for the missing." }),
      R("cache", "Smugglers' cache", { type:"treasure", from:"hideout", w:3, h:3, objs:["crate*2","chest"], light:"dark", secret:true, stash:true, desc:"Behind loose bricks: the good stuff.", p:0.8 }),
      R("up1", "Tunnel to the tavern", { type:"room", from:"main", w:2, h:3, objs:["rubble"], light:"dark", exit:"tavern", desc:"A dug tunnel sloping up toward a cellar.", p:1 }),
      R("up2", "Tunnel under the keep", { type:"room", from:"cult", floor:-1, w:2, h:4, objs:["bars","chains@wall"], light:"dark", secret:true, exit:"keep", desc:"Iron bars, recently cut; the stones above are the keep's.", p:1 }),
      R("ruin", "Forgotten ruins", { type:"mystery", from:"cistern", floor:-1, door:"stairs", w:5, h:4, objs:["pillar*2","statue","rune","rubble"], light:"dark", desc:"The city before the city.", p:0.6 }),
    ];
  },
};
// unique, fantastical variants layered on a base plan
const WONDERS = {
  treeinn:  { base:"tavern", name:"inn inside a giant tree", style:"fey", light:"dim", desc:"The common room is the hollow heart of a living tree; the rooms above are reached by stairs grown from the wood.", add:[["tree","social"],["mushrooms","social"]], mood:"magical" },
  between:  { base:"inn", name:"inn between worlds", style:"marble", desc:"The windows show a different sky each; the guests do not all come from here.", add:[["portal","storage"],["crystal","social"]], mood:"magical", shifting:true },
  livebooks:{ base:"library", name:"library where the books are alive", style:"fey", desc:"The books rustle on their shelves and crawl to better light; some bite.", add:[["cage","any"],["rune","any"]], mood:"magical" },
  midnight: { base:"market", name:"market that opens only at midnight", style:"stone", light:"dark", desc:"Stalls lit by foxfire, sellers in masks, goods that cost more than coin.", add:[["candles","any"],["portal","any"]], mood:"shady", nightOnly:true },
  skull:    { base:"camp", name:"village inside a giant skull", style:"cave", desc:"Huts cling to the inside of a skull the size of a hill; the eye sockets are the gates.", add:[["bones","any"],["bones","any"]], mood:"rough" },
  shifting: { base:"tower", name:"wizard's tower that changes its layout", style:"marble", desc:"The stairs do not lead where they led last time.", mood:"magical", shifting:true },
  sunken:   { base:"castle", name:"castle slowly sinking into the earth", style:"ruin", desc:"The ground floor is now the second cellar; everything tilts.", add:[["pool","any"],["rubble","any"]], mood:"ruined", hazard:"water" },
  frozen:   { base:"ruins", name:"battlefield frozen in time", style:"ice", desc:"Soldiers stand mid-swing under a glaze of ice; the arrows still hang in the air.", add:[["statue","any"],["statue","any"],["rack","any"]], mood:"haunted" },
  lighthouse:{ base:"tower", name:"lighthouse that commands the weather", style:"stone", desc:"The lamp at the top turns, and the storms turn with it.", add:[["crystal","any"],["wheel","any"]], mood:"magical", hazard:"fire" },
  honest:   { base:"house", name:"house where nobody can lie", style:"wood", desc:"Something in the beams; every word spoken here is true, and everyone knows it.", mood:"cozy", truth:true },
};
const KIND_STYLE = { tavern:"wood", inn:"wood", shop:"wood", smith:"stone", alchemist:"wood", temple:"marble", "temple-dark":"crypt", guardhouse:"stone", prison:"stone", manor:"marble", house:"wood", library:"marble", guildhall:"wood", warehouse:"wood", docks:"ship", ship:"ship", farm:"field", cemetery:"field", market:"stone", square:"stone", lab:"stone", shrine:"field", grove:"field", camp:"tent", cave:"cave", mine:"cave", crypt:"crypt", dungeon:"stone", ruins:"ruin", tower:"stone", castle:"stone", lair:"cave", sewer:"sewer" };
const HOSTILE_KINDS = new Set(["temple-dark","grove","camp","cave","mine","crypt","dungeon","ruins","lair","sewer"]);
const KIND_LABEL = { tavern:"tavern", inn:"inn", shop:"shop", smith:"smithy", alchemist:"apothecary", temple:"temple", "temple-dark":"desecrated temple", guardhouse:"guard station", prison:"prison", manor:"manor house", house:"house", library:"library", guildhall:"guild hall", warehouse:"warehouse", docks:"docks", ship:"ship", farm:"farm", cemetery:"cemetery", market:"market", square:"town square", lab:"laboratory", shrine:"shrine", grove:"wild grove", camp:"camp", cave:"cave", mine:"mine", crypt:"crypt", dungeon:"dungeon", ruins:"ruins", tower:"tower", castle:"castle", lair:"monster lair", sewer:"sewers" };
const KIND_THEME = { sewer:["bandit","beast","cult"], cave:["beast","goblin","giant"], mine:["goblin","giant","undead"], crypt:["undead"], "temple-dark":["cult","undead"], lair:["beast","dragon","giant"], camp:["bandit","goblin","giant"], grove:["beast","goblin"], ruins:["undead","bandit","cult"], dungeon:["bandit","goblin","cult","undead"] };

// ---------- geometry ----------
function overlaps(a, b){ return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
function sharedWall(a, b){
  // returns {side (of a), from, to} when b touches a along a side with at least 2 units in common
  const ov = (a0, a1, b0, b1) => [Math.max(a0, b0), Math.min(a1, b1)];
  if (b.x === a.x + a.w){ const [f, t] = ov(a.y, a.y + a.h, b.y, b.y + b.h); if (t - f >= 2) return { side:"e", from:f, to:t }; }
  if (a.x === b.x + b.w){ const [f, t] = ov(a.y, a.y + a.h, b.y, b.y + b.h); if (t - f >= 2) return { side:"w", from:f, to:t }; }
  if (b.y === a.y + a.h){ const [f, t] = ov(a.x, a.x + a.w, b.x, b.x + b.w); if (t - f >= 2) return { side:"s", from:f, to:t }; }
  if (a.y === b.y + b.h){ const [f, t] = ov(a.x, a.x + a.w, b.x, b.x + b.w); if (t - f >= 2) return { side:"n", from:f, to:t }; }
  return null;
}
function doorPoint(a, sw, rng){
  const mid = Math.floor((sw.from + sw.to) / 2) + (rng() < 0.3 ? (rng() < 0.5 ? -1 : 1) : 0); const p = clamp(mid, sw.from, sw.to - 1);
  if (sw.side === "e") return { x: a.x + a.w, y: p + 0.5 }; if (sw.side === "w") return { x: a.x, y: p + 0.5 };
  if (sw.side === "s") return { x: p + 0.5, y: a.y + a.h }; return { x: p + 0.5, y: a.y };
}
const OPP = { n:"s", s:"n", e:"w", w:"e" };
// place `spec` touching `parent` on some side without overlapping other rooms on that floor
function placeNext(rng, spec, parent, placed, preferSide){
  const sides = preferSide ? [preferSide, ...["n","s","e","w"].filter(s => s !== preferSide).sort(() => rng() - 0.5)] : ["n","s","e","w"].sort(() => rng() - 0.5);
  for (const side of sides){
    const offs = []; const along = side === "n" || side === "s" ? parent.w : parent.h; const mine = side === "n" || side === "s" ? spec.w : spec.h;
    for (let o = -(mine - 2); o <= along - 2; o++) offs.push(o);
    offs.sort((a, b) => Math.abs(a - (along - mine) / 2) - Math.abs(b - (along - mine) / 2) + (rng() - 0.5) * 1.5);
    for (const o of offs){
      const r = side === "n" ? { x: parent.x + o, y: parent.y - spec.h } : side === "s" ? { x: parent.x + o, y: parent.y + parent.h } : side === "e" ? { x: parent.x + parent.w, y: parent.y + o } : { x: parent.x - spec.w, y: parent.y + o };
      const box = { ...r, w: spec.w, h: spec.h };
      if (placed.some(p => p.floor === parent.floor && overlaps(p, box))) continue;
      return box;
    }
  }
  return null;
}
// ---------- the generator ----------
function siteOpts(c, loc, hint){
  const h = { ...(loc.site || {}), ...(hint || {}) };
  const kind = siteKindFor(loc, h.kind);
  const seed = hashStr(`${loc.id}|${c.id}`); const rng = mulberry(seed);
  const size = ["small","medium","large"].includes(h.size) ? h.size : loc.type === "city" || loc.important ? "large" : kind === "sewer" || kind === "castle" ? (rng() < 0.5 ? "medium" : "large") : rng() < 0.25 ? "small" : rng() < 0.75 ? "medium" : "large";
  const explicit = !!SITE_PLANS[h.kind];
  const hostile = h.danger === "high" || (h.danger !== "none" && (!!loc.hostile || !!loc.fallen || !!loc.villain || HOSTILE_KINDS.has(kind) || (loc.type === "dungeon" && !explicit)));
  const mood = ["cozy","rough","noble","ruined","haunted","magical","shady"].includes(h.mood) ? h.mood : loc.fallen ? "ruined" : /haunt|ghost|curse|dead/i.test(loc.name + loc.description) ? "haunted" : /noble|gild|golden|royal|palace/i.test(loc.name + loc.description) ? "noble" : /smuggl|thie|shady|rat|crook/i.test(loc.name + loc.description) ? "shady" : kind === "tavern" && rng() < 0.3 ? "rough" : "cozy";
  const town = loc.parent ? c.locations[loc.parent] : null;
  const undercity = !!town && ["town","city","port"].includes(town.type);
  let wonder = h.wonder && WONDERS[h.wonder] ? h.wonder : null;
  if (!wonder && !hostile && !loc.parent && rng() < 0.12){ const cands = Object.entries(WONDERS).filter(([, w]) => w.base === kind).map(([k]) => k); if (cands.length) wonder = cands[Math.floor(rng() * cands.length)]; }
  if (!wonder && /giant tree|great tree|treetop|inside a tree/i.test(loc.name + loc.description) && kind === "tavern") wonder = "treeinn";
  if (!wonder && /between worlds|crossroads of worlds/i.test(loc.name + loc.description)) wonder = "between";
  if (!wonder && /midnight market|night market/i.test(loc.name + loc.description)) wonder = "midnight";
  const theme = hostile ? (loc.theme || loc.villain?.theme || (KIND_THEME[kind] ? KIND_THEME[kind][Math.floor(rng() * KIND_THEME[kind].length)] : themeForLoc(loc))) : null;
  return { kind, size, hostile, mood, undercity, wonder, theme, seed, rng, service: h.service, purpose: h.purpose };
}
function genSite(c, loc, hint){
  const o = siteOpts(c, loc, hint); const rng = o.rng; const W = o.wonder ? WONDERS[o.wonder] : null;
  const plan = SITE_PLANS[o.kind] || SITE_PLANS.dungeon; let specs = plan(rng, { ...o, kind: o.kind });
  // optional rooms, by their probability
  specs = specs.filter(s => s.entrance || s.p == null || rng() < s.p);
  if (o.size === "small") specs = specs.filter((s, i) => s.entrance || s.exit || s.type === "boss" || i < Math.max(4, Math.ceil(specs.length * 0.6)));
  // rooms whose parent was dropped go too (a hidden cellar needs its cellar), except on the ground floor
  for (let pass = 0; pass < 6; pass++){ const keys = new Set(specs.map(s => s.key)); const before = specs.length; specs = specs.filter(s => !s.from || keys.has(s.from) || ((s.floor ?? 0) === 0 && !s.secret)); if (specs.length === before) break; }
  const byKey = {}; for (const s of specs) byKey[s.key] = s;
  for (const s of specs) if (s.from && !byKey[s.from]) s.from = specs[0].key;  // parents that were dropped: hang off the entrance
  // walk the specs so every room's parent is placed before it
  const placed = []; const order = []; const done = new Set();
  const visit = (s, depth) => { if (done.has(s.key) || depth > 20) return; if (s.from && byKey[s.from] && !done.has(s.from)) visit(byKey[s.from], depth + 1); done.add(s.key); order.push(s); };
  for (const s of specs) visit(s, 0);
  const rooms = []; const floorsSeen = new Set();
  for (const s of order){
    const parent = s.from ? rooms.find(r => r.key === s.from) : null;
    const floor = s.floor ?? (parent ? parent.floor : 0);
    let box = null, link = null;
    if (!parent){ box = { x: 0, y: 0, w: s.w, h: s.h }; }
    else if (floor !== parent.floor){
      // another floor: stack over the parent's footprint, then slide if something is there already
      const cands = [{ x: parent.x, y: parent.y }, { x: parent.x + parent.w - s.w, y: parent.y }, { x: parent.x, y: parent.y + parent.h - s.h }, { x: parent.x - 1, y: parent.y - 1 }, { x: parent.x + 2, y: parent.y + 2 }];
      for (const cnd of cands){ const b = { ...cnd, w: s.w, h: s.h }; if (!placed.some(p => p.floor === floor && overlaps(p, b))){ box = b; break; } }
      if (!box){ const anchor = placed.filter(p => p.floor === floor); const near = anchor.length ? anchor[Math.floor(rng() * anchor.length)] : null; box = near ? placeNext(rng, s, near, placed) : { x: parent.x + 40, y: parent.y, w: s.w, h: s.h }; }
      link = { kind: s.door || "stairs", dir: floor > parent.floor ? "up" : "down" };
    } else {
      box = placeNext(rng, s, parent, placed, s.side);
      if (!box){ const smaller = { ...s, w: Math.max(2, s.w - 1), h: Math.max(2, s.h - 1) }; box = placeNext(rng, smaller, parent, placed, s.side); if (box){ s.w = smaller.w; s.h = smaller.h; } }
      if (!box){ const others = placed.filter(p => p.floor === floor && p.key !== parent.key).sort(() => rng() - 0.5); for (const p2 of others){ box = placeNext(rng, s, p2, placed); if (box){ link = { parentKey: p2.key }; break; } } }
      if (!box){ if (s.entrance) box = { x: 0, y: 0, w: s.w, h: s.h }; else continue; }
      link = link || {}; link.kind = s.door || "door";
    }
    const r = { id: "r" + rooms.length, key: s.key, floor, name: s.name, type: s.type || "room", x: box.x, y: box.y, w: box.w, h: box.h, links: [], hiddenLinks: [], doors: [], objects: [], npcs: [], state: "unseen",
      light: W?.light || s.light || "lit", desc: s.desc || "", private: !!s.private, social: !!s.social, service: s.service || null, outdoor: !!s.outdoor, hazard: s.hazard || null, choke: !!s.choke, high: !!s.high, escape: !!s.escape, cell: !!s.cell, stash: !!s.stash, evidence: !!s.evidence, owner: !!s.owner, bed: !!s.bed, exit: s.exit || null, important: !!s.important, work: !!s.work, storage: !!s.storage, guards: !!s.guards, boat: !!s.boat };
    if (s.entrance) r.entrance = true; if (s.secret) r.secret = true;
    placed.push({ ...box, floor, key: s.key }); floorsSeen.add(floor); rooms.push(r);
    if (parent || link?.parentKey){
      const par = link?.parentKey ? rooms.find(x => x.key === link.parentKey) : parent;
      const secret = !!s.secret; const locked = s.locked ? { dc: 12 + Math.floor(rng() * 5), key: `${r.name} key` } : null;
      const d = { kind: link.kind || "door", dir: link.dir || null, locked, secret };
      if (floor === par.floor){ const sw = sharedWall(par, r); const p = sw ? doorPoint(par, sw, rng) : { x: par.x + par.w / 2, y: par.y + par.h / 2 }; d.x = p.x; d.y = p.y; d.side = sw?.side || "e";
        par.doors.push({ ...d, to: r.id }); r.doors.push({ ...d, to: par.id, side: OPP[d.side] }); }
      else { // stairs, ladders and trapdoors: one end in each room, on its own floor
        par.doors.push({ ...d, to: r.id, side: null, x: par.x + Math.min(1, par.w - 1), y: par.y + Math.min(1, par.h - 1) });
        r.doors.push({ ...d, to: par.id, side: null, dir: d.dir === "up" ? "down" : "up", x: r.x + Math.min(1, r.w - 1), y: r.y + Math.min(1, r.h - 1) }); }
      if (secret){ par.hiddenLinks.push(r.id); r.hiddenLinks.push(par.id); } else { par.links.push(r.id); r.links.push(par.id); }
    }
    r.specObjs = s.objs || [];
  }
  // extra doors between rooms that happen to touch (loops make real buildings)
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++){
    const a = rooms[i], b = rooms[j]; if (a.floor !== b.floor || a.links.includes(b.id) || a.hiddenLinks.includes(b.id)) continue;
    if (a.private && b.private && rng() < 0.6) continue; if (a.exit || b.exit) continue;
    const sw = sharedWall(a, b); if (!sw || rng() > 0.22) continue;
    const p = doorPoint(a, sw, rng); a.doors.push({ kind:"door", to: b.id, x: p.x, y: p.y, side: sw.side }); b.doors.push({ kind:"door", to: a.id, x: p.x, y: p.y, side: OPP[sw.side] }); a.links.push(b.id); b.links.push(a.id);
  }
  // one coordinate frame for every floor (upper floors sit over the ground floor), starting at (1,1)
  const x0 = Math.min(...rooms.map(r => r.x)) - 1, y0 = Math.min(...rooms.map(r => r.y)) - 1;
  for (const r of rooms){ r.x -= x0; r.y -= y0; for (const d of r.doors){ d.x -= x0; d.y -= y0; } }
  const FW = Math.max(...rooms.map(r => r.x + r.w)) + 1, FH = Math.max(...rooms.map(r => r.y + r.h)) + 1;
  const floors = [...floorsSeen].sort((a, b) => b - a).map(z => ({ id: "f" + z, z, name: z === 0 ? (o.kind === "ship" ? "Main deck" : "Ground floor") : z > 0 ? (o.kind === "tower" ? `Level ${z}` : z === 1 ? "Upper floor" : `Floor ${z + 1}`) : z === -1 ? (o.kind === "ship" ? "Lower deck" : "Cellar") : "Deep below", w: FW, h: FH }));
  for (const r of rooms){ const f = floors.find(f => f.z === r.floor); r.floorId = f.id; }
  // furniture, people, secrets and loot
  const site = { v: SITE_V, kind: o.kind, label: W ? W.name : KIND_LABEL[o.kind] || o.kind, style: W?.style || KIND_STYLE[o.kind] || "stone", theme: o.theme, hostile: o.hostile, mood: o.mood, size: o.size, wonder: o.wonder, seed: o.seed,
    blurb: W ? W.desc : "", floors, rooms, current: null, entrance: null, cleared: false, bossRoom: null, shifting: !!W?.shifting, truth: !!W?.truth };
  const entrance = rooms.find(r => r.entrance) || rooms[0]; site.entrance = entrance.id; site.current = entrance.id;
  for (const r of rooms){ furnishRoom(rng, r, r.specObjs, site); delete r.specObjs; }
  if (W?.add) for (const [k, where] of W.add){ const r = roomWhere(rng, rooms, where); if (r) addObject(rng, r, k, {}); }
  if (W?.hazard) for (const r of rooms.filter(r => !r.entrance && rng() < 0.4)) r.hazard = r.hazard || W.hazard;
  addVignette(rng, site, o);
  populate(c, loc, site, o, rng);
  if (o.hostile) stockDungeon(c, loc, site, o, rng);
  for (const r of rooms){ if (r.stash || (r.type === "room" && r.private && rng() < 0.35)) { const ch = r.objects.find(x => x.container && !x.loot); if (ch){ ch.loot = rollLoot(placeLevel(c, loc), r.stash ? "chest" : "minor"); ch.hidden = r.stash && !["chest","sarcophagus","hoard"].includes(ch.kind) ? true : ch.hidden; } } }
  // cells hold prisoners (people to free)
  for (const r of rooms.filter(r => r.cell)){ const cage = r.objects.find(x => x.kind === "cage" || x.kind === "bars"); if (cage && !cage.prisoner){ cage.prisoner = { name: seedName(rng), why: ["accused of theft","a debtor","caught poaching","a political prisoner","who insists on being innocent","whose crime nobody will name"][Math.floor(rng() * 6)], freed: false }; cage.acts = ["open"]; cage.locked = { dc: 13, key: "cell key" }; } }
  entrance.state = "visited"; for (const id of entrance.links){ const n = rooms.find(x => x.id === id); if (n) n.state = "seen"; }
  if (W?.nightOnly){ site.nightOnly = true; site.blurb += " It opens only at night; by day the stalls stand empty."; }
  return site;
}
function roomWhere(rng, rooms, where){
  const pool = where === "any" ? rooms : rooms.filter(r => where === "social" ? r.social : where === "private" ? r.private : where === "storage" ? r.storage : where === "cell" ? r.cell : where === "work" ? r.work : r.social);
  const list = (pool.length ? pool : rooms).filter(r => (!r.entrance || pool.length <= 1) && !r.secret); return list.length ? list[Math.floor(rng() * list.length)] : rooms[0];
}
// put furniture in a room: wall pieces hug walls (away from doors), the rest fills the middle
// the cell just inside a door, and the one behind it, stay clear so the room can be walked into
function doorInside(r, d){ if (!d.side) return []; const fx = Math.floor(d.x), fy = Math.floor(d.y);
  if (d.side === "w") return [[r.x, fy], [r.x + 1, fy]]; if (d.side === "e") return [[r.x + r.w - 1, fy], [r.x + r.w - 2, fy]];
  if (d.side === "n") return [[fx, r.y], [fx, r.y + 1]]; return [[fx, r.y + r.h - 1], [fx, r.y + r.h - 2]]; }
function furnishRoom(rng, r, specs, site){
  const taken = new Set(); const doorCells = new Set();
  for (const d of r.doors) for (const [x, y] of doorInside(r, d)) doorCells.add(`${x},${y}`);
  // stairs, ladders and trapdoors each get their own free cell, by the walls, away from doors
  for (const d of r.doors.filter(d => !d.side)){
    const cands = []; for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) if (x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1) cands.push([x, y]);
    cands.sort((a, b) => (Math.min(Math.abs(a[0] - r.x), Math.abs(a[0] - r.x - r.w + 1)) + Math.min(Math.abs(a[1] - r.y), Math.abs(a[1] - r.y - r.h + 1))) - (Math.min(Math.abs(b[0] - r.x), Math.abs(b[0] - r.x - r.w + 1)) + Math.min(Math.abs(b[1] - r.y), Math.abs(b[1] - r.y - r.h + 1))) || rng() - 0.5);
    const cell = cands.find(([x, y]) => !taken.has(`${x},${y}`) && !doorCells.has(`${x},${y}`)) || [r.x, r.y];
    d.x = cell[0] + 0.5; d.y = cell[1] + 0.5;
    addObject(rng, r, d.kind === "ladder" ? "ladder" : d.kind === "trapdoor" ? "trapdoor" : "stairs", { x: cell[0], y: cell[1], w: 1, h: 1, door: d.to, dir: d.dir, name: d.kind === "trapdoor" ? "trapdoor" : `${d.kind} ${d.dir}`, fixed: true }, taken);
  }
  const list = []; for (const s of specs){ const m = String(s).match(/^(\w+)(@wall)?(?:\*(\d+))?$/); if (!m) continue; const n = +(m[3] || 1); for (let i = 0; i < n; i++) list.push({ kind: m[1], wall: !!m[2] || !!OBJ[m[1]]?.wall }); }
  list.sort((a, b) => (b.wall ? 1 : 0) - (a.wall ? 1 : 0) || (OBJ[b.kind]?.w * OBJ[b.kind]?.h || 1) - (OBJ[a.kind]?.w * OBJ[a.kind]?.h || 1));
  for (const it of list) addObject(rng, r, it.kind, { wall: it.wall }, taken, doorCells);
}
function addObject(rng, r, kind, o = {}, taken, doorCells){
  const def = OBJ[kind] || { n: kind, w: 1, h: 1 }; let w = o.w || def.w || 1, h = o.h || def.h || 1;
  if (w > r.w - 1 || h > r.h - 1){ if (h <= r.w - 1 && w <= r.h - 1){ [w, h] = [h, w]; } else { w = Math.min(w, Math.max(1, r.w - 1)); h = Math.min(h, Math.max(1, r.h - 1)); } }
  taken = taken || new Set(); doorCells = doorCells || new Set();
  const free = (x, y) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++){ const k = `${x + i},${y + j}`; if (taken.has(k) || doorCells.has(k)) return false; } return true; };
  let pos = null;
  if (o.x != null){ pos = { x: Math.floor(o.x), y: Math.floor(o.y) }; }
  else {
    const cands = [];
    if (o.wall || def.wall){
      for (let x = r.x; x + w <= r.x + r.w; x++){ cands.push({ x, y: r.y }); cands.push({ x, y: r.y + r.h - h }); }
      for (let y = r.y; y + h <= r.y + r.h; y++){ cands.push({ x: r.x, y }); cands.push({ x: r.x + r.w - w, y }); }
    } else {
      const inset = r.w > 3 && r.h > 3 ? 1 : 0;
      for (let x = r.x + inset; x + w <= r.x + r.w - inset; x++) for (let y = r.y + inset; y + h <= r.y + r.h - inset; y++) cands.push({ x, y });
    }
    cands.sort(() => rng() - 0.5);
    pos = cands.find(p => free(p.x, p.y)) || null;
    if (!pos && !o.wall){ for (let x = r.x; x + w <= r.x + r.w; x++) for (let y = r.y; y + h <= r.y + r.h; y++) if (free(x, y)){ pos = { x, y }; break; } }
  }
  if (!pos) return null;
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) taken.add(`${pos.x + i},${pos.y + j}`);
  const ob = { id: `o${r.id}-${r.objects.length}`, kind, name: o.name || def.n, x: pos.x, y: pos.y, w, h, acts: o.acts || (def.acts ? [...def.acts] : []), ...(o.door ? { door: o.door, dir: o.dir } : {}) };
  if (def.container) ob.container = true; if (def.cover) ob.cover = true; if (def.lit) ob.lit = true; if (def.flat) ob.flat = true;
  if (o.note) ob.note = o.note; if (o.loot) ob.loot = o.loot; if (o.hidden) ob.hidden = true; if (o.text) ob.text = o.text;
  r.objects.push(ob); return ob;
}
// environmental storytelling: one vignette per site, told with objects and a private note for the DM
function addVignette(rng, site, o){
  const cands = Object.entries(VIGNETTES).filter(([, v]) => v.kinds.includes(site.kind)); if (!cands.length || rng() > 0.7) return;
  const [key, v] = cands[Math.floor(rng() * cands.length)]; const rooms = site.rooms;
  const r = roomWhere(rng, rooms, v.add[0][1]); if (!r) return;
  let first = true;
  for (const [k, where] of v.add){ const room = where === v.add[0][1] ? r : roomWhere(rng, rooms, where); const ob = addObject(rng, room, k, { note: first ? v.note : undefined }, new Set(room.objects.flatMap(x => { const s = []; for (let i = 0; i < x.w; i++) for (let j = 0; j < x.h; j++) s.push(`${x.x + i},${x.y + j}`); return s; }))); if (ob && first && v.loot){ ob.loot = v.loot; ob.acts = [...new Set([...(ob.acts || []), "search"])]; ob.container = true; } first = false; }
  site.vignette = { key, room: r.id, dm: v.dm, note: v.note };
}
// people: generated extras by role, plus the campaign's own NPCs who live at this place
function populate(c, loc, site, o, rng){
  const extras = EXTRAS[site.kind] || []; const rooms = site.rooms;
  const n = o.size === "large" ? extras.length : o.size === "small" ? Math.min(2, extras.length) : Math.min(4, extras.length);
  const used = new Set();
  for (let i = 0; i < n; i++){
    const [role, where, line] = extras[i]; const r = where === "service" ? (rooms.find(x => x.service) || rooms.find(x => x.social) || rooms[0]) : roomWhere(rng, rooms, where);
    if (o.hostile && !["prisoner"].includes(role)) continue;
    let name = seedName(rng); let guard = 0; while (used.has(name) && guard++ < 10) name = seedName(rng); used.add(name);
    const npc = { id: `n${rooms.indexOf(r)}-${r.npcs.length}`, name: role === "cat" || role === "homunculus" ? (role === "cat" ? "a black cat" : "a homunculus") : name, role, line, x: 0, y: 0, mood: ["cheerful","wary","tired","curious","sour","friendly"][Math.floor(rng() * 6)] };
    placeNpc(rng, r, npc); r.npcs.push(npc);
  }
  // the campaign's NPCs who are at this place go into the room that fits their role
  for (const npc of Object.values(c.npcs || {})){
    if (npc.location !== loc.id || npc.status === "dead") continue;
    const role = String(npc.role || "").toLowerCase();
    const r = /keeper|owner|bartend|barkeep|host/.test(role) ? (rooms.find(x => x.service) || rooms[0]) : /guard|captain|sergeant|warden/.test(role) ? (rooms.find(x => x.guards) || rooms[0]) : /prisoner|captive/.test(role) ? (rooms.find(x => x.cell) || rooms[0]) : /lord|lady|noble|master|wizard|mage/.test(role) ? (rooms.find(x => x.owner) || rooms.find(x => x.private) || rooms[0]) : (rooms.find(x => x.social) || rooms[0]);
    const tok = { id: `c-${npc.id}`, npcId: npc.id, name: npc.name, role: npc.role || "", x: 0, y: 0 }; placeNpc(rng, r, tok); r.npcs.push(tok);
  }
}
function placeNpc(rng, r, npc){
  const taken = new Set(r.objects.flatMap(x => { const s = []; for (let i = 0; i < x.w; i++) for (let j = 0; j < x.h; j++) s.push(`${x.x + i},${x.y + j}`); return s; }).concat(r.npcs.map(n => `${n.x},${n.y}`)));
  const cands = []; for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) if (!taken.has(`${x},${y}`)) cands.push({ x, y });
  const p = cands.length ? cands[Math.floor(rng() * cands.length)] : { x: r.x, y: r.y }; npc.x = p.x; npc.y = p.y;
}
// enemies, traps, treasure and the boss for hostile sites (same mechanics the dungeon rooms always had)
function stockDungeon(c, loc, site, o, rng){
  const theme = site.theme || "bandit"; loc.theme = theme; const members = partyMembers(c); const L = placeLevel(c, loc); const tier = Math.min(3, lootTier(L));
  const pool = THEMES[theme]?.pools[tier] || THEMES.bandit.pools[0]; const rooms = site.rooms;
  const dist = {}; const start = rooms.find(r => r.id === site.entrance); dist[start.id] = 0; const q = [start];
  while (q.length){ const r = q.shift(); for (const id of r.links){ if (dist[id] == null){ dist[id] = dist[r.id] + 1; q.push(rooms.find(x => x.id === id)); } } }
  let boss = rooms.find(r => r.type === "boss"); if (!boss){ boss = rooms.filter(r => r !== start && dist[r.id] != null).sort((a, b) => dist[b.id] - dist[a.id])[0] || rooms[rooms.length - 1]; boss.type = "boss"; }
  if (!rooms.some(r => r.type === "combat")) for (const r of rooms.filter(r => r.type === "room" && !r.entrance && r !== boss).slice(0, 2)) r.type = "combat";
  for (const r of rooms){
    if (r.type === "room" && !r.entrance && r.id !== boss.id && !r.secret && rng() < 0.3 && !r.exit) r.type = "combat";
    if (r.type === "combat"){ r.enemies = buildEncounter(pool, encounterBudget(members, rng() < 0.3 ? "hard" : "medium", L), 5); r.tactics = rollRoomTactics(rng, theme, pool, members, L); }
    if (r.type === "boss"){ const enc = bossEncounter(c, theme, loc.important ? "deadly" : "hard", loc.villain?.name || loc.bossName, L); r.enemies = enc.enemies; r.bossName = loc.villain?.name || loc.bossName || enc.boss; r.loot = rollLoot(L + 1, "boss"); r.name = loc.villain ? `${loc.villain.name}'s lair` : loc.fallen ? "The occupied keep" : r.name;
      if (loc.villain) for (const t of (c.traitors || [])) r.enemies.push({ name: TRAITOR_BASE[t.cls] || "Veteran", count: 1, displayName: `${t.name} the Traitor` }); }
    if (r.type === "treasure"){ r.loot = rollLoot(L, r.hiddenLinks.length && !r.links.length ? "boss" : "chest"); if (!(r.hiddenLinks.length && !r.links.length) && rng() < 0.25) r.mimic = true; }
    if (r.type === "trap"){ const tr = TRAPS[Math.floor(rng() * TRAPS.length)]; r.trap = { ...tr, dc: 12 + tier, dmg: `${2 + tier * 2}d6` }; }
    if (r.type === "mystery" && !r.feature) r.feature = MYSTERIES[Math.floor(rng() * MYSTERIES.length)];
  }
  if (loc.questItem){ const target = boss.loot ? boss : rooms.find(r => r.loot) || boss; target.loot = target.loot || { gold: 0, items: [] }; target.loot.items.push({ name: loc.questItem, type: "quest", quest: true, description: "The object of a bounty." }); }
  site.bossRoom = boss.id;
}
// older saves: the 5x3 room graph becomes a one-floor plan, keeping every room's state
function upgradeOldSite(loc){
  const d = loc.dungeon; if (!d || d.v >= SITE_V) return d;
  const CW = 6, CH = 5; const rooms = d.rooms.map(r => ({ ...r, floor: 0, floorId: "f0", x: 1 + r.x * CW, y: 1 + r.y * CH, w: 4, h: 3, doors: [], objects: [], npcs: [], light: "dark", desc: "", private: false, social: false, service: null, outdoor: false, hazard: null, choke: false, high: false, escape: false, cell: false }));
  for (const r of rooms) for (const id of [...r.links, ...r.hiddenLinks]){ const o = rooms.find(x => x.id === id); if (!o) continue; const dx = o.x - r.x, dy = o.y - r.y; const side = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "e" : "w") : (dy > 0 ? "s" : "n");
    const p = side === "e" ? { x: r.x + r.w, y: r.y + 1.5 } : side === "w" ? { x: r.x, y: r.y + 1.5 } : side === "s" ? { x: r.x + 2, y: r.y + r.h } : { x: r.x + 2, y: r.y }; r.doors.push({ kind: "door", to: o.id, x: p.x, y: p.y, side, secret: r.hiddenLinks.includes(id) }); }
  const w = Math.max(...rooms.map(r => r.x + r.w)) + 1, h = Math.max(...rooms.map(r => r.y + r.h)) + 1;
  loc.dungeon = { ...d, v: SITE_V, kind: siteKindFor(loc), label: KIND_LABEL[siteKindFor(loc)] || "dungeon", style: KIND_STYLE[siteKindFor(loc)] || "stone", hostile: true, floors: [{ id: "f0", z: 0, name: "Ground floor", w, h }], rooms, entrance: rooms[0].id, mood: "ruined", size: "medium", seed: hashStr(loc.id) };
  return loc.dungeon;
}
function ensureSite(c, loc, hint){
  if (!loc) return null;
  if (loc.dungeon && loc.dungeon.v >= SITE_V) return loc.dungeon;
  if (loc.dungeon) return upgradeOldSite(loc);
  loc.dungeon = genSite(c, loc, hint); return loc.dungeon;
}
// can the party walk into this place and see a map of it?
function isEnterable(l){ if (!l || isSettlement(l) && !(l.type === "camp" && l.hostile)) return false; if (l.parent) return true; return isDelvable(l) || ["castle","tower","temple","tavern","shop","sewer","guardhouse","hall","house","warehouse","docks","farm","cemetery","market"].includes(l.type) || (l.type === "camp" && !!l.hostile); }
function siteOf(c){ return c?.explore ? c.locations[c.explore.loc]?.dungeon : null; }
function roomObjects(r){ return (r.objects || []).filter(o => !o.hidden || o.found); }
function roomDoorsKnown(r){ return (r.doors || []).filter(d => !d.secret || (r.found || []).includes(d.to)); }
function roomDesc(r, site){ return r.desc || ({ entrance:"The way in, and out.", combat:"Enemies lurk here.", boss:"The master of this place waits here.", trap:"A trapped chamber.", treasure:"A treasure chamber.", mystery:`It holds ${r.feature || "a mystery"}.`, camp:"A quiet, defensible spot.", shrine:"An old shrine." })[r.type] || "A room."; }
// a tidy description of the current room for the Dungeon Master (secrets stay secret)
function siteContext(c){
  const site = siteOf(c); if (!site) return ""; const loc = c.locations[c.explore.loc]; const r = site.rooms.find(x => x.id === site.current); if (!r) return "";
  const fl = site.floors.find(f => f.id === r.floorId);
  const exits = roomDoorsKnown(r).map(d => { const o = site.rooms.find(x => x.id === d.to); const known = o && (o.state === "visited" || o.state === "cleared"); const what = d.kind === "stairs" ? `stairs ${d.dir}` : d.kind === "ladder" ? `a ladder ${d.dir}` : d.kind === "trapdoor" ? "a trapdoor" : d.kind === "grate" ? "a grate" : "a door"; return `${what} to ${known ? `${o.name} [${o.id}]` : "an unexplored room"}${d.locked && !d.unlocked ? " (locked)" : ""}`; });
  const objs = roomObjects(r).map(o => `${o.name}${o.state ? ` (${o.state})` : ""}${o.loot && !o.looted && (o.kind === "chest" || o.kind === "hoard") ? "" : ""}`);
  const people = r.npcs.filter(n => !n.dead && !n.gone).map(n => `${n.name}${n.role ? ` (${n.role})` : ""}`);
  const secrets = [];
  for (const d of r.doors.filter(d => d.secret && !(r.found || []).includes(d.to))) secrets.push(`a secret ${d.kind} to ${site.rooms.find(x => x.id === d.to)?.name || "somewhere"}`);
  for (const o of (r.objects || []).filter(o => o.hidden && !o.found)) secrets.push(`hidden: ${o.name}`);
  if (site.vignette && site.vignette.room === r.id) secrets.push(`clue here: ${site.vignette.dm}`);
  const others = site.rooms.filter(x => x.id !== r.id && (x.state === "visited" || x.state === "cleared")).map(x => `${x.name} [${x.id}]`);
  return `INSIDE ${loc.name} (${site.label}${site.blurb ? `: ${site.blurb}` : ""}${site.hostile && site.theme ? `, ${THEMES[site.theme]?.label || site.theme}` : ""}). ${fl ? fl.name + ", " : ""}room: ${r.name} [${r.id}] (${r.type === "room" ? (r.private ? "private" : r.social ? "public" : "room") : r.type}${r.state === "cleared" ? ", cleared" : ""}, ${r.light}${r.hazard ? `, hazard: ${r.hazard}` : ""}): ${roomDesc(r, site)} Here: ${objs.join(", ") || "nothing of note"}. People here: ${people.join(", ") || "nobody"}. Exits: ${exits.join("; ") || "none known"}.${others.length ? ` Rooms already explored: ${others.join(", ")}.` : ""}${secrets.length ? ` SECRETS the party has not found (never state them outright; let clues and successful searches reveal them): ${secrets.join("; ")}.` : ""}${site.truth ? " NOBODY CAN LIE in this place, and everyone knows it." : ""}${site.shifting ? " This place rearranges its rooms between visits; nothing is where it was." : ""} The game handles movement, doors, searches, loot and fights; you narrate. When the party moves to another room in this place, set "room": "<room id>".`;
}
</script>
