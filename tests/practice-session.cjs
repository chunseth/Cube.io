const { test } = require("node:test");
const assert = require("node:assert/strict");
const { knownPracticeSetup, identifyCase } =
  require("../scripts/load-domain.cjs")("content");
const cases = require("../content/cases.json");

test("practice sessions draw only from learned cases of the matching type", () => {
  for (const [type, learned] of [
    ["OLL", ["oll-01", "oll-21"]],
    ["PLL", ["pll-aa", "pll-f"]],
  ]) {
    let previous = "";
    for (let i = 0; i < 20; i++) {
      const scramble = knownPracticeSetup(cases, learned, type, previous);
      const item = identifyCase(scramble, type);
      assert.ok(item);
      assert.ok(learned.includes(item.id));
      assert.notEqual(scramble, previous);
      previous = scramble;
    }
  }
});

test("practice sessions do not create a scramble without learned cases", () => {
  assert.equal(knownPracticeSetup(cases, [], "OLL"), null);
  assert.equal(knownPracticeSetup(cases, [], "PLL"), null);
});
