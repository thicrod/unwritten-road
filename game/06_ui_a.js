<script>
"use strict";
const { useState, useEffect, useRef, useMemo, useReducer, useCallback } = React;
const html = htm.bind(React.createElement);
function useStore(){ const [, f] = useReducer(x => x + 1, 0); useEffect(() => { store.subs.add(f); return () => store.subs.delete(f); }, []); return store.s; }

// ---------- primitives ----------
function Icon({ n, size, style }){
  const p = ICONS[n] || ICONS.unknown;
  return html`<svg viewBox="0 0 24 24" width=${size||24} height=${size||24} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style=${style}>${p.map((d,i)=>html`<path key=${i} d=${d}/>`)}</svg>`;
}
const DIE_SHAPES = {
  4: {poly:"50,6 95,88 5,88", facets:["50,6 50,62","50,62 5,88","50,62 95,88"], ny:66},
  6: {rect:true, facets:[], ny:54},
  8: {poly:"50,3 96,50 50,97 4,50", facets:["4,50 96,50","50,3 30,50 50,97","50,3 70,50 50,97"], ny:52},
  10:{poly:"50,3 94,40 50,97 6,40", facets:["6,40 30,48 50,97","94,40 70,48 50,97","30,48 70,48","50,3 30,48","50,3 70,48"], ny:44},
  12:{poly:"50,4 95,37 78,93 22,93 5,37", facets:["50,4 50,24","95,37 76,44","78,93 66,76","22,93 34,76","5,37 24,44","50,24 76,44 66,76 34,76 24,44 50,24"], ny:54},
  20:{poly:"50,3 93,27 93,73 50,97 7,73 7,27", facets:["50,3 26,64 74,64 50,3","7,27 26,64","93,27 74,64","26,64 50,97 74,64","7,73 26,64","93,73 74,64"], ny:52},
  100:{poly:"50,3 94,40 50,97 6,40", facets:["6,40 30,48 50,97","94,40 70,48 50,97","30,48 70,48","50,3 30,48","50,3 70,48"], ny:44}
};
function DieFace({ sides, value, cls, size, rolling }){
  const sh = DIE_SHAPES[sides] || DIE_SHAPES[20];
  const [shown, setShown] = useState(rolling ? d(sides) : value);
  useEffect(() => {
    if (!rolling){ setShown(value); return; }
    let n = 0; const iv = setInterval(() => { n++; setShown(d(sides)); if (n > 11){ clearInterval(iv); setShown(value); } }, 70);
    return () => clearInterval(iv);
  }, [value, rolling, sides]);
  const fs = sides === 100 ? 0.8 : 1;
  return html`<div className=${"die " + (cls||"") + (rolling ? " rolling" : "")} style=${size?{width:size,height:size}:null}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      ${sh.rect ? html`<rect className="face" x="8" y="8" width="84" height="84" rx="14" fill="#efe3c3" stroke="#2a1f15" strokeWidth="4"/>` : html`<polygon className="face" points=${sh.poly} fill="#efe3c3" stroke="#2a1f15" strokeWidth="4" strokeLinejoin="round"/>`}
      ${sh.facets.map((f,i)=>html`<polyline key=${i} points=${f} fill="none" stroke="rgba(42,31,21,.28)" strokeWidth="2"/>`)}
    </svg>
    <span className="num" style=${{marginTop: `${(sh.ny-50)*0.9}%`, fontSize: fs !== 1 ? "0.8em" : undefined}}>${shown}</span>
  </div>`;
}
function inlineMd(s){
  const out = []; const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|"[^"\n]{2,}"|\u201c[^\u201d\n]{2,}\u201d)/g; let last = 0, m, i = 0;
  while ((m = re.exec(s))){ if (m.index > last) out.push(s.slice(last, m.index)); const t = m[0];
    if (t.startsWith("**")) out.push(html`<b key=${i++}>${t.slice(2,-2)}</b>`);
    else if (t.startsWith("*") || t.startsWith("_")) out.push(html`<i key=${i++}>${t.slice(1,-1)}</i>`);
    else out.push(html`<span className="say" key=${i++}>${t}</span>`);
    last = m.index + t.length; }
  if (last < s.length) out.push(s.slice(last)); return out;
}
function Md({ text }){ return String(text||"").split(/\n{2,}/).filter(p=>p.trim()).map((p,i)=>html`<p key=${i}>${p.split("\n").map((ln,j)=>html`<${React.Fragment} key=${j}>${j?html`<br/>`:null}${inlineMd(ln)}<//>`)}</p>`); }
function Bar({ v, max, kind, low }){ const pct = max > 0 ? clamp(v/max*100, 0, 100) : 0; return html`<div className=${"bar " + kind + (low ? " low" : "")} role="progressbar" aria-valuenow=${v} aria-valuemax=${max}><i style=${{width: pct+"%"}}></i></div>`; }
function Pips({ max, used, res }){ return html`<span className="pips">${Array.from({length:max},(_,i)=>html`<span key=${i} className=${"pip" + (res?" res":"") + (i < max-used ? "" : " used")}></span>`)}</span>`; }
function Modal({ title, onClose, children, foot, wide }){
  useEffect(() => { const h = e => { if (e.key === "Escape") onClose?.(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return html`<div className="modal-back" onMouseDown=${e => { if (e.target === e.currentTarget) onClose?.(); }}>
    <div className=${"modal parch" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label=${title}>
      <div className="modal-head"><h2>${title}</h2>${onClose && html`<button className="btn ghost sm" onClick=${onClose} aria-label="Close"><${Icon} n="x" size=${18}/></button>`}</div>
      <div className="modal-body">${children}</div>
      ${foot && html`<div className="modal-foot">${foot}</div>`}
    </div></div>`;
}
function Seg({ value, options, onChange }){ return html`<div className="seg" role="group">${options.map(([v,l])=>html`<button key=${v} className=${value===v?"on":""} onClick=${()=>onChange(v)} aria-pressed=${value===v}>${l}</button>`)}</div>`; }
function Toasts(){ const s = useStore(); return html`<div className="toasts" aria-live="polite">${s.toasts.map(t=>html`<div key=${t.id} className=${"toast " + t.kind}>${t.text}</div>`)}</div>`; }

// ---------- Dice overlay ----------
function DiceOverlay(){
  const s = useStore(); const o = s.overlay;
  useEffect(() => { if (!o?.prompt) return; const k = e => { if (e.key === " " || e.key === "Enter"){ e.preventDefault(); dismissOverlay(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [o?.id]);
  if (!o) return null;
  if (o.prompt) return html`<div className="overlay prompt" onClick=${dismissOverlay} key=${o.id}>
    <div className="stage"><div className="label">${o.label}</div>
      <div className="big-dice"><div className="prompt-die"><${DieFace} sides=${o.sides || 20} value="?" rolling=${false}/></div></div>
      <button className="btn primary lg roll-now" onClick=${e => { e.stopPropagation(); dismissOverlay(); }} autoFocus>🎲 Tap to roll</button>
      <div className="faint" style=${{fontSize:12.5, marginTop:6}}>or press Space</div></div></div>`;
  const dice = o.dice || [];
  const verdict = o.success == null ? null : o.crit ? "Critical!" : o.fumble ? "Fumble!" : o.success ? "Success" : "Failure";
  const vcls = o.crit ? "crit" : o.success ? "ok" : "no";
  return html`<div className=${"overlay" + (o.quick ? " quick" : "")} onClick=${dismissOverlay} key=${o.id}>
    <div className="stage">
      <div className="label">${o.label}${o.adv ? " (advantage)" : o.dis ? " (disadvantage)" : ""}</div>
      <div className="big-dice">${dice.flatMap((dd,i)=>(dd.values||[dd.value]).map((v,j)=>{ const dropped = (dd.values||[]).length > 1 && v !== dd.kept && !(dd.values.indexOf(v) !== j && v === dd.kept); const isKept = !dropped;
        return html`<${DieFace} key=${i+"-"+j} sides=${dd.sides} value=${v} rolling=${true} cls=${(isKept && dd.sides===20 && v===20) ? "crit" : (isKept && dd.sides===20 && v===1) ? "fumble" : dropped ? "dropped" : ""}/>`; }))}</div>
      ${o.lines ? html`<div className="math lines">${o.lines.map((l,i)=>html`<div key=${i}>${l}</div>`)}<div className="faint">DC ${o.dc}</div></div>`
        : html`<div className="math">D${dice[0]?.sides||20} → ${dice[0]?.kept ?? dice[0]?.value} ${o.mod != null ? html`${o.mod>=0?"+":"−"} ${Math.abs(o.mod)} modifier` : ""}${o.bonus ? ` + ${o.bonus}` : ""} = <b>${o.total}</b>${o.dc != null ? ` vs ${o.dcLabel||"DC"} ${o.dc}` : ""}</div>`}
      ${verdict && html`<div className=${"verdict " + vcls}>${verdict}</div>`}
      ${o.after && o.success && html`<div className="math" style=${{animationDelay: o.quick?".7s":"1.3s"}}>${o.after}</div>`}
    </div></div>`;
}

// ---------- Home ----------
function Home(){
  const s = useStore(); const recent = s.index[0];
  const [spin] = useState(true);
  const cont = async (id) => { let c = null; try { c = await loadCampaign(id); } catch(e){ console.warn(e); } if (!c){ toast("That save couldn't be loaded.", "bad"); return; } store.set({campaign:c, view:"game", tab: c.combat ? "combat" : "adventure", dmError:null}); if (c.combat) setTimeout(combatLoop, 300); else maybeRecap(); };
  return html`<div className="home">
    <div className="hero">
      <svg className=${"d20" + (spin ? " spin" : "")} viewBox="0 0 100 100" aria-hidden="true">
        <defs><linearGradient id="g20" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0a24e"/><stop offset="1" stopColor="#8a3f10"/></linearGradient></defs>
        <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="url(#g20)" stroke="#2a1508" strokeWidth="2.5"/>
        <polygon points="50,20 76,64 24,64" fill="rgba(255,235,200,.22)" stroke="#2a1508" strokeWidth="2"/>
        ${["50,3 50,20","93,27 76,64","7,27 24,64","93,73 76,64","7,73 24,64","50,97 24,64","50,97 76,64","93,27 50,20","7,27 50,20"].map((p,i)=>html`<polyline key=${i} points=${p} stroke="#2a1508" strokeWidth="1.6" fill="none"/>`)}
        <text x="50" y="55" textAnchor="middle" fontFamily="Alegreya, Georgia, serif" fontWeight="700" fontSize="17" fill="#1f1006">20</text>
      </svg>
      <div className="wordmark">The Unwritten Road</div>
      <div className="tagline">A tabletop adventure where an AI Dungeon Master writes the world one choice at a time.</div>
    </div>
    ${s.caps.sample === "none" && html`<div className="banner bad">The Dungeon Master runs on Claude. Open this game inside Claude to play the story; you can still build characters and spar in the practice ring.</div>`}
    <div className="home-grid">
      ${recent ? html`<div className="continue-card parch">
        <${Portrait} ch=${{id: recent.charId || recent.id, name: recent.char, race: recent.race, cls: recent.cls, look: recent.look, dragonType: recent.dragonType}} size=${68}/>
        <div className="who"><div className="faint" style=${{fontSize:13}}>Continue adventure</div><h2>${recent.name}</h2>
          <div className="muted">${recent.char}, level ${recent.level} ${recent.race} ${recent.cls}${recent.location ? ` in ${recent.location}` : ""}${recent.dead ? " (fallen)" : ""}</div></div>
        <button className="btn primary lg" onClick=${()=>cont(recent.id)}><${Icon} n="scroll" size=${20}/> Continue</button>
      </div>` : html`<div className="continue-card parch"><div className="who"><h2>Your road is unwritten</h2><div className="muted">Create a hero and the Dungeon Master will build a world around them.</div></div><button className="btn primary lg" onClick=${()=>store.set({view:"create"})}><${Icon} n="plus" size=${20}/> New adventure</button></div>`}
      <button className="menu-card slab" onClick=${()=>store.set({view:"create", creatorPreset:null})}><${Icon} n="plus"/><div><h3>New adventure</h3><p>Build a character and begin a fresh campaign.</p></div></button>
      <button className="menu-card slab" onClick=${()=>store.set({view:"create", creatorPreset:{mode:"quick"}})}><${Icon} n="d20"/><div><h3>Quick adventure</h3><p>A one-evening story (about 90 minutes). Heroes start at level 3.</p></div></button>
      <button className="menu-card slab" onClick=${()=>openModal({type:"campaigns"})}><${Icon} n="book"/><div><h3>Campaigns</h3><p>${s.index.length ? `${s.index.length} saved ${s.index.length===1?"campaign":"campaigns"}. Load, export or delete.` : "No saves yet. Import one from a file."}</p></div></button>
      <button className="menu-card slab" disabled=${!recent} style=${!recent?{opacity:.5}:null} onClick=${async()=>{ if (recent){ await cont(recent.id); store.set({tab:"character"}); } }}><${Icon} n="helm"/><div><h3>Character</h3><p>${recent ? `Open ${recent.char}'s sheet.` : "Create a character first."}</p></div></button>
      ${window.Net && html`<button className="menu-card slab" onClick=${()=>openModal({type:"online"})}><${Icon} n="user"/><div><h3>Play online</h3><p>Host your campaign for friends, or join a room with a code.</p></div></button>`}
      <button className="menu-card slab" onClick=${()=>openModal({type:"help"})}><${Icon} n="book"/><div><h3>How to play</h3><p>Travel, towns, your party, combat and dungeons in two minutes.</p></div></button>
      <button className="menu-card slab" onClick=${()=>openModal({type:"settings"})}><${Icon} n="gear"/><div><h3>Settings</h3><p>Dungeon Master style, sound, animations, theme and saves.</p></div></button>
    </div>
    <div className="faint" style=${{fontSize:13}}>${s.caps.storage === "cloud" ? "Saves sync to your Claude account." : "Saves are kept in this browser."}</div>
  </div>`;
}

// ---------- Character creator ----------
const STEP_NAMES = ["Origin","Class","Abilities","Background","Skills","Equipment","Spells","Story","Party","Campaign"];
const PB_COST = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
function blankDraft(){ return { name:"", race:"Human", cls:"Fighter", background:"Soldier", alignment:"Neutral Good", method:"standard", base:{...CLASSES.Fighter.array}, rolled:null, assign:{},
  skills:[], raceSkills:[], expertise:[], kit:0, fightingStyle:"Defense", cantrips:[], spells:[], dragonType:"Red", appearance:"", backstory:"",
  premise:{ name:"", tone:"Heroic", setting:"Classic kingdoms", difficulty:"standard", custom:"" }, recruits:[] }; }
function Creator(){
  const lobbyMode = useStore().creatorLobby;
  const [dr, setDr] = useState(() => { if (lobbyMode?.draft) return {...blankDraft(), ...lobbyMode.draft}; const d = blankDraft(); const pre = S().creatorPreset; if (pre?.mode) d.premise = {...d.premise, mode: pre.mode}; return d; }); const [step, setStep] = useState(0); const [busy, setBusy] = useState(false);
  const up = patch => setDr(d => ({...d, ...(typeof patch === "function" ? patch(d) : patch)}));
  const C0 = CLASSES[dr.cls], R0 = RACES[dr.race], B0 = BACKGROUNDS[dr.background];
  const isCaster = !!C0.caster && C0.caster.from === 1;
  const steps = STEP_NAMES.filter(n => (n !== "Spells" || isCaster) && (!lobbyMode || !["Party", "Campaign"].includes(n)));
  const cur = steps[step];
  const finalAb = Object.fromEntries(ABILS.map(k => [k, (dr.base[k]||8) + (R0.bonus[k]||0)]));
  const bgSkills = B0.skills.concat(R0.skills||[]);
  const skillPool = C0.skills[1].filter(s => !bgSkills.includes(s));
  const needSkills = C0.skills[0], needRaceSkills = R0.extraSkills || 0;
  const cantripN = CANTRIPS_KNOWN[dr.cls]?.[1] || 0, spellN = SPELLS_KNOWN[dr.cls]?.[1] || 0;
  const valid = {
    Origin: dr.name.trim().length > 0, Class: true,
    Abilities: dr.method === "point" ? ABILS.reduce((a,k)=>a+(PB_COST[dr.base[k]]??99),0) <= 27 : ABILS.every(k => dr.base[k] > 0),
    Background: true, Skills: dr.skills.length === needSkills && dr.raceSkills.length === needRaceSkills && (dr.cls !== "Rogue" || dr.expertise.length === 2),
    Equipment: true, Spells: dr.cantrips.length === cantripN && dr.spells.length === spellN, Story: true, Campaign: true
  };
  const pickClass = cls => up(d => ({ cls, base: d.method==="point" ? d.base : {...CLASSES[cls].array}, assign:{}, skills:[], expertise:[], cantrips:[], spells:[], kit:0, fightingStyle:"Defense" }));
  const randomize = () => {
    const cls = pick(Object.keys(CLASSES)), race = pick(Object.keys(RACES)), bg = pick(Object.keys(BACKGROUNDS)); const Cc = CLASSES[cls];
    const names = ["Aldric","Brenna","Corvin","Dara","Eamon","Fen","Garrick","Hesper","Isolde","Jory","Kestrel","Lysa","Marek","Nyssa","Orrin","Petra","Quill","Rhosyn","Soren","Talia","Ulric","Vesna","Wren","Yara"];
    const bgs = BACKGROUNDS[bg].skills.concat(RACES[race].skills||[]); const pool = Cc.skills[1].filter(s=>!bgs.includes(s)).sort(()=>Math.random()-.5);
    const skills = pool.slice(0, Cc.skills[0]); const rest = Object.keys(SKILLS).filter(s=>!bgs.includes(s) && !skills.includes(s)).sort(()=>Math.random()-.5);
    const L = CLASS_LETTER[cls]; const cantrips = L && Cc.caster?.from===1 ? SPELLS.filter(s=>s.l===0 && s.c.includes(L)).sort(()=>Math.random()-.5).slice(0, CANTRIPS_KNOWN[cls][1]).map(s=>s.n) : [];
    const spells = L && Cc.caster?.from===1 ? SPELLS.filter(s=>s.l===1 && s.c.includes(L) && s.m.k!=="utility").sort(()=>Math.random()-.5).slice(0, SPELLS_KNOWN[cls][1]).map(s=>s.n) : [];
    setDr(d => ({...d, name: pick(names), race, cls, background: bg, alignment: pick(ALIGNMENTS), method:"standard", base:{...Cc.array}, assign:{}, skills, raceSkills: rest.slice(0, RACES[race].extraSkills||0),
      expertise: cls==="Rogue" ? [...bgs, ...skills].slice(0,2) : [], kit: rnd(2), fightingStyle: pick(["Defense","Dueling","Archery"]), cantrips, spells, dragonType: pick(Object.keys(DRAGON_TYPES)) }));
    setStep(steps.length - 2 >= 0 ? STEP_NAMES.filter(n => n !== "Spells" || (CLASSES[cls].caster?.from===1)).indexOf("Story") : 0);
  };
  const lobbyReady = async () => {
    setBusy(true); const d = JSON.parse(JSON.stringify(dr));
    if (lobbyMode.mode === "join"){ window.Net.intent({ type: "addHero", draft: d }); toast("Your hero is on the way. The host's game adds them to the party."); store.set({ view: "game", creatorLobby: null }); return; }
    const r = await window.Net.lobbyDraft(d); setBusy(false);
    if (!r.ok) return toast(r.error || "Couldn't save your hero.", "bad");
    store.set({ view: "lobby", creatorLobby: null });
  };
  const begin = async () => {
    setBusy(true);
    const ch = buildCharacter(dr);
    const premise = {...dr.premise, name: dr.premise.name.trim() || `The ${pick(["Ballad","Chronicle","Saga","Tale","Legend"])} of ${ch.name}`};
    await createCampaign(ch, premise, dr.recruits || []);
  };
  const body = () => {
    switch (cur){
      case "Origin": return html`
        <div className="parch detail"><h3>Who are you?</h3><div className="row wrap" style=${{gap:12, marginTop:10}}>
          <div className="field grow" style=${{minWidth:220}}><label htmlFor="cname">Character name</label><input id="cname" className="input" value=${dr.name} maxLength=${40} placeholder="e.g. Wren Ashdown" onInput=${e=>up({name:e.target.value})}/></div>
          <button className="btn ghost" onClick=${randomize}><${Icon} n="d20" size=${18}/> Surprise me</button></div></div>
        <div className="pick-grid">${Object.entries(RACES).map(([k,r])=>html`<button key=${k} className=${"pick" + (dr.race===k?" on":"")} onClick=${()=>up({race:k, raceSkills:[]})}>
          <span className="t">${k}</span><span className="k">${Object.entries(r.bonus).map(([a,v])=>`${a} +${v}`).join(", ")}</span><span className="d">${r.desc}</span></button>`)}</div>
        <div className="parch detail"><h3>${dr.race}</h3>${R0.traits.map((t,i)=>html`<p key=${i}>${t}</p>`)}<p className="muted">Speed ${R0.speed} ft.</p>
          ${dr.race==="Dragonborn" && html`<div className="field" style=${{maxWidth:260}}><label>Draconic ancestry</label><select className="input" value=${dr.dragonType} onChange=${e=>up({dragonType:e.target.value})}>${Object.entries(DRAGON_TYPES).map(([k,v])=>html`<option key=${k} value=${k}>${k} (${v})</option>`)}</select></div>`}
        </div>`;
      case "Class": return html`
        <div className="pick-grid">${Object.entries(CLASSES).map(([k,c])=>html`<button key=${k} className=${"pick" + (dr.cls===k?" on":"")} onClick=${()=>pickClass(k)}>
          <span className="t"><${Icon} n=${CLASS_ICON[k]}/>${k}</span><span className="k">d${c.hd} hit die, ${c.prim} ${c.caster?`, ${c.caster.ab} spells`:""}</span><span className="d">${c.desc}</span></button>`)}</div>
        <div className="parch detail"><h3>${dr.cls}</h3><p>${C0.desc}</p>
          <p><b>Saving throws:</b> ${C0.saves.map(a=>ABIL_NAME[a]).join(", ")}. <b>Armor:</b> ${C0.armor.length ? C0.armor.join(", ") : "none"}. <b>Hit die:</b> d${C0.hd}.</p>
          <p><b>Level 1:</b> ${C0.feats[1].join(", ")}. <b>Later:</b> ${[2,3,5].map(l=>C0.feats[l]?`L${l} ${C0.feats[l].join(", ")}`:null).filter(Boolean).join("; ")}.</p>
          <p><b>Paths at level 3:</b> ${C0.subs.map(s=>`${s.n}: ${s.d}`).join(" / ")}</p>
          ${dr.cls==="Fighter" && html`<div className="field" style=${{maxWidth:360}}><label>Fighting style</label><select className="input" value=${dr.fightingStyle} onChange=${e=>up({fightingStyle:e.target.value})}>${Object.entries(FIGHTING_STYLES).map(([k,v])=>html`<option key=${k} value=${k}>${k}: ${v}</option>`)}</select></div>`}
        </div>`;
      case "Abilities": {
        const pbSpent = ABILS.reduce((a,k)=>a+(PB_COST[dr.base[k]]??0),0);
        const values = dr.method === "roll" ? (dr.rolled||[]).map(r=>r.total) : [15,14,13,12,10,8];
        const order = Object.keys(C0.array);
        const curAssign = () => { if (Object.keys(dr.assign).length === 6) return dr.assign; const a = {}, used = new Set(); for (const k of ABILS){ const i = values.findIndex((v,j)=>v===dr.base[k] && !used.has(j)); if (i>=0){ a[k]=i; used.add(i);} } return a; };
        const setAssign = (ab, idx) => up(d => { const a = {...curAssign()}; idx = +idx; const holder = Object.keys(a).find(k => a[k] === idx); const old = a[ab]; a[ab] = idx; if (holder && holder !== ab){ if (old != null) a[holder] = old; else delete a[holder]; } const base = {...d.base}; for (const k of ABILS) base[k] = a[k] != null ? values[a[k]] : 0; return {assign:a, base}; });
        const rollAll = () => { const rolled = Array.from({length:6},()=>{ const ds = [d(6),d(6),d(6),d(6)]; const low = Math.min(...ds); return {ds, total: ds.reduce((a,b)=>a+b,0) - low, low}; });
          const idxs = rolled.map((r,i)=>i).sort((a,b)=>rolled[b].total-rolled[a].total); const a = {}, base = {}; order.forEach((k,j)=>{ a[k] = idxs[j]; base[k] = rolled[idxs[j]].total; }); up({rolled, assign:a, base}); };
        const asg = curAssign();
        return html`
        <div className="row wrap"><${Seg} value=${dr.method} options=${[["standard","Standard array"],["point","Point buy"],["roll","Roll 4d6"]]} onChange=${m=>up({method:m, assign:{}, rolled:null, base: m==="point" ? {STR:8,DEX:8,CON:8,INT:8,WIS:8,CHA:8} : m==="standard" ? {...C0.array} : {STR:0,DEX:0,CON:0,INT:0,WIS:0,CHA:0}})}/>
          ${dr.method==="standard" && html`<button className="btn ghost sm" onClick=${()=>up({base:{...C0.array}, assign:{}})}>Use the ${dr.cls} spread</button>`}
          ${dr.method==="point" && html`<span className=${"chip" + (pbSpent>27?" hp":"")}>${27-pbSpent} points left</span>`}
          ${dr.method==="roll" && html`<button className="btn primary sm" onClick=${rollAll}><${Icon} n="d20" size=${16}/> ${dr.rolled ? "Reroll all" : "Roll the dice"}</button>`}</div>
        ${dr.method==="roll" && dr.rolled && html`<div className="row wrap" style=${{gap:14}}>${dr.rolled.map((r,i)=>html`<div key=${i} className="slab" style=${{padding:"6px 10px", display:"flex", gap:4, alignItems:"center"}}>${r.ds.map((x,j)=>html`<${DieFace} key=${j} sides=${6} value=${x} size=${30} cls=${x===r.low && r.ds.indexOf(x)===j ? "dropped" : ""}/>`)}<b style=${{marginLeft:6, fontSize:20}}>${r.total}</b></div>`)}</div>`}
        <div className="ab-grid">${ABILS.map(k=>html`<div key=${k} className="ab parch">
          <div className="n">${ABIL_NAME[k]}</div><div className="v">${finalAb[k]||"—"}</div><div className="m">${dr.base[k] ? fmt(abMod(finalAb[k])) : ""}</div>
          ${R0.bonus[k] ? html`<div className="b">+${R0.bonus[k]} ${dr.race}</div>` : html`<div className="b"> </div>`}
          ${dr.method==="point" ? html`<div className="row" style=${{justifyContent:"center", marginTop:6}}>
              <button className="btn ghost sm" disabled=${dr.base[k]<=8} onClick=${()=>up(d=>({base:{...d.base,[k]:d.base[k]-1}}))} aria-label=${"Lower "+k}>−</button>
              <b>${dr.base[k]}</b><button className="btn ghost sm" disabled=${dr.base[k]>=15 || pbSpent + (PB_COST[dr.base[k]+1]-PB_COST[dr.base[k]]) > 27} onClick=${()=>up(d=>({base:{...d.base,[k]:d.base[k]+1}}))} aria-label=${"Raise "+k}>+</button></div>`
            : dr.method==="roll" && !dr.rolled ? null : html`<select className="input" style=${{marginTop:6, padding:"4px 6px"}} value=${asg[k] ?? ""} onChange=${e=>setAssign(k, e.target.value)} aria-label=${"Score for "+ABIL_NAME[k]}>
              ${asg[k]==null && html`<option value="">—</option>`}${values.map((v,i)=>html`<option key=${i} value=${i}>${v}${Object.keys(asg).find(x=>asg[x]===i && x!==k) ? ` (swap with ${Object.keys(asg).find(x=>asg[x]===i)})` : ""}</option>`)}</select>`}
        </div>`)}</div>
        <p className="muted" style=${{margin:0}}>Your ${dr.cls} leans on ${ABIL_NAME[C0.prim]}${C0.caster?` and casts with ${ABIL_NAME[C0.caster.ab]}`:""}. Constitution adds hit points; Dexterity helps armor class and initiative.</p>`;
      }
      case "Background": return html`
        <div className="pick-grid">${Object.entries(BACKGROUNDS).map(([k,b])=>html`<button key=${k} className=${"pick" + (dr.background===k?" on":"")} onClick=${()=>up({background:k, skills: dr.skills.filter(s=>!b.skills.includes(s)), raceSkills: dr.raceSkills.filter(s=>!b.skills.includes(s))})}>
          <span className="t">${k}</span><span className="k">${b.skills.join(", ")}</span><span className="d">${b.feat}</span></button>`)}</div>
        <div className="parch detail"><h3>Alignment</h3><div className="checkl" style=${{marginTop:8}}>${ALIGNMENTS.map(a=>html`<label key=${a} className=${dr.alignment===a?"on":""} style=${{background:"rgba(255,255,255,.25)",borderColor:"rgba(90,60,25,.3)"}}><input type="radio" name="al" checked=${dr.alignment===a} onChange=${()=>up({alignment:a})}/>${a}</label>`)}</div></div>`;
      case "Skills": {
        const toggle = (key, s, max) => up(d => { const l = d[key].includes(s) ? d[key].filter(x=>x!==s) : d[key].length < max ? [...d[key], s] : d[key]; return {[key]: l}; });
        const allProf = [...bgSkills, ...dr.skills, ...dr.raceSkills];
        return html`
        <div className="parch detail"><h3>Background & heritage</h3><p>You're already trained in ${bgSkills.join(", ")}.</p></div>
        <div><h3 className="panel-title">Choose ${needSkills} ${dr.cls} skills <span className="chip">${dr.skills.length}/${needSkills}</span></h3>
          <div className="checkl">${skillPool.map(s=>{ const on = dr.skills.includes(s); const dis = !on && (dr.skills.length>=needSkills || dr.raceSkills.includes(s));
            return html`<label key=${s} className=${(on?"on ":"")+(dis?"dis":"")}><input type="checkbox" checked=${on} disabled=${dis} onChange=${()=>toggle("skills", s, needSkills)}/>${s} <span className="faint">${SKILLS[s]}</span></label>`; })}</div></div>
        ${needRaceSkills > 0 && html`<div><h3 className="panel-title">Half-Elf versatility: ${needRaceSkills} more <span className="chip">${dr.raceSkills.length}/${needRaceSkills}</span></h3>
          <div className="checkl">${Object.keys(SKILLS).filter(s=>!bgSkills.includes(s) && !dr.skills.includes(s)).map(s=>{ const on = dr.raceSkills.includes(s); const dis = !on && dr.raceSkills.length>=needRaceSkills;
            return html`<label key=${s} className=${(on?"on ":"")+(dis?"dis":"")}><input type="checkbox" checked=${on} disabled=${dis} onChange=${()=>toggle("raceSkills", s, needRaceSkills)}/>${s}</label>`; })}</div></div>`}
        ${dr.cls==="Rogue" && html`<div><h3 className="panel-title">Expertise: double proficiency in 2 <span className="chip">${dr.expertise.length}/2</span></h3>
          <div className="checkl">${allProf.map(s=>{ const on = dr.expertise.includes(s); const dis = !on && dr.expertise.length>=2; return html`<label key=${s} className=${(on?"on ":"")+(dis?"dis":"")}><input type="checkbox" checked=${on} disabled=${dis} onChange=${()=>toggle("expertise", s, 2)}/>${s}</label>`; })}</div></div>`}`;
      }
      case "Equipment": return html`
        <div className="pick-grid">${C0.kits.map((k,i)=>html`<button key=${i} className=${"pick" + (dr.kit===i?" on":"")} onClick=${()=>up({kit:i})}><span className="t">${k.n}</span><span className="d">${k.i.join(", ")}</span></button>`)}</div>
        <div className="parch detail"><h3>You also carry</h3><p>${B0.item} (from your background), a Potion of Healing, and ${C0.gold + B0.gold} gold pieces.</p>
          <p className="muted">Gear is equipped automatically; you can swap anything on your character sheet.</p></div>`;
      case "Spells": {
        const L = CLASS_LETTER[dr.cls];
        const can = SPELLS.filter(s => s.l === 0 && s.c.includes(L)), lv1 = SPELLS.filter(s => s.l === 1 && s.c.includes(L));
        const tog = (key, n, max) => up(d => ({[key]: d[key].includes(n) ? d[key].filter(x=>x!==n) : d[key].length < max ? [...d[key], n] : d[key]}));
        const tag = s => ({atk:"attack",save:"save",auto:"auto-hit",heal:"healing",cond:"control",buff:"buff",zone:"area",summon:"summon",weapon:"weapon",smite:"smite",react:"reaction",restore:"cure",berry:"food",utility:"utility"})[s.m.k];
        return html`
        <div><h3 className="panel-title">Cantrips <span className="chip">${dr.cantrips.length}/${cantripN}</span></h3>
          <div className="spell-pick">${can.map(s=>html`<button key=${s.n} className=${dr.cantrips.includes(s.n)?"on":""} disabled=${!dr.cantrips.includes(s.n) && dr.cantrips.length>=cantripN} onClick=${()=>tog("cantrips", s.n, cantripN)}><div className="sn">${s.n} <span className="faint" style=${{fontWeight:400,fontSize:12}}>${tag(s)}</span></div><div className="sd">${s.d}</div></button>`)}</div></div>
        <div><h3 className="panel-title">Level 1 spells <span className="chip">${dr.spells.length}/${spellN}</span></h3>
          <div className="spell-pick">${lv1.map(s=>html`<button key=${s.n} className=${dr.spells.includes(s.n)?"on":""} disabled=${!dr.spells.includes(s.n) && dr.spells.length>=spellN} onClick=${()=>tog("spells", s.n, spellN)}><div className="sn">${s.n} <span className="faint" style=${{fontWeight:400,fontSize:12}}>${tag(s)}</span></div><div className="sd">${s.d}</div></button>`)}</div></div>`;
      }
      case "Story": {
        const ch = buildCharacter(dr);
        return html`
        <section className="parch detail"><h3 style=${{marginTop:0}}>Portrait</h3><${LookPicker} dr=${dr} setDr=${setDr}/></section>
        <div className="parch detail"><div className="row wrap" style=${{gap:14}}><${Portrait} ch=${{...dr, id:"draft"}} size=${64}/>
          <div className="grow"><h3>${dr.name||"Nameless"}</h3><div className="muted">${dr.race} ${dr.cls}, ${dr.background}, ${dr.alignment}</div></div>
          <div className="row" style=${{gap:8}}>${[["HP",maxHp(ch)],["AC",armorClass(ch)],["Init",fmt(initMod(ch))],["Speed",speed(ch)]].map(([l,v])=>html`<div key=${l} className="stat" style=${{background:"rgba(255,255,255,.3)",borderColor:"rgba(90,60,25,.3)",minWidth:58}}><div className="v">${v}</div><div className="l" style=${{color:"var(--ink-soft)"}}>${l}</div></div>`)}</div></div>
          <p style=${{marginTop:10}}>${ABILS.map(k=>`${k} ${ch.abilities[k]} (${fmt(abMod(ch.abilities[k]))})`).join(", ")}</p>
          <p className="muted">Skills: ${ch.skills.join(", ")}${ch.expertise.length?`. Expertise: ${ch.expertise.join(", ")}`:""}. Gear: ${ch.inventory.map(i=>i.name + (i.qty>1?` ×${i.qty}`:"")).join(", ")}.</p></div>
        <div className="field"><label htmlFor="app">Appearance (optional)</label><input id="app" className="input" maxLength=${300} value=${dr.appearance} placeholder="Scarred hands, a moth-eaten green cloak, eyes that never quite settle" onInput=${e=>up({appearance:e.target.value})}/></div>
        <div className="field"><label htmlFor="bs">Backstory hooks (optional)</label><textarea id="bs" className="input" maxLength=${800} rows=${4} value=${dr.backstory} placeholder="What do you want, what haunts you, who would you die for? The DM will weave this into the story." onInput=${e=>up({backstory:e.target.value})}></textarea></div>`;
      }
      case "Party": {
        const size = dr.partySize || Math.min(4, dr.recruits.length + 1), cap0 = size - 1;
        const setSize = n => up(d => ({ partySize: n, recruits: d.recruits.slice(0, n - 1) }));
        const togR = id => up(d => ({recruits: d.recruits.includes(id) ? d.recruits.filter(x => x !== id) : d.recruits.length < cap0 ? [...d.recruits, id] : d.recruits}));
        const roles = {tank:0, striker:0, support:0, controller:0}; for (const id of dr.recruits){ const t = COMPANIONS.find(x=>x.id===id); if (t) roles[t.role]++; }
        return html`
        <div className="parch detail"><h3>Your fellowship ${cap0 > 0 ? html`<span className="chip">${dr.recruits.length}/${cap0}</span>` : null}</h3>
          <div className="field"><label>Party size</label><${Seg} value=${String(size)} options=${[["1","Just me"],["2","2 heroes"],["3","3 heroes"],["4","4 heroes"]]} onChange=${v=>setSize(+v)}/></div>
          <p>${cap0 > 0 ? `Choose ${cap0 === 1 ? "the companion" : `up to ${cap0} companions`} who already travel with you. Each has their own class, personality and opinions, and reacts to your choices. You can recruit more at taverns later (up to 4 heroes).` : "You set out alone. Fights are scaled to your party size, so solo play works, but it's harder: the Story difficulty is a good fit. You can still recruit companions at taverns along the way."}</p>
          <p className="muted" style=${{marginBottom:0}}>${dr.recruits.length ? `Party roles: ${Object.entries(roles).filter(([,n])=>n).map(([r,n])=>`${n} ${r}`).join(", ")}${!roles.support && dr.cls !== "Cleric" && dr.cls !== "Druid" && dr.cls !== "Bard" ? ". Consider a healer (support)." : "."}` : "A balanced party usually has a front-liner, a healer and some firepower."}</p></div>
        ${cap0 > 0 && html`<div className="pick-grid">${COMPANIONS.filter(t => t.cls !== dr.cls || true).map(t => html`<button key=${t.id} className=${"pick" + (dr.recruits.includes(t.id) ? " on" : "")} onClick=${()=>togR(t.id)} disabled=${!dr.recruits.includes(t.id) && dr.recruits.length >= cap0}>
          <span className="t"><${Portrait} ch=${{tpl: t.id, race: t.race, cls: t.cls, name: t.name, dragonType: t.dragon}} size=${34}/>${t.name}</span><span className="k">${t.race} ${t.cls} · ${t.role}</span><span className="d">${t.personality}</span></button>`)}</div>`}`;
      }
      case "Campaign": {
        const P = dr.premise; const setP = patch => up(d => ({premise:{...d.premise, ...patch}}));
        return html`
        <div className="parch detail"><h3>Set the table</h3><p>Tell the Dungeon Master what kind of story you want. Everything else is discovered in play.</p></div>
        <div className="field"><label htmlFor="pn">Campaign name (optional)</label><input id="pn" className="input" maxLength=${60} value=${P.name} placeholder=${`The Saga of ${dr.name||"..."}`} onInput=${e=>setP({name:e.target.value})}/></div>
        <div className="field"><label>Tone</label><${Seg} value=${P.tone} options=${["Heroic","Grim & dark","Mystery","Horror","Whimsical"].map(x=>[x,x])} onChange=${v=>setP({tone:v})}/></div>
        <div className="field"><label>Setting</label><${Seg} value=${P.setting} options=${["Classic kingdoms","Frontier wilds","Haunted realm","Desert empire","Northern isles","Surprise me"].map(x=>[x,x])} onChange=${v=>setP({setting:v})}/></div>
        <div className="field"><label>Difficulty</label><${Seg} value=${P.difficulty} options=${[["story","Story"],["standard","Standard"],["deadly","Deadly"]]} onChange=${v=>setP({difficulty:v})}/></div>
        <div className="field"><label>Length</label><${Seg} value=${P.mode || "campaign"} options=${[["campaign","Full campaign"],["quick","Quick adventure (one evening)"]]} onChange=${v=>setP({mode:v})}/>
          <div className="faint" style=${{fontSize:12.5, marginTop:4}}>${P.mode === "quick" ? "A self-contained story of about 90 minutes: heroes start at level 3, and the adventure leads straight to the villain's lair." : "A long campaign in three acts: investigate, confront the villain's lieutenant, then storm the lair."}</div></div>
        <div className="field"><label htmlFor="pc">Anything else? (optional)</label><textarea id="pc" className="input" rows=${3} maxLength=${500} value=${P.custom} placeholder="e.g. political intrigue, a heist, lots of dragons, no spiders please" onInput=${e=>setP({custom:e.target.value})}></textarea></div>
        ${S().caps.sample !== "ready" && html`<div className="banner bad" style=${{width:"100%"}}>The AI Dungeon Master isn't connected, so the campaign will start from a fixed opening. Open this game in Claude for the full experience.</div>`}`;
      }
    }
  };
  const canNext = valid[cur] !== false;
  return html`<div className="creator">
    <nav className="steps" aria-label="Character creation steps">${steps.map((n,i)=>html`<button key=${n} className=${i===step?"on":i<step?"done":""} onClick=${()=>i<=step || steps.slice(0,i).every(x=>valid[x]!==false) ? setStep(i) : null}>${i+1}. ${n}</button>`)}</nav>
    <div className="creator-body"><div className="creator-inner">${body()}</div></div>
    <div className="creator-foot">
      <button className="btn ghost" onClick=${()=> step ? setStep(step-1) : store.set(lobbyMode ? {view: lobbyMode.mode === "join" ? "game" : "lobby", creatorLobby: null} : {view:"home"})}>${step ? "Back" : "Cancel"}</button>
      <span className="grow faint" style=${{fontSize:13}}>${!canNext ? ({Origin:"Give your character a name.",Abilities:"Assign every score.",Skills:"Pick the listed number of skills.",Spells:"Choose your cantrips and spells."})[cur]||"" : ""}</span>
      ${lobbyMode && step === steps.length - 1 ? html`<button className="btn primary lg" disabled=${busy || !canNext} onClick=${lobbyReady}>${busy ? "Saving…" : lobbyMode.mode === "join" ? "Join the party" : "I'm ready"}</button>`
        : cur === "Campaign" ? html`<button className="btn primary lg" disabled=${busy} onClick=${begin}>${busy ? "The world takes shape…" : "Begin the adventure"}</button>`
        : html`<button className="btn primary" disabled=${!canNext} onClick=${()=>setStep(step+1)}>Next</button>`}
    </div></div>`;
}
</script>
