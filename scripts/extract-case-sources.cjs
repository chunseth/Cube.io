// Reads public reference data as literals/HTML; never executes downloaded code.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const input = process.argv[2] || "/tmp";
const output = path.join(__dirname, "../content/sources");
const stamp =
  process.env.CUBEIO_SOURCE_DATE || new Date().toISOString().slice(0, 10);
function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  throw new Error("Expected a data literal: " + node.getText().slice(0, 80));
}
function variable(source, name) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText() === name)
      found = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!found) throw new Error("Missing " + name);
  return found;
}
function text(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const jperm = [],
  speedcubedb = [],
  documents = [];
for (const type of ["OLL", "PLL"]) {
  const lower = type.toLowerCase();
  const js = fs.readFileSync(
    path.join(input, `cubeio-jperm-${lower}.js`),
    "utf8",
  );
  const html = fs.readFileSync(
    path.join(input, `cubeio-scdb-${lower}.html`),
    "utf8",
  );
  const source = ts.createSourceFile(
    lower + ".js",
    js,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const scrambles = literal(variable(source, "algsetScrambles"));
  const cases = variable(source, "algsetAlgs").elements.map((object, index) => {
    const props = Object.fromEntries(
      object.properties
        .filter((p) => ["name", "alg", "group"].includes(p.name?.getText()))
        .map((p) => [p.name.getText(), literal(p.initializer)]),
    );
    return {
      type,
      name: String(props.name),
      group: props.group,
      algorithms: props.alg,
      scrambles: scrambles[index],
      sourceIndex: index,
    };
  });
  if (
    cases.length !== (type === "OLL" ? 57 : 21) ||
    scrambles.length !== cases.length
  )
    throw new Error("Incomplete J Perm source");
  jperm.push(...cases);
  const blocks = html
    .split(/<div class="row singlealgorithm[^>]*data-subgroup="/)
    .slice(1);
  const parsed = blocks.map((block) => {
    const group = text(block.split('"')[0]);
    const name = text(block.match(/data-alg="([^"]+)"/)[1]);
    const setup = text(
      block.match(
        /class="setup-case[^>]*><div>setup:<\/div>([\s\S]*?)<\/div>/,
      )[1],
    );
    const standard = text(
      block.match(/Standard Alg:<\/div>([\s\S]*?)<\/div>/)[1],
    );
    const alternatives = [
      ...block.matchAll(/class="formatted-alg">([\s\S]*?)<\/div>/g),
    ].map((m) => text(m[1]));
    const cube = block.match(/<div class="jcube"([^>]*)>/)[1];
    const diagram = Object.fromEntries(
      [...cube.matchAll(/data-(u[sbflr])="([^"]+)"/g)].map((m) => [m[1], m[2]]),
    );
    return {
      type,
      name,
      group,
      setup,
      standard,
      algorithms: [...new Set([standard, ...alternatives])],
      diagram,
    };
  });
  if (parsed.length !== cases.length)
    throw new Error("Incomplete SpeedCubeDB source: " + parsed.length);
  speedcubedb.push(...parsed);
  for (const [name, data, url] of [
    ["jperm", js, `https://jperm.net/lib/${lower}.js?v=20190924-1156`],
    ["speedcubedb", html, `https://speedcubedb.com/a/3x3/${type}`],
  ])
    documents.push({
      source: name,
      type,
      url,
      retrieved: stamp,
      sha256: crypto.createHash("sha256").update(data).digest("hex"),
    });
}
fs.writeFileSync(
  path.join(output, "jperm.json"),
  JSON.stringify({ retrieved: stamp, cases: jperm }, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(output, "speedcubedb.json"),
  JSON.stringify({ retrieved: stamp, cases: speedcubedb }, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(output, "manifest.json"),
  JSON.stringify(documents, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    jpermCases: jperm.length,
    trainerScrambles: jperm.reduce((n, c) => n + c.scrambles.length, 0),
    speedcubedbCases: speedcubedb.length,
    algorithms: jperm
      .concat(speedcubedb)
      .reduce((n, c) => n + c.algorithms.length, 0),
  }),
);
