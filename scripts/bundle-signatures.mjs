import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const bundles = [
	{
		entry: join(root, "wasm/build/falcon-512-module.js"),
		outfile: join(root, "src/vendor/falcon512.js"),
	},
	{
		entry: join(root, "wasm/build/falcon-1024-module.js"),
		outfile: join(root, "src/vendor/falcon1024.js"),
	},
	{
		entry: join(root, "wasm/build/mldsa-65-module.js"),
		outfile: join(root, "src/vendor/mldsa65.js"),
	},
	{
		entry: join(root, "wasm/build/mldsa-87-module.js"),
		outfile: join(root, "src/vendor/mldsa87.js"),
	},
	{
		entry: join(root, "wasm/build/sqisign-lvl1-module.js"),
		outfile: join(root, "src/vendor/sqisignlvl1.js"),
	},
	{
		entry: join(root, "wasm/build/sqisign-lvl3-module.js"),
		outfile: join(root, "src/vendor/sqisignlvl3.js"),
	},
	{
		entry: join(root, "wasm/build/sqisign-lvl5-module.js"),
		outfile: join(root, "src/vendor/sqisignlvl5.js"),
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
		external: ["module", "fs", "path", "url"],
	});
}
