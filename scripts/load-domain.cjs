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
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(require("node:path").dirname(filename));
  mod._compile(output.outputText, filename);
  return mod.exports;
};
