import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const lockPath = join(root, "vendor.lock.json");

/** Ephemeral / OS junk must not affect the pin (CI caches, laptops, etc.). */
const IGNORE_NAMES = new Set([
	".DS_Store",
	"Thumbs.db",
	".git",
	"node_modules",
	"__pycache__",
	".pytest_cache",
	".mypy_cache",
]);

export function loadVendorLock() {
	return JSON.parse(readFileSync(lockPath, "utf8"));
}

function shouldIgnoreName(name) {
	if (IGNORE_NAMES.has(name)) return true;
	if (name.endsWith(".pyc")) return true;
	return false;
}

/** List relative file paths under dir (sorted, stable). */
export function listVendorFiles(dir) {
	const files = [];
	function walk(current) {
		for (const name of readdirSync(current).sort()) {
			if (shouldIgnoreName(name)) continue;
			const full = join(current, name);
			const st = statSync(full);
			if (st.isDirectory()) walk(full);
			else if (st.isFile()) files.push(full);
		}
	}
	walk(dir);
	return files;
}

/** Stable SHA-256 over relative paths + file bytes (sorted). */
export function treeHash(dir) {
	const files = listVendorFiles(dir);
	const h = createHash("sha256");
	for (const full of files) {
		const rel = relative(dir, full).split("\\").join("/");
		const data = readFileSync(full);
		h.update(rel);
		h.update("\0");
		h.update(String(data.length));
		h.update("\0");
		h.update(data);
	}
	return h.digest("hex");
}

export function treeStats(dir) {
	const files = listVendorFiles(dir);
	const top = new Set();
	for (const full of files) {
		const rel = relative(dir, full).split("\\").join("/");
		top.add(rel.split("/")[0] ?? rel);
	}
	return {
		fileCount: files.length,
		topEntries: [...top].sort(),
		hash: (() => {
			const h = createHash("sha256");
			for (const full of files) {
				const rel = relative(dir, full).split("\\").join("/");
				const data = readFileSync(full);
				h.update(rel);
				h.update("\0");
				h.update(String(data.length));
				h.update("\0");
				h.update(data);
			}
			return h.digest("hex");
		})(),
	};
}

export function emscriptenImageRef(lock = loadVendorLock()) {
	const { image, tag, digest } = lock.emscripten;
	return `${image}:${tag}@${digest}`;
}

export function applyReproEnv(env = process.env, lock = loadVendorLock()) {
	const next = { ...env };
	next.SOURCE_DATE_EPOCH = String(lock.sourceDateEpoch);
	next.TZ = "UTC";
	next.LANG = "C";
	next.LC_ALL = "C";
	next.EMSCRIPTEN_DOCKER_IMAGE = emscriptenImageRef(lock);
	next.REQUIRE_REPRODUCIBLE = next.REQUIRE_REPRODUCIBLE ?? "1";
	// Fixed job count for deterministic archive/link ordering where relevant.
	next.SQISIGN_MAKE_JOBS = next.SQISIGN_MAKE_JOBS ?? "1";
	return next;
}

export function verifyVendorTrees(lock = loadVendorLock()) {
	const errors = [];
	for (const [name, entry] of Object.entries(lock.vendors)) {
		const path = join(root, entry.path);
		if (!existsSync(path)) {
			errors.push(`Missing vendor tree ${name} at ${entry.path}`);
			continue;
		}
		const stats = treeStats(path);
		if (
			typeof entry.fileCount === "number" &&
			stats.fileCount !== entry.fileCount
		) {
			errors.push(
				`Vendor ${name} fileCount mismatch:\n  expected ${entry.fileCount} files\n  actual   ${stats.fileCount} files\n  top-level: ${stats.topEntries.join(", ")}`,
			);
		}
		if (stats.hash !== entry.treeHash) {
			errors.push(
				`Vendor ${name} treeHash mismatch:\n  expected ${entry.treeHash}\n  actual   ${stats.hash}\n  files    ${stats.fileCount} (top-level: ${stats.topEntries.join(", ")})\n  hint     If this tree is a full upstream clone, reset it:\n           git checkout HEAD -- ${entry.path} && rm -rf ${entry.path}/.git`,
			);
		}
	}
	return errors;
}
