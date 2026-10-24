const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cubeio-sources-"));
try {
  for (const lower of ["oll", "pll"]) {
    const documents = [
      [
        `https://jperm.net/lib/${lower}.js?v=20190924-1156`,
        `cubeio-jperm-${lower}.js`,
      ],
      [
        `https://speedcubedb.com/a/3x3/${lower.toUpperCase()}`,
        `cubeio-scdb-${lower}.html`,
      ],
    ];
    for (const [url, file] of documents)
      execFileSync(
        "curl",
        [
          "--fail",
          "--location",
          "--silent",
          "--show-error",
          "--max-time",
          "30",
          url,
          "-o",
          path.join(dir, file),
        ],
        { stdio: "inherit" },
      );
  }
  execFileSync(
    process.execPath,
    [path.join(__dirname, "extract-case-sources.cjs"), dir],
    { stdio: "inherit" },
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
