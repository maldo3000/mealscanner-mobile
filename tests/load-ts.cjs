const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

// Execute real application TS with explicit native-boundary mocks. No network,
// React Native runtime, credentials or device is required for these unit tests.
module.exports = function loadTs(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const requireMock = id => Object.hasOwn(mocks, id) ? mocks[id] : localRequire(id);
  new Function('require', 'module', 'exports', '__DEV__', outputText)(requireMock, module, module.exports, false);
  return module.exports;
};
