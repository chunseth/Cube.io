const fs = require("node:fs");
const path = require("node:path");
const Cube = require("../vendor/cubejs");
const { ollQuestionSVG } = require("./load-domain.cjs")("cubeProjection");
const cases = require("../content/cases.json");
const quizzes = require("../content/oll-recognition.json").cases;
const escape = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const byId = new Map(cases.map((c) => [c.id, c]));
const visible = new Map();
for (const q of quizzes)
  for (const view of q.views) {
    const owner = visible.get(view.visibleMask);
    if (owner && owner !== q.caseId)
      throw new Error("Ambiguous UFR view: " + q.caseId + " / " + owner);
    visible.set(view.visibleMask, q.caseId);
  }
const report = {
  caseCount: quizzes.length,
  aufVariants: quizzes.reduce((n, q) => n + q.views.length, 0),
  distinctNonSkipViews: visible.size,
  ambiguousViews: 0,
  policy:
    "Prefer two same-edge-shape/same-corner-count distractors and one nearest different-corner-count case. When fewer than two peers exist, fill from the nearest corner count within the same edge shape. Rank visual similarity after trying all four candidate U alignments.",
  cases: quizzes.map((q) => ({
    caseId: q.caseId,
    ...q.features,
    policyNote: q.policyNote,
    views: q.views.map((v) => ({
      auf: v.auf || "none",
      answerIds: v.answerIds,
      distractors: v.distractors,
    })),
  })),
};
const output = path.join(__dirname, "../content/oll-quizzes");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(
  path.join(output, "audit.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const cards = quizzes
  .map((q) => {
    const c = byId.get(q.caseId);
    return `<article id="${q.caseId}"><h2>${c.name} · ${c.family}</h2><p>${q.features.edgeShape} edges · ${q.features.orientedCorners} oriented corners</p><p class="note">${escape(q.policyNote)}</p>${q.views.map((v, i) => `<details ${i === 0 ? "open" : ""}><summary>U alignment: ${v.auf || "none"} · ${v.answerIds.map((id) => byId.get(id).name).join(", ")}</summary><div class="question"><div>${ollQuestionSVG(new Cube().move(v.setup).asString())}<p>UFR question · F2L blank</p></div><div class="answers">${v.answerIds.map((id, j) => `<div class="option ${id === q.caseId ? "correct" : ""}"><img src="../images/${byId.get(id).imageId}.svg" alt="${byId.get(id).name}"><b>${String.fromCharCode(65 + j)} · ${byId.get(id).name}${id === q.caseId ? " ✓" : ""}</b><small>${escape(v.distractors.find((d) => d.caseId === id)?.reason || "Correct case; all four side rows are shown.")}</small></div>`).join("")}</div></div></details>`).join("")}</article>`;
  })
  .join("");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cube.io · OLL quiz author audit</title><style>body{background:#0c1420;color:#f4f7fb;font:14px system-ui;margin:0;padding:28px}main{max-width:1150px;margin:auto}p,small{color:#b0bdcd;line-height:1.5}h1{font-size:28px}article{background:#162231;border:1px solid #293a4f;border-radius:20px;padding:24px;margin:20px 0}summary{cursor:pointer;padding:12px;color:#79b9ff}.question{display:grid;grid-template-columns:260px 1fr;align-items:center;gap:20px}.question>div:first-child{text-align:center}.question svg{width:250px;height:216px}.answers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.option{padding:12px;border:1px solid #304257;border-radius:14px;background:#101b2a;text-align:center}.option.correct{border-color:#65d49b}.option img{width:100%;max-width:144px}.option b,.option small{display:block;margin:8px 0}.option small{font-size:11px}.note{font-size:12px}@media(max-width:850px){.question{grid-template-columns:1fr}.answers{grid-template-columns:repeat(2,1fr)}}a{color:#79b9ff}</style><main><h1>Cube.io · OLL quiz author audit</h1><p>57 cases · 228 U-alignment variants · 215 distinct non-skip UFR views · zero ambiguous views</p><p>Author review: the correct answer is outlined in green here. In Cube.io, answers are shuffled and correctness is shown only after selection. <a href="audit.json">Detailed selection audit</a></p>${cards}</main></html>`;
fs.writeFileSync(path.join(output, "index.html"), html + "\n");
console.log(
  `Audited ${quizzes.length} OLL quizzes, ${visible.size} distinct UFR patterns, and ${quizzes.length * 4} answer sets.`,
);
