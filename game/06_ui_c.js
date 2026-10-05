<script>
"use strict";
// ---------- Combat animation player ----------
const DT_COLOR = { fire:"#ff9442", cold:"#8fdcff", lightning:"#ffe65c", thunder:"#c9b8ff", acid:"#b4ec5f", poison:"#86e25d", necrotic:"#b88cff", radiant:"#fff0a8", force:"#e09cff", psychic:"#ff94dc", slashing:"#ff6b5e", piercing:"#ff6b5e", bludgeoning:"#ff7a5e" };
const cbEl = id => document.querySelector(`[data-cb="${CSS.escape(id)}"]`);
function fxText(el, text, cls, color){ if (!el) return; const s = document.createElement("span"); s.className = "fx-float " + (cls||""); s.textContent = text; if (color) s.style.color = color; s.style.left = `${38 + Math.random()*24}%`; el.appendChild(s); setTimeout(() => s.remove(), 1600); }
function fxBurst(el, color, big){ if (!el) return; const b = document.createElement("span"); b.className = "fx-burst" + (big ? " big" : ""); b.style.setProperty("--fx", color); el.appendChild(b); setTimeout(() => b.remove(), 700); }
function fxBolt(fromEl, toEl, color){
  if (!fromEl || !toEl) return; const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const o = document.createElement("span"); o.className = "fx-bolt"; o.style.setProperty("--fx", color); document.body.appendChild(o);
  const x0 = a.left + a.width/2, y0 = a.top + a.height/2, x1 = b.left + b.width/2, y1 = b.top + b.height/2;
  o.animate([{ transform:`translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 }, { transform:`translate(${x0}px,${y0}px) scale(1)`, opacity: 1, offset: .15 }, { transform:`translate(${x1}px,${y1}px) scale(1.3)`, opacity: 1 }], { duration: 330, easing: "cubic-bezier(.5,0,.8,1)" }).onfinish = () => o.remove();
}
const SHAKE = [{transform:"translateX(0)"},{transform:"translateX(-7px) rotate(-1deg)"},{transform:"translateX(6px) rotate(1deg)"},{transform:"translateX(-4px)"},{transform:"translateX(3px)"},{transform:"translateX(0)"}];
const FX_SOUND = { lunge: f => f.spell ? ["spell", {dt: f.dt}] : f.ranged ? ["bolt"] : ["swing"], dmg: f => ["hit", {dt: f.dt}], crit: () => ["crit"], miss: () => ["miss"], heal: () => ["heal"], down: () => ["down"], cond: f => f.good ? ["buff"] : null, phase: () => ["alert"] };
function playFx(f, root, motion=true){
  const snd = FX_SOUND[f.k]?.(f); if (snd) Sfx.play(snd[0], {...(snd[1]||{}), gap: 30});
  if (!motion) return;
  const to = f.to && cbEl(f.to), from = f.from && cbEl(f.from); const col = DT_COLOR[f.dt] || "#ff6b5e";
  switch (f.k){
    case "lunge": {
      if (from){ const up = from.closest(".party-side") ? -1 : 1; from.animate([{transform:"translate(0,0) scale(1)"},{transform:`translate(0,${up*16}px) scale(1.05)`, offset:.4},{transform:"translate(0,0) scale(1)"}], {duration: 360, easing:"ease-out"}); }
      if (f.ranged && f.spell && to) projectile(from, to, SFX_COL[f.dt] || SFX_COL.arcane, f.dt === "fire" ? "fire" : f.dt === "cold" ? "shard" : f.dt === "acid" ? "blob" : "dart", 320).then(() => { if (f.dt === "lightning") lightning(from, to, SFX_COL.lightning); });
      else if (f.ranged) fxBolt(from, to, "#f3e6c4");
      break; }
    case "dmg": if (to){ to.animate(SHAKE, {duration: 320}); fxBurst(to, col); fxText(to, `-${f.n}`, "dmg", col); } break;
    case "crit": if (to){ to.animate(SHAKE.map(k => ({...k, transform: k.transform.replace(/(-?\d+)px/, (m, n) => (n*1.8)+"px")})), {duration: 420}); fxBurst(to, "#ffd24a", true); fxText(to, `CRIT! -${f.n}`, "crit", "#ffd24a"); }
      root?.animate([{transform:"translate(0,0)"},{transform:"translate(-5px,3px)"},{transform:"translate(5px,-3px)"},{transform:"translate(-3px,2px)"},{transform:"translate(0,0)"}], {duration: 380}); break;
    case "miss": if (to){ to.animate([{transform:"translateX(0)"},{transform:"translateX(12px) rotate(2deg)"},{transform:"translateX(0)"}], {duration: 340, easing:"ease-out"}); fxText(to, f.fumble ? "Fumble!" : "Miss", "miss"); } break;
    case "heal": if (to){ to.animate([{boxShadow:"0 0 0 0 rgba(111,227,161,0)"},{boxShadow:"0 0 22px 6px rgba(111,227,161,.75)"},{boxShadow:"0 0 0 0 rgba(111,227,161,0)"}], {duration: 700}); fxText(to, `+${f.n}`, "heal", "#6fe3a1"); } break;
    case "down": if (to){ to.animate([{transform:"scale(1)", filter:"none"},{transform:"scale(1.06)", filter:"brightness(1.8)", offset:.2},{transform:"scale(.94) rotate(-2deg)", filter:"grayscale(1) brightness(.6)"}], {duration: 650, easing:"ease-in"}); fxText(to, f.boss ? "☠ SLAIN ☠" : "✕", "slain"); } break;
    case "cast": spellFx(f, cbEl); break;
    case "cond": if (to) fxText(to, f.n, "cond" + (f.good ? " good" : ""), f.good ? "#8ff0c0" : "#ffc0a0"); break;
    case "phase": if (to){ fxBurst(to, "#ff3b2f", true); fxText(to, "!!", "crit", "#ff5a4a"); }
      root?.animate([{boxShadow:"inset 0 0 0 0 rgba(178,55,45,0)"},{boxShadow:"inset 0 0 140px 30px rgba(178,55,45,.65)"},{boxShadow:"inset 0 0 0 0 rgba(178,55,45,0)"}], {duration: 1100}); break;
  }
}
function useCombatFx(cm, rootRef){
  const seen = useRef(null);
  const last = cm?.fx?.length ? cm.fx[cm.fx.length - 1].id : null;
  useEffect(() => {
    const list = cm?.fx || [];
    if (!seen.current){ seen.current = new Set(list.map(f => f.id)); return; }
    const fresh = list.filter(f => !seen.current.has(f.id)); fresh.forEach(f => seen.current.add(f.id));
    if (!fresh.length) return;
    const motion = !(S().settings.reduceMotion || S().settings.diceAnim === "off");
    let delay = 0;
    for (const f of fresh){ if (Date.now() - f.at > 5000) continue; setTimeout(() => playFx(f, rootRef.current, motion), delay); delay += f.k === "cast" ? (f.noProjectile ? 180 : f.area ? 720 : 560) : f.k === "lunge" ? (f.ranged ? 300 : 170) : f.k === "cond" ? 90 : 200; }
  }, [last]);
}

// chance to hit / chance the target fails its save, computed on a copy so previews never consume conditions
function hitPreview(c, me, tgt, a){
  try {
    const cc = {...c, combat: structuredClone(c.combat), characters: structuredClone(c.characters)};
    const att = cc.combat.cbt[me.id], t = cc.combat.cbt[tgt.id]; if (!att || !t) return null;
    const am = attackMods(cc, att, t, a); const ch = cbChar(cc, att);
    let p = pHit(a.toHit + (ch && hasCond(ch, "blessed") ? 2.5 : 0) - (ch && hasCond(ch, "cursed") ? 2 : 0), acOf(cc, t) + coverBonus(cc, att, t, a));
    const adv = am.adv && !am.dis, dis = am.dis && !am.adv;
    if (adv) p = 1 - (1 - p) ** 2; else if (dis) p = p * p;
    return { p, adv, dis };
  } catch { return null; }
}
function savePreview(dc, tgt, ab){ const mod = tgt?.mods?.[ab] || 0; return clamp((dc - 1 - mod) / 20, 0.05, 0.95); }
const pct = p => `${Math.round(p * 100)}%`;
// ---------- Combat ----------
function CombatView(){
  const s = useStore(); const c = s.campaign; const cm = c.combat; const ui = s.combatUI || {};
  const [tab, setTab] = useState("attack"); const [custom, setCustom] = useState(""); const logRef = useRef(null); const fieldRef = useRef(null);
  useCombatFx(cm, fieldRef);
  const objStatus = cm?.objective?.status;
  useEffect(() => { if (objStatus === "done") Sfx.play("quest"); else if (objStatus === "failed") Sfx.play("alert"); }, [objStatus]);
  const endStatus = cm?.status;
  useEffect(() => { if (endStatus === "victory" || endStatus === "surrender") setTimeout(() => Sfx.play("victory"), 500); else if (endStatus === "defeat" || endStatus === "dead") setTimeout(() => Sfx.play("defeat"), 500); }, [endStatus]);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [cm?.log.length]);
  if (!cm) return null;
  const setUI = p => store.set({combatUI: {...S().combatUI, ...p}});
  const cur = curCb(c); const me = actorCb(c); const ch = cbChar(c, me);
  const myTurn = isMyTurn(c) && !s.busy && !s.overlay;
  const otherCtl = window.Net?.isOnline() && me ? Net.controllerOf(c, me) : null; const othersTurn = !!otherCtl && otherCtl !== Net.me.id; const endcard = cm.status !== "active";
  const foes = enemies(c); const upFoes = foes.filter(e => isUp(c,e));
  const sel = (ui.target && cm.cbt[ui.target] && isUp(c, cm.cbt[ui.target])) ? ui.target : (cm.focus && cm.cbt[cm.focus] && isUp(c, cm.cbt[cm.focus]) ? cm.focus : upFoes[0]?.id);
  const selCb = cm.cbt[sel];
  const allies = party(c).filter(p => !p.fled);
  const ally = ui.ally && cm.cbt[ui.ally] && cm.cbt[ui.ally].side === "party" ? ui.ally : null;
  const pt = cm.pt || {};
  const down = ch && ch.hp <= 0 && !ch.dead;
  const incap = me && condsOf(c, me).find(n => ["paralyzed","stunned","asleep"].includes(n) && ch.hp > 0);
  const pickFoe = id => { setUI({target:id}); store.camp(c => { if (c.combat) c.combat.focus = id; }); };
  const meRef = useRef(null); const [logOpen, setLogOpen] = useState(false);
  useEffect(() => { if (myTurn && window.innerWidth <= 1000) meRef.current?.scrollIntoView({block:"nearest", behavior: S().settings.reduceMotion ? "auto" : "smooth"}); }, [myTurn, cur?.id]);
  useEffect(() => {
    const onKey = e => {
      if (!C()?.combat || e.target.closest?.("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey || S().modal) return;
      const k = e.key.toLowerCase();
      if (k === "e" || k === "enter"){ const b = [...document.querySelectorAll(".me .btn")].find(x => /End turn/.test(x.textContent)); if (b && !b.disabled){ e.preventDefault(); b.click(); } return; }
      if (k === "t"){ const up = enemies(C()).filter(x => isUp(C(), x)); if (!up.length) return; const i = up.findIndex(x => x.id === sel); pickFoe(up[(i + 1) % up.length].id); e.preventDefault(); return; }
      if (/^[1-9]$/.test(k)){ const btns = [...document.querySelectorAll(".act-list button.act:not([disabled]), .act-list .act.spell .btn.primary:not([disabled])")]; const b = btns[+k - 1]; if (b){ e.preventDefault(); b.click(); } return; }
      const tabKeys = {a:"attack", s:"spells", b:"abilities", i:"items", m:"moves"}; if (tabKeys[k] && tabs.some(([t]) => t === tabKeys[k])){ setTab(tabKeys[k]); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  const Foe = ({e}) => { const pct = e.hp/e.maxHp; const st = e.dead ? "slain" : e.fled ? "fled" : pct > .75 ? "unhurt" : pct > .4 ? "wounded" : pct > 0 ? "bloodied" : "down";
    const reach = me ? canReach(c, me, e, true) : true;
    return html`<button data-cb=${e.id} className=${"foe" + (e.id===sel?" sel":"") + (!isUp(c,e)?" dead":" targetable") + (cur?.id===e.id?" acting":"") + (e.boss?" boss":"")} disabled=${!isUp(c,e)} onClick=${()=>pickFoe(e.id)} aria-pressed=${e.id===sel}>
      <div className="fn"><${MonsterPortrait} e=${e} size=${26} className="mini"/>${e.name}</div><span className="ac">AC ${e.ac}</span>
      <${Bar} v=${Math.max(0,e.hp)} max=${e.maxHp} kind="enemy"/>
      <div className="hpn"><span>${e.type}${!reach && isUp(c,e) ? " · out of reach" : ""}</span><span>${Math.max(0,e.hp)}/${e.maxHp} · ${st}</span></div>
      ${e.conds.length > 0 && html`<div className="conds">${e.conds.map(x=>html`<span key=${x.n} className="chip hp" title=${ENEMY_COND_TEXT[x.n]||COND_INFO[x.n]?.[1]||""}>${x.n}${x.rounds?` ${x.rounds}`:""}</span>`)}</div>`}
    </button>`; };
  const Hero = ({p}) => { const pc = cbChar(c, p); const hp = hpOf(c,p), mx = maxHpOf(c,p); const isMe = me && p.id === me.id;
    return html`<button data-cb=${p.id} className=${"hcard" + (isMe?" me-now":"") + (ally===p.id?" sel":"") + (!isUp(c,p)?" downed":"") + (cur?.id===p.id?" acting":"")} onClick=${()=>setUI({ally: ally===p.id ? null : p.id})} aria-pressed=${ally===p.id} title="Select as the target for healing, help or buffs">
      <div className="row" style=${{justifyContent:"space-between", gap:6}}><span className="hn">${pc ? html`<${Portrait} ch=${pc} size=${24} className="mini"/>` : null}${pc ? firstName(pc.name) : p.name}${pc?.dead ? " †" : ""}</span><span className="faint" style=${{fontSize:11.5}}>${pc ? `${pc.cls} ${pc.level}` : "ally"}</span></div>
      <${Bar} v=${Math.max(0,hp)} max=${mx} kind="hp" low=${hp <= mx/3}/>
      <div className="hpn"><span>${Math.max(0,hp)}/${mx}${pc?.tempHp ? ` +${pc.tempHp}` : ""} · AC ${acOf(c,p)}</span>${seatInfo(p.ref || pc?.id) ? html`<span className=${"ctrl seat" + (seatInfo(p.ref || pc?.id).mine ? " you" : "")} title="Played by">${seatInfo(p.ref || pc?.id).name}</span>` : pc && !p.main && html`<span className=${"ctrl " + (pc.companion?.ctrl === "manual" ? "you" : "")} onClick=${ev=>{ ev.stopPropagation(); store.camp(c=>{ const x = c.characters[pc.id]; x.companion.ctrl = x.companion.ctrl === "manual" ? "ai" : "manual"; }); setTimeout(combatLoop, 50); }} title="Toggle who controls this companion">${pc.companion?.ctrl === "manual" ? "You" : "AI"}</span>`}</div>
      ${condsOf(c,p).length > 0 && html`<div className="conds">${condsOf(c,p).slice(0,4).map(n=>html`<span key=${n} className=${"chip " + (condKind(n)==="good"?"good":"hp")}>${n}</span>`)}</div>`}
    </button>`; };
  const lines = (list, render) => ["front","back"].map(pos => { const xs = list.filter(x => x.pos === pos); return xs.length ? html`<div key=${pos} className="battle-line"><span className="line-label">${pos === "front" ? "Front" : "Back"}</span><div className="line-cards">${xs.map(render)}</div></div>` : null; });
  const weapons = ch ? weaponAttacks(ch) : []; const ci = ch ? castInfo(ch) : null;
  const spells = ch && ci ? knownSpells(ch) : [];
  const usable = ch ? ch.inventory.filter(i => i.type === "potion" || i.type === "scroll") : [];
  const abilities = me && !endcard ? combatAbilities(c) : [];
  const targetsFor = sp => [sel, ...upFoes.map(e=>e.id).filter(id=>id!==sel)].filter(Boolean).slice(0, sp.m.tgt || 1);
  const act = fn => { if (myTurn) fn(); };
  const tabs = [["attack","Attack"],...(spells.length?[["spells","Spells"]]:[]),["abilities","Abilities"],["items","Items"],["moves","Move & act"],["custom","Custom"]];
  const slotLevels = sp => sp.l === 0 ? [] : Object.keys(slotMax(ch)).map(Number).filter(l => l >= sp.l && slotsLeft(ch, l) > 0);
  const dyingAlly = allies.find(p => p.kind === "pc" && p.id !== me?.id && hpOf(c,p) <= 0 && !cbChar(c,p).dead && !hasCond(cbChar(c,p),"stable"));
  return html`<div className="combat">
    <div className="initiative" aria-label="Turn order">${cm.order.map(id=>{ const cb = cm.cbt[id]; if (!cb) return null; const gone = !isUp(c, cb) && !(cb.kind === "pc" && !cbChar(c,cb).dead);
      return html`<div key=${id} className=${"token " + cb.side + (cur?.id===id && !endcard ? " now" : "") + (gone ? " down" : "")} title=${`${cb.name} (initiative ${cb.init})`}><span className="face">${cb.init}</span><span>${cb.main ? "You" : cb.kind === "pc" ? firstName(cb.name) : cb.name}</span></div>`; })}
      <span className="round" style=${{marginLeft:"auto", paddingLeft:8}}>Round ${cm.round}</span></div>
    <${BossIntro} cm=${cm}/>
    ${cm.objective && html`<div className=${"objective " + cm.objective.status}><span className="obj-ico">🎯</span><b>${cm.objective.text}</b><span className="obj-prog">${objectiveProgress(c)}</span></div>`}
    ${cm.reinforce && !cm.reinforce.done && cm.round >= cm.reinforce.round - 1 && html`<div className="objective warn"><span className="obj-ico">⚠</span><span>You hear more footsteps approaching…</span></div>`}
    <${Battlefield} c=${c} cm=${cm} sel=${sel} ally=${ally} cur=${cur} myTurn=${myTurn} onFoe=${pickFoe} onAlly=${id => setUI({ally: ally === id ? null : id})}/>
    <div className="combat-body">
      <div className="combat-col scroll" ref=${fieldRef}>
        <div className="side-block foes-side"><div className="side-label">Enemies</div>${lines(foes, e => html`<${Foe} key=${e.id} e=${e}/>`)}</div>
        <div className="side-block party-side"><div className="side-label">Your party</div>${lines(allies, p => html`<${Hero} key=${p.id} p=${p}/>`)}</div>
        <div className="me parch" ref=${meRef}>
          ${endcard ? html`<${CombatEnd}/>`
          : othersTurn ? html`<div className="waiting"><span className="candle sm"></span> ${Net.playerName(otherCtl)} is choosing ${firstName(cur.name)}'s move… <${TurnTimer}/></div>`
          : !me || !isPlayerCtrl(c, me) ? html`<div className="waiting"><span className="candle sm"></span> ${cur ? (cur.kind === "pc" ? `${firstName(cur.name)} is deciding what to do…` : `${cur.name} is acting…`) : "…"}</div>`
          : down ? html`<div className="deathsave"><div className="t">${ch.name} is dying.</div>
              <div className="row" style=${{gap:18, justifyContent:"center"}}><span>Successes <${Pips} max=${3} used=${3-ch.deathSaves.s} res=${true}/></span><span>Failures <${Pips} max=${3} used=${3-ch.deathSaves.f}/></span></div>
              ${myTurn ? html`<button className="btn primary lg" onClick=${pcDeathSave}><${Icon} n="d20" size=${20}/> Roll death save</button>` : html`<p className="faint">Waiting…</p>`}</div>`
          : html`<div>
            <div className="row wrap" style=${{gap:10, justifyContent:"space-between"}}><b className="actor-name">${window.Net?.isGuest() ? html`<${TurnTimer}/> ` : ""}${ch.name}'s turn${hasCond(ch,"wildshape") && ch.wild ? ` (${ch.wild.form})` : ""} <span className="faint" style=${{fontWeight:400}}>· ${me.pos} line</span></b>
              <div className="econ"><span className=${"pipl" + (pt.action||pt.attacksLeft ? "" : " used")}>Action${pt.attacksLeft ? ` (${pt.attacksLeft} more)` : ""}</span><span className=${"pipl" + (pt.bonus ? "" : " used")}>Bonus</span><span className=${"pipl mv" + (pt.move ? "" : " used")}>Move</span></div></div>
            <div className="act-tabs" role="tablist">${tabs.map(([k,l])=>html`<button key=${k} role="tab" className=${tab===k?"on":""} onClick=${()=>setTab(k)} aria-selected=${tab===k}>${l}</button>`)}</div>
            ${incap && html`<div className="banner bad" style=${{marginTop:8}}>${ch.name} is ${incap} and can't act this turn.</div>`}
            <div className=${"act-list" + (!myTurn || incap ? " locked" : "")}>
              ${tab==="attack" && weapons.map(w=>{ const blocked = w.melee && selCb && !canReach(c, me, selCb, true); const hp = selCb && !blocked && myTurn ? hitPreview(c, me, selCb, {...w, toHit: w.toHit - (ui.power && w.heavy ? 5 : 0)}) : null;
                return html`<button key=${w.id} className="act" disabled=${!myTurn || !!incap || !(pt.action || pt.attacksLeft) || blocked} title=${blocked ? "That enemy is behind their front line" : ""} onClick=${()=>act(()=>pcAttack(w.id, sel, {power: ui.power && w.heavy}))}>
                <span className="an">${w.name}${w.stowed?" (swap)":""}${hp && html`<span className=${"hitp" + (hp.p >= .65 ? " good" : hp.p < .4 ? " bad" : "")}>${pct(hp.p)}${hp.adv ? " ▲" : hp.dis ? " ▼" : ""}</span>`}</span><span className="ad">${fmt(w.toHit)} to hit, ${w.dmg} ${w.t}${w.ranged?", ranged":", melee"}${blocked ? " · can't reach" : ""}</span></button>`; })}
              ${tab==="attack" && (ch.feats||[]).some(f=>f==="Great Weapon Master"||f==="Sharpshooter") && html`<label className="act" style=${{flexDirection:"row",alignItems:"center",gap:8}}><input type="checkbox" checked=${!!ui.power} onChange=${e=>setUI({power:e.target.checked})}/> Power attack (−5 to hit, +10 damage, heavy weapons)</label>`}
              ${tab==="spells" && spells.map(sp=>{ const err = canCastNow(c, sp, {quicken: ui.quicken}); const lv = slotLevels(sp); const chosen = ui["slot_"+sp.n] && lv.includes(ui["slot_"+sp.n]) ? ui["slot_"+sp.n] : lv[0];
                return html`<div key=${sp.n} className=${"act spell" + (err?" dis":"")}>
                  <div className="row" style=${{justifyContent:"space-between", gap:6}}><span className="an">${sp.n}${(() => { if (!selCb || !myTurn || err || !ci) return null; if (sp.m.k === "atk"){ const hp = hitPreview(c, me, selCb, {toHit: ci.atk, melee: !!sp.m.melee, ranged: !sp.m.melee, spell: true}); return hp && html`<span className=${"hitp" + (hp.p >= .65 ? " good" : hp.p < .4 ? " bad" : "")}>${pct(hp.p)}</span>`; } if (sp.m.k === "save" && sp.m.save){ const p = savePreview(ci.dc, selCb, sp.m.save); return html`<span className=${"hitp" + (p >= .65 ? " good" : p < .4 ? " bad" : "")} title=${`Chance ${selCb.name} fails the ${sp.m.save} save`}>${pct(p)}</span>`; } return null; })()}</span><span className="faint" style=${{fontSize:12}}>${sp.l ? `L${sp.l}` : "cantrip"}${sp.m.bonus?" · bonus":""}${sp.m.conc?" · conc.":""}</span></div>
                  <span className="ad">${sp.d}</span>
                  <div className="row" style=${{gap:6, marginTop:4}}>${lv.length > 1 && html`<select className="input" style=${{width:"auto", padding:"2px 6px"}} value=${chosen} onChange=${e=>setUI({["slot_"+sp.n]: +e.target.value})} aria-label="Slot level">${lv.map(l=>html`<option key=${l} value=${l}>Level ${l}</option>`)}</select>`}
                    <button className="btn sm primary" disabled=${!myTurn || !!err || !!incap} title=${err||""} onClick=${()=>act(()=>{ pcCast(sp.n, {slot: chosen, targets: targetsFor(sp), allyId: ally, quicken: ui.quicken && !sp.m.bonus}); if (ui.quicken && !sp.m.bonus) setUI({quicken:false}); })}>${err && sp.m.k !== "react" ? err : sp.m.k==="react" ? "Automatic" : "Cast"}</button>
                    ${sp.m.k === "save" && (sp.m.tgt||1) >= 3 && !err && ["front","back"].map(pos => { const n = lineTargets(c, "enemy", pos).length; return html`<button key=${pos} className="btn sm ghost" disabled=${!myTurn || !n || !!incap} title=${`Hit everyone in the enemy ${pos} line`} onClick=${()=>act(()=>pcCast(sp.n, {slot: chosen, targets: lineTargets(C(), "enemy", pos).map(x=>x.id).slice(0, (sp.m.tgt||3) + 1), allyId: ally}))}>${pos === "front" ? "Front" : "Back"} line (${n})</button>`; })}</div>
                </div>`; })}
              ${tab==="abilities" && (abilities.length ? abilities.map(a=>html`<button key=${a.key} className="act" disabled=${!myTurn || !!a.disabled || !!incap} title=${a.disabled||""} onClick=${()=>act(()=>pcAbility(a.key, a.allyTarget ? (ally || null) : sel))}>
                <span className="an">${a.name}</span><span className="ad">${a.desc} <span className="faint">(${a.cost}${a.disabled?` · ${a.disabled}`:""})</span></span></button>`) : html`<p className="muted">No special abilities right now.</p>`)}
              ${tab==="items" && (usable.length ? usable.map(it=>html`<button key=${it.id} className="act" disabled=${!myTurn || !!incap} onClick=${()=>act(()=>pcUseItem(it.id, it.type==="potion" ? ally : sel))}>
                <span className="an">${it.name}${it.qty>1?` ×${it.qty}`:""}</span><span className="ad">${it.type==="potion" ? `Bonus action. ${itemLine(it)||it.desc}${ally?` (for ${cm.cbt[ally]?.name})`:""}` : `Cast ${it.spell} from the scroll.`}</span></button>`) : html`<p className="muted">No potions or scrolls. Party members can trade items on their sheets.</p>`)}
              ${tab==="moves" && selCb && html`<button className="act" disabled=${!myTurn || !pt.action || !!incap || !canReach(c, me, selCb, true)} title=${!canReach(c, me, selCb, true) ? "You can't reach them" : ""} onClick=${()=>act(()=>pcShove(selCb.id, selCb.pos === "front" ? "back" : "prone"))}><span className="an">${selCb.pos === "front" ? `Shove ${selCb.name} back` : `Knock ${selCb.name} prone`}</span><span className="ad">${selCb.pos === "front" ? "Athletics contest: push them out of the front line, so your melee fighters can reach their back line." : "Athletics contest: prone foes are easy to hit in melee."}</span></button>`}
              ${tab==="moves" && html`<button className="act" disabled=${!myTurn || !pt.move || !!incap} onClick=${()=>act(pcMove)}><span className="an">Move to the ${me.pos === "front" ? "back" : "front"} line</span><span className="ad">${me.pos === "front" ? "Step behind your allies. Front-line foes get a swing at you unless you disengage." : "Step up to engage enemies in melee and shield the back line."}</span></button>`}
              ${tab==="moves" && [["dodge","Dodge","Attacks against you have disadvantage until your next turn."],["dash","Dash","Gain an extra move this turn; advantage on escaping."],["disengage","Disengage","Move or flee without opportunity attacks."],["hide","Hide","Stealth vs their perception: advantage on your next attack."],["help","Help","Give the selected ally advantage on their next attack.", !ally && "Select an ally first"]].map(([k,l,dsc,dis])=>html`<button key=${k} className="act" disabled=${!myTurn || !pt.action || !!dis || !!incap} title=${dis||""} onClick=${()=>act(()=>pcBasic(k, ally))}><span className="an">${l}</span><span className="ad">${dsc}${dis?` (${dis})`:""}</span></button>`)}
              ${tab==="moves" && dyingAlly && html`<button className="act" disabled=${!myTurn || !pt.action} onClick=${()=>act(()=>pcBasic("stabilize", dyingAlly.id))}><span className="an">Stabilize ${firstName(dyingAlly.name)}</span><span className="ad">Medicine DC 10 (automatic with a healer's kit).</span></button>`}
              ${tab==="moves" && html`<button className="act danger" disabled=${!myTurn || !!incap} onClick=${()=>act(pcRunAway)}><span className="an">Retreat</span><span className="ad">Pull the whole party out of the fight. Front-line foes get parting blows unless you disengaged.</span></button>`}
              ${tab==="custom" && html`<div className="act" style=${{gridColumn:"1/-1"}}>
                <span className="an">Try anything</span><span className="ad">Kick over the brazier, swing from the chandelier, demand their surrender. The DM rules on it.</span>
                <textarea className="input" rows=${2} value=${custom} maxLength=${400} placeholder=${`${firstName(ch.name)} shoves the bandit captain into the fire pit`} onInput=${e=>setCustom(e.target.value)}></textarea>
                <div className="row"><button className="btn primary sm" disabled=${!myTurn || !custom.trim() || !!incap || s.busy} onClick=${()=>act(()=>{ pcCustom(custom.trim()); setCustom(""); })}>${s.busy === "combat" ? "The DM rules…" : "Attempt"}</button></div></div>`}
            </div>
            <div className="row" style=${{marginTop:10, gap:8}}><span className="faint grow" style=${{fontSize:13}}>Target: <b>${selCb?.name || "none"}</b>${ally ? ` · Ally: ${cm.cbt[ally]?.name}` : ""}</span><button className="btn" disabled=${!myTurn} onClick=${endPlayerTurn}>End turn</button></div>
            <div className="keyhint">Keys: <kbd>1</kbd>–<kbd>9</kbd> act · <kbd>T</kbd> next target · <kbd>A</kbd>/<kbd>S</kbd>/<kbd>B</kbd>/<kbd>I</kbd>/<kbd>M</kbd> tabs · <kbd>E</kbd> end turn</div>
          </div>`}
        </div>
      </div>
      <div className=${"combat-log parch" + (logOpen ? " open" : "")} ref=${logRef} aria-live="polite">
        <button className="log-toggle" onClick=${()=>setLogOpen(!logOpen)} aria-expanded=${logOpen}>${logOpen ? "Hide battle log ▴" : "Battle log ▾"}</button>
        ${cm.log.map(l=>html`<div key=${l.id} className=${"ln " + l.side}>${inlineMd(l.text)}</div>`)}</div>
    </div>
  </div>`;
}
function CombatEnd(){
  const s = useStore(); const c = s.campaign; const cm = c.combat; const ch = PC();
  const titles = {victory:"Victory", surrender:"They yield", fled:"Escaped", defeat:"Defeated", dead:"You have fallen"};
  const reviver = partyMembers(c).find(m => m.id !== ch.id && !m.dead && m.hp > 0 && m.spells.includes("Revivify") && lowestSlot(m, 3));
  return html`<div className=${"endcard " + cm.status}><h2>${titles[cm.status]}</h2>
    <p>${cm.status==="dead" ? `${ch.name}'s story ends here, unless something else has plans for them.` : cm.status==="defeat" ? "Darkness takes the party. When you wake, the world will have moved on." : cm.xp ? `${cm.xp} XP for each party member.` : ""}${cm.sandbox ? " (Practice bout: nothing is kept.)" : ""}</p>
    ${(cm.status === "dead" || cm.status === "defeat") && c.checkpoint && !cm.sandbox && html`<button className="btn primary" style=${{marginBottom:8}} onClick=${loadCheckpoint}>↺ Retry from checkpoint (${c.checkpoint.label})</button>`}
    ${cm.status === "dead" ? html`<div className="row wrap" style=${{justifyContent:"center", gap:8}}>
        ${reviver && html`<button className="btn magic" onClick=${()=>divineIntervention(true)}>${firstName(reviver.name)} casts Revivify</button>`}
        <button className="btn gold" onClick=${()=>divineIntervention(false)}>Divine intervention</button>
        <button className="btn ghost" onClick=${()=>{ store.camp(c => { c.combat = null; }); saveNow(); store.set({view:"home", campaign:null}); }}>Accept fate</button></div>`
      : html`<button className="btn primary lg" onClick=${leaveCombat}>${cm.sandbox ? "Leave the ring" : "Continue the story"}</button>`}
  </div>`;
}

// ---------- Character sheets (whole party) ----------
function Sheet(){
  const s = useStore(); const c = s.campaign; const members = partyMembers(c);
  const ch = c.characters[s.sheetId] && members.some(m => m.id === s.sheetId) ? c.characters[s.sheetId] : PC();
  const [inv, setInv] = useState(null);
  const a = abilities(ch), m = mods(ch), ci = castInfo(ch), rm = resourceMax(ch), smx = slotMax(ch);
  const feats = Object.entries(CLASSES[ch.cls].feats).filter(([l]) => +l <= ch.level).flatMap(([l,fs]) => fs.map(f => [l, f])).filter(([,f]) => f !== "Ability Score Improvement");
  const warn = armorWarnings(ch); const isMain = ch.id === c.activeCharId;
  const camp = fn => store.camp((c) => fn(c, c.characters[ch.id]));
  const doEquip = (id, slot) => gearEquip(ch.id, id, slot);
  const give = (itemId, toId) => gearGive(ch.id, itemId, toId);
  return html`<div className="page">
    <div className="member-tabs" role="tablist">${members.map(mm => html`<button key=${mm.id} role="tab" className=${mm.id===ch.id?"on":""} aria-selected=${mm.id===ch.id} onClick=${()=>{ setInv(null); store.set({sheetId: mm.id}); }}><${Icon} n=${CLASS_ICON[mm.cls]} size=${16}/> ${firstName(mm.name)}${canLevelHere(c, mm) ? " ★" : ""}</button>`)}</div>
    <div className="sheet-head parch">
      <${Portrait} ch=${ch} size=${92}/>
      <div className="grow" style=${{minWidth:200}}><h1>${ch.name}</h1><div className="muted">Level ${ch.level} ${ch.race}${ch.dragonType && ch.race==="Dragonborn"?` (${ch.dragonType})`:""} ${ch.cls}${ch.subclass?`, ${ch.subclass}`:""} · ${ch.background} · ${ch.alignment}</div>
        ${ch.companion && html`<div className="muted" style=${{fontSize:13.5, marginTop:4}}>${ROLE_INFO[ch.companion.role]} Approval: <b>${approvalLabel(ch.companion.approval)}</b>.</div>`}
        <div className="row wrap" style=${{gap:6, marginTop:6}}>${canLevelHere(c, ch) && html`<button className="btn gold sm" onClick=${()=>openModal({type:"levelup", charId: ch.id})}><${Icon} n="up" size=${16}/> Level up</button>`}
          ${ci && !c.combat && html`<button className="btn sm" onClick=${()=>openModal({type:"cast", casterId: ch.id})}>Cast a spell</button>`}
          ${!c.combat && html`<button className="btn sm ghost" onClick=${()=>openModal({type:"shortrest"})}>Short rest</button>`}
          ${isMain && html`<button className="btn sm ghost" onClick=${startPractice} disabled=${!!c.combat}>Practice ring</button>`}
          ${ch.companion && html`<button className="btn sm ghost" onClick=${()=>store.set({tab:"party"})}>Tactics & role</button>`}</div></div>
      <div className="stats3" style=${{minWidth:280}}>${[["HP",`${ch.hp}/${maxHp(ch)}`],["AC",armorClass(ch)],["Init",fmt(initMod(ch))],["Speed",`${speed(ch)} ft`],["Prof.",fmt(profBonus(ch.level))],["XP",ch.level < MAX_LEVEL ? `${ch.xp}/${XP_TABLE[ch.level]}` : ch.xp]].map(([l,v])=>html`<div key=${l} className="stat"><div className="v">${v}</div><div className="l">${l}</div></div>`)}</div>
    </div>
    ${warn.length > 0 && html`<div className="banner bad">${warn.join(" ")}</div>`}
    <div className="ab-grid">${ABILS.map(k=>html`<div key=${k} className="ab parch"><div className="n">${ABIL_NAME[k]}</div><div className="v">${fmt(m[k])}</div><div className="m">${a[k]}</div><div className="b">Save ${fmt(saveMod(ch,k))}${CLASSES[ch.cls].saves.includes(k)?" ●":""}</div></div>`)}</div>
    <div className="sheet-grid">
      <section className="parch panel"><h3 className="panel-title">Skills</h3><div className="skills">${Object.keys(SKILLS).map(sk=>{ const ex = ch.expertise.includes(sk), pr = ch.skills.includes(sk);
        return html`<div key=${sk}><span className=${"p" + (ex?" ex":pr?" on":"")}></span><span className="mod">${fmt(skillMod(ch,sk))}</span><span>${sk}</span><span className="ab">${SKILLS[sk]}</span></div>`; })}</div></section>
      <section className="parch panel"><h3 className="panel-title">Attacks</h3>${weaponAttacks(ch).filter(w=>!w.stowed).map(w=>html`<div key=${w.id} className="res-row" style=${{borderBottom:"1px dashed rgba(90,60,25,.25)", padding:"4px 0"}}><span>${w.name}</span><span>${fmt(w.toHit)} · ${w.dmg} ${w.t}</span></div>`)}
        <p className="faint" style=${{fontSize:12.5, marginTop:6}}>${attacksPerAction(ch)} attack${attacksPerAction(ch)>1?"s":""} per Attack action${ch.cls==="Rogue"?` · Sneak Attack ${sneakDice(ch)}`:""}${ch.cls==="Monk"?` · Martial Arts ${martialDie(ch)}`:""}${ch.fightingStyle?` · ${ch.fightingStyle}`:""}</p>
        ${resistances(ch).length > 0 && html`<p className="faint" style=${{fontSize:12.5}}>Resist: ${resistances(ch).join(", ")}</p>`}
        ${Object.keys(rm).length > 0 && html`<h3 className="panel-title" style=${{marginTop:12}}>Resources</h3>${Object.entries(rm).map(([k,r])=>html`<div key=${k} className="res-row"><span>${r.label}</span><span>${r.max-(ch.res[k]||0)}/${r.max} <span className="faint">(${r.rest} rest)</span></span></div>`)}`}
        <div className="res-row" style=${{marginTop:6}}><span>Hit dice (d${CLASSES[ch.cls].hd})</span><span>${ch.level-(ch.hitDiceUsed||0)}/${ch.level}</span></div></section>
      <section className="parch panel"><h3 className="panel-title">Features & traits</h3>
        <ul className="feat-list">${feats.map(([l,f],i)=>html`<li key=${i}><b>${f}</b> <span className="faint">(L${l})</span>${FEATURE_TEXT[f] ? html`<div className="faint">${FEATURE_TEXT[f]}</div>` : null}</li>`)}
          ${ch.subclass && html`<li><b>${ch.subclass}</b><div className="faint">${CLASSES[ch.cls].subs.find(x=>x.n===ch.subclass)?.d}</div></li>`}
          ${(ch.feats||[]).map(f=>html`<li key=${f}><b>${f}</b><div className="faint">${FEATS[f]}</div></li>`)}
          ${(ch.invocations||[]).map(f=>html`<li key=${f}><b>${f}</b><div className="faint">${INVOCATIONS[f]}</div></li>`)}
          ${RACES[ch.race].traits.map((t,i)=>html`<li key=${"r"+i}>${t}</li>`)}</ul></section>
      ${ci && html`<section className="parch panel"><h3 className="panel-title">Spellcasting</h3>
        <p style=${{margin:"0 0 6px"}}>${ABIL_NAME[ci.ab]} · save DC <b>${ci.dc}</b> · attack <b>${fmt(ci.atk)}</b></p>
        ${Object.entries(smx).map(([l,n])=>html`<div key=${l} className="res-row"><span>Level ${l} slots</span><${Pips} max=${n} used=${ch.slotsUsed[l]||0}/></div>`)}
        <div className="spell-list">${knownSpells(ch).sort((x,y)=>x.l-y.l).map(sp=>html`<details key=${sp.n}><summary><span className="lv">${sp.l||"C"}</span> ${sp.n}</summary><p className="faint">${sp.d}</p></details>`)}</div></section>`}
      <section className="parch panel wide"><h3 className="panel-title">Equipment ${isMain && html`<span className="chip gold">${ch.gold} gp (party purse)</span>`}</h3>
        <div className="slot-grid">${SLOTS.map(sl=>{ const it = ch.equipped[sl] && invItem(ch, ch.equipped[sl]); return html`<div key=${sl} className=${"slot" + (it?" filled":"")}><div className="sl">${SLOT_LABEL[sl]}</div>${it ? html`<div className="sv">${it.name}</div><button className="btn ghost sm" onClick=${()=>gearUnequip(ch.id, it.id)}>Remove</button>` : html`<span className="faint">empty</span>`}</div>`; })}</div>
        <h3 className="panel-title" style=${{marginTop:12}}>Pack</h3>
        <div className="inv">${ch.inventory.length === 0 && html`<p className="faint">Empty.</p>`}${ch.inventory.map(it=>{ const eq = isEquipped(ch, it.id); const open = inv === it.id;
          return html`<div key=${it.id} className=${"inv-item" + (eq?" eq":"") + (it.magic?" magic":"")}>
            <button className="inv-main" onClick=${()=>setInv(open?null:it.id)} aria-expanded=${open}><${Icon} n=${itemIcon(it)} size=${20}/><span className="grow">${it.name}${it.qty>1?` ×${it.qty}`:""}${eq?html` <span className="chip">equipped</span>`:""}</span><span className="faint" style=${{fontSize:12}}>${it.rarity !== "common" ? it.rarity : ""}</span></button>
            ${open && html`<div className="inv-detail"><div className="faint">${[itemLine(it), it.desc].filter(Boolean).join(" · ") || "No notable properties."}${it.value?` Worth about ${it.value} gp.`:""}</div>
              <div className="row wrap" style=${{gap:6, marginTop:6}}>
                ${it.slot && !eq && html`<button className="btn sm" onClick=${()=>doEquip(it.id)}>Equip</button>`}
                ${it.weapon && !eq && it.weapon.props.includes("light") && html`<button className="btn sm ghost" onClick=${()=>doEquip(it.id, "offHand")}>Off hand</button>`}
                ${eq && html`<button className="btn sm ghost" onClick=${()=>gearUnequip(ch.id, it.id)}>Unequip</button>`}
                ${!c.combat && ["potion","scroll"].includes(it.type) && html`<button className="btn sm" onClick=${()=>useItemOutOfCombat(it.id, ch.id)}>Use</button>`}
                ${members.length > 1 && !c.combat && html`<select className="input" style=${{width:"auto", padding:"3px 6px"}} value="" onChange=${e=>{ if (e.target.value) give(it.id, e.target.value); }} aria-label="Give to"><option value="">Give to…</option>${members.filter(x=>x.id!==ch.id).map(x=>html`<option key=${x.id} value=${x.id}>${firstName(x.name)}</option>`)}</select>`}
                ${!it.quest && html`<button className="btn sm ghost" onClick=${()=>openModal({type:"confirm", text:`Drop ${it.name}?`, ok:()=>gearDrop(ch.id, it.id)})}>Drop</button>`}
              </div></div>`}
          </div>`; })}</div></section>
      ${ch.companion && !ch.companion.player ? html`<section className="parch panel wide"><h3 className="panel-title">Who they are</h3><p><b>Personality.</b> ${ch.companion.personality}</p><p><b>Voice.</b> ${ch.companion.voice}</p><p><b>Wants.</b> ${ch.companion.hook}</p><p className="faint">Likes ${ch.companion.likes.join(", ")}; dislikes ${ch.companion.dislikes.join(", ")}.</p>${ch.appearance && html`<p><b>Looks.</b> ${ch.appearance}</p>`}</section>`
        : (ch.backstory || ch.appearance) && html`<section className="parch panel wide"><h3 className="panel-title">Story</h3>${ch.appearance && html`<p><b>Appearance.</b> ${ch.appearance}</p>`}${ch.backstory && html`<p><b>Backstory.</b> ${ch.backstory}</p>`}</section>`}
    </div>
  </div>`;
}

// ---------- Quests & Journal ----------
function Quests(){
  const s = useStore(); const c = s.campaign; const [tab, setTab] = useState("active");
  const all = Object.values(c.quests); const list = all.filter(q => tab === "active" ? q.status === "active" : q.status === tab).sort((a,b)=>(a.kind==="main"?-1:1)-(b.kind==="main"?-1:1));
  return html`<div className="page narrow">
    <div className="row wrap" style=${{justifyContent:"space-between"}}><h1 className="page-title"><${Icon} n="quest"/> Quest log</h1>
      <${Seg} value=${tab} options=${[["active",`Active (${all.filter(q=>q.status==="active").length})`],["completed",`Done (${all.filter(q=>q.status==="completed").length})`],["failed",`Failed (${all.filter(q=>q.status==="failed").length})`]]} onChange=${setTab}/></div>
    ${list.length === 0 && html`<p className="muted">${tab === "active" ? "No open quests. Check a town's notice board or talk to people." : "Nothing here yet."}</p>`}
    ${list.map(q=>{ const loc = questTarget(c, q);
      return html`<article key=${q.id} className=${"quest parch " + q.kind + " " + q.status}>
      <h3>${q.title} <span className=${"qtag " + q.kind}>${q.kind === "main" ? "Main quest" : q.personal ? "Personal" : q.id.startsWith("lt-") || q.id.startsWith("lib-") ? "War" : q.auto ? "Bounty" : "Side quest"}</span>${q.status !== "active" && html`<span className=${"qtag " + (q.status==="completed"?"done":"failed")}>${q.status}</span>`}</h3>
      ${q.giver && html`<div className="faint" style=${{fontSize:13}}>From ${q.giver}</div>`}
      ${q.summary && html`<p>${q.summary}</p>`}
      <ul className="objs">${(q.objectives||[]).map(o=>html`<li key=${o.id} className=${"obj" + (o.done?" done":"")}><span className="bx">${o.done?"✓":""}</span>${o.text}${o.optional?html` <span className="faint">(optional)</span>`:""}</li>`)}</ul>
      <div className="row wrap" style=${{justifyContent:"space-between"}}>${q.reward ? html`<span className="faint" style=${{fontSize:13}}>Reward: ${q.reward}</span>` : html`<span></span>`}
        <span className="row" style=${{gap:6}}>${q.status === "active" && html`<button className=${"btn sm" + (trackedQuest(c)?.id === q.id ? " gold" : " ghost")} onClick=${()=>trackQuest(q.id)}>${trackedQuest(c)?.id === q.id ? "★ Tracked" : "Track"}</button>`}
        ${loc && q.status === "active" && html`<button className="btn sm ghost" onClick=${()=>store.set({tab:"map", mapSel: loc.id})}><${Icon} n="map" size=${15}/> ${loc.name}</button>`}</span></div>
    </article>`; })}
  </div>`;
}
function Journal(){
  const s = useStore(); const c = s.campaign;
  const npcs = Object.values(c.npcs).sort((a,b)=>(b.location===c.currentLocationId)-(a.location===c.currentLocationId));
  const att = v => v >= 60 ? "devoted" : v >= 25 ? "friendly" : v > -25 ? "neutral" : v > -60 ? "wary" : "hostile";
  return html`<div className="page narrow">
    <h1 className="page-title"><${Icon} n="book"/> Journal</h1>
    ${c.world && html`<div className="parch panel"><h2 style=${{marginTop:0}}>${c.world.name}</h2><p className="muted" style=${{margin:0}}>${c.world.region}${c.world.region?". ":""}${c.world.overview}</p>${c.villain && html`<p style=${{marginBottom:0}}><b>The enemy:</b> ${c.villain.name}${c.villain.title?`, ${c.villain.title}`:""}. ${c.villain.motive}</p>`}</div>`}
    ${c.villain && html`<div className="parch panel"><h3 className="panel-title">${c.villainDefeated ? "Victory" : `${c.villain.name}'s power`}</h3>
      ${c.villainDefeated ? html`<p style=${{margin:0}}>${c.villain.name} has been defeated. <button className="btn sm ghost" onClick=${()=>openModal({type:"epilogue"})}>Read the epilogue</button></p>`
        : html`<div className="threat"><div className="threat-bar"><i style=${{width: `${Math.min(100, ((c.threat?.stage||0) / 4) * 100)}%`}}></i></div><b>${threatLabel(c.threat?.stage || 0)}</b></div>
          <p className="faint" style=${{margin:"6px 0 0", fontSize:13.5}}>The enemy grows stronger as days pass. Defeating lieutenants and liberating towns sets them back.${c.threat ? ` Next move expected around day ${c.threat.next}.` : ""}</p>`}</div>`}
    ${c.story && c.villain && html`<div className="parch panel"><h3 className="panel-title">Main story${isQuick(c) ? " · quick adventure" : ""}</h3>
      <div className="acts">${(isQuick(c) ? [1, 3] : [1, 2, 3]).map((n, i) => { const st = c.story; const done = c.villainDefeated || st.act > n; const cur = !done && st.act === n;
        return html`<div key=${n} className=${"act-step" + (done ? " done" : cur ? " cur" : "")}><span className="act-n">${done ? "✓" : i + 1}</span><div><b>${ACTS[n]}</b><div className="faint" style=${{fontSize:12.5}}>${n === 1 ? `Clues ${Math.min(st.clues, st.need)}/${st.need}` : n === 2 ? (st.lt ? `${st.lt.name} at ${c.locations[st.lt.loc]?.name || "?"}` : "Not yet revealed") : (st.act >= 3 ? (villainLair(c)?.name || "The lair") : "Not yet revealed")}</div></div></div>`; })}</div>
      ${(c.story.log || []).length > 0 && html`<ul className="clue-log">${c.story.log.slice().reverse().map((x, i) => html`<li key=${i}><span className="faint">Day ${x.day}</span> ${x.text}</li>`)}</ul>`}
      <p className="faint" style=${{fontSize:12.5, margin:"6px 0 0"}}>${c.story.act === 1 ? "Clues come from tavern rumors, finished bounties, strange rooms in dungeons, defeated bosses and what you discover in the story." : c.story.act === 2 ? "Each act you finish also sets the villain's plans back." : "Make sure you're strong enough before you storm the lair."}</p></div>`}
    <${FactionsPanel} c=${c}/>
    <div className="parch panel"><h3 className="panel-title">Your legend so far</h3>${(c.raresSeen || []).length ? html`<p className="faint" style=${{margin:"0 0 6px"}}>Rare encounters found: ${(c.raresSeen || []).length} of ${RARE_EVENTS.length}</p>` : null}<p style=${{margin:0}}><b>${deedsTitle(c)[0].replace(/^the /,"The ")}</b>: ${deedsTitle(c)[1]}</p></div>
    ${Object.keys(c.reputation||{}).length > 0 && html`<div className="parch panel"><h3 className="panel-title">Reputation</h3>${Object.entries(c.reputation).map(([k,v])=>html`<div key=${k} className="res-row"><span>${k}</span><span className=${"chip " + (v>=20?"good":v<=-20?"hp":"")}>${v>0?"+":""}${v}</span></div>`)}</div>`}
    <h2 className="sec">People</h2>
    <div className="npc-grid">${npcs.length ? npcs.map(n=>html`<div key=${n.id} className="npc parch">
      <div className="row" style=${{justifyContent:"space-between"}}><b>${n.name}</b><span className=${"chip " + (n.attitude>=25?"good":n.attitude<=-25?"hp":"")}>${n.status && n.status!=="alive" ? n.status : att(n.attitude||0)}</span></div>
      <div className="faint" style=${{fontSize:12.5}}>${[n.race, n.role, c.locations[n.location]?.name].filter(Boolean).join(" · ")}</div>
      <div className="att"><i style=${{left: `${50 + (n.attitude||0)/2}%`}}></i></div>
      ${n.personality && html`<p style=${{margin:"6px 0 0"}}>${n.personality}</p>`}${n.notes && html`<p className="faint" style=${{margin:"4px 0 0", fontSize:13}}>${n.notes}</p>`}</div>`) : html`<p className="muted">You haven't met anyone of note yet.</p>`}</div>
    ${(c.fallen||[]).length > 0 && html`<h2 className="sec">Fallen</h2><div className="parch panel">${c.fallen.map(f=>html`<div key=${f.id} className="res-row"><span>${f.name}</span><span className="faint">fell on day ${f.day}</span></div>`)}</div>`}
    <h2 className="sec">Chronicle</h2>
    <ol className="chron">${c.chronicle.length ? c.chronicle.slice().reverse().map((x,i)=>html`<li key=${i}><span className="faint">Day ${x.day||"?"}</span> ${x.text}</li>`) : html`<li className="muted">Your deeds will be recorded here.</li>`}</ol>
  </div>`;
}

// ---------- Modals ----------
function ModalHost(){
  const s = useStore(); const m = s.modal; if (!m) return null;
  const T = { report: ReportModal, checkup: CheckupModal, base: BaseModal, session: SessionModal, trophies: TrophiesModal, recap: RecapModal, online: OnlineModal, craft: CraftModal, epilogue: EpilogueModal, help: HelpModal, settings: SettingsModal, campaigns: CampaignsModal, levelup: LevelUpModal, shop: ShopModal, shortrest: ShortRestModal, cast: CastModal, items: ItemsModal, confirm: ConfirmModal, exportc: ExportModal, event: EventModal, travel: TravelModal, service: ServiceModal }[m.type];
  return T ? html`<${T} m=${m}/>` : null;
}
function CraftModal(){
  const s = useStore(); const c = s.campaign; const [tab, setTab] = useState("brew"); const guest = spectating();
  const known = new Set(c.recipesKnown || []);
  const list = RECIPES.filter(r => (tab === "improve" ? r.kind === "improve" : tab === "scribe" ? r.kind === "scribe" : r.kind === "brew") && (!r.secret || known.has(r.name)));
  const mats = Object.keys(MATERIALS).map(n => [n, matCount(c, n)]).filter(([,q]) => q > 0);
  const chanceFor = r => { const b = bestAt(c, r.skill); const m = skillMod(b, r.skill); return { who: b, p: clamp((21 - (r.dc - m)) / 20, 0.05, 0.95) }; };
  const busy = !!s.busy || !!c.combat;
  return html`<${Modal} title="Crafting" onClose=${closeModal} wide=${true}>
    <p className="faint" style=${{marginTop:0}}>Brew potions, scribe scrolls and improve gear with materials from foraging and fallen monsters. Each attempt takes about an hour; a failed check wastes half the materials.</p>
    <div className="mat-list">${mats.length ? mats.map(([n,q]) => html`<span key=${n} className="chip" title=${MATERIALS[n].d}>${n} ×${q}</span>`) : html`<span className="faint">No materials yet. Forage in the wild and harvest what monsters leave behind.</span>`}</div>
    <${Seg} value=${tab} options=${[["brew","Brew"],["scribe","Scribe"],["improve","Improve gear"]]} onChange=${setTab}/>
    <div className="svc-list" style=${{marginTop:10}}>${list.map(r => { const needs = recipeNeeds(c, r); const ok = canCraft(c, r); const ch = chanceFor(r);
      const need = Object.entries(needs).map(([n,q]) => html`<span key=${n} className=${matCount(c, n) >= q ? "have" : "miss"}>${q}× ${n} (${matCount(c, n)})</span>`);
      const targets = r.kind === "improve" ? improvable(c, r) : [];
      return html`<div key=${r.id} className="svc-row craft-row"><div className="grow"><b>${r.name}</b><div className="need">${need}</div>
          <div className="faint" style=${{fontSize:12.5}}>${r.skill} DC ${r.dc} · ${firstName(ch.who.name)} has a ${pct(ch.p)} chance</div>
          ${r.kind === "improve" && html`<div className="row wrap" style=${{gap:6, marginTop:6}}>${targets.length ? targets.map(t => html`<button key=${t.it.id} className="btn sm" disabled=${!ok || busy} onClick=${()=>craft(r.id, t.it.id)}>${t.it.name} <span className="faint">(${firstName(t.owner.name)})</span></button>`) : html`<span className="faint" style=${{fontSize:12.5}}>No eligible gear in the party's packs.</span>`}</div>`}</div>
        ${r.kind !== "improve" && html`<button className="btn sm primary" disabled=${!ok || busy} onClick=${()=>craft(r.id)}>Craft</button>`}</div>`; })}</div>
  <//>`;
}
function EpilogueModal(){
  const c = C(); const e = computeEnding(c);
  useEffect(() => { try { recordHallOfFame(C()); } catch (e) { console.warn(e); } }, []);
  return html`<${Modal} title="Epilogue" onClose=${closeModal} wide=${true} foot=${html`<button className="btn ghost" onClick=${()=>{ closeModal(); saveNow(); store.set({view:"home", campaign:null}); }}>Main menu</button><button className="btn primary" onClick=${closeModal}>Keep adventuring</button>`}>
    <div className="epilogue">
      <div className="ep-title"><span className="faint">The tale of</span><h2>${e.title}</h2></div>
      <div className="ep-stats">${[["Days",e.days],["Level",e.level],["Foes slain",e.kills],["Renown",e.renown]].map(([l,v]) => html`<div key=${l} className="stat"><div className="v">${v}</div><div className="l">${l}</div></div>`)}</div>
      <h3>The realm</h3><p>${e.realm}</p>
      <h3>Your legend</h3><p>${e.legend}</p>
      ${(C()?.factions || []).length > 0 && html`<h3>The factions remember</h3>${C().factions.map(f => html`<p key=${f.id} style=${{margin:"4px 0"}}><b>${f.name}</b> ${f.hostile ? "is broken and scattered." : tierOf(f.rep) >= 2 ? "speaks your name with honor for a generation." : tierOf(f.rep) === 1 ? "counts you as a friend." : tierOf(f.rep) <= -1 ? "curses your name in the shadows." : "remembers you, but keeps its distance."}</p>`)}`}
      ${e.comps.length > 0 && html`<h3>Your companions</h3>${e.comps.map(x => { const who = Object.values(C()?.characters || {}).find(ch => ch.name === x.name); return html`<div key=${x.name} className="epi-comp">${who ? html`<${Portrait} ch=${who} size=${44}/>` : null}<p style=${{margin:0}}><b>${x.name}.</b> ${x.text}</p></div>`; })}`}
    </div>
  <//>`;
}
function HelpModal(){
  const S_ = [
    ["Exploring", "map", "Type anything in the box: talk, sneak, lie, climb, cast. The Dungeon Master decides what happens and asks for a roll when the outcome is uncertain. Dialogue choices appear under the story; you can use them or write your own."],
    ["Travel", "road", "Open the Map, pick a place and press Travel. Journeys take days and can be interrupted by events, strangers or ambushes. Each dangerous place shows a recommended level; the villain's lair is level 5+, so get stronger first."],
    ["Towns", "tavern", "Use the buttons under the location name: rest at the tavern (full heal), hear rumors, recruit companions, shop at the market or smithy, heal or raise the dead at the temple, and take bounties from the notice board."],
    ["Your party", "user", "Up to three companions travel with you. They fight on their own, level up automatically and react to your choices (watch their approval). On the Party screen you can set their tactics, swap front and back lines, take manual control, and equip gear upgrades."],
    ["Rolling dice", "d20", "When the outcome is uncertain, you roll. Attacks, saves and checks show a die: tap it (or press Space) to throw it. When the Dungeon Master asks for a check, press Roll. You can switch to automatic rolling in Settings."],
    ["Combat", "swords", "The battle map at the top shows everyone: your party on the left, enemies on the right, each in a front and a back line. Tap an enemy to target it. Everyone takes turns in initiative order. The front line protects the back line: melee attackers must get through it first, and the back line gets cover (+2 AC) against ranged attacks. Gang up on a foe in melee for advantage (flanking), shove enemies out of their front line, and aim area spells at a whole line. Some fights have objectives (hold out, protect someone, stop a ritual), enemies may flee or surrender, and reinforcements can arrive. The percentage on each attack is your chance to hit. On desktop, press 1-9 to act, T to switch target and E to end your turn."],
    ["Base, travel and progress", "home", "Buy a hall in a town as your party's base: rest for free and build upgrades (forge, library, chapel, stables, training yard, treasury). Fast travel between towns you've visited from the map. Heroes can now reach level 20. Earn achievements, and finished campaigns enter the Hall of Fame. Leave with Home to see your session recap."],
    ["Music and portraits", "user", "Turn on ambient music in Settings: it follows the scene, from towns and wilds to dungeons and boss fights. Design your hero's portrait in the creator's Story step (skin, hair, beard, eyes, class gear)."],
    ["Main story", "quest", "Campaigns follow three acts: gather clues about the villain (from rumors, finished bounties, strange rooms and your discoveries), defeat their lieutenant, then storm the lair. Each act you finish sets the villain back. Quick adventures are one-evening stories: heroes start at level 3 and the path leads straight to the lair."],
    ["Dungeons", "dungeon", "Explore room by room on the dungeon map. Search rooms for secret doors, beware of traps and chests that bite, and find the boss in the deepest chamber. You can leave from any safe room."],
    ["Resting", "camp", "A short rest lets everyone spend hit dice to heal. A long rest (camp or inn) restores everything, but camping in the wild can attract night attackers."]
  ];
  return html`<${Modal} title="How to play" onClose=${()=>{ closeModal(); if (!S().settings.seenHelp){ store.set({settings:{...S().settings, seenHelp:true}}); saveSettings(); } }} wide=${true}>
    <div className="help-grid">${S_.map(([t, ic, d]) => html`<div key=${t} className="help-item"><div className="hi-ico"><${Icon} n=${ic} size=${22}/></div><div><h3>${t}</h3><p>${d}</p></div></div>`)}</div>
  <//>`;
}
function ConfirmModal({ m }){ return html`<${Modal} title="Are you sure?" onClose=${closeModal} foot=${html`<button className="btn ghost" onClick=${closeModal}>Cancel</button><button className="btn danger" onClick=${()=>{ m.ok(); closeModal(); }}>${m.okLabel||"Confirm"}</button>`}><p>${m.text}</p><//>`; }
function CloudRow(){
  const code = window.urCloud.code(); const pretty = code.match(/.{1,4}/g).join("-"); const [other, setOther] = useState("");
  return html`<div className="set-row" style=${{flexDirection:"column", alignItems:"stretch", gap:6}}>
    <div><div className="sl">Cloud saves ☁</div><div className="faint" style=${{fontSize:12.5}}>Your campaigns are backed up online. To continue on another device, enter this save code there. Keep it private: anyone with the code can load your saves.</div></div>
    <div className="row wrap" style=${{gap:8, alignItems:"center"}}><code className="save-code">${pretty}</code><button className="btn sm" onClick=${()=>navigator.clipboard?.writeText(pretty).then(()=>toast("Save code copied.")).catch(()=>toast(pretty))}>Copy</button></div>
    <div className="row" style=${{gap:6}}><input className="input grow" value=${other} placeholder="Use a code from another device" onInput=${e=>setOther(e.target.value)}/><button className="btn sm" disabled=${other.replace(/[^a-z0-9]/gi, "").length < 12} onClick=${()=>{ if (!window.urCloud.use(other)) toast("That doesn't look like a save code.", "bad"); }}>Use code</button></div>
  </div>`;
}
function ApiKeyRow(){
  const [k, setK] = useState(() => window.urApiKey?.get() || ""); const [saved, setSaved] = useState(!!(window.urApiKey?.get()));
  return html`<div className="set-row" style=${{flexDirection:"column", alignItems:"stretch", gap:6}}>
    <div><div className="sl">Your own AI key (optional)</div><div className="faint" style=${{fontSize:12.5}}>By default the game uses the server's key, with daily limits. Add your own Anthropic key (sk-ant-…) or Gemini key (AIza…, free at aistudio.google.com) to play without the server's limits. It's stored only in this browser and sent to this game's server with your requests.</div></div>
    <div className="row" style=${{gap:6}}><input className="input grow" type="password" autoComplete="off" placeholder="sk-ant-… or AIza…" value=${k} onInput=${e=>{ setK(e.target.value); setSaved(false); }}/>
      <button className="btn sm" disabled=${!k.trim() || saved} onClick=${()=>{ if (!/^(sk-ant-|AIza)/.test(k.trim())){ toast("That doesn't look like an Anthropic key (sk-ant-…) or a Gemini key (AIza…).", "bad"); return; } window.urApiKey.set(k.trim()); setSaved(true); toast("API key saved in this browser."); }}>${saved ? "Saved" : "Save"}</button>
      ${saved && html`<button className="btn sm ghost" onClick=${()=>{ window.urApiKey.set(""); setK(""); setSaved(false); toast("API key removed."); }}>Remove</button>`}</div>
  </div>`;
}
function SettingsModal(){
  const s = useStore(); const st = s.settings; const set = p => { store.set({settings:{...S().settings, ...p}}); saveSettings(); };
  const c = s.campaign;
  const Row = ({l, d, children}) => html`<div className="set-row"><div className="grow"><div className="sl">${l}</div>${d && html`<div className="faint" style=${{fontSize:12.5}}>${d}</div>`}</div>${children}</div>`;
  const Tog = ({k, def}) => html`<label className="switch"><input type="checkbox" checked=${!!(st[k] ?? def)} onChange=${e=>set({[k]: e.target.checked})}/><span></span></label>`;
  return html`<${Modal} title="Settings" onClose=${closeModal}>
    <h3 className="panel-title">Dungeon Master</h3>
    <${Row} l="Storyteller depth" d="Deeper models write richer scenes but respond more slowly."><${Seg} value=${st.tier} options=${[["quick","Fast"],["default","Balanced"],["complex","Deep"]]} onChange=${v=>set({tier:v})}/><//>
    <${Row} l="Report a problem" d="Something odd? Send a report with the last DM reply so it can be fixed."><button className="btn sm" onClick=${()=>openModal({type:"report"})}>Report</button><//>
    ${!window.Net?.isGuest() && html`<${Row} l="DM check-up" d="Tests your AI Dungeon Master with two real requests and checks it follows the game's format."><button className="btn sm" disabled=${!C()} onClick=${()=>openModal({type:"checkup"})}>Run</button><//>`}
    <${VoiceRow}/>
    <${Row} l="Interface language" d="Menus and buttons. Choosing Português also switches the story to Portuguese."><${Seg} value=${st.uiLang || "en"} options=${[["en","English"],["pt","Português"]]} onChange=${v=>set(v === "pt" && (st.dmLanguage || "en") === "en" ? {uiLang: v, dmLanguage: "pt"} : {uiLang: v})}/><//>
    <${Row} l="Narration length" d="How much the Dungeon Master writes per scene."><${Seg} value=${st.narration || "medium"} options=${[["short","Short"],["medium","Medium"],["long","Long"]]} onChange=${v=>set({narration:v})}/><//>
    <${Row} l="Story language" d="The Dungeon Master narrates in this language (menus stay in English). In co-op, the host's choice applies."><${Seg} value=${st.dmLanguage || "en"} options=${[["en","English"],["pt","Português"],["es","Español"]]} onChange=${v=>set({dmLanguage:v})}/><//>
    <${Row} l="Roll dice yourself" d="Tap to throw the die for your attacks, checks and saves. Turn off to have dice roll automatically."><${Tog} k="manualDice" def=${true}/><//>
    ${st.manualDice === false && html`<${Row} l="Auto-roll checks" d="Roll requested checks for you. Turn off to pick who rolls and click Roll yourself."><${Tog} k="autoRoll"/><//>`}
    <${Row} l="Session recap" d="See tonight's highlights: XP, best hit, loot and more, ready to share."><button className="btn sm" onClick=${()=>openModal({type:"session"})}>Show recap</button><//>
    <${Row} l="Scene illustrations" d="A painted banner for wherever the party is, lit by the time of day."><${Tog} k="sceneArt" def=${true}/><//>
    <${Row} l="Battle map" d="A live map of every fight: who stands where, whose turn it is, and who you can reach."><${Tog} k="battleMap" def=${true}/><//>
    <${Row} l="Tips for new players" d="Short tips the first time you see each screen."><button className="btn sm" onClick=${()=>{ set({tipsSeen:{}, tipsOff:false}); toast("Tips will show again."); }}>Show tips again</button><//>
    <${Row} l="Smart enemy tactics" d=${window.__WEB__ ? "The DM plans enemy moves each round. Uses one extra AI request per round, so on Gemini's free tier it spends the daily quota faster." : "The DM plans enemy moves each round (uses a little extra Claude usage)."}><${Tog} k="aiTactics"/><//>
    <${Row} l="Show hints" d="Suggest a few ideas after each scene."><${Tog} k="hints"/><//>
    ${window.__WEB__ && html`<${ApiKeyRow}/>`}
    ${window.urCloud?.on && html`<${CloudRow}/>`}
    <h3 className="panel-title" style=${{marginTop:14}}>Display</h3>
    <${Row} l="Animations" d="Dice rolls, combat effects and the travel scene."><${Seg} value=${st.diceAnim} options=${[["full","Full"],["quick","Quick"],["off","Off"]]} onChange=${v=>set({diceAnim:v})}/><//>
    <${Row} l="Sound effects"><${Seg} value=${String(st.sfx ?? 0.5)} options=${[["0","Off"],["0.25","Low"],["0.5","Medium"],["0.85","High"]]} onChange=${v=>{ set({sfx: +v}); setTimeout(() => Sfx.play("coin"), 30); }}/><//>
    <${Row} l="Music" d="Ambient music that follows the scene: towns, wilds, dungeons, battles and boss fights."><${Seg} value=${String(st.music || 0)} options=${[["0","Off"],["0.15","Low"],["0.3","Medium"],["0.5","High"]]} onChange=${v=>set({music:+v})}/><//>
    <${Row} l="Theme"><${Seg} value=${st.theme} options=${[["system","System"],["dark","Dark"],["light","Light"]]} onChange=${v=>set({theme:v})}/><//>
    <${Row} l="Text size"><${Seg} value=${st.fontSize} options=${[["sm","Small"],["md","Medium"],["lg","Large"]]} onChange=${v=>set({fontSize:v})}/><//>
    <${Row} l="Reduce motion"><${Tog} k="reduceMotion"/><//>
    <h3 className="panel-title" style=${{marginTop:14}}>Saves</h3>
    <p className="faint" style=${{fontSize:13, marginTop:0}}>${s.caps.storage === "cloud" ? "Campaigns autosave to your Claude account and sync across devices." : "Campaigns autosave in this browser."} ${s.saveState}</p>
    <div className="row wrap" style=${{gap:8}}>
      ${c && html`<button className="btn" onClick=${()=>saveNow(true)}><${Icon} n="save" size=${16}/> Save now</button>`}
      ${c && html`<button className="btn ghost" onClick=${()=>openModal({type:"exportc", id:c.id})}>Export campaign</button>`}
      <button className="btn ghost" onClick=${()=>openModal({type:"campaigns"})}>All campaigns</button>
      <button className="btn ghost" onClick=${()=>openModal({type:"help"})}>How to play</button>
      ${c?.checkpoint && html`<button className="btn ghost" onClick=${()=>openModal({type:"confirm", text:`Go back to your checkpoint "${c.checkpoint.label}" (day ${c.checkpoint.day})? Progress since then will be lost.`, okLabel:"Load checkpoint", ok: loadCheckpoint})}>Load checkpoint</button>`}
      ${c && html`<button className="btn ghost" onClick=${()=>{ closeModal(); saveNow(); store.set({view:"home", campaign:null}); }}>Main menu</button>`}
    </div>
  <//>`;
}
async function importCampaignText(text){
  let c; try { c = JSON.parse(text); } catch { toast("That file isn't a valid save.", "bad"); return; }
  if (!c || !c.characters || !c.activeCharId || !c.characters[c.activeCharId]){ toast("That file isn't an Unwritten Road save.", "bad"); return; }
  c = migrate(c); if (S().index.some(m=>m.id===c.id)) c.id = uid("k"); c.updatedAt = Date.now(); c.name = c.name || "Imported campaign";
  store.set({campaign:c, view:"game", tab: c.combat ? "combat" : "adventure", modal:null}); await saveNow(); toast("Campaign imported.");
}
function CampaignsModal(){
  const s = useStore(); const fileRef = useRef(null);
  const load = async id => { let c = null; try { c = await loadCampaign(id); } catch(e){ console.warn(e); } if (!c){ toast("Couldn't load that save.", "bad"); return; } store.set({campaign:c, view:"game", tab: c.combat?"combat":"adventure", modal:null, dmError:null}); if (c.combat) setTimeout(combatLoop, 300); else maybeRecap(); };
  return html`<${Modal} title="Campaigns" onClose=${closeModal} wide=${true} foot=${html`<input ref=${fileRef} type="file" accept=".json,application/json" style=${{display:"none"}} onChange=${async e=>{ const f = e.target.files?.[0]; if (f) importCampaignText(await f.text()); e.target.value=""; }}/><button className="btn ghost" onClick=${()=>fileRef.current?.click()}>Import from file</button><button className="btn primary" onClick=${()=>{ closeModal(); store.set({view:"create", campaign:null}); }}>New adventure</button>`}>
    ${s.index.length === 0 && html`<p className="muted">No campaigns yet.</p>`}
    <div className="camp-list">${s.index.map(m=>html`<div key=${m.id} className="camp slab">
      <${Portrait} ch=${{id: m.charId || m.id, name: m.char, race: m.race, cls: m.cls, look: m.look, dragonType: m.dragonType}} size=${44}/>
      <div className="grow" style=${{minWidth:0}}><b>${m.name}</b><div className="faint" style=${{fontSize:13}}>${m.char}, level ${m.level} ${m.race} ${m.cls}${m.location?` · ${m.location}`:""}${m.dead?" · fallen":""} · ${new Date(m.updatedAt).toLocaleDateString()}</div></div>
      <button className="btn sm primary" onClick=${()=>load(m.id)}>Play</button>
      <button className="btn sm ghost" onClick=${()=>openModal({type:"exportc", id:m.id})}>Export</button>
      <button className="btn sm ghost" onClick=${()=>openModal({type:"confirm", text:`Delete "${m.name}" forever?`, okLabel:"Delete", ok:()=>{ deleteCampaign(m.id); setTimeout(()=>openModal({type:"campaigns"}), 50); }})} aria-label=${"Delete "+m.name}><${Icon} n="trash" size=${16}/></button>
    </div>`)}</div>
  <//>`;
}
function ExportModal({ m }){
  const [text, setText] = useState(""); const [done, setDone] = useState(false);
  useEffect(() => { (async () => { const c = C()?.id === m.id ? C() : await loadCampaign(m.id); if (c) setText(JSON.stringify(packCampaign(c))); })(); }, [m.id]);
  const name = `unwritten-road-${slug(JSON.parse(text||"{}").name||"campaign")}.json`;
  const dl = async () => { if (DOWNLOADS){ try { await DOWNLOADS.save({ filename: name, data: text }); setDone(true); return; } catch(e){ if (e?.code === "declined") return; console.warn(e); } } try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text],{type:"application/json"})); a.download = name; a.click(); setDone(true); } catch { toast("Download isn't available here; copy the text instead.", "bad"); } };
  return html`<${Modal} title="Export campaign" onClose=${closeModal} foot=${html`<button className="btn ghost" onClick=${()=>{ navigator.clipboard?.writeText(text).then(()=>toast("Copied to clipboard.")).catch(()=>toast("Copy failed; select the text manually.","bad")); }}>Copy</button><button className="btn primary" disabled=${!text} onClick=${dl}>Download .json</button>`}>
    <p className="muted" style=${{marginTop:0}}>Keep a backup or move a campaign to another device. Import it from the Campaigns screen.${done ? " Saved!" : ""}</p>
    <textarea className="input mono" rows=${8} readOnly=${true} value=${text ? text.slice(0, 20000) + (text.length > 20000 ? "…" : "") : "Preparing…"}></textarea>
  <//>`;
}
function ShortRestModal(){
  const c = C(); const members = partyMembers(c);
  const suggest = m => { const avail = m.level - (m.hitDiceUsed||0); const per = Math.max(1, CLASSES[m.cls].hd/2 + 1 + mods(m).CON); return Math.min(avail, Math.ceil(Math.max(0, maxHp(m) - m.hp) / per)); };
  const [plan, setPlan] = useState(() => Object.fromEntries(members.map(m => [m.id, suggest(m)])));
  const [rec, setRec] = useState(true);
  const canRecover = members.some(m => resLeft(m,"recovery") > 0 && ["Wizard","Druid"].includes(m.cls) && Object.values(m.slotsUsed||{}).some(v=>v>0));
  return html`<${Modal} title="Short rest" onClose=${closeModal} foot=${html`<button className="btn ghost" onClick=${closeModal}>Cancel</button><button className="btn primary" onClick=${()=>doShortRest(plan, rec && canRecover)}>Rest for an hour</button>`}>
    <p style=${{marginTop:0}}>An hour of rest. Each member can spend hit dice to recover HP; short-rest abilities and warlock pact slots recharge.</p>
    ${members.map(m => { const avail = m.level - (m.hitDiceUsed||0); const n = plan[m.id] || 0;
      return html`<div key=${m.id} className="set-row"><div className="grow"><div className="sl">${m.name}</div><div className="faint" style=${{fontSize:12.5}}>HP ${m.hp}/${maxHp(m)} · d${CLASSES[m.cls].hd}${fmt(mods(m).CON)} per die · ${avail} hit dice left</div></div>
        <button className="btn ghost sm" disabled=${n<=0} onClick=${()=>setPlan({...plan, [m.id]: n-1})}>−</button><b style=${{minWidth:20, textAlign:"center"}}>${n}</b><button className="btn ghost sm" disabled=${n>=avail} onClick=${()=>setPlan({...plan, [m.id]: n+1})}>+</button></div>`; })}
    ${canRecover && html`<label className="row" style=${{gap:8, marginTop:10}}><input type="checkbox" checked=${rec} onChange=${e=>setRec(e.target.checked)}/> Arcane / Natural Recovery: regain spent spell slots</label>`}
  <//>`;
}
function CastModal({ m }){
  const c = C(); const casters = partyMembers(c).filter(x => castInfo(x));
  const [casterId, setCaster] = useState(m.casterId && casters.some(x=>x.id===m.casterId) ? m.casterId : casters[0]?.id);
  const ch = c.characters[casterId]; const [slotSel, setSlotSel] = useState({}); const [note, setNote] = useState("");
  const [ally, setAlly] = useState(() => { const hurt = partyMembers(c).filter(x => x.hp < maxHp(x)).sort((a,b) => a.hp/maxHp(a) - b.hp/maxHp(b))[0]; return hurt && hurt.id !== casterId ? hurt.id : ""; });
  if (!ch) return html`<${Modal} title="Cast a spell" onClose=${closeModal}><p>No one in the party can cast spells.</p><//>`;
  const list = knownSpells(ch).sort((a,b)=>a.l-b.l);
  return html`<${Modal} title="Cast a spell" onClose=${closeModal} wide=${true}>
    <div className="row wrap" style=${{gap:10}}>
      ${casters.length > 1 && html`<div className="field"><label>Caster</label><${Seg} value=${casterId} options=${casters.map(x=>[x.id, firstName(x.name)])} onChange=${v=>{ setCaster(v); setSlotSel({}); }}/></div>`}
      <div className="field"><label>Target (healing & buffs)</label><select className="input" value=${ally} onChange=${e=>setAlly(e.target.value)}><option value="">${firstName(ch.name)} (self)</option>${partyMembers(c).filter(x=>x.id!==ch.id).map(x=>html`<option key=${x.id} value=${x.id}>${x.name}</option>`)}</select></div>
      <div className="field grow"><label htmlFor="cn">How or on what (optional)</label><input id="cn" className="input" value=${note} maxLength=${200} placeholder="on the locked chest, or to charm the guard captain" onInput=${e=>setNote(e.target.value)}/></div>
    </div>
    <div className="spell-pick">${list.map(sp=>{ const lv = sp.l ? Object.keys(slotMax(ch)).map(Number).filter(l=>l>=sp.l && slotsLeft(ch,l)>0) : []; const chosen = slotSel[sp.n] || lv[0]; const dis = (sp.l && !lv.length) || sp.m.k === "react";
      return html`<div key=${sp.n} className=${"sp" + (dis?" dis":"")}><div className="sn">${sp.n} <span className="faint" style=${{fontWeight:400,fontSize:12}}>${sp.l?`level ${sp.l}`:"cantrip"}</span></div><div className="sd">${sp.d}</div>
        <div className="row" style=${{gap:6, marginTop:6}}>${lv.length>1 && html`<select className="input" style=${{width:"auto",padding:"2px 6px"}} value=${chosen} onChange=${e=>setSlotSel({...slotSel, [sp.n]: +e.target.value})}>${lv.map(l=>html`<option key=${l} value=${l}>Level ${l}</option>`)}</select>`}
          <button className="btn sm primary" disabled=${dis || !!S().busy} onClick=${()=>castOutOfCombat(sp.n, {slot: chosen, note: note.trim(), allyId: ally || null, casterId})}>${sp.m.k==="react" ? "Reaction only" : sp.l && !lv.length ? "No slots" : "Cast"}</button></div></div>`; })}</div>
  <//>`;
}
function ItemsModal(){
  const c = C(); const members = partyMembers(c); const [target, setTarget] = useState(c.activeCharId);
  const items = members.flatMap(m => m.inventory.map(it => ({m, it})));
  return html`<${Modal} title="Use an item" onClose=${closeModal}>
    <div className="field"><label>Use on</label><${Seg} value=${target} options=${members.map(x=>[x.id, firstName(x.name)])} onChange=${setTarget}/></div>
    <div className="inv">${items.map(({m, it})=>html`<div key=${it.id} className="inv-item"><div className="inv-main" style=${{cursor:"default"}}><${Icon} n=${itemIcon(it)} size=${20}/><span className="grow">${it.name}${it.qty>1?` ×${it.qty}`:""} <span className="faint" style=${{fontSize:12}}>(${firstName(m.name)})</span><div className="faint" style=${{fontSize:12.5}}>${itemLine(it) || it.desc}</div></span>
      <button className="btn sm" disabled=${!!S().busy} onClick=${()=>{ closeModal(); useItemOutOfCombat(it.id, target); }}>Use</button></div></div>`)}</div>
  <//>`;
}
function ShopModal(){
  const s = useStore(); const c = s.campaign; const main = PC(); const shop0 = c.shop; const [tab, setTab] = useState("buy"); const members = partyMembers(c);
  const town = townOf(c); const mult = town ? priceMult(c, town) : 1;
  const shop = shop0 ? {...shop0, items: shop0.items.map(it => ({...it, price: Math.max(1, Math.round(it.price * mult))}))} : null;
  const [who, setWho] = useState(c.activeCharId); const ch = c.characters[who] || main;
  if (!shop) return html`<${Modal} title="Shop" onClose=${closeModal}><p>No shop is open.</p><//>`;
  const buy = (i) => shopBuy(i, who);
  if (town && standing(c, town) <= -50) return html`<${Modal} title=${shop.name} onClose=${closeModal}><p>The merchant takes one look at you and shutters the stall. Your reputation in ${town.name} is too poor to trade here.</p><//>`;
  const sell = (it) => shopSell(it.id, who);
  const fits = it => it.weapon ? (isProfWeapon(ch, it) ? "" : " · not proficient") : (it.armor || it.type === "shield") ? (isProfArmor(ch, it) ? "" : " · not proficient") : "";
  return html`<${Modal} title=${shop.name} onClose=${closeModal} wide=${true} foot=${html`<span className="chip gold">${main.gold} gp</span><span className="grow"></span><button className="btn" onClick=${()=>{ closeModal(); if (!window.Net?.isOnline()) store.camp(c=>{ c.shop = null; }); }}>Leave</button>`}>
    ${shop.keeper && html`<p className="faint" style=${{marginTop:0}}>Kept by ${shop.keeper}.${mult !== 1 ? ` Prices ${mult < 1 ? `${Math.round((1-mult)*100)}% lower` : `${Math.round((mult-1)*100)}% higher`} because you're ${standingLabel(standing(c, town)).toLowerCase()} here.` : ""}</p>`}
    <div className="row wrap" style=${{gap:10}}><${Seg} value=${tab} options=${[["buy","Buy"],["sell","Sell"]]} onChange=${setTab}/>${members.length > 1 && html`<${Seg} value=${who} options=${members.map(x=>[x.id, firstName(x.name)])} onChange=${setWho}/>`}</div>
    <div className="inv" style=${{marginTop:10}}>${tab === "buy" ? shop.items.map((it,i)=>html`<div key=${i} className="inv-item"><div className="inv-main" style=${{cursor:"default"}}><${Icon} n=${itemIcon(it)} size=${20}/><span className="grow">${it.name}<div className="faint" style=${{fontSize:12.5}}>${[itemLine(it), it.desc].filter(Boolean).join(" · ")}${fits(it)}</div></span><b>${it.price} gp</b><button className="btn sm primary" disabled=${main.gold < it.price} onClick=${()=>buy(i)}>Buy</button></div></div>`)
      : ch.inventory.filter(it=>!it.quest).map(it=>html`<div key=${it.id} className="inv-item"><div className="inv-main" style=${{cursor:"default"}}><${Icon} n=${itemIcon(it)} size=${20}/><span className="grow">${it.name}${it.qty>1?` ×${it.qty}`:""}${isEquipped(ch,it.id)?html` <span className="chip">equipped</span>`:""}</span><b>${Math.max(1, Math.floor((it.value||1)/2 / mult))} gp</b><button className="btn sm" onClick=${()=>sell(it)}>Sell</button></div></div>`)}</div>
  <//>`;
}
function EventModal(){
  const c = C(); const ev = currentEvent(c); if (!ev){ setTimeout(() => { if (S().modal?.type === "event") closeModal(); }, 0); return null; }
  const vote = c.coop?.vote?.kind === "event" ? c.coop.vote : null;
  useEffect(() => { if (ev.rare) Sfx.play(ev.rare === "ominous" ? "alert" : "levelup"); }, [ev.id]); const votesFor = i => vote ? Object.entries(vote.votes).filter(([, o]) => o === String(i)).map(([p]) => Net.playerName(p)) : [];
  const main = PC();
  return html`<${Modal} title=${ev.title} onClose=${null}>
    ${ev.rare && html`<div className=${"rare-banner " + ev.rare}>${ev.rare === "legendary" ? "✦ Legendary encounter ✦" : ev.rare === "ominous" ? "☠ Ominous encounter" : "✦ Rare encounter"}<span>${ev.rare === "ominous" ? "Choose carefully: this could cost you." : "Fortune favors the bold… sometimes."}</span></div>`}
    ${c.event.context && html`<p className="faint" style=${{marginTop:0}}>${c.event.context}</p>`}
    <p className="event-text">${ev.text}</p>
    ${Coop.active() && html`<p className="faint" style=${{marginTop:0}}>Everyone votes. Majority wins; ties go to whoever voted first.</p>`}
    <div className="choices" style=${{marginTop:4}}>${ev.choices.map((ch,i)=>{ const best = ch.check && !ch.check.group && SKILLS[ch.check.skill] ? bestAt(c, ch.check.skill) : null; const poor = ch.cost?.gold && main.gold < ch.cost.gold;
      return html`<button key=${i} className="choice" disabled=${poor} onClick=${()=>coopEventChoice(i)}>${ch.check ? html`<span className="tag">${ch.check.group ? "Group " : ""}${SKILLS[ch.check.skill] ? ch.check.skill : `${ABIL_NAME[ch.check.skill] || ch.check.skill}${ch.check.save ? " save" : ""}`} ${ch.check.dc}</span>` : html`<span className="tag talk">›</span>`}${ch.label}${ch.cost?.gold && !/gp|gold/i.test(ch.label) ? html` <span className="faint" style=${{fontSize:12.5}}>(${ch.cost.gold} gp)</span>` : ""}${best && SKILLS[ch.check.skill] ? html` <span className="faint" style=${{fontSize:12.5}}>(${firstName(best.name)} ${fmt(skillMod(best, ch.check.skill))})</span>` : ""}${votesFor(i).length ? html` <span className="vb-who">${votesFor(i).join(", ")}</span>` : ""}</button>`; })}</div>
  <//>`;
}
function TravelModal({ m }){
  const c = C(); const to = c.locations[m.to]; const plan = travelPlan(c, m.to);
  if (!to || !plan) return html`<${Modal} title="Travel" onClose=${closeModal}><p>You can't find a way there from here.</p><//>`;
  const risk = encounterChance(c, plan); const riskLbl = risk < 0.2 ? "Low" : risk < 0.35 ? "Moderate" : "High";
  return html`<${Modal} title=${`Travel to ${to.name}`} onClose=${closeModal} foot=${html`<button className="btn ghost" onClick=${closeModal}>Not yet</button><button className="btn primary" disabled=${!!S().busy} onClick=${()=>coopTravel(m.to)}><${Icon} n="road" size=${18}/> Set out</button>`}>
    <div className="travel-grid">
      <div className="stat"><div className="v">${daysLabel(plan.days)}</div><div className="l">Journey</div></div>
      <div className="stat"><div className="v">${plan.miles} mi</div><div className="l">${plan.onRoad ? "By road" : plan.wild ? "Cross-country" : "Trails"}</div></div>
      <div className="stat"><div className="v">${riskLbl}</div><div className="l">Danger on the way</div></div>
    </div>
    <p>From <b>${plan.from.name}</b> through ${biomeWords(plan)}. ${to.discovered ? (to.description || "") : "You only know this place by rumor."}</p>
    ${isDangerPlace(to) && html`<div className=${"danger-badge " + levelWarning(c, to)}><${Icon} n="skull" size=${15}/> Recommended level ${to.lvl || 1}+ (your party: ${partyLevel(c)}).${levelWarning(c, to) === "deadly" ? " Turn back unless you're very sure." : ""}</div>`}
    ${isDelvable(to) && html`<p className="faint">Once there, you can explore it room by room.</p>`}
  <//>`;
}
function ServiceModal({ m }){
  const s = useStore(); const c = s.campaign; const town = c.locations[m.town]; const main = PC(); const members = partyMembers(c);
  const svc = m.svc; const info = SERVICE_INFO[svc];
  const [tab, setTab] = useState(svc === "guild" ? "recruit" : "main");
  useEffect(() => { if (svc === "board" && town && (!town.bounties || town.bountyDay == null || c.time.day - town.bountyDay >= 6)) refreshBoard(town.id); }, []);
  if (!town) return null;
  const mult = priceMult(c, town); const hated = standing(c, town) <= -50;
  const hurt = members.filter(x => x.hp < maxHp(x)); const healCost = Math.round(10 * hurt.length * mult);
  const afflicted = members.filter(x => x.conditions.some(k => ["poisoned","blinded","frightened","charmed","diseased","cursed","exhausted","paralyzed"].includes(k.name)));
  const fallen = (c.fallen||[]).map(f => c.characters[f.id]).filter(x => x && x.dead);
  const innCost = Math.max(1, Math.round(2 * members.length * mult));
  const pool = svc === "inn" || svc === "guild" ? recruitPool(c, town) : [];
  const pay = (gold, fn) => { if (main.gold < gold){ toast("Not enough gold.", "bad"); return false; } store.camp(c => { c.characters[c.activeCharId].gold -= gold; fn(c); }); return true; };
  const recruit = (r) => recruitAt(town.id, r.tpl.id, svc === "guild");
  const body = () => {
    if (svc === "inn" && tab === "main") return html`<div className="svc-list">
      <div className="svc-row"><div className="grow"><b>Rent rooms for the night</b><div className="faint">Long rest for the whole party (HP, spells and abilities restored). ${innCost} gp.</div></div><button className="btn primary sm" disabled=${!!s.busy} onClick=${()=>innRest(town.id)}>Rest</button></div>
      <div className="svc-row"><div className="grow"><b>Listen for rumors</b><div className="faint">Buy a round (5 gp) and hear what the locals know.</div></div><button className="btn sm" disabled=${!!s.busy || town.rumorDay === c.time.day} onClick=${()=>innRumors(town.id)}>${town.rumorDay === c.time.day ? "Heard today" : "Listen"}</button></div>
      <div className="svc-row"><div className="grow"><b>Talk with the locals</b><div className="faint">Strike up a conversation (the DM takes it from there).</div></div><button className="btn sm ghost" disabled=${!!s.busy} onClick=${()=>{ closeModal(); runDM("action", {text:`I head into the tavern in ${town.name} and look for someone interesting to talk to.`}); }}>Go</button></div>
    </div>`;
    if ((svc === "inn" || svc === "guild") && tab === "recruit") return html`<div>
      <p className="faint" style=${{marginTop:0}}>Party ${members.length}/${MAX_PARTY}. ${svc === "guild" ? "Guild veterans charge double but join immediately." : "Adventurers looking for work."} Fees come from the party purse (${main.gold} gp).</p>
      <div className="recruits">${pool.length ? pool.map(r => html`<div key=${r.tpl.id} className="recruit slab">
        <div className="row" style=${{gap:10}}><${Portrait} ch=${{tpl: r.tpl.id, race: r.tpl.race, cls: r.tpl.cls, name: r.tpl.name, dragonType: r.tpl.dragon}} size=${44}/><div className="grow"><b>${r.tpl.name}</b><div className="faint" style=${{fontSize:13}}>Level ${r.level} ${r.tpl.race} ${r.tpl.cls} · ${r.tpl.role}</div></div><b className="gold-t">${svc === "guild" ? r.fee*2 : r.fee} gp</b></div>
        <p style=${{margin:"8px 0 4px"}}>${r.tpl.personality}</p><p className="faint" style=${{margin:0, fontSize:13}}>"${r.tpl.voice}" · Wants: ${r.tpl.hook}</p>
        <p className="faint" style=${{margin:"4px 0 8px", fontSize:12.5}}>Likes ${r.tpl.likes.join(", ")} · dislikes ${r.tpl.dislikes.join(", ")}</p>
        <button className="btn primary sm" disabled=${members.length >= MAX_PARTY || main.gold < (svc === "guild" ? r.fee*2 : r.fee) || !!s.busy} onClick=${()=>recruit(r)}>Recruit</button></div>`) : html`<p className="muted">No one is looking for work right now. Try another town, or come back in a few days.</p>`}</div></div>`;
    if (svc === "temple") return html`<div className="svc-list">
      <div className="svc-row"><div className="grow"><b>Tend wounds</b><div className="faint">${hurt.length ? `Restore ${hurt.length} wounded member${hurt.length>1?"s":""} to full health. ${healCost} gp.` : "Nobody is hurt."}</div></div><button className="btn sm primary" disabled=${!hurt.length} onClick=${()=>templeHeal(town.id)}>Heal</button></div>
      <div className="svc-row"><div className="grow"><b>Cure afflictions</b><div className="faint">${afflicted.length ? `Lift poisons, curses, exhaustion and fear. 25 gp.` : "Nobody is afflicted."}</div></div><button className="btn sm" disabled=${!afflicted.length} onClick=${()=>templeCure(town.id)}>Cure</button></div>
      ${fallen.map(f => { const cost = 250 + 50 * f.level; return html`<div key=${f.id} className="svc-row"><div className="grow"><b>Raise ${f.name}</b><div className="faint">Return a fallen companion to life. ${cost} gp.${members.length >= MAX_PARTY ? " (Party is full.)" : ""}</div></div><button className="btn sm magic" disabled=${members.length >= MAX_PARTY} onClick=${()=>templeRaise(town.id, f.id)}>Raise</button></div>`; })}
    </div>`;
    if (svc === "board") return html`<div className="svc-list">${(town.bounties||[]).length ? town.bounties.map(b => html`<div key=${b.id} className="svc-row bounty"><div className="grow"><b>${b.title}</b><div>${b.text}</div><div className="faint" style=${{fontSize:12.5}}>Reward: ${b.gold} gold, ${b.xp} XP each</div></div><button className="btn sm primary" onClick=${()=>takeBounty(town.id, b.id)}>Accept</button></div>`) : html`<p className="muted">The board is bare. Check back in a few days.</p>`}</div>`;
    return null;
  };
  const tabs = svc === "inn" ? [["main","Tavern"],["recruit","Recruit"]] : null;
  if (hated && svc !== "board") return html`<${Modal} title=${`${info.label} · ${town.name}`} onClose=${closeModal}><p>Nobody here will serve you. Your reputation in ${town.name} is ${standingLabel(standing(c, town)).toLowerCase()}. Complete work for the town or pay your fines to the watch to mend it.</p><//>`;
  return html`<${Modal} title=${`${info.label} · ${town.name}`} onClose=${closeModal} wide=${svc === "inn" || svc === "guild"}>
    <div className="faint" style=${{fontSize:13}}>Your standing here: <b>${standingLabel(standing(c, town))}</b> (${standing(c, town)})${mult !== 1 ? `, prices ×${mult}` : ""}</div>
    ${tabs && html`<${Seg} value=${tab} options=${tabs} onChange=${setTab}/>`}
    ${svc === "guild" && html`<button className="btn sm" style=${{alignSelf:"flex-start"}} onClick=${()=>openShop(town.id, "guild")}>Browse the quartermaster's rare wares</button>`}
    ${body()}
  <//>`;
}
function LevelUpModal({ m }){
  const c = C(); const ch = (m?.charId && c?.characters[m.charId]) || PC(); const plan = useMemo(() => levelPlan(ch), [ch.id, ch.level]); const C0 = CLASSES[ch.cls];
  const [hp, setHp] = useState(null); const [asiMode, setAsiMode] = useState("two"); const [inc, setInc] = useState({}); const [feat, setFeat] = useState("");
  const [sub, setSub] = useState(""); const [cantrips, setCantrips] = useState([]); const [spells, setSpells] = useState([]); const [invs, setInvs] = useState([]); const [fs, setFs] = useState(""); const [ex, setEx] = useState([]);
  const L = CLASS_LETTER[ch.cls]; const known = new Set([...ch.cantrips, ...ch.spells]);
  const canPool = L ? SPELLS.filter(s => s.l === 0 && s.c.includes(L) && !known.has(s.n)) : [];
  const spPool = L ? SPELLS.filter(s => s.l >= 1 && s.l <= plan.maxSpell && s.c.includes(L) && !known.has(s.n)) : [];
  const incTotal = Object.values(inc).reduce((a,b)=>a+b,0);
  const asiOk = !plan.asi || (asiMode === "feat" ? !!feat : incTotal === 2 && ABILS.every(k => ch.abilities[k] + (inc[k]||0) <= 20));
  const ok = hp != null && asiOk && (!plan.subclass || sub) && cantrips.length === Math.min(plan.cantrips, canPool.length) && spells.length === Math.min(plan.spells, spPool.length) && invs.length === plan.invocations && (!plan.fightingStyle || fs) && ex.length === plan.expertise;
  const tog = (arr, set, v, max) => set(arr.includes(v) ? arr.filter(x=>x!==v) : arr.length < max ? [...arr, v] : arr);
  const rollHp = async () => { const v = d(C0.hd); await showRoll({label:`Hit die (d${C0.hd})`, dice:[{sides:C0.hd, values:[v], kept:v}], mod: mods(ch).CON, total: Math.max(1, v + mods(ch).CON), quick:true}); setHp(v); };
  const confirm = () => {
    applyHeroLevelUp(ch.id, { fromLevel: ch.level, hpRoll: hp, asi: plan.asi ? (asiMode === "feat" ? {feat} : {inc}) : null, subclass: sub || null, cantrips, spells, invocations: invs, fightingStyle: fs || null, expertise: ex });
    closeModal(); Sfx.play("levelup");
  };
  const featsAvail = Object.keys(FEATS).filter(f => !(ch.feats||[]).includes(f));
  return html`<${Modal} title=${`${ch.id === c.activeCharId ? "" : `${firstName(ch.name)}: `}Level ${plan.level} ${ch.cls}`} onClose=${closeModal} wide=${true} foot=${html`<button className="btn ghost" onClick=${closeModal}>Later</button><button className="btn gold" disabled=${!ok} onClick=${confirm}>Become level ${plan.level}</button>`}>
    <div className="lv-sec"><h3>New at this level</h3><ul className="feat-list">${plan.feats.map(f=>html`<li key=${f}><b>${f}</b>${FEATURE_TEXT[f] ? html`<div className="faint">${FEATURE_TEXT[f]}</div>` : null}</li>`)}
      ${plan.level % 4 === 1 && html`<li>Proficiency bonus rises to ${fmt(profBonus(plan.level))}.</li>`}${plan.maxSpell > maxSpellLevel(ch) && html`<li>You can now cast level ${plan.maxSpell} spells.</li>`}</ul></div>
    <div className="lv-sec"><h3>Hit points</h3><div className="row wrap" style=${{gap:8}}>
      <button className=${"btn" + (hp!=null?" ghost":" primary")} disabled=${hp!=null} onClick=${rollHp}><${Icon} n="d20" size=${16}/> Roll d${C0.hd}</button>
      <button className="btn ghost" disabled=${hp!=null} onClick=${()=>setHp(Math.floor(C0.hd/2)+1)}>Take ${Math.floor(C0.hd/2)+1}</button>
      ${hp != null && html`<span className="chip good">+${Math.max(1, hp + mods(ch).CON) + (RACES[ch.race].hpPerLevel?1:0) + ((ch.feats||[]).includes("Tough")?2:0)} max HP</span>`}</div></div>
    ${plan.subclass && html`<div className="lv-sec"><h3>Choose your path</h3><div className="pick-grid">${C0.subs.map(sb=>html`<button key=${sb.n} className=${"pick" + (sub===sb.n?" on":"")} onClick=${()=>setSub(sb.n)}><span className="t">${sb.n}</span><span className="d">${sb.d}</span></button>`)}</div></div>`}
    ${plan.asi && html`<div className="lv-sec"><h3>Ability Score Improvement</h3><${Seg} value=${asiMode} options=${[["two","+1 to two"],["one","+2 to one"],["feat","Take a feat"]]} onChange=${v=>{ setAsiMode(v); setInc({}); setFeat(""); }}/>
      ${asiMode === "feat" ? html`<div className="pick-grid" style=${{marginTop:8}}>${featsAvail.map(f=>html`<button key=${f} className=${"pick" + (feat===f?" on":"")} onClick=${()=>setFeat(f)}><span className="t">${f}</span><span className="d">${FEATS[f]}</span></button>`)}</div>`
        : html`<div className="ab-grid" style=${{marginTop:8}}>${ABILS.map(k=>{ const v = inc[k]||0; const on = v > 0;
          return html`<button key=${k} className=${"ab parch" + (on?" on":"")} disabled=${ch.abilities[k] >= 20} onClick=${()=>setInc(asiMode==="one" ? (on ? {} : {[k]:2}) : (on ? Object.fromEntries(Object.entries(inc).filter(([x])=>x!==k)) : incTotal < 2 ? {...inc, [k]:1} : inc))}>
            <div className="n">${ABIL_NAME[k]}</div><div className="v">${ch.abilities[k] + v}</div><div className="b">${v ? `+${v}` : " "}</div></button>`; })}</div>`}</div>`}
    ${plan.fightingStyle && html`<div className="lv-sec"><h3>Fighting style</h3><div className="pick-grid">${Object.entries(FIGHTING_STYLES).filter(([k])=> ch.cls==="Paladin" ? k!=="Archery" : k!=="Great Weapon Fighting").map(([k,v])=>html`<button key=${k} className=${"pick" + (fs===k?" on":"")} onClick=${()=>setFs(k)}><span className="t">${k}</span><span className="d">${v}</span></button>`)}</div></div>`}
    ${plan.expertise > 0 && html`<div className="lv-sec"><h3>Expertise <span className="chip">${ex.length}/${plan.expertise}</span></h3><div className="checkl">${ch.skills.filter(sk=>!ch.expertise.includes(sk)).map(sk=>html`<label key=${sk} className=${ex.includes(sk)?"on":""}><input type="checkbox" checked=${ex.includes(sk)} onChange=${()=>tog(ex, setEx, sk, plan.expertise)}/>${sk}</label>`)}</div></div>`}
    ${plan.invocations > 0 && html`<div className="lv-sec"><h3>Eldritch invocations <span className="chip">${invs.length}/${plan.invocations}</span></h3><div className="pick-grid">${Object.entries(INVOCATIONS).filter(([k])=>!(ch.invocations||[]).includes(k)).map(([k,v])=>html`<button key=${k} className=${"pick" + (invs.includes(k)?" on":"")} onClick=${()=>tog(invs, setInvs, k, plan.invocations)}><span className="t">${k}</span><span className="d">${v}</span></button>`)}</div></div>`}
    ${plan.cantrips > 0 && canPool.length > 0 && html`<div className="lv-sec"><h3>New cantrips <span className="chip">${cantrips.length}/${Math.min(plan.cantrips, canPool.length)}</span></h3><div className="spell-pick">${canPool.map(sp=>html`<button key=${sp.n} className=${cantrips.includes(sp.n)?"on":""} onClick=${()=>tog(cantrips, setCantrips, sp.n, plan.cantrips)}><div className="sn">${sp.n}</div><div className="sd">${sp.d}</div></button>`)}</div></div>`}
    ${plan.spells > 0 && spPool.length > 0 && html`<div className="lv-sec"><h3>New spells <span className="chip">${spells.length}/${Math.min(plan.spells, spPool.length)}</span></h3><div className="spell-pick">${spPool.map(sp=>html`<button key=${sp.n} className=${spells.includes(sp.n)?"on":""} onClick=${()=>tog(spells, setSpells, sp.n, plan.spells)}><div className="sn">${sp.n} <span className="faint" style=${{fontWeight:400,fontSize:12}}>level ${sp.l}</span></div><div className="sd">${sp.d}</div></button>`)}</div></div>`}
  <//>`;
}
</script>
