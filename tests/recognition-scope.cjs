const { test } = require("node:test");
const assert = require("node:assert/strict");
const cases = require("../content/cases.json");
const {
  recognitionCases,
  recognitionAnswers,
} = require("../.test-build/domain/recognition");
const { executionSetup } = require("../.test-build/domain/content");

test("family recognition stays in the selected OLL family and uses verified two-sided choices", () => {
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

test("single-case recognition includes only the selected case even with every case learned", () => {
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

test("every daily OLL and PLL includes its lookalikes as question cases, including unlearned peers", () => {
  const banks = [
    ...require("../content/oll-recognition.json").cases,
    ...require("../content/pll-recognition.json").cases,
  ];
  for (const item of cases) {
    const pool = recognitionCases(cases, [], item, "similar");
    assert.ok(pool.length >= 4, item.id);
    assert.ok(
      pool.some((c) => c.id === item.id),
      item.id,
    );
    assert.ok(
      pool.every((c) => c.type === item.type),
      item.id,
    );
    assert.equal(new Set(pool.map((c) => c.id)).size, pool.length);
    const expected = new Set(
      banks.find((q) => q.caseId === item.id).views.flatMap((v) => v.answerIds),
    );
    assert.deepEqual(new Set(pool.map((c) => c.id)), expected, item.id);
    assert.deepEqual(
      recognitionCases(
        cases,
        cases.map((c) => c.id),
        item,
        "similar",
      ),
      pool,
      "Learning a peer must not change the daily question pool",
    );
    for (const c of pool)
      assert.ok(
        recognitionAnswers(c, executionSetup(c), "two-sided").includes(c.id),
        `${item.id}: ${c.id} must work as the correct answer`,
      );
  }
});

test("daily groups preserve useful dot OLL and PLL lookalike comparisons", () => {
  const ids = (id) =>
    recognitionCases(
      cases,
      [],
      cases.find((c) => c.id === id),
      "similar",
    )
      .map((c) => c.id)
      .sort();
  assert.deepEqual(ids("oll-01"), ["oll-01", "oll-02", "oll-03", "oll-04"]);
  assert.deepEqual(ids("oll-20"), ["oll-17", "oll-18", "oll-19", "oll-20"]);
  assert.ok(ids("pll-ua").includes("pll-ub"));
  assert.ok(ids("pll-ua").includes("pll-z"));
  assert.ok(ids("pll-ra").includes("pll-f"));
});

test("daily pools exclude missing and unready peers without adding unrelated cases", () => {
  const item = cases.find((c) => c.id === "pll-h");
  const filtered = cases
    .filter((c) => c.id !== "pll-gb")
    .map((c) => (c.id === "pll-z" ? { ...c, setup: "" } : c));
  const pool = recognitionCases(filtered, [], item, "similar");
  assert.deepEqual(
    pool.map((c) => c.id),
    ["pll-ua"],
  );
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
