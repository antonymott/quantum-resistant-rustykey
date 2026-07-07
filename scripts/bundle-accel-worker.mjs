import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await build({
	entryPoints: [join(root, "src/sqisign-accel-worker.ts")],
	bundle: true,
	format: "esm",
	outfile: join(root, "dist/sqisign-accel-worker.js"),
	platform: "browser",
	target: ["esnext"],
	sourcemap: true,
	legalComments: "none",
	logLevel: "info",
	external: [
		"module",
		"fs",
		"path",
		"url",
		"node:module",
		"node:fs",
		"node:path",
		"node:url",
	],
});
