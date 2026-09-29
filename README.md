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
