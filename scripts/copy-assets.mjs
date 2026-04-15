import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceWasm = join(root, "src/vendor/fndsa/fndsa_rs_bg.wasm");
const targetDir = join(root, "dist/vendor/fndsa");
const targetWasm = join(targetDir, "fndsa_rs_bg.wasm");

mkdirSync(targetDir, { recursive: true });
cpSync(sourceWasm, targetWasm);
