import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const bundles = [
	{
		entry: join(root, "mlkem-src/mlkem768.ts"),
		outfile: join(root, "src/vendor/mlkem.js"),
		requiredInputs: [join(root, "wasm/build/wasm-module.js")],
	},
	{
		entry: join(root, "mlkem-src/mlkem512.ts"),
		outfile: join(root, "src/vendor/mlkem512.js"),
		requiredInputs: [join(root, "wasm/build/wasm-module-512.js")],
	},
	{
		entry: join(root, "mlkem-src/mlkem1024.ts"),
		outfile: join(root, "src/vendor/mlkem1024.js"),
		requiredInputs: [join(root, "wasm/build/wasm-module-1024.js")],
	},
];

for (const { entry, outfile, requiredInputs } of bundles) {
	const hasEntry = existsSync(entry);
	const missingRequired = (requiredInputs ?? []).filter(
		(path) => !existsSync(path),
	);

	if (!hasEntry || missingRequired.length > 0) {
		if (existsSync(outfile)) {
			console.warn(
				`Skipping ML-KEM rebundle; missing source inputs. Using existing ${outfile}.`,
			);
			if (!hasEntry) {
				console.warn(` - missing entry: ${entry}`);
			}
			for (const path of missingRequired) {
				console.warn(` - missing dependency: ${path}`);
			}
			continue;
		}
		throw new Error(
			`Missing ML-KEM source inputs and no existing artifact at ${outfile}.`,
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
}
