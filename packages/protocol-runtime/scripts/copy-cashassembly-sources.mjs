// Copies `src/cashassembly/*.casm` into `dist/cashassembly/` after `tsc`.
//
// `tsc` emits only JavaScript, but the CashAssembly locking-template sources are
// read at runtime via `readFileSync(new URL("./cashassembly/...", import.meta.url))`,
// so the built package needs them beside the emitted modules. Without this step
// `dist/` silently keeps whatever `.casm` files were last copied by hand, which
// means the built package can compile *stale* locking bytecode while the source
// tree and the test suite (which runs against `src/`) both look correct.
//
// For covenant sources that is a fund-security-relevant failure mode, not a
// packaging nicety: a stale template compiles to a different redeem script,
// therefore a different `L_verdict`, therefore seals nobody can spend.

import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, "..", "src", "cashassembly");
const targetDir = join(here, "..", "dist", "cashassembly");

mkdirSync(targetDir, { recursive: true });

const sources = readdirSync(sourceDir).filter((name) => name.endsWith(".casm"));
if (sources.length === 0) {
  throw new Error("copy-cashassembly-sources: no .casm sources found");
}
for (const name of sources) {
  copyFileSync(join(sourceDir, name), join(targetDir, name));
}
console.log(`copied ${String(sources.length)} CashAssembly source(s) to dist/cashassembly`);
