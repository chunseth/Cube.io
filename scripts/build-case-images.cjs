const fs = require("node:fs");
const path = require("node:path");
const { canonicalCube } = require("./load-domain.cjs")("lastLayer");
const { caseDiagramSVG } = require("./load-domain.cjs")("caseDiagram");
const cases = require("../content/cases.json");
const output = path.join(__dirname, "../content/images");
const manifest = [];
for (const c of cases) {
  const file = c.imageId + ".svg";
  fs.writeFileSync(
    path.join(output, file),
    caseDiagramSVG(
      canonicalCube(c.setup).asString(),
      c.type === "OLL",
      c.imageId,
    ) + "\n",
  );
  manifest.push({
    imageId: c.imageId,
    caseId: c.id,
    file,
    signature: c.signature,
  });
}
fs.writeFileSync(
  path.join(output, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
const esc = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cube.io — verified last-layer atlas</title><style>body{background:#0c1420;color:#f4f7fb;font:15px system-ui;margin:0;padding:40px}h1{font-size:32px;margin-bottom:8px}p{color:#b0bdcd}section{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin:24px 0 44px}article{background:#162231;border:1px solid #293a4f;border-radius:22px;padding:16px;text-align:center}img{width:100%;max-width:192px}h3{margin:12px 0 6px}small{color:#b0bdcd}code{font-size:10px;color:#79b9ff}button{padding:10px;border-radius:10px;background:#203c5b;color:white;border:1px solid #79b9ff;cursor:pointer}pre{white-space:pre-wrap;font:12px monospace;text-align:left}details{margin-top:14px;text-align:left}a{color:#79b9ff}</style><h1>Cube.io · Last-layer atlas</h1><p>78 verified cases · U face + all four side rows · yellow U / green F · OLL uses orientation only</p><p>Every published and trainer setup preserves F2L. Source data: <a href="https://jperm.net/algs/oll">J Perm</a> and <a href="https://speedcubedb.com/a/3x3/OLL">SpeedCubeDB</a>.</p>${[
  "OLL",
  "PLL",
]
  .map(
    (type) =>
      `<h2>${type}</h2><section>${cases
        .filter((c) => c.type === type)
        .map(
          (c) =>
            `<article id="${c.id}"><img src="${c.imageId}.svg" alt="${c.name}: U and all four side rows"><h3>${c.name}</h3><small>${c.family} · ${c.setups.length} setups</small><br><code>${c.imageId}</code><details><summary>Setup &amp; algorithms</summary><pre>${esc(c.setup)}</pre>${c.algorithms.map((a) => `<pre>${esc(a)}</pre>`).join("")}</details></article>`,
        )
        .join("")}</section>`,
  )
  .join("")}</html>`;
fs.writeFileSync(path.join(output, "index.html"), html + "\n");
const previewCases = [
  "oll-01",
  "oll-21",
  "oll-32",
  "pll-aa",
  "pll-ga",
  "pll-t",
].map((id) => cases.find((c) => c.id === id));
const preview = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Cube.io case image preview</title><style>body{background:#0c1420;color:#f4f7fb;font:15px system-ui;margin:0;padding:24px}main{max-width:920px;margin:auto}h1{font-size:28px;margin:0 0 6px}p{color:#b0bdcd;margin:0 0 18px}section{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}article{background:#162231;border:1px solid #293a4f;border-radius:20px;text-align:center;padding:14px}img{width:164px;height:164px}h3{margin:6px 0}small{color:#b0bdcd}code{display:block;font-size:10px;color:#79b9ff;margin-top:5px}</style><main><h1>Cube.io · Last-layer case images</h1><p>U face + all four side rows · 78 verified OLL &amp; PLL cases</p><section>${previewCases.map((c) => `<article><img src="${c.imageId}.svg" alt="${c.name}"><h3>${c.name}</h3><small>${c.type === "OLL" ? c.family : "Permutation of the last layer"}</small><code>${c.imageId}</code></article>`).join("")}</section></main></html>`;
fs.writeFileSync(path.join(output, "preview.html"), preview + "\n");
console.log(`Built ${cases.length} SVG case images and the atlas.`);
