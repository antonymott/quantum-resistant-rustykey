import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wasmDir = join(root, "wasm");
const nativeDir = join(root, "vendor/mlkem-native");
const falconDir = join(root, "vendor/falcon-ref");
const mldsaDir = join(root, "vendor/mldsa-native");
const sqisignDir = join(root, "vendor/sqisign-native");

if (!existsSync(join(nativeDir, "mlkem", "mlkem_native.h"))) {
	console.error(
		"Missing mlkem-native. Clone it:\n  git clone --depth 1 https://github.com/pq-code-package/mlkem-native.git vendor/mlkem-native",
	);
	process.exit(1);
}

if (!existsSync(join(falconDir, "falcon.h"))) {
	console.error(
		"Missing Falcon reference source under vendor/falcon-ref. Re-run the vendoring step before building.",
	);
	process.exit(1);
}

if (!existsSync(join(mldsaDir, "mldsa", "mldsa_native.h"))) {
	console.error(
		"Missing mldsa-native under vendor/mldsa-native. Clone it:\n  git clone --depth 1 https://github.com/pq-code-package/mldsa-native.git vendor/mldsa-native",
	);
	process.exit(1);
}

if (!existsSync(join(sqisignDir, "CMakeLists.txt"))) {
	console.error(
		"Missing SQISign sources under vendor/sqisign-native. Clone it:\n  git clone --depth 1 https://github.com/SQISign/the-sqisign.git vendor/sqisign-native",
	);
	process.exit(1);
}

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
	if (r.status !== 0) process.exit(r.status ?? 1);
}

const hasEmcc = spawnSync("which", ["emcc"], { encoding: "utf8" }).status === 0;

if (hasEmcc) {
	run("make", [
		"-C",
		wasmDir,
		`MLKEM_NATIVE_DIR=${nativeDir}`,
		`FALCON_REF_DIR=${falconDir}`,
		`MLDSA_NATIVE_DIR=${mldsaDir}`,
	]);
	run("bash", [join(wasmDir, "build_sqisign_lvl1.sh")], {
		env: { ...process.env, SQISIGN_NATIVE_DIR: sqisignDir },
	});
	run("bash", [join(wasmDir, "build_sqisign_lvl3.sh")], {
		env: { ...process.env, SQISIGN_NATIVE_DIR: sqisignDir },
	});
	run("bash", [join(wasmDir, "build_sqisign_lvl5.sh")], {
		env: { ...process.env, SQISIGN_NATIVE_DIR: sqisignDir },
	});
} else {
	const image = "emscripten/emsdk:3.1.51";
	run("docker", [
		"run",
		"--rm",
		"-v",
		`${wasmDir}:/src`,
		"-v",
		`${nativeDir}:/mlkem-native:ro`,
		"-v",
		`${falconDir}:/falcon-ref:ro`,
		"-v",
		`${mldsaDir}:/mldsa-native:ro`,
		"-w",
		"/src",
		image,
		"make",
		"MLKEM_NATIVE_DIR=/mlkem-native",
		"FALCON_REF_DIR=/falcon-ref",
		"MLDSA_NATIVE_DIR=/mldsa-native",
	]);
	run("docker", [
		"run",
		"--rm",
		"-v",
		`${root}:/work`,
		"-w",
		"/work/wasm",
		image,
		"bash",
		"-lc",
		"export SQISIGN_NATIVE_DIR=/work/vendor/sqisign-native && bash ./build_sqisign_lvl1.sh",
	]);
	run("docker", [
		"run",
		"--rm",
		"-v",
		`${root}:/work`,
		"-w",
		"/work/wasm",
		image,
		"bash",
		"-lc",
		"export SQISIGN_NATIVE_DIR=/work/vendor/sqisign-native && bash ./build_sqisign_lvl3.sh",
	]);
	run("docker", [
		"run",
		"--rm",
		"-v",
		`${root}:/work`,
		"-w",
		"/work/wasm",
		image,
		"bash",
		"-lc",
		"export SQISIGN_NATIVE_DIR=/work/vendor/sqisign-native && bash ./build_sqisign_lvl5.sh",
	]);
}
