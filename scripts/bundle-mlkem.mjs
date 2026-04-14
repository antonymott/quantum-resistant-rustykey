import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const bundles = [
	{
		entry: join(root, "mlkem-src/mlkem768.ts"),
		outfile: join(root, "src/vendor/mlkem.js"),
	},
	{
		entry: join(root, "mlkem-src/mlkem512.ts"),
		outfile: join(root, "src/vendor/mlkem512.js"),
	},
	{
		entry: join(root, "mlkem-src/mlkem1024.ts"),
		outfile: join(root, "src/vendor/mlkem1024.js"),
	},
];

for (const { entry, outfile } of bundles) {
	await build({
		entryPoints: [entry],
		bundle: true,
		format: "esm",
		outfile,
		platform: "neutral",
		target: ["esnext"],
		sourcemap: false,
		legalComments: "none",
		logLevel: "info",
		// Emscripten 3.1+ may emit `await import("module")` for Node; keep it external so esbuild can bundle for web + Node.
		external: ["module", "fs", "path", "url"],
	});
}
