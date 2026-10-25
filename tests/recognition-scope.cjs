const { test } = require("node:test");
const assert = require("node:assert/strict");
const cases = require("../content/cases.json");
const {
  recognitionCases,
  recognitionAnswers,
} = require("../.test-build/domain/recognition");
const { executionSetup } = require("../.test-build/domain/content");

test("daily OLL questions stay in the daily family and use verified two-sided choices", () => {
  for (const item of cases.filter((c) => c.type === "OLL")) {
    const family = recognitionCases(cases, [], item, "family");
    assert.ok(family.length);
    assert.ok(
      family.every((c) => c.type === "OLL" && c.family === item.family),
    );
    for (const c of family) {
      assert.ok(
        recognitionAnswers(c, executionSetup(c), "two-sided").includes(c.id),
      );
    }
  }
});

test("daily PLL questions include only the selected case even with every case learned", () => {
  for (const item of cases.filter((c) => c.type === "PLL")) {
    assert.deepEqual(
      recognitionCases(
        cases,
        cases.map((c) => c.id),
        item,
        "single",
      ),
      [item],
    );
    assert.ok(
      recognitionAnswers(item, executionSetup(item), "two-sided").includes(
        item.id,
      ),
    );
  }
});

test("easy and hard question decks include all learned cases of the requested type", () => {
  for (const type of ["OLL", "PLL"]) {
    const group = cases.filter((c) => c.type === type);
    const learned = [
      group[0].id,
      group[2].id,
      cases.find((c) => c.type !== type).id,
    ];
    assert.deepEqual(
      recognitionCases(cases, learned, group[0], "type").map((c) => c.id),
      [group[0].id, group[2].id],
    );
    assert.deepEqual(recognitionCases(cases, [], group[0], "type"), []);
  }
});
