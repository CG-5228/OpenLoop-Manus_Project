import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = mkdtempSync(resolve(tmpdir(), "openloop-ai-tests-"));
let status = 1;
try {
  const compile = spawnSync(resolve(project, "node_modules/.bin/tsc"), ["--project", "tests/ai-extraction/tsconfig.json", "--outDir", output], { cwd: project, stdio: "inherit" });
  if (compile.status === 0) {
    const tests = spawnSync(process.execPath, ["--test", "tests/ai-extraction/extraction.test.mjs"], { cwd: project, stdio: "inherit", env: { ...process.env, OPENLOOP_COMPILED_ROOT: output } });
    status = tests.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
process.exitCode = status;
