<script>
"use strict";
// =====================================================================
//  TOWNS: every settlement gets a persistent street map with buildings you can walk into.
//  Buildings become child locations (with their own floor plans) the first time the party enters them.
//  Towns, cities and ports also hide a sewer network under their streets, reached through grates,
//  cellars and tunnels, which links the tavern, the guardhouse and the keep.
// =====================================================================
const TOWN_V = 1;
const BUILDING_KINDS = {
  tavern:     { label:"Tavern", type:"tavern", w:5, h:4, icon:"tavern", site:"tavern" },
  inn:        { label:"Inn", type:"tavern", w:5, h:4, icon:"tavern", site:"inn" },
  smith:      { label:"Smithy", type:"shop", w:4, h:3, icon:"axe", site:"smith" },
  shop:       { label:"General store", type:"shop", w:4, h:3, icon:"shop", site:"shop" },
  alchemist:  { label:"Apothecary", type:"shop", w:3, h:3, icon:"potion", site:"alchemist" },
  market:     { label:"Market", type:"market", w:6, h:4, icon:"shop", site:"market", open:true },
  temple:     { label:"Temple", type:"temple", w:5, h:6, icon:"temple", site:"temple" },
  guardhouse: { label:"Guard station", type:"guardhouse", w:5, h:4, icon:"shieldx", site:"guardhouse" },
  prison:     { label:"Prison", type:"guardhouse", w:6, h:5, icon:"shieldx", site:"prison" },
  hall:       { label:"Town hall", type:"hall", w:5, h:4, icon:"home", site:"guildhall" },
  guildhall:  { label:"Guild hall", type:"hall", w:5, h:4, icon:"quest", site:"guildhall" },
  library:    { label:"Library", type:"hall", w:4, h:4, icon:"book", site:"library" },
  manor:      { label:"Manor", type:"hall", w:6, h:5, icon:"castle", site:"manor" },
  keep:       { label:"Keep", type:"castle", w:7, h:6, icon:"castle", site:"castle" },
  house:      { label:"House", type:"house", w:3, h:3, icon:"home", site:"house" },
  warehouse:  { label:"Warehouse", type:"warehouse", w:5, h:4, icon:"shop", site:"warehouse" },
  docks:      { label:"Docks", type:"docks", w:8, h:3, icon:"port", site:"docks", open:true },
  farm:       { label:"Farm", type:"farm", w:6, h:5, icon:"leaf", site:"farm", open:true },
  stables:    { label:"Stables", type:"farm", w:4, h:3, icon:"leaf", site:"farm" },
  cemetery:   { label:"Cemetery", type:"cemetery", w:6, h:5, icon:"moon", site:"cemetery", open:true },
  tower:      { label:"Wizard's tower", type:"tower", w:3, h:3, icon:"wand", site:"tower" },
  lighthouse: { label:"Lighthouse", type:"tower", w:3, h:3, icon:"sun2", site:"tower" },
  square:     { label:"Town square", type:"market", w:7, h:5, icon:"town", site:"square", open:true },
  tent:       { label:"Tents", type:"camp", w:3, h:3, icon:"camp", site:"camp", open:true },
};
// which buildings a kind of settlement has (services first, then flavor)
function townBuildingList(town, rng){
  const sv = servicesOf(town); const out = [];
  const add = (k, n = 1) => { for (let i = 0; i < n; i++) out.push(k); };
  if (sv.includes("inn") || town.type !== "camp") add(town.type === "city" ? "inn" : "tavern");
  if (sv.includes("market")) add("market");
  if (sv.includes("smith")) add("smith");
  if (sv.includes("temple")) add("temple"); else if (town.type === "village") add("temple");
  if (sv.includes("guild")) add("guildhall");
  if (town.type === "town" || town.type === "city" || town.type === "port"){ add("guardhouse"); add("hall"); add("warehouse"); add("stables"); }
  if (town.type === "city"){ add("library"); add("manor", 2); add("keep"); add("alchemist"); add("prison"); add("shop"); }
  if (town.type === "town"){ add("shop"); if (rng() < 0.5) add("alchemist"); if (rng() < 0.4) add("tower"); }
  if (town.type === "port"){ add("docks"); add("warehouse"); add("lighthouse"); add("shop"); }
  if (town.type === "village"){ add("farm", 2); add("stables"); }
  if (town.type !== "camp" && town.type !== "village" && rng() < 0.8) add("cemetery");
  if (town.type === "village") add("cemetery");
  add("house", town.type === "city" ? 9 : town.type === "village" ? 4 : town.type === "camp" ? 0 : 6);
  if (town.type === "camp"){ add("tent", 3); }
  return out;
}
function townBounds(town){ return town.type === "city" ? { w: 46, h: 34 } : town.type === "village" ? { w: 30, h: 22 } : town.type === "camp" ? { w: 22, h: 16 } : { w: 38, h: 28 }; }
// lay the streets, put the square in the middle, then fill lots along the streets
function genTown(c, town){
  const seed = hashStr(`town|${town.id}|${c.id}`); const rng = mulberry(seed); const { w: W, h: H } = townBounds(town);
  const t = { v: TOWN_V, seed, w: W, h: H, buildings: [], streets: [], features: [], trees: [], walls: town.type === "city" || town.type === "town" || town.type === "camp", gates: [], water: town.type === "port" ? "s" : null, square: null, biome: town.biome || "g" };
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  const sq = { x: cx - 4, y: cy - 3, w: 8, h: 6 }; t.square = sq;
  // streets: a main road east-west, a cross street north-south, and a couple of side lanes
  t.streets.push({ x1: 0, y1: cy, x2: W, y2: cy, w: 2, main: true }); t.streets.push({ x1: cx, y1: 0, x2: cx, y2: t.water ? cy + 3 + 8 : H, w: 2, main: true });
  const lanes = town.type === "city" ? 3 : town.type === "village" ? 1 : 2;
  for (let i = 0; i < lanes; i++){ const y = i % 2 === 0 ? cy - 7 - Math.floor(i / 2) * 6 : cy + 7 + Math.floor(i / 2) * 6; if (y > 2 && y < H - 2) t.streets.push({ x1: 3, y1: y, x2: W - 3, y2: y, w: 1 }); }
  if (town.type !== "village"){ const x = cx + 9; if (x < W - 3) t.streets.push({ x1: x, y1: 3, x2: x, y2: H - 3, w: 1 }); }
  if (town.type === "city"){ const x = cx - 10; t.streets.push({ x1: x, y1: 3, x2: x, y2: H - 3, w: 1 }); }
  if (t.walls){ t.gates.push({ x: 0, y: cy, side: "w" }, { x: W, y: cy, side: "e" }); if (!t.water) t.gates.push({ x: cx, y: H, side: "s" }); }
  // lots: cells along both sides of every street
  const taken = []; const blocked = (b) => taken.some(o => b.x < o.x + o.w + 1 && o.x < b.x + b.w + 1 && b.y < o.y + o.h + 1 && o.y < b.y + b.h + 1);
  const inBounds = (b) => b.x >= 1 && b.y >= 1 && b.x + b.w <= W - 1 && b.y + b.h <= (t.water ? H - 4 : H - 1);
  const onStreet = (b) => t.streets.some(s => s.y1 === s.y2 ? (b.y + b.h === s.y1 - 0 || b.y === s.y1 + s.w) && b.x + b.w > s.x1 && b.x < s.x2 : (b.x + b.w === s.x1 || b.x === s.x1 + s.w) && b.y + b.h > s.y1 && b.y < s.y2);
  const inSquare = (b) => b.x < sq.x + sq.w + 1 && sq.x < b.x + b.w + 1 && b.y < sq.y + sq.h + 1 && sq.y < b.y + b.h + 1;
  const crossesStreet = (b) => t.streets.some(s => s.y1 === s.y2 ? (b.y < s.y1 + s.w && b.y + b.h > s.y1 && b.x < s.x2 && b.x + b.w > s.x1) : (b.x < s.x1 + s.w && b.x + b.w > s.x1 && b.y < s.y2 && b.y + b.h > s.y1));
  const place = (kind, pref) => {
    const K = BUILDING_KINDS[kind]; const cands = [];
    for (let x = 1; x < W - K.w; x++) for (let y = 1; y < H - K.h; y++){ const b = { x, y, w: K.w, h: K.h }; if (!inBounds(b) || inSquare(b) || crossesStreet(b) || blocked(b) || !onStreet(b)) continue;
      const dc = Math.hypot(x + K.w / 2 - cx, y + K.h / 2 - cy); let score = rng() * 4;
      if (pref === "center") score += dc; else if (pref === "edge") score -= dc; else if (pref === "water") score += Math.abs((y + K.h) - (H - 4)) * 2; else score += dc * 0.25;
      cands.push({ b, score }); }
    cands.sort((a, b) => a.score - b.score); const c0 = cands[0]; if (!c0) return null;
    const b = { id: "b" + t.buildings.length, kind, name: K.label, ...c0.b, loc: null, icon: K.icon };
    taken.push(b); t.buildings.push(b); return b;
  };
  const PREF = { temple:"center", hall:"center", market:"center", tavern:"center", inn:"center", guildhall:"center", library:"center", manor:"edge", keep:"edge", farm:"edge", cemetery:"edge", stables:"edge", docks:"water", warehouse: t.water ? "water" : "edge", lighthouse:"water", tower:"edge", prison:"edge" };
  for (const k of townBuildingList(town, rng)) place(k, PREF[k] || "any");
  // the square's own features
  t.features.push({ kind: town.type === "village" ? "well" : "fountain", x: cx, y: cy - 1 });
  if (town.type !== "camp") t.features.push({ kind: "notice", x: sq.x + 1, y: sq.y + 1 });
  if (town.type === "city" || town.type === "town") t.features.push({ kind: "statue", x: sq.x + sq.w - 2, y: sq.y + sq.h - 2 });
  if (town.type === "camp") t.features.push({ kind: "campfire", x: cx, y: cy + 1 });
  // a back alley with a grate into the sewers
  if (["town","city","port"].includes(town.type)){ const alley = t.buildings.find(b => b.kind === "tavern" || b.kind === "inn") || t.buildings[0]; if (alley) t.features.push({ kind: "grate", x: alley.x + alley.w, y: alley.y + alley.h, alley: true }); }
  for (let i = 0; i < (town.type === "village" ? 14 : 8); i++){ const x = 1 + Math.floor(rng() * (W - 2)), y = 1 + Math.floor(rng() * (H - 2)); const b = { x, y, w: 1, h: 1 }; if (!blocked(b) && !inSquare(b) && !crossesStreet(b)) t.trees.push({ x, y }); }
  return t;
}
// link the DM's own places inside this town to buildings (the tavern it named becomes THE tavern), and create the sewers
function ensureTown(c, town){
  if (!town || !isSettlement(town)) return null;
  if (!town.town || town.town.v !== TOWN_V) town.town = genTown(c, town);
  const t = town.town;
  const kids = Object.values(c.locations).filter(l => l.parent === town.id);
  for (const l of kids){
    if (t.buildings.some(b => b.loc === l.id)) continue;
    if (/sewer/i.test(l.name) || l.type === "sewer"){ t.sewer = l.id; continue; }
    const kind = siteKindFor(l); const want = { tavern:["tavern","inn"], inn:["inn","tavern"], smith:["smith"], shop:["shop","market"], alchemist:["alchemist","shop"], market:["market"], temple:["temple"], guardhouse:["guardhouse","prison"], prison:["prison","guardhouse"], manor:["manor","hall"], house:["house"], library:["library","hall"], guildhall:["guildhall","hall"], warehouse:["warehouse"], docks:["docks"], farm:["farm","stables"], cemetery:["cemetery"], tower:["tower","lighthouse"], castle:["keep","manor"], square:["square","market"], lab:["tower","house"], shrine:["temple"] }[kind] || ["house","hall"];
    let b = null; for (const k of want){ b = t.buildings.find(x => x.kind === k && !x.loc); if (b) break; }
    if (!b){ const K = BUILDING_KINDS[want[0]] || BUILDING_KINDS.house; const rng = mulberry(hashStr(l.id)); const spot = freeLot(t, K.w, K.h, rng); if (spot){ b = { id: "b" + t.buildings.length, kind: want[0], name: K.label, ...spot, w: K.w, h: K.h, loc: null, icon: K.icon }; t.buildings.push(b); } }
    if (b){ b.loc = l.id; b.name = l.name; }
  }
  if (!t.sewer && ["town","city","port"].includes(town.type)){
    const id = slug(town.name) + "-sewers"; if (!c.locations[id]){ const rng = mulberry(hashStr(id + c.id)); c.locations[id] = { id, name: `${town.name} Sewers`, type: "sewer", parent: town.id, x: null, y: null, description: "Brick tunnels under the streets, where the town puts what it wants forgotten.", discovered: false, hidden: true, visited: false, hostile: true, theme: ["bandit","beast","cult"][Math.floor(rng() * 3)], connections: [], lvl: Math.max(1, (town.lvl || 1)) }; }
    t.sewer = id;
  }
  return t;
}
function freeLot(t, w, h, rng){
  const blocked = (b) => t.buildings.some(o => b.x < o.x + o.w + 1 && o.x < b.x + b.w + 1 && b.y < o.y + o.h + 1 && o.y < b.y + b.h + 1);
  const crosses = (b) => t.streets.some(s => s.y1 === s.y2 ? (b.y < s.y1 + s.w && b.y + b.h > s.y1 && b.x < s.x2 && b.x + b.w > s.x1) : (b.x < s.x1 + s.w && b.x + b.w > s.x1 && b.y < s.y2 && b.y + b.h > s.y1));
  const sq = t.square; const inSq = (b) => sq && b.x < sq.x + sq.w + 1 && sq.x < b.x + b.w + 1 && b.y < sq.y + sq.h + 1 && sq.y < b.y + b.h + 1;
  const cands = []; for (let x = 1; x < t.w - w - 1; x++) for (let y = 1; y < t.h - h - 1; y++){ const b = { x, y, w, h }; if (!blocked(b) && !crosses(b) && !inSq(b)) cands.push(b); }
  return cands.length ? cands[Math.floor(rng() * cands.length)] : null;
}
// the child location behind a building (created the first time the party goes in)
function buildingLocation(c, town, b){
  if (b.loc && c.locations[b.loc]) return c.locations[b.loc];
  const K = BUILDING_KINDS[b.kind] || BUILDING_KINDS.house; const rng = mulberry(hashStr(`${town.id}|${b.id}`));
  const name = b.kind === "tavern" || b.kind === "inn" ? genName("tavern") : b.kind === "house" ? `${genName("person").split(" ")[1]} house` : b.kind === "smith" ? `${genName("person").split(" ")[1]}'s Forge` : b.kind === "shop" ? `${genName("person").split(" ")[1]} & Sons` : b.kind === "manor" ? `${genName("person").split(" ")[1]} Manor` : b.kind === "temple" ? `Temple of the ${["Dawn","Hearth","Tides","Lantern","Seven","Quiet","Harvest"][Math.floor(rng() * 7)]}` : b.kind === "keep" ? `${town.name} Keep` : b.kind === "guardhouse" ? `${town.name} watch house` : b.kind === "prison" ? `${town.name} gaol` : b.kind === "docks" ? `${town.name} docks` : b.kind === "cemetery" ? `${town.name} cemetery` : b.kind === "market" ? `${town.name} market` : b.kind === "square" ? `${town.name} square` : b.kind === "library" ? `${town.name} athenaeum` : b.kind === "guildhall" ? `Adventurers' Guild` : b.kind === "hall" ? `${town.name} town hall` : b.kind === "warehouse" ? `${genName("person").split(" ")[1]} warehouse` : b.kind === "stables" ? `${town.name} stables` : b.kind === "farm" ? `${genName("person").split(" ")[1]} farm` : b.kind === "tower" ? `the ${["Grey","Leaning","Hollow","Burnt"][Math.floor(rng() * 4)]} Tower` : b.kind === "lighthouse" ? `${town.name} light` : b.kind === "alchemist" ? `${genName("person").split(" ")[1]}'s Remedies` : `${K.label}`;
  const id = slug(`${town.id}-${name}`) + "-" + b.id;
  const loc = { id, name: cap(name), type: LOC_TYPES.includes(K.type) ? K.type : "shop", parent: town.id, x: null, y: null, description: "", discovered: true, hidden: false, visited: false, important: false, hostile: false, connections: [], site: { kind: K.site } };
  c.locations[id] = loc; b.loc = id; b.name = loc.name;
  return loc;
}
function buildingOf(c, loc){ const town = loc?.parent ? c.locations[loc.parent] : null; const t = town?.town; return t ? t.buildings.find(b => b.loc === loc.id) || null : null; }
function sewerOf(c, town){ const id = town?.town?.sewer; return id ? c.locations[id] : null; }
// the party learns where the sewers are (from a grate, a cellar tunnel or a rumor)
function discoverSewer(c, town, notes){
  const s = sewerOf(c, town); if (!s) return null; const was = s.discovered && !s.hidden; s.hidden = false; s.discovered = true;
  if (!was){ notes?.push({ kind: "map", text: `Discovered: ${s.name}` }); c.chronicle.push({ t: Date.now(), day: c.time.day, text: `Found a way into the ${s.name}.` }); }
  return s;
}
</script>
