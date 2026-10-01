<script>
"use strict";
// ---------- out-of-combat helpers ----------
function sysNote(c, notes){ const n = Array.isArray(notes) ? notes : [notes]; if (n.length) pushLog(c, {kind:"sys", notes: n}); }
function castOutOfCombat(spellName, o={}){
  const sp = SPELL[spellName]; const c0 = C(); const caster = c0.characters[o.casterId || c0.activeCharId]; if (!sp || !caster) return;
  if (hasCond(caster,"wildshape")) { coopNotify("Can't cast in beast form.", "bad"); return; }
  if (armorPenalty(caster)) { coopNotify("Armor hampers spellcasting.", "bad"); return; }
  const slot = sp.l === 0 ? 0 : o.fromScroll ? Math.max(1, sp.l) : (o.slot || lowestSlot(caster, sp.l));
  if (sp.l > 0 && !o.fromScroll && !slotsLeft(caster, slot)) { coopNotify("No spell slots left.", "bad"); return; }
  const m = sp.m; const local = ["heal","buff","berry","restore"].includes(m.k) && !(m.k==="buff" && m.mark) || sp.n === "Revivify";
  store.camp((c) => {
    const ch = c.characters[caster.id];
    if (slot && !o.fromScroll) ch.slotsUsed[slot] = (ch.slotsUsed[slot]||0) + 1;
    if (o.fromScroll && o.itemId){ const holder = partyMembers(c).find(mm => invItem(mm, o.itemId)); const it = holder && invItem(holder, o.itemId); if (it){ it.qty--; if (it.qty<=0) dropItem(holder, it.id); } }
    if (!local) return;
    const ci = castInfo(ch) || {mod:2}; const notes = []; const tgt = c.characters[o.allyId] || ch;
    if (sp.n === "Revivify"){ const f = (c.fallen||[]).map(x => c.characters[x.id]).find(x => x && x.dead); if (f){ f.dead = false; f.hp = 1; c.fallen = c.fallen.filter(x => x.id !== f.id); if (partyMembers(c).length < MAX_PARTY) c.partyIds.push(f.id); notes.push({kind:"loot", text:`${f.name} is brought back to life!`}); } else notes.push({kind:"hurt", text:"There is no one to revive"}); }
    else if (m.k === "heal"){
      const expr = joinExpr(m.heal, m.up && slot > sp.l ? `${parseDice(m.up)[0].n*(slot-sp.l)}d${parseDice(m.up)[0].sides}` : "", m.mod ? Math.max(0, ci.mod) : 0, subMods(ch).lifeHeal ? 2 + slot : 0);
      const tgts = m.party ? partyMembers(c) : [tgt];
      for (const t of tgts){ const b = t.hp; t.hp = Math.min(maxHp(t), t.hp + rollDice(expr).total); notes.push({kind:"loot", text:`${firstName(t.name)} +${t.hp-b} HP`}); }
      if (m.party) for (const p of c.companions) p.hp = Math.min(p.maxHp, p.hp + rollDice(expr).total);
    } else if (m.k === "buff"){
      if (m.buff === "aid"){ for (const t of partyMembers(c)) if (!hasCond(t,"aid")){ addCond(t,"aid",{long:true}); t.hp += 5; } }
      else if (m.buff === "agathys"){ ch.tempHp = Math.max(ch.tempHp||0, 5*Math.max(1,slot)); addCond(ch,"agathys",{amount:5*Math.max(1,slot)}); }
      else if (m.buff === "guided") addCond(tgt, "guided", {note: sp.n});
      else if (m.long || (m.rounds||0) >= 100) addCond(tgt, m.buff, { long: true, note: sp.n });
      else { toast(`${sp.n} only lasts a short while; it's best cast in battle.`, ""); }
      notes.push({kind:"xp", text:`${sp.n}: ${COND_INFO[m.buff]?.[1] || "the magic takes hold"}`});
    } else if (m.k === "berry"){ addItem(ch, makeItem({name:"Goodberry", type:"potion", heal:"1", qty:10, value:0})); notes.push({kind:"loot", text:"Ten goodberries appear"}); }
    else if (m.k === "restore"){ const bad = ["poisoned","blinded","paralyzed","frightened","charmed","diseased","cursed","exhausted"]; const had = tgt.conditions.filter(x=>bad.includes(x.name)); tgt.conditions = tgt.conditions.filter(x=>!bad.includes(x.name)); notes.push({kind:"loot", text: had.length ? `${firstName(tgt.name)} cured: ${had.map(x=>x.name).join(", ")}` : `${sp.n}: nothing to cure`}); }
    sysNote(c, notes);
  });
  hostUI(closeModal);
  if (!local) runDM("action", { text: `${caster.id === C().activeCharId ? "I cast" : `${caster.name} casts`} ${sp.n}${slot > sp.l && sp.l ? ` at level ${slot}` : ""}${o.fromScroll ? " from a scroll" : ""}${o.note ? `: ${o.note}` : "."} (${sp.d})` });
}
function useItemOutOfCombat(itemId, targetId){
  const c0 = C(); const holder = partyMembers(c0).find(m => invItem(m, itemId)); const it = holder && invItem(holder, itemId); if (!it) return;
  if (it.type === "scroll"){ const sp = SPELL[it.spell]; hostUI(closeModal); if (sp) return castOutOfCombat(sp.n, {fromScroll:true, itemId, casterId: holder.id, allyId: targetId}); return runDM("action", {text:`${holder.name} reads the ${it.name}.`}); }
  if (it.type === "potion" && (it.heal || it.cures)){
    store.camp((c) => { const h = c.characters[holder.id]; const item = invItem(h, itemId); const t = c.characters[targetId] || h; const notes = [];
      if (item.heal){ const b = t.hp; t.hp = Math.min(maxHp(t), t.hp + rollDice(item.heal).total); notes.push({kind:"loot", text:`${firstName(t.name)} drinks ${item.name}: +${t.hp-b} HP`}); }
      if (item.cures && hasCond(t, item.cures)){ remCond(t, item.cures); notes.push({kind:"loot", text:`${firstName(t.name)} is no longer ${item.cures}`}); }
      if (!notes.length) notes.push({kind:"loot", text:`${firstName(t.name)} drinks the ${item.name}`});
      item.qty--; if (item.qty <= 0) dropItem(h, item.id); sysNote(c, notes); });
    return;
  }
  runDM("action", {text: `${holder.id === c0.activeCharId ? "I use my" : `${holder.name} uses the`} ${it.name}.`});
}
function travelTo(locId){ openModal({type:"travel", to: locId}); }
async function requestRest(kind){
  const c = C(); const here = topLoc(c, c.currentLocationId);
  if (kind === "long" && !townOf(c) && !c.explore && Math.random() < (isDangerPlace(here) ? 0.4 : 0.22)){
    const theme = pick(BIOME_THEMES[here?.biome || "g"] || ["beast"]); const spec = randomCombat(c, theme, "medium");
    const watch = await partyCheck("Perception", 12 + lootTier(partyLevel(c)));
    const surprise = watch.success ? "none" : "player"; const foes = spec.enemies.map(e => `${e.count} ${e.name}${e.count>1?"s":""}`).join(" and ");
    store.camp(c => pushLog(c, {kind:"player", text:"We make camp for the night."}));
    await runDM("event", {text: `The party makes camp for the night near ${here?.name || "the road"}. In the dark hours, ${foes} creep up on the camp. ${watch.text} ${watch.success ? `${firstName(watch.who?.name || "")} was on watch and raises the alarm in time.` : "Whoever was on watch dozed off; the attack comes as everyone sleeps."} Describe it in 2-3 tense sentences. Do NOT set "combat" or "rest"; the game starts the fight, and the rest is ruined.`,
      offline: `${watch.success ? "A snapped twig! Your watch shouts a warning as" : "You wake to snarls as"} ${foes} fall upon the camp.`});
    startCombat({...spec, surprise, terrain:"a campsite at night"}, {origin:{kind:"camp"}});
    return;
  }
  runDM("action", {text: kind === "long" ? "We find a safe spot, make camp and take a long rest." : "We take a short rest to catch our breath and tend our wounds."}); }
function doShortRest(plan, recover){
  store.camp((c) => {
    const notes = [];
    for (const m of partyMembers(c)){ const n = plan[m.id] || 0; const healed = shortRest(m, n); if (n) notes.push({kind:"loot", text:`${firstName(m.name)}: ${n} hit ${n===1?"die":"dice"}, +${healed} HP`}); else shortRest(m, 0);
      if (recover && resLeft(m,"recovery") && ["Wizard","Druid"].includes(m.cls)){ const got = arcaneRecovery(m); if (got.length) notes.push({kind:"xp", text:`${firstName(m.name)} recovers spell slots (${got.join(", ")})`}); } }
    for (const p of c.companions) p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp/3));
    notes.push({kind:"loot", text:"Short rest complete"}); sysNote(c, notes);
  });
  hostUI(closeModal);
}
function doLongRestAll(c){ for (const m of partyMembers(c)) longRest(m); for (const p of c.companions) p.hp = p.maxHp; }

// ---------- Dice tray ----------
const TRAY_DICE = [4,6,8,10,12,20,100];
function DiceTray(){
  const s = useStore(); const t = s.dice;
  const set = patch => store.set({dice:{...S().dice, ...patch}});
  const add = sides => set({pool:{...t.pool, [sides]: Math.min(12, (t.pool[sides]||0) + 1)}});
  const total = Object.values(t.pool).reduce((a,b)=>a+b,0);
  const roll = () => {
    const pool = total ? t.pool : {20:1}; const onlyD20 = Object.keys(pool).length === 1 && pool[20] === 1;
    const out = []; let sum = 0;
    for (const [sd, n] of Object.entries(pool)) for (let i=0;i<n;i++){
      if (onlyD20 && t.adv !== "none"){ const r = rollD20({adv: t.adv==="adv", dis: t.adv==="dis"}); out.push({sides:20, v:r.kept}); sum += r.kept; }
      else { const v = d(+sd); out.push({sides:+sd, v}); sum += v; } }
    const tot = sum + (t.mod||0); const label = Object.entries(pool).map(([sd,n])=>`${n>1?n:""}d${sd}`).join(" + ");
    const math = out.length === 1 ? `D${out[0].sides} → ${out[0].v}${t.mod ? ` ${t.mod>0?"+":"−"} ${Math.abs(t.mod)} modifier` : ""} = ${tot}` : `${label} → ${out.map(o=>o.v).join(" + ")}${t.mod ? ` ${t.mod>0?"+":"−"} ${Math.abs(t.mod)}` : ""} = ${tot}`;
    set({ result:{ out, tot, math, id: uid("r") }, history: [{math, id: uid("h")}, ...t.history].slice(0,8) });
  };
  return html`<div className="dice-tray">
    <div className="dice-btns">${TRAY_DICE.map(sd=>html`<button key=${sd} onClick=${()=>add(sd)} onContextMenu=${e=>{ e.preventDefault(); set({pool:{...t.pool,[sd]:Math.max(0,(t.pool[sd]||0)-1)}}); }} aria-label=${`Add a d${sd}`}>
      <${DieFace} sides=${sd} value=${sd===100?"%":sd} size=${28}/>${t.pool[sd] ? html`<span className="cnt">${t.pool[sd]}</span>` : null}<span style=${{fontSize:11}}>d${sd}</span></button>`)}</div>
    <div className="tray-row"><label className="faint" style=${{fontSize:12}}>Mod</label>
      <button className="btn ghost sm" onClick=${()=>set({mod:(t.mod||0)-1})} aria-label="Lower modifier">−</button><b style=${{minWidth:26,textAlign:"center"}}>${fmt(t.mod||0)}</b><button className="btn ghost sm" onClick=${()=>set({mod:(t.mod||0)+1})} aria-label="Raise modifier">+</button>
      <${Seg} value=${t.adv} options=${[["none","Normal"],["adv","Adv"],["dis","Dis"]]} onChange=${v=>set({adv:v})}/></div>
    <div className="tray-row"><button className="btn primary grow" onClick=${roll}><${Icon} n="d20" size=${18}/> Roll ${total ? "" : "d20"}</button><button className="btn ghost" onClick=${()=>set({pool:{}, mod:0, adv:"none", result:null})}>Clear</button></div>
    ${t.result && html`<div key=${t.result.id}><div className="tray-well">${t.result.out.slice(0,12).map((o,i)=>html`<${DieFace} key=${i} sides=${o.sides} value=${o.v} size=${36} rolling=${!S().settings.reduceMotion} cls=${o.sides===20&&o.v===20?"crit":o.sides===20&&o.v===1?"fumble":""}/>`)}</div>
      <div className="tray-result">${t.result.math.split(" = ")[0]} = <b>${t.result.tot}</b></div></div>`}
    ${t.history.length > 1 && html`<div className="tray-hist">${t.history.slice(1,5).map(h=>html`<div key=${h.id}>${h.math}</div>`)}</div>`}
  </div>`;
}

// ---------- HUD / aside ----------
function MemberRow({ ch, onClick }){
  const mx = maxHp(ch); const cp = ch.companion;
  return html`<button className="member" onClick=${onClick} title=${`Open ${ch.name}'s sheet`}>
    <${Portrait} ch=${ch} size=${30}/>
    <div className="grow" style=${{minWidth:0}}><div className="row" style=${{justifyContent:"space-between", gap:6}}><span className="mn">${firstName(ch.name)} <span className="faint">L${ch.level} ${ch.cls}</span></span><span style=${{fontSize:12.5}}>${ch.hp}/${mx}</span></div>
      <${Bar} v=${ch.hp} max=${mx} kind="hp" low=${ch.hp <= mx/3}/>
</div>
    ${cp && cp.approval <= -25 && html`<span className="chip hp" title="This companion is unhappy with your choices">${approvalLabel(cp.approval)}</span>`}
  </button>`;
}
function Hud(){
  const s = useStore(); const c = s.campaign; const ch = PC(); if (!ch) return null;
  const mx = maxHp(ch), smx = slotMax(ch), rm = resourceMax(ch); const comps = companionsOf(c);
  const openSheet = id => store.set({tab:"character", sheetId: id, asideOpen:false});
  return html`<div className="hud">
    <div className="hud-head"><${Portrait} ch=${ch} size=${50}/><div className="grow"><div className="name">${ch.name}</div><div className="cls">Level ${ch.level} ${ch.race} ${ch.cls}${ch.subclass?` · ${ch.subclass}`:""}</div></div>
      ${ch.inspiration && html`<span className="chip gold" title="Inspiration: spend for advantage">★</span>`}</div>
    <div><div className="row" style=${{justifyContent:"space-between", fontSize:13}}><span>HP</span><b>${ch.hp}/${mx}${ch.tempHp?html` <span className="chip temp">+${ch.tempHp}</span>`:""}</b></div><${Bar} v=${ch.hp} max=${mx} kind="hp" low=${ch.hp <= mx/3}/>${ch.tempHp ? html`<${Bar} v=${ch.tempHp} max=${mx} kind="temp"/>` : null}</div>
    <div><div className="row" style=${{justifyContent:"space-between", fontSize:13}}><span>XP</span><span>${ch.xp}${ch.level < MAX_LEVEL ? ` / ${XP_TABLE[ch.level]}` : ""}</span></div><${Bar} v=${ch.level < MAX_LEVEL ? ch.xp - XP_TABLE[ch.level-1] : 1} max=${ch.level < MAX_LEVEL ? XP_TABLE[ch.level]-XP_TABLE[ch.level-1] : 1} kind="xp"/></div>
    ${canLevelHere(c, ch) && html`<button className="btn gold" onClick=${()=>openModal({type:"levelup"})}><${Icon} n="up" size=${18}/> Level up to ${ch.level+1}</button>`}
    ${partyMembers(c).filter(m => m.id !== ch.id && canLevelHere(c, m)).map(m => html`<button key=${"lv"+m.id} className="btn gold" onClick=${()=>openModal({type:"levelup", charId: m.id})}><${Icon} n="up" size=${18}/> Level up ${firstName(m.name)} to ${m.level+1}</button>`)}
    <div className="stats3">${[["AC",armorClass(ch)],["Init",fmt(initMod(ch))],["Speed",speed(ch)],["Gold",ch.gold]].map(([l,v])=>html`<div key=${l} className="stat"><div className="v">${v}</div><div className="l">${l}</div></div>`)}</div>
    ${ch.conditions.length > 0 && html`<div className="conds">${ch.conditions.map(x=>html`<span key=${x.name} className=${"chip " + (condKind(x.name)==="good"?"good":"hp")} title=${(COND_INFO[x.name]?.[1]||"") + (x.note?` (${x.note})`:"")}>${x.name}</span>`)}</div>`}
    ${Object.keys(smx).length > 0 && html`<div className="res-list"><div className="faint" style=${{fontSize:12}}>Spell slots</div>${Object.entries(smx).map(([l,n])=>html`<div key=${l} className="res-row"><span>Level ${l}</span><${Pips} max=${n} used=${ch.slotsUsed[l]||0}/></div>`)}</div>`}
    ${Object.keys(rm).length > 0 && html`<div className="res-list">${Object.entries(rm).map(([k,r])=>html`<div key=${k} className="res-row"><span>${r.label.replace(/ \(.*\)/,"")}</span>${r.pool || r.max > 8 ? html`<b>${r.max-(ch.res[k]||0)}/${r.max}</b>` : html`<${Pips} max=${r.max} used=${ch.res[k]||0} res=${true}/>`}</div>`)}</div>`}
    <div className="res-list"><div className="row" style=${{justifyContent:"space-between"}}><span className="faint" style=${{fontSize:12}}>Party (${partyMembers(c).length}/${MAX_PARTY})</span><button className="btn ghost sm" onClick=${()=>store.set({tab:"party", asideOpen:false})}>Manage</button></div>
      ${comps.length ? comps.map(m => html`<${MemberRow} key=${m.id} ch=${m} onClick=${()=>openSheet(m.id)}/>`) : html`<div className="faint" style=${{fontSize:12.5}}>No companions yet. Recruit them at a tavern.</div>`}
      ${c.companions.map(p=>html`<div key=${p.id}><div className="res-row"><span>${p.name}</span><span>${p.hp}/${p.maxHp}</span></div><${Bar} v=${p.hp} max=${p.maxHp} kind="hp"/></div>`)}</div>
  </div>`;
}
function Aside(){
  const s = useStore();
  return html`<aside className=${"aside" + (s.asideOpen ? " open" : "")} aria-label="Party status and dice">
    <div className="aside-close"><button className="btn ghost sm" onClick=${()=>store.set({asideOpen:false})}><${Icon} n="x" size=${18}/> Close</button></div>
    <${Hud}/>
    <div><h3 className="panel-title"><${Icon} n="d20" size=${18}/> Dice</h3><${DiceTray}/></div>
    <div className="faint" style=${{fontSize:12, textAlign:"center"}}>${s.saveState || (s.caps.storage==="cloud" ? "Autosaves to your account" : "Autosaves in this browser")}</div>
  </aside>`;
}

// ---------- shell ----------
const NAV = [["adventure","Adventure","scroll"],["combat","Combat","swords"],["party","Party","user"],["character","Sheets","helm"],["map","Map","map"],["quests","Quests","quest"],["journal","Journal","book"]];
function Game(){
  const s = useStore(); const c = s.campaign; if (!c) return null;
  const ch = PC(); const tab = s.tab; const go = t => store.set({tab:t, asideOpen:false});
  const lastLog = c.log[c.log.length - 1];
  const news0 = (c.news || [])[0];
  useEffect(() => {
    const st = S(); const cc = st.campaign; if (!cc || st.busy || cc.combat || st.modal || cc.pendingRoll || st.journey || st.overlay) return;
    const t = setTimeout(async () => {
      const st2 = S(); const c2 = st2.campaign; if (!c2 || st2.busy || c2.combat || st2.modal || c2.pendingRoll || st2.journey || st2.overlay) return;
      if (c2.event && currentEvent(c2)){ openModal({type:"event"}); return; }
      if (c2.showEnding){ store.camp(x => { x.showEnding = false; x.endingShown = true; }); const e = computeEnding(C());
        await runDM("event", {text: `EPILOGUE. The villain ${C().villain?.name || ""} is defeated and the main story is over. Write a moving epilogue of 150-250 words: the realm afterwards (${e.realm}), what becomes of each companion (${e.comps.map(x => `${x.name}: ${x.text}`).join(" ")}), and how history remembers the hero as "${e.title}" (${e.legend}). Do not change any state.`, offline: `${e.realm} ${e.legend}`});
        openModal({type:"epilogue"}); return; }
      const n = (c2.news || [])[0]; if (n){ store.camp(x => { x.news = (x.news || []).slice(1); }); await runDM("event", {text: n.dm, offline: n.offline}); }
    }, 700);
    return () => clearTimeout(t);
  }, [news0?.id, !!c.showEnding, !!c.event, !!s.busy, !!c.combat, !!s.modal, !!c.pendingRoll, !!s.journey]);
  useEffect(() => { const e = lastLog; if (!e || e.kind !== "sys" || Date.now() - (e.t||0) > 4000) return; const ks = (e.notes||[]).map(n => n.kind + ":" + n.text).join("|");
    if (/xp:.*(reached level|Level up available)/.test(ks)) Sfx.play("levelup"); else if (/quest:/.test(ks)) Sfx.play("quest"); else if (/loot:(\+\d+ gold|Found|Gained|Bought)/.test(ks)) Sfx.play("coin"); }, [lastLog?.id]);
  const inCombat = !!c.combat; const loc = c.locations[c.currentLocationId];
  const nav = NAV.filter(([k]) => k !== "combat" || inCombat);
  const levelDot = partyMembers(c).some(m => canLevelHere(c, m));
  const view = tab === "combat" && inCombat ? html`<${CombatView}/>` : tab === "character" ? html`<${Sheet}/>` : tab === "party" ? html`<${PartyView}/>` : tab === "map" ? html`<${MapView}/>` : tab === "quests" ? html`<${Quests}/>` : tab === "journal" ? html`<${Journal}/>` : html`<${Adventure}/>`;
  return html`<div className="shell">
    <nav className="nav" aria-label="Main">
      <div className="mark" title="The Unwritten Road">UR</div>
      ${nav.map(([k,l,ic])=>html`<button key=${k} className=${(tab===k || (k==="adventure" && tab==="combat" && !inCombat) ? "on" : "") + (k==="combat" ? " combat-live" : "")} onClick=${()=>go(k)} aria-current=${tab===k?"page":undefined}><${Icon} n=${ic}/><span>${l}</span>${k==="character" && levelDot ? html`<span className="dot"></span>` : null}</button>`)}
      <div className="spacer"></div>
      ${window.Net && html`<${ChatButton}/>`}
      ${window.Net && html`<${OnlineChip}/>`}
      <button onClick=${()=>saveNow(true)}><${Icon} n="save"/><span>Save</span></button>
      <button onClick=${()=>openModal({type:"settings"})}><${Icon} n="gear"/><span>Settings</span></button>
      <button onClick=${()=>{ const go = () => { saveNow(); store.set({view:"home", campaign:null, tab:"adventure"}); }; if (window.Net?.isOnline()) openModal({type:"confirm", text:"Leave the online room and go to the main menu?", okLabel:"Leave", ok:()=>{ window.Net.leave(); go(); }}); else go(); }}><${Icon} n="home"/><span>Home</span></button>
    </nav>
    <header className="topbar">
      <button className="btn ghost sm" onClick=${()=>{ saveNow(); store.set({view:"home", campaign:null}); }} aria-label="Home"><${Icon} n="home" size=${18}/></button>
      ${window.Net && html`<${OnlineChip}/>`}${window.Net && html`<${ChatButton}/>`}
      <div className="loc"><div className="loc-name">${loc?.name || c.name}</div><div className="faint" style=${{fontSize:11.5}}>Day ${c.time.day}, ${c.time.phase}</div></div>
      <button className="chip hp" onClick=${()=>store.set({asideOpen:true})} aria-label="Open party status and dice">${ch.hp}/${maxHp(ch)} HP</button>
      <button className="btn ghost sm" onClick=${()=>store.set({asideOpen:true})} aria-label="Dice and status"><${Icon} n="d20" size=${18}/></button>
    </header>
    <main className="main">${window.Net && html`<${SpectatorBanner}/>`}${window.Net && html`<${VoteBar}/>`}${coachFor(s.tab, c)}${view}</main>
    ${window.Net && html`<${ChatPanel}/>`}
    <${Aside}/>
    ${s.asideOpen && html`<div className="scrim" onClick=${()=>store.set({asideOpen:false})}></div>`}
    <nav className="tabbar" aria-label="Main">${nav.filter(([k]) => !["journal"].includes(k) && (k !== "adventure" || !inCombat)).map(([k,l,ic])=>html`<button key=${k} className=${(tab===k?"on":"") + (k==="combat"?" combat-live":"")} onClick=${()=>go(k)}><${Icon} n=${ic} size=${22}/><span>${l}</span>${k==="character" && levelDot ? html`<span className="dot"></span>` : null}</button>`)}
      <button onClick=${()=>openModal({type:"settings"})}><${Icon} n="gear" size=${22}/><span>More</span></button></nav>
  </div>`;
}

// ---------- Adventure ----------
function LogEntry({ e }){
  if (e.kind === "dm") return html`<div className=${"entry dm" + (e.first ? " first" : "")}><${Md} text=${e.text}/></div>`;
  if (e.kind === "player") return html`<div className="entry player"><b>${e.who ? `${e.who}${e.mode === "say" ? " says " : ": "}` : e.mode === "say" ? "You say " : "You: "}</b>${e.mode === "say" ? html`<span className="say">"${e.text.replace(/^"|"$/g,"")}"</span>` : e.text}</div>`;
  if (e.kind === "roll"){ const r = e.data || {};
    if (r.group) return html`<div className="entry roll"><div className="rollchip"><${DieFace} sides=${20} value=${"✦"} size=${30}/><span>${r.group}</span><span className=${r.success ? "ok" : "no"}>${r.success ? "Success" : "Failure"}</span></div></div>`;
    return html`<div className="entry roll"><div className="rollchip">
      <${DieFace} sides=${20} value=${r.kept} size=${30} cls=${r.crit?"crit":r.fumble?"fumble":""}/><span><b style=${{fontSize:15}}>${r.label}</b></span>
      <span>D20 → ${r.kept}${r.rolls?.length > 1 ? ` [${r.rolls.join(", ")}, ${r.adv?"advantage":"disadvantage"}]` : ""} ${r.mod>=0?"+":"−"} ${Math.abs(r.mod)} modifier${r.bonus ? ` + ${r.bonus}` : ""} = <b>${r.total}</b> vs DC ${r.dc}</span>
      <span className=${r.crit ? "crit" : r.success ? "ok" : "no"}>${r.crit ? "Critical success" : r.fumble ? "Critical failure" : r.success ? "Success" : "Failure"}</span></div></div>`; }
  if (e.kind === "sys") return html`<div className="entry sys">${(e.notes||[]).map((n,i)=>html`<span key=${i} className=${"note k-" + n.kind}>${n.text}</span>`)}</div>`;
  return null;
}
function PendingRoll(){
  const s = useStore(); const c = s.campaign; const pr = c.pendingRoll; const [who, setWho] = useState(null);
  if (!pr || s.busy) return null;
  const N = window.Net; const rollerId = pr.who || c.activeCharId; const rollerCtl = N?.isOnline() ? N.controllerOf(c, {kind:"pc", ref: rollerId, main: rollerId === c.activeCharId}) : null;
  if (N?.isOnline() && rollerCtl && rollerCtl !== N.me.id && !pr.group){
    return html`<div className="pending"><div className="what"><b>${rollLabel(pr)}</b><span className="muted" style=${{fontSize:13.5}}>${c.characters[rollerId]?.name} must roll. Waiting for ${N.playerName(rollerCtl)}…</span></div>
      ${N.isHost() && html`<button className="btn ghost sm" onClick=${()=>Net.orig.doPendingRoll({who: rollerId})}>Roll for them</button>`}</div>`;
  }
  if (spectating() && !(pr.who && rollerCtl === N.me.id)) return html`<div className="pending"><div className="what"><b>${rollLabel(pr)}</b><span className="muted" style=${{fontSize:13.5}}>Waiting for the host to roll…</span></div></div>`;
  const members = partyMembers(c).filter(m => m.hp > 0);
  const whoId = who || pr.who || c.activeCharId; const ch = c.characters[whoId] || PC();
  const info = checkModifiers(ch, pr); const main = PC();
  return html`<div className="pending">
    <div className="what"><b>${pr.group ? `Group ${rollLabel(pr)}` : rollLabel(pr)}</b><span className="muted" style=${{fontSize:13.5}}>${pr.reason ? cap(pr.reason) + ". " : ""}${pr.group ? "Everyone rolls; half the party must succeed." : `${ch.name}: modifier ${fmt(info.mod)}${info.adv && !info.dis ? " · advantage" : ""}${info.dis && !info.adv ? " · disadvantage" : ""}${info.why.length ? ` (${info.why.join(", ")})` : ""}`}</span></div>
    ${!pr.group && members.length > 1 && !spectating() && html`<div className="who-pick" role="group" aria-label="Who attempts it?">${members.map(m => { const mm = checkModifiers(m, pr).mod; return html`<button key=${m.id} className=${m.id === whoId ? "on" : ""} onClick=${()=>setWho(m.id)} title=${m.name}>${firstName(m.name)} <b>${fmt(mm)}</b></button>`; })}</div>`}
    <div className="row wrap" style=${{gap:6}}>
      ${!pr.group && main.inspiration && !info.adv && html`<button className="btn gold sm" onClick=${()=>doPendingRoll({inspiration:true, who: whoId})}>★ Inspiration</button>`}
      ${!pr.group && resLeft(ch,"luck") > 0 && !info.adv && html`<button className="btn ghost sm" onClick=${()=>doPendingRoll({luck:true, who: whoId})}>Spend luck</button>`}
      <button className="btn primary" onClick=${()=>doPendingRoll({who: whoId})}><${Icon} n="d20" size=${18}/> Roll</button></div>
  </div>`;
}
function PlaceBar(){
  const s = useStore(); const c = s.campaign; const busy = !!s.busy || !!c.combat || !!c.pendingRoll;
  const town = townOf(c); const here = topLoc(c, c.currentLocationId); const d = dungeonOf(c);
  if (d){ const r = roomOf(c); const loc = c.locations[c.explore.loc];
    return html`<div className="placebar dungeon"><span className="pb-title"><${Icon} n="dungeon" size=${16}/> ${r.name} <span className="faint">· ${loc.name}</span></span>
      ${roomBlocked(r) && !c.combat && html`<button className="chip svc danger" disabled=${!!s.busy} onClick=${engageRoom}><${Icon} n="swords" size=${15}/> Fight!</button>`}
      <button className="chip" disabled=${busy} onClick=${()=>store.set({tab:"map"})}>Dungeon map</button>
      <button className="chip" disabled=${busy || r.searched || roomBlocked(r)} onClick=${searchRoom}>${r.searched ? "Searched" : "Search room"}</button>
      <button className="chip" disabled=${busy || roomBlocked(r)} onClick=${restInDungeon}>Short rest</button>
      ${!roomBlocked(r) && html`<button className="chip" disabled=${busy} onClick=${leaveDungeon}>${r.type === "entrance" ? "Leave" : "Leave (retrace steps)"}</button>`}
      ${dungeonOf(c).cleared && html`<span className="chip good">Conquered ✓</span>`}</div>`; }
  const btns = [];
  if (town){ const v = standing(c, town); btns.push(html`<span key="st" className=${"chip standing " + standingLabel(v).toLowerCase()} title=${`Your standing in ${town.name}: ${v}. It affects prices and how people treat you.`}>${standingLabel(v)}</span>`); }
  if (here?.fallen) btns.push(html`<span key="fallen" className="chip hp">Occupied by ${c.villain?.name || "the enemy"}</span>`);
  if (town) for (const sv of servicesOf(town)) btns.push(html`<button key=${sv} className="chip svc" disabled=${busy} onClick=${()=>["market","smith"].includes(sv) ? openShop(town.id, sv) : openModal({type:"service", svc: sv, town: town.id})}><${Icon} n=${SERVICE_INFO[sv].icon} size=${15}/> ${SERVICE_INFO[sv].label}</button>`);
  if (isDelvable(here)) btns.push(html`<button key="delve" className="chip svc danger" disabled=${busy} onClick=${()=>enterDungeon(here.id)}><${Icon} n="dungeon" size=${15}/> ${here.fallen ? `Liberate ${here.name}` : here.dungeon ? (here.cleared ? `Revisit ${here.name}` : `Delve into ${here.name}`) : `Explore ${here.name}`}</button>`);
  btns.push(html`<button key="travel" className="chip" disabled=${busy} onClick=${()=>store.set({tab:"map"})}><${Icon} n="road" size=${15}/> Travel</button>`);
  return html`<div className="placebar">${btns}</div>`;
}
function trackedQuest(c){ const act = Object.values(c.quests).filter(q => q.status === "active"); const here = topLoc(c, c.currentLocationId)?.id;
  return act.find(q => q.auto?.loc && q.auto.loc === here) || act.find(q => q.id === (S().trackedLocal || c.trackedQuest)) || act.find(q => q.kind === "main") || act[0] || null; }
function questTarget(c, q){ if (!q) return null; const l = q.auto?.loc ? c.locations[q.auto.loc] : (q.kind === "main" && c.villain?.lair) ? c.locations[c.villain.lair] : null; return l && !l.hidden && l.discovered !== false ? l : (l && q.auto ? l : null); }
function QuestTracker(){
  const s = useStore(); const c = s.campaign; const q = trackedQuest(c); if (!q) return null;
  const obj = (q.objectives || []).find(o => !o.done && !o.optional) || (q.objectives || []).find(o => !o.done);
  const tgt = questTarget(c, q); const here = tgt && topLoc(c, c.currentLocationId)?.id === tgt.id;
  return html`<div className="tracker"><span className="qmark">!</span><button className="tr-main" onClick=${()=>store.set({tab:"quests"})} title="Open the quest log"><b>${q.title}</b>${obj ? html`<span>${obj.text}</span>` : q.summary ? html`<span>${q.summary}</span>` : null}</button>
    ${tgt && !here && html`<button className="chip" onClick=${()=>store.set({tab:"map", mapSel: tgt.id})}><${Icon} n="map" size=${14}/> ${tgt.name}</button>`}
    ${tgt && here && html`<span className="chip good">You're here</span>`}</div>`;
}
function Adventure(){
  const s = useStore(); const c = s.campaign; const ch = PC();
  const [text, setText] = useState(""); const [mode, setMode] = useState("do");
  const logRef = useRef(null);
  const loc = c.locations[c.currentLocationId]; const parent = loc?.parent && c.locations[loc.parent];
  const entries = c.log.slice(-80);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [c.log.length, s.stream, s.busy, s.dmError, !!c.pendingRoll, (c.choices||[]).length]);
  const busy = !!s.busy; const blocked = busy || !!c.pendingRoll || !!c.combat; const guest = spectating();
  const send = (t = text, m = mode) => { const v = t.trim(); if (!v || blocked) return; runDM("action", {text: m === "say" ? `"${v.replace(/^"|"$/g,"")}"` : v, mode: m, who: onlineWho()}); setText(""); if (spectating()) toast("Sent to the table. The DM answers everyone together."); };
  const casters = partyMembers(c).filter(m => castInfo(m));
  const quick = [
    ["Look around", () => runDM("action", {text:"We take a careful look around."})],
    ...(companionsOf(c).length ? [["Talk to the party", () => runDM("action", {text:"I turn to my companions and ask what they make of all this."})]] : []),
    ...([
    ...(casters.length ? [["Cast a spell…", () => openModal({type:"cast"})]] : []),
    ["Use an item…", () => openModal({type:"items"})],
    ...(!townOf(c) && !c.explore && topLoc(c, c.currentLocationId) && !isSettlement(topLoc(c, c.currentLocationId)) ? [["Forage", forage]] : []),
    ["Craft…", () => openModal({type:"craft"})],
    ["Short rest", () => openModal({type:"shortrest"})]]),
    ...(!c.explore ? [["Make camp", coopCamp]] : []),
    ...(c.shop ? [[`Shop: ${c.shop.name}`, () => openModal({type:"shop"})]] : []),
    ...(ch.invocations?.includes("Fiendish Vigor") && !guest ? [["Fiendish Vigor", () => store.camp((c,ch)=>{ const t = 4 + d(4); ch.tempHp = Math.max(ch.tempHp||0, t); sysNote(c, {kind:"xp", text:`Fiendish Vigor: ${t} temporary HP`}); })]] : [])
  ];
  const genesis = s.busy === "genesis";
  const choices = !blocked ? (c.choices || []) : [];
  return html`<div className="adv">
    <div className="adv-head">
      <div className="loc-ico"><${Icon} n=${loc?.type || "road"}/></div>
      <div className="place"><h2>${loc?.name || "The road"}</h2><div className="sub">${parent ? `${parent.name} · ` : ""}${c.world?.name ? `${c.world.name} · ` : ""}Day ${c.time.day}, ${c.time.phase}</div></div>
      <button className="btn ghost sm" onClick=${()=>store.set({tab:"map"})}><${Icon} n="map" size=${16}/> Map</button>
    </div>
    <${PlaceBar}/>
    <${QuestTracker}/>
    <div className="story" ref=${logRef}><div className="scroll-page parch" aria-live="polite">
      ${entries.length === 0 && !busy && html`<div className="entry dm"><p className="muted">The page is blank. Say what you do.</p></div>`}
      ${entries.map(e=>html`<${LogEntry} key=${e.id} e=${e}/>`)}
      ${busy && s.busy !== "combat" && (s.stream ? html`<div className="entry dm streaming"><${Md} text=${s.stream}/></div>`
        : html`<div className="thinking"><span className="candle"></span><span>${genesis ? "The Dungeon Master is building your world…" : "The Dungeon Master considers…"}</span><button className="btn ghost sm" onClick=${stopDM}>Stop</button></div>`)}
      ${s.dmError && html`<div className="banner bad" style=${{margin:"10px 0"}}><span className="grow">${s.dmError}</span>${s.lastRequest && s.retryable !== false && html`<button className="btn sm" onClick=${()=>{ const r = S().lastRequest; store.set({dmError:null}); if (r.kind === "action"){ store.camp(c => { const last = c.log[c.log.length-1]; if (last?.kind === "player") c.log.pop(); }); } runDM(r.kind, r.payload); }}>Try again</button>`}</div>`}
      ${choices.length > 0 && html`<div className="choices" role="group" aria-label="Dialogue choices">${choices.map((x,i)=>html`<button key=${i} className="choice" onClick=${()=>coopDialogue(i)}>${x.skill ? html`<span className="tag">${x.skill}</span>` : html`<span className="tag talk">›</span>`}${x.text}</button>`)}</div>`}
    </div><${PendingRoll}/></div>
    ${c.combat ? html`<div className="banner" style=${{margin:"0 16px 12px"}}><${Icon} n="swords"/><span className="grow">Battle is underway.</span><button className="btn primary sm" onClick=${()=>store.set({tab:"combat"})}>To combat</button></div>`
    : html`<div className="composer"><div className="composer-inner">
      <${CoopQueue}/>
      ${(c.hints||[]).length > 0 && html`<div className="quick">${c.hints.map((h,i)=>html`<button key=${i} className="chip hint" disabled=${blocked} onClick=${()=>setText(h)}>💡 ${h}</button>`)}</div>`}
      <div className="quick">${quick.map(([l,f])=>html`<button key=${l} className="chip" disabled=${blocked} onClick=${f}>${l}</button>`)}</div>
      <div className="box">
        <${Seg} value=${mode} options=${[["do","Do"],["say","Say"]]} onChange=${setMode}/>
        <textarea rows=${2} value=${text} maxLength=${1200} disabled=${blocked}
          placeholder=${c.pendingRoll ? "Roll the dice first…" : spectating() && !busy ? `What does ${(window.Net.mySeat() && c.characters[window.Net.mySeat()]?.name.split(" ")[0]) || "your character"} do?` : busy ? "The Dungeon Master is speaking…" : mode === "say" ? "What do you say?" : "What do you do? Anything goes: sneak, bargain, climb, lie, cast…"}
          onInput=${e=>setText(e.target.value)} onKeyDown=${e=>{ if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} aria-label="Your action"></textarea>
        <button className="btn primary" disabled=${blocked || !text.trim()} onClick=${()=>send()} aria-label="Send"><${Icon} n="send" size=${18}/></button>
      </div>
    </div></div>`}
  </div>`;
}
</script>
