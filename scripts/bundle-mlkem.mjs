import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
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
	if (!existsSync(entry)) {
		if (existsSync(outfile)) {
			console.warn(
				`Skipping ML-KEM rebundle; missing source ${entry}. Using existing ${outfile}.`,
			);
			continue;
		}
		throw new Error(
			`Missing ML-KEM bundle source ${entry} and no existing artifact at ${outfile}.`,
		);
	}

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
