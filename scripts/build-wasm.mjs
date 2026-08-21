import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	applyReproEnv,
	emscriptenImageRef,
	loadVendorLock,
	verifyVendorTrees,
} from "./lib/vendor-lock.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wasmDir = join(root, "wasm");
const nativeDir = join(root, "vendor/mlkem-native");
const falconDir = join(root, "vendor/falcon-ref");
const mldsaDir = join(root, "vendor/mldsa-native");
const sqisignDir = join(root, "vendor/sqisign-native");

const lock = loadVendorLock();
const reproducible =
	process.env.REQUIRE_REPRODUCIBLE === "1" || process.env.CI === "true";

const env = reproducible
	? applyReproEnv(process.env, lock)
	: {
			...process.env,
			EMSCRIPTEN_DOCKER_IMAGE:
				process.env.EMSCRIPTEN_DOCKER_IMAGE ?? emscriptenImageRef(lock),
		};

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", env, ...opts });
	if (r.status !== 0) process.exit(r.status ?? 1);
}

function runResult(cmd, args, opts = {}) {
	return spawnSync(cmd, args, { stdio: "inherit", env, ...opts });
}

function hasCommand(cmd) {
	return spawnSync("which", [cmd], { encoding: "utf8" }).status === 0;
}

function isGnuMake(cmd) {
	const result = spawnSync(cmd, ["--version"], { encoding: "utf8" });
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	return result.status === 0 && output.includes("GNU Make");
}

function requireVendors() {
	const errors = verifyVendorTrees(lock);
	if (errors.length > 0) {
		console.error("Vendor trees do not match vendor.lock.json:");
		for (const e of errors) console.error(`  ${e}`);
		console.error("Run: pnpm fetch:vendors");
		process.exit(1);
	}
	for (const probe of [
		[join(nativeDir, "mlkem/mlkem_native.h"), "mlkem-native"],
		[join(falconDir, "falcon.h"), "falcon-ref"],
		[join(mldsaDir, "mldsa/mldsa_native.h"), "mldsa-native"],
		[join(sqisignDir, "CMakeLists.txt"), "sqisign-native"],
	]) {
		if (!existsSync(probe[0])) {
			console.error(`Missing ${probe[1]} at ${probe[0]}`);
			process.exit(1);
		}
	}
}

requireVendors();

const hasEmcc = hasCommand("emcc");
const hasDocker = hasCommand("docker");
const dockerReady = hasDocker && runResult("docker", ["info"]).status === 0;
const makeCmd = hasCommand("gmake") ? "gmake" : "make";
const canRunLocalMake = isGnuMake(makeCmd);
const image = env.EMSCRIPTEN_DOCKER_IMAGE ?? emscriptenImageRef(lock);

function runDockerBuild() {
	mkdirSync(join(wasmDir, "build"), { recursive: true });
	console.log(`Reproducible WASM build via Docker image ${image}`);
	run("docker", [
		"run",
		"--rm",
		"-e",
		`SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH ?? lock.sourceDateEpoch}`,
		"-e",
		"TZ=UTC",
		"-e",
		"LANG=C",
		"-e",
		"LC_ALL=C",
		"-e",
		`SQISIGN_MAKE_JOBS=${env.SQISIGN_MAKE_JOBS ?? "1"}`,
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
		"export MLKEM_NATIVE_DIR=/mlkem-native FALCON_REF_DIR=/falcon-ref MLDSA_NATIVE_DIR=/mldsa-native && make clean && make",
	]);
	for (const script of [
		"build_sqisign_lvl1.sh",
		"build_sqisign_lvl3.sh",
		"build_sqisign_lvl5.sh",
	]) {
		run("docker", [
			"run",
			"--rm",
			"-e",
			`SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH ?? lock.sourceDateEpoch}`,
			"-e",
			"TZ=UTC",
			"-e",
			"LANG=C",
			"-e",
			"LC_ALL=C",
			"-e",
			`SQISIGN_MAKE_JOBS=${env.SQISIGN_MAKE_JOBS ?? "1"}`,
			"-e",
			"SQISIGN_NATIVE_DIR=/work/vendor/sqisign-native",
			"-v",
			`${root}:/work`,
			"-w",
			"/work/wasm",
			image,
			"bash",
			"-lc",
			`bash ./${script}`,
		]);
	}
}

if (reproducible) {
	if (!dockerReady) {
		console.error(
			"REQUIRE_REPRODUCIBLE/CI builds require Docker with a working daemon.",
		);
		process.exit(1);
	}
	runDockerBuild();
} else if (hasEmcc && canRunLocalMake) {
	console.warn(
		"Dev WASM build via local emcc (hashes may differ from CI). Set REQUIRE_REPRODUCIBLE=1 for Docker+pin.",
	);
	const localMake = runResult(makeCmd, ["-C", wasmDir], {
		env: {
			...env,
			MLKEM_NATIVE_DIR: nativeDir,
			FALCON_REF_DIR: falconDir,
			MLDSA_NATIVE_DIR: mldsaDir,
		},
	});
	if (localMake.status !== 0) {
		console.warn(
			`Local WASM build failed via ${makeCmd} (exit ${localMake.status}).`,
		);
		if (dockerReady) {
			console.warn("Falling back to Docker-based WASM build.");
			runDockerBuild();
		} else {
			console.warn(
				"Skipping WASM build: Docker is unavailable and local build failed.",
			);
			if (process.env.REQUIRE_WASM_BUILD === "1") process.exit(1);
			process.exit(0);
		}
	} else {
		run("bash", [join(wasmDir, "build_sqisign_lvl1.sh")], {
			env: { ...env, SQISIGN_NATIVE_DIR: sqisignDir },
		});
		run("bash", [join(wasmDir, "build_sqisign_lvl3.sh")], {
			env: { ...env, SQISIGN_NATIVE_DIR: sqisignDir },
		});
		run("bash", [join(wasmDir, "build_sqisign_lvl5.sh")], {
			env: { ...env, SQISIGN_NATIVE_DIR: sqisignDir },
		});
	}
} else if (dockerReady) {
	runDockerBuild();
} else {
	console.warn(
		"Skipping WASM build: no usable local toolchain and Docker is unavailable.",
	);
	if (!hasEmcc) console.warn(" - emcc not found");
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
