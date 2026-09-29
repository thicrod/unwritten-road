<script>
"use strict";
// ======================= STORE =======================
const DEFAULT_SETTINGS = { tier:"default", autoRoll:true, aiTactics:true, hints:false, theme:"system", fontSize:"md", reduceMotion:false, diceAnim:"full", difficulty:"standard", sfx:0.5, music:0, narration:"medium", dmLanguage:"en" };
const store = {
  s: { view:"home", tab:"adventure", campaign:null, index:[], settings:{...DEFAULT_SETTINGS}, caps:{sample:"pending", storage:"local"},
       busy:null, stream:"", modal:null, toasts:[], overlay:null, asideOpen:false, dmError:null,
       dice:{pool:{}, mod:0, adv:"none", result:null, history:[], rollId:0}, combatUI:{}, saveState:"" },
  subs: new Set(),
  set(patch){ const p = typeof patch === "function" ? patch(this.s) : patch; this.s = {...this.s, ...p}; this.subs.forEach(f=>f()); },
  camp(fn){ if (!this.s.campaign) return; const c = structuredClone(this.s.campaign); const r = fn(c, c.characters[c.activeCharId]); c.updatedAt = Date.now(); this.set({campaign:c}); scheduleSave(); return r; }
};
const S = () => store.s;
const C = () => store.s.campaign;
const PC = () => { const c = store.s.campaign; return c ? c.characters[c.activeCharId] : null; };
function toast(text, kind=""){ const id = uid("t"); store.set(s=>({toasts:[...s.toasts,{id,text,kind}]})); setTimeout(()=>store.set(s=>({toasts:s.toasts.filter(t=>t.id!==id)})), 3200); }
const openModal = m => store.set({modal:m});
const closeModal = () => store.set({modal:null});

// ======================= CAPABILITIES & PERSISTENCE =======================
let SAMPLE = null, DOWNLOADS = null;
const Persist = {
  db:null, uid:null,
  lsGet(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  lsDel(k){ try { localStorage.removeItem(k); } catch {} },
  col(){ return this.db.collection("data/users/" + this.uid); },
  async cloudGet(id){ try { const s = await this.col().doc(id).get(); return s.exists ? structuredClone(s.data()) : null; } catch { return null; } },
  async cloudSet(id, data){ try { await this.col().doc(id).set(data); return true; } catch(e){ console.warn("cloud save failed", e); return false; } },
  async cloudDel(id){ try { await this.col().doc(id).delete(); } catch {} }
};
function metaOf(c){ const ch = c.characters[c.activeCharId]; const loc = c.locations[c.currentLocationId];
  return { id:c.id, name:c.name, char: ch?.name, charId: ch?.id, look: ch?.look || null, dragonType: ch?.dragonType || null, cls: ch?.cls, race: ch?.race, level: ch?.level, location: loc?.name || "", updatedAt: c.updatedAt, dead: !!ch?.dead, completed: !!c.villainDefeated }; }
function packCampaign(c){
  const p = structuredClone(c); p.log = p.log.slice(-150); if (p.combat) p.combat.log = (p.combat.log||[]).slice(-60);
  let json = JSON.stringify(p);
  if (json.length > 230000){ p.log = p.log.slice(-70); p.chronicle = (p.chronicle||[]).slice(-80); json = JSON.stringify(p); }
  if (json.length > 250000){ p.log = p.log.slice(-30); json = JSON.stringify(p); }
  return p;
}
let saveTimer = null;
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 1200); }
async function saveNow(manual){
  clearTimeout(saveTimer); const c = C(); if (!c || c.sandbox) return;
  const p = packCampaign(c); const meta = metaOf(c);
  Persist.lsSet("ur:c:" + c.id, p);
  const idx = [meta, ...S().index.filter(m => m.id !== c.id)].sort((a,b)=>b.updatedAt-a.updatedAt);
  Persist.lsSet("ur:index", idx); store.set({index: idx});
  let cloud = false;
  if (Persist.db){ cloud = await Persist.cloudSet("c-" + c.id, p); if (cloud) await Persist.cloudSet("index", {campaigns: idx}); }
  store.set({saveState: cloud ? "Saved to your account" : "Saved on this device"});
  if (manual) toast(cloud ? "Campaign saved" : "Campaign saved on this device");
}
async function loadCampaign(id){
  let local = Persist.lsGet("ur:c:" + id, null), cloud = null;
  if (Persist.db) cloud = await Persist.cloudGet("c-" + id);
  const c = (cloud && (!local || (cloud.updatedAt||0) >= (local.updatedAt||0))) ? cloud : local;
  return c ? migrate(c) : null;
}
async function deleteCampaign(id){
  Persist.lsDel("ur:c:" + id); const idx = S().index.filter(m=>m.id!==id); Persist.lsSet("ur:index", idx); store.set({index:idx});
  Persist.lsDel("ur:cp:" + id);
  if (Persist.db){ await Persist.cloudDel("c-" + id); await Persist.cloudDel("cp-" + id); await Persist.cloudSet("index", {campaigns: idx}); }
  if (C()?.id === id) store.set({campaign:null, view:"home"});
}
function migrate(c){
  c.log = c.log || []; c.chronicle = c.chronicle || []; c.quests = c.quests || {}; c.npcs = c.npcs || {}; c.locations = c.locations || {}; c.companions = c.companions || [];
  c.time = c.time || {day:1, phase:"morning"}; c.flags = c.flags || {}; c.reputation = c.reputation || {}; c.deeds = c.deeds || {}; c.news = c.news || []; if (c.lastTickDay == null) c.lastTickDay = c.time.day; if (!c.homeTown && c.currentLocationId){ const h = topLoc(c, c.currentLocationId); if (h && ["town","city","village","port"].includes(h.type)) c.homeTown = h.id; }
  c.partyIds = (c.partyIds || [c.activeCharId]).filter(id => c.characters[id]); if (!c.partyIds.includes(c.activeCharId)) c.partyIds.unshift(c.activeCharId);
  if (c.combat && !c.combat.order.some(id => c.combat.cbt[id]?.rx !== undefined || c.combat.cbt[id]?.kind !== "pc")) c.combat = null;
  if (c.combat && Object.values(c.combat.cbt).some(x => x.kind === "pc" && x.rx === undefined)){ c.combat = null; c.log.push({id: uid("l"), t: Date.now(), kind:"sys", notes:[{kind:"hurt", text:"The game was upgraded: the battle in progress was reset. Carry on from here."}]}); }
  if (c.world && c.version < 2 && Object.keys(c.locations).length) { try { ensureWorldMap(c); } catch(e){ console.warn(e); } }
  if (!c.story && c.villain && !c.villainDefeated && c.world && Object.keys(c.quests || {}).length) { try { initStory(c); } catch (e) { console.warn(e); } }
  c.version = 2; return c;
}
function saveSettings(){ Persist.lsSet("ur:settings", S().settings); if (Persist.db) Persist.cloudSet("settings", S().settings); applySettingsToDom(); }
function applySettingsToDom(){
  const st = S().settings; const root = document.documentElement;
  if (st.theme === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", st.theme);
  document.body.classList.toggle("fs-lg", st.fontSize==="lg"); document.body.classList.toggle("fs-sm", st.fontSize==="sm");
  document.body.classList.toggle("reduce-motion", !!st.reduceMotion);
}
async function initCaps(){
  store.set({ index: Persist.lsGet("ur:index", []), settings: {...DEFAULT_SETTINGS, ...Persist.lsGet("ur:settings", {})} }); applySettingsToDom();
  const cl = window.claude;
  if (!cl || typeof cl.use !== "function"){ store.set(s=>({caps:{...s.caps, sample:"none"}})); return; }
  cl.use("sample").then(sm => { SAMPLE = sm; store.set(s=>({caps:{...s.caps, sample: sm ? "ready" : "none"}})); }).catch(()=>store.set(s=>({caps:{...s.caps, sample:"none"}})));
  cl.use("downloads").then(dl => { DOWNLOADS = dl; }).catch(()=>{});
  try {
    const [db, user] = await Promise.all([cl.use("db").catch(()=>null), cl.use("user").catch(()=>null)]);
    const id = user ? await user.id().catch(()=>null) : null;
    if (db && id){
      Persist.db = db; Persist.uid = id;
      const [idxDoc, st] = await Promise.all([Persist.cloudGet("index"), Persist.cloudGet("settings")]);
      const local = S().index; const cloud = idxDoc?.campaigns || [];
      const merged = Object.values([...local, ...cloud].reduce((a,m)=>{ if (!a[m.id] || (m.updatedAt||0) > (a[m.id].updatedAt||0)) a[m.id] = m; return a; }, {})).sort((a,b)=>b.updatedAt-a.updatedAt);
      store.set(s=>({ index: merged, caps:{...s.caps, storage:"cloud"}, settings: st ? {...DEFAULT_SETTINGS, ...st} : s.settings })); applySettingsToDom();
    }
  } catch(e){ console.warn(e); }
}

// ======================= DUNGEON MASTER =======================
const DM_RULES = `You are the Dungeon Master of "The Unwritten Road", a solo tabletop fantasy RPG using 5th-edition-style rules. The web app handles dice, combat turns, inventory and the character sheet. You narrate the world, voice every NPC, adjudicate what the player attempts, and update game state through a JSON block.

HOW TO RUN THE GAME
- The player may attempt anything. Decide whether it is possible for this character in this situation, then respond. Never offer a menu or numbered options.
- Ask for a roll only when the outcome is uncertain AND failure would be interesting. Trivial actions simply succeed; impossible ones fail in-fiction with a reason.
- When you ask for a roll, narrate up to the moment of uncertainty and STOP. Do not reveal the outcome; the app rolls and sends you the result, then you narrate the consequence.
- DCs: 5 trivial, 10 easy, 13 moderate, 15 hard, 18 very hard, 20+ heroic. Natural 20 = a triumphant success with a bonus; natural 1 = a failure with a complication.
- Pick the skill that fits: Deception to lie, Persuasion to convince honestly, Intimidation to threaten, Sleight of Hand to pickpocket or plant, Stealth to sneak, Insight to read someone, Investigation to search deliberately, Perception to notice, Athletics to climb/shove/grapple, Acrobatics to balance or tumble, Arcana/History/Religion/Nature for lore, Survival to track or forage, Medicine to treat wounds, Animal Handling for beasts, Performance to entertain. Saving throws for resisting traps, poisons and magic.
- Consequences persist: NPCs remember threats, theft, kindness and lies; reputations spread; burned bridges stay burned. Record important ones in "memory" and update NPC attitude.
- Keep the world alive: NPCs pursue their own goals, have relationships with each other, and react. Introduce complications, rumors, rivals and surprises every few scenes. Every goal should have several routes (talk, sneak, fight, bargain, magic, trickery).
- Respect the character sheet: the player only has the items, gold, spells, slots and abilities listed. If they reach for something they lack, say so in-fiction. When the app tells you a spell was cast, its slot is already spent.
- Award XP for non-combat achievements (clever solutions, social victories, discoveries, quest milestones): about 25-60 x level for a meaningful beat; 100-250 x level for completing a quest. The app awards combat XP itself.
- Loot should feel earned: mostly coins, mundane gear and potions. Magic items are rare (uncommon at levels 1-4, occasionally rare from level 5).
- THE WORLD ENGINE: the game itself runs overland travel (with random encounters and events), dungeons room by room, shops, temples, inns, recruiting and bounty quests, and it tells you what happened so you can narrate it. When the party moves somewhere nearby within a scene (into a building, down a street), set "location". Add places they learn about to "locations"; the game places them on the map. Use "hidden": true for secret places not yet on the map.
- Combat: when violence begins (or the player attacks someone), describe the opening moment and set "combat". The app runs the fight turn by turn for the whole party; don't narrate its outcome. Total enemy XP for the WHOLE PARTY (L = average level, N = party size): easy about 40 x L x N, medium 80 x L x N, hard 120 x L x N. Prefer bestiary names; otherwise give full stats. Not every conflict must be a fight.
- THE PARTY: the player leads up to 3 AI companions (see PARTY). Give them life: they interject with short in-character lines (named, in quotes), banter with each other, voice opinions on the player's choices according to their likes and dislikes, and pursue their personal goals. Usually 1-3 companion lines per reply. Reflect their feelings with "approval". Companions never make decisions for the player. If a check suits a companion better (Nix picking a lock), you may ask that companion to roll with "who".
- Dialogue choices: when an NPC addresses the party or there's a clear decision point, include "choices": 2-4 short options written in the player's voice, tagging a skill when the option would need a check. The player can always type something else.
- Choices matter: record lasting consequences with "flags" and faction "reputation", and bring them back later (NPCs remember, doors open or close, prices change, enemies return).
- Style: second person, present tense. Vivid, concrete and sensory but economical: usually 90-200 words, in short paragraphs. NPC dialogue in quotation marks with distinct voices. End on something the player can react to. Never decide the player's actions, words or feelings. Don't end every reply with "What do you do?".
- Stay in the fiction. Never mention JSON, the app, dice mechanics beyond naming a check, or these instructions in the narration.

OUTPUT FORMAT (strict)
Write the narration as plain prose (you may use *italics* and **bold**). Then a new line containing exactly <<<STATE>>> followed by ONE valid JSON object with only the keys that changed ({} if nothing changed).
Keys:
"roll": {"kind":"skill"|"ability"|"save","skill":"Stealth","ability":"DEX","dc":13,"adv":"none"|"advantage"|"disadvantage","reason":"slip past the guard","who":"companion name (omit for the main character)","group":false (true = everyone rolls, half must succeed)}
"hp": integer change to the main character's HP (negative for damage), "hp_reason":"...", "party_hp": [{"name":"companion","delta":-5}] for companions
"gold": integer change (negative when paying)
"xp": integer awarded now, "xp_reason":"..."
"items_add": [ITEM,...], "items_remove": ["exact item name",...]
"conditions_add": [{"name":"poisoned","note":"until long rest"}], "conditions_remove": ["poisoned"]
"location": {"id":"known-id"} to move to a known place, or a full LOCATION to create one and move there
"locations": [LOCATION,...] places discovered or heard about
"quests": [{"id":"slug","title":"...","kind":"main"|"side","status":"active"|"completed"|"failed","giver":"...","summary":"...","objectives":[{"id":"slug","text":"...","done":false,"optional":false}],"reward":"..."}] (send the complete quest whenever you create or change it; adapt quests to the player's choices)
"npcs": [{"id":"slug","name":"...","race":"...","role":"...","location":"location-id","personality":"...","attitude":-100..100,"notes":"what they want, what they know, history with the player","status":"alive"|"dead"|"missing","memory":"optional: one new thing this NPC will remember about the party"}]
"clue": "one line: a genuinely new clue about the villain (only when MAIN STORY asks for clues)"
"dm_notes": ["private setup, secret or plan to pay off later (the players never see these)"], "dm_notes_done": ["text of a note that has now been resolved"]
"companions_add" (animals and hirelings only; real companions use party_join): [{"name":"...","race":"...","role":"...","hp":12,"ac":13,"attack":{"name":"Spear","to_hit":4,"damage":"1d6+2","type":"piercing"},"notes":"..."}], "companions_remove": ["name"]
"memory": ["short facts to remember: decisions, promises, secrets, consequences"]
"combat": {"enemies":[{"name":"Goblin","count":3}, or a full ENEMY], "surprise":"none"|"enemies"|"player", "terrain":"a few words", "objective": optional {"kind":"survive"|"protect"|"ritual","rounds":4,"name":"who to protect","text":"short goal"}}
"shop": {"name":"...","keeper":"...","items":[ITEM with "price",...]} opens a shop window when the player browses wares (6-12 items suited to the place)
"rest": "short"|"long" when the player rests somewhere safe enough (otherwise interrupt the rest with trouble)
"time": "dawn"|"morning"|"midday"|"afternoon"|"evening"|"night", "day_advance": 1 when a new day begins
"inspiration": true to award Inspiration for excellent roleplay
"choices": [{"text":"Offer to help her find the child","skill":null},{"text":"Claim to be from the city watch","skill":"Deception"}]
"approval": [{"name":"companion name","delta":-15..15,"reason":"..."}]
"party_join": [{"name":"...","race":"...","class":"one of the 12 classes","personality":"...","voice":"...","likes":["tag"],"dislikes":["tag"],"goal":"...","appearance":"..."}] only when an NPC truly joins (party max 4). Tags: bravery, cowardice, mercy, cruelty, honesty, deceit, greed, gold, piety, curiosity, caution, violence
"party_leave": ["companion name"]
"flags": {"spared_the_bandit_chief": true}, "reputation": {"faction name": 10}

ITEM: {"name":"...","type":"weapon|armor|shield|potion|scroll|ring|amulet|cloak|wondrous|gear|treasure|quest|key","base":"standard base item such as Longsword or Chain Mail","qty":1,"value":10,"rarity":"common|uncommon|rare|very rare","description":"...", weapons add "damage":"1d8","damage_type":"slashing","properties":["finesse","light","two-handed","ranged","versatile:1d10","thrown","heavy"],"bonus":0-3,"extra_damage":"1d6","extra_damage_type":"fire"; armor adds "armor":"light|medium|heavy","ac":14; other magic may use "ac_bonus","ability_bonus":{"STR":2},"save_bonus","resist":["fire"],"heal":"2d4+2","spell":"Fireball","slot":"head|hands|feet|cloak|amulet|ring"}
LOCATION: {"id":"slug","name":"...","type":"town|city|village|forest|mountain|dungeon|castle|cave|ruins|tavern|shop|temple|camp|road|swamp|lake|tower|port","x":0-100,"y":0-100,"description":"one or two sentences","discovered":true (false = only rumored),"parent":"id of the settlement it sits inside (taverns, shops, halls)","important":false,"hostile":false (true for enemy-held castles, towers, temples; dungeons, caves and ruins are always explorable),"connects":["ids of adjacent places"]}
Map: x grows east, y grows south, neighbouring places sit 8-20 units apart; places with a parent need no coordinates.
ENEMY: {"name":"...","count":1,"hp":20,"ac":13,"type":"humanoid|beast|undead|...","xp":100,"mods":{"STR":2,"DEX":1,"CON":1,"INT":0,"WIS":0,"CHA":0},"attacks":[{"name":"...","to_hit":4,"damage":"1d8+2","type":"slashing","ranged":false}],"multiattack":["Claw","Bite"],"abilities":[{"name":"...","kind":"save","save":"DEX","dc":13,"damage":"4d6","type":"fire","half":true,"condition":"prone","recharge":5,"description":"..."}],"resist":[],"immune":[],"vulnerable":[],"tactics":"how it fights and when it flees"}`;

function bestiaryLine(){ return Object.entries(BESTIARY).map(([n,b])=>`${n} (${b.xp} XP)`).join(", "); }
function topLoc(c, id){ let l = c.locations[id]; let g = 0; while (l && l.parent && c.locations[l.parent] && g++ < 5) l = c.locations[l.parent]; return l; }
function worldSummary(c){
  const L = [];
  if (c.world) L.push(`WORLD: ${c.world.name}${c.world.region?` (${c.world.region})`:""}. ${c.world.overview||""}`);
  if (c.premise) L.push(`CAMPAIGN PREMISE: tone ${c.premise.tone}; setting ${c.premise.setting}; difficulty ${c.premise.difficulty}${c.premise.custom?`; player's wishes: ${c.premise.custom}`:""}.`);
  const storyL = storyContext(c); if (storyL) L.push(storyL);
  const memL = memoryContext(c); if (memL) L.push(memL);
  const cur = c.locations[c.currentLocationId];
  L.push(`DAY ${c.time.day}, ${c.time.phase}. CURRENT LOCATION: ${cur ? `[${cur.id}] ${cur.name} (${cur.type}) at (${Math.round(cur.x??0)},${Math.round(cur.y??0)})${cur.parent?` inside ${c.locations[cur.parent]?.name}`:""}: ${cur.description||""}` : "unknown"}`);
  const locs = Object.values(c.locations).filter(l => !l.hidden).slice(-45).map(l=>`[${l.id}] ${l.name} (${l.type}${l.parent?`, in ${l.parent}`:`, ${Math.round(l.x??0)},${Math.round(l.y??0)}`}${l.discovered?(l.visited?", visited":""):", rumored"})`);
  L.push("KNOWN PLACES: " + (locs.join("; ")||"none"));
  const qs = Object.values(c.quests); const act = qs.filter(q=>q.status==="active"), done = qs.filter(q=>q.status!=="active").slice(-4);
  L.push("ACTIVE QUESTS:\n" + (act.map(q=>`- [${q.id}] ${q.title} (${q.kind}) from ${q.giver||"?"}: ${q.summary||""} Objectives: ${(q.objectives||[]).map(o=>`[${o.done?"x":" "}] ${o.text}${o.optional?" (optional)":""} {${o.id}}`).join("; ")}${q.reward?` Reward: ${q.reward}`:""}`).join("\n")||"- none"));
  if (done.length) L.push("FINISHED QUESTS: " + done.map(q=>`${q.title} (${q.status})`).join("; "));
  const npcs = Object.values(c.npcs); const here = npcs.filter(n=>n.location===c.currentLocationId || n.location===cur?.parent);
  const rest = npcs.filter(n=>!here.includes(n)).slice(-25);
  L.push("NPCS:\n" + ([...here, ...rest].map(n=>`- [${n.id}] ${n.name}${n.race?`, ${n.race}`:""} ${n.role?`(${n.role})`:""}${n.location?` at ${n.location}`:""}, attitude ${n.attitude??0}${n.status&&n.status!=="alive"?`, ${n.status}`:""}. ${n.personality||""} ${n.notes||""}${(n.memories||[]).length ? ` Remembers about the party: ${n.memories.join(" | ")}` : ""}`).join("\n")||"- none"));
  if (c.companions.length) L.push("ANIMAL COMPANIONS & HIRELINGS: " + c.companions.map(p=>`${p.name} (${p.race||""} ${p.role||""}, HP ${p.hp}/${p.maxHp})`).join("; "));
  if (c.explore) L.push(dungeonContext(c));
  if (c.villain && !c.villainDefeated){ const th = c.threat || {stage:0}; const fallen = topLevelLocs(c).filter(l => l.fallen).map(l => l.name); const lts = topLevelLocs(c).filter(l => l.lieutenant).map(l => `${l.lieutenant} at ${l.name}`);
    L.push(`VILLAIN'S PROGRESS: threat ${threatLabel(th.stage)} (stage ${th.stage}).${fallen.length ? ` Fallen towns: ${fallen.join(", ")}.` : ""}${lts.length ? ` Lieutenants: ${lts.join("; ")}.` : ""} Let this color the world: worried NPCs, refugees, patrols.`); }
  if (c.villainDefeated) L.push(`THE VILLAIN ${c.villain?.name || ""} HAS BEEN DEFEATED. The main story is complete; the world is open for further adventures.`);
  const cqs = companionsOf(c).filter(m => m.companion.cq).map(m => `${m.name}: personal quest ${m.companion.cq === "done" ? "completed (loyal)" : "in progress"}`); if (cqs.length) L.push("COMPANION QUESTS: " + cqs.join("; "));
  if ((c.traitors||[]).length) L.push(`TRAITORS who joined the villain: ${c.traitors.map(t => t.name).join(", ")}.`);
  const townHere = townOf(c); if (townHere) L.push(`STANDING in ${townHere.name}: ${standingLabel(standing(c, townHere))} (${standing(c, townHere)}). NPCs here treat the party accordingly.`);
  const fl = Object.keys(c.flags||{}).filter(k => c.flags[k]); if (fl.length) L.push("FLAGS (past choices): " + fl.slice(-30).join(", "));
  const rep = Object.entries(c.reputation||{}); if (rep.length) L.push("REPUTATION: " + rep.map(([k,v]) => `${k} ${v>0?"+":""}${v}`).join(", "));
  const town = townOf(c); if (town) L.push(`SERVICES HERE (${town.name}): ${servicesOf(town).map(x => SERVICE_INFO[x]?.label).filter(Boolean).join(", ")}. The player uses these through the game's menus; you narrate.`);
  if (c.chronicle.length) L.push("CHRONICLE (important facts, oldest first):\n" + c.chronicle.slice(-40).map(x=>"- "+x.text).join("\n"));
  return L.join("\n\n");
}
function recentLog(c, n=16){
  const entries = c.log.filter(e=>["dm","player","roll","sys"].includes(e.kind)).slice(-n);
  const lastDm = entries.map((e,i)=>e.kind==="dm"?i:-1).filter(i=>i>=0).slice(-2);
  return entries.map((e,i)=>{
    if (e.kind==="dm"){ const t = e.text.replace(/\s+/g," "); return "DM: " + (lastDm.includes(i) ? t.slice(0,1800) : t.slice(0,420) + (t.length>420?"…":"")); }
    if (e.kind==="player") return `PLAYER${e.mode==="say"?" (says)":""}: ${e.text}`;
    if (e.kind==="roll") return `ROLL: ${e.data?.label}: ${e.data?.total} vs DC ${e.data?.dc} → ${e.data?.success?"success":"failure"}${e.data?.crit?" (natural 20)":e.data?.fumble?" (natural 1)":""}`;
    return "EVENT: " + (e.notes||[]).map(x=>x.text).join("; ");
  }).join("\n");
}
function buildDMPrompt(c, kind, payload){
  const ch = c.characters[c.activeCharId]; const st = S().settings;
  let task;
  if (kind === "genesis"){
    task = `START A NEW CAMPAIGN.${isQuick(c) ? `
QUICK ADVENTURE (one evening, about 90 minutes): create a compact region with exactly 3 or 4 locations: the starting town, one wild place, and the villain's lair (a dungeon, cave, ruins or keep) about a day's travel from the town. The villain is a local, urgent threat, and the main quest leads straight toward the lair.` : ""}
Create an original world (not a published setting) that fits the premise and this particular character. In the JSON include:
"world": {"name":"...","region":"...","overview":"2-3 sentences"},
"location": the starting settlement as a full LOCATION with x≈50, y≈50, discovered true,
"locations": 5-8 more LOCATIONs: at least one tavern or hall inside the starting settlement (parent set), one place of danger for adventure (dungeon, ruins, cave, tower...), and wilderness or a second settlement; mix discovered and rumored,
"npcs": 3-5 NPCs with distinct voices, wants and relationships to each other,
"quests": one main quest that hooks THIS character (use their background, alignment and backstory) and one side quest,
"villain": {"name":"...","title":"...","motive":"one sentence","theme":"undead|goblin|bandit|cult|beast|swamp|giant|dragon","lair":"id of the dangerous location where they can finally be confronted"},
"memory": 2-4 setup facts, "time": the starting time of day.
Narration: an evocative opening of 150-250 words that places ${ch.name}${companionsOf(c).length ? ` and their companions (${companionsOf(c).map(m=>m.name).join(", ")}, who already travel together; show one line from each)` : ""} in the starting location in the middle of something happening, ending on a moment that invites action. Also include "choices" for the opening.`;
  } else if (kind === "roll"){
    task = `ROLL RESULT for "${payload.reason}": ${payload.detail}. ${payload.success ? "SUCCESS" : "FAILURE"}${payload.crit ? " — natural 20, a critical success" : payload.fumble ? " — natural 1, a critical failure" : ""}.
Narrate the outcome now and move the scene forward. Do not ask for the same roll again.`;
  } else if (kind === "event"){
    task = `GAME EVENT: ${payload.text}\nRespond as the DM.`;
  } else {
    task = `PLAYER ${payload.mode==="say" ? "SAYS (in character)" : "ACTION"}: ${payload.who ? `[${payload.who}] ` : ""}${payload.text}\nRespond as the DM.`;
  }
  if (st.hints && kind !== "genesis") task += `\nAlso include "hints": up to 3 short, varied ideas the player might try (not a menu; creative nudges).`;
  const diff = {story:"Story mode: be forgiving; fights lean easy, failure rarely kills.", standard:"Standard difficulty.", deadly:"Deadly mode: fights lean hard, the world is unforgiving, but always fair."}[c.premise?.difficulty||"standard"];
  return `${DM_RULES}

BESTIARY (name it in "combat" and the app fills stats): ${bestiaryLine()}
${diff}

=== CURRENT GAME STATE ===
MAIN CHARACTER (the player)
${charSummary(ch)}

${partySummary(c)}

${worldSummary(c)}

RECENT EVENTS (oldest first)
${recentLog(c) || "(the story begins)"}

=== NOW ===${styleDirective() ? `\n${styleDirective()}` : ""}
${task}`;
}
// The DM's reply: narration, then a marker line, then one JSON object with state changes.
// Smaller models bend this format in predictable ways; every one of them is handled here.
const STATE_MARK = /(?:^|\n)[ \t*_#>`]*(?:<{2,3}\s*STATE\s*>{2,3}|STATE\s*(?:JSON)?\s*:)[ \t*_`]*/i;
function visibleNarration(t){
  let v = String(t); const m = v.match(STATE_MARK); if (m) v = v.slice(0, m.index);
  const j = v.indexOf("```"); if (j >= 0) v = v.slice(0, j);
  return stripNarrLabel(v.replace(/<{1,3}[A-Z]*$/i, "").replace(/\n[\s*_#>`]*$/, "")).trim();
}
function stripNarrLabel(v){ return String(v).replace(/^\s*(?:\*\*|__)?\s*narration\s*:?\s*(?:\*\*|__)?\s*:?\s*/i, ""); }
// close whatever a cut-off reply left open: strings, arrays, objects
function repairJSON(s){
  let out = "", inStr = false, esc = false; const stack = [];
  for (const ch of s){
    out += ch;
    if (inStr){ if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === "{" || ch === "[") stack.push(ch); else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "").replace(/,\s*"[^"]*"\s*:?\s*$/, "").replace(/:\s*$/, ": null");
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}
function tolerantJSON(s){
  s = String(s).replace(/```(?:json)?/gi, "").trim(); const a = s.indexOf("{"); if (a < 0) return null;
  const b = s.lastIndexOf("}"); const body = b > a ? s.slice(a, b + 1) : s.slice(a);
  const clean = (x) => x.replace(/,\s*([}\]])/g, "$1").replace(/[\u201c\u201d]/g, '"').replace(/(^|[^:"])\/\/[^\n]*/g, "$1");
  for (const cand of [body, clean(body), repairJSON(clean(s.slice(a)))]) { try { const v = JSON.parse(cand); if (v && typeof v === "object") return v; } catch {} }
  return null;
}
function parseDM(text){
  text = String(text || "");
  // some models answer with one JSON object: {"narration": "...", "state": {...}}
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("```")){ const whole = tolerantJSON(t); if (whole && typeof whole.narration === "string") return { narration: stripNarrLabel(whole.narration).trim(), state: (whole.state && typeof whole.state === "object") ? whole.state : Object.fromEntries(Object.entries(whole).filter(([k]) => k !== "narration")), ok: true }; }
  let narr = text, js = "";
  const m = text.match(STATE_MARK);
  if (m){ narr = text.slice(0, m.index); js = text.slice(m.index + m[0].length); }
  else { const f = text.match(/```json\s*([\s\S]*?)(?:```|$)/i) || text.match(/(\{[\s\S]*\})\s*$/); if (f && f.index > 40){ narr = text.slice(0, f.index); js = f[1]; } }
  narr = stripNarrLabel(narr.replace(/<{1,3}\s*S?T?A?T?E?\s*>*\s*$/i, "")).trim();
  let state = {}, ok = true; if (js.trim()){ const p = tolerantJSON(js); if (p && typeof p === "object" && !Array.isArray(p)) state = p; else ok = false; }
  return { narration: narr, state, ok };
}
async function askClaude(input, o={}){
  if (!SAMPLE) throw {code:"not_available", message:"no sample"};
  return SAMPLE(input, { cache:false, modelTier: o.tier || S().settings.tier, onText: o.onText, signal: o.signal });
}
async function askJSON(input, o={}){
  if (!SAMPLE) throw {code:"not_available"};
  return SAMPLE.json(input, { cache:false, modelTier: o.tier || "quick", signal: o.signal });
}
const DM_ERR = { not_granted:"Claude access was declined for this page. Reload to be asked again.", sampling_disabled:"Claude isn't available on this account.", not_declared:"This page can't reach Claude.",
  rate_limited:"The Dungeon Master needs a breather (usage limit reached). Try again in a little while.", session_expired:"Your session expired. Sign in again, then retry.", refused:"The DM declined that turn. Try phrasing the action differently.",
  prompt_too_large:"The story grew too long to send. Try again; older events will be trimmed.", upstream_error:"The connection to the DM dropped. Try again.", empty_completion:"The DM returned nothing. Try again.", not_available: window.__WEB__ ? "Can't reach the Dungeon Master server. Check your connection." : "The AI Dungeon Master needs Claude. Open this game inside Claude to play.",
  bad_key:"Your Anthropic API key was rejected. Check it in Settings.", not_configured:"This server has no API key. Add your own Anthropic API key in Settings.", overloaded:"The AI service is busy right now. Try again in a moment." };
let dmCtl = null;
// without the AI DM, keep the factual sentences of a game event and drop the instructions meant for the DM
function offlineText(t){
  const drop = /^(describe|narrate|write|do not|don't|give|end |share|respond|include|keep|make|decide|this is|the game|mechanical|results? already|outcome:|afterwards the party continues|combat ended|defeated:|fled:|still standing|party:)/i;
  const out = String(t||"").replace(/\s+/g," ").split(/(?<=[.!?])\s+/).filter(x => x && !drop.test(x.trim()) && !/\b(DM|JSON|narrat|describe|the game handles)\b/i.test(x)).join(" ").trim();
  return out.length > 8 ? out.replace(/^The party /, "Your party ") : "";
}
function stopDM(){ dmCtl?.abort(); }

// ---- apply the DM's state changes -------------------------------------------------
function normLoc(c, L, near){
  if (!L || typeof L !== "object") return null;
  const id = L.id && c.locations[L.id] ? L.id : (L.id ? slug(L.id) : slug(L.name));
  const ex = c.locations[id] || Object.values(c.locations).find(x => L.name && x.name.toLowerCase() === String(L.name).toLowerCase());
  if (ex){
    if (L.description) ex.description = String(L.description).slice(0,400); if (L.discovered === true) ex.discovered = true; if (L.important != null) ex.important = !!L.important;
    if (Array.isArray(L.connects)) for (const k of L.connects) link(c, ex.id, k);
    if (L.type && LOC_TYPES.includes(L.type)) ex.type = L.type; if (L.name) ex.name = String(L.name).slice(0,50); if (L.hostile) ex.hostile = true; if (L.hidden === false || L.discovered === true) ex.hidden = false;
    return ex;
  }
  if (!L.name) return null;
  const parent = L.parent && (c.locations[L.parent] ? L.parent : Object.values(c.locations).find(x=>x.name.toLowerCase()===String(L.parent).toLowerCase())?.id) || null;
  let x = num(L.x, NaN), y = num(L.y, NaN);
  if (!parent && (!Number.isFinite(x) || !Number.isFinite(y))){ const base = near ? topLoc(c, near) : null; const a = Math.random()*Math.PI*2, r = 10 + Math.random()*8; x = (base?.x ?? 50) + Math.cos(a)*r; y = (base?.y ?? 50) + Math.sin(a)*r; }
  const loc = { id, name:String(L.name).slice(0,50), type: LOC_TYPES.includes(L.type) ? L.type : "ruins", x: parent ? null : clamp(x,4,96), y: parent ? null : clamp(y,5,95),
    description: String(L.description||"").slice(0,400), discovered: L.discovered !== false && !L.hidden, hidden: !!L.hidden, visited:false, parent, important: !!L.important, hostile: !!L.hostile, theme: THEMES[L.theme] ? L.theme : undefined, connections:[] };
  c.locations[id] = loc; if (Array.isArray(L.connects)) for (const k of L.connects) link(c, id, k);
  return loc;
}
function link(c, a, b){ const A = c.locations[a], B = c.locations[b] || Object.values(c.locations).find(x=>x.name.toLowerCase()===String(b).toLowerCase()); if (!A || !B || A.id===B.id) return;
  A.connections = [...new Set([...(A.connections||[]), B.id])]; B.connections = [...new Set([...(B.connections||[]), A.id])]; }
function moveTo(c, loc){
  if (!loc) return; const prev = c.currentLocationId; loc.discovered = true; loc.visited = true;
  const pa = topLoc(c, prev), pb = topLoc(c, loc.id); if (pa && pb && pa.id !== pb.id) link(c, pa.id, pb.id);
  if (loc.parent && c.locations[loc.parent]){ c.locations[loc.parent].visited = true; c.locations[loc.parent].discovered = true; }
  c.currentLocationId = loc.id;
}
function upsertQuest(c, q){
  if (!q || typeof q !== "object") return null;
  const found = (q.id && c.quests[q.id]) || Object.values(c.quests).find(x => q.title && x.title.toLowerCase() === String(q.title).toLowerCase());
  const id = found?.id || slug(q.id || q.title);
  const prev = found || { id, title: q.title || "Untitled quest", kind:"side", status:"active", objectives:[], createdAt: Date.now() };
  const objs = Array.isArray(q.objectives) ? q.objectives.map(o => { const oid = o.id || slug(o.text); const old = (prev.objectives||[]).find(p=>p.id===oid || p.text===o.text); return { id: oid, text: String(o.text || old?.text || "").slice(0,200), done: o.done != null ? !!o.done : !!old?.done, optional: o.optional != null ? !!o.optional : !!old?.optional }; }) : prev.objectives;
  const merged = { ...prev, ...Object.fromEntries(Object.entries(q).filter(([k,v])=>v!=null && k!=="objectives")), id, objectives: objs };
  merged.kind = merged.kind === "main" ? "main" : "side"; merged.status = ["active","completed","failed"].includes(merged.status) ? merged.status : "active";
  c.quests[id] = merged; return { q: merged, isNew: !found, statusChanged: found && found.status !== merged.status };
}
function upsertNPC(c, n){
  if (!n || !n.name && !n.id) return null;
  const found = (n.id && c.npcs[n.id]) || Object.values(c.npcs).find(x => n.name && x.name.toLowerCase() === String(n.name).toLowerCase());
  const id = found?.id || slug(n.id || n.name);
  const m = { ...(found||{ id, name: n.name, attitude: 0, status:"alive", metAt: c.currentLocationId }), ...Object.fromEntries(Object.entries(n).filter(([k,v])=>v!=null && k !== "memory" && k !== "memories")), id };
  if (n.memory) m.memories = [...(found?.memories || []), String(n.memory).slice(0, 160)].slice(-6); else if (found?.memories) m.memories = found.memories;
  m.attitude = clamp(num(m.attitude,0),-100,100); c.npcs[id] = m; return { n: m, isNew: !found };
}
function makeCompanion(p){
  const atk = p.attack || {};
  return { id: uid("p"), name: String(p.name||"Ally").slice(0,40), race: p.race||"", role: p.role||"", notes: p.notes||"", hp: clamp(num(p.hp,10),1,300), maxHp: clamp(num(p.maxHp||p.hp,10),1,300), ac: clamp(num(p.ac,12),8,22),
    attack: { name: atk.name || "Strike", toHit: clamp(num(atk.to_hit ?? atk.toHit, 3),0,12), dmg: String(atk.damage || atk.dmg || "1d6+1"), t: atk.type || atk.t || "bludgeoning" }, summoned: !!p.summoned, beast: !!p.beast };
}
function applyState(c, st){
  const ch = c.characters[c.activeCharId]; const notes = []; const N = (kind, text) => notes.push({kind, text});
  if (!st || typeof st !== "object") return notes;
  if (st.world && typeof st.world === "object") c.world = { ...(c.world||{}), name: String(st.world.name||c.world?.name||"The Realm"), region: String(st.world.region||""), overview: String(st.world.overview||"").slice(0,600) };
  const newLocs = [...(Array.isArray(st.locations) ? st.locations : []), ...(st.location && typeof st.location === "object" && st.location.name ? [st.location] : [])].filter(L => L && typeof L === "object");
  newLocs.sort((a,b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0));
  for (const L of newLocs){ const had = c.locations[L.id] || Object.values(c.locations).some(x=>x.name===L.name); const l = normLoc(c, L, c.currentLocationId); if (l && !had && L !== st.location && !l.hidden) N("map", `${l.discovered?"Discovered":"Heard of"}: ${l.name}`); }
  if (st.villain && typeof st.villain === "object"){ c.villain = { name: String(st.villain.name||"").slice(0,60), title: String(st.villain.title||"").slice(0,60), motive: String(st.villain.motive||"").slice(0,200), theme: THEMES[st.villain.theme] ? st.villain.theme : null, lair: st.villain.lair }; }
  if (c.world) ensureWorldMap(c);
  if (c.villain?.lair){ const lair = c.locations[c.villain.lair] || Object.values(c.locations).find(l => l.name.toLowerCase() === String(c.villain.lair).toLowerCase()); if (lair && !lair.villain){ lair.villain = c.villain; lair.important = true; if (c.villain.theme) lair.theme = c.villain.theme; lair.lvl = Math.max(lair.lvl || 1, 5); if (!DUNGEON_TYPES.includes(lair.type) || SETTLEMENTS.includes(lair.type) && !["castle","tower","temple"].includes(lair.type)) lair.type = "dungeon"; } }
  if (st.location){ const l = typeof st.location === "string" ? (c.locations[st.location] || Object.values(c.locations).find(x=>x.name.toLowerCase()===st.location.toLowerCase())) : normLoc(c, st.location, c.currentLocationId);
    if (l && l.id !== c.currentLocationId){ const top0 = topLoc(c, c.currentLocationId)?.id; moveTo(c, l); if (topLoc(c, l.id)?.id !== top0) c.explore = null; onArrive(c, topLoc(c, l.id) || l, notes); N("map", `Now at ${l.name}`); } else if (l) moveTo(c, l); }
  if (st.time && typeof st.time === "string") c.time.phase = st.time;
  if (st.day_advance) { c.time.day += clamp(num(st.day_advance,1),1,30); }
  if (st.gold){ const g = Math.round(num(st.gold)); ch.gold = Math.max(0, ch.gold + g); N(g>0?"loot":"hurt", `${g>0?"+":""}${g} gold`); }
  if (Array.isArray(st.items_remove)) for (const nm of st.items_remove){ let r = null; for (const m of partyMembers(c)){ r = removeItemByName(m, typeof nm === "string" ? nm : nm?.name, num(nm?.qty,1)); if (r) break; } if (r) N("hurt", `Lost: ${r.name}`); }
  if (Array.isArray(st.items_add)) for (const spec of st.items_add.slice(0,12)){ const it = addItem(ch, makeItem(spec)); N("loot", `Gained: ${typeof spec==="object" && spec.qty>1 ? spec.qty+"× " : ""}${it.name}`); checkRecoverQuests(c, it.name, notes); }
  if (st.hp){ const v = Math.round(num(st.hp)); if (v < 0) damageChar(c, ch, -v, null, notes, st.hp_reason); else { const before = ch.hp; ch.hp = Math.min(maxHp(ch), ch.hp + v); N("loot", `Healed ${ch.hp-before} HP`); } }
  if (Array.isArray(st.party_hp)) for (const x of st.party_hp){ const m = partyMembers(c).find(p => p.name.toLowerCase().startsWith(String(x?.name||"").toLowerCase().split(" ")[0]) ); const v = Math.round(num(x?.delta)); if (!m || !v) continue; if (v < 0) damageChar(c, m, -v, null, notes, firstName(m.name)); else { const b = m.hp; m.hp = Math.min(maxHp(m), m.hp + v); N("loot", `${firstName(m.name)} +${m.hp-b} HP`); } }
  if (Array.isArray(st.conditions_add)) for (const x of st.conditions_add){ const nm = String(typeof x==="string"?x:x?.name||"").toLowerCase().trim(); if (nm){ addCond(ch, nm, {note: x?.note||x?.duration||"", dm:true}); N("hurt", `Condition: ${nm}`); } }
  if (Array.isArray(st.conditions_remove)) for (const x of st.conditions_remove){ const nm = String(x).toLowerCase(); if (hasCond(ch,nm)){ remCond(ch, nm); N("loot", `No longer ${nm}`); } }
  if (Array.isArray(st.quests)) for (const q of st.quests){ const r = upsertQuest(c, q); if (!r) continue;
    if (r.isNew) N("quest", `New quest: ${r.q.title}`); else if (r.statusChanged) N("quest", `Quest ${r.q.status}: ${r.q.title}`); else N("quest", `Quest updated: ${r.q.title}`);
    if (r.statusChanged && r.q.status === "completed") c.chronicle.push({t:Date.now(), day:c.time.day, text:`Completed: ${r.q.title}.`}); }
  // the story system owns the main quest's act objectives and its completion: re-apply them after any DM quest edit
  if (c.story && Array.isArray(st.quests)){ const mq = c.quests[c.story.questId]; if (mq && mq.status !== "active" && !c.villainDefeated) mq.status = "active"; storyObjectives(c); }
  if (Array.isArray(st.npcs)) for (const n of st.npcs){ const r = upsertNPC(c, n); if (r?.isNew) N("npc", `Met ${r.n.name}`); }
  if (Array.isArray(st.companions_add)) for (const p of st.companions_add.slice(0,2)){ const ex = c.companions.find(x=>x.name.toLowerCase()===String(p.name).toLowerCase()); if (ex) Object.assign(ex, makeCompanion({...ex, ...p, maxHp: p.hp ?? ex.maxHp}), {id:ex.id}); else if (c.companions.length < 2){ c.companions.push(makeCompanion(p)); N("npc", `${p.name} tags along`); } }
  if (Array.isArray(st.companions_remove)) for (const nm of st.companions_remove){ const before = c.companions.length; c.companions = c.companions.filter(x=>x.name.toLowerCase()!==String(nm).toLowerCase()); if (c.companions.length < before) N("npc", `${nm} leaves`); }
  if (Array.isArray(st.party_join)) for (const p of st.party_join.slice(0,2)){
    if (partyMembers(c).some(m => m.name.toLowerCase() === String(p.name||"").toLowerCase())) continue;
    if (partyMembers(c).length >= MAX_PARTY){ N("hurt", `No room in the party for ${p.name}`); continue; }
    const nc = companionFromDM(p, ch.level); addToParty(c, nc, "joined during the story"); N("npc", `${nc.name} (${nc.race} ${nc.cls}) joins the party!`); }
  if (Array.isArray(st.party_leave)) for (const nm of st.party_leave){ const m = companionsOf(c).find(x => x.name.toLowerCase().startsWith(String(nm).toLowerCase().split(" ")[0])); if (m && !m.companion.player && !seatInfo(m.id)){ removeFromParty(c, m.id, "parted ways"); N("npc", `${m.name} leaves the party`); } }
  if (Array.isArray(st.approval)) for (const a of st.approval.slice(0,4)){ const m = companionsOf(c).find(x => x.name.toLowerCase().startsWith(String(a?.name||"").toLowerCase().split(" ")[0])); const dlt = clamp(Math.round(num(a?.delta)), -20, 20); if (m && dlt){ m.companion.approval = clamp(m.companion.approval + dlt, -100, 100); N("npc", `${firstName(m.name)} ${dlt>0?"approves":"disapproves"}${a.reason?` (${String(a.reason).slice(0,40)})`:""}`); } }
  checkDesertion(c, notes);
  if (st.flags && typeof st.flags === "object") for (const [k,v] of Object.entries(st.flags).slice(0,6)) c.flags = {...(c.flags||{}), [slug(k).replace(/-/g,"_")]: v};
  if (st.reputation && typeof st.reputation === "object") for (const [k,v] of Object.entries(st.reputation).slice(0,4)){ const d2 = clamp(Math.round(num(v)),-30,30); if (!d2) continue; c.reputation = {...(c.reputation||{})}; c.reputation[k] = clamp((c.reputation[k]||0) + d2, -100, 100); N(d2>0?"loot":"hurt", `Reputation with ${k} ${d2>0?"+":""}${d2}`); }
  if (typeof st.clue === "string" && st.clue.trim()) addClue(c, st.clue.trim(), notes);
  if (Array.isArray(st.dm_notes) || Array.isArray(st.dm_notes_done)){ c.memory = c.memory || { summary:"", upTo:null, notes:[] };
    const done = (st.dm_notes_done || []).map(x => String(x).toLowerCase().slice(0, 60)).filter(Boolean);
    c.memory.notes = [...(c.memory.notes || []).filter(n => !done.some(d => n.toLowerCase().includes(d))), ...(st.dm_notes || []).map(x => String(x).slice(0, 200)).filter(Boolean)].filter((v, i, a) => a.indexOf(v) === i).slice(-12); }
  if (Array.isArray(st.memory)) for (const m of st.memory.slice(0,6)) if (m) c.chronicle.push({ t: Date.now(), day: c.time.day, text: String(m).slice(0,260) });
  if (c.chronicle.length > 160) c.chronicle = c.chronicle.slice(-160);
  if (st.inspiration && !ch.inspiration){ ch.inspiration = true; N("xp", "Inspiration awarded"); }
  if (st.xp){ const x = clamp(Math.round(num(st.xp)),0,20000); if (x) for (const m of partyMembers(c)) gainXP(c, m, x, notes, st.xp_reason, m.id !== ch.id); }
  if (st.shop && Array.isArray(st.shop.items)) c.shop = { name: st.shop.name || "Shop", keeper: st.shop.keeper || "", items: st.shop.items.slice(0,16).map(s=>({...makeItem(s), price: Math.max(0, Math.round(num(s.price ?? s.value, 10)))})) };
  worldTick(c);
  c.hints = Array.isArray(st.hints) ? st.hints.slice(0,3).map(String) : [];
  c.choices = Array.isArray(st.choices) ? st.choices.slice(0,4).map(x => typeof x === "string" ? {text:x} : {text: String(x?.text||"").slice(0,140), skill: SKILLS[x?.skill] ? x.skill : null}).filter(x => x.text) : [];
  return notes;
}
function gainXP(c, ch, x, notes, reason, quiet){
  const could = canLevel(ch); ch.xp += x;
  if (!quiet) notes?.push({kind:"xp", text:`+${x} XP${reason?` (${String(reason).slice(0,50)})`:""}`});
  if (ch.companion && !heroAwaitsLevelUp(c, ch)){ levelUpCompanions(c, notes); return; }
  if (!could && canLevel(ch)) notes?.push({kind:"xp", text: ch.id === c.activeCharId ? "Level up available!" : `${firstName(ch.name)} can level up${ch.companion?.playerName ? ` (${ch.companion.playerName} chooses)` : ""}!`});
}
function damageChar(c, ch, amt, type, notes, reason){
  if (type && resistances(ch).includes(type)) amt = Math.floor(amt/2);
  let a = amt; if (ch.tempHp){ const t = Math.min(ch.tempHp, a); ch.tempHp -= t; a -= t; }
  ch.hp -= a; notes?.push({kind:"hurt", text:`-${amt} HP${reason?` (${String(reason).slice(0,40)})`:""}`});
  if (ch.hp <= 0 && !c.combat){ ch.hp = 1; notes?.push({kind:"hurt", text:`${firstName(ch.name)} blacks out, and wakes later with 1 HP`}); c.chronicle.push({t:Date.now(), day:c.time.day, text:`${ch.name} was knocked unconscious${reason?` (${reason})`:""}.`}); }
  return amt;
}
function partySummary(c){
  const comps = companionsOf(c);
  if (!comps.length) return "PARTY: no companions yet (the player can recruit up to 3 at inns and guilds, or NPCs may join through the story with party_join).";
  const humans = comps.filter(m => seatInfo(m.id));
  const lead = window.Net?.isOnline() ? `ONLINE CO-OP: the main character ${c.characters[c.activeCharId].name} is played by ${window.Net.hostName()}.${humans.length ? ` ${humans.map(m => `${m.name} is played by a human player (${seatInfo(m.id).name})`).join("; ")}. NEVER decide what a human-played character does or says: describe the situation, address them by name and let them act. Player actions arrive tagged with the character's name, e.g. [Brakka Stonejaw] I kick the door.` : ""}\n` : "";
  return lead + "PARTY (companions who travel with the main character; give the AI-played ones voices):\n" + comps.map(m => { const cp = m.companion;
    if (cp.player) return `- ${m.name} [PLAYER CHARACTER${seatInfo(m.id) ? `, played by ${seatInfo(m.id).name}` : ", player away: keep them in the background"}]: level ${m.level} ${m.race} ${m.cls}${m.subclass?` (${m.subclass})`:""}, HP ${m.hp}/${maxHp(m)}, AC ${armorClass(m)}.${m.backstory ? ` Backstory: ${String(m.backstory).slice(0, 300)}` : ""}${m.appearance ? ` Looks: ${String(m.appearance).slice(0, 160)}` : ""}`;
    return `- ${m.name}${seatInfo(m.id) ? ` [HUMAN PLAYER: ${seatInfo(m.id).name}]` : ""}: level ${m.level} ${m.race} ${m.cls}${m.subclass?` (${m.subclass})`:""}, HP ${m.hp}/${maxHp(m)}, AC ${armorClass(m)}, best skills ${Object.keys(SKILLS).sort((a,b)=>skillMod(m,b)-skillMod(m,a)).slice(0,3).map(k=>`${k} ${fmt(skillMod(m,k))}`).join(", ")}. Personality: ${cp.personality} Voice: ${cp.voice} Likes: ${cp.likes.join(", ")}. Dislikes: ${cp.dislikes.join(", ")}. Personal goal: ${cp.hook} Approval of the player: ${cp.approval} (${approvalLabel(cp.approval)}).`; }).join("\n");
}
function pushLog(c, e){ c.log.push({ id: uid("l"), t: Date.now(), actor: c.activeCharId, ...e }); if (c.log.length > 400) c.log = c.log.slice(-400); }

// ---- The main DM turn -------------------------------------------------------------
async function runDM(kind, payload={}){
  if (S().busy) return;
  const c0 = C(); if (!c0) return;
  if (!SAMPLE){
    if (kind === "event"){ const t = payload.offline || offlineText(payload.text); if (t) store.camp(c => pushLog(c, {kind:"dm", text: t, offline: true})); return; }
    store.set({dmError: DM_ERR.not_available}); return; }
  if (kind === "action" && payload.text && !payload.who && window.Net?.isOnline()) payload = {...payload, who: onlineWho()};
  if (kind === "action" && payload.text) store.camp(c => { pushLog(c, {kind:"player", text: payload.text, mode: payload.mode, who: payload.who}); c.hints = []; c.choices = []; });
  const prompt = buildDMPrompt(C(), kind, payload);
  dmCtl = new AbortController(); const ctl = dmCtl;
  store.set({ busy: kind === "genesis" ? "genesis" : "dm", stream: "", dmError: null, lastRequest: {kind, payload} });
  let text = "";
  try {
    const res = await askClaude(prompt, { signal: ctl.signal, onText: ({text:t}) => { text = t; store.set({stream: visibleNarration(t)}); } });
    text = res.text;
  } catch(e){
    const partial = e?.text ? visibleNarration(e.text) : "";
    store.set({ busy:null, stream:"", dmError: e?.code === "cancelled" ? null : ((window.__WEB__ && e?.message) || DM_ERR[e?.code] || DM_ERR.upstream_error), retryable: e?.code !== "cancelled" });
    if (partial && e?.code !== "refused") store.camp(c => pushLog(c, {kind:"dm", text: partial + " …"}));
    return;
  }
  const { narration, state, ok } = parseDM(text);
  let post = null;
  store.camp(c => {
    const ch = c.characters[c.activeCharId];
    if (narration) pushLog(c, { kind:"dm", text: narration, first: kind === "genesis" });
    const notes = applyState(c, state);
    if (!ok) notes.push({kind:"hurt", text:"The DM's notes were smudged; no state changed this turn"});
    if (notes.length) pushLog(c, { kind:"sys", notes });
    if (state.rest === "long"){ doLongRestAll(c); pushLog(c, {kind:"sys", notes:[{kind:"loot", text:"Long rest: the whole party is restored"}]}); }
    if (state.rest === "short") post = {modal:{type:"shortrest"}};
    if (state.roll && typeof state.roll === "object" && !state.combat) c.pendingRoll = normRoll(state.roll, c);
    if (state.combat && typeof state.combat === "object"){ c.pendingRoll = null; post = {combat: state.combat}; }
    if (state.shop && c.shop) post = {...(post||{}), modal:{type:"shop"}};
  });
  store.set({ busy:null, stream:"" });
  if (post?.combat) startCombat(post.combat);
  if (post?.modal) openModal(post.modal);
  const c = C();
  const lastSys = c.log[c.log.length-1];
  if (lastSys?.kind==="sys" && lastSys.notes.some(n=>n.text==="Level up available!")) toast("Level up available! Open your character sheet.", "gold");
  const rollFor = c.pendingRoll && (c.pendingRoll.who || c.activeCharId);
  const othersRoll = rollFor && window.Net?.isOnline() && Net.controllerOf(c, {kind:"pc", ref: rollFor, main: rollFor === c.activeCharId}) !== Net.me.id && !c.pendingRoll.group;
  if (c.pendingRoll && S().settings.autoRoll && !post?.combat && !othersRoll){ await sleep(700); if (C()?.pendingRoll) doPendingRoll(); }
  saveNow();
  maybeSummarize();
}
function normRoll(r, c){
  let kind = String(r.kind||"skill").toLowerCase(); let skill = null, ability = null;
  const sk = Object.keys(SKILLS).find(k => k.toLowerCase() === String(r.skill||"").toLowerCase());
  const abRaw = String(r.ability||"").toUpperCase().slice(0,3); ability = ABILS.includes(abRaw) ? abRaw : (Object.entries(ABIL_NAME).find(([,v])=>v.toUpperCase().startsWith(abRaw))?.[0] || null);
  if (kind === "save"){ ability = ability || "DEX"; } else if (sk){ kind = "skill"; skill = sk; ability = SKILLS[sk]; } else { kind = "ability"; ability = ability || "STR"; }
  const adv = /adv/i.test(r.adv) && !/dis/i.test(r.adv) ? "advantage" : /dis/i.test(r.adv) ? "disadvantage" : "none";
  let who = null; if (r.who && c){ const m = partyMembers(c).find(x => x.name.toLowerCase().startsWith(String(r.who).toLowerCase().split(" ")[0])); if (m) who = m.id; }
  return { kind, skill, ability, dc: clamp(Math.round(num(r.dc, 12)), 3, 30), adv, reason: String(r.reason || "").slice(0,120), who, group: !!r.group };
}
function rollLabel(pr){ return pr.kind === "save" ? `${ABIL_NAME[pr.ability]} saving throw` : pr.kind === "skill" ? `${ABIL_NAME[pr.ability]} (${pr.skill}) check` : `${ABIL_NAME[pr.ability]} check`; }
function checkModifiers(ch, pr){
  let mod = pr.kind === "save" ? saveMod(ch, pr.ability) : pr.kind === "skill" ? skillMod(ch, pr.skill) : (mods(ch)[pr.ability] + (ch.cls==="Bard"&&ch.level>=2 ? Math.floor(profBonus(ch.level)/2) : 0));
  let adv = pr.adv === "advantage", dis = pr.adv === "disadvantage"; const why = []; const extra = [];
  const isCheck = pr.kind !== "save";
  if (isCheck && (hasCond(ch,"poisoned") || hasCond(ch,"frightened") || hasCond(ch,"exhausted"))){ dis = true; why.push("condition"); }
  if (hasCond(ch,"raging") && pr.ability === "STR"){ adv = true; why.push("rage"); }
  if (pr.kind === "save" && ch.race === "Gnome" && ["INT","WIS","CHA"].includes(pr.ability)){ adv = true; why.push("gnome cunning"); }
  if (pr.kind === "save" && ch.race === "Dwarf" && /poison/i.test(pr.reason)){ adv = true; why.push("dwarven resilience"); }
  if (pr.kind === "save" && ["Elf","Half-Elf"].includes(ch.race) && /charm/i.test(pr.reason)){ adv = true; why.push("fey ancestry"); }
  if (pr.kind === "save" && ch.race === "Halfling" && /fear|fright/i.test(pr.reason)){ adv = true; why.push("brave"); }
  const armor = ch.equipped?.armor && invItem(ch, ch.equipped.armor);
  if (pr.skill === "Stealth" && armor?.armor?.stealthDis){ dis = true; why.push("noisy armor"); }
  if (isCheck && hasCond(ch,"guided")) extra.push({expr:"1d4", label:"Guidance", consume:"guided"});
  if (!isCheck && hasCond(ch,"blessed")) extra.push({expr:"1d4", label:"Bless"});
  return { mod, adv, dis, why, extra };
}
async function doPendingRoll(opt={}){
  const c = C(); const pr = c?.pendingRoll; if (!pr || S().busy) return;
  const label = rollLabel(pr);
  if (pr.group){
    const r = await partyCheck(pr.skill || pr.ability, pr.dc, {group:true, save: pr.kind === "save"});
    store.camp(c => { pushLog(c, { kind:"roll", data:{ label: `Group ${label}`, reason: pr.reason, rolls:[], kept: 0, mod: 0, bonus:0, total: 0, dc: pr.dc, success: r.success, group: r.text } }); c.pendingRoll = null; });
    await runDM("roll", { reason: `Group ${label}${pr.reason?`: ${pr.reason}`:""}`, detail: r.text, success: r.success }); return;
  }
  const whoId = opt.who || pr.who || c.activeCharId; const ch = c.characters[whoId] || PC();
  const info = checkModifiers(ch, pr); const adv = info.adv || !!opt.inspiration || !!opt.luck; const dis = info.dis;
  let r = rollD20({adv, dis, lucky: RACES[ch.race].lucky});
  let bonus = 0; const bonusParts = []; for (const e of info.extra){ const x = rollDice(e.expr).total; bonus += x; bonusParts.push(`${e.label} ${x}`); }
  let total = r.kept + info.mod + bonus; let success = total >= pr.dc; const crit = r.kept === 20, fumble = r.kept === 1;
  if (crit) success = true; if (fumble) success = false;
  let indom = false;
  if (!success && pr.kind === "save" && resLeft(ch,"indomitable")){ const r2 = rollD20({}); const t2 = r2.kept + info.mod + bonus; indom = true; if (t2 >= pr.dc){ r = r2; total = t2; success = true; } }
  const who = ch.id === c.activeCharId ? "" : `${ch.name}: `;
  await showRoll({ label: who + label, dice:[{sides:20, values:r.rolls, kept:r.kept}], mod: info.mod, bonus, bonusParts, total, dc: pr.dc, success, crit, fumble, adv: r.adv, dis: r.dis });
  const detail = `${ch.name} rolls d20 ${r.rolls.length>1?`(${r.rolls.join(" & ")}, ${r.adv?"advantage":"disadvantage"}) `:""}${r.kept} ${fmt(info.mod)}${bonus?` +${bonus} (${bonusParts.join(", ")})`:""} = ${total} vs DC ${pr.dc}`;
  store.camp((c) => {
    const x = c.characters[ch.id];
    if (opt.inspiration) c.characters[c.activeCharId].inspiration = false; if (opt.luck) useRes(x, "luck"); if (indom) useRes(x, "indomitable");
    for (const e of info.extra) if (e.consume) remCond(x, e.consume);
    const main = c.characters[c.activeCharId]; main.stats.rolls++; if (crit) main.stats.crits++;
    pushLog(c, { kind:"roll", data:{ label: who + label, reason: pr.reason, rolls: r.rolls, kept: r.kept, mod: info.mod, bonus, total, dc: pr.dc, success, crit, fumble, adv:r.adv, dis:r.dis, why: info.why } });
    c.pendingRoll = null;
  });
  await runDM("roll", { reason: `${who}${label}${pr.reason?`: ${pr.reason}`:""}`, detail, success, crit, fumble });
}
// dice overlay: resolves when the animation is done
let overlayResolve = null;
function showRoll(o){
  const st = S().settings; const quick = st.diceAnim === "quick" || o.quick; const ms = st.reduceMotion ? 700 : quick ? 1250 : 2300;
  Sfx.play("dice"); if (o.success != null) setTimeout(() => Sfx.play(o.crit || o.success ? "success" : "fail"), ms * (quick ? 0.45 : 0.55));
  return new Promise(res => { overlayResolve = res; store.set({ overlay: {...o, quick, id: uid("o")} }); setTimeout(()=>{ store.set({overlay:null}); overlayResolve = null; res(); }, ms); });
}
function dismissOverlay(){ if (overlayResolve){ const r = overlayResolve; overlayResolve = null; store.set({overlay:null}); r(); } }

// ---- New campaign -----------------------------------------------------------------
function fallbackWorld(c){
  const ch = c.characters[c.activeCharId];
  c.world = { name:"The Emberlands", region:"The Greywater March", overview:"A frontier of river towns and old forests, where the ruins of a fallen empire still hum with forgotten magic." };
  const locs = [
    {id:"greywater",name:"Greywater",type:"town",x:48,y:52,description:"A muddy river town of fishers and smugglers, ringed by a crooked palisade."},
    {id:"the-drowned-lantern",name:"The Drowned Lantern",type:"tavern",parent:"greywater",description:"A crowded riverside tavern where rumors are cheaper than ale."},
    {id:"thornwood",name:"The Thornwood",type:"forest",x:32,y:40,description:"Dense, briar-choked forest where the old roads vanish."},
    {id:"sunken-abbey",name:"The Sunken Abbey",type:"ruins",x:20,y:28,description:"A collapsed monastery half-swallowed by the marsh.",discovered:false,important:true},
    {id:"ironhill",name:"Ironhill",type:"village",x:66,y:36,description:"A mining village perched on red cliffs."},
    {id:"redcap-caves",name:"The Redcap Caves",type:"cave",x:78,y:20,description:"Goblin-haunted tunnels beneath the cliffs.",discovered:false},
    {id:"blackmire",name:"The Blackmire",type:"swamp",x:30,y:72,description:"A stinking fen where lights drift at night.",discovered:false},
    {id:"saltmere",name:"Saltmere",type:"port",x:70,y:74,description:"A salt-crusted harbour town trading with the southern isles."},
    {id:"old-watchtower",name:"The Old Watchtower",type:"tower",x:56,y:24,description:"An abandoned signal tower; bandits use it now.",discovered:false,hidden:true,hostile:true,theme:"bandit"}
  ];
  for (const l of locs) normLoc(c, l);
  c.villain = {name:"Abbot Morvane", title:"the Drowned Abbot", motive:"He rings the sunken bell to drown the living and raise a choir of the dead.", theme:"undead", lair:"sunken-abbey"};
  ensureWorldMap(c);
  const lair = c.locations["sunken-abbey"]; lair.villain = c.villain; lair.theme = "undead"; lair.lvl = 5;
  moveTo(c, c.locations["the-drowned-lantern"]); c.locations.greywater.visited = true;
  upsertQuest(c, {id:"the-abbey-bell", title:"The Bell Beneath the Marsh", kind:"main", giver:"Mother Ilse", summary:"Each night a drowned bell tolls from the Sunken Abbey, and each dawn someone in Greywater does not wake.", objectives:[{id:"ask", text:"Learn what the townsfolk know about the bell"},{id:"find", text:"Find the path to the Sunken Abbey"},{id:"stop", text:"Silence the bell and whoever rings it"}]});
  upsertNPC(c, {id:"mother-ilse", name:"Mother Ilse", race:"Human", role:"Temple keeper", location:"greywater", personality:"Soft-spoken, unshakeable, hiding grief.", attitude:20, notes:"Her acolyte vanished three nights ago."});
  upsertNPC(c, {id:"bram-halloway", name:"Bram Halloway", race:"Halfling", role:"Tavern keeper", location:"the-drowned-lantern", personality:"Jovial, nosy, knows everyone's debts.", attitude:10});
  const party = companionsOf(c).map(m => m.name).join(" and ");
  pushLog(c, {kind:"dm", first:true, text:`Rain drums on the shutters of the Drowned Lantern as ${ch.name}${party ? ` and ${party}` : ""} shake the road from their cloaks. The common room smells of wet wool and fish stew. At the bar, the halfling keeper Bram is arguing in a hushed voice with a grey-robed priestess, and every few breaths the room goes quiet as if listening for something.\n\nThen you hear it: far off, beneath the rain, a bell tolls once, deep and wrong, like it rings from underwater. A mug slips from someone's fingers and shatters. The priestess turns and looks straight at you.\n\n*(${window.__WEB__ ? "The Dungeon Master server couldn't be reached, so this is a fixed opening" : "The AI Dungeon Master isn't connected, so this is a fixed opening. Open the game inside Claude for the full adventure"}; the map, travel, dungeons and combat still work.)*`});
}
async function createCampaign(ch, premise, recruits=[], extra=[]){
  const c = migrate({ id: uid("k"), name: premise.name || `${ch.name}'s Tale`, createdAt: Date.now(), updatedAt: Date.now(), premise,
    partyIds:[ch.id], characters:{[ch.id]:ch}, activeCharId: ch.id, companions:[], locations:{}, currentLocationId:null, quests:{}, npcs:{}, chronicle:[], log:[],
    pendingRoll:null, combat:null, shop:null, time:{day:1, phase:"evening"}, world:null, flags:{}, reputation:{} });
  if (CLASSES[ch.cls] && subMods(ch).beastCompanion) c.companions.push(beastCompanion(ch));
  for (const tplId of recruits.slice(0, MAX_PARTY-1)){ const tpl = COMPANIONS.find(t => t.id === tplId); if (tpl) addToParty(c, buildCompanion(tpl, ch.level), "an old travelling companion"); }
  for (const h of extra.slice(0, MAX_PARTY - 1)) addToParty(c, h, h.companion?.player ? "a fellow adventurer" : "an old travelling companion");
  if (premise.mode === "quick") for (const m of partyMembers(c)) levelHeroTo(m, 3);   // quick adventures start at level 3
  store.set({ campaign: c, view:"game", tab:"adventure", dmError:null });
  if (SAMPLE){ await runDM("genesis"); if (!C().world) { store.camp(c=>fallbackWorld(c)); } else store.camp(c => { ensureWorldMap(c); const cur = topLoc(c, c.currentLocationId); if (cur) cur.visited = true; }); }
  else { store.camp(c => fallbackWorld(c)); }
  store.camp(c => { const h = topLoc(c, c.currentLocationId); if (!c.homeTown && h && ["town","city","village","port"].includes(h.type)) c.homeTown = h.id; initStory(c); });
  saveNow();
  if (!S().settings.seenHelp && !S().modal) setTimeout(() => { if (!S().modal) openModal({type:"help"}); }, 600);
}
function beastCompanion(ch){ const p = profBonus(ch.level); return makeCompanion({ name:"Wolf", race:"Wolf", role:"Animal companion", hp: 4*ch.level+7, ac: 13 + Math.floor(p/2), attack:{name:"Bite", to_hit: p+3, damage:`2d4+${2+Math.floor(p/2)}`, type:"piercing"}, beast:true }); }
</script>
