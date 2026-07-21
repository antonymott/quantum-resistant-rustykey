import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(root, "dist");

const requiredFiles = [
	join(distDir, "index.js"),
	join(distDir, "index.d.ts"),
	join(distDir, "sqisign-accel-worker.js"),
];

const requiredWebGpuExports = [
	"getSqisignWebGpuSupport",
	"benchSqisignWebGpu",
	"loadSqisignLvl1WebGpu",
	"loadSqisignLvl3WebGpu",
	"loadSqisignLvl5WebGpu",
	"setSqisignAccelWorkerUrl",
];

const requiredSlhDsaExports = [
	"loadSlhDsa128",
	"loadSlhDsa192",
	"loadSlhDsa256",
];

const errors = [];

for (const path of requiredFiles) {
	if (!existsSync(path)) {
		errors.push(`Missing required dist artifact: ${path}`);
	}
}

const workerPath = join(distDir, "sqisign-accel-worker.js");
if (existsSync(workerPath)) {
	const workerSize = statSync(workerPath).size;
	if (workerSize < 100_000) {
		errors.push(
			`dist/sqisign-accel-worker.js looks too small (${workerSize} bytes); run \`pnpm build\`.`,
		);
	}
}

const indexDtsPath = join(distDir, "index.d.ts");
const indexJsPath = join(distDir, "index.js");

if (existsSync(indexDtsPath)) {
	const indexDts = readFileSync(indexDtsPath, "utf8");
	const missingExports = requiredWebGpuExports.filter(
		(name) => !indexDts.includes(name),
	);
	if (missingExports.length > 0) {
		errors.push(
			`dist/index.d.ts is missing SQISign-webGPU exports: ${missingExports.join(", ")}`,
		);
	}

	const missingSlhDsaExports = requiredSlhDsaExports.filter(
		(name) => !indexDts.includes(name),
	);
	if (missingSlhDsaExports.length > 0) {
		errors.push(
			`dist/index.d.ts is missing SLH-DSA exports: ${missingSlhDsaExports.join(", ")}`,
		);
	}
}

if (existsSync(indexJsPath)) {
	const indexJs = readFileSync(indexJsPath, "utf8");
	const missingRuntime = requiredWebGpuExports.filter(
		(name) => !indexJs.includes(name),
	);
	if (missingRuntime.length > 0) {
		errors.push(
			`dist/index.js is missing SQISign-webGPU runtime symbols: ${missingRuntime.join(", ")}`,
		);
	}

	const missingSlhDsaRuntime = requiredSlhDsaExports.filter(
		(name) => !indexJs.includes(name),
	);
	if (missingSlhDsaRuntime.length > 0) {
		errors.push(
			`dist/index.js is missing SLH-DSA runtime symbols: ${missingSlhDsaRuntime.join(", ")}`,
		);
	}
}

if (errors.length > 0) {
	console.error("dist verification failed:");
	for (const message of errors) {
		console.error(`  - ${message}`);
	}
	console.error("Run `pnpm build` before publish.");
	process.exit(1);
}

console.log(
	"dist artifacts verified (including SQISign-webGPU exports, SLH-DSA exports, and worker bundle).",
);
