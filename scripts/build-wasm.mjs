import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wasmDir = join(root, "wasm");
const nativeDir = join(root, "vendor/mlkem-native");
const falconDir = join(root, "vendor/falcon-ref");
const mldsaDir = join(root, "vendor/mldsa-native");
const sqisignDir = join(root, "vendor/sqisign-native");
const vendorDir = join(root, "vendor");

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
	if (r.status !== 0) process.exit(r.status ?? 1);
}

function ensureGitRepo(path, probeFile, repoUrl, label) {
	if (existsSync(join(path, probeFile))) return;
	mkdirSync(vendorDir, { recursive: true });
	console.log(`Missing ${label}. Cloning ${repoUrl} ...`);
	const cloneResult = spawnSync("git", ["clone", "--depth", "1", repoUrl, path], {
		stdio: "inherit",
	});
	if (cloneResult.status !== 0 || !existsSync(join(path, probeFile))) {
		console.error(`Failed to prepare ${label} at ${path}`);
		process.exit(cloneResult.status ?? 1);
	}
}

ensureGitRepo(
	nativeDir,
	join("mlkem", "mlkem_native.h"),
	"https://github.com/pq-code-package/mlkem-native.git",
	"mlkem-native",
);

if (!existsSync(join(falconDir, "falcon.h"))) {
	console.error(
		"Missing Falcon reference source under vendor/falcon-ref. Re-run the vendoring step before building.",
	);
	process.exit(1);
}

ensureGitRepo(
	mldsaDir,
	join("mldsa", "mldsa_native.h"),
	"https://github.com/pq-code-package/mldsa-native.git",
	"mldsa-native",
);

ensureGitRepo(
	sqisignDir,
	"CMakeLists.txt",
	"https://github.com/SQISign/the-sqisign.git",
	"sqisign-native",
);

const hasEmcc = spawnSync("which", ["emcc"], { encoding: "utf8" }).status === 0;

if (hasEmcc) {
	run("make", ["-C", wasmDir], {
		env: {
			...process.env,
			MLKEM_NATIVE_DIR: nativeDir,
			FALCON_REF_DIR: falconDir,
			MLDSA_NATIVE_DIR: mldsaDir,
		},
	});
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
		"bash",
		"-lc",
		"export MLKEM_NATIVE_DIR=/mlkem-native FALCON_REF_DIR=/falcon-ref MLDSA_NATIVE_DIR=/mldsa-native && make",
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
