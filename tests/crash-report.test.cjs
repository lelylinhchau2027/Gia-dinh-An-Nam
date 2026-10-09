const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
let contents = null,
  listener,
  failWrite = false,
  prevented = false;
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === "expo-file-system")
    return {
      Paths: { document: "documents" },
      File: class {
        get exists() {
          return contents !== null;
        }
        write(s) {
          if (failWrite) throw Error("disk");
          contents = s;
        }
        textSync() {
          return contents;
        }
      },
    };
  if (id === "react-native")
    return { Platform: { OS: "ios", Version: "16.4" } };
  if (id === "expo-constants")
    return { __esModule: true, default: { expoConfig: { version: "0.5.1" } } };
  return load.call(this, id, ...args);
};
global.RN$registerExceptionListener = (fn) => {
  listener = fn;
};
const {
  installCrashReporting,
  readCrashReport,
  setDiagnosticScreen,
} = require("../src/lib/crashReporting.ts");
test("RN fatal error is saved synchronously, redacted and never swallowed", () => {
  installCrashReporting();
  assert.equal(typeof listener, "function");
  setDiagnosticScreen("(tabs)/em-be");
  listener({
    isFatal: true,
    message: "error https://private.test/?secret=abc eyJaaaa.bbbbb.ccccc",
    stack: "stack",
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.ok(readCrashReport().includes("(tabs)/em-be"));
  assert.ok(!readCrashReport().includes("private.test"));
  assert.ok(!readCrashReport().includes("eyJaaaa"));
  assert.equal(prevented, false);
  const saved = contents;
  listener({ isFatal: false, message: "warning" });
  assert.equal(contents, saved);
  failWrite = true;
  assert.doesNotThrow(() => listener({ isFatal: true, message: "new error" }));
  assert.equal(contents, saved);
});
