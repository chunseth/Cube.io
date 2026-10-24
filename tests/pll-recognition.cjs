const { test } = require("node:test");
const assert = require("node:assert/strict");
const Cube = require("../vendor/cubejs");
const cases = require("../content/cases.json");
const bank = require("../content/pll-recognition.json").cases;
const analysis = require("../content/pll-similarity.json").cases;
const {
  buildPllQuizzes,
  pllFeaturesFromState,
  pllVisiblePattern,
} = require("../.test-build/domain/pllRecognition");
const { recognitionAnswers } = require("../.test-build/domain/recognition");
const { caseSignature } = require("../.test-build/domain/lastLayer");
const {
  projectPllQuestion,
  pllQuestionSVG,
} = require("../.test-build/domain/cubeProjection");
const byId = new Map(cases.map((c) => [c.id, c]));
const aufs = ["", "U", "U2", "U'"];
const stripRankings = (quizzes) =>
  quizzes.map((q) => ({
    ...q,
    views: q.views.map(({ rankedCandidates, ...view }) => view),
  }));

test("all 21 PLLs have four angle-specific four-name quizzes and all 20 alternative PLLs are compared", () => {
  assert.equal(bank.length, 21);
  assert.deepEqual(buildPllQuizzes(cases), analysis);
  assert.deepEqual(stripRankings(analysis), bank);
  for (const q of bank) {
    assert.equal(q.views.length, 4);
    assert.deepEqual(
      q.views.map((v) => v.auf),
      aufs,
    );
    for (const v of q.views) {
      assert.equal(v.answerIds.length, 4);
      assert.equal(new Set(v.answerIds).size, 4);
      assert.equal(v.answerIds.filter((id) => id === q.caseId).length, 1);
      assert.ok(
        v.answerIds.every(
          (id) =>
            byId.get(id)?.type === "PLL" && byId.get(id).name.endsWith(" Perm"),
        ),
      );
      assert.ok(
        v.distractors.every(
          (d) => d.caseId !== q.caseId && d.score > 0 && d.reason,
        ),
      );
      assert.deepEqual(
        recognitionAnswers(byId.get(q.caseId), v.setup, "two-sided"),
        v.answerIds,
      );
      const rankings = analysis
        .find((q2) => q2.caseId === q.caseId)
        .views.find((v2) => v2.auf === v.auf).rankedCandidates;
      assert.equal(rankings.length, 20);
      assert.equal(new Set(rankings.map((r) => r.caseId)).size, 20);
      assert.ok(rankings.every((r) => r.caseId !== q.caseId));
      assert.ok(
        rankings.every((r, i) => i === 0 || r.score >= rankings[i - 1].score),
      );
    }
  }
});

function permutations(xs) {
  if (!xs.length) return [[]];
  return xs.flatMap((x, i) =>
    permutations(xs.filter((_, j) => i !== j)).map((rest) => [x, ...rest]),
  );
}
function parity(xs) {
  let n = 0;
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++) if (xs[i] > xs[j]) n++;
  return n % 2;
}
test("all 288 legal oriented last-layer permutations identify unambiguously from UFR, including AUF and color shifts", () => {
  const owners = new Map();
  for (const q of bank)
    for (const v of q.views) {
      const old = owners.get(v.visiblePattern);
      if (old) assert.equal(old, q.caseId);
      owners.set(v.visiblePattern, q.caseId);
    }
  assert.equal(owners.size, 71);
  const signatureToId = new Map(
    cases.filter((c) => c.type === "PLL").map((c) => [c.signature, c.id]),
  );
  const colored = new Set();
  let total = 0,
    nonSkip = 0,
    skips = 0;
  for (const corners of permutations([0, 1, 2, 3]))
    for (const edges of permutations([0, 1, 2, 3])) {
      if (parity(corners) !== parity(edges)) continue;
      total++;
      const cube = new Cube();
      cube.cp = [...corners, 4, 5, 6, 7];
      cube.ep = [...edges, 4, 5, 6, 7, 8, 9, 10, 11];
      const features = pllFeaturesFromState(cube.asString());
      if (aufs.some((u) => cube.clone().move(u).isSolved())) {
        skips++;
        assert.equal(owners.has(features.pattern), false);
        continue;
      }
      nonSkip++;
      colored.add(features.colors);
      const expected = signatureToId.get(caseSignature(cube, "PLL"));
      assert.ok(expected);
      assert.equal(owners.get(features.pattern), expected);
    }
  assert.equal(total, 288);
  assert.equal(skips, 4);
  assert.equal(nonSkip, 284);
  assert.equal(colored.size, 284);
});

test("every PLL setup reaches the correct quiz under every starting and final U alignment", () => {
  let checked = 0;
  for (const c of cases.filter((c) => c.type === "PLL"))
    for (const s of c.setups)
      for (const pre of aufs)
        for (const post of aufs) {
          const moves = [pre, s.moves, post].filter(Boolean).join(" ");
          const choices = recognitionAnswers(
            { ...c, answers: ["stale-authored-answer-set"] },
            moves,
            "two-sided",
          );
          assert.equal(choices.length, 4);
          assert.ok(choices.includes(c.id));
          const actual = pllVisiblePattern(moves);
          for (const id of choices.filter((id) => id !== c.id))
            assert.ok(
              bank
                .find((q) => q.caseId === id)
                .views.every((v) => v.visiblePattern !== actual),
            );
          checked++;
        }
  assert.ok(checked > 3000);
});

test("example confusion families occur where their actual two-face geometry is similar", () => {
  const pairs = [
    ["ra", "f"],
    ["f", "ra"],
    ["ga", "aa"],
    ["ga", "ab"],
    ["gd", "aa"],
    ["gd", "ab"],
    ["gb", "h"],
    ["gc", "h"],
    ["ua", "z"],
    ["ub", "z"],
  ];
  for (const [target, peer] of pairs) {
    assert.ok(
      bank
        .find((q) => q.caseId === "pll-" + target)
        .views.some((v) =>
          v.distractors.some((d) => d.caseId === "pll-" + peer),
        ),
      target + " / " + peer,
    );
  }
  // A full-bar F-perm view has J-perm lookalikes rather than an automatically forced Ra answer.
  const f = bank.find((q) => q.caseId === "pll-f");
  assert.ok(
    f.views.some((v) => v.distractors.some((d) => d.caseId === "pll-ra")),
  );
  assert.ok(
    f.views.some((v) => !v.distractors.some((d) => d.caseId === "pll-ra")),
  );
  for (const q of bank)
    for (const v of q.views)
      for (const d of v.distractors.filter(
        (d) => d.role === "confusion-anchor",
      )) {
        assert.equal(d.knownConfusion, true);
        assert.ok(d.equalPairDifferences <= 2);
        assert.ok(d.headlightDifferences <= 1);
        assert.equal(d.barDifferences, 0);
        assert.ok(d.blockDifferences <= 1);
      }
});

test("matching bars/headlights does not collapse H/Z or opposite U-perm directions", () => {
  const features = (id, u = "") =>
    pllFeaturesFromState(
      new Cube()
        .move(byId.get("pll-" + id).setup)
        .move(u)
        .asString(),
    );
  const h = features("h"),
    z = features("z", "U");
  assert.equal(h.equalityPattern, z.equalityPattern);
  assert.deepEqual(h.headlights, z.headlights);
  assert.deepEqual(h.bars, z.bars);
  assert.notEqual(h.pattern, z.pattern);
  assert.notDeepEqual(h.oppositeColorPairs, z.oppositeColorPairs);
  const ua = features("ua"),
    ub = features("ub");
  assert.equal(ua.equalityPattern, ub.equalityPattern);
  assert.notEqual(ua.pattern, ub.pattern);
});

test("PLL prompts render all upper colors, exactly UFR, and two null F2L surfaces", () => {
  const state = new Cube().move(byId.get("pll-ra").setup).asString(),
    question = projectPllQuestion(state);
  assert.equal(question.stickers.length, 15);
  assert.deepEqual(
    [...new Set(question.stickers.map((s) => s.face))].sort(),
    [0, 1, 2],
  );
  assert.ok(question.stickers.every((s) => s.face === 0 || s.id % 9 < 3));
  assert.deepEqual(
    question.surfaces.map((s) => s.face),
    [1, 2],
  );
  assert.ok(
    question.stickers
      .filter((s) => s.face === 0)
      .every((s) => s.color === "#ffda67"),
  );
  assert.ok(
    new Set(question.stickers.filter((s) => s.face !== 0).map((s) => s.color))
      .size >= 3,
  );
  const changed = [...state]
    .map((s, i) => (i >= 9 && i % 9 >= 3 ? "U" : s))
    .join("");
  assert.deepEqual(projectPllQuestion(changed), question);
  const svg = pllQuestionSVG(state);
  assert.equal((svg.match(/data-facelet=/g) || []).length, 15);
  assert.equal((svg.match(/data-null-f2l=/g) || []).length, 2);
});

test("full-view authored choices persist while two-sided PLLs reject invalid, skipped or mislabeled views", () => {
  const c = byId.get("pll-ra"),
    custom = { ...c, answers: ["my-authored-choice"] };
  assert.deepEqual(recognitionAnswers(custom, c.setup, "full"), custom.answers);
  assert.equal(recognitionAnswers(custom, c.setup, "two-sided").length, 4);
  assert.throws(
    () => recognitionAnswers(c, "", "two-sided"),
    /No verified PLL quiz/,
  );
  assert.throws(
    () => recognitionAnswers(c, "R", "two-sided"),
    /PLL recognition requires/,
  );
  assert.throws(
    () => recognitionAnswers(c, byId.get("pll-f").setup, "two-sided"),
    /No verified PLL quiz/,
  );
});
