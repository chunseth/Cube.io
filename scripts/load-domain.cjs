// Compile local, trusted TypeScript in memory for catalog maintenance scripts.
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
module.exports = function loadDomain(file) {
  const filename = require("node:path").resolve(
    __dirname,
    "../domain",
    file + ".ts",
  );
  const previous = Module._extensions[".ts"];
  Module._extensions[".ts"] = (mod, sourcePath) => {
    const output = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    });
    mod._compile(output.outputText, sourcePath);
  };
  try {
    delete require.cache[filename];
    return require(filename);
  } finally {
    if (previous) Module._extensions[".ts"] = previous;
    else delete Module._extensions[".ts"];
  }
};
