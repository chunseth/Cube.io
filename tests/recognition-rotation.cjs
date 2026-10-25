const { test } = require("node:test");
const assert = require("node:assert/strict");
const Cube = require("../vendor/cubejs");
const {
  projectRecognitionCube,
} = require("../.test-build/domain/cubeProjection");

test("four-sided recognition shows U and two adjacent sides at every quarter-turn", () => {
  const state = new Cube().move("R U R' U R U2 R'").asString();
  const seen = new Set();
  for (const yaw of [45, 135, 225, 315]) {
    for (const oll of [true, false]) {
      const stickers = projectRecognitionCube(state, yaw, oll);
      const faces = new Set(stickers.map((s) => s.face));
      assert.equal(faces.size, 3);
      assert.ok(faces.has(0));
      assert.ok(!faces.has(3));
      for (const s of stickers) {
        if (s.face !== 0) seen.add(s.face);
        const hidden = s.face !== 0 && s.id % 9 >= 3;
        assert.equal(
          s.displayColor,
          hidden || (oll && s.color !== "U") ? "null" : s.color,
        );
        assert.ok(!s.points.includes("NaN"));
      }
    }
  }
  assert.deepEqual([...seen].sort(), [1, 2, 4, 5]);
});

const {
  ollQuestionSVG,
  pllQuestionSVG,
  projectOllQuestion,
  projectPllQuestion,
} = require("../.test-build/domain/cubeProjection");

test("two-sided OLL and PLL show twelve outlined F2L cubies without exposing their colors", () => {
  const state = new Cube().move("R U R' U R U2 R'").asString();
  for (const [project, render] of [
    [projectOllQuestion, ollQuestionSVG],
    [projectPllQuestion, pllQuestionSVG],
  ]) {
    const question = project(state);
    assert.equal(question.f2l.length, 12);
    assert.equal(new Set(question.f2l.map((s) => s.id)).size, 12);
    for (const cubie of question.f2l) {
      assert.ok([1, 2].includes(cubie.face));
      assert.ok(cubie.id % 9 >= 3);
      assert.ok(!("color" in cubie));
      assert.equal(cubie.points.split(" ").length, 4);
    }
    const changed = [...state];
    for (const cubie of question.f2l) changed[cubie.id] = "B";
    assert.equal(render(changed.join("")), render(state));
    const svg = render(state);
    assert.equal((svg.match(/data-f2l-cubie=/g) || []).length, 12);
    assert.equal((svg.match(/data-facelet=/g) || []).length, 15);
  }
});
