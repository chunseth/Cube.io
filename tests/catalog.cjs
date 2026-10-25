const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Cube = require("../vendor/cubejs");
const cases = require("../content/cases.json");
const jp = require("../content/sources/jperm.json").cases;
const scdb = require("../content/sources/speedcubedb.json").cases;
const report = require("../content/verification.json");
const {
  AUFS,
  canonicalCube,
  normalizeMoves,
  normalizeSetup,
  f2lSolved,
  lastLayerOriented,
  caseSignature,
  verifySetup,
  algorithmWorks,
} = require("../.test-build/domain/lastLayer");
const {
  executionSetup,
  identifyCase,
  validateContent,
  recognitionReady,
} = require("../.test-build/domain/content");
const { mergeBundledCases } = require("../.test-build/domain/catalog");
const {
  caseFacelets,
  caseDiagramSVG,
} = require("../.test-build/domain/caseDiagram");

test("complete sourced catalog has stable unique identities and usable recognition choices", () => {
  assert.equal(cases.length, 78);
  assert.equal(cases.filter((c) => c.type === "OLL").length, 57);
  assert.equal(cases.filter((c) => c.type === "PLL").length, 21);
  assert.equal(new Set(cases.map((c) => c.signature)).size, 78);
  assert.equal(new Set(cases.map((c) => c.imageId)).size, 78);
  for (const c of cases) {
    assert.notEqual(c.family, "Unassigned");
    assert.equal(c.family, c.type === "PLL" ? c.name : c.family);
    assert.equal(c.sources.length, 2);
    assert.ok(c.algorithms.length > 0);
    assert.ok(recognitionReady(c, cases));
    assert.equal(c.answers.length, 4);
    assert.equal(new Set(c.answers).size, 4);
    assert.ok(
      c.answers.every((id) =>
        cases.some((other) => other.id === id && other.type === c.type),
      ),
    );
  }
});

test("every trainer scramble and published/derived setup preserves F2L and matches its label at every AUF", () => {
  let total = 0,
    trainer = 0;
  for (const c of cases) {
    assert.ok(verifySetup(c.setup, c.type, c.signature), c.id);
    for (const setup of c.setups) {
      assert.equal(setup.verification.caseId, c.id);
      assert.equal(setup.verification.signature, c.signature);
      assert.equal(setup.verification.f2l, true);
      for (const auf of AUFS) {
        const state = new Cube().move(setup.moves).move(auf);
        assert.ok(f2lSolved(state), `${c.id} ${setup.id}: F2L`);
        if (c.type === "PLL") assert.ok(lastLayerOriented(state));
        assert.equal(caseSignature(state, c.type), c.signature, setup.id);
      }
      total++;
      if (setup.kind === "trainer") trainer++;
    }
  }
  assert.equal(total, 4735);
  assert.equal(trainer, 4188);
  assert.equal(total, report.setups);
  assert.equal(
    trainer,
    jp.reduce((n, c) => n + c.scrambles.length, 0),
  );
  assert.deepEqual(report.rejected, []);
});

test("all solution algorithms solve their intended stage, including rotations, wide moves and slices", () => {
  for (const c of cases) {
    for (const algorithm of c.algorithms)
      assert.ok(
        algorithmWorks(c.setup, algorithm, c.type),
        `${c.id}: ${algorithm}`,
      );
    const bank = c.setups.filter((s) => s.kind === "trainer");
    for (const setup of [
      bank[0],
      bank[Math.floor(bank.length / 2)],
      bank.at(-1),
    ])
      assert.ok(
        algorithmWorks(setup.moves, c.algorithms[0], c.type),
        `${c.id}: trainer solution`,
      );
  }
  assert.equal(
    cases.reduce((n, c) => n + c.algorithms.length, 0),
    411,
  );
});

test("source diagram stickers independently confirm all 78 case labels", () => {
  const color = { U: "y", R: "o", F: "g", D: "w", L: "r", B: "b" };
  const indices = caseFacelets.map((p) => p.index);
  for (const c of cases) {
    const src = scdb.find(
      (s) =>
        s.type === c.type &&
        s.name ===
          (c.type === "OLL" ? "OLL " + c.number : c.name.replace(" Perm", "")),
    );
    const expectedFacelets =
      src.diagram.us +
      src.diagram.ur +
      src.diagram.uf +
      "wwwwwwwww" +
      src.diagram.ul +
      src.diagram.ub;
    const encode = (value) =>
      indices
        .map((i) =>
          c.type === "OLL" ? (value[i] === "y" ? "1" : "0") : value[i],
        )
        .join("");
    const expected = encode(expectedFacelets);
    const candidates = [];
    for (const pre of AUFS)
      for (const post of AUFS) {
        const state = new Cube()
          .move(pre)
          .multiply(canonicalCube(c.setup))
          .move(post)
          .asString();
        candidates.push(encode([...state].map((s) => color[s]).join("")));
      }
    assert.ok(
      candidates.includes(expected),
      c.id + " disagrees with the independent source diagram",
    );
  }
});

test("scramble identification distinguishes orientation cases, permutation cases, skips and invalid F2L", () => {
  assert.equal(
    identifyCase(
      "U L2 F2 R F' R2 F R D' R2 F2 L2 B2 U L2 U' B2 U' B2 U2 L2",
      "OLL",
    ).id,
    "oll-32",
  );
  assert.equal(
    identifyCase("U F B' L2 F B' U B2 U F2 B2 L2 U' F2 D R2 D' F2 L2", "PLL")
      .id,
    "pll-f",
  );
  assert.equal(identifyCase("R", "OLL"), null);
  assert.equal(identifyCase("bad moves", "PLL"), null);
  assert.equal(identifyCase("U", "PLL"), null);
  assert.equal(identifyCase("", "OLL"), null);
  for (const c of cases) assert.equal(identifyCase(c.setup, c.type).id, c.id);
});

test("training draws from alternative verified setups and avoids exact immediate repetition", () => {
  for (const c of [cases[0], cases[56], cases.find((c) => c.id === "pll-ga")]) {
    let previous = "";
    const seen = new Set();
    for (let n = 0; n < 24; n++) {
      const next = executionSetup(c, previous);
      assert.notEqual(next, previous);
      assert.ok(verifySetup(next, c.type, c.signature));
      seen.add(next);
      previous = next;
    }
    assert.ok(seen.size > 4);
  }
  assert.throws(
    () => executionSetup({ ...cases[0], setup: "R", setups: [] }),
    /verified setup/,
  );
});

test("content import rejects mislabeled or destructive setups and forged verification data", () => {
  const edit = (change) => ({
    version: 1,
    cases: cases.map((c, i) => (i === 0 ? { ...c, ...change } : c)),
  });
  assert.throws(
    () => validateContent(edit({ setup: "R" }), cases),
    /preserve F2L/,
  );
  assert.throws(
    () => validateContent(edit({ setup: cases[1].setup }), cases),
    /produce this OLL/,
  );
  assert.throws(
    () => validateContent(edit({ algorithms: ["R"] }), cases),
    /algorithm does not solve/,
  );
  assert.throws(
    () =>
      validateContent(
        edit({ setups: [{ ...cases[0].setups[0], moves: cases[1].setup }] }),
        cases,
      ),
    /mislabeled alternative/,
  );
  const changed = validateContent(
    edit({
      signature: "fake",
      imageId: "fake",
      setups: [
        {
          ...cases[0].setups[0],
          verification: { f2l: false, caseId: "fake", signature: "fake" },
        },
      ],
    }),
    cases,
  )[0];
  assert.equal(changed.signature, cases[0].signature);
  assert.equal(changed.imageId, cases[0].imageId);
  assert.deepEqual(
    changed.setups[0].verification,
    cases[0].setups[0].verification,
  );
  assert.equal(validateContent({ version: 1, cases }, cases).length, 78);
});

test("existing installs receive content while preserving authored cases and all user metadata", () => {
  const old = cases.map((c) => ({
    id: c.id,
    type: c.type,
    number: c.number,
    name: c.name,
    family: c.type === "OLL" ? "Unassigned" : "PLL",
    twoLook: c.twoLook,
    algorithms: [],
    setup: "",
    answers: [],
  }));
  old[0] = {
    ...old[0],
    name: "My first case",
    family: "My shapes",
    setup: cases[0].setups[1].moves,
    algorithms: [cases[0].algorithms.at(-1)],
    answers: cases[0].answers,
  };
  const merged = mergeBundledCases(old);
  assert.equal(merged[0].name, "My first case");
  assert.equal(merged[0].family, "My shapes");
  assert.equal(merged[0].setup, old[0].setup);
  assert.equal(merged[1].family, cases[1].family);
  assert.ok(
    merged.every((c) => c.setup && c.algorithms.length && c.setups.length),
  );
  assert.deepEqual(mergeBundledCases(merged), merged);
});

test("78 vector diagrams expose exactly 21 unique stickers with correct unfolded side ordering", () => {
  assert.equal(new Set(caseFacelets.map((s) => s.index)).size, 21);
  assert.deepEqual(
    caseFacelets.slice(9).map((s) => s.index),
    [47, 46, 45, 36, 37, 38, 11, 10, 9, 18, 19, 20],
  );
  for (const c of cases) {
    const file = path.join(__dirname, "../content/images", c.imageId + ".svg");
    const expected = caseDiagramSVG(
      canonicalCube(c.setup).asString(),
      c.type === "OLL",
      c.imageId,
    );
    assert.equal(fs.readFileSync(file, "utf8").trim(), expected);
    assert.equal((expected.match(/data-facelet=/g) || []).length, 21);
    assert.equal(expected.includes("<text"), false);
  }
});

test("published notation is normalized without dropping unsupported syntax", () => {
  assert.equal(normalizeMoves("(Rw U2') R3 R3' r’"), "r U2 R' R r'");
  assert.throws(() => normalizeMoves("R Q"), /Unsupported move/);
  assert.ok(
    f2lSolved(
      new Cube().move(
        normalizeSetup(
          scdb.find((c) => c.type === "PLL" && c.name === "Aa").setup,
        ),
      ),
    ),
  );
});
