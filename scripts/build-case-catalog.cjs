const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const Cube = require("../vendor/cubejs");
const {
  normalizeMoves,
  normalizeSetup,
  canonicalCube,
  caseSignature,
  algorithmWorks,
} = require("./load-domain.cjs")("lastLayer");
const root = path.join(__dirname, "..");
const original = require("../content/cases.json");
const jpermDocument = require("../content/sources/jperm.json");
const jperm = jpermDocument.cases;
const scdb = require("../content/sources/speedcubedb.json").cases;
const rejected = [];
const { buildOllQuizzes } = require("./load-domain.cjs")("ollRecognition");
const { buildPllQuizzes } = require("./load-domain.cjs")("pllRecognition");
const catalog = original.map((base) => {
  const jp = jperm.find(
    (c) =>
      c.type === base.type &&
      String(c.name).toLowerCase() ===
        (base.type === "OLL" ? String(base.number) : base.id.slice(4)),
  );
  const sc = scdb.find(
    (c) =>
      c.type === base.type &&
      c.name === (base.type === "OLL" ? "OLL " : "") + jp.name,
  );
  const jpUrl = `https://jperm.net/algs/${base.type.toLowerCase()}`;
  const scUrl = `https://speedcubedb.com/a/3x3/${base.type}/${encodeURIComponent(sc.name.replace(/ /g, "_"))}`;
  const reference = Cube.inverse(normalizeSetup(jp.algorithms[0]));
  const signature = caseSignature(canonicalCube(reference), base.type);
  const setup = normalizeSetup(sc.setup);
  if (caseSignature(canonicalCube(setup), base.type) !== signature)
    throw new Error(base.id + ": source disagreement");
  const algorithms = [],
    algorithmSources = [],
    setups = [];
  const addSetup = (moves, source, kind, url, derivedFrom) => {
    try {
      const normalized = normalizeSetup(moves);
      const actual = caseSignature(canonicalCube(normalized), base.type);
      if (actual !== signature)
        throw new Error(`Expected ${signature}; got ${actual}`);
      if (
        setups.some(
          (s) =>
            s.moves === normalized && s.source === source && s.kind === kind,
        )
      )
        return;
      const id =
        base.id +
        "-" +
        crypto
          .createHash("sha256")
          .update([source, kind, normalized].join(":"))
          .digest("hex")
          .slice(0, 12);
      setups.push({
        id,
        moves: normalized,
        ...(normalized !== moves ? { original: moves } : {}),
        source,
        url,
        kind,
        ...(derivedFrom ? { derivedFrom } : {}),
        verification: { f2l: true, caseId: base.id, signature },
      });
    } catch (e) {
      rejected.push({
        caseId: base.id,
        source,
        kind,
        moves,
        reason: e.message,
      });
    }
  };
  addSetup(sc.setup, "speedcubedb", "published", scUrl);
  for (const moves of jp.scrambles) addSetup(moves, "jperm", "trainer", jpUrl);
  for (const [source, entries, url] of [
    ["jperm", jp.algorithms, jpUrl],
    ["speedcubedb", sc.algorithms, scUrl],
  ]) {
    for (const raw of entries) {
      try {
        const moves = normalizeMoves(raw);
        if (!algorithmWorks(setup, moves, base.type))
          throw new Error(
            "Algorithm does not solve the claimed stage from this case under any U alignment.",
          );
        if (!algorithms.includes(moves)) algorithms.push(moves);
        algorithmSources.push({ moves, original: raw, source, url });
        addSetup(
          Cube.inverse(normalizeSetup(moves)),
          source,
          "inverse",
          url,
          moves,
        );
      } catch (e) {
        rejected.push({
          caseId: base.id,
          source,
          kind: "algorithm",
          moves: raw,
          reason: e.message,
        });
      }
    }
  }
  if (!algorithms.length || !setups.some((s) => s.kind === "trainer"))
    throw new Error("Incomplete case " + base.id);
  return {
    id: base.id,
    type: base.type,
    number: base.number,
    name: base.type === "OLL" ? `OLL ${base.number}` : `${jp.name} Perm`,
    family: base.type === "OLL" ? jp.group : `${jp.name} Perm`,
    twoLook: base.twoLook,
    algorithms,
    setup,
    answers: [],
    imageId: `cubeio-${base.id}-v1`,
    signature,
    sources: [
      { name: "J Perm", url: jpUrl },
      { name: "SpeedCubeDB", url: scUrl },
    ],
    algorithmSources,
    setups,
  };
});
if (new Set(catalog.map((c) => c.signature)).size !== 78)
  throw new Error("Case signatures are not unique.");
// Same-shape distractors first, then the nearest orientation/permutation patterns.
for (const c of catalog) {
  const nearest = catalog
    .filter((x) => x.type === c.type && x.id !== c.id)
    .sort((a, b) => {
      const distance = (x) =>
        (x.family === c.family ? 0 : 20) +
        [...x.signature].reduce(
          (n, char, i) => n + (char !== c.signature[i] ? 1 : 0),
          0,
        );
      return distance(a) - distance(b) || a.number - b.number;
    });
  c.answers = [c.id, ...nearest.slice(0, 3).map((x) => x.id)];
}
const ollQuizzes = buildOllQuizzes(catalog);
for (const quiz of ollQuizzes)
  catalog.find((c) => c.id === quiz.caseId).answers = quiz.views[0].answerIds;
fs.writeFileSync(
  path.join(root, "content/oll-recognition.json"),
  JSON.stringify({ version: 1, cases: ollQuizzes }, null, 2) + "\n",
);
const pllQuizzes = buildPllQuizzes(catalog);
for (const quiz of pllQuizzes)
  catalog.find((c) => c.id === quiz.caseId).answers = quiz.views[0].answerIds;
fs.writeFileSync(
  path.join(root, "content/pll-similarity.json"),
  JSON.stringify({ version: 1, cases: pllQuizzes }, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(root, "content/pll-recognition.json"),
  JSON.stringify(
    {
      version: 1,
      cases: pllQuizzes.map((q) => ({
        ...q,
        views: q.views.map(({ rankedCandidates, ...view }) => view),
      })),
    },
    null,
    2,
  ) + "\n",
);
const report = {
  version: 1,
  checkedOn: jpermDocument.retrieved,
  cases: catalog.length,
  oll: 57,
  pll: 21,
  algorithms: catalog.reduce((n, c) => n + c.algorithms.length, 0),
  setups: catalog.reduce((n, c) => n + c.setups.length, 0),
  trainerScrambles: catalog.reduce(
    (n, c) => n + c.setups.filter((s) => s.kind === "trainer").length,
    0,
  ),
  publishedSetups: catalog.reduce(
    (n, c) => n + c.setups.filter((s) => s.kind === "published").length,
    0,
  ),
  inverseSetups: catalog.reduce(
    (n, c) => n + c.setups.filter((s) => s.kind === "inverse").length,
    0,
  ),
  rejected,
};
fs.writeFileSync(
  path.join(root, "content/cases.json"),
  JSON.stringify(catalog, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(root, "content/verification.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
