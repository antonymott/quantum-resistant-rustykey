#!/usr/bin/env node
/**
 * Build public audit WASM artifacts with source maps / assertions.
 * Outputs land in wasm/audit-build/ (not shipped in the npm package).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	applyReproEnv,
	emscriptenImageRef,
	loadVendorLock,
	verifyVendorTrees,
} from "./lib/vendor-lock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmDir = join(root, "wasm");
const auditDir = join(wasmDir, "audit-build");
const lock = loadVendorLock();
const env = applyReproEnv(process.env, lock);
const image = env.EMSCRIPTEN_DOCKER_IMAGE ?? emscriptenImageRef(lock);

const errors = verifyVendorTrees(lock);
if (errors.length > 0) {
	console.error(errors.join("\n"));
	process.exit(1);
}

const dockerReady =
	spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
if (!dockerReady) {
	console.error("Docker is required for audit WASM builds.");
	process.exit(1);
}

mkdirSync(auditDir, { recursive: true });

const mapBase =
	process.env.SOURCE_MAP_BASE ??
	"https://raw.githubusercontent.com/antonymott/quantum-resistant-rustykey/main/wasm/";

const r = spawnSync(
	"docker",
	[
		"run",
		"--rm",
		"-e",
		`SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
		"-e",
		"TZ=UTC",
		"-e",
		"LANG=C",
		"-e",
		"LC_ALL=C",
		"-v",
		`${wasmDir}:/src`,
		"-v",
		`${join(root, "vendor/mlkem-native")}:/mlkem-native:ro`,
		"-v",
		`${join(root, "vendor/falcon-ref")}:/falcon-ref:ro`,
		"-v",
		`${join(root, "vendor/mldsa-native")}:/mldsa-native:ro`,
		"-w",
		"/src",
		image,
		"bash",
		"-lc",
		`export MLKEM_NATIVE_DIR=/mlkem-native FALCON_REF_DIR=/falcon-ref MLDSA_NATIVE_DIR=/mldsa-native SOURCE_MAP_BASE='${mapBase}' && make clean && make audit`,
	],
	{ stdio: "inherit", env },
);

if (r.status !== 0) process.exit(r.status ?? 1);

const readme = `# WASM audit artifacts

Built with pinned Emscripten (\`${lock.emscripten.tag}@${lock.emscripten.digest}\`) and debug/source-map flags:

- \`-g -gsource-map --source-map-base\`
- \`-s ASSERTIONS=1 -s STACK_OVERFLOW_CHECK=2\`
- **No** \`-s SINGLE_FILE\` (separate \`.wasm\` + \`.wasm.map\` for auditors)

These are **not** the npm-shipped modules. Production bundles stay under \`src/vendor/\` and are checked by \`pnpm verify:repro\`.

Representative modules: ML-KEM-768, Falcon-512, ML-DSA-65.
`;

try {
	writeFileSync(join(auditDir, "README.md"), readme);
} catch (err) {
	if (
		err &&
		typeof err === "object" &&
		"code" in err &&
		err.code === "EACCES"
	) {
		console.warn(
			"Could not write wasm/audit-build/README.md (directory owned by Docker). Artifacts are still present.",
		);
	} else {
		throw err;
	}
}

if (!existsSync(join(auditDir, "wasm-module.js"))) {
	console.error("Audit build missing expected outputs in wasm/audit-build/");
	process.exit(1);
}

console.log(`Audit artifacts ready in ${auditDir}`);
