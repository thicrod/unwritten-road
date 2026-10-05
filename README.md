# The Unwritten Road (online)

A D&D-style RPG with an AI Dungeon Master, playable in the browser.
This repo builds two versions from the same game source:

- `public/index.html`: the website version (served by the Node server in `server/`)
- `dist/unwritten-road.html`: the Claude artifact version

## Quick start (Gemini, free)

```bash
npm install
export GEMINI_API_KEY=AIza...          # free key from https://aistudio.google.com
npm run check-key                      # should end with "All good"
npm run build
npm start                              # open http://localhost:3000
```

**The AI Dungeon Master** can be **Gemini** (Google, free tier) or **Claude** (Anthropic, paid API):
- **Choosing:** `DM_PROVIDER` picks it. If only one key is set, that provider is used automatically.
- **Gemini's free tier** gives about 500 requests a day on Flash-Lite, the default. That's enough for a session or two daily. On Gemini, "Smart enemy tactics" starts off to save requests (players can turn it on in Settings).
- **Players can bring their own key** in Settings, either Anthropic (`sk-ant-…`) or Gemini (`AIza…`).

## How it works

The game runs in the browser. When it needs the Dungeon Master, `web/platform.js` sends the request
to `POST /api/dm`, and the server calls the Anthropic API and streams the reply back.
The API key lives only on the server.

- **Your key by default.** Requests use `ANTHROPIC_API_KEY`, with per-player and daily limits (`server/limits.js`).
- **Own key optional.** Players can paste their own key in Settings. It's stored in their browser and
  sent with their requests, which then skip your limits. The server never stores it.
- **Prompt caching.** The long DM rules are sent as a cached system prompt, which cuts the cost of every turn after the first.
- **Saves** stay in each player's browser (plus export/import from Settings).

## Online co-op (rooms)

- **New co-op adventure (lobby):** *Play online* → *Host a room* → *Open lobby*.
  - The host picks the party size (2–4) and sets each seat to **Human** or **AI**. For AI seats they choose a companion and can tick **AI only**.
  - Friends join with the code or link. They either **take an open seat and create their own hero** (the full character creator, minus the party/campaign steps) or **take over an AI companion**.
  - The host sets tone, setting and difficulty and presses **Start the adventure**. Human seats nobody filled are played by the AI.
- **Continue an existing campaign together:** *Online* → *Host it*.
  - Friends can take over a companion.
  - If the party has room, they can **bring their own hero**, who joins at the party's level.
  - The host can mark companions **AI only**.
- **Level-ups:** player heroes level up by their player's choices, using the same level-up screen as the leader (HP roll, subclass, ability scores or feat, spells, invocations, fighting style, expertise).
  - When one has enough XP, its player gets a ★ Level up button, and everyone else sees "Maria makes the choices".
  - The host's game checks every choice, replaces anything invalid with a sensible default, and never applies the same level twice.
  - If the player leaves the room for good, the hero goes back to leveling automatically.
- **Player heroes** are full characters owned by their player. They have no companion approval, banter, betrayal or personal quest, the DM treats them as player characters, and the AI only plays them while their player is away.
- **Join:** *Play online* on the home screen (or open the invite link), enter your name and the code.
- **Seats:** in the room panel, a guest can *Take control* of any AI companion. Heroes nobody controls stay AI.
- **What syncs:** the story, the DM's text as it's written, dice rolls, travel scenes, maps and battles, live on every screen.
- **Host drops:** after `HOST_GRACE_MS` (default 20s) the longest-connected player becomes host and the game continues
  from the server's latest copy. Reloading the page rejoins the room automatically.
- **Playing together:**
  - **Combat:** whoever holds a hero's seat takes its turns. There's a 60-second turn timer, after which the AI plays that turn, and a hero whose player disconnects is played by the AI until they're back.
  - **Rolls:** when the DM asks a specific hero to roll, that hero's player gets the Roll button.
  - **Typed actions:** actions from other players reach the DM tagged with their character (`[Brakka Stonejaw] I distract the guard`). Actions sent at the same time are combined into one request.
  - **The DM prompt** knows which heroes are human-played and never decides for them. Human-played companions are exempt from approval, barks and betrayal.
  - **Party votes** on travel, event choices, dialogue choices and making camp. Majority wins, ties go to whoever called the vote, and each vote lasts 30 seconds. Playing alone in a room skips votes.
  - **Party chat**, kept for late joiners. The DM doesn't see it.
  - **Shared actions:** every player can shop, use the inn, temple and notice board, recruit, craft, forage, manage gear and party tactics, cast spells and use items outside combat, take short rests, and explore dungeons room by room.
    - These run on the host's game.
    - Errors like "Not enough gold" appear only for the player who acted.
    - Nothing pops up on anyone else's screen.
    - The party purse is shared.

How it works: the host's browser runs the game. Other players' clicks become *intents* (e.g. "attack Goblin 2"),
which the host checks (is it your hero's turn?) and runs exactly as if clicked locally (`game/06_ui_e.js`, `Coop`). After each change it sends a small diff (`shared/jpatch.js`,
usually ~100 bytes) through Socket.IO (`server/rooms.js`). The server keeps the latest full copy and forwards the diff to
everyone else. Guests' copies are read-only, so they can never drift from the host's.

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev            # builds, then starts with MOCK_DM=1 (canned replies, no API key needed)
```

Open http://localhost:3000. To test co-op on one computer, open a second browser (or a private window) at the same address and join with the room code.

To use the real Dungeon Master:

```bash
cp .env.example .env   # then put your key in .env
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm start
```

(`npm start` doesn't read `.env` by itself; set the variable in your shell or your host's dashboard.)

## Story, combat and the Dungeon Master

- **Structured main story:** campaigns follow three acts.
  - **Act 1, Investigate:** gather 3 clues about the villain. Clues come from tavern rumors, finished bounties, mystery rooms, defeated bosses and lieutenants, and discoveries the DM awards.
  - **Act 2, Confront the lieutenant:** their stronghold appears on the map.
  - **Act 3, Storm the lair.**
  - **Pacing:** each act you finish sets the villain's clock back. The DM is told the current act and goal every turn, so it keeps the story on track.
- **Quick adventures** (creator or lobby → *Length: Quick adventure*):
  - A one-evening story of about 90 minutes.
  - A compact region, and heroes start at level 3.
  - No villain clock.
  - One clue leads straight to the lair, then the boss, then the epilogue.
- **Tactical combat:**
  - **Objectives:** hold out for N rounds, protect an NPC, or stop a ritual in time.
  - **Enemy morale:** enemies flee or surrender once half of them fall or their leader dies.
  - **Reinforcements** arriving mid-fight.
  - **Cover:** back-line characters get +2 AC against ranged attacks while their front line stands.
  - **Flanking:** advantage on melee attacks against a foe an ally already hit this round.
  - **Area spells** can target a whole enemy line.
  - **Shove:** push a foe out of their front line, or knock them prone.
  - Dungeon rooms and the DM can both set objectives.
- **A better DM:**
  - A rolling "story so far" summary keeps long campaigns consistent.
  - NPCs remember things about the party.
  - The DM keeps private notes (secrets and setups) to pay off later.
  - Settings let the host choose narration length and story language (English, Português, Español).

## Look and feel

- **Character portraits:** every hero, companion and player character gets a procedurally drawn SVG portrait, with no image files.
  - **Race features:** pointed elf ears, dwarf beards, half-orc tusks, tiefling horns and glowing eyes, dragonborn scaled snouts.
  - **Class gear:** wizard hats, rogue hoods, paladin helms, druid leaf crowns, bard caps, war paint, holy symbols.
  - **Designing yours:** players choose skin or scales, hair style and color, beard, eyes and whether to show gear in the creator's Story step. Companions keep a stable look.
  - **Enemies** get type icons (beast, undead, dragon, fiend…).
- **Rare encounters:** about 1 road encounter in 9 is special, and each happens once per campaign: 12 hand-written encounters.
  - **Rare (gold):** a peddler of wonders, a forgotten god's shrine, a hero's cairn, a lost caravan, a field of ghosts.
  - **Legendary (violet):** a wishing well, a messenger of light.
  - **Ominous (red):** a cursed idol, a plague village, night thieves, a dragon's shadow, your own double.
  - **Rewards:** rare magic items, permanent ability score increases, blessings, inspiration and big treasure.
  - **Punishments:** curses (−2 to attacks) and disease (−2 to checks) until a temple cures them, lost gold or gear, and the villain's plans accelerating.
  - The Journal counts how many you've found.
- **Roll dice yourself** (on by default; Settings to turn off):
  - **Your d20 rolls wait for you:** attacks, death saves and checks from events and traps show the die with "Tap to roll". The result is decided when you click.
  - **Checks the DM asks for** (talking to NPCs, sneaking…) wait for the Roll button instead of rolling themselves.
  - **In co-op** each player taps for their own hero's rolls on their own screen; everyone else sees the result.
- **Battle map:** every fight shows a live battlefield drawn for the terrain (forest, cave, crypt, swamp, town…).
  - Your party is on the left and enemies on the right, each in front and back lines, as portrait tokens with HP rings and condition badges.
  - The active character glows, and a "Your turn" banner shows when it's yours.
  - Tap an enemy token to target it. 🛡 marks foes your melee can't reach past their front line.
  - Spell effects and damage play on the tokens, and tokens slide between lines when someone moves or is shoved.
  - It can be hidden from the map itself or in Settings.
- **Party size:**
  - **Solo:** the creator's Party step offers "Just me" or 2–4 heroes. Fights scale to the party.
  - **Co-op:** the lobby's "Fill empty seats with AI" option can be unticked to play with exactly the people who joined (e.g. 2 players, no AI).
- **First-time tips:** a short tip the first time you see the story, combat, the map, dungeons and the party screen. Settings → "Show tips again" brings them back.
- **Monster portraits:** every creature in the bestiary gets a drawn portrait by family.
  - **Families:** goblins and kobolds, skeletons, zombies and ghouls, ghosts, spiders, trolls, ogres, dragons and lizardfolk, oozes, demons, elementals, golems and mimics.
  - **Beast variants:** wolves, bears, rats, owlbears, minotaurs, boars and more.
  - **Humanoid foes** reuse the hero generator, dressed by role (bandits hooded, cultists as warlocks, knights armored, hags and vampires with their own skin).
- **Boss intros:** when a boss fight starts, the boss's portrait, name and title sweep across the screen. Tap to skip; skipped with "reduce motion".
- **Spell animations by element:** a rune circle on the caster, then the element's effect.
  - Fireballs arc and explode, frost shards shatter, and lightning chains between targets.
  - Radiant light descends, necrotic wisps rise, psychic rings pulse, force darts fly and thunder waves burst.
  - Acid splashes, poison clouds creep, heals sparkle and buffs glow.
  - Effects play on a click-through layer, and respect "reduce motion".
- **"Previously on…" recaps** when you continue a campaign or join a game in progress: the party, the story so far, the current act and the last scene. One button asks the DM for a spoken recap to read aloud.
- **Ambient music** (Settings → Music; off by default): synthesized in the browser, following the scene through towns, wilds, dungeons, battles and boss fights, with crossfades and reverb.
- **Sturdier DM replies:** the parser accepts common variations from smaller models (mangled markers, fenced or whole-object JSON, "Narration:" labels) and repairs replies cut off mid-JSON.

## Progression and extras

- **Levels 1–20:**
  - Full experience, spell slot and spells-known tables up to level 20.
  - High-level class features, with ability score increases at 12, 16 and 19.
  - Fighters get 3 attacks at 11 and 4 at 20, Paladins get Improved Divine Smite, and Barbarians get Primal Champion.
  - 18 spells of 6th–9th level (Chain Lightning, Heal, Finger of Death, Sunburst, Meteor Swarm, Power Word Kill, Mass Heal…).
  - Epic monsters (adult dragons, Lich, Vampire, Death Knight, Balor, giants, golems) and very rare and legendary treasure.
- **Party base:** buy a hall in a friendly town (600 gp). Resting there is free. Upgrades:
  - **Forge:** +2 to crafting checks.
  - **Library:** research for clues or XP.
  - **Chapel:** cures curses and disease when you rest.
  - **Stables:** free, faster fast travel.
  - **Training yard:** XP from a day of training.
  - **Treasury:** daily income.
- **Fast travel:** safe trips between towns you've visited, with no encounters and a coach fare. It's a party vote in co-op.
- **Session recap:** leaving with Home after a real session (or Settings → Show recap) shows the night's highlights: XP per hero, MVP, best hit, fights, loot, quests, clues, achievements. Copy it as text, or save it as an image on the website.
- **Achievements and Hall of Fame:** 30 achievements with unlock pop-ups and progress bars. Every finished campaign enters the Hall of Fame with the hero's portrait, title and stats.
- **Portuguese interface:** Settings → Interface language → Português translates menus, buttons, combat and settings. It also switches the story to Portuguese, which you can change separately. Spell, item and monster names stay in English.

## Reliability, testing and playtests

- **Model fallback:** if the storyteller model is busy or unavailable (a 503, for example), the server retries on the next lighter model before any text streams, and the player sees a short notice. `npm run check-key` shows a busy model as a warning, not a failure.
- **Report a problem:** the ⚑ button on any DM reply (or Settings → Report a problem) sends the player's note, the last DM reply and the game details to the server.
  - Reports are logged as `[report] #id …`, and saved in Postgres or `SAVES_DIR` when configured.
  - To read them, set `ADMIN_KEY` on the server, then open `/api/reports?key=YOUR_ADMIN_KEY`.
- **DM check-up** (Settings): sends two real requests through the game's own instructions and grades the replies: story text, the state block, dialogue choices and their tones, teammate lines, and speed. "Send results" files it as a report.
- **Tests:** `npm test` runs the unit tests, and `npm run test:e2e` runs browser tests (solo, combat, boss fights, factions, reports, co-op) against the mock DM. GitHub Actions runs both on every push (`.github/workflows/ci.yml`).
- **Faster loading:** the build minifies everything, and the server sends a pre-compressed Brotli page (about 225 KB instead of about 950 KB). `UR_NO_MINIFY=1 npm run build` gives readable output for debugging.

### Real playtest checklist (game night)
1. Before friends arrive, run **Settings → DM check-up** with your real key, and send the results.
2. Play 45–60 minutes with 2–4 people: talk to NPCs, fight at least once (a boss if you can), travel, and use voice and the mic.
3. Whenever something feels off (the story ignores you, repeats, bad choices, a stuck button), tap **⚑** on that reply and say what happened.
4. Afterwards, send me the `[report]` lines from the Render logs, or `/api/reports`.

## Combat, factions and scenes

- **Epic boss fights:**
  - Bosses take legendary actions between heroes' turns: 2 per round from party level 5, 3 from level 11. These include a sweeping strike across the front line.
  - At half health bosses enter phase 2, and at a quarter they make a **last stand** and call minions.
  - Lair hazards hit every round (every other round below level 8), themed by the boss: flame vents, grasping dead, falling rocks, hellfire, maddening whispers. The battle map shows a boss health bar, phase tags and legendary pips.
- **Factions:** each campaign has a law faction, a merchants' guild, mages or druids, a thieves' guild, and the villain's cult.
  - Standing runs from Hated to Honored, and the DM changes it through the story. Defeating bandits and cultists shifts it too.
  - **Rewards:** Liked and Honored unlock discounts, gifts, a revealed hidden place, a secret about the villain, the druids' blessing, and a sergeant who joins your boss fights.
  - The Journal shows each faction, and the epilogue tells how each remembers you.
- **Scene illustrations:** a painted banner for the party's current place, lit by the time of day. Optional AI art: set `SCENE_ART_MODEL` (a Gemini image model your key can use) and each place gets a generated illustration once, shared with everyone and capped by `SCENE_ART_MAX_PER_DAY` (default 20). The built-in banner is the fallback.
- **Speak your actions:** the 🎤 button next to Send fills the action box from your voice, using the browser's speech recognition (Chrome, Edge or Safari). Start with "say …" to speak in character.

## Dialogue and teammates

- **More choices when talking to people:** when an NPC talks with you or makes an offer, the DM gives 4–5 options. There's one to accept (✓), one to refuse (✕), a probing question (?), a skill play (Persuasion, Deception…), and a 🎲 wildcard. *Say something random* makes your hero blurt out something unexpected, and *Say something else…* lets you type your own line.
- **Teammates talk:**
  - **In the story:** AI companions speak in their own voices as chat bubbles under the narration, reacting to the scene, to you and to each other.
  - **On the road:** they also banter on their own, with no AI request needed.
  - **In combat:** they shout over their tokens on crits, kills, when an ally goes down, at the start of a fight and on victory. Enemies taunt back.
- **Combat clarity:** a caption on the battle map says what just happened, badges show who acts next, and fallen fighters topple.
- **World map:** your party leader's portrait marks where you are, plus a compass rose.

## DM voice (optional): narration read aloud with ElevenLabs

The server can voice the Dungeon Master's narration with ElevenLabs (model `eleven_flash_v2_5`). Only the story text is spoken: dice, system messages, menus and chat are not, and markdown is stripped first.

- **Set it up:** add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to the server environment (`.env` locally, or Render → Environment), and optionally `ELEVENLABS_MAX_CHARS_PER_MONTH` (9000 suggested on the free tier). The key stays on the server and is never sent to browsers.
- **How it works:**
  - The server watches each DM reply. As soon as the narration is complete, it generates the audio once and tells every player in the room to play that same clip, or tells the solo player.
  - Clips are cached by a hash of the text, so repeats cost nothing.
  - Every request logs its character count and the monthly total (`[tts] 247 chars · 2026-10 total 247 / 9,000`). The total is saved in Postgres or `SAVES_DIR` when configured, so restarts don't reset it.
- **Fallback:** if ElevenLabs fails, times out, runs out of quota, or the monthly cap is reached, players hear their browser's built-in voice instead and the server logs why.
- **For players:** Settings → **DM Voice** turns it on or off for that device only. It's on by default when the server has ElevenLabs set up. A new narration stops the previous one, and the ■ button stops it immediately.
- **Attribution:** "Voice by ElevenLabs" appears in Settings and while a clip plays, as the free tier requires.

## Cloud saves (optional)

Campaigns normally save in each browser. To let players continue on any device, connect a free Postgres database:

1. Create a free database at **neon.tech** (sign in, create a project) and copy its connection string (`postgresql://…`).
2. In Render → your service → **Environment**, add `DATABASE_URL` with that string, then redeploy.
3. The logs say `Cloud saves: ON (postgres)`.
4. **Using it:** in Settings, each player sees a private save code. Entering the same code on another device brings their campaigns there. Achievements and the Hall of Fame stay on each device.

Without `DATABASE_URL`, cloud saves stay hidden and everything else works as before. For local testing, `SAVES_DIR=./saves npm start` stores cloud saves as files.

## Site password (recommended once deployed)

Set `SITE_PASSWORD` and everyone sees a sign-in page first:
- **Why:** strangers who find your URL can't use your AI key or your free Gemini quota.
- **Players:** sign in once, and a secure cookie keeps them in for 30 days.
- **Invite links** (`/?room=CODE`) still work: after signing in, the player lands in the room.
- **What's locked:** the game page, the DM endpoint and co-op connections. Only `/api/health` stays open, for Render's health check.
- **Wrong guesses** are limited to 8 per 10 minutes per network.
- **Changing the password** signs everyone out.

## Deploy to Render

The repo includes a Render Blueprint (`render.yaml`), so setup takes a few clicks:

1. Push this folder to a GitHub repo.
2. On https://render.com: **New → Blueprint**, pick the repo. Render reads `render.yaml`
   (free web service, `npm install && npm run build`, `npm start`, health check `/api/health`).
3. When asked, paste your **GEMINI_API_KEY** and choose a **SITE_PASSWORD** to share with your friends. Both are stored in Render, never in the repo.
   (For Claude instead: in the service's Environment settings, set `DM_PROVIDER=anthropic` and add `ANTHROPIC_API_KEY`.)
4. Deploy. The logs should say `API key check: OK (…)`, and `https://<your-app>.onrender.com/api/health` shows `"keyCheck":{"ok":true,…}`.

**Check the AI DM before deploying:** `npm run check-key` with your key set confirms the key works and the models answer (for Claude it also checks prompt caching).

**Free plan behavior** (per Render's docs):
- The service sleeps after 15 minutes with no traffic. WebSocket messages count as traffic, so games in progress keep it awake.
- The first visit after a sleep takes about a minute to wake it.
- Render can restart free services at any time and restarts on every deploy. The game handles this:
  - Players see a "server is restarting" notice.
  - The host's browser restores the room under the same code with the same seats (in the lobby too).
  - Everyone else reconnects automatically.
- Nothing is lost because campaigns are saved in the players' browsers.
- A paid instance avoids the sleep. The code doesn't change.

**Capacity:** a load test (`npm run loadtest`) with 100 rooms × 4 players delivered every update (41,490 of 41,490) with ~1 ms average delay, using ~120 MB of memory. Render's free instance has 512 MB.

**Limits** (environment variables; see `.env.example`):
- `DM_LIMIT_PER_10MIN` (60) and `DM_LIMIT_PER_DAY` (500) apply per IP to requests on your key. In co-op only the host's browser calls the DM, so one table shares one limit.
- `DM_GLOBAL_DAILY_CAP` (3000) caps the whole server per day.
- `ROOMS_MAX` (300) and `ROOMS_PER_IP_10MIN` (6) cap how many rooms exist and how fast one network can create them.
- Players who add their own key in Settings skip the DM limits.

## Project layout

```
game/        game source (shared by both builds)
web/         platform.js (the website's replacement for Claude's built-in AI), net.js (online co-op client)
server/      index.js (web server), dm.js (Anthropic proxy), limits.js, rooms.js (co-op rooms), mock DM for development
shared/      jpatch.js: state diff/patch used by both the server and the browser
tools/       build.js: builds public/ and dist/
```

## Roadmap

- Phase 1 (this): single-player website with your key + optional player keys ✅
- Phase 2: rooms and live sync (Socket.IO): room codes, seats, host takeover ✅
- Phase 3: co-op play: per-player combat turns, rolls, party votes, chat ✅
- Phase 4: lobby: host picks party size and Human/AI seats; players create heroes or take over an AI companion ✅
- Phase 5: hardening, mobile polish, multi-player tests, launch
