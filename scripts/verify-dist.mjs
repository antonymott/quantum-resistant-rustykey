#!/usr/bin/env node
/**
 * Post-build check: dist artifacts and public API exports match the designed surface.
 * Runs from `pnpm build` (and prepack / prepublishOnly).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(root, "dist");

const requiredFiles = [
	{ path: join(distDir, "index.js"), label: "dist/index.js" },
	{ path: join(distDir, "index.d.ts"), label: "dist/index.d.ts" },
	{
		path: join(distDir, "sqisign-accel-worker.js"),
		label: "dist/sqisign-accel-worker.js",
		minBytes: 100_000,
	},
];

/** Designed public exports from src/index.ts (runtime + types). */
const exportGroups = {
	"ML-KEM": ["loadMlKem512", "loadMlKem768", "loadMlKem1024"],
	"FN-DSA": ["loadFnDsa512", "loadFnDsa1024"],
	"ML-DSA": ["loadMlDsa3", "loadMlDsa5"],
	"SLH-DSA": ["loadSlhDsa128", "loadSlhDsa192", "loadSlhDsa256"],
	SQIsign: ["loadSqisignLvl1", "loadSqisignLvl3", "loadSqisignLvl5"],
	"SQISign-webGPU": [
		"getSqisignWebGpuSupport",
		"isSqisignWebGpuAvailable",
		"benchSqisignWebGpu",
		"loadSqisignLvl1WebGpu",
		"loadSqisignLvl3WebGpu",
		"loadSqisignLvl5WebGpu",
		"setSqisignAccelWorkerUrl",
		"SQISIGN_WEBGPU_VARIANT_LABELS",
	],
};

const typeOnlyExports = [
	"SqisignWebGpuSupport",
	"SqisignWebGpuVariant",
	"SqisignBenchSteps",
];

const errors = [];

for (const file of requiredFiles) {
	if (!existsSync(file.path)) {
		errors.push(`Missing required dist artifact: ${file.label}`);
		continue;
	}
	if (file.minBytes != null) {
		const size = statSync(file.path).size;
		if (size < file.minBytes) {
			errors.push(
				`${file.label} looks too small (${size} bytes; expected ≥ ${file.minBytes}). Run \`pnpm build\`.`,
			);
		}
	}
}

const indexDtsPath = join(distDir, "index.d.ts");
const indexJsPath = join(distDir, "index.js");

function missingFrom(haystack, names) {
	return names.filter((name) => !haystack.includes(name));
}

if (existsSync(indexDtsPath) && existsSync(indexJsPath)) {
	const indexDts = readFileSync(indexDtsPath, "utf8");
	const indexJs = readFileSync(indexJsPath, "utf8");

	for (const [group, names] of Object.entries(exportGroups)) {
		const missingDts = missingFrom(indexDts, names);
		if (missingDts.length > 0) {
			errors.push(
				`dist/index.d.ts is missing ${group} exports: ${missingDts.join(", ")}`,
			);
		}

		const missingJs = missingFrom(indexJs, names);
		if (missingJs.length > 0) {
			errors.push(
				`dist/index.js is missing ${group} runtime symbols: ${missingJs.join(", ")}`,
			);
		}
	}

	const missingTypes = missingFrom(indexDts, typeOnlyExports);
	if (missingTypes.length > 0) {
		errors.push(
			`dist/index.d.ts is missing type exports: ${missingTypes.join(", ")}`,
		);
	}
} else if (!existsSync(indexDtsPath) || !existsSync(indexJsPath)) {
	// Already reported as missing files above; avoid duplicate noise.
}

if (errors.length > 0) {
	console.error("dist verification failed:");
	for (const message of errors) {
		console.error(`  - ${message}`);
	}
	console.error("Run `pnpm build` so dist is complete, then re-check.");
	process.exit(1);
}

const groupSummary = Object.keys(exportGroups).join(", ");
console.log(
	`dist artifacts verified (including ${groupSummary} exports, type exports, and worker bundle).`,
);
