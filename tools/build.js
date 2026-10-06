// Builds both versions of the game from the same source files in game/:
//   dist/unwritten-road.html  -> the Claude artifact version
//   public/index.html         -> the website version (uses web/platform.js + our server)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import zlib from "node:zlib";
// Minify every inline script and style (set UR_NO_MINIFY=1 for readable output while debugging).
const MINIFY = !process.env.UR_NO_MINIFY && !process.argv.includes("--no-minify");
const minJS = (code) => MINIFY ? transformSync(code, { loader: "js", minify: true, legalComments: "none", charset: "utf8", target: "es2020" }).code : code;
const minCSS = (code) => MINIFY ? transformSync(code, { loader: "css", minify: true, charset: "utf8" }).code : code;
const minHTML = (html) => html
  .replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => `<script>${minJS(code)}</script>`)
  .replace(/<style>([\s\S]*?)<\/style>/g, (m, css) => `<style>${minCSS(css)}</style>`);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = ["01_head.html", "02_data.js", "02b_content.js", "03_rules.js", "04_dm.js", "05_combat.js", "07_world.js",
  "08_party.js", "09_sound.js", "10_deep.js", "11_tactics.js", "12_story.js", "13_art.js", "14_spellfx.js", "15_music.js", "16_battle.js", "17_rare.js", "18_meta.js", "19_base.js", "20_i18n.js", "21_epic.js", "22_voice.js", "23_talk.js", "24_ops.js", "25_boss.js", "26_factions.js", "27_scenes.js", "28_sites.js", "29_sites_play.js", "30_towns.js", "06_ui_a.js", "06_ui_b.js", "06_ui_c.js", "06_ui_s.js", "06_ui_e.js", "06_ui_d.js"];
const raw = ORDER.map(f => fs.readFileSync(path.join(root, "game", f), "utf8")).join("");
const src = minHTML(raw);

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "unwritten-road.html"), src);

const HTM = '<script src="https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js"></script>';
if (!src.includes(HTM)) throw new Error("build: htm script tag not found in game/01_head.html");
const head = `<meta name="description" content="A D&D-style adventure with an AI Dungeon Master: build a hero, recruit a party, explore, fight and shape the story.">
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin><link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎲</text></svg>">`;
let web = src.replace(HTM, `${HTM}\n<script src="/config.js"></script>\n<script src="/platform.js"></script>\n<script src="/socket.io/socket.io.js"></script>\n<script src="/jpatch.js"></script>\n<script src="/net.js"></script>`).replace("</head>", `${head}\n</head>`);
fs.mkdirSync(path.join(root, "public"), { recursive: true });
fs.writeFileSync(path.join(root, "public", "index.html"), web);
// pre-compressed copy for browsers that accept Brotli (smaller than gzip for text)
fs.writeFileSync(path.join(root, "public", "index.html.br"), zlib.brotliCompressSync(Buffer.from(web), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: web.length } }));
fs.writeFileSync(path.join(root, "public", "platform.js"), minJS(fs.readFileSync(path.join(root, "web", "platform.js"), "utf8")));
fs.writeFileSync(path.join(root, "public", "net.js"), minJS(fs.readFileSync(path.join(root, "web", "net.js"), "utf8")));
// the same diff/patch code the server uses, wrapped for the browser as window.JPatch
const jp = fs.readFileSync(path.join(root, "shared", "jpatch.js"), "utf8").replace(/^export /gm, "");
fs.writeFileSync(path.join(root, "public", "jpatch.js"), `(function(){\n${jp}\nwindow.JPatch = { diff, apply };\n})();\n`);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`Built dist/unwritten-road.html (${kb(src.length)}${MINIFY ? `, ${kb(zlib.gzipSync(src).length)} gzipped; ${kb(raw.length)} before minifying` : ""}) and public/index.html`);
