const fs = require("node:fs");
const path = require("node:path");
const Cube = require("../vendor/cubejs");
const { pllQuestionSVG } = require("./load-domain.cjs")("cubeProjection");
const { PLL_CONFUSION_ANCHORS } =
  require("./load-domain.cjs")("pllRecognition");
const cases = require("../content/cases.json");
const quizzes = require("../content/pll-similarity.json").cases;
const byId = new Map(cases.map((c) => [c.id, c]));
const escape = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const owners = new Map();
for (const q of quizzes)
  for (const v of q.views) {
    const owner = owners.get(v.visiblePattern);
    if (owner && owner !== q.caseId)
      throw Error("Ambiguous PLL UFR pattern: " + q.caseId + " / " + owner);
    owners.set(v.visiblePattern, q.caseId);
  }
function alignedCandidate(question, candidate, auf) {
  const target = new Cube().move(question).asString()[18];
  for (const pre of ["", "U", "U2", "U'"]) {
    const cube = new Cube().move(pre).move(candidate).move(auf);
    if (cube.asString()[18] === target) return cube.asString();
  }
  throw Error("Cannot align PLL colors.");
}
const pairSummary = quizzes.map((q) => ({
  caseId: q.caseId,
  knownConfusions: PLL_CONFUSION_ANCHORS[q.caseId] ?? [],
  selectedLookalikes: [
    ...new Set(q.views.flatMap((v) => v.distractors.map((d) => d.caseId))),
  ],
  allPeers: cases
    .filter((c) => c.type === "PLL" && c.id !== q.caseId)
    .map((peer) => {
      const matches = q.views
        .map((v) => ({
          questionAuf: v.auf,
          ...v.rankedCandidates.find((c) => c.caseId === peer.id),
        }))
        .sort((a, b) => a.score - b.score);
      return {
        caseId: peer.id,
        bestScore: matches[0].score,
        questionAuf: matches[0].questionAuf,
        matchedAuf: matches[0].matchedAuf,
        knownConfusion: matches[0].knownConfusion,
        description: matches[0].matchedDescription,
      };
    })
    .sort(
      (a, b) => a.bestScore - b.bestScore || a.caseId.localeCompare(b.caseId),
    ),
}));
const report = {
  caseCount: quizzes.length,
  aufVariants: quizzes.reduce((n, q) => n + q.views.length, 0),
  distinctColorNeutralViews: owners.size,
  distinctColoredNonSkipStates: owners.size * 4,
  ambiguousViews: 0,
  policy:
    "Choose the two nearest visible configurations. For the third slot, use a provided confusion family if not already represented and a candidate angle has at most two equality-pair differences, one headlight difference, no full-bar difference, and at most one adjacent-block difference; otherwise use the next nearest configuration. Compare all four candidate U angles and preserve cyclic color order/opposites.",
  weights: {
    sameColorPairs: 9,
    headlights: 12,
    fullBars: 15,
    adjacentBlocks: 9,
    oppositeColorPairs: 2,
    directedColorRelations: 1,
    normalizedColorPositions: 1,
  },
  pairSummary,
  cases: quizzes,
};
const output = path.join(__dirname, "../content/pll-quizzes");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(
  path.join(output, "audit.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const summary = `<table><thead><tr><th>PLL</th><th>Selected lookalikes across UFR angles</th><th>Closest measured peers across all angles</th></tr></thead><tbody>${pairSummary
  .map(
    (p) =>
      `<tr><td><a href="#${p.caseId}">${byId.get(p.caseId).name}</a></td><td>${p.selectedLookalikes.map((id) => byId.get(id).name.replace(" Perm", "")).join(", ")}</td><td>${p.allPeers
        .slice(0, 6)
        .map(
          (p) =>
            byId.get(p.caseId).name.replace(" Perm", "") +
            " (" +
            p.bestScore +
            ")",
        )
        .join(", ")}</td></tr>`,
  )
  .join("")}</tbody></table>`;
const cards = quizzes
  .map(
    (q) =>
      `<article id="${q.caseId}"><h2>${byId.get(q.caseId).name}</h2>${q.views
        .map(
          (v, i) =>
            `<details ${i === 0 ? "open" : ""}><summary>U alignment ${v.auf || "none"} · ${v.answerIds.map((id) => byId.get(id).name).join(", ")}</summary><div class="question"><div>${pllQuestionSVG(new Cube().move(v.setup).asString())}<p>${escape(v.features.description)}</p><code>F/R ${v.features.colors.slice(0, 3)}/${v.features.colors.slice(3)}</code></div><div class="answers">${v.answerIds
              .map(
                (id, j) =>
                  `<div class="option ${id === q.caseId ? "correct" : ""}"><b>${String.fromCharCode(65 + j)} · ${byId.get(id).name}${id === q.caseId ? " ✓" : ""}</b>${
                    id === q.caseId
                      ? "<p>Correct case</p>"
                      : (() => {
                          const d = v.distractors.find((d) => d.caseId === id);
                          return (
                            pllQuestionSVG(
                              alignedCandidate(
                                v.setup,
                                byId.get(id).setup,
                                d.matchedAuf,
                              ),
                            ) +
                            `<small>${escape(d.reason)}<br>Similarity score: ${d.score}; candidate U angle: ${d.matchedAuf || "none"}</small>`
                          );
                        })()
                  }</div>`,
              )
              .join(
                "",
              )}</div></div><details><summary>All 20 other PLLs ranked for this question</summary><table><tr><th>Candidate</th><th>Score</th><th>Best angle</th><th>Visible configuration</th></tr>${v.rankedCandidates.map((r) => `<tr><td>${byId.get(r.caseId).name}</td><td>${r.score}</td><td>${r.matchedAuf || "none"}</td><td>${escape(r.matchedDescription)}</td></tr>`).join("")}</table></details></details>`,
        )
        .join("")}</article>`,
  )
  .join("");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cube.io · PLL two-sided quiz audit</title><style>body{background:#0c1420;color:#f4f7fb;font:14px system-ui;margin:0;padding:28px}main{max-width:1200px;margin:auto}p,small{color:#b0bdcd;line-height:1.5}article{background:#162231;border:1px solid #293a4f;border-radius:20px;padding:22px;margin:22px 0}summary{padding:12px;cursor:pointer;color:#79b9ff}.question{display:grid;grid-template-columns:260px 1fr;align-items:center;gap:18px}.question>div:first-child{text-align:center}.question>div:first-child svg{width:250px;height:216px}.answers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.option{padding:12px;border:1px solid #304257;border-radius:14px;background:#101b2a;text-align:center}.correct{border-color:#65d49b}.option svg{width:100%;height:auto}.option b,.option small{display:block;margin:8px 0}.option small{font-size:11px}table{border-collapse:collapse;width:100%;margin:14px 0;font-size:12px}td,th{padding:9px;border-bottom:1px solid #304257;text-align:left}a,code{color:#79b9ff}@media(max-width:900px){.question{grid-template-columns:1fr}.answers{grid-template-columns:repeat(2,1fr)}}</style><main><h1>Cube.io · PLL two-sided identification</h1><p>21 PLLs · 84 U-angle variants · 71 color-neutral UFR configurations · 284 colored non-skip states · zero ambiguous views</p><p>Author review: actual quiz answers are names only and shuffled. Candidate cube comparisons and the green correct-answer outline appear only in this audit. Candidate colors are cyclically aligned for easier comparison; no reflection or arbitrary color swapping is allowed. Lower scores mean a closer visible match.</p><p>Blocks and headlights carry the most weight, followed by equal-color relationships and adjacent/opposite color differences. The user-provided confusion families guide a third choice only where the visible geometry is close. This is a deterministic design heuristic, not a user-tested difficulty rating. <a href="audit.json">Complete comparison data</a></p>${summary}${cards}</main></html>`;
fs.writeFileSync(path.join(output, "index.html"), html + "\n");
console.log(
  `Audited ${quizzes.length} PLL quizzes, ${owners.size} structural UFR patterns, and ${quizzes.length * 4 * 20} ranked peer comparisons.`,
);
