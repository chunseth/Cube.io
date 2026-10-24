const { test } = require("node:test");
const assert = require("node:assert/strict");
const Cube = require("../vendor/cubejs");
const cases = require("../content/cases.json");
const quizzes = require("../content/oll-recognition.json").cases;
const {
  buildOllQuizzes,
  ollFeatures,
  ollVisibleMask,
} = require("../.test-build/domain/ollRecognition");
const { recognitionAnswers } = require("../.test-build/domain/recognition");
const {
  projectOllQuestion,
  ollQuestionSVG,
} = require("../.test-build/domain/cubeProjection");
const byId = new Map(cases.map((c) => [c.id, c]));
const aufs = ["", "U", "U2", "U'"];
const visibleIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 9, 10, 11];

test("all 57 OLL cases have four angle-specific quizzes, each with one correct and three distinct wrong visual IDs", () => {
  assert.equal(quizzes.length, 57);
  assert.deepEqual(buildOllQuizzes(cases), quizzes);
  for (const q of quizzes) {
    assert.equal(q.views.length, 4);
    assert.deepEqual(
      q.views.map((v) => v.auf),
      aufs,
    );
    for (const v of q.views) {
      assert.equal(v.answerIds.length, 4);
      assert.equal(new Set(v.answerIds).size, 4);
      assert.equal(v.answerIds.filter((id) => id === q.caseId).length, 1);
      assert.equal(v.distractors.length, 3);
      assert.ok(
        v.answerIds.every(
          (id) => byId.get(id)?.type === "OLL" && byId.get(id).imageId,
        ),
      );
      assert.ok(
        v.distractors.every(
          (d) => d.caseId !== q.caseId && d.visibleDifferences > 0 && d.reason,
        ),
      );
      assert.deepEqual(
        recognitionAnswers(byId.get(q.caseId), v.setup, "two-sided"),
        v.answerIds,
      );
    }
  }
});

test("UFR questions exhaust all 215 legal non-skip orientations without a cross-case ambiguity", () => {
  const owners = new Map();
  for (const q of quizzes)
    for (const v of q.views) {
      const previous = owners.get(v.visibleMask);
      if (previous) assert.equal(previous, q.caseId);
      owners.set(v.visibleMask, q.caseId);
    }
  assert.equal(owners.size, 215);
  let legal = 0;
  for (let a = 0; a < 3; a++)
    for (let b = 0; b < 3; b++)
      for (let c = 0; c < 3; c++)
        for (let x = 0; x < 2; x++)
          for (let y = 0; y < 2; y++)
            for (let z = 0; z < 2; z++) {
              const cube = new Cube();
              cube.co = [a, b, c, (6 - a - b - c) % 3, 0, 0, 0, 0];
              cube.eo = [x, y, z, (x + y + z) % 2, 0, 0, 0, 0, 0, 0, 0, 0];
              const state = cube.asString();
              const key = visibleIndices
                .map((i) => (state[i] === "U" ? "1" : "0"))
                .join("");
              const skip =
                cube.co.every((o) => o === 0) && cube.eo.every((o) => o === 0);
              assert.equal(owners.has(key), !skip);
              legal++;
            }
  assert.equal(legal, 216);
});

test("dot distractors respect actual corner counts instead of inventing a third zero-corner dot case", () => {
  for (const id of ["oll-01", "oll-02"])
    for (const v of quizzes.find((q) => q.caseId === id).views)
      assert.deepEqual([...v.answerIds].sort(), [
        "oll-01",
        "oll-02",
        "oll-03",
        "oll-04",
      ]);
  for (const id of ["oll-17", "oll-18", "oll-19"])
    for (const v of quizzes.find((q) => q.caseId === id).views) {
      assert.ok(
        ["oll-17", "oll-18", "oll-19"].every((peer) =>
          v.answerIds.includes(peer),
        ),
      );
      assert.ok(
        v.answerIds.some((peer) => peer === "oll-03" || peer === "oll-04"),
      );
    }
  for (const v of quizzes.find((q) => q.caseId === "oll-20").views)
    assert.deepEqual([...v.answerIds].sort(), [
      "oll-17",
      "oll-18",
      "oll-19",
      "oll-20",
    ]);
});

test("all distractors preserve edge shape, prioritize same-count peers and include a nearby corner-count contrast", () => {
  for (const q of quizzes) {
    const peers = quizzes.filter(
      (other) =>
        other.caseId !== q.caseId &&
        other.features.edgeShape === q.features.edgeShape,
    );
    const same = peers.filter(
      (other) => other.features.orientedCorners === q.features.orientedCorners,
    );
    for (const v of q.views) {
      const distractors = v.distractors.map((d) =>
        quizzes.find((other) => other.caseId === d.caseId),
      );
      assert.ok(
        distractors.every((d) => d.features.edgeShape === q.features.edgeShape),
        q.caseId,
      );
      assert.equal(
        distractors.filter(
          (d) => d.features.orientedCorners === q.features.orientedCorners,
        ).length,
        Math.min(2, same.length),
        q.caseId,
      );
      const gap = (other) =>
        Math.abs(other.features.orientedCorners - q.features.orientedCorners);
      const nearestDifferent = Math.min(
        ...peers.filter((p) => gap(p) > 0).map(gap),
      );
      assert.ok(
        distractors.some((d) => gap(d) === nearestDifferent),
        q.caseId,
      );
      for (const d of distractors)
        assert.ok(gap(d) === 0 || gap(d) === nearestDifferent, q.caseId);
    }
  }
});

test("every verified OLL scramble selects the correct view-specific quiz at all U alignments", () => {
  let checked = 0;
  for (const c of cases.filter((c) => c.type === "OLL"))
    for (const setup of c.setups)
      for (const auf of aufs) {
        const moves = setup.moves + " " + auf;
        const answers = recognitionAnswers(
          { ...c, answers: ["obsolete-author-choices"] },
          moves,
          "two-sided",
        );
        assert.equal(answers.length, 4);
        assert.ok(answers.includes(c.id));
        const actual = ollVisibleMask(moves);
        for (const id of answers.filter((id) => id !== c.id))
          assert.ok(
            quizzes
              .find((q) => q.caseId === id)
              .views.every((v) => v.visibleMask !== actual),
          );
        checked++;
      }
  assert.ok(checked > 16000);
});

test("question projection exposes UFR last-layer stickers and leaves F2L null even if hidden colors change", () => {
  const state = new Cube().move(cases[0].setup).asString();
  const question = projectOllQuestion(state);
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
  const changed = [...state]
    .map((s, i) => (i >= 9 && i % 9 >= 3 ? "U" : s))
    .join("");
  assert.deepEqual(projectOllQuestion(changed), question);
  const svg = ollQuestionSVG(state);
  assert.equal((svg.match(/data-facelet=/g) || []).length, 15);
  assert.equal((svg.match(/data-null-f2l=/g) || []).length, 2);
});

test("full-view choices retain their authored mappings and an invalid OLL view cannot silently produce a quiz", () => {
  const pll = cases.find((c) => c.id === "pll-t");
  assert.deepEqual(recognitionAnswers(pll, pll.setup, "full"), pll.answers);
  assert.deepEqual(
    recognitionAnswers(cases[0], cases[0].setup, "full"),
    cases[0].answers,
  );
  assert.throws(
    () => recognitionAnswers(cases[0], "", "two-sided"),
    /No verified OLL quiz/,
  );
  assert.equal(ollFeatures(cases[0].setup).orientedCorners, 0);
});
