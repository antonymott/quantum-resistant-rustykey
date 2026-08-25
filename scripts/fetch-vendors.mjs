#!/usr/bin/env node
/**
 * Verify pinned vendor C trees against vendor.lock.json tree hashes.
 * In-tree vendors are the source of truth (including SQIsign CMake patches).
 * Use --update to rewrite treeHash / fileCount values after intentional vendor bumps.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	loadVendorLock,
	lockPath,
	root,
	treeStats,
	verifyVendorTrees,
} from "./lib/vendor-lock.mjs";

const update = process.argv.includes("--update");
const lock = loadVendorLock();

if (update) {
	for (const entry of Object.values(lock.vendors)) {
		const stats = treeStats(join(root, entry.path));
		entry.treeHash = stats.hash;
		entry.fileCount = stats.fileCount;
	}
	writeFileSync(lockPath, `${JSON.stringify(lock, null, "\t")}\n`);
	console.log(`Updated tree hashes in ${lockPath}`);
	for (const [name, entry] of Object.entries(lock.vendors)) {
		console.log(`  ${name}: ${entry.fileCount} files, ${entry.treeHash.slice(0, 12)}…`);
	}
	process.exit(0);
}

const errors = verifyVendorTrees(lock);
if (errors.length > 0) {
	console.error("Vendor pin verification failed:\n");
	for (const e of errors) console.error(`- ${e}\n`);
	console.error(
		"Do NOT run --update unless you intentionally changed vendor C sources.",
	);
	console.error(
		"For a dirty mlkem-native tree (full upstream clone leftovers), reset:\n  rm -rf vendor/mlkem-native && git checkout HEAD -- vendor/mlkem-native\n  pnpm fetch:vendors",
	);
	process.exit(1);
}

console.log("All vendor trees match vendor.lock.json");
for (const [name, entry] of Object.entries(lock.vendors)) {
	const n = entry.fileCount ?? "?";
	console.log(`  ${name}: ${n} files, ${entry.treeHash.slice(0, 12)}…`);
}
