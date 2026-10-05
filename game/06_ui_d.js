<script>
"use strict";
function openShop(townId, kind){ const t = townId && C()?.locations[townId]; if (t && standing(C(), t) <= -50) return coopNotify(`Nobody in ${t.name} will trade with you.`, "bad"); store.camp(c => { c.shop = genShop(c, townId ? c.locations[townId] : null, kind); }); hostUI(() => openModal({type:"shop"})); }
const LOC_COLORS = { town:"#f3e6c4", city:"#f6e3a8", village:"#efe2c2", port:"#d9ecef", castle:"#e2d6c6", tower:"#e5dcf0", temple:"#f2ead0", dungeon:"#e7c7bd", cave:"#dccab4", ruins:"#e3d4c0", forest:"#d6e6c4", mountain:"#e0dad2", swamp:"#d4dcc0", lake:"#cfe3ea", camp:"#efe0c0", road:"#ece2c8" };
function TerrainLayer({ map }){
  return useMemo(() => {
    const cells = []; const glyphs = []; const S = 10;
    for (let y=0;y<map.h;y++) for (let x=0;x<map.w;x++){
      const b = map.tiles[y*map.w+x]; const h = hashStr(`${x},${y},${map.seed}`); const r = (h % 1000) / 1000;
      cells.push(html`<rect key=${"t"+x+"-"+y} x=${x*S-0.3} y=${y*S-0.3} width=${S+0.6} height=${S+0.6} fill=${BIOMES[b].col} opacity=${0.88 + r*0.12}/>`);
      const cx = x*S + 5 + ((h>>4)%5-2), cy = y*S + 5 + ((h>>8)%5-2);
      if (b === "f" && r < 0.8) glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx} ${cy-4} l3 5 h-6 z M${cx} ${cy+1} v2`} fill="#5f7a44" stroke="#3f5530" strokeWidth=".5"/>`);
      else if (b === "m") glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx-5} ${cy+3} L${cx} ${cy-4} L${cx+5} ${cy+3} Z M${cx-1.5} ${cy-2} l1.5 1.5 l1.5 -1.5`} fill="#8c7f70" stroke="#5a4f44" strokeWidth=".6"/>`);
      else if (b === "h" && r < 0.6) glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx-4} ${cy+2} q4 -6 8 0`} fill="none" stroke="#8a7445" strokeWidth=".8"/>`);
      else if (b === "w" && r < 0.35) glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx-3} ${cy} q1.5 -1.5 3 0 t3 0`} fill="none" stroke="#5f8794" strokeWidth=".6"/>`);
      else if (b === "s" && r < 0.6) glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx} ${cy+2} v-4 M${cx+1.5} ${cy+2} v-3 M${cx-1.5} ${cy+2} v-2.5`} stroke="#56613f" strokeWidth=".6"/>`);
      else if (b === "a" && r < 0.4) glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx-4} ${cy+1} q4 -3 8 0`} fill="none" stroke="#b89a5a" strokeWidth=".6"/>`);
      else if (b === "t" && r < 0.3) glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx-2} ${cy} h4 M${cx} ${cy-2} v4`} stroke="#a9b0b0" strokeWidth=".6"/>`);
      else if (b === "g" && r < 0.12) glyphs.push(html`<path key=${"g"+x+"-"+y} d=${`M${cx-1} ${cy} q.5 -1.5 1 0 q.5 -1.5 1 0`} fill="none" stroke="#9c9460" strokeWidth=".5"/>`);
    }
    return html`<g>${cells}</g><g>${glyphs}</g>`;
  }, [map.tiles, map.seed]);
}
function fitView(c, aspect){
  const map = c.world.map; const vis = visibility(c); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i=0;i<vis.length;i++) if (vis[i]){ const x = i % map.w, y = Math.floor(i / map.w); x0 = Math.min(x0,x); x1 = Math.max(x1,x); y0 = Math.min(y0,y); y1 = Math.max(y1,y); }
  if (x1 < 0){ x0 = 0; y0 = 0; x1 = map.w-1; y1 = map.h-1; }
  let w = Math.max((x1 - x0 + 3) * 10, 150), h = Math.max((y1 - y0 + 3) * 10, 110);
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  w = Math.min(w, map.w * 10 * 1.25);
  return { cx: (x0 + x1 + 1) * 5, cy: (y0 + y1 + 1) * 5, w };
}
function RegionMap({ c, sel, onSel, route, vb, handlers, dragging }){
  const map = c.world.map; const S = 10; const vis = visibility(c);
  const here = topLoc(c, c.currentLocationId);
  const locs = topLevelLocs(c).filter(l => l.gx != null && !l.hidden);
  const questLocs = new Set(Object.values(c.quests).filter(q => q.status === "active").flatMap(q => [q.auto?.loc, ...(q.kind === "main" && c.villain?.lair && c.locations[c.villain.lair]?.discovered ? [c.villain.lair] : [])]).filter(Boolean));
  const seen = (l) => vis[l.gy*map.w + l.gx] > 0;
  const roadVisible = r => { const A = c.locations[r.a], Bl = c.locations[r.b]; return A && Bl && !A.hidden && !Bl.hidden && (A.visited || Bl.visited || (A.discovered && Bl.discovered)); };
  const pathD = pts => pts.map((p,i) => `${i?"L":"M"}${p[0]*S+5} ${p[1]*S+5}`).join(" ");
  return html`<svg viewBox=${vb} className=${"map region" + (dragging ? " dragging" : "")} role="img" aria-label="World map" ...${handlers}>
    <defs><filter id="fogblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>
      <radialGradient id="halo"><stop offset="0" stopColor="#e08a3c" stopOpacity=".6"/><stop offset="1" stopColor="#e08a3c" stopOpacity="0"/></radialGradient>
      <pattern id="fogtex" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="16" height="16" fill="#f1e8d0"/><path d="M0 8 h16" stroke="#dccfae" strokeWidth="1.2"/></pattern></defs>
    <rect x="-600" y="-600" width=${map.w*S+1200} height=${map.h*S+1200} fill="url(#fogtex)"/>
    <${TerrainLayer} map=${map}/>
    <g>${map.roads.filter(roadVisible).map((r,i) => html`<path key=${i} d=${pathD(r.path)} fill="none" stroke=${r.kind === "road" ? "#7a5a2e" : "#8e6d3c"} strokeWidth=${r.kind === "road" ? 1.6 : 1.1} strokeDasharray=${r.kind === "road" ? "" : "2.5 2"} strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>`)}</g>
    ${route && html`<path d=${pathD(route.cells)} fill="none" stroke="#b8621f" strokeWidth="2.2" strokeDasharray="1 3.5" strokeLinecap="round" className="route"/>`}
    <g filter="url(#fogblur)">${Array.from(vis).map((v,i) => v === 2 ? null : html`<rect key=${i} x=${(i % map.w)*S-3} y=${Math.floor(i / map.w)*S-3} width=${S+6} height=${S+6} fill="url(#fogtex)" opacity=${v === 1 ? 0.55 : 1}/>`)}</g>
    ${here && html`<circle cx=${here.gx*S+5} cy=${here.gy*S+5} r="16" fill="url(#halo)" className="halo"/>`}
    <g>${locs.filter(seen).map(l => { const on = sel === l.id; const isHere = here?.id === l.id; const x = l.gx*S+5, y = l.gy*S+5; const known = l.discovered;
      return html`<g key=${l.id} className=${"map-loc" + (known ? "" : " rumor") + (on ? " on" : "")} transform=${`translate(${x} ${y})`} onClick=${()=>onSel(l.id)} role="button" tabIndex="0" onKeyDown=${e=>{ if (e.key==="Enter") onSel(l.id); }} aria-label=${l.name}>
        <circle r=${on ? 7.5 : 6.5} fill=${known ? (LOC_COLORS[l.type] || "#f3e6c4") : "rgba(243,230,196,.7)"} stroke=${l.villain && known ? "#8b1e16" : l.cleared ? "#2f8f78" : "#3d2a14"} strokeWidth=${l.villain && known ? 1.4 : 0.9} strokeDasharray=${known ? "" : "2 1.5"}/>
        ${on && html`<circle r="10" fill="none" stroke="#b8621f" strokeWidth="1.2" strokeDasharray="2 2" className="sel-ring"/>`}
        ${known ? html`<g transform="translate(-4.5 -4.5) scale(.375)" stroke="#2a1f15" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">${(ICONS[l.type]||ICONS.ruins).map((p,i)=>html`<path key=${i} d=${p}/>`)}</g>` : html`<text y="2.6" textAnchor="middle" fontSize="7" fill="#3d2a14" fontFamily="Alegreya, serif">?</text>`}
        ${known && isDangerPlace(l) && levelWarning(c, l) === "deadly" && !l.cleared && html`<g transform="translate(-9 -8)"><circle r="3.4" fill="#7e211b" stroke="#2a1f15" strokeWidth=".5"/><text y="1.8" textAnchor="middle" fontSize="4.6" fill="#fff">☠</text></g>`}
        ${known && (l.fallen || l.lieutenant) && html`<g transform="translate(0 -11)"><path d="M-3 2 q3 -8 6 0 q-3 -3 -6 0" fill="#e0582a" stroke="#7a1f0a" strokeWidth=".5"/></g>`}
        ${questLocs.has(l.id) && html`<g transform="translate(7 -8)"><circle r="3.6" fill="#e6bd55" stroke="#7a5a10" strokeWidth=".6"/><text y="2.2" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#3a2a05">!</text></g>`}
        ${isHere && (() => { const lead = c.characters[c.activeCharId]; return html`<g className="party-token" transform="translate(0 -21)"><path d="M-2.4 6.4 L0 10.4 L2.4 6.4 Z" fill="#b2372d" stroke="#2a1f15" strokeWidth=".5"/><circle r="7.6" fill="#b2372d" stroke="#2a1f15" strokeWidth=".7"/><g transform="translate(-6.6 -6.6)"><${Portrait} ch=${lead} size=${13.2}/></g><circle r="9.5" fill="none" stroke="#b2372d" strokeWidth=".6" className="party-pulse"/></g>`; })()}
        <text y="15" textAnchor="middle" fontSize="6" fill="#2a1f15" stroke="#f3e6c4" strokeWidth="1.8" paintOrder="stroke" fontFamily="Alegreya SC, serif" fontStyle=${known?"normal":"italic"} className="lbl">${l.name}</text>
      </g>`; })}</g>
  </svg>`;
}
const ROOM_ICON = { entrance:"road", combat:"swords", boss:"skull", trap:"bolt", treasure:"gem", mystery:"eye", camp:"camp", shrine:"temple" };
function DungeonMap({ c }){
  const d = dungeonOf(c); const loc = c.locations[c.explore.loc]; const cur = roomOf(c); const busy = !!S().busy || !!c.combat;
  const W = 5, H = 3, CW = 90, CH = 80, RW = 64, RH = 50;
  const pos = r => [r.x*CW + (CW-RW)/2 + 10, r.y*CH + (CH-RH)/2 + 10];
  const shown = r => r.state !== "unseen";
  const reachable = new Set(roomBlocked(cur) ? [] : roomLinks(cur));
  const edges = []; const seenE = new Set();
  for (const r of d.rooms) for (const id of [...r.links, ...(r.found||[]).filter(x => r.hiddenLinks.includes(x))]){ const o = d.rooms.find(x=>x.id===id); const k = [r.id,id].sort().join("|"); if (seenE.has(k) || !o || !shown(r) || !shown(o)) continue; seenE.add(k); const secret = r.hiddenLinks.includes(id); const [ax,ay] = pos(r), [bx,by] = pos(o); edges.push(html`<line key=${k} x1=${ax+RW/2} y1=${ay+RH/2} x2=${bx+RW/2} y2=${by+RH/2} stroke=${secret ? "#8b1e16" : "#6b5436"} strokeWidth=${secret ? 3 : 7} strokeDasharray=${secret ? "4 3" : ""} strokeLinecap="round" opacity=${secret ? .9 : .5}/>`); }
  return html`<svg viewBox=${`0 0 ${W*CW+20} ${H*CH+20}`} className="map dungeon-map" role="img" aria-label=${`Map of ${loc.name}`}>
    <rect x="0" y="0" width=${W*CW+20} height=${H*CH+20} fill="#2c231b"/>
    ${edges}
    ${d.rooms.filter(shown).map(r => { const [x,y] = pos(r); const isCur = r.id === cur.id; const can = reachable.has(r.id); const known = r.state === "visited" || r.state === "cleared";
      return html`<g key=${r.id} className=${"droom" + (isCur ? " cur" : "") + (can ? " can" : "")} transform=${`translate(${x} ${y})`} onClick=${()=> can && !busy ? moveToRoom(r.id) : null} role=${can ? "button" : undefined} tabIndex=${can ? 0 : undefined} onKeyDown=${e=>{ if (e.key==="Enter" && can && !busy) moveToRoom(r.id); }} aria-label=${known ? r.name : "Unexplored room"}>
        <rect width=${RW} height=${RH} rx="6" fill=${known ? (r.type === "boss" ? "#5a2a22" : r.state === "cleared" ? "#3f4a3a" : "#4a3b2c") : "#3a3026"} stroke=${isCur ? "#e6bd55" : can ? "#e08a3c" : "#6b5436"} strokeWidth=${isCur ? 2.5 : can ? 2 : 1.2} strokeDasharray=${known ? "" : "4 3"}/>
        ${known ? html`<g transform=${`translate(${RW/2-9} 8) scale(.75)`} stroke=${r.type === "boss" ? "#ff9a8a" : "#e8d9b8"} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">${(ICONS[ROOM_ICON[r.type]]||ICONS.unknown).map((p,i)=>html`<path key=${i} d=${p}/>`)}</g>` : html`<text x=${RW/2} y="27" textAnchor="middle" fontSize="16" fill="#b39a74" fontFamily="Alegreya, serif">?</text>`}
        <text x=${RW/2} y=${RH-8} textAnchor="middle" fontSize="7.5" fill="#efe0bb" fontFamily="Alegreya SC, serif">${known ? r.name.slice(0,18) : ""}</text>
      </g>`; })}
    ${(() => { const [tx, ty] = pos(cur); return html`<g className="dtoken" style=${{transform:`translate(${tx + RW - 9}px, ${ty + 9}px)`}}><circle r="7" fill="rgba(230,189,85,.25)"/><circle r="4.5" fill="#e6bd55" stroke="#2c231b" strokeWidth="1"/></g>`; })()}
  </svg>`;
}
function MapView(){
  const s = useStore(); const c = s.campaign;
  const [sel, setSelState] = useState(s.mapSel || null); const [mode, setMode] = useState(c.explore ? "dungeon" : "world");
  const frameRef = useRef(null); const [size, setSize] = useState({w: 640, h: 460}); const [zoom, setZoom] = useState(null);
  const drag = useRef(null); const moved = useRef(false); const [dragging, setDragging] = useState(false);
  useEffect(() => { const el = frameRef.current; if (!el || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(([e]) => { const r = e.contentRect; if (r.width > 50 && r.height > 50) setSize({w: r.width, h: r.height}); }); ro.observe(el); return () => ro.disconnect(); }, []);
  useEffect(() => { if (s.mapSel){ setSelState(s.mapSel); const l = c.locations[s.mapSel]; if (l?.gx != null) setZoom(z => ({cx: l.gx*10+5, cy: l.gy*10+5, w: (z?.w) || 220})); store.set({mapSel:null}); } }, [s.mapSel]);
  useEffect(() => { if (c.explore) setMode("dungeon"); else setMode("world"); }, [!!c.explore]);
  if (!c.world?.map) return html`<div className="page"><p className="muted">The map is still being drawn…</p></div>`;
  const setSel = id => { if (moved.current) return; setSelState(id); };
  const aspect = size.w / size.h; const fit = fitView(c, aspect); const v = zoom || fit; const vh = v.w / aspect;
  const vb = `${v.cx - v.w/2} ${v.cy - vh/2} ${v.w} ${vh}`;
  const maxW = c.world.map.w * 10 * 1.3;
  const zoomBy = f => setZoom({...v, w: clamp(v.w * f, 70, maxW)});
  const handlers = {
    onPointerDown: e => { drag.current = {x: e.clientX, y: e.clientY, v}; moved.current = false; },
    onPointerMove: e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!moved.current && Math.abs(dx) + Math.abs(dy) < 5) return; moved.current = true; setDragging(true); const k = d.v.w / size.w; setZoom({cx: d.v.cx - dx*k, cy: d.v.cy - dy*k, w: d.v.w}); },
    onPointerUp: () => { drag.current = null; setDragging(false); setTimeout(() => { moved.current = false; }, 0); },
    onPointerLeave: () => { drag.current = null; setDragging(false); },
    onWheel: e => { zoomBy(e.deltaY > 0 ? 1.15 : 1/1.15); }
  };
  const here = topLoc(c, c.currentLocationId);
  const selLoc = c.locations[sel] && !c.locations[sel].hidden ? c.locations[sel] : here;
  const route = selLoc && here && selLoc.id !== here.id ? travelPlan(c, selLoc.id) : null;
  const busy = !!s.busy || !!c.combat || !!c.pendingRoll;
  const children = selLoc ? Object.values(c.locations).filter(x => x.parent === selLoc.id && !x.hidden) : [];
  const npcsHere = selLoc ? Object.values(c.npcs).filter(n => n.location === selLoc.id || children.some(ch => ch.id === n.location)) : [];
  const quests = selLoc ? Object.values(c.quests).filter(q => q.status === "active" && (q.auto?.loc === selLoc.id || (q.kind === "main" && c.villain?.lair === selLoc.id))) : [];
  const isHere = selLoc && here && selLoc.id === here.id;
  const d = dungeonOf(c); const room = d && roomOf(c);
  return html`<div className="mapwrap">
    <div className=${"map-frame parch" + (mode === "dungeon" && d ? " dark" : "")} ref=${frameRef}>
      ${c.explore && html`<div className="map-toggle"><${Seg} value=${mode} options=${[["dungeon","Dungeon"],["world","World"]]} onChange=${setMode}/></div>`}
      ${mode === "dungeon" && d ? html`<${DungeonMap} c=${c}/>` : html`<${RegionMap} c=${c} sel=${selLoc?.id} onSel=${setSel} route=${route} vb=${vb} handlers=${handlers} dragging=${dragging}/>`}
      ${!(mode === "dungeon" && d) && html`<svg className="compass" viewBox="-50 -50 100 100" aria-hidden="true"><circle r="44" fill="rgba(244,232,205,.55)" stroke="#6a4f2a" strokeWidth="1.5"/><circle r="36" fill="none" stroke="#6a4f2a" strokeWidth=".8" strokeDasharray="2 3"/>
        <path d="M0 -40 L7 0 L0 40 L-7 0 Z" fill="#3a2a1a"/><path d="M0 -40 L7 0 L0 0 Z" fill="#b2372d"/><path d="M-40 0 L0 -6 L40 0 L0 6 Z" fill="#6a4f2a"/><path d="M-26 -26 L3 -3 L26 26 L-3 3 Z" fill="#8a6a3a" opacity=".55"/><path d="M26 -26 L3 3 L-26 26 L-3 -3 Z" fill="#8a6a3a" opacity=".55"/><circle r="4" fill="#f4e8cd" stroke="#3a2a1a"/>
        <text y="-44" textAnchor="middle" fontSize="11" fontWeight="800" fill="#3a2a1a" fontFamily="Georgia, serif" dy="-1">N</text></svg>`}
      ${!(mode === "dungeon" && d) && html`<div className="map-zoom"><button onClick=${()=>zoomBy(1/1.35)} aria-label="Zoom in">+</button><button onClick=${()=>zoomBy(1.35)} aria-label="Zoom out">−</button><button className="fit" onClick=${()=>setZoom(null)} aria-label="Fit explored area">FIT</button></div>
        <div className="map-title"><b>${c.world.name}</b>${c.world.region && html`<span>${c.world.region}</span>`}</div>`}
    </div>
    <aside className="map-side parch">
      ${mode === "dungeon" && d ? html`<div>
        <h2 style=${{margin:0}}>${c.locations[c.explore.loc].name}</h2><div className="faint" style=${{fontSize:13}}>${cap(THEMES[d.theme].label)}${d.cleared ? " · conquered" : ""}</div>
        <h3 className="panel-title" style=${{marginTop:12}}>${room.name}</h3>
        <p className="muted" style=${{marginTop:0}}>${({entrance:"The way in (and out).", combat: room.state==="cleared" ? "The fight here is over." : "Enemies lurk here.", boss: room.state==="cleared" ? "The master of this place has fallen." : "The master of this place waits here.", trap:"A trapped chamber.", treasure:"A treasure chamber.", mystery:`It holds ${room.feature}.`, camp:"A quiet, defensible spot: safe to rest.", shrine:"An old shrine."})[room.type]}</p>
        <div className="col">${roomBlocked(room) && !c.combat && html`<button className="btn danger" disabled=${!!s.busy} onClick=${engageRoom}><${Icon} n="swords" size=${16}/> Fight!</button>`}
          <button className="btn sm" disabled=${busy || room.searched || roomBlocked(room)} onClick=${searchRoom}>${room.searched ? "Already searched" : "Search the room (Investigation)"}</button>
          <button className="btn sm ghost" disabled=${busy || roomBlocked(room)} onClick=${restInDungeon}>Short rest${room.type === "camp" ? " (safe)" : " (risky)"}</button>
          ${!roomBlocked(room) && html`<button className="btn sm ghost" disabled=${busy} onClick=${leaveDungeon}>${room.type === "entrance" ? "Leave the dungeon" : "Retrace your steps and leave"}</button>`}</div>
        <p className="faint" style=${{fontSize:12.5}}>Click a glowing room next to you to move. Searching can reveal secret passages.</p>
        <div className="legend">${Object.entries(ROOM_ICON).map(([k,ic])=>html`<span key=${k}><${Icon} n=${ic} size=${14}/> ${k}</span>`)}</div>
      </div>`
      : selLoc ? html`<div>
        <div className="row" style=${{gap:10}}><div className="loc-ico"><${Icon} n=${selLoc.type}/></div><div className="grow"><h2 style=${{margin:0}}>${selLoc.name}</h2><div className="faint" style=${{fontSize:13}}>${cap(selLoc.type)}${selLoc.biome ? ` in the ${BIOMES[selLoc.biome]?.n}` : ""}${selLoc.discovered ? (selLoc.visited ? " · visited" : "") : " · rumored"}${isHere ? " · you are here" : ""}${selLoc.cleared ? " · conquered" : ""}</div></div></div>
        <p>${selLoc.discovered ? (selLoc.description || "Little is known of this place.") : "You've only heard rumors of this place."}</p>
        ${selLoc.fallen && html`<div className="danger-badge deadly"><${Icon} n="skull" size=${15}/> Occupied by ${c.villain?.name || "the enemy"}. Drive them out to liberate the town.</div>`}
        ${isSettlement(selLoc) && !selLoc.fallen && html`<div className="faint" style=${{fontSize:13, marginBottom:6}}>Your standing: <b>${standingLabel(standing(c, selLoc))}</b> (${standing(c, selLoc)})</div>`}
        ${isDangerPlace(selLoc) && selLoc.lvl && html`<div className=${"danger-badge " + levelWarning(c, selLoc)}><${Icon} n="skull" size=${15}/> Recommended level ${selLoc.lvl}+${levelWarning(c, selLoc) ? ` · ${({tough:"a tough challenge for your party", hard:"very dangerous for your party", deadly:"likely deadly for your party"})[levelWarning(c, selLoc)]}` : selLoc.cleared ? " · conquered" : " · your party is ready"}</div>`}
        ${quests.map(q => html`<div key=${q.id} className="quest-hint"><span className="qmark">!</span> ${q.title}</div>`)}
        ${!isHere && route && html`<div className="route-info"><b>${daysLabel(route.days)}</b> · ${route.miles} miles ${route.onRoad ? "by road" : route.wild ? "cross-country" : "by trail"} · ${biomeWords(route)}</div>`}
        ${(() => { const f = fastTravelInfo(c, selLoc.id); return f ? html`<button className="btn" disabled=${!!s.busy || !!c.combat || !!c.coop?.vote} title="Safe coach travel between towns you've visited: no encounters" onClick=${()=>coopFastTravel(selLoc.id)}>🐎 Fast travel · ${f.days}d${f.cost ? ` · ${f.cost} gp` : ""}</button>` : null; })()}
        ${!isHere && html`<button className="btn primary" disabled=${!!s.busy || !!c.combat || !!c.pendingRoll || !!c.coop?.vote} onClick=${()=>travelTo(selLoc.id)}><${Icon} n="road" size=${18}/> Travel here</button>`}
        ${isHere && isSettlement(selLoc) && html`<div className="col" style=${{marginTop:6}}>${servicesOf(selLoc).map(sv => html`<button key=${sv} className="btn sm ghost" disabled=${busy} onClick=${()=>{ store.set({tab:"adventure"}); ["market","smith"].includes(sv) ? openShop(selLoc.id, sv) : openModal({type:"service", svc: sv, town: selLoc.id}); }}><${Icon} n=${SERVICE_INFO[sv].icon} size=${15}/> ${SERVICE_INFO[sv].label}</button>`)}</div>`}
        ${isHere && isDelvable(selLoc) && html`<button className="btn danger" style=${{marginTop:6}} disabled=${busy} onClick=${()=>enterDungeon(selLoc.id)}><${Icon} n="dungeon" size=${18}/> ${selLoc.dungeon ? "Delve inside" : "Explore inside"}</button>`}
        ${children.length > 0 && html`<h3 className="panel-title" style=${{marginTop:12}}>Places within</h3>${children.map(p=>html`<div key=${p.id} className="res-row"><span><${Icon} n=${p.type} size=${16}/> ${p.name}${c.currentLocationId===p.id?" (here)":""}</span>${c.currentLocationId!==p.id && isHere && html`<button className="btn ghost sm" disabled=${busy} onClick=${()=>{ store.set({tab:"adventure"}); runDM("action",{text:`We head to ${p.name}.`}); }}>Go</button>`}</div>`)}`}
        ${npcsHere.length > 0 && html`<h3 className="panel-title" style=${{marginTop:12}}>People</h3>${npcsHere.map(n=>html`<div key=${n.id} className="res-row"><span>${n.name}</span><span className="faint">${n.role||""}</span></div>`)}`}
      </div>` : html`<p className="muted">Explore to fill in the map.</p>`}
      ${mode === "world" && html`<div><h3 className="panel-title" style=${{marginTop:14}}>Known places</h3>
        <div className="loc-list">${topLevelLocs(c).filter(l => !l.hidden && l.gx != null).map(l=>html`<button key=${l.id} className=${"chip" + (selLoc?.id===l.id?" gold":"")} onClick=${()=>setSel(l.id)}>${l.discovered?"":"? "}${l.name}</button>`)}</div>
        <div className="legend" style=${{marginTop:10}}>${["g","f","h","m","s","w"].map(b=>html`<span key=${b}><i style=${{background: BIOMES[b].col}}></i>${BIOMES[b].n}</span>`)}<span><b style=${{color:"#b8621f"}}>!</b> quest</span></div></div>`}
    </aside>
  </div>`;
}

// ---------- Journey (travel) animation ----------
function JourneyOverlay(){
  const s = useStore(); const j = s.journey; const c = s.campaign;
  const pathRef = useRef(null), tokRef = useRef(null), trailRef = useRef(null); const [phase, setPhase] = useState("go"); const [day, setDay] = useState(0);
  useEffect(() => {
    if (!j) return; setPhase("go"); setDay(0);
    const path = pathRef.current; if (!path){ endJourney(); return; }
    const len = path.getTotalLength() || 1; const stop = j.stopAt ?? 1;
    if (trailRef.current){ trailRef.current.style.strokeDasharray = `${len} ${len}`; trailRef.current.style.strokeDashoffset = String(len); }
    const dur = (S().settings.reduceMotion ? 700 : clamp(1600 + j.days * 600, 2000, 4300)) * Math.max(0.45, stop);
    let raf, lastDay = -1, finished = false, lastStep = 0; const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur); const e = p < .5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2; const at = e * stop;
      const pt = path.getPointAtLength(at * len); tokRef.current?.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      if (trailRef.current) trailRef.current.style.strokeDashoffset = String(len - at * len);
      const dd = Math.floor(at * j.days + 0.001); if (dd !== lastDay){ lastDay = dd; setDay(dd); }
      if (now - lastStep > 330 && p < 1){ lastStep = now; Sfx.play("step", {gap: 100}); }
      if (p < 1){ raf = requestAnimationFrame(step); return; }
      if (finished) return; finished = true;
      if (j.stopAt != null){ setPhase("stop"); Sfx.play("alert"); setTimeout(endJourney, 1500); } else { setPhase("arrive"); setTimeout(endJourney, 650); }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [j?.id]);
  if (!j || !c?.world?.map) return null;
  const map = c.world.map; const xs = j.cells.map(p => p[0]), ys = j.cells.map(p => p[1]);
  let x0 = Math.min(...xs) - 3, y0 = Math.min(...ys) - 3; let w = (Math.max(...xs) - x0 + 4) * 10, h = (Math.max(...ys) - y0 + 4) * 10; x0 *= 10; y0 *= 10;
  const asp = 1.6; if (w < 190){ x0 -= (190 - w) / 2; w = 190; } if (w / h < asp){ const nw = h * asp; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / asp; y0 -= (nh - h) / 2; h = nh; }
  const d = j.cells.map((p,i) => `${i ? "L" : "M"}${p[0]*10+5} ${p[1]*10+5}`).join(" ");
  const [sx, sy] = j.cells[0], [ex, ey] = j.cells[j.cells.length - 1];
  const label = phase === "stop" ? j.stopLabel : phase === "arrive" ? `Arriving at ${j.to}` : `${daysLabel(j.days)} through ${j.biomes}`;
  return html`<div className=${"journey" + (phase === "stop" ? " halted" : "")} onClick=${endJourney} role="dialog" aria-label=${`Travelling to ${j.to}`}>
    <div className="journey-card parch">
      <div className="journey-head"><span className="jh-route"><b>${j.from}</b><${Icon} n="road" size=${16}/><b>${j.to}</b></span><span className="jh-day">Day ${j.startDay + day}</span></div>
      <svg viewBox=${`${x0} ${y0} ${w} ${h}`} className="journey-map">
        <defs><pattern id="jfog" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="16" height="16" fill="#f1e8d0"/><path d="M0 8 h16" stroke="#dccfae" strokeWidth="1.2"/></pattern>
          <radialGradient id="jvig"><stop offset=".55" stopColor="#000" stopOpacity="0"/><stop offset="1" stopColor="#2a1a0a" stopOpacity=".45"/></radialGradient></defs>
        <rect x=${x0-20} y=${y0-20} width=${w+40} height=${h+40} fill="url(#jfog)"/>
        <${TerrainLayer} map=${map}/>
        <path d=${d} fill="none" stroke="#5a3a18" strokeWidth="2.4" strokeDasharray="2 4" strokeLinecap="round" opacity=".45"/>
        <path ref=${trailRef} d=${d} fill="none" stroke="#b8621f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path ref=${pathRef} d=${d} fill="none" stroke="none"/>
        <g transform=${`translate(${sx*10+5} ${sy*10+5})`}><circle r="5" fill="#f3e6c4" stroke="#3d2a14" strokeWidth="1"/><text y="13" textAnchor="middle" fontSize="6.5" fill="#2a1f15" stroke="#f3e6c4" strokeWidth="2" paintOrder="stroke" fontFamily="Alegreya SC, serif">${j.from}</text></g>
        <g transform=${`translate(${ex*10+5} ${ey*10+5})`}><circle r="6" fill="#f3e6c4" stroke="#8b1e16" strokeWidth="1.4"/><circle r="2.2" fill="#8b1e16"/><text y="14" textAnchor="middle" fontSize="6.5" fill="#2a1f15" stroke="#f3e6c4" strokeWidth="2" paintOrder="stroke" fontFamily="Alegreya SC, serif">${j.to}</text></g>
        <g ref=${tokRef} transform=${`translate(${sx*10+5} ${sy*10+5})`}>
          <ellipse cx="0" cy="3" rx="6" ry="2.2" fill="rgba(0,0,0,.25)"/>
          <g className="jr-bob"><path d="M-1 3 v-15" stroke="#2a1f15" strokeWidth="1.3"/><path d="M-1 -12 h10 l-3 3 l3 3 h-10 z" fill="#b2372d" stroke="#2a1f15" strokeWidth=".7"/></g>
          ${phase === "stop" && html`<g className="jr-alert" transform="translate(0 -24)"><circle r="8" fill="#e6bd55" stroke="#7a2a10" strokeWidth="1.2"/><text y="4.2" textAnchor="middle" fontSize="12" fontWeight="800" fill="#3a1a05">!</text></g>`}
        </g>
        <rect x=${x0-20} y=${y0-20} width=${w+40} height=${h+40} fill="url(#jvig)" pointerEvents="none"/>
      </svg>
      <div className="journey-foot"><span className=${phase === "stop" ? "jf-alert" : ""}>${label}</span><span className="faint">Tap to skip</span></div>
    </div>
  </div>`;
}
// ---------- Party management ----------
function PartyView(){
  const s = useStore(); const c = s.campaign; const members = partyMembers(c); const town = townOf(c); const busy = !!s.busy || !!c.combat;
  const set = (id, patch) => partySet(id, patch);
  const posOf = m => m.companion?.pos || m.formation || heroPos({...m, companion: m.companion ? {...m.companion, pos: null} : null, formation: null});
  const dismiss = m => openModal({type:"confirm", text:`Part ways with ${m.name}? They will leave the party.`, okLabel:"Dismiss", ok:()=>{ store.camp(c => { removeFromParty(c, m.id, "dismissed by the party leader"); sysNote(c, {kind:"npc", text:`${m.name} leaves the party`}); }); runDM("event", {text:`The player dismisses ${m.name} from the party. Write their parting words in their own voice (hurt, relieved or gracious depending on their approval of ${approvalLabel(m.companion.approval)}), and a reaction from the others.`}); }});
  const inn = town && servicesOf(town).includes("inn");
  const ups = c.combat ? [] : gearUpgrades(c);
  return html`<div className="page">
    <div className="row wrap" style=${{justifyContent:"space-between"}}><h1 className="page-title"><${Icon} n="user"/> Party <span className="faint" style=${{fontSize:18}}>${members.length}/${MAX_PARTY}</span></h1>
      ${members.length < MAX_PARTY && html`<button className="btn" disabled=${!inn || busy} title=${inn ? "" : "Visit a town with a tavern to recruit"} onClick=${()=>openModal({type:"service", svc:"inn", town: town.id})}><${Icon} n="plus" size=${16}/> ${inn ? "Recruit at the tavern" : "Recruit in a town"}</button>`}</div>
    <div className="formation parch panel">
      <h3 className="panel-title">Battle formation</h3>
      <p className="faint" style=${{marginTop:0, fontSize:13.5}}>Front-liners shield the back line: enemies must get past them to reach anyone behind. Click a member to switch lines.</p>
      <div className="form-lines">${["front","back"].map(pos => html`<div key=${pos} className="form-line"><div className="line-label">${pos === "front" ? "Front line" : "Back line"}</div>
        ${members.filter(m => posOf(m) === pos).map(m => html`<button key=${m.id} className="chip" onClick=${()=>set(m.id, {pos: pos === "front" ? "back" : "front"})}><${Icon} n=${CLASS_ICON[m.cls]} size=${14}/> ${firstName(m.name)} <span className="faint">${m.cls}</span></button>`)}
        ${!members.some(m => posOf(m) === pos) && html`<span className="faint" style=${{fontSize:12.5}}>${pos === "front" ? "Nobody! Your back line will be exposed." : "empty"}</span>`}</div>`)}</div>
    </div>
    ${ups.length > 0 && html`<div className="parch panel upgrades"><h3 className="panel-title"><${Icon} n="up" size=${18}/> Gear upgrades</h3>
      ${ups.map(u => html`<div key=${u.item.id + u.to.id} className="svc-row"><${Icon} n=${itemIcon(u.item)} size=${20}/><div className="grow"><b>${firstName(u.to.name)}</b>: ${u.item.name} <span className="faint">(${u.desc}${u.owner.id !== u.to.id ? `, from ${firstName(u.owner.name)}'s pack` : ""})</span></div><button className="btn sm primary" onClick=${()=>applyUpgrade(u.item.id, u.owner.id, u.to.id)}>Equip</button></div>`)}</div>`}
    <div className="party-grid">${members.map(m => { const cp = m.companion; const mx = maxHp(m);
      return html`<div key=${m.id} className="pcard parch">
        <div className="row" style=${{gap:10}}><${Portrait} ch=${m} size=${52}/>
          <div className="grow"><b className="pc-name">${m.name}</b><div className="faint" style=${{fontSize:13}}>Level ${m.level} ${m.race} ${m.cls}${m.subclass?` · ${m.subclass}`:""}${cp ? "" : " · you"}</div></div></div>
        <div className="row" style=${{justifyContent:"space-between", fontSize:13, marginTop:8}}><span>HP ${m.hp}/${mx} · AC ${armorClass(m)}</span><span>${m.xp} XP</span></div><${Bar} v=${m.hp} max=${mx} kind="hp" low=${m.hp <= mx/3}/>
        ${cp?.player ? html`<p className="faint" style=${{fontSize:13.5}}>A player character${seatInfo(m.id) ? `, played by ${seatInfo(m.id).name}` : " (their player is away, so the AI plays them for now)"}.</p>
          ${canLevel(m) && html`<div className="banner" style=${{fontSize:13, marginBottom:6}}>Level ${m.level + 1} is ready${canLevelHere(c, m) ? "" : `: ${seatInfo(m.id)?.name || "their player"} makes the choices`}.${canLevelHere(c, m) ? html` <button className="btn gold sm" onClick=${()=>openModal({type:"levelup", charId: m.id})}>Level up</button>` : ""}</div>`}
          <div className="row" style=${{gap:6}}><button className="btn sm" onClick=${()=>store.set({tab:"character", sheetId: m.id})}>Sheet & gear</button></div>`
        : cp ? html`
          <div className="approval"><span>Approval</span><div className="appr big"><i style=${{width: `${50 + cp.approval/2}%`}}></i></div><b>${cp.loyal ? "loyal ★" : approvalLabel(cp.approval)}</b></div>
          ${cqOf(m) && html`<div className="faint" style=${{fontSize:12.5, marginTop:4}}>${cp.cq === "done" ? `Personal quest complete: ${cqOf(m).perk}` : cp.cq === "active" ? `Personal quest: ${cqOf(m).title}` : cp.approval >= 15 ? `Earn more of ${firstName(m.name)}'s trust to learn their story.` : `${firstName(m.name)} doesn't trust you enough to share their story yet.`}</div>`}
          ${cp.approval <= -45 && !cp.loyal && html`<div className="banner bad" style=${{marginTop:6, fontSize:13}}>${firstName(m.name)} is close to breaking with you.</div>`}
          <p style=${{margin:"8px 0 4px", fontSize:14.5}}>${cp.personality}</p>
          <p className="faint" style=${{margin:0, fontSize:12.5}}>Likes ${cp.likes.join(", ")} · dislikes ${cp.dislikes.join(", ")}</p>
          <div className="pc-controls">
            <label>Role<select className="input" value=${cp.role} onChange=${e=>set(m.id, {role: e.target.value})}>${Object.keys(ROLE_INFO).map(r=>html`<option key=${r} value=${r}>${cap(r)}</option>`)}</select></label>
            <label>Tactics<select className="input" value=${cp.tactic} onChange=${e=>set(m.id, {tactic: e.target.value})}>${Object.entries(TACTICS).map(([k,v])=>html`<option key=${k} value=${k}>${v}</option>`)}</select></label>
            <label>In combat<select className="input" value=${cp.ctrl} onChange=${e=>set(m.id, {ctrl: e.target.value})}><option value="ai">AI controls</option><option value="manual">I control</option></select></label>
          </div>
          <div className="row wrap" style=${{gap:6, marginTop:8}}>
            <button className="btn sm" onClick=${()=>store.set({tab:"character", sheetId: m.id})}>Sheet & gear</button>
            <button className="btn sm ghost" disabled=${busy} onClick=${()=>{ store.set({tab:"adventure"}); runDM("action", {text:`I take ${m.name} aside for a quiet word. How are they holding up, and what's on their mind?`}); }}>Talk</button>
            ${!spectating() && html`<button className="btn sm ghost" disabled=${busy} onClick=${()=>dismiss(m)}>Dismiss</button>`}</div>`
        : html`<p className="faint" style=${{fontSize:13.5}}>The party leader. You make the decisions; your companions react to them.</p><div className="row" style=${{gap:6}}><button className="btn sm" onClick=${()=>store.set({tab:"character", sheetId: m.id})}>Sheet & gear</button></div>`}
      </div>`; })}</div>
    ${members.length === 1 && html`<div className="banner">Adventuring alone is dangerous. Visit a tavern in any town to recruit up to three companions; each has their own class, personality and opinions.</div>`}
  </div>`;
}

// ---------- App ----------
function App(){
  const s = useStore();
  return html`<${React.Fragment}>
    ${s.view === "home" && html`<${Home}/>`}
    ${s.view === "create" && html`<${Creator}/>`}
    ${s.view === "lobby" && html`<${LobbyView}/>`}
    ${s.view === "game" && s.campaign && html`<${Game}/>`}
    <${ModalHost}/><${JourneyOverlay}/><${DiceOverlay}/><${Toasts}/>
  <//>`;
}
ReactDOM.createRoot(document.getElementById("root")).render(html`<${App}/>`);
initCaps();
if (window.Net) window.Net.init();
window.addEventListener("beforeunload", () => { if (C()) { try { Persist.lsSet("ur:c:" + C().id, packCampaign(C())); } catch {} } });
</script>
</body>
</html>
