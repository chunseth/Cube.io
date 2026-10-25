const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const Cube = require("../vendor/cubejs");
const { getInitial3x3Scramble, prepareScrambleService, generate3x3Scramble } =
  require("../scripts/load-domain.cjs")("scrambles/scrambleService");

test("the first scramble is usable before any solver tables are built", () => {
  const scramble = getInitial3x3Scramble();
  assert.equal(scramble.split(/\s+/).length, 20);
  assert.equal(new Cube().move(scramble).isSolved(), false);
  assert.equal(Cube.moveTables.twist, null);
  assert.equal(Cube.pruningTables.sliceTwist, null);
});

test("cold solver preparation yields, shares concurrent requests, and preserves every table", async () => {
  let ticks = 0;
  const heartbeat = setInterval(() => ticks++, 0);
  try {
    const pending = prepareScrambleService();
    assert.equal(prepareScrambleService(), pending);
    assert.equal(Cube.moveTables.twist, null, "no work in the startup call");
    await pending;
    assert.ok(ticks > 2, "rendering and input can run during preparation");
  } finally {
    clearInterval(heartbeat);
  }

  // Fingerprints captured from the original synchronous solver. This checks
  // every entry, including phase-2 collision markers and packed pruning depths.
  const expected = {
    moveTables: {
      parity:
        "eb9035628387720bdcd1abd4a0045cfbaa8e69269bab8b3f3df5d48448a9b905",
      twist: "de6c4f7f3cd7c963724e21c37a35d26d9de0e4cd84ad0bdd96abf86ab9d65255",
      flip: "3faf5e31eda0efdcc41c07874c165aa8f2e462ddec889082d8b94c4b41d32466",
      FRtoBR:
        "3350088c2a7c22cc1c42b593f8a29fe2f6c104aa4d35e8917a5e753547ac8e3d",
      URFtoDLF:
        "0f354b63f445c2fe84afe5a50302f5a07fdb635247fe343f436ae1a7ab779b8e",
      URtoDF:
        "af7cd38152c3794bdbabf36e07632fa270eea390d9f13f0de581f53ff6385ba0",
      URtoUL:
        "c716685643b1547e2904bbfec65518fea7f7d0562e4d58e05c00d789d11e9a67",
      UBtoDF:
        "c716685643b1547e2904bbfec65518fea7f7d0562e4d58e05c00d789d11e9a67",
      mergeURtoDF:
        "e1abb81c4375fa9ac79fad12ba9fe69ed8c7c0064a960fb556fdf7f0d1ee246b",
    },
    pruningTables: {
      sliceTwist:
        "680e4b3aea8924184a30003081103d10dde4abfcb7af62081e6d9a28a50206fd",
      sliceFlip:
        "22cb8741cc6e46596faa175e1ebd92ebac1cc5f1ccd2ea45b7a7f216e025609f",
      sliceURFtoDLFParity:
        "c83bb08ebda99d375bf54c0832df8099694d89e2ac885bd9ff846ed4dc0da47c",
      sliceURtoDFParity:
        "8354f5a194cd4114822ae8c126b24b377f2c4df2e7283289d50c6b39534650cf",
    },
  };
  for (const [group, tables] of Object.entries(expected)) {
    for (const [name, hash] of Object.entries(tables)) {
      const actual = createHash("sha256")
        .update(JSON.stringify(Cube[group][name]))
        .digest("hex");
      assert.equal(actual, hash, `${group}.${name}`);
    }
  }
});

test("runtime scrambles remain legal and non-solved", async () => {
  for (let i = 0; i < 100; i++) {
    const scramble = generate3x3Scramble();
    assert.match(scramble, /^[URFDLB2' ]+$/);
    const cube = new Cube().move(scramble);
    assert.equal(cube.isSolved(), false);
  }
});

test("runtime scrambles avoid repeating a move axis", () => {
  const axes = { U: "y", D: "y", R: "x", L: "x", F: "z", B: "z" };
  const moves = generate3x3Scramble().split(" ");
  for (let i = 1; i < moves.length; i++)
    assert.notEqual(axes[moves[i][0]], axes[moves[i - 1][0]]);
});
