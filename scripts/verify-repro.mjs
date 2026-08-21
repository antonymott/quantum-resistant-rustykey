#!/usr/bin/env node
/**
 * Compare SHA-256 of shipped WASM vendor bundles against repro.hashes.json.
 * Use --update after a successful REQUIRE_REPRODUCIBLE=1 rebuild.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadVendorLock } from "./lib/vendor-lock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hashesPath = join(root, "repro.hashes.json");

const vendorFiles = [
	"src/vendor/mlkem.js",
	"src/vendor/mlkem512.js",
	"src/vendor/mlkem1024.js",
	"src/vendor/falcon512.js",
	"src/vendor/falcon1024.js",
	"src/vendor/mldsa65.js",
	"src/vendor/mldsa87.js",
	"src/vendor/sqisignlvl1.js",
	"src/vendor/sqisignlvl3.js",
	"src/vendor/sqisignlvl5.js",
];

function sha256File(path) {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function collect() {
	const files = {};
	for (const rel of vendorFiles) {
		const path = join(root, rel);
		if (!existsSync(path)) {
			throw new Error(`Missing vendor artifact: ${rel}`);
		}
		files[rel] = sha256File(path);
	}
	return files;
}

const update = process.argv.includes("--update");
const lock = loadVendorLock();

if (update) {
	const payload = {
		generatedBy: "scripts/verify-repro.mjs --update",
		sourceDateEpoch: lock.sourceDateEpoch,
		emscripten: lock.emscripten,
		files: collect(),
	};
	writeFileSync(hashesPath, `${JSON.stringify(payload, null, "\t")}\n`);
	console.log(`Wrote ${hashesPath}`);
	process.exit(0);
}

if (!existsSync(hashesPath)) {
	console.error(
		`Missing ${hashesPath}. After a reproducible rebuild, run: pnpm verify:repro -- --update`,
	);
	process.exit(1);
}

const expected = JSON.parse(readFileSync(hashesPath, "utf8"));
const actual = collect();
const errors = [];

for (const rel of vendorFiles) {
	const want = expected.files?.[rel];
	const got = actual[rel];
	if (!want) {
		errors.push(`No expected hash for ${rel}`);
		continue;
	}
	if (want !== got) {
		errors.push(`${rel}\n  expected ${want}\n  actual   ${got}`);
	}
}

if (errors.length > 0) {
	console.error("Reproducible-build verification failed:\n");
	for (const e of errors) console.error(`- ${e}\n`);
	console.error(
		"Rebuild with REQUIRE_REPRODUCIBLE=1 (Docker + pinned emsdk), then either fix the drift or update hashes intentionally.",
	);
	process.exit(1);
}

console.log("All src/vendor WASM bundles match repro.hashes.json");
