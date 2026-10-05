// Checks that the AI Dungeon Master will work before you deploy.
//   Gemini (free tier):  GEMINI_API_KEY=AIza... npm run check-key
//   Claude:              ANTHROPIC_API_KEY=sk-ant-... npm run check-key
import Anthropic from "@anthropic-ai/sdk";
const E = process.env;
const provider = (E.DM_PROVIDER || (E.GEMINI_API_KEY && !E.ANTHROPIC_API_KEY ? "gemini" : E.ANTHROPIC_API_KEY ? "anthropic" : "")).toLowerCase();
if (!provider) { console.error("Set a key first, e.g.\n  GEMINI_API_KEY=AIza... npm run check-key\n  ANTHROPIC_API_KEY=sk-ant-... npm run check-key"); process.exit(1); }
let failed = false;
const why = (e) => { const m = e?.error?.error?.message || e?.message || String(e); return e?.status ? `${e.status} ${m.replace(/^\d{3}\s*/, "")}` : m; };

if (provider === "gemini") {
  const key = E.GEMINI_API_KEY, base = E.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  if (!key) { console.error("GEMINI_API_KEY is not set."); process.exit(1); }
  const models = { "quick/default": E.GEMINI_MODEL_DEFAULT || "gemini-3.5-flash-lite", deep: E.GEMINI_MODEL_DEEP || "gemini-3.8-flash" };
  for (const [tier, model] of Object.entries(models)) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/models/${model}:streamGenerateContent?alt=sse`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "In five words, greet a party of adventurers." }] }], systemInstruction: { parts: [{ text: "You are a fantasy Dungeon Master." }] }, generationConfig: { maxOutputTokens: 60 } }) });
      if (!res.ok) { let j = {}; try { j = (await res.json()).error || {}; } catch {} throw Object.assign(new Error(j.message || res.statusText), { status: res.status }); }
      const raw = await res.text();
      const text = raw.split("\n").filter(l => l.startsWith("data:")).map(l => { try { return (JSON.parse(l.slice(5)).candidates?.[0]?.content?.parts || []).map(p => p.text || "").join(""); } catch { return ""; } }).join("").trim();
      console.log(`✓ ${tier.padEnd(13)} ${model}: "${text || "(empty reply)"}" (${Date.now() - t0} ms)`);
    } catch (e) {
      // a busy model (503) is temporary, and the game falls back to a lighter model automatically
      if (e.status === 503 && !tier.startsWith("quick")) { console.log(`⚠ ${tier.padEnd(13)} ${model}: busy right now (503). Not a key problem: the game falls back to the lighter model automatically.`); continue; }
      failed = true; console.log(`✗ ${tier.padEnd(13)} ${model}: ${why(e)}`);
      if (e.status === 429) console.log("  (free-tier quota reached: wait a minute, or the daily limit resets at midnight Pacific time)");
    }
  }
  console.log(failed ? "\nSomething failed: check the key in Google AI Studio, or set GEMINI_MODEL_DEFAULT / GEMINI_MODEL_DEEP to models your key can use." : "\nAll good: the AI Dungeon Master (Gemini) is ready.");
  process.exit(failed ? 1 : 0);
}

// ----- Claude (Anthropic) -----
const client = new Anthropic({ apiKey: E.ANTHROPIC_API_KEY });
const MODELS = { quick: E.DM_MODEL_QUICK || "claude-haiku-4-5-20251001", default: E.DM_MODEL_DEFAULT || "claude-sonnet-5", deep: E.DM_MODEL_DEEP || "claude-opus-5-5" };
for (const [tier, model] of Object.entries(MODELS)) {
  const t0 = Date.now();
  try { const m = await client.messages.create({ model, max_tokens: 20, messages: [{ role: "user", content: "In five words, greet a party of adventurers." }] });
    console.log(`✓ ${tier.padEnd(7)} ${model}: "${m.content.map(b => b.text || "").join("").trim()}" (${Date.now() - t0} ms)`); }
  catch (e) { failed = true; console.log(`✗ ${tier.padEnd(7)} ${model}: ${why(e)}`); }
}
const rules = ("You are the Dungeon Master of a fantasy role-playing game. Narrate vividly, follow the rules, and keep the world consistent. ").repeat(160);
const ask = () => client.messages.create({ model: MODELS.default, max_tokens: 10, system: [{ type: "text", text: rules, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: "Say ready." }] });
try {
  const a = await ask(), b = await ask();
  console.log(`✓ prompt caching: first call wrote ${a.usage.cache_creation_input_tokens || 0} tokens to the cache, second call read ${b.usage.cache_read_input_tokens || 0} from it`);
} catch (e) { failed = true; console.log(`✗ prompt caching test: ${why(e)}`); }
console.log(failed ? "\nSomething failed: check the key, your API plan, or the model names (DM_MODEL_* variables)." : "\nAll good: the AI Dungeon Master (Claude) is ready.");
process.exit(failed ? 1 : 0);
