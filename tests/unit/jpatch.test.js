import { test } from "node:test";
import assert from "node:assert/strict";
import { diff, apply } from "../../shared/jpatch.js";

test("co-op sync: a diff applied to the old state gives the new state", () => {
  const a = { hp: 10, party: [{ name: "Joe", xp: 100 }], log: ["Hello"] };
  const b = { hp: 7, party: [{ name: "Joe", xp: 150 }, { name: "Mira", xp: 0 }], log: ["Hello", "A goblin attacks!"], combat: { round: 1 } };
  const out = apply(structuredClone(a), diff(a, b));
  assert.deepEqual(out, b);
});
test("co-op sync: no changes means no operations", () => {
  const a = { x: 1, y: [1, 2, { z: 3 }] };
  assert.equal(diff(a, structuredClone(a)).length, 0);
});
