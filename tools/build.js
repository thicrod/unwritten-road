// Builds both versions of the game from the same source files in game/:
//   dist/unwritten-road.html  -> the Claude artifact version
//   public/index.html         -> the website version (uses web/platform.js + our server)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = ["01_head.html", "02_data.js", "02b_content.js", "03_rules.js", "04_dm.js", "05_combat.js", "07_world.js",
  "08_party.js", "09_sound.js", "10_deep.js", "11_tactics.js", "12_story.js", "13_art.js", "14_spellfx.js", "15_music.js", "06_ui_a.js", "06_ui_b.js", "06_ui_c.js", "06_ui_e.js", "06_ui_d.js"];
const src = ORDER.map(f => fs.readFileSync(path.join(root, "game", f), "utf8")).join("");

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "unwritten-road.html"), src);

const HTM = '<script src="https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js"></script>';
if (!src.includes(HTM)) throw new Error("build: htm script tag not found in game/01_head.html");
const head = `<meta name="description" content="A D&D-style adventure with an AI Dungeon Master: build a hero, recruit a party, explore, fight and shape the story.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎲</text></svg>">`;
let web = src.replace(HTM, `${HTM}\n<script src="/config.js"></script>\n<script src="/platform.js"></script>\n<script src="/socket.io/socket.io.js"></script>\n<script src="/jpatch.js"></script>\n<script src="/net.js"></script>`).replace("</head>", `${head}\n</head>`);
fs.mkdirSync(path.join(root, "public"), { recursive: true });
fs.writeFileSync(path.join(root, "public", "index.html"), web);
fs.copyFileSync(path.join(root, "web", "platform.js"), path.join(root, "public", "platform.js"));
fs.copyFileSync(path.join(root, "web", "net.js"), path.join(root, "public", "net.js"));
// the same diff/patch code the server uses, wrapped for the browser as window.JPatch
const jp = fs.readFileSync(path.join(root, "shared", "jpatch.js"), "utf8").replace(/^export /gm, "");
fs.writeFileSync(path.join(root, "public", "jpatch.js"), `(function(){\n${jp}\nwindow.JPatch = { diff, apply };\n})();\n`);
console.log(`Built dist/unwritten-road.html (${(src.length / 1024).toFixed(0)} KB) and public/index.html`);
