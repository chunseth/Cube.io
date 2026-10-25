const { test } = require("node:test");
const assert = require("node:assert/strict");
const Cube = require("../vendor/cubejs");
const {
  solvedStickers,
  parseTurns,
  turnStickers,
  animationRig,
} = require("../.test-build/domain/algorithmAnimation");
const faceIndex = (p, n) => {
  const [x, y, z] = p.map(Math.round);
  const [nx, ny, nz] = n.map(Math.round);
  if (ny === 1) return (z + 1) * 3 + x + 1;
  if (nx === 1) return 9 + (1 - y) * 3 + 1 - z;
  if (nz === 1) return 18 + (1 - y) * 3 + x + 1;
  if (ny === -1) return 27 + (1 - z) * 3 + x + 1;
  if (nx === -1) return 36 + (1 - y) * 3 + z + 1;
  return 45 + (1 - y) * 3 + 1 - x;
};
test("every supported turn transports yellow-layer stickers exactly like cubejs", () => {
  for (const move of "U R F D L B M E S x y z u r f d l b".split(" ")) {
    for (const suffix of ["", "'", "2"]) {
      const token = move + suffix;
      const stickers = turnStickers(
        solvedStickers("PLL"),
        parseTurns(token)[0],
      );
      const state = new Cube().move(token).asString();
      for (const s of stickers) {
        const normal = s.corners.reduce(
          (a, p) => a.map((v, i) => v + p[i] / 4),
          [0, 0, 0],
        );
        // Normal axis is the only mean coordinate with absolute value one.
        const n = normal.map((v) =>
          Math.abs(Math.abs(v) - 1) < 1e-6 ? Math.sign(v) : 0,
        );
        assert.equal(
          state[faceIndex(s.center, n)],
          s.color,
          token + " sticker " + s.id,
        );
      }
    }
  }
});
test("inverse setups replay to solved geometry with the requested masks", () => {
  for (const type of ["OLL", "PLL"]) {
    const rig = animationRig("(R U R' U') Fw2 M' x y2 z'", type);
    assert.equal(rig.frames[0].length, 54);
    assert.equal(
      rig.frames[0].filter((s) => !s.muted).length,
      type === "OLL" ? 9 : 21,
    );
    assert.equal(
      rig.frames[0].filter((s) => s.muted).length,
      type === "OLL" ? 45 : 33,
    );
    let expected = solvedStickers(type);
    const orientation = Cube.inverse(
      new Cube().move("R U R' U' f2 M' x y2 z'").upright(),
    );
    if (orientation)
      for (const turn of parseTurns(orientation))
        expected = turnStickers(expected, turn);
    rig.frames.at(-1).forEach((s, i) => {
      s.corners
        .flat()
        .forEach((v, j) =>
          assert.ok(Math.abs(v - expected[i].corners.flat()[j]) < 1e-8),
        );
    });
  }
});

function stickerState(stickers) {
  const state = Array(54);
  for (const s of stickers) {
    const normal = s.corners.reduce(
      (a, p) => a.map((v, i) => v + p[i] / 4),
      [0, 0, 0],
    );
    const n = normal.map((v) =>
      Math.abs(Math.abs(v) - 1) < 1e-6 ? Math.sign(v) : 0,
    );
    state[faceIndex(s.center, n)] = s.color;
  }
  return state.join("");
}
test("all catalog animations begin with canonical centers and their intended last-layer case", () => {
  const {
    caseSignature,
    normalizeMoves,
  } = require("../.test-build/domain/lastLayer");
  const cases = require("../content/cases.json");
  let rotations = 0;
  for (const c of cases)
    for (const algorithm of c.algorithms) {
      const rig = animationRig(algorithm, c.type);
      const start = stickerState(rig.frames[0]);
      const cube = Cube.fromString(start);
      const label = c.id + ": " + algorithm;
      assert.deepEqual(cube.center, [0, 1, 2, 3, 4, 5], label);
      assert.equal(caseSignature(cube, c.type), c.signature, label);
      if (c.type === "PLL") {
        assert.equal(start.slice(0, 9), "UUUUUUUUU", label);
        for (const s of rig.frames[0])
          assert.equal(s.muted, Math.round(s.center[1]) !== 1, label);
      }
      const execution = cube.clone();
      for (let i = 0; i < rig.turns.length; i++) {
        execution.move(rig.turns[i].token);
        assert.equal(
          stickerState(rig.frames[i + 1]),
          execution.asString(),
          label + " move " + i,
        );
      }
      assert.ok(execution.isSolved(), label);
      if (/[xz]/.test(normalizeMoves(algorithm))) rotations++;
    }
  assert.ok(rotations > 0);
});

test("unrestored x and z rotations preserve a valid PLL starting state", () => {
  const { caseSignature } = require("../.test-build/domain/lastLayer");
  const c = require("../content/cases.json").find((c) => c.id === "pll-t");
  for (const rotation of ["x", "x'", "x2", "z", "z'", "z2", "x z'", "z x'"]) {
    const rig = animationRig(c.algorithms[0] + " " + rotation, "PLL");
    const state = stickerState(rig.frames[0]);
    assert.equal(state.slice(0, 9), "UUUUUUUUU", rotation);
    assert.equal(
      caseSignature(Cube.fromString(state), "PLL"),
      c.signature,
      rotation,
    );
    assert.ok(
      Cube.fromString(stickerState(rig.frames.at(-1))).isSolved(),
      rotation,
    );
  }
});

test("presentation return undoes net x rotations without adding algorithm moves", () => {
  for (const [algorithm, count] of [
    ["R U x", 1],
    ["R U x'", 1],
    ["x2", 1],
    ["x R x'", 0],
    ["R U", 0],
    ["z", 0],
  ]) {
    const rig = animationRig(algorithm, "PLL");
    assert.deepEqual(
      rig.turns.map((t) => t.token),
      algorithm.split(" "),
    );
    assert.equal(rig.returnTurns.length, count);
    assert.ok(rig.returnTurns.every((t) => t.token === ""));
    if (count) {
      const netAngle = rig.turns
        .filter((t) => t.token[0] === "x")
        .reduce((sum, t) => sum + t.angle, 0);
      const expected = turnStickers(rig.frames.at(-1), {
        axis: 0,
        layers: [-1, 0, 1],
        angle: -netAngle,
      });
      rig.returnFrames
        .at(-1)
        .forEach((s, i) =>
          s.corners
            .flat()
            .forEach((v, j) =>
              assert.ok(Math.abs(v - expected[i].corners.flat()[j]) < 1e-8),
            ),
        );
    }
  }
});
