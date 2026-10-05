<script>
"use strict";
// =====================================================================
//  TEAMMATE DIALOGUE: companions speak in their own voices: battle barks on the map,
//  banter on the road (no AI needed), and the DM's "party_talk" lines shown as chat bubbles.
// =====================================================================
const VOICES = {
  brakka:  { start: ["Finally! Something to hit!", "Stand behind me. Or don't. More for me."], crit: ["HA! Felt that one in my teeth!", "That's how my mother swung!"], kill: ["Next!", "Down you go, little thing."], hurt: ["Just a scratch. A big scratch."], down: ["{N}! Get up, or I'll carry you myself!"], win: ["Good fight. I'm starving."] },
  aldric:  { start: ["Form up! Shields high!", "Hold the line, and hold your nerve."], crit: ["Steel finds its mark.", "Textbook."], kill: ["One less.", "Yield next time."], hurt: ["I've had worse. Keep fighting."], down: ["{N} is down! Cover them!"], win: ["Well fought, all of you. Check your wounds."] },
  mireille:{ start: ["Light, guide our hands.", "Stay close. I can't heal what I can't reach."], crit: ["The light strikes true!", "Forgive me. Not you, the one I hit."], kill: ["Rest now.", "May you find peace."], hurt: ["Ow. Yes. Fine. I'm fine."], down: ["{N}! Hold on, I'm coming!"], win: ["Everyone breathing? Good. Sit, let me look at you."] },
  quill:   { start: ["Fascinating! Hostile, but fascinating.", "Let me try something I read about."], crit: ["Did everyone see that? Write that down!", "Exactly as the formula predicted!"], kill: ["Reduced to its component parts.", "Hypothesis confirmed."], hurt: ["That was NOT in the book!"], down: ["{N}! Oh no, oh no, someone do something!"], win: ["I'd like to study the remains. Purely academic."] },
  nix:     { start: ["Keep them busy. I'll handle the rest.", "Nobody look at me. That's the trick."], crit: ["Right where it hurts.", "Didn't even see me, did you?"], kill: ["Pockets later.", "Shh. Sleep."], hurt: ["Rude."], down: ["{N}'s down! Somebody be a hero, I'm busy!"], win: ["Dibs on anything shiny."] },
  tamsin:  { start: ["Spread out. Watch the flanks.", "I've got eyes on them."], crit: ["Clean shot.", "Wind was with me."], kill: ["Down.", "Another one for the tally."], hurt: ["Hit, but I'm moving."], down: ["{N} is down! I'll cover them!"], win: ["Tracks say that's all of them. For now."] },
  lark:    { start: ["Oh, this'll make a GREAT song!", "Ladies and gentlemen, the main event!"], crit: ["Encore! ENCORE!", "And the crowd goes wild!"], kill: ["Exit, stage left.", "That rhymes with nothing. Shame."], hurt: ["Not the face! I need the face!"], down: ["{N}! No dying mid-verse, I forbid it!"], win: ["Verse three: 'and they won, gloriously.'"] },
  oren:    { start: ["By my oath, you shall not pass!", "Stand firm! The light is with us!"], crit: ["Justice!", "For the innocent!"], kill: ["Your evil ends here.", "Rest in judgment."], hurt: ["My faith is my armor."], down: ["{N}! I will not lose you today!"], win: ["We stood, and we prevailed. Give thanks."] },
  moss:    { start: ["Hmph. Even the trees are restless.", "Let the roots do the work."], crit: ["The forest bites back.", "Nature is not gentle, child."], kill: ["Back to the soil.", "The cycle turns."], hurt: ["Old bark. Still holds."], down: ["{N}! Breathe, little sapling, breathe!"], win: ["Plant something here, when this is over."] },
  vesper:  { start: ["My patron is watching. Let's give it a show.", "Oh good. I was bored."], crit: ["Delicious.", "Did that sting? Good."], kill: ["One more for the dark.", "Bye now."], hurt: ["You'll regret that."], down: ["{N}! Don't you dare go into the dark without me!"], win: ["Same time tomorrow?"] },
  ember:   { start: ["Stand back, it gets hot!", "I can't promise I'll control it!"], crit: ["Burn, burn, BURN!", "Oops. That was a big one."], kill: ["Toast.", "Smells like victory. And hair."], hurt: ["Ow! Okay, now I'm angry."], down: ["{N}! Somebody help them, I'll keep the fire up!"], win: ["Is anyone else on fire? Just me? Okay."] },
  fen:     { start: ["Breathe. Then move.", "Be like water."], crit: ["Stillness, then strike.", "The body knows."], kill: ["It is finished.", "Balance, restored."], hurt: ["Pain is a teacher."], down: ["{N}! Stay with us, focus on my voice!"], win: ["Breathe, friends. It is over."] },
};
const VOICE_BY_CLASS = { Barbarian: "brakka", Fighter: "aldric", Cleric: "mireille", Wizard: "quill", Rogue: "nix", Ranger: "tamsin", Bard: "lark", Paladin: "oren", Druid: "moss", Warlock: "vesper", Sorcerer: "ember", Monk: "fen" };
const TAUNTS = { humanoid: ["You'll die here!", "Take them down!", "Is that all you've got?"], undead: ["…join us…", "Flesh… warm flesh…"], beast: ["*snarls*", "*howls*"], dragon: ["You dare enter MY domain?", "Kneel, insects."], fiend: ["Your souls will burn.", "Mortals. How quaint."], giant: ["Small ones! Crush!"], goblin: ["Shinies! Get the shinies!", "Stab 'em!"] };
const voiceOf = (m) => VOICES[m?.companion?.tpl] || VOICES[VOICE_BY_CLASS[m?.cls]] || null;
const pickSeeded = (arr, seed) => arr && arr.length ? arr[Math.abs(seed) % arr.length] : null;
const talkHash = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };
// ---------- road banter: one teammate asks, another answers in their own voice ----------
const BANTER_Q = ["{B}, you've been quiet. Something on your mind?", "Be honest, {B}: are we winning?", "{B}, what's the first thing you'll do when this is over?", "Anyone else feel like we're being watched? {B}?", "{B}, why did you really join us?", "If we die out here, {B}, what do I tell your family?", "{B}, settle something: best meal you ever had?", "That was close back there, {B}. You alright?"];
const BANTER_A = {
  brakka: ["Thinking about food. Always food.", "We're winning if I'm still hitting things.", "My clan never had friends like you. Don't tell anyone I said that."],
  aldric: ["Duty. Someone has to stand between the dark and the farms.", "We'll know we've won when we can stop counting the dead.", "I'll sleep a full night. Maybe two."],
  mireille: ["Every road we walk, someone needs healing. I just follow the hurt.", "I'm praying. For you too, whether you like it or not.", "Bread. Warm bread, and a quiet chapel."],
  quill: ["I'm composing a monograph on this entire expedition. Footnotes included.", "Statistically? Unclear. Anecdotally? Ask me after the next fight.", "Mostly I wanted to see things no book has described."],
  nix: ["Me? Nothing. Definitely nothing. Why, what's missing?", "I go where the gold is, and somehow the gold is always near trouble.", "Watched? Always. That's why I walk at the back."],
  tamsin: ["Listening. The forest's been too quiet since dawn.", "I'll go back to the hills. Fewer people, better company. Present company excepted.", "Rabbit stew over a slow fire. Nothing beats it."],
  lark: ["I'm writing the ballad of us. Currently it's a tragedy, but I'm optimistic!", "Someone has to make sure the legends get the details right. Mostly my details.", "Winning? Darling, we're thriving."],
  oren: ["I swore an oath. Oaths don't care if the road is hard.", "When the last innocent sleeps safely, that's when we've won.", "Pray with me tonight, if you'd like."],
  moss: ["The trees have been whispering. They don't like what's coming.", "Young ones always ask about endings. Roots don't end, child.", "Mushroom broth. Don't make that face."],
  vesper: ["My patron has opinions about you. Flattering ones, mostly.", "Join you? I'm just here for the interesting deaths.", "Watched? Oh, we're definitely being watched. Smile."],
  ember: ["Trying not to set anything on fire. It's harder than it looks.", "Winning! Probably! Is that smoke? That's not me.", "My magic chose me. I'm still deciding if I forgive it."],
  fen: ["The mind is a pond. Mine is… a little choppy today.", "Every step is the journey. Even the muddy ones.", "Plain rice, after a long fast. Perfection."],
};
function banterLines(c, seed){
  const comps = companionsOf(c).filter(m => !m.dead && m.hp > 0 && !m.companion?.player); if (comps.length < 1) return null;
  const main = c.characters[c.activeCharId]; const B = pickSeeded(comps, seed);
  const askers = [...comps.filter(m => m.id !== B.id)]; const A = askers.length ? pickSeeded(askers, seed >> 3) : null;
  const q = pickSeeded(BANTER_Q, seed >> 5).replace("{B}", firstName(B.name));
  const ans = pickSeeded(BANTER_A[B.companion?.tpl] || BANTER_A[VOICE_BY_CLASS[B.cls]] || ["Hmm. Ask me later."], seed >> 7);
  return [{ who: A ? A.name : main.name, line: q, self: !A }, { who: B.name, line: ans }];
}
function maybeBanter(c, kind){
  if (!["action", "event", "news", "roll"].includes(kind) || c.combat || Math.random() > 0.28) return;
  if (c.lastBanterDay === c.time.day && Math.random() < 0.6) return;
  const lines = banterLines(c, Date.now() & 0xffffff); if (!lines) return;
  c.lastBanterDay = c.time.day; pushLog(c, { kind: "talk", lines });
}
// the DM's party_talk: only lines from companions who are actually in the party
function pushPartyTalk(c, raw){
  if (!Array.isArray(raw) || !raw.length) return false;
  const names = partyMembers(c).filter(m => !m.dead).map(m => m.name);
  const find = (w) => names.find(n => n === w) || names.find(n => n.split(" ")[0].toLowerCase() === String(w || "").split(" ")[0].toLowerCase());
  const lines = raw.slice(0, 4).map(x => ({ who: find(x?.who), line: String(x?.line || x?.text || "").replace(/^["“]|["”]$/g, "").trim().slice(0, 220) })).filter(x => x.who && x.line && x.who !== c.characters[c.activeCharId]?.name);
  if (!lines.length) return false; pushLog(c, { kind: "talk", lines }); return true;
}
function TalkEntry({ e }){
  const c = C(); const byName = (n) => Object.values(c?.characters || {}).find(ch => ch.name === n);
  return html`<div className="entry talk">${(e.lines || []).map((l, i) => { const ch = byName(l.who); return html`<div key=${i} className=${"talk-line" + (l.self ? " self" : "")}>${ch ? html`<${Portrait} ch=${ch} size=${30}/>` : html`<span className="talk-dot"></span>`}<div className="talk-bubble"><b>${firstName(l.who || "")}</b> ${l.line}</div></div>`; })}</div>`;
}
// ---------- "say something random" ----------
const RANDOM_SAY = ["Has anyone here seen a goat? Asking for a friend.", "I'd like to file a complaint about the weather.", "Before we continue: does anyone else hear bagpipes?", "I accept, but only if there's cake involved.", "Let me be clear: I have no idea what's going on.", "Do you believe in destiny? Because I'm pretty sure mine is lunch.", "I once fought a bear. The bear won. We're friends now.", "Quick question: is this place haunted, or just badly decorated?", "Fine. But I'm telling everyone this was my idea.", "You remind me of my aunt. She also stared at people like that.", "I'm not saying I'm a prophet, but I did dream about this exact conversation.", "Can I interest you in a story about my sword? It's long. The story, I mean.", "Sorry, I zoned out. Did you say treasure?", "I'm going to need you to say that again, but slower and with more drama.", "What if, and hear me out, we all just took a nap first?", "I sense great danger. Also great snacks. Mostly danger."];
const randomSay = () => pick(RANDOM_SAY);
// ---------- battle barks: lines over the tokens, read from the combat log ----------
function useBarks(c, cm){
  const [b, setB] = useState({}); const seen = useRef({ id: null, n: 0 });
  useEffect(() => {
    const log = cm?.log || []; if (seen.current.id !== cm?.id){ seen.current = { id: cm?.id, n: Math.max(0, log.length - 1) }; }
    const fresh = log.slice(seen.current.n); seen.current.n = log.length; if (!fresh.length) return;
    const byName = (n) => Object.values(cm.cbt || {}).find(x => x.name === n || (x.kind === "pc" && c.characters[x.ref]?.name === n));
    const say = {}; const add = (cb, text) => { if (cb && text && !say[cb.id] && Object.keys(say).length < 2) say[cb.id] = text; };
    fresh.forEach((l, k) => { const t = l.text || "", seed = talkHash(t) + log.length + k;
      const crit = t.match(/^\*\*(.+?)\*\* lands a CRITICAL hit/); if (crit){ const cb = byName(crit[1]); const v = cb?.kind === "pc" && voiceOf(c.characters[cb.ref]); if (v && !c.characters[cb.ref]?.main) add(cb, pickSeeded(v.crit, seed)); }
      const fell = t.match(/^\*\*(.+?)\*\* falls!/); if (fell){ const prev = (log[log.indexOf(l) - 1]?.text || "").match(/^\*\*(.+?)\*\* (?:hits|lands)/); const cb = prev && byName(prev[1]); const v = cb?.kind === "pc" && voiceOf(c.characters[cb.ref]); if (v && !c.characters[cb.ref]?.main && seed % 3 !== 0) add(cb, pickSeeded(v.kill, seed)); }
      const down = t.match(/^\*\*(.+?)\*\* goes down!/); if (down){ const mates = party(c).filter(x => x.kind === "pc" && isUp(c, x) && c.characters[x.ref]?.name !== down[1] && !c.characters[x.ref]?.main); const cb = pickSeeded(mates, seed); const v = cb && voiceOf(c.characters[cb.ref]); if (v) add(cb, pickSeeded(v.down, seed).replace("{N}", firstName(down[1]))); }
      if (/^Battle begins!/.test(t)){ const mates = party(c).filter(x => x.kind === "pc" && !c.characters[x.ref]?.main); const cb = pickSeeded(mates, seed); const v = cb && voiceOf(c.characters[cb.ref]); if (v) add(cb, pickSeeded(v.start, seed)); const foe = Object.values(cm.cbt).find(x => x.side === "enemy" && (x.boss || seed % 2)); if (foe){ const kind = monsterKind(foe); const tl = TAUNTS[kind === "goblin" ? "goblin" : foe.type] || null; if (tl) add(foe, pickSeeded(tl, seed >> 2)); } }
    });
    if (cm.status === "victory" && !seen.current.won){ seen.current.won = true; const mates = party(c).filter(x => x.kind === "pc" && isUp(c, x) && !c.characters[x.ref]?.main); const cb = pickSeeded(mates, log.length); const v = cb && voiceOf(c.characters[cb.ref]); if (v) add(cb, pickSeeded(v.win, log.length)); }
    if (!Object.keys(say).length) return;
    setB(p => ({ ...p, ...Object.fromEntries(Object.entries(say).map(([id, text]) => [id, { text, at: Date.now() }])) }));
    const t = setTimeout(() => setB(p => Object.fromEntries(Object.entries(p).filter(([, v]) => Date.now() - v.at < 3200))), 3400); return () => clearTimeout(t);
  }, [cm?.log?.length, cm?.status]);
  return b;
}
</script>
