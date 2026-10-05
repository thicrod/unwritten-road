import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanForSpeech, narrate } from "../../server/tts.js";

test("DM voice: only plain story text is spoken", () => {
  const t = cleanForSpeech('**The door creaks.** _Something_ moves. 🎲\n<<<STATE>>>\n{"hp": 3}');
  assert.equal(t, "The door creaks. Something moves.");
});
test("DM voice: markdown headings, lists and links are stripped", () => {
  assert.equal(cleanForSpeech("# Title\n- one\n- two\n[the map](http://x)"), "Title one two the map");
});
test("DM voice: without ElevenLabs keys, narration falls back to the browser voice", () => {
  const v = narrate("The wind howls.", "en");
  assert.equal(v.fallback, true);
  assert.equal(v.reason, "not_configured");
});
