<script>
"use strict";
// ---------- Online co-op UI (website only; hidden when window.Net is absent) ----------
const onlineNet = () => window.Net || null;
const spectating = () => !!window.Net?.isGuest();
function seatInfo(heroId){ const N = onlineNet(); if (!N?.isOnline()) return null; const c = C(); if (c && heroId === c.activeCharId) return { name: N.hostName(), mine: N.isHost() }; const pid = N.seatOwner(heroId); return pid ? { name: N.playerName(pid), mine: pid === N.me.id } : null; }
function OnlineChip(){
  const s = useStore(); const N = onlineNet(); if (!N) return null; const on = s.online;
  const label = on?.code ? html`${on.code}<span className="oc-n"> · ${on.players.filter(p => p.connected).length}/${on.players.length}</span>` : "Play online";
  const dot = on?.code ? (on.status === "connected" ? "ok" : "warn") : "off";
  return html`<button className="online-chip" onClick=${()=>openModal({type:"online"})} title="Online co-op"><span className=${"odot " + dot}></span>${label}</button>`;
}
function SpectatorBanner(){
  const s = useStore(); const N = onlineNet(); if (!N?.isGuest()) return null; const seat = N.mySeat(); const hero = seat && s.campaign?.characters?.[seat];
  const lvl = hero && canLevelHere(s.campaign, hero);
  return html`<div className="spectator"><span className="odot ok"></span>${lvl ? html`<button className="btn gold sm" onClick=${()=>openModal({type:"levelup", charId: hero.id})}>★ Level up to ${hero.level + 1}</button>` : ""}<span className="grow">You're in <b>${N.hostName()}</b>'s game${hero ? html` as <b>${hero.name}</b>. You take ${firstName(hero.name)}'s turns and rolls, act by typing below, and vote on big decisions.` : html`. Pick a hero in the Room panel to play; you can still act and vote as yourself.`}</span><button className="btn sm ghost" onClick=${()=>openModal({type:"online"})}>Room</button></div>`;
}
function OnlineModal({ m }){
  const s = useStore(); const N = onlineNet(); const on = s.online;
  const [tab, setTab] = useState(m.join ? "join" : (s.campaign ? "host" : "join"));
  const [name, setName] = useState(N?.me.name || PC()?.name || ""); const [code, setCode] = useState(m.join || ""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (!N) return null;
  const run = async (fn) => { setBusy(true); setErr(""); const r = await fn(); setBusy(false); if (!r?.ok) setErr(r?.error || "Something went wrong."); };
  if (!on?.code) return html`<${Modal} title="Play online" onClose=${closeModal}>
    <p className="faint" style=${{marginTop:0}}>Play one campaign together. The host's browser runs the game; everyone sees the story, dice and battles live.</p>
    <${Seg} value=${tab} options=${[["host","Host a room"],["join","Join a room"]]} onChange=${t=>{ setTab(t); setErr(""); }}/>
    <div className="field" style=${{marginTop:12}}><label htmlFor="oname">Your name</label><input id="oname" className="input" maxLength=${24} value=${name} onInput=${e=>setName(e.target.value)} placeholder="How others see you"/></div>
    ${tab === "host" ? html`<div className="host-opts">
        <div className="svc-row"><div className="grow"><b>New co-op adventure</b><div className="faint" style=${{fontSize:13}}>Open a lobby: choose the party size, which seats are human or AI, and everyone creates their own hero.</div></div>
          <button className="btn primary sm" disabled=${busy || !name.trim()} onClick=${()=>run(async()=>{ const r = await N.createLobby(name); if (r.ok){ closeModal(); store.set({view:"lobby"}); } return r; })}>Open lobby</button></div>
        ${s.campaign && html`<div className="svc-row"><div className="grow"><b>Host ${s.campaign.name}</b><div className="faint" style=${{fontSize:13}}>Continue this campaign together. Friends can take over a companion or join with a new hero.</div></div>
          <button className="btn sm" disabled=${busy || !name.trim()} onClick=${()=>run(()=>N.create(name))}>Host it</button></div>`}</div>`
    : html`<div className="field"><label htmlFor="ocode">Room code</label><input id="ocode" className="input code-in" maxLength=${8} value=${code} onInput=${e=>setCode(e.target.value.toUpperCase())} placeholder="ABCDE"/></div>
        <button className="btn primary" disabled=${busy || !name.trim() || code.trim().length < 4} onClick=${()=>run(async()=>{ const r = await N.join(code, name); if (r.ok) closeModal(); return r; })}>${busy ? "Joining…" : "Join"}</button>`}
    ${err && html`<p className="banner bad" style=${{marginTop:10}}>${err}</p>`}
  <//>`;
  const heroes = on.heroes || []; const mine = N.mySeat();
  return html`<${Modal} title="Online room" onClose=${closeModal} wide=${true} foot=${html`<button className="btn ghost" onClick=${()=>openModal({type:"confirm", text: N.isHost() ? "Leave the room? Another player will take over as host." : "Leave the room?", okLabel:"Leave", ok:()=>N.leave()})}>Leave room</button><button className="btn primary" onClick=${closeModal}>Done</button>`}>
    <div className="room-code"><div><div className="faint">Room code</div><div className="rc">${on.code}</div></div>
      <button className="btn sm" onClick=${()=>{ navigator.clipboard?.writeText(N.inviteLink()).then(()=>toast("Invite link copied.")).catch(()=>toast(N.inviteLink())); }}>Copy invite link</button>
      <span className=${"chip " + (on.status === "connected" ? "good" : "hp")}>${on.status === "connected" ? "Connected" : "Reconnecting…"}</span></div>
    <h3 className="panel-title" style=${{marginTop:12}}>Players</h3>
    <div className="svc-list">${on.players.map(p => html`<div key=${p.id} className="svc-row"><span className=${"odot " + (p.connected ? "ok" : "warn")}></span><div className="grow"><b>${p.name}</b>${p.host ? " 👑 host" : ""}${p.id === N.me.id ? html` <span className="faint">(you)</span>` : ""}${!p.connected ? html` <span className="faint">reconnecting…</span>` : ""}</div>
      ${N.isHost() && p.id !== N.me.id && html`<button className="btn sm ghost" onClick=${()=>N.kick(p.id)}>Remove</button>`}</div>`)}</div>
    <h3 className="panel-title" style=${{marginTop:12}}>Heroes</h3>
    <div className="svc-list">${heroes.map(h => { const owner = h.main ? on.hostId : on.seats[h.id]; const ownerName = owner ? on.players.find(p => p.id === owner)?.name : null;
      const locked = !!on.locked?.[h.id];
      return html`<div key=${h.id} className="svc-row"><${Portrait} ch=${C()?.characters?.[h.id] || {id: h.id, name: h.name, cls: h.cls}} size=${32}/><div className="grow"><b>${h.name}</b> <span className="faint">L${h.level} ${h.cls}</span><div className="faint" style=${{fontSize:12.5}}>${h.main ? `Leader, played by ${ownerName || "the host"}` : ownerName ? `Played by ${ownerName}${h.player ? " (their own hero)" : ""}` : h.player ? "Player character, played by the AI while its player is away" : locked ? "AI companion (AI only)" : "AI companion"}</div></div>
        ${!h.main && N.isHost() && !h.player && html`<label className="row" style=${{gap:5, fontSize:12.5}}><input type="checkbox" checked=${locked} onChange=${e=>N.lock(h.id, e.target.checked)}/> AI only</label>`}
        ${!h.main && !owner && !N.isHost() && !locked && html`<button className="btn sm primary" onClick=${async()=>{ const r = await N.claim(h.id); if (!r.ok) toast(r.error || "Couldn't take that hero.", "bad"); }}>${mine ? "Switch to" : "Take control"}</button>`}
        ${!h.main && owner && (owner === N.me.id || N.isHost()) && html`<button className="btn sm ghost" onClick=${()=>N.release(h.id)}>${owner === N.me.id ? "Release" : "Return to AI"}</button>`}</div>`; })}</div>
    ${!N.isHost() && !mine && heroes.length < MAX_PARTY && html`<div className="svc-row" style=${{marginTop:8}}><div className="grow"><b>Bring your own hero</b><div className="faint" style=${{fontSize:12.5}}>Create a character; they join the party at its current level.</div></div><button className="btn sm primary" onClick=${()=>{ closeModal(); store.set({view:"create", creatorLobby:{mode:"join"}}); }}>Create a hero</button></div>`}
    <p className="faint" style=${{fontSize:12.5}}>Heroes nobody controls are played by the AI, and so is anyone's hero while its player is disconnected or takes longer than 60 seconds on a turn.</p>
  <//>`;
}
</script>
<script>
"use strict";
// ======================= CO-OP PLAY (host-side rules + shared UI) =======================
const TURN_MS = 60000, VOTE_MS = 30000;
const Coop = {
  remoteCall: null,
  on(){ const N = window.Net; return !!N?.isOnline(); },
  active(){ const N = window.Net; return !!N?.isOnline() && N.room.players.filter(p => p.connected).length >= 2; },
  whoLabel(pid){ const N = window.Net; const c = C(); if (!N || !c) return null; if (pid === N.room?.hostId) return c.characters[c.activeCharId]?.name; const hero = Object.entries(N.room?.seats || {}).find(([, p]) => p === pid)?.[0]; return hero ? c.characters[hero]?.name : N.playerName(pid); },
  // --- proposing & voting (any player) ---
  propose(kind, payload, choice){
    if (!this.active()) return this.execute(kind, payload, choice);
    if (Net.isHost()) return this.hostPropose(Net.me.id, kind, payload, choice);
    Net.intent({ type: "propose", kind, payload, choice });
  },
  vote(voteId, option){ if (Net.isHost()) this.hostVote(Net.me.id, voteId, option); else Net.intent({ type: "vote", voteId, option }); },
  // --- host ---
  optionsFor(c, kind, payload){
    if (kind === "travel"){ const to = c.locations[payload.to]; return to ? { title: `Travel to ${to.name}?`, options: [{ id: "yes", label: `Go to ${to.name}` }, { id: "no", label: "Stay here" }] } : null; }
    if (kind === "camp") return { title: "Make camp for the night?", options: [{ id: "yes", label: "Make camp" }, { id: "no", label: "Keep going" }] };
    if (kind === "event"){ const ev = currentEvent(c); return ev ? { title: ev.title, options: ev.choices.map((x, i) => ({ id: String(i), label: x.label })) } : null; }
    if (kind === "choice"){ const ch = c.choices || []; return ch.length ? { title: "What does the party do?", options: ch.map((x, i) => ({ id: String(i), label: x.text })) } : null; }
    return null;
  },
  hostPropose(pid, kind, payload, choice){
    const c = C(); if (!c) return; if (c.coop?.vote){ if (c.coop.vote.kind === kind) return this.hostVote(pid, c.coop.vote.id, choice); return; }
    const o = this.optionsFor(c, kind, payload || {}); if (!o) return;
    const opt = o.options.some(x => x.id === choice) ? choice : null;
    store.camp(c => { c.coop = { ...(c.coop || {}), vote: { id: uid("v"), kind, payload: payload || {}, title: o.title, options: o.options, votes: opt ? { [pid]: opt } : {}, by: pid, byName: Net.playerName(pid), deadline: Date.now() + VOTE_MS } }; });
    this.check();
  },
  hostVote(pid, voteId, option){
    let ok = false; store.camp(c => { const v = c.coop?.vote; if (!v || v.id !== voteId || !v.options.some(o => o.id === option)) return; v.votes[pid] = option; ok = true; });
    if (ok) this.check();
  },
  check(){
    const v = C()?.coop?.vote; if (!v || !Net.isHost()) return;
    const voters = Net.room.players.filter(p => p.connected).map(p => p.id);
    if (voters.every(id => v.votes[id] != null) || Date.now() >= v.deadline) this.resolve();
  },
  resolve(){
    const v = C().coop.vote; const counts = {}; for (const o of Object.values(v.votes)) counts[o] = (counts[o] || 0) + 1;
    const top = Math.max(0, ...Object.values(counts));
    const tied = v.options.filter(o => (counts[o.id] || 0) === top).map(o => o.id);
    const win = tied.length === 1 ? tied[0] : (tied.includes(v.votes[v.by]) ? v.votes[v.by] : tied.includes(v.votes[Net.room.hostId]) ? v.votes[Net.room.hostId] : (top ? tied[0] : v.options[v.options.length - 1].id));
    const label = v.options.find(o => o.id === win)?.label || win;
    store.camp(c => { c.coop.vote = null; pushLog(c, { kind: "sys", notes: [{ kind: "npc", text: `Party vote: ${label}${Object.keys(v.votes).length > 1 ? ` (${counts[win] || 0} of ${Object.keys(v.votes).length})` : ""}` }] }); });
    this.execute(v.kind, v.payload, win);
  },
  execute(kind, payload, choice){
    if (kind === "travel"){ if (choice !== "no") beginTravel(payload.to); }
    else if (kind === "camp"){ if (choice !== "no") requestRest("long"); }
    else if (kind === "event"){ closeModal(); resolveEvent(+choice); }
    else if (kind === "choice"){ const x = (C().choices || [])[+choice]; if (x) runDM("action", { text: x.text, mode: /^["“]/.test(x.text) ? "say" : "do", who: Coop.on() ? "The party" : undefined }); }
  },
  // typed actions from guests: run now, or queue while the DM is busy and send together
  hostAction(pid, text, mode){
    const who = this.whoLabel(pid) || "A player";
    store.camp(c => { c.coop = { ...(c.coop || {}), queue: [...(c.coop?.queue || []), { id: uid("q"), pid, who, text: String(text).slice(0, 600), mode }] }; });
    this.flush();
  },
  flush(){
    const c = C(); const q = c?.coop?.queue || []; if (!q.length || S().busy || c.combat || c.pendingRoll || c.coop?.vote || S().modal?.type === "event") return;
    store.camp(c => { c.coop.queue = []; });
    if (q.length === 1) return runDM("action", { text: q[0].text, mode: q[0].mode, who: q[0].who });
    runDM("action", { text: q.map(x => `[${x.who}] ${x.mode === "say" ? `says "${x.text}"` : x.text}`).join("\n"), mode: "do", who: "The party" });
  },
  // host heartbeat: votes, combat turn timers, AI stand-ins, queued actions
  tick(){
    if (!Net.isHost() || Net.inLobby()) return; const c = C(); if (!c) return;
    if (c.coop?.vote) this.check();
    const cm = c.combat;
    if (cm?.status === "active"){
      const cur = curCb(c); const ctl = cur && cur.kind === "pc" ? Net.controllerOf(c, cur) : null;
      if (ctl && ctl !== Net.me.id){
        const key = `${cm.id}:${cm.round}:${cm.turn}`;
        if (cm.turnTimer?.key !== key) store.camp(c => { c.combat.turnTimer = { key, deadline: Date.now() + TURN_MS, pid: ctl }; });
        else if (Date.now() > cm.turnTimer.deadline && !S().busy && !S().overlay){
          store.camp(c => { const cb = curCb(c); if (!cb) return; clog(c, "sys", `_${firstName(cbChar(c, cb).name)} hesitates, and instinct takes over._`); aiHeroTurn(c, cb); clog(c, "sys", ""); if (!checkEnd(c)) advanceTurn(c); });
          combatLoop();
        }
      } else if (cur && !isPlayerCtrl(c, cur) && !S().busy) combatLoop();
    }
    this.flush();
  },
  // intents from guests (validated here, then run exactly as if the host had clicked)
  handle(pid, it){
    const c = C(); if (!c || !it || typeof it !== "object" || Net.inLobby()) return;
    if (it.type === "combat"){
      const allowed = ["pcAttack", "pcCast", "pcAbility", "pcBasic", "pcMove", "pcRunAway", "pcUseItem", "pcDeathSave", "pcCustom", "endPlayerTurn", "pcShove"];
      const cur = curCb(c); if (!allowed.includes(it.fn) || !c.combat || c.combat.status !== "active" || !cur || Net.controllerOf(c, cur) !== pid) return;
      const f = Net.orig[it.fn] || window[it.fn]; if (typeof f === "function") f(...(Array.isArray(it.args) ? it.args.slice(0, 4) : []));
    } else if (it.type === "roll"){
      const pr = c.pendingRoll; if (!pr || !pr.who || Net.controllerOf(c, { kind: "pc", ref: pr.who, main: pr.who === c.activeCharId }) !== pid) return;
      doPendingRoll({ who: pr.who });
    } else if (it.type === "action"){ if (typeof it.text === "string" && it.text.trim()) this.hostAction(pid, it.text.trim(), it.mode === "say" ? "say" : "do"); }
    else if (it.type === "propose"){ if (["travel", "camp", "event", "choice"].includes(it.kind)) this.hostPropose(pid, it.kind, it.payload, it.choice); }
    else if (it.type === "vote"){ this.hostVote(pid, it.voteId, it.option); }
    else if (it.type === "addHero"){ if (it.draft && typeof it.draft === "object") hostAddHero(pid, it.draft); }
    else if (it.type === "call"){
      // a player's click on a shared action (shop, inn, dungeon, gear…): run it here, reply to them only
      const fn = String(it.fn || ""); if (!(fn in (Net.CALLS || {})) || c.combat) return;
      const f = window[fn]; if (typeof f !== "function") return;
      const prev = this.remoteCall; this.remoteCall = pid;
      let r; try { r = f(...(Array.isArray(it.args) ? it.args.slice(0, 4) : [])); } finally { if (!(r && typeof r.then === "function")) this.remoteCall = prev; }
      if (r && typeof r.then === "function") r.catch(e => console.warn(e)).finally(() => { this.remoteCall = prev; });
    }
  }
};
function coopTravel(id){ closeModal(); if (Coop.active()) return Coop.propose("travel", { to: id }, "yes"); return beginTravel(id); }
function coopCamp(){ if (Coop.active()) return Coop.propose("camp", {}, "yes"); return requestRest("long"); }
function coopEventChoice(i){ if (Coop.active()){ const v = C().coop?.vote; if (v?.kind === "event") return Coop.vote(v.id, String(i)); return Coop.propose("event", {}, String(i)); } return resolveEvent(i); }
function coopDialogue(i){ if (Coop.active()){ const v = C().coop?.vote; if (v?.kind === "choice") return Coop.vote(v.id, String(i)); return Coop.propose("choice", {}, String(i)); } const x = (C().choices || [])[i]; if (x) runDM("action", { text: x.text, mode: /^["“]/.test(x.text) ? "say" : "do" }); }
function onlineWho(){ const N = window.Net; if (!N?.isOnline()) return undefined; return Coop.whoLabel(N.me.id); }

function useNow(ms = 1000){ const [, f] = useReducer(x => x + 1, 0); useEffect(() => { const t = setInterval(f, ms); return () => clearInterval(t); }, [ms]); return Date.now(); }
function VoteBar(){
  const s = useStore(); const v = s.campaign?.coop?.vote; const N = window.Net; const now = useNow(); if (!v || !N) return null;
  const mine = v.votes[N.me.id]; const left = Math.max(0, Math.ceil((v.deadline - now) / 1000));
  const voters = N.room?.players.filter(p => p.connected) || [];
  return html`<div className="votebar parch"><div className="vb-head"><b>${v.title}</b><span className="faint">${v.byName} called a vote · ${left}s</span></div>
    <div className="vb-opts">${v.options.map(o => { const who = Object.entries(v.votes).filter(([, x]) => x === o.id).map(([p]) => N.playerName(p));
      return html`<button key=${o.id} className=${"vb-opt" + (mine === o.id ? " on" : "")} onClick=${()=>Coop.vote(v.id, o.id)}><span>${o.label}</span>${who.length ? html`<span className="vb-who">${who.join(", ")}</span>` : null}</button>`; })}</div>
    <div className="faint" style=${{fontSize:12}}>${Object.keys(v.votes).length}/${voters.length} voted. Majority wins; ties go to whoever called the vote.</div></div>`;
}
function CoopQueue(){
  const s = useStore(); const q = s.campaign?.coop?.queue || []; if (!q.length) return null;
  return html`<div className="coop-queue">${q.map(x => html`<span key=${x.id} className="chip">${x.who}: ${x.text.slice(0, 60)}${x.text.length > 60 ? "…" : ""} <span className="faint">(waiting for the DM)</span></span>`)}</div>`;
}
function TurnTimer(){
  const s = useStore(); const tt = s.campaign?.combat?.turnTimer; const now = useNow(); if (!tt) return null; const left = Math.max(0, Math.ceil((tt.deadline - now) / 1000));
  return html`<span className=${"turn-timer" + (left <= 10 ? " low" : "")}>${left}s</span>`;
}
function ChatButton(){
  const s = useStore(); const N = window.Net; if (!N?.isOnline()) return null; const n = s.chatUnread || 0;
  return html`<button className="online-chip chat-btn" onClick=${()=>store.set({chatOpen: !S().chatOpen, chatUnread: 0})} title="Party chat">💬${n ? html`<span className="chat-n">${n}</span>` : ""}</button>`;
}
function ChatPanel(){
  const s = useStore(); const N = window.Net; const [t, setT] = useState(""); const ref = useRef(null);
  const msgs = s.chat || [];
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs.length, s.chatOpen]);
  if (!N?.isOnline() || !s.chatOpen) return null;
  const send = () => { const v = t.trim(); if (!v) return; N.chatSend(v); setT(""); };
  return html`<div className="chat-panel parch" role="dialog" aria-label="Party chat"><div className="row" style=${{justifyContent:"space-between"}}><b>Party chat</b><button className="btn ghost sm" onClick=${()=>store.set({chatOpen:false})} aria-label="Close chat">✕</button></div>
    <div className="chat-msgs" ref=${ref}>${msgs.length ? msgs.map(m => html`<div key=${m.id} className=${"chat-m" + (m.pid === N.me.id ? " mine" : "")}><b>${m.name}</b> ${m.text}</div>`) : html`<div className="faint">Out-of-character chat for your group. The DM doesn't see it.</div>`}</div>
    <div className="row" style=${{gap:6}}><input className="input grow" maxLength=${300} value=${t} placeholder="Say something…" onInput=${e=>setT(e.target.value)} onKeyDown=${e=>{ if (e.key === "Enter") send(); }}/><button className="btn sm primary" onClick=${send}>Send</button></div></div>`;
}
</script>
<script>
"use strict";
// ======================= LOBBY (new co-op games) =======================
function heroRole(cls){ return ["Fighter","Barbarian","Paladin"].includes(cls) ? "tank" : ["Cleric","Bard"].includes(cls) ? "support" : ["Wizard","Druid"].includes(cls) ? "controller" : "striker"; }
// Player-created heroes join the party like companions (so every system works) but act like people:
// no personality, approval, banter, betrayal or personal quest; the AI only stands in while their player is away.
function playerHeroBlock(ch, pid, playerName){ const role = heroRole(ch.cls); return { tpl: null, player: true, owner: pid, playerName, personality: "", voice: "", likes: [], dislikes: [], hook: ch.backstory || "", role, tactic: role === "support" ? "support" : "balanced", ctrl: "ai", approval: 0, joined: null }; }
async function startFromLobby(){
  const N = window.Net; const L = N.room.lobby;
  const hostSeat = L.seats.find(x => x.pid === N.me.id && x.kind === "human" && x.draft);
  if (!hostSeat) return toast("Create your hero first.", "bad");
  const used = new Set(L.seats.filter(x => x.kind === "ai" && x.tpl).map(x => x.tpl));
  const spare = () => { const t = COMPANIONS.find(t => !used.has(t.id)) || COMPANIONS[0]; used.add(t.id); return t; };
  const main = buildCharacter(hostSeat.draft); const extra = [], seatMap = {}, locked = {};
  for (const x of L.seats){
    if (x === hostSeat) continue; let ch;
    if (x.kind === "human" && x.pid && x.draft){ try { ch = buildCharacter(x.draft); ch.companion = playerHeroBlock(ch, x.pid, N.playerName(x.pid)); seatMap[ch.id] = x.pid; } catch { ch = null; } }
    if (!ch){ ch = buildCompanion(COMPANIONS.find(t => t.id === x.tpl) || spare(), 1); if (x.kind === "ai" && x.pid) seatMap[ch.id] = x.pid; if (x.lock) locked[ch.id] = true; }
    extra.push(ch);
  }
  const P = L.premise || {}; const premise = { tone: "Heroic", setting: "Classic kingdoms", difficulty: "standard", custom: "", ...P, name: (P.name || "").trim() || `The ${pick(["Ballad","Chronicle","Saga","Tale","Legend"])} of ${main.name}` };
  N.starting = true;
  const run = createCampaign(main, premise, [], extra);   // puts the party in place right away, then the DM builds the world
  N.socket.emit("lobby:start", { seatMap, locked });
  await run;
}
function hostAddHero(pid, draft){
  const c = C(); if (!c || partyMembers(c).length >= MAX_PARTY || Object.values(Net.room.seats || {}).includes(pid)) return;
  let ch; try { ch = buildCharacter(draft); } catch { return; }
  const lvl = partyLevel(c); let g = 0; while (ch.level < lvl && g++ < 12){ ch.xp = Math.max(ch.xp, XP_TABLE[ch.level]); applyLevelUp(ch, autoLevelChoices(ch)); }
  ch.hp = maxHp(ch); ch.companion = playerHeroBlock(ch, pid, Net.playerName(pid));
  store.camp(c => { addToParty(c, ch, "joined the adventure"); pushLog(c, { kind: "sys", notes: [{ kind: "npc", text: `${ch.name} (${Net.playerName(pid)}) joins the party` }] }); });
  Net.assignSeat(ch.id, pid);
  runDM("event", { text: `A new adventurer joins the party: ${ch.name}, a level ${ch.level} ${ch.race} ${ch.cls} played by ${Net.playerName(pid)}.${ch.backstory ? ` Backstory: ${ch.backstory}` : ""} Write a short scene of them meeting the party, with a reaction from an AI companion. Don't decide what ${ch.name} does next.`, offline: `${ch.name} joins the party.` });
}
function LobbyView(){
  const s = useStore(); const N = window.Net; const on = s.online; const L = on?.lobby;
  // the host's screen gives AI seats a companion by default
  useEffect(() => {
    if (!N?.isHost() || L?.phase !== "setup" || !L.seats.some(x => x.kind === "ai" && !x.tpl)) return;
    const used = new Set(L.seats.map(x => x.tpl).filter(Boolean));
    N.lobbyConfig({ size: L.seats.length, premise: L.premise, seats: L.seats.map(x => ({ kind: x.kind, lock: x.lock, tpl: x.kind === "ai" ? (x.tpl || (() => { const t = COMPANIONS.find(t => !used.has(t.id)); used.add(t.id); return t.id; })()) : null })) });
  }, [L?.seats?.map(x => x.kind + (x.tpl || "")).join()]);
  if (!N || !on?.code) return html`<div className="page narrow"><p>You're not in a lobby.</p><button className="btn" onClick=${()=>store.set({view:"home"})}>Main menu</button></div>`;
  if (L?.phase !== "setup") return html`<div className="page narrow"><div className="thinking"><span className="candle"></span><span>The adventure is starting…</span></div></div>`;
  const host = N.isHost(); const mySeat = L.seats.find(x => x.pid === N.me.id);
  const seatsCfg = (patchAt = -1, patch = {}) => L.seats.map((x, j) => ({ kind: x.kind, tpl: x.tpl, lock: x.lock, ...(j === patchAt ? patch : {}) }));
  const setSeat = (i, patch) => N.lobbyConfig({ size: L.seats.length, premise: L.premise, seats: seatsCfg(i, patch) });
  const setSize = (n) => N.lobbyConfig({ size: n, premise: L.premise, seats: Array.from({ length: n }, (_, i) => L.seats[i] ? { kind: L.seats[i].kind, tpl: L.seats[i].tpl, lock: L.seats[i].lock } : { kind: "ai", tpl: null, lock: false }) });
  const setP = (patch) => N.lobbyConfig({ size: L.seats.length, seats: seatsCfg(), premise: { ...L.premise, ...patch } });
  const editHero = (seat) => store.set({ view: "create", creatorLobby: { mode: "lobby", draft: seat?.draft || null } });
  const take = async (seat, mode) => { const r = await N.lobbyPick(seat.sid, mode); if (!r.ok) return toast(r.error || "Couldn't take that seat.", "bad"); if (mode === "create") editHero(null); };
  const tplName = id => { const t = COMPANIONS.find(t => t.id === id); return t ? `${t.name} (${t.race} ${t.cls})` : "Choosing a companion…"; };
  const usedTpl = L.seats.map(x => x.tpl).filter(Boolean);
  const hostReady = L.seats.some(x => x.pid === N.me.id && x.kind === "human" && x.draft);
  const openHuman = L.seats.filter(x => x.kind === "human" && !(x.pid && x.draft)).length;
  const P = L.premise || {};
  return html`<div className="page narrow lobby">
    <div className="row wrap" style=${{justifyContent:"space-between", gap:10}}><h1 className="page-title"><${Icon} n="user"/> Co-op lobby</h1>
      <div className="row" style=${{gap:8}}><${ChatButton}/><button className="btn sm" onClick=${()=>{ navigator.clipboard?.writeText(N.inviteLink()).then(()=>toast("Invite link copied.")).catch(()=>toast(N.inviteLink())); }}>Copy invite link</button>
        <button className="btn sm ghost" onClick=${()=>openModal({type:"confirm", text:"Leave the lobby?", okLabel:"Leave", ok:()=>{ N.leave(); store.set({view:"home"}); }})}>Leave</button></div></div>
    <div className="parch panel room-code"><div><div className="faint">Room code</div><div className="rc">${on.code}</div></div><div className="faint" style=${{maxWidth:420}}>${host ? "Set up the party below, then start when everyone's ready. Share the code or link with your friends." : `Waiting for ${N.hostName()} to start. Pick a seat and create your hero, or take over an AI companion.`}</div></div>
    <section className="parch panel"><h3 className="panel-title">Party</h3>
      ${host && html`<div className="field"><label>Party size</label><${Seg} value=${String(L.seats.length)} options=${[["2","2 heroes"],["3","3 heroes"],["4","4 heroes"]]} onChange=${v=>setSize(+v)}/></div>`}
      <div className="seat-list">${L.seats.map((x, i) => { const mine = x.pid === N.me.id; const who = x.pid ? N.playerName(x.pid) : null;
        return html`<div key=${x.sid} className=${"seat-card" + (mine ? " mine" : "")}>
          <div className="row" style=${{justifyContent:"space-between", gap:8, flexWrap:"wrap"}}><b>Seat ${i + 1}${i === 0 ? " · host" : ""}</b>
            ${host && i > 0 ? html`<${Seg} value=${x.kind} options=${[["human","Human"],["ai","AI"]]} onChange=${v=>setSeat(i, { kind: v, tpl: v === "ai" ? null : null })}/>` : html`<span className="chip">${x.kind === "human" ? "Human" : "AI"}</span>`}</div>
          ${x.kind === "ai" && host && html`<div className="row wrap" style=${{gap:8, marginTop:6}}><select className="input" style=${{width:"auto"}} value=${x.tpl || ""} onChange=${e=>setSeat(i, { tpl: e.target.value })} aria-label="Companion">${COMPANIONS.filter(t => t.id === x.tpl || !usedTpl.includes(t.id)).map(t => html`<option key=${t.id} value=${t.id}>${t.name} · ${t.race} ${t.cls}</option>`)}</select>
            <label className="row" style=${{gap:6, fontSize:13}}><input type="checkbox" checked=${!!x.lock} onChange=${e=>setSeat(i, { lock: e.target.checked })}/> AI only</label></div>`}
          <div className="seat-status">${x.kind === "human" && x.draft ? html`<${Portrait} ch=${{...x.draft, id: x.sid}} size=${36}/>` : x.kind === "ai" && x.tpl ? (() => { const t = COMPANIONS.find(t => t.id === x.tpl); return t ? html`<${Portrait} ch=${{tpl: t.id, race: t.race, cls: t.cls, name: t.name, dragonType: t.dragon}} size=${36}/>` : null; })() : null}${x.kind === "human"
            ? (x.pid ? (x.draft ? html`<span className="odot ok"></span> <span><b>${who}:</b> ${x.hero?.name}, ${x.hero?.race} ${x.hero?.cls} · ready</span>` : html`<span className="odot warn"></span> <b>${who}</b> is creating a hero…`) : html`<span className="odot off"></span> Open seat: waiting for a player`)
            : html`${x.pid ? html`<span className="odot ok"></span> <b>${who}</b> plays ` : html`<span className="odot off"></span> `}${tplName(x.tpl)}${x.pid ? "" : " · AI"}${x.lock ? html` <span className="faint">(AI only)</span>` : ""}`}</div>
          <div className="row wrap" style=${{gap:6, marginTop:6}}>
            ${mine && x.kind === "human" && html`<button className="btn sm primary" onClick=${()=>editHero(x)}>${x.draft ? "Edit hero" : "Create your hero"}</button>`}
            ${mine && i > 0 && html`<button className="btn sm ghost" onClick=${()=>N.lobbyRelease()}>Leave seat</button>`}
            ${!mine && !x.pid && !host && x.kind === "human" && html`<button className="btn sm primary" onClick=${()=>take(x, "create")}>Take this seat</button>`}
            ${!mine && !x.pid && !host && x.kind === "ai" && !x.lock && x.tpl && html`<button className="btn sm" onClick=${()=>take(x, "takeover")}>Play ${firstName(COMPANIONS.find(t => t.id === x.tpl)?.name || "")}</button>`}
          </div></div>`; })}</div>
      ${!mySeat && !host && html`<p className="faint" style=${{fontSize:13}}>You don't have a seat yet: take an open seat to create your own hero, or play one of the AI companions.</p>`}
    </section>
    <section className="parch panel"><h3 className="panel-title">Adventure</h3>
      ${host ? html`<div className="field"><label htmlFor="lpn">Campaign name (optional)</label><input id="lpn" className="input" maxLength=${60} defaultValue=${P.name} onBlur=${e=>setP({ name: e.target.value })}/></div>
        <div className="field"><label>Tone</label><${Seg} value=${P.tone} options=${["Heroic","Grim & dark","Mystery","Horror","Whimsical"].map(x=>[x,x])} onChange=${v=>setP({ tone: v })}/></div>
        <div className="field"><label>Setting</label><${Seg} value=${P.setting} options=${["Classic kingdoms","Frontier wilds","Haunted realm","Desert empire","Northern isles","Surprise me"].map(x=>[x,x])} onChange=${v=>setP({ setting: v })}/></div>
        <div className="field"><label>Difficulty</label><${Seg} value=${P.difficulty} options=${[["story","Story"],["standard","Standard"],["deadly","Deadly"]]} onChange=${v=>setP({ difficulty: v })}/></div>
        <div className="field"><label>Length</label><${Seg} value=${P.mode || "campaign"} options=${[["campaign","Full campaign"],["quick","Quick adventure (one evening)"]]} onChange=${v=>setP({ mode: v })}/>
          <div className="faint" style=${{fontSize:12.5, marginTop:4}}>${P.mode === "quick" ? "About 90 minutes. Heroes start at level 3." : "A long campaign in three acts."}</div></div>`
      : html`<p style=${{margin:0}}>${P.name ? html`<b>${P.name}</b> · ` : ""}${P.mode === "quick" ? "Quick adventure (one evening, heroes start at level 3) · " : ""}${P.tone} · ${P.setting} · ${cap(P.difficulty || "standard")}</p>`}
    </section>
    <section className="parch panel"><h3 className="panel-title">Players</h3>
      <div className="row wrap" style=${{gap:6}}>${on.players.map(p => html`<span key=${p.id} className="chip"><span className=${"odot " + (p.connected ? "ok" : "warn")}></span> ${p.name}${p.host ? " 👑" : ""}</span>`)}</div></section>
    ${host ? html`<div className="lobby-start"><span className="faint grow">${!hostReady ? "Create your hero to start." : openHuman ? `${openHuman} human seat${openHuman > 1 ? "s aren't" : " isn't"} filled yet; the AI will play ${openHuman > 1 ? "them" : "it"} if you start now.` : "Everyone's ready."}</span>
        <button className="btn primary lg" disabled=${!hostReady || !!s.busy} onClick=${startFromLobby}>Start the adventure</button></div>`
      : html`<div className="lobby-start"><span className="candle sm"></span><span className="faint">${mySeat ? (mySeat.kind === "ai" || mySeat.draft ? "You're ready. Waiting for the host to start…" : "Create your hero, then wait for the host to start.") : "Pick a seat above."}</span></div>`}
  </div>`;
}
</script>
<script>
"use strict";
// ======================= SHARED ACTIONS =======================
// Named, plain-argument actions, so any player's click can run on the host's game (see net.js CALLS).
// coopNotify: messages go to whoever acted; hostUI: screen changes only happen for whoever acted.
function coopNotify(text, kind){ const to = Coop.remoteCall; if (to && window.Net?.isHost()) Net.socket?.emit("toast:to", { to, text, kind }); else toast(text, kind); }
function hostUI(fn){ if (!Coop.remoteCall) fn(); }
function partyGold(c){ return c.characters[c.activeCharId].gold; }
function spend(c, gold){ const m = c.characters[c.activeCharId]; if (m.gold < gold) return false; m.gold -= gold; return true; }
function serviceTown(c, townId){ const t = c.locations[townId]; if (!t) return null; if (standing(c, t) <= -50){ coopNotify(`Nobody in ${t.name} will serve you.`, "bad"); return null; } return t; }
function suggestHitDice(m){ const avail = m.level - (m.hitDiceUsed || 0); const per = Math.max(1, CLASSES[m.cls].hd / 2 + 1 + mods(m).CON); return Math.min(avail, Math.ceil(Math.max(0, maxHp(m) - m.hp) / per)); }
function autoRestPlan(c){ return Object.fromEntries(partyMembers(c).map(m => [m.id, suggestHitDice(m)])); }
// --- shops ---
function shopBuy(index, whoId){
  const c0 = C(); const it = c0?.shop?.items?.[index]; const buyer = c0?.characters[whoId] || c0?.characters[c0.activeCharId]; if (!it || !buyer) return;
  const town = townOf(c0); const price = Math.max(1, Math.round(it.price * (town ? priceMult(c0, town) : 1)));
  if (partyGold(c0) < price) return coopNotify("Not enough gold in the party purse.", "bad");
  store.camp(c => { if (!spend(c, price)) return; const { price: _p, ...rest } = it; addItem(c.characters[buyer.id], { ...structuredClone(rest), id: uid("i") }); sysNote(c, { kind: "loot", text: `Bought ${it.name} for ${price} gp (${firstName(buyer.name)})` }); });
}
function shopSell(itemId, whoId){
  const c0 = C(); const h0 = c0?.characters[whoId]; const it = h0 && invItem(h0, itemId); if (!it || it.quest) return;
  const town = townOf(c0); const v = Math.max(1, Math.floor((it.value || 1) / 2 / (town ? priceMult(c0, town) : 1)));
  store.camp(c => { const h = c.characters[whoId]; const x = invItem(h, itemId); if (!x) return; c.characters[c.activeCharId].gold += v; x.qty--; if (x.qty <= 0) dropItem(h, x.id); sysNote(c, { kind: "loot", text: `Sold ${it.name} for ${v} gp` }); });
}
// --- inn ---
function innRest(townId){
  const c0 = C(); const town = serviceTown(c0, townId); if (!town || S().busy) return;
  const cost = Math.max(1, Math.round(2 * partyMembers(c0).length * priceMult(c0, town)));
  if (partyGold(c0) < cost) return coopNotify("Not enough gold in the party purse.", "bad");
  store.camp(c => { spend(c, cost); doLongRestAll(c); c.time.day += 1; c.time.phase = "morning"; worldTick(c); sysNote(c, { kind: "loot", text: "Long rest at the inn: everyone restored" }); });
  hostUI(closeModal);
  runDM("event", { text: `The party spends the evening and night at the tavern in ${town.name} and wakes rested. Write a warm short scene of the evening: one or two moments of companion banter or a personal conversation that reveals something about a companion, and one piece of local color. It's now morning.`, offline: `You rest at the tavern in ${town.name} and wake refreshed.` });
}
function innRumors(townId){
  const c0 = C(); const town = serviceTown(c0, townId); if (!town || S().busy) return;
  if (town.rumorDay === c0.time.day) return coopNotify("You've already heard today's rumors here.", "bad");
  if (partyGold(c0) < 5) return coopNotify("Not enough gold in the party purse.", "bad");
  let l = null;
  store.camp(c => { spend(c, 5); c.locations[townId].rumorDay = c.time.day; if (rnd(3) > 0) l = revealNearby(c); const n = []; if (l) n.push({ kind: "map", text: `Rumor: ${l.name}` }); addClue(c, `rumors at the tavern in ${town.name}`, n); if (n.length) sysNote(c, n); });
  hostUI(closeModal);
  runDM("event", { text: `The party buys a round at the tavern in ${town.name} and listens for rumors. ${l ? `One patron mentions ${l.name} (${l.type}), now marked on their map; make it intriguing and hint at danger or treasure.` : "Share one or two local rumors that connect to current quests or open new opportunities."} Voice the patrons.`, offline: l ? `A patron mentions ${l.name}.` : "The locals trade gossip, but nothing useful." });
}
function recruitAt(townId, tplId, guild){
  const c0 = C(); const town = serviceTown(c0, townId); if (!town) return;
  if (partyMembers(c0).length >= MAX_PARTY) return coopNotify("The party is full (4). Dismiss someone first.", "bad");
  const r = recruitPool(c0, town).find(x => x.tpl.id === tplId); if (!r) return coopNotify("That adventurer has moved on.", "bad");
  const fee = guild ? r.fee * 2 : r.fee; if (partyGold(c0) < fee) return coopNotify("Not enough gold in the party purse.", "bad");
  store.camp(c => { spend(c, fee); const nc = buildCompanion(r.tpl, r.level); addToParty(c, nc, `recruited at ${town.name}`); sysNote(c, { kind: "npc", text: `${nc.name} joins the party!` }); });
  hostUI(closeModal);
  runDM("event", { text: `At ${town.name}, the party recruits ${r.tpl.name}, a level ${r.level} ${r.tpl.race} ${r.tpl.cls}. Personality: ${r.tpl.personality} Voice: ${r.tpl.voice} Goal: ${r.tpl.hook} Write a short scene of them joining: their first lines in their own voice, and a reaction from existing companions (if any).`, offline: `${r.tpl.name} joins the party.` });
}
// --- temple ---
const AFFLICTIONS = ["poisoned","blinded","frightened","charmed","diseased","cursed","exhausted","paralyzed"];
function templeHeal(townId){
  const c0 = C(); const town = serviceTown(c0, townId); if (!town) return;
  const hurt = partyMembers(c0).filter(x => x.hp < maxHp(x)); if (!hurt.length) return coopNotify("Nobody is hurt.");
  const cost = Math.round(10 * hurt.length * priceMult(c0, town)); if (partyGold(c0) < cost) return coopNotify("Not enough gold in the party purse.", "bad");
  store.camp(c => { spend(c, cost); for (const x of partyMembers(c)) x.hp = maxHp(x); sysNote(c, { kind: "loot", text: "The priests heal the party" }); });
}
function templeCure(townId){
  const c0 = C(); const town = serviceTown(c0, townId); if (!town) return;
  if (!partyMembers(c0).some(x => x.conditions.some(k => AFFLICTIONS.includes(k.name)))) return coopNotify("Nobody is afflicted.");
  if (partyGold(c0) < 25) return coopNotify("Not enough gold in the party purse.", "bad");
  store.camp(c => { spend(c, 25); for (const x of partyMembers(c)) x.conditions = x.conditions.filter(k => !AFFLICTIONS.includes(k.name)); sysNote(c, { kind: "loot", text: "Afflictions lifted" }); });
}
function templeRaise(townId, charId){
  const c0 = C(); const town = serviceTown(c0, townId); if (!town) return;
  const f = c0.characters[charId]; if (!f?.dead || !(c0.fallen || []).some(x => x.id === charId)) return;
  if (partyMembers(c0).length >= MAX_PARTY) return coopNotify("The party is full.", "bad");
  const cost = 250 + 50 * f.level; if (partyGold(c0) < cost) return coopNotify("Not enough gold in the party purse.", "bad");
  store.camp(c => { spend(c, cost); const x = c.characters[charId]; x.dead = false; x.hp = 1; x.deathSaves = { s: 0, f: 0 }; c.fallen = c.fallen.filter(y => y.id !== charId); c.partyIds.push(charId); sysNote(c, { kind: "loot", text: `${f.name} is raised from the dead!` }); });
  hostUI(closeModal);
  runDM("event", { text: `At the temple of ${town.name}, the priests perform a resurrection rite and ${f.name} returns from death. Describe the ritual and ${f.name}'s first words, and how the companions react.`, offline: `${f.name} gasps back to life.` });
}
// --- notice board ---
function refreshBoard(townId){
  const c0 = C(); const town = c0?.locations[townId]; if (!town) return;
  if (town.bounties && town.bountyDay != null && c0.time.day - town.bountyDay < 6) return;
  store.camp(c => { const t = c.locations[townId]; t.bounties = genBounties(c, t); t.bountyDay = c.time.day; });
}
function takeBounty(townId, bountyId){
  const c0 = C(); const b = c0?.locations[townId]?.bounties?.find(x => x.id === bountyId); if (!b) return coopNotify("That bounty was already taken.", "bad");
  let q; store.camp(c => { q = acceptBounty(c, b, c.locations[townId]); sysNote(c, { kind: "quest", text: `New bounty: ${q.title}` }); });
  coopNotify(`Bounty accepted: ${b.title}`);
}
// --- gear & party ---
function gearEquip(charId, itemId, slot){ let err; store.camp(c => { const x = c.characters[charId]; if (x) err = equipItem(x, itemId, slot); }); if (err) coopNotify(err, "bad"); }
function gearUnequip(charId, itemId){ store.camp(c => { const x = c.characters[charId]; if (x) unequip(x, itemId); }); }
function gearGive(fromId, itemId, toId){
  store.camp(c => { const x = c.characters[fromId], to = c.characters[toId]; const it = x && invItem(x, itemId); if (!it || !to || !partyMembers(c).some(m => m.id === toId)) return;
    unequip(x, itemId); x.inventory = x.inventory.filter(i => i.id !== itemId); addItem(to, it); sysNote(c, { kind: "loot", text: `${firstName(x.name)} gives ${it.name} to ${firstName(to.name)}` }); });
}
function gearDrop(charId, itemId){ store.camp(c => { const x = c.characters[charId]; const it = x && invItem(x, itemId); if (!it || it.quest) return; dropItem(x, itemId); sysNote(c, { kind: "hurt", text: `Dropped ${it.name}` }); }); }
function partySet(heroId, patch){
  const ok = {}; for (const k of ["role", "tactic", "ctrl", "pos"]) if (patch && typeof patch[k] === "string" && patch[k].length < 20) ok[k] = patch[k];
  store.camp(c => { const x = c.characters[heroId]; if (!x) return; if (x.companion) Object.assign(x.companion, ok); else if (ok.pos) x.formation = ok.pos; });
}
function trackQuest(id){ if (window.Net?.isOnline()) store.set({ trackedLocal: id }); else store.camp(c => { c.trackedQuest = id; }); }
</script>
<script>
"use strict";
// ======================= LEVEL-UP CHOICES FOR PLAYER HEROES =======================
// Heroes a player created level up by that player's choices (not automatically), like the main character.
// If their player has left the room for good, they go back to leveling automatically so they never fall behind.
function heroAwaitsLevelUp(c, ch){ if (!ch?.companion?.player) return false; const N = window.Net; return !N?.isOnline() || !!N.seatOwner(ch.id); }
function canLevelHere(c, ch){
  if (!c || !ch || !canLevel(ch)) return false; const N = window.Net;
  if (ch.id === c.activeCharId) return !N?.isGuest();
  if (!ch.companion?.player) return false;
  return !N?.isOnline() || N.seatOwner(ch.id) === N.me.id;
}
// Keep whatever the player chose that's valid; fill anything missing or invalid with sensible defaults.
function sanitizeLevelChoices(ch, x){
  const plan = levelPlan(ch), auto = autoLevelChoices(ch), C0 = CLASSES[ch.cls], L = CLASS_LETTER[ch.cls];
  const known = new Set([...(ch.cantrips || []), ...(ch.spells || [])]);
  const fill = (valid, fallback, n) => [...new Set([...valid, ...(fallback || []).filter(a => !valid.includes(a))])].slice(0, n);
  const spellsOk = (arr, lo, hi) => (Array.isArray(arr) ? arr : []).filter(nm => SPELL[nm] && L && SPELL[nm].c.includes(L) && SPELL[nm].l >= lo && SPELL[nm].l <= hi && !known.has(nm));
  let asi = null;
  if (plan.asi){
    if (x?.asi?.feat && FEATS[x.asi.feat] && !(ch.feats || []).includes(x.asi.feat)) asi = { feat: x.asi.feat };
    else if (x?.asi?.inc && typeof x.asi.inc === "object"){ const inc = {}; let tot = 0; for (const [k, v] of Object.entries(x.asi.inc)) if (ABILS.includes(k) && (v === 1 || v === 2) && (ch.abilities[k] || 10) + v <= 20){ inc[k] = v; tot += v; } asi = tot === 2 ? { inc } : auto.asi; }
    else asi = auto.asi;
  }
  return {
    hpRoll: Number.isInteger(x?.hpRoll) && x.hpRoll >= 1 && x.hpRoll <= C0.hd ? x.hpRoll : auto.hpRoll,
    asi,
    subclass: plan.subclass ? (C0.subs.some(s => s.n === x?.subclass) ? x.subclass : auto.subclass) : null,
    cantrips: fill(spellsOk(x?.cantrips, 0, 0), auto.cantrips, plan.cantrips),
    spells: fill(spellsOk(x?.spells, 1, plan.maxSpell), auto.spells, plan.spells),
    invocations: fill((Array.isArray(x?.invocations) ? x.invocations : []).filter(k => INVOCATIONS[k] && !(ch.invocations || []).includes(k)), auto.invocations, plan.invocations),
    fightingStyle: plan.fightingStyle ? (FIGHTING_STYLES[x?.fightingStyle] ? x.fightingStyle : auto.fightingStyle) : null,
    expertise: fill((Array.isArray(x?.expertise) ? x.expertise : []).filter(k => (ch.skills || []).includes(k) && !(ch.expertise || []).includes(k)), auto.expertise, plan.expertise)
  };
}
function applyHeroLevelUp(charId, choices){
  const c0 = C(); const ch0 = c0?.characters[charId]; if (!ch0 || !canLevel(ch0)) return;
  if (choices?.fromLevel != null && choices.fromLevel !== ch0.level) return;       // already applied (double click, two screens)
  if (Coop.remoteCall && !(charId !== c0.activeCharId && ch0.companion?.player && Net.seatOwner(charId) === Coop.remoteCall)) return coopNotify("You can only level up your own hero.", "bad");
  const x = sanitizeLevelChoices(ch0, choices || {});
  store.camp(c => {
    const ch = c.characters[charId]; applyLevelUp(ch, x);
    if (x.subclass && subMods(ch).beastCompanion && !c.companions.some(p => p.beast)) c.companions.push(beastCompanion(ch));
    if (subMods(ch).beastCompanion) for (const p of c.companions.filter(p => p.beast)){ const fresh = beastCompanion(ch); Object.assign(p, { maxHp: fresh.maxHp, ac: fresh.ac, attack: fresh.attack }); p.hp = p.maxHp; }
    sysNote(c, { kind: "xp", text: `${ch.name} reached level ${ch.level}!` });
    c.chronicle.push({ t: Date.now(), day: c.time.day, text: `${ch.name} reached level ${ch.level}${x.subclass ? ` and walks the path of the ${x.subclass}` : ""}.` });
  });
  coopNotify(`${ch0.name} is now level ${ch0.level + 1}!`, "gold");
}
</script>
