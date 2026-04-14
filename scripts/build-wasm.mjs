import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wasmDir = join(root, "wasm");
const nativeDir = join(root, "vendor/mlkem-native");

if (!existsSync(join(nativeDir, "mlkem", "mlkem_native.h"))) {
	console.error(
		"Missing mlkem-native. Clone it:\n  git clone --depth 1 https://github.com/pq-code-package/mlkem-native.git vendor/mlkem-native",
	);
	process.exit(1);
}

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
	if (r.status !== 0) process.exit(r.status ?? 1);
}

const hasEmcc = spawnSync("which", ["emcc"], { encoding: "utf8" }).status === 0;

if (hasEmcc) {
	run("make", ["-C", wasmDir, `MLKEM_NATIVE_DIR=${nativeDir}`]);
} else {
	const image = "emscripten/emsdk:3.1.51";
	run("docker", [
		"run",
		"--rm",
		"-v",
		`${wasmDir}:/src`,
		"-v",
		`${nativeDir}:/mlkem-native:ro`,
		"-w",
		"/src",
		image,
		"make",
		"MLKEM_NATIVE_DIR=/mlkem-native",
	]);
}
