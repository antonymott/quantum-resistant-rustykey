#!/usr/bin/env node
/**
 * Verify pinned vendor C trees against vendor.lock.json tree hashes.
 * In-tree vendors are the source of truth (including SQIsign CMake patches).
 * Use --update to rewrite treeHash values after intentional vendor bumps.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	loadVendorLock,
	lockPath,
	root,
	treeHash,
	verifyVendorTrees,
} from "./lib/vendor-lock.mjs";

const update = process.argv.includes("--update");
const lock = loadVendorLock();

if (update) {
	for (const entry of Object.values(lock.vendors)) {
		entry.treeHash = treeHash(join(root, entry.path));
	}
	writeFileSync(lockPath, `${JSON.stringify(lock, null, "\t")}\n`);
	console.log(`Updated tree hashes in ${lockPath}`);
	process.exit(0);
}

const errors = verifyVendorTrees(lock);
if (errors.length > 0) {
	console.error("Vendor pin verification failed:\n");
	for (const e of errors) console.error(`- ${e}`);
	console.error(
		"\nIf you intentionally updated vendor C sources, run: pnpm fetch:vendors -- --update",
	);
	process.exit(1);
}

console.log("All vendor trees match vendor.lock.json");
for (const [name, entry] of Object.entries(lock.vendors)) {
	console.log(`  ${name}: ${entry.treeHash.slice(0, 12)}…`);
}
