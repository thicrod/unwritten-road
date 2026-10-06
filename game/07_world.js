<script>
"use strict";
// ======================= WORLD ENGINE =======================
const MAP_W = 36, MAP_H = 26;
const BIOMES = { w:{n:"water", col:"#7fa6b6"}, g:{n:"plains", col:"#bcc882"}, f:{n:"forest", col:"#7f9d58"}, h:{n:"hills", col:"#c3a468"}, m:{n:"mountains", col:"#a1968b"}, s:{n:"swamp", col:"#7c9072"}, a:{n:"sand", col:"#e3c98a"}, t:{n:"tundra", col:"#dfe3e0"} };
const MOVE_COST = { g:1, a:1.4, t:1.6, f:2, h:2.6, s:3.4, m:7, w:16 };
const SETTLEMENTS = ["town","city","village","port","castle","temple","camp","tower"];
const DUNGEON_TYPES = ["dungeon","cave","ruins","castle","tower","temple"];
function mulberry(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s){ let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function valueNoise(rng, gw, gh){ const g = Array.from({length:(gw+2)*(gh+2)}, rng); return (x,y) => { const fx = x*gw, fy = y*gh; const x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = fx-x0, ty = fy-y0; const sx = tx*tx*(3-2*tx), sy = ty*ty*(3-2*ty); const v = (i,j) => g[j*(gw+2)+i]; const a = v(x0,y0)*(1-sx)+v(x0+1,y0)*sx; const b = v(x0,y0+1)*(1-sx)+v(x0+1,y0+1)*sx; return a*(1-sy)+b*sy; }; }
function genTerrain(seed, setting=""){
  const rng = mulberry(seed); const e1 = valueNoise(rng,4,3), e2 = valueNoise(rng,9,7), m1 = valueNoise(rng,5,4), m2 = valueNoise(rng,11,8);
  const isles = /isle|coast|sea|island/i.test(setting), desert = /desert|sand/i.test(setting), north = /north|isles|frost|snow/i.test(setting);
  const t = [];
  for (let y=0;y<MAP_H;y++) for (let x=0;x<MAP_W;x++){
    const nx = x/(MAP_W-1), ny = y/(MAP_H-1);
    let e = e1(nx,ny)*0.65 + e2(nx,ny)*0.35; const edge = Math.min(nx, 1-nx, ny, 1-ny);
    if (isles) e -= Math.max(0, 0.22 - edge) * 1.8; else e -= Math.max(0, 0.05 - edge) * 2.5;
    const m = m1(nx,ny)*0.6 + m2(nx,ny)*0.4;
    let b;
    if (e < (isles ? 0.36 : 0.27)) b = "w"; else if (e > 0.72) b = "m"; else if (e > 0.62) b = "h";
    else if (m > 0.6) b = e < 0.4 ? "s" : "f"; else if (desert && m < 0.45) b = "a"; else if (m > 0.52) b = "f"; else b = "g";
    if (north && ny < 0.3 && b !== "w" && b !== "m") b = m > 0.56 ? "f" : "t";
    t.push(b);
  }
  return t.join("");
}
function tileAt(map, x, y){ return map.tiles[clamp(y,0,map.h-1)*map.w + clamp(x,0,map.w-1)]; }
function topLevelLocs(c){ return Object.values(c.locations).filter(l => !l.parent); }
const XP_PACE = 1.5;
function isDelvable(l){ return !!l && (!!l.fallen || ["dungeon","cave","ruins"].includes(l.type) || (["castle","tower","temple"].includes(l.type) && !!(l.villain || l.hostile || l.theme || l.important))); }
function isDangerPlace(l){ return !!l && (isDelvable(l) || ["forest","swamp","mountain"].includes(l.type)); }
function assignLevels(c){
  const locs = topLevelLocs(c).filter(l => l.gx != null); const start = topLoc(c, c.currentLocationId) || locs.find(l => isSettlement(l)) || locs[0]; if (!start) return;
  for (const l of locs){ const dd = Math.hypot(l.gx - start.gx, l.gy - start.gy);
    if (!l.lvl) l.lvl = isDangerPlace(l) ? clamp(1 + Math.floor(dd / 6.5), 1, 6) : 1;
    if (l.villain) l.lvl = Math.max(l.lvl, 5); else if (l.important && isDangerPlace(l)) l.lvl = Math.max(l.lvl, 3); }
}
function placeLevel(c, l){ return Math.max(partyLevel(c), l?.lvl || 1); }
function levelWarning(c, l){ if (!l?.lvl || !isDangerPlace(l)) return ""; const pl = partyLevel(c); return l.lvl >= pl + 3 ? "deadly" : l.lvl >= pl + 2 ? "hard" : l.lvl > pl ? "tough" : ""; }
function ensureWorldMap(c){
  if (!c.world) c.world = { name: "The Realm", region: "", overview: "" };
  if (!c.world.map){ const seed = hashStr(c.id + (c.world.name||"")); c.world.map = { seed, w: MAP_W, h: MAP_H, tiles: genTerrain(seed, c.premise?.setting || ""), roads: [] }; }
  let added = false;
  for (const l of topLevelLocs(c)) if (l.gx == null){ placeLocation(c, l); added = true; }
  for (const l of Object.values(c.locations)) if (l.parent && !c.locations[l.parent]) l.parent = null;
  if (added || !c.world.map.roads?.length) buildRoads(c);
  assignLevels(c);
}
function placeLocation(c, loc){
  const map = c.world.map; const rng = mulberry(hashStr(loc.id));
  const tx = Math.round(clamp(num(loc.x, 50),0,100)/100*(map.w-1)), ty = Math.round(clamp(num(loc.y, 50),0,100)/100*(map.h-1));
  const occupied = topLevelLocs(c).filter(o => o.gx != null && o.id !== loc.id);
  let best = null, bd = 1e9;
  for (let r=0; r<14 && !best; r++) for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++){
    if (Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue;
    const x = tx+dx, y = ty+dy; if (x<2||y<2||x>map.w-3||y>map.h-3) continue;
    if (occupied.some(o => Math.hypot(o.gx-x, o.gy-y) < 3.3)) continue;
    const b = tileAt(map,x,y); if (b === "w" && loc.type !== "lake") continue;
    const dd = dx*dx+dy*dy; if (dd < bd){ bd = dd; best = [x,y]; }
  }
  if (!best) best = [clamp(tx,2,map.w-3), clamp(ty,2,map.h-3)];
  loc.gx = best[0]; loc.gy = best[1]; loc.x = loc.gx/(map.w-1)*100; loc.y = loc.gy/(map.h-1)*100;
  const arr = map.tiles.split(""); const set = (x,y,b,force) => { if (x<1||y<1||x>=map.w-1||y>=map.h-1) return; const i = y*map.w+x; if (!force && arr[i] === "w") return; arr[i] = b; };
  const R = (r, fn) => { for (let dy=-r;dy<=r;dy++) for (let dx=-r;dx<=r;dx++) if (dx*dx+dy*dy <= r*r + (rng() < 0.45 ? 1 : 0)) fn(loc.gx+dx, loc.gy+dy, dx, dy); };
  const x = loc.gx, y = loc.gy;
  switch (loc.type){
    case "forest": R(2,(a,b)=>set(a,b,"f")); break;
    case "mountain": R(2,(a,b,dx,dy)=>set(a,b, dx*dx+dy*dy<=2 ? "m" : "h")); break;
    case "swamp": R(2,(a,b)=>set(a,b,"s")); break;
    case "lake": R(1,(a,b)=>set(a,b,"w",true)); break;
    case "port": set(x,y,"g",true); if (![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => arr[(y+dy)*map.w+(x+dx)] === "w")) R(1,(a,b,dx,dy)=> dx>0 && set(a,b,"w",true)); break;
    case "cave": case "dungeon": R(1,(a,b,dx,dy)=> (dx||dy) && rng()<0.7 && set(a,b,"h")); set(x,y,"h",true); break;
    case "castle": case "tower": set(x,y, arr[y*map.w+x] === "m" ? "h" : (arr[y*map.w+x] === "w" ? "g" : arr[y*map.w+x]), true); break;
    default: if (["w","m","s"].includes(arr[y*map.w+x])) set(x,y,"g",true);
  }
  map.tiles = arr.join("");
  loc.biome = loc.type === "lake" ? "w" : tileAt(map, x, y);
}
// ---- pathfinding ----
function astar(map, a, b, roadSet){
  const W = map.w, H = map.h, N = W*H; const idx = (x,y) => y*W+x;
  const g = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const start = idx(a[0],a[1]), goal = idx(b[0],b[1]); g[start] = 0; const open = [start];
  const h = i => { const x = i % W, y = (i / W) | 0; return Math.hypot(x-b[0], y-b[1]); };
  while (open.length){
    let bi = 0; for (let k=1;k<open.length;k++) if (g[open[k]] + h(open[k]) < g[open[bi]] + h(open[bi])) bi = k;
    const cur = open.splice(bi,1)[0]; if (cur === goal) break; if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx = cx+dx, ny = cy+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue; const ni = idx(nx,ny); if (closed[ni]) continue;
      let cost = MOVE_COST[map.tiles[ni]] || 2; if (roadSet?.has(ni)) cost = 0.6; if (dx && dy) cost *= 1.42;
      if (g[cur] + cost < g[ni]){ g[ni] = g[cur] + cost; came[ni] = cur; open.push(ni); }
    }
  }
  const path = []; let cur = goal; let guard = 0; while (cur !== -1 && guard++ < N){ path.unshift([cur % W, (cur / W) | 0]); if (cur === start) break; cur = came[cur]; }
  return { path, cost: g[goal] };
}
function buildRoads(c){
  const map = c.world.map; const locs = topLevelLocs(c).filter(l => l.gx != null); if (locs.length < 2){ map.roads = []; return; }
  const settle = locs.filter(l => SETTLEMENTS.includes(l.type)); const edges = []; const key = (a,b) => [a.id,b.id].sort().join("|"); const have = new Set();
  const add = (a, b, kind) => { if (a.id === b.id || have.has(key(a,b))) return; have.add(key(a,b)); edges.push([a,b,kind]); };
  const dist = (a,b) => Math.hypot(a.gx-b.gx, a.gy-b.gy);
  if (settle.length){ const inT = [settle[0]]; const rest = settle.slice(1);
    while (rest.length){ let best = null; for (const a of inT) for (const b of rest){ const dd = dist(a,b); if (!best || dd < best[2]) best = [a,b,dd]; } add(best[0], best[1], "road"); inT.push(best[1]); rest.splice(rest.indexOf(best[1]),1); } }
  for (const l of locs.filter(l => !SETTLEMENTS.includes(l.type))){ const pool = locs.filter(o => o.id !== l.id); const near = pool.sort((a,b) => (dist(l,a) - (SETTLEMENTS.includes(a.type)?1.5:0)) - (dist(l,b) - (SETTLEMENTS.includes(b.type)?1.5:0)))[0]; if (near) add(l, near, "trail"); }
  // make sure every place is reachable: join separate road networks by their closest pair
  const par = {}; const find = x => par[x] === x ? x : (par[x] = find(par[x])); for (const l of locs) par[l.id] = l.id;
  for (const [a,b] of edges) par[find(a.id)] = find(b.id);
  let guard = 0;
  while (new Set(locs.map(l => find(l.id))).size > 1 && guard++ < 40){
    let best = null;
    for (const a of locs) for (const b of locs){ if (find(a.id) === find(b.id)) continue; const dd = dist(a,b) - (SETTLEMENTS.includes(a.type) && SETTLEMENTS.includes(b.type) ? 2 : 0); if (!best || dd < best[2]) best = [a,b,dd]; }
    if (!best) break; add(best[0], best[1], SETTLEMENTS.includes(best[0].type) && SETTLEMENTS.includes(best[1].type) ? "road" : "trail"); par[find(best[0].id)] = find(best[1].id);
  }
  for (const l of locs) for (const o of l.connections||[]){ const b = c.locations[o]; if (b && !b.parent && b.gx != null && dist(l,b) < 16) add(l, b, SETTLEMENTS.includes(l.type) && SETTLEMENTS.includes(b.type) ? "road" : "trail"); }
  const roadSet = new Set();
  edges.sort((a,b) => (a[2] === "road" ? 0 : 1) - (b[2] === "road" ? 0 : 1));
  map.roads = edges.map(([a,b,kind]) => { const r = astar(map, [a.gx,a.gy], [b.gx,b.gy], roadSet); for (const p of r.path) roadSet.add(p[1]*map.w+p[0]); return { a:a.id, b:b.id, path:r.path, kind }; });
  for (const r of map.roads) link(c, r.a, r.b);
}
function routeTo(c, fromId, toId){
  const map = c.world.map; const from = c.locations[fromId], to = c.locations[toId]; if (!from || !to) return null;
  const legCost = r => r.path.reduce((acc,p,i) => acc + (i ? (r.kind === "road" ? 0.5 : 0.8) * (MOVE_COST[tileAt(map,p[0],p[1])] > 3 ? 1.5 : 1) : 0), 0);
  const dist = {[fromId]:0}, prev = {}, done = new Set(); const q = [fromId];
  while (q.length){ q.sort((a,b) => dist[a]-dist[b]); const u = q.shift(); if (done.has(u)) continue; done.add(u); if (u === toId) break;
    for (const r of map.roads.filter(r => r.a === u || r.b === u)){ const v = r.a === u ? r.b : r.a; const nd = dist[u] + legCost(r); if (nd < (dist[v] ?? Infinity)){ dist[v] = nd; prev[v] = {u, r}; q.push(v); } } }
  let legs = [], cells = [], wild = false;
  if (dist[toId] != null){ let v = toId; while (v !== fromId){ const p = prev[v]; legs.unshift(p.r); v = p.u; } for (const r of legs) cells.push(...r.path); }
  else { wild = true; cells = astar(map, [from.gx,from.gy], [to.gx,to.gy]).path; }
  const biomes = {}; for (const [x,y] of cells) { const b = tileAt(map,x,y); biomes[b] = (biomes[b]||0) + 1; }
  const miles = Math.max(6, (cells.length - 1) * 6); const speed = wild ? 16 : legs.every(r => r.kind === "road") ? 26 : 20;
  const days = Math.max(0.25, Math.round(miles / speed * 4) / 4);
  const main = Object.entries(biomes).filter(([b]) => b !== "w").sort((a,b) => b[1]-a[1])[0]?.[0] || "g";
  return { from, to, cells, legs, wild, biomes, days, miles, main, onRoad: !wild && legs.every(r => r.kind === "road") };
}
const daysLabel = d => d < 1 ? (d <= 0.25 ? "a few hours" : d <= 0.5 ? "half a day" : "most of a day") : d === 1 ? "one day" : `${Math.round(d*2)/2} days`;
function biomeWords(route){ return Object.entries(route.biomes).filter(([b]) => b !== "w").sort((a,b) => b[1]-a[1]).slice(0,2).map(([b]) => BIOMES[b].n).join(" and "); }
function dangerOf(loc){ return loc.danger ?? (DUNGEON_TYPES.includes(loc.type) && !SETTLEMENTS.includes(loc.type) ? 3 : ["forest","swamp","mountain"].includes(loc.type) ? 2 : ["town","city","village","port"].includes(loc.type) ? 0 : 1); }
function encounterChance(c, route){
  let p = 0.18 + 0.05 * Math.min(4, route.days * 2) + (route.wild ? 0.12 : route.onRoad ? -0.05 : 0.04) + 0.05 * dangerOf(route.to);
  p += 0.04 * ((route.biomes.f||0) + (route.biomes.s||0) + (route.biomes.m||0)*1.5) / Math.max(1, route.cells.length);
  if (partyMembers(c).some(m => m.cls === "Ranger")) p -= 0.07;
  if (c.threat?.roads && !c.villainDefeated) p += 0.1;
  return clamp(p, 0.08, 0.6);
}
let journeyResolve = null;
function playJourney(j){ if (S().settings.diceAnim === "off") return Promise.resolve(); return new Promise(res => { journeyResolve = res; store.set({ journey: {...j, id: uid("j")} }); }); }
function endJourney(){ const r = journeyResolve; journeyResolve = null; store.set({ journey: null }); r?.(); }
function markTrail(c, cells){ const map = c.world.map; const a = (map.seen && map.seen.length === map.w*map.h ? map.seen : "0".repeat(map.w*map.h)).split("");
  for (const [x,y] of cells) for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){ const xx = x+dx, yy = y+dy; if (xx>=0 && yy>=0 && xx<map.w && yy<map.h) a[yy*map.w+xx] = "1"; }
  map.seen = a.join(""); }
function visibility(c){
  const map = c.world.map; const vis = new Uint8Array(map.w * map.h);
  if (map.seen) for (let i=0;i<vis.length;i++) if (map.seen[i] === "1") vis[i] = 2;
  const mark = (x,y,r,v) => { for (let dy=-r;dy<=r;dy++) for (let dx=-r;dx<=r;dx++){ const xx = x+dx, yy = y+dy; if (xx<0||yy<0||xx>=map.w||yy>=map.h) continue; if (dx*dx+dy*dy <= r*r+1){ const i = yy*map.w+xx; if (vis[i] < v) vis[i] = v; } } };
  for (const l of topLevelLocs(c).filter(l => l.gx != null && !l.hidden)){ if (l.visited) mark(l.gx,l.gy,4,2); else if (l.discovered) mark(l.gx,l.gy,2,2); else mark(l.gx,l.gy,1,1); }
  for (const r of map.roads){ const A = c.locations[r.a], Bl = c.locations[r.b]; if (!(A?.visited || Bl?.visited)) continue; for (const [x,y] of r.path) mark(x,y,1,Math.max(1, (A?.visited && Bl?.visited) ? 2 : 1)); }
  return vis;
}

// ---- encounters ----
function partyLevel(c){ const m = partyMembers(c); return Math.max(1, Math.round(m.reduce((a,x)=>a+x.level,0)/m.length)); }
const DIFF_MULT = { story: 0.7, standard: 1.1, deadly: 1.4 };
function encounterBudget(members, diff, minLvl=1){ const i = {easy:0, medium:1, hard:2, deadly:3}[diff] ?? 1; const k = DIFF_MULT[C()?.premise?.difficulty] ?? 1.1; return Math.round(members.reduce((a,m) => a + XP_THRESH[clamp(Math.max(m.level, minLvl),1,10)][i], 0) * k); }
function groupCounts(names){ const out = {}; for (const n of names) out[n] = (out[n]||0) + 1; return Object.entries(out).map(([name,count]) => ({name, count})); }
function buildEncounter(pool, target, maxN=6){
  const xp = n => BESTIARY[n]?.xp || 50; const valid = pool.filter(n => BESTIARY[n]);
  const cheap = valid.slice().sort((a,b) => xp(a)-xp(b))[0] || "Bandit";
  let best = null;
  for (let att=0; att<40; att++){
    const group = []; let sum = 0;
    while (group.length < maxN){
      const opts = valid.filter(n => (sum + xp(n)) * ENC_MULT(group.length+1) <= target * 1.1); if (!opts.length) break;
      const n = pick(opts); group.push(n); sum += xp(n);
      if (sum * ENC_MULT(group.length) >= target * 0.85 && rnd(3) === 0) break;
    }
    if (!group.length) continue;
    const score = Math.abs(sum * ENC_MULT(group.length) - target) + (group.length === 1 && target > xp(group[0]) * 2 ? target : 0);
    if (!best || score < best.score) best = {group, score};
  }
  return groupCounts(best ? best.group : [cheap]);
}
function themeForLoc(loc){
  const t = `${loc.name} ${loc.description||""}`.toLowerCase();
  if (loc.theme) return loc.theme;
  if (/crypt|tomb|grave|barrow|ossuary|catacomb|haunt|necro|bone|lich|ghost/.test(t)) return "undead";
  if (/goblin|kobold|warren|hobgoblin/.test(t)) return "goblin";
  if (/bandit|smuggl|thie|outlaw|brigand|hideout/.test(t)) return "bandit";
  if (/cult|sanct|altar|dark temple|shrine of/.test(t)) return "cult";
  if (/spider|wolf|den|lair|nest|web|beast|bear/.test(t)) return "beast";
  if (/fen|bog|marsh|drown|swamp|mire|sunken/.test(t)) return "swamp";
  if (/ogre|orc|giant|gnoll|troll|minotaur/.test(t)) return "giant";
  if (/dragon|wyrm|drake/.test(t)) return "dragon";
  return pick(BIOME_THEMES[loc.biome || "g"] || ["bandit"]);
}
function randomCombat(c, theme, diff="medium"){
  const members = partyMembers(c); const tier = lootTier(partyLevel(c));
  const pool = THEMES[theme]?.pools[Math.min(3, tier)] || THEMES.bandit.pools[0];
  return { enemies: buildEncounter(pool, encounterBudget(members, diff)), theme };
}
function bossEncounter(c, theme, diff="hard", displayName, minLvl=1){
  const members = partyMembers(c); const budget = encounterBudget(members, diff, minLvl); const tier = Math.min(3, lootTier(Math.max(partyLevel(c), minLvl)));
  const bosses = THEMES[theme]?.bosses || THEMES.bandit.bosses; const xp = n => BESTIARY[n]?.xp || 100;
  let boss = bosses.filter(b => xp(b) <= budget * 0.9).sort((a,b) => xp(b)-xp(a))[0] || bosses.slice().sort((a,b) => xp(a)-xp(b))[0];
  if (Math.abs(bosses.indexOf(boss) - tier) > 1) boss = bosses[Math.min(tier, bosses.length-1)];
  const rest = Math.max(0, budget - xp(boss) * 1.5);
  const minions = rest > 40 ? buildEncounter(THEMES[theme].pools[tier], rest, 4) : [];
  return { enemies: [{name: boss, count:1, boss:true, displayName}, ...minions], theme, boss };
}

// ---- checks made by the party (best member or everyone) ----
function bestAt(c, skill){ return partyMembers(c).filter(m => m.hp > 0).sort((a,b) => skillMod(b, skill) - skillMod(a, skill))[0] || c.characters[c.activeCharId]; }
async function partyCheck(skill, dc, o={}){
  const c = C(); const members = partyMembers(c).filter(m => m.hp > 0);
  const isSkill = !!SKILLS[skill]; const modOf = m => (isSkill ? skillMod(m, skill) : o.save ? saveMod(m, skill) : mods(m)[skill] || 0) - (!o.save && hasCond(m, "diseased") ? 2 : 0);
  const label = isSkill ? `${skill} check` : o.save ? `${ABIL_NAME[skill]||skill} save` : `${ABIL_NAME[skill]||skill} check`;
  if (manualDice() && !Coop.remoteCall && !window.Net?.isGuest() && S().settings.diceAnim !== "off") await rollPrompt({ label: o.group ? `Group ${label}${o.dc ? ` (DC ${dc})` : ""}` : `${label}${dc ? ` (DC ${dc})` : ""}`, sides: 20 });
  if (o.group){
    const rolls = members.map(m => { const r = rollD20({lucky: RACES[m.race].lucky}); const tot = r.kept + modOf(m); return {m, nat: r.kept, mod: modOf(m), tot, ok: r.kept === 20 || (r.kept !== 1 && tot >= dc)}; });
    const okN = rolls.filter(r => r.ok).length; const success = okN >= Math.ceil(rolls.length / 2);
    await showRoll({ label: `Group ${label} (${okN}/${rolls.length} succeed)`, dice: rolls.map(r => ({sides:20, values:[r.nat], kept:r.nat})), lines: rolls.map(r => `${firstName(r.m.name)}: ${r.nat} ${fmt(r.mod)} = ${r.tot} ${r.ok ? "✓" : "✗"}`), dc, success, total: okN });
    return { success, text: `Group ${label} DC ${dc}: ${rolls.map(r => `${firstName(r.m.name)} ${r.tot}${r.ok?"✓":"✗"}`).join(", ")} → ${success ? "success" : "failure"}.` };
  }
  const who = o.who || (isSkill ? bestAt(c, skill) : members.sort((a,b) => modOf(b) - modOf(a))[0]);
  const r = rollD20({lucky: RACES[who.race].lucky}); const mod = modOf(who); const tot = r.kept + mod; const success = r.kept === 20 || (r.kept !== 1 && tot >= dc);
  await showRoll({ label: `${who.name}: ${label}`, dice:[{sides:20, values:[r.kept], kept:r.kept}], mod, total: tot, dc, success, crit: r.kept === 20, fumble: r.kept === 1 });
  return { success, who, total: tot, text: `${who.name}'s ${label}: ${r.kept} ${fmt(mod)} = ${tot} vs DC ${dc} → ${success ? "success" : "failure"}${r.kept===20?" (natural 20)":r.kept===1?" (natural 1)":""}.` };
}

// ---- effects shared by events, rooms and services ----
function giveLoot(c, loot, notes, toId){
  const ch = c.characters[toId || c.activeCharId];
  if (loot.gold){ c.characters[c.activeCharId].gold += loot.gold; notes.push({kind:"loot", text:`+${loot.gold} gold`}); }
  for (const spec of loot.items || []){ const it = addItem(ch, makeItem(spec)); notes.push({kind:"loot", text:`Found: ${spec.qty > 1 ? spec.qty + "× " : ""}${it.name}`}); checkRecoverQuests(c, it.name, notes); }
}
function applyEffects(c, eff, notes){
  if (!eff) return null;
  const members = partyMembers(c).filter(m => !m.dead); const main = c.characters[c.activeCharId];
  applyRareEffects(c, eff, notes, members, main);
  if (eff.xp){ const x = eff.xp * Math.max(1, partyLevel(c)); for (const m of members) gainXP(c, m, x, notes, "exploration", m.id !== main.id); }
  if (eff.gold){ const g = typeof eff.gold === "string" ? rollDice(eff.gold).total : eff.gold; const before = main.gold; main.gold = Math.max(0, main.gold + g); const dg = main.gold - before; if (dg) notes.push({kind: dg > 0 ? "loot" : "hurt", text:`${dg > 0 ? "+" : ""}${dg} gold`}); }
  if (eff.days){ advanceTime(c, eff.days); notes.push({kind:"hurt", text:`Lost ${eff.days} day${eff.days > 1 ? "s" : ""}`}); }
  if (eff.revealLair) addClue(c, "a doomsayer's ravings that held some truth", notes);
  if (eff.revealLair && c.villain?.lair){ const lair = c.locations[c.villain.lair]; if (lair){ const was = lair.discovered && !lair.hidden; lair.discovered = true; lair.hidden = false; if (!was) notes.push({kind:"map", text:`Learned of: ${lair.name}`}); c.chronicle.push({t: Date.now(), day: c.time.day, text: `Learned that ${c.villain.name} can be found at ${lair.name}.`}); } }
  if (eff.bounty){ const town = townOf(c); if (town){ const b = genBounties(c, town)[0]; if (b){ b.gold = Math.round(b.gold * 1.3); b.giver = "a noble's messenger"; const q = acceptBounty(c, b, town); notes.push({kind:"quest", text:`New quest: ${q.title}`}); } } }
  if (eff.loot) giveLoot(c, rollLoot(partyLevel(c), eff.loot), notes);
  if (eff.items) giveLoot(c, {gold:0, items: eff.items}, notes);
  const victims = eff.who === "all" ? members : [pick(members)];
  if (eff.damage){ for (const m of victims){ const dmg = rollDice(eff.damage).total * Math.max(1, Math.ceil(partyLevel(c)/3)); damageChar(c, m, dmg, eff.dtype, notes, `${firstName(m.name)}`); } }
  if (eff.cond){ for (const m of victims){ addCond(m, eff.cond, {note: eff.condNote || "", dm:true, preCombat: eff.cond === "blessed"}); } notes.push({kind: condKind(eff.cond) === "good" ? "loot" : "hurt", text:`${eff.who === "all" ? "Party" : firstName(victims[0].name)}: ${eff.cond}`}); }
  if (eff.heal){ for (const m of members){ const b = m.hp; m.hp = Math.min(maxHp(m), m.hp + Math.ceil(maxHp(m)/2)); if (m.hp > b) notes.push({kind:"loot", text:`${firstName(m.name)} +${m.hp-b} HP`}); } }
  if (eff.reveal){ const l = revealNearby(c); if (l) notes.push({kind:"map", text:`Learned of: ${l.name}`}); }
  if (eff.flag){ c.flags = {...(c.flags||{}), [eff.flag]: true}; }
  if (eff.shop){ c.shop = genShop(c, null, "caravan"); }
  if (eff.rep) for (const [k, v] of Object.entries(eff.rep)) addRep(c, k, v, notes);
  if (eff.cqComplete) completeCompanionQuest(c, eff.cqComplete, notes);
  if (eff.enemies) return { enemies: eff.enemies, surprise: eff.surprise || "none" };
  if (eff.combat){ const theme = eff.combat === "biome" ? pick(BIOME_THEMES[c.locations[c.currentLocationId]?.biome || "g"] || ["bandit"]) : eff.combat; return {...randomCombat(c, theme, "medium"), surprise: eff.surprise || (eff.surprised ? "player" : "none")}; }
  return null;
}
function revealNearby(c){
  const here = topLoc(c, c.currentLocationId) || topLevelLocs(c)[0];
  const cands = topLevelLocs(c).filter(l => (l.hidden || !l.discovered) && l.id !== here?.id).sort((a,b) => Math.hypot(a.gx-here.gx,a.gy-here.gy) - Math.hypot(b.gx-here.gx,b.gy-here.gy));
  if (cands.length && rnd(3) > 0){ const l = cands[0]; l.hidden = false; l.discovered = true; return l; }
  return createPlace(c, pick(["ruins","cave","dungeon","tower"]), here, {discovered:true});
}
function createPlace(c, type, near, extra={}){
  const map = c.world.map; const a = Math.random()*Math.PI*2, r = 5 + Math.random()*5;
  const gxx = clamp(Math.round((near?.gx ?? map.w/2) + Math.cos(a)*r), 2, map.w-3), gyy = clamp(Math.round((near?.gy ?? map.h/2) + Math.sin(a)*r), 2, map.h-3);
  const kind = ["forest","mountain","swamp","lake","hills"].includes(type) ? "wild" : SETTLEMENTS.includes(type) && !["castle","tower","temple"].includes(type) ? "town" : "dungeon";
  const name = kind === "town" ? genName("town") : kind === "wild" ? genName("wild", type === "hills" ? "hills" : type) : genName("dungeon", type);
  const loc = normLoc(c, { id: slug(name) + "-" + uid("").slice(0,3), name, type, x: gxx/(map.w-1)*100, y: gyy/(map.h-1)*100, description: "", discovered: extra.discovered !== false, hidden: !!extra.hidden, hostile: kind === "dungeon", ...extra });
  if (loc){ placeLocation(c, loc); buildRoads(c); }
  return loc;
}

// ---- travel ----
function travelPlan(c, toId){ const from = topLoc(c, c.currentLocationId); if (!from) return null; return routeTo(c, from.id, toId); }
function advanceTime(c, days){
  const phases = ["dawn","morning","midday","afternoon","evening","night"]; const cur = Math.max(0, phases.indexOf(c.time.phase));
  const steps = Math.round(days * 6); const total = cur + steps; c.time.day += Math.floor(total / 6); c.time.phase = phases[total % 6];
  worldTick(c);
}
// pick what (if anything) interrupts a journey
function pickRoadEncounter(c, plan){
  const recent = c.eventsSeen || [];
  const rare = rollRareEncounter(c); if (rare) return { kind: "event", ev: rare };
  const r = Math.random();
  const strangers = partyMembers(c).length < MAX_PARTY ? COMPANIONS.filter(t => !partyMembers(c).some(m => m.companion?.tpl === t.id) && !(c.formerCompanions||[]).some(f => c.characters[f.id]?.companion?.tpl === t.id) && !(c.fallen||[]).some(f => c.characters[f.id]?.companion?.tpl === t.id)) : [];
  if (r < 0.14 && strangers.length) return { kind:"event", ev: strangerEvent(c, pick(strangers)) };
  if (r < 0.60){
    let pool = EVENTS.filter(e => e.biomes.includes(plan.main) && !recent.includes(e.id));
    if (!pool.length) pool = EVENTS.filter(e => !recent.includes(e.id)); if (!pool.length) pool = EVENTS;
    return { kind:"event", ev: pick(pool) };
  }
  return { kind:"ambush" };
}
function strangerEvent(c, tpl){
  const lvl = partyLevel(c);
  return { id:"stranger-" + tpl.id, dynamic:true, title:"A stranger on the road", recruit: tpl.id, recruitLevel: lvl,
    text: `A ${tpl.race.toLowerCase()} ${tpl.cls.toLowerCase()} sits by a small fire at the roadside and raises a hand in greeting. ${tpl.personality} They introduce themselves as ${tpl.name}. "${tpl.voice}"`,
    choices:[
      {label:`Invite ${firstName(tpl.name)} to travel with you`, tags:["mercy"], recruit:true, ok:{text:`${tpl.name} grins, kicks dirt over the fire and falls in beside you.`}},
      {label:"Share the fire and trade news", check:{skill:"Persuasion", dc:11}, tags:["honesty"], ok:{reveal:true, xp:15, text:`${firstName(tpl.name)} shares what they know of the roads ahead.`}, fail:{text:"A pleasant enough evening, but they keep their secrets."}},
      {label:"Keep your distance and move on", tags:["caution"], ok:{text:"You nod and walk on. They watch you go."}}] };
}
async function beginTravel(toId){
  const c0 = C(); if (!c0 || S().busy || c0.combat || c0.pendingRoll) return;
  const to = c0.locations[toId]; const plan = travelPlan(c0, toId); if (!plan || !to) return;
  closeModal(); store.set({tab:"adventure"});
  const startDay = c0.time.day;
  const enc = Math.random() < encounterChance(c0, plan) ? pickRoadEncounter(c0, plan) : null;
  const townEv = !enc && isSettlement(to) && Math.random() < 0.2 ? TOWN_EVENTS.filter(e => !(c0.eventsSeen||[]).includes(e.id)) : null;
  store.camp(c => { advanceTime(c, plan.days); c.explore = null; markTrail(c, enc ? plan.cells.slice(0, Math.ceil(plan.cells.length / 2)) : plan.cells); pushLog(c, {kind:"player", text:`Travel to ${to.name} (${daysLabel(plan.days)} through ${biomeWords(plan)})`}); });
  await playJourney({ cells: plan.cells, days: plan.days, from: plan.from.name, to: to.name, startDay, biomes: biomeWords(plan),
    stopAt: enc ? 0.35 + Math.random() * 0.3 : null, stopLabel: enc ? (enc.kind === "ambush" ? "Movement in the brush…" : "Something on the road…") : null });
  const trip = `The party travels from ${plan.from.name} to ${to.name}: ${daysLabel(plan.days)} ${plan.onRoad ? "along the road" : plan.wild ? "cross-country" : "on trails"} through ${biomeWords(plan)}.`;
  if (enc?.kind === "event"){
    store.camp(c => { c.pendingArrival = toId; c.event = { id: enc.ev.id, data: enc.ev.dynamic ? enc.ev : null, context: trip }; if (enc.ev.rare){ c.lastRareDay = c.time.day; c.raresSeen = [...(c.raresSeen || []), enc.ev.id]; } markTrail(c, plan.cells); });
    openModal({type:"event"}); return;
  }
  if (enc?.kind === "ambush"){
    const theme = pick(BIOME_THEMES[plan.main] || ["bandit"]); const spec = randomCombat(C(), theme, rnd(4) === 0 ? "hard" : "medium");
    const tier = lootTier(partyLevel(C())); const spot = await partyCheck("Perception", 11 + tier * 2);
    const surprise = spot.success ? "enemies" : Math.random() < 0.5 ? "player" : "none";
    const foes = spec.enemies.map(e => `${e.count} ${e.name}${e.count>1?"s":""}`).join(" and ");
    store.camp(c => { c.pendingArrival = toId; markTrail(c, plan.cells); });
    await runDM("event", {text: `${trip} Along the way they are ambushed by ${foes}. ${spot.text} ${surprise === "enemies" ? "The party spots the ambush before it's sprung and gets the first move." : surprise === "player" ? "The ambush catches the party completely off guard." : "The party reacts just in time."} Describe the ambush in 2-4 vivid sentences ending as steel is drawn, with a quick reaction from a companion. Do NOT set "combat" or "location"; the game starts the fight.`,
      offline: `${surprise === "enemies" ? "You spot them first: " : surprise === "player" ? "Ambush! " : "Look out! "}${foes} burst from cover.`});
    startCombat({...spec, surprise, terrain: `${BIOMES[plan.main].n} on the way to ${to.name}`}, {origin:{kind:"travel", to: toId}});
    return;
  }
  const notes = [];
  store.camp(c => { const l = c.locations[toId]; moveTo(c, l); onArrive(c, l, notes); if (notes.length) pushLog(c, {kind:"sys", notes}); });
  await runDM("event", {text: `${trip} The journey is uneventful. In one short paragraph describe the journey (weather, landscape, a small moment between companions), then describe arriving at ${to.name} and what the party sees.${lairHint(C())} The party is now at ${to.name}.`,
    offline: `After ${daysLabel(plan.days)} on the road, you arrive at ${to.name}. ${to.description || ""}`});
  if (startPendingLair()) return;
  if (isSettlement(to) && !to.fallen && standing(C(), to) <= -50){ const ev = guardEvent(to); store.camp(c => { c.event = { id: ev.id, data: ev, context: `Arriving at ${to.name}.` }; }); openModal({type:"event"}); return; }
  if (townEv?.length && !to.fallen){ const ev = pick(townEv); store.camp(c => { c.event = { id: ev.id, data: ev, context: `Just after arriving in ${to.name}.` }; }); openModal({type:"event"}); }
}
function currentEvent(c){ return c?.event ? (c.event.data || EVENTS.find(e => e.id === c.event.id) || TOWN_EVENTS.find(e => e.id === c.event.id)) : null; }
function lairHint(c){ return c.pendingLair ? ` Something dangerous lairs here: ${c.pendingLair.text} End on the moment it appears; do NOT set "combat", the game starts it.` : ""; }
function startPendingLair(){
  const c = C(); const L = c?.pendingLair; if (!L || c.combat) return false;
  const top = topLoc(c, c.currentLocationId) || c.locations[c.currentLocationId];
  store.camp(c => { c.pendingLair = null; });
  startCombat({enemies: L.enemies, terrain: top?.name || "the wilds"}, {origin:{kind:"lair", loc: top?.id, quests: L.quests || [L.quest]}});
  return true;
}
function onArrive(c, loc, notes){
  loc.visited = true; loc.discovered = true; loc.hidden = false;
  if (isSettlement(loc)) { try { ensureTown(c, loc); } catch (e) { console.warn("town", e); } }
  for (const q of Object.values(c.quests).filter(q => q.status === "active" && q.auto)){
    const a = q.auto;
    if (a.kind === "deliver" && a.loc === loc.id){ const main = c.characters[c.activeCharId]; removeItemByName(main, a.item); completeQuest(c, q, notes); }
    if (a.kind === "scout" && a.loc === loc.id) completeQuest(c, q, notes);
    if ((a.kind === "clear" || a.kind === "recover") && a.loc === loc.id && !isDelvable(loc)){
      if (c.pendingLair) { c.pendingLair.quests = [...(c.pendingLair.quests||[]), q.id]; continue; }
      const t = themeForLoc(loc); const enc = bossEncounter(c, t, "hard", undefined, loc.lvl || 1);
      c.pendingLair = {enemies: enc.enemies, quests: [q.id], text: a.kind === "recover" ? `the ${a.item} is guarded by a ${enc.boss} and its ${THEMES[t].label}.` : `a ${enc.boss} leads the ${THEMES[t].label} that the bounty spoke of.`}; }
  }
}
async function resolveEvent(idx){
  const c0 = C(); const ev = currentEvent(c0); if (!ev) { closeModal(); store.camp(c => { c.event = null; }); return; }
  const ch = ev.choices[idx]; const main = PC();
  if (ch.cost?.gold && main.gold < ch.cost.gold){ toast("Not enough gold for that.", "bad"); return; }
  closeModal();
  let success = true, rollText = "";
  if (ch.check){ const r = await partyCheck(ch.check.skill, ch.check.dc, {group: ch.check.group, save: ch.check.save}); success = r.success; rollText = r.text; }
  const eff = success ? ch.ok : (ch.fail || ch.ok); let combat = null; const notes = [];
  store.camp(c => {
    if (ch.cost?.gold) c.characters[c.activeCharId].gold -= ch.cost.gold;
    applyApproval(c, ch.tags || [], notes);
    combat = applyEffects(c, eff, notes);
    if (ch.recruit && ev.recruit && partyMembers(c).length < MAX_PARTY){ const tpl = COMPANIONS.find(t => t.id === ev.recruit); if (tpl){ const nc = buildCompanion(tpl, ev.recruitLevel || partyLevel(c)); addToParty(c, nc, "met on the road"); notes.push({kind:"npc", text:`${nc.name} joins the party!`}); } }
    c.eventsSeen = [...(c.eventsSeen||[]), ev.id].slice(-8);
    pushLog(c, {kind:"player", text: `${ev.title}: ${ch.label}`});
    if (notes.length) pushLog(c, {kind:"sys", notes});
    c.event = null;
  });
  const context = c0.event?.context || "";
  const base = `${context} EXPLORATION EVENT "${ev.title}": ${ev.text} The party chose: "${ch.label}". ${rollText} Outcome: ${eff.text} Mechanical results already applied by the game: ${notes.map(n=>n.text).join("; ") || "none"}.`;
  if (combat){
    await runDM("event", {text: `${base} Describe the moment the fight breaks out in 2-3 sentences. Do NOT set "combat"; the game starts it.`});
    const arr = C().pendingArrival; startCombat({...combat, terrain: ev.title.toLowerCase()}, {origin: {kind:"travel", to: arr}}); return;
  }
  const arr = C().pendingArrival; let arrivalText = "";
  if (arr){ const n2 = []; store.camp(c => { const l = c.locations[arr]; moveTo(c, l); onArrive(c, l, n2); c.pendingArrival = null; if (n2.length) pushLog(c, {kind:"sys", notes:n2}); }); arrivalText = ` Afterwards the party continues and arrives at ${C().locations[arr].name}; describe the arrival.${lairHint(C())}`; }
  await runDM("event", {text: `${base} Narrate this vividly but briefly, including a reaction from a companion whose values it touches.${arrivalText}`});
  if (startPendingLair()) return;
  if (eff.shop && C().shop) openModal({type:"shop"});
}

// ---- dungeons & other explorable places: see 28_sites.js (generation) and 29_sites_play.js (play) ----
const MYSTERIES = ["an altar with a riddle carved into its base","a flooded pool with something glinting at the bottom","a wall of faded murals telling this place's history","an iron door with three rotating stone dials","a collapsed library with a few intact books","a statue whose outstretched hand is empty","a circle of runes that hums when approached","a chained chest that whispers"];
const TRAPS = [{k:"pit", n:"a hidden pit", save:"DEX", t:"bludgeoning"},{k:"darts", n:"poison darts", save:"DEX", t:"poison"},{k:"gas", n:"a cloud of choking gas", save:"CON", t:"poison", all:true},{k:"blade", n:"a scything blade", save:"DEX", t:"slashing"},{k:"runes", n:"exploding glyphs", save:"DEX", t:"fire", all:true},{k:"ceiling", n:"a collapsing ceiling", save:"DEX", t:"bludgeoning", all:true}];
function roomOf(c, id){ const d = dungeonOf(c); return d?.rooms.find(r => r.id === (id || d.current)); }
function dungeonOf(c){ return c?.explore ? c.locations[c.explore.loc]?.dungeon : null; }
function roomLinks(r){ return [...r.links, ...r.hiddenLinks.filter(id => (r.found||[]).includes(id))]; }
function roomBlocked(r){ return ["combat","boss"].includes(r.type) && r.state !== "cleared"; }
// survivors of a lost or abandoned room fight stay in the room
function onCombatLost(c, cm){
  const o = cm.origin || {}; if (o.kind !== "room" || o.wandering) return;
  const r = c.locations[o.loc]?.dungeon?.rooms.find(x => x.id === o.room); if (!r) return;
  const alive = enemies(c).filter(e => !e.dead && e.hp > 0);
  if (!alive.length){ r.state = "cleared"; return; }
  const out = {}; for (const e of alive){ const k = e.base || e.name.replace(/ \d+$/,""); out[k] = out[k] || {name: k, count: 0, boss: e.boss, displayName: e.boss ? e.name : undefined}; out[k].count++; }
  r.enemies = Object.values(out);
  if (!alive.some(e => e.boss)) r.bossName = r.bossName;
}
// called by the combat engine when a fight is won
function onCombatWon(c, cm){
  const o = cm.origin || {}; const notes = [];
  if (o.kind === "room"){
    const loc = c.locations[o.loc]; const d = loc?.dungeon; const r = d?.rooms.find(x => x.id === o.room);
    if (r && !o.wandering){ r.state = "cleared";
      if (r.loot){ giveLoot(c, r.loot, notes); r.loot = null; }
      else if (rnd(3) === 0) giveLoot(c, rollLoot(partyLevel(c), "minor"), notes);
      if (o.boss){ d.cleared = true; loc.cleared = true; c.flags = {...(c.flags||{}), [loc.id + "_cleared"]: true};
        c.chronicle.push({t: Date.now(), day: c.time.day, text: `The party defeated ${r.bossName} and conquered ${loc.name}.`});
        notes.push({kind:"quest", text:`${loc.name} conquered!`});
        for (const q of Object.values(c.quests).filter(q => q.status === "active" && q.auto?.kind === "clear" && q.auto.loc === loc.id)) completeQuest(c, q, notes);
        if (loc.villain){ notes.push({kind:"quest", text:`The villain ${loc.villain.name} is defeated!`}); c.villainDefeated = true; c.showEnding = true;
          if (c.story){ storyObjectives(c); const mq = c.quests[c.story.questId]; if (mq && mq.status === "active"){ mq.status = "completed"; mq.objectives = (mq.objectives || []).map(o => ({...o, done: true})); } } }
        if (loc.cquest){ companionDilemma(c, loc.cquest); const cq = c.quests["cq-" + loc.cquest]; if (cq) cq.objectives = cq.objectives.map(o => ({...o, done: true})); }
        if (loc.actBoss && c.story?.act === 2) advanceAct(c, notes);
        else if (loc.lieutenant) addClue(c, `orders carried by ${loc.lieutenant}`, notes);
        else if (!loc.villain && !loc.cquest && !loc.fallen) addClue(c, `papers found on ${r.bossName || "the boss"} in ${loc.name}`, notes);
        if (loc.lieutenant){ threatSetback(c, notes, 5, `${loc.lieutenant} defeated`); const near = topLevelLocs(c).filter(l => isSettlement(l) && !l.fallen).sort((a,b) => Math.hypot(a.gx-loc.gx,a.gy-loc.gy) - Math.hypot(b.gx-loc.gx,b.gy-loc.gy))[0]; if (near) addRep(c, near.name, 15, notes); loc.lieutenant = null; }
        if (loc.fallen) liberate(c, loc, notes);
      }
    }
  } else if (o.kind === "lair"){
    for (const id of (o.quests || [o.quest])){ const q = c.quests[id]; if (q && q.status === "active") completeQuest(c, q, notes); }
    giveLoot(c, rollLoot(partyLevel(c), "chest"), notes);
  } else if (rnd(2) === 0) giveLoot(c, rollLoot(partyLevel(c), "minor"), notes);
  if (notes.length) pushLog(c, {kind:"sys", notes});
}

// ---- quests from the notice board ----
function genBounties(c, town){
  const here = town; const level = partyLevel(c);
  const targets = topLevelLocs(c).filter(l => l.id !== here.id && !l.cleared && !l.villain && isDangerPlace(l) && (l.lvl || 1) <= level + 1)
    .sort((a,b) => Math.hypot(a.gx-here.gx,a.gy-here.gy) - Math.hypot(b.gx-here.gx,b.gy-here.gy));
  const towns = topLevelLocs(c).filter(l => l.id !== here.id && ["town","city","village","port"].includes(l.type));
  const out = []; const used = new Set();
  for (let i=0; i<3; i++){
    let tpl = pick(BOUNTIES); if (tpl.kind === "deliver" && !towns.length) tpl = BOUNTIES[0];
    let place = targets.find(t => !used.has(t.id));
    if (!place && tpl.kind !== "deliver"){ place = createPlace(c, pick(["cave","ruins","dungeon"]), here, {discovered:false}); }
    if (tpl.kind !== "deliver" && place) used.add(place.id);
    const town2 = pick(towns);
    const relic = pick(RELICS);
    const fill = s => s.replace("{place}", place?.name || "the wilds").replace("{town}", town2?.name || "the next town").replace("{relic}", relic);
    const gold = Math.round((40 + 30 * level) * tpl.mult / 5) * 5; const xp = Math.round((60 * level) * tpl.mult);
    out.push({ id: uid("b"), kind: tpl.kind, title: fill(tpl.title), text: fill(tpl.text), loc: tpl.kind === "deliver" ? town2?.id : place?.id, relic: tpl.kind === "recover" ? relic : null, gold, xp, giver: `${here.name} notice board`, town: here.name });
  }
  if (standing(c, here) >= 20 && out.length){ const b = {...out[0], id: uid("b"), title: `Council contract: ${out[0].title}`, gold: Math.round(out[0].gold * 1.6), xp: Math.round(out[0].xp * 1.3), giver: `the ${here.name} council` }; out.unshift(b); }
  return out;
}
function acceptBounty(c, b, town){
  const q = { id: slug(b.title) + "-" + uid("").slice(0,3), title: b.title, kind: "side", status: "active", giver: b.giver, summary: b.text, reward: `${b.gold} gold, ${b.xp} XP`, objectives: [], createdAt: Date.now(),
    auto: { kind: b.kind, loc: b.loc, gold: b.gold, xp: b.xp, town: b.town || town?.name, item: b.kind === "deliver" ? (/medicine/i.test(b.title) ? "Crate of Remedies" : "Sealed Letter") : b.relic } };
  const target = c.locations[b.loc];
  if (target){ target.discovered = true; target.hidden = false; }
  if (b.kind === "clear") q.objectives.push({id:"clear", text:`Defeat whatever lurks at ${target?.name}`, done:false});
  if (b.kind === "recover"){ q.objectives.push({id:"find", text:`Find the ${b.relic} in ${target?.name}`, done:false}); if (target){ target.questItem = b.relic; const d = target.dungeon; if (d){ const r = d.rooms.find(x => x.id === d.bossRoom && x.state !== "cleared") || d.rooms.find(x => x.state !== "cleared"); if (r){ r.loot = r.loot || {gold:0, items:[]}; r.loot.items.push({name: b.relic, type:"quest", quest:true}); } } } }
  if (b.kind === "deliver"){ const it = q.auto.item; q.objectives.push({id:"deliver", text:`Deliver the ${it.toLowerCase()} to ${target?.name}`, done:false}); addItem(c.characters[c.activeCharId], makeItem({name: it, type:"quest", quest:true, description:`To be delivered to ${target?.name}.`})); }
  if (b.kind === "scout") q.objectives.push({id:"scout", text:`Travel to ${target?.name} and see what's there`, done:false});
  c.quests[q.id] = q; town.bounties = (town.bounties||[]).filter(x => x.id !== b.id);
  return q;
}
function completeQuest(c, q, notes){
  q.status = "completed"; q.objectives = (q.objectives||[]).map(o => ({...o, done: true}));
  const a = q.auto || {}; const main = c.characters[c.activeCharId];
  if (a.gold){ main.gold += a.gold; }
  if (a.town) addRep(c, a.town, 10, notes);
  if (q.auto && q.kind !== "main" && !q.personal) addClue(c, `word from ${q.giver || "a grateful client"} after "${q.title}"`, notes);
  notes?.push({kind:"quest", text:`Quest completed: ${q.title}${a.gold ? ` (+${a.gold} gold)` : ""}`});
  if (a.xp) for (const m of partyMembers(c)) gainXP(c, m, a.xp, notes, q.title, m.id !== main.id);
  c.chronicle.push({t: Date.now(), day: c.time.day, text: `Completed: ${q.title}.`});
}
function checkRecoverQuests(c, itemName, notes){
  for (const q of Object.values(c.quests).filter(q => q.status === "active" && q.auto?.kind === "recover" && q.auto.item === itemName)) completeQuest(c, q, notes);
}

// ---- towns & services ----
function isSettlement(loc){ return loc && ["town","city","village","port","camp"].includes(loc.type); }
function servicesOf(loc){ if (!loc || loc.fallen) return []; return loc.services || SERVICES[loc.type] || []; }
function townOf(c){ const l = c.locations[c.currentLocationId]; if (!l) return null; if (isSettlement(l)) return l; const p = l.parent ? c.locations[l.parent] : null; if (p && isSettlement(p)) return p; const top = topLoc(c, l.id); return isSettlement(top) ? top : null; }
const SHOP_BASE = {
  market:["Potion of Healing","Potion of Healing","Potion of Healing","Antitoxin","Healer's Kit","Rations","Rope (50 ft)","Torch","Thieves' Tools","Component Pouch","Holy Symbol","Arcane Focus","Scroll of Cure Wounds","Scroll of Magic Missile"],
  smith:["Longsword","Shortsword","Rapier","Greataxe","Greatsword","Warhammer","Mace","Handaxe","Dagger","Spear","Longbow","Shortbow","Light Crossbow","Leather Armor","Studded Leather","Chain Shirt","Scale Mail","Breastplate","Chain Mail","Splint Armor","Shield"],
  caravan:["Potion of Healing","Potion of Healing","Antitoxin","Rations","Scroll of Shield of Faith","Chain Shirt","Longbow","Studded Leather"]
};
function priceOf(it){ const base = it.value || 10; const r = {common:1, uncommon:1.2, rare:1.2, veryrare:1.2, legendary:1.5}[it.rarity] || 1; return Math.max(1, Math.round(base * r)); }
function genShop(c, loc, kind){
  const tier = lootTier(partyLevel(c)); const big = loc?.type === "city";
  const cached = loc?.shops?.[kind]; if (cached && c.time.day - cached.day < 5) return {...cached, name: cached.name};
  let names = [...(SHOP_BASE[kind === "guild" ? "market" : kind] || SHOP_BASE.market)];
  const items = names.map(n => makeItem(n));
  if (kind === "market" && tier >= 1) items.push(makeItem({name:"Potion of Greater Healing", type:"potion"}), makeItem({name:"Scroll of Misty Step", type:"scroll", spell:"Misty Step"}));
  if (kind === "smith" && (tier >= 1 || big)){ for (let i=0;i<(big?3:1);i++){ const w = pick(LOOT_WEAPONS); items.push(makeItem({name:`${w} +1`, type:"weapon", base:w, bonus:1, rarity:"uncommon", value:500})); } if (tier >= 2) items.push(makeItem({name:"Shield +1", type:"shield", bonus:1, rarity:"uncommon", value:500})); }
  if (kind === "guild" || (kind === "market" && big)){ for (const [, s] of MAGIC_ITEMS.filter(([m,s]) => m <= tier + 1 && !["potion"].includes(s.type)).sort(() => Math.random() - .5).slice(0, 4)) items.push(makeItem({...s})); }
  const keeper = genName("person");
  const shop = { day: c.time.day, name: kind === "smith" ? `${keeper.split(" ")[1]}'s Forge` : kind === "caravan" ? "Travelling merchant" : kind === "guild" ? "Guild quartermaster" : `${loc?.name || ""} Market`, keeper, items: items.map(it => ({...it, price: priceOf(it)})) };
  if (loc){ loc.shops = {...(loc.shops||{}), [kind]: shop}; }
  return shop;
}
function recruitPool(c, town){
  const inParty = new Set(partyMembers(c).map(m => m.companion?.tpl).filter(Boolean));
  const gone = new Set((c.formerCompanions||[]).map(f => c.characters[f.id]?.companion?.tpl));
  const rng = mulberry(hashStr(town.id + Math.floor(c.time.day / 4)));
  const avail = COMPANIONS.filter(t => !inParty.has(t.id) && !gone.has(t.id) && !(c.fallen||[]).some(f => c.characters[f.id]?.companion?.tpl === t.id)).sort(() => rng() - 0.5);
  const lvl = c.characters[c.activeCharId].level;
  return avail.slice(0, town.type === "city" ? 4 : 3).map(t => ({ tpl: t, level: Math.max(1, lvl - (rng() < 0.4 ? 1 : 0)), fee: 20 + 15 * lvl }));
}
</script>
