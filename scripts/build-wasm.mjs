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

function runResult(cmd, args, opts = {}) {
	return spawnSync(cmd, args, { stdio: "inherit", ...opts });
}

function hasCommand(cmd) {
	return spawnSync("which", [cmd], { encoding: "utf8" }).status === 0;
}

function isGnuMake(cmd) {
	const result = spawnSync(cmd, ["--version"], { encoding: "utf8" });
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	return result.status === 0 && output.includes("GNU Make");
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

const hasEmcc = hasCommand("emcc");
const hasDocker = hasCommand("docker");
const dockerReady = hasDocker && runResult("docker", ["info"]).status === 0;
const makeCmd = hasCommand("gmake") ? "gmake" : "make";
const canRunLocalMake = isGnuMake(makeCmd);

if (hasEmcc && canRunLocalMake) {
	run(makeCmd, ["-C", wasmDir], {
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
} else if (dockerReady) {
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
} else {
	console.warn("Skipping WASM build: no usable local toolchain and Docker is unavailable.");
	if (!hasEmcc) {
		console.warn(" - emcc not found");
	}
	if (hasEmcc && !canRunLocalMake) {
		console.warn(" - GNU Make not found (install `make` as `gmake` on macOS)");
	}
	if (hasDocker && !dockerReady) {
		console.warn(" - Docker command exists but daemon is not running");
	}
	console.warn(
		"Continuing without rebuilding wasm artifacts. Set REQUIRE_WASM_BUILD=1 to make this fatal in CI.",
	);
	if (process.env.REQUIRE_WASM_BUILD === "1") {
		process.exit(1);
	}
}
