// MOCK_DM=1: canned Dungeon Master replies for local development and tests (no API calls).
import vm from "node:vm";
import fs from "node:fs";

const code = fs.readFileSync(new URL("./mock-sample.js", import.meta.url), "utf8");
const ctx = { window: {}, setTimeout, console };
vm.createContext(ctx);
vm.runInContext(code, ctx);
const samplePromise = ctx.window.claude.use("sample");

export async function mockReply({ input, json }, send) {
  const sample = await samplePromise;
  if (json) { send({ delta: JSON.stringify(await sample.json(input)) }); }
  else {
    const { text } = await sample(input, {});
    for (let i = 0; i < text.length; i += 90) { send({ delta: text.slice(i, i + 90) }); await new Promise(r => setTimeout(r, Number(process.env.MOCK_DM_DELAY) || 12)); }
  }
  send({ done: true, truncated: false, tier: "default" });
}
