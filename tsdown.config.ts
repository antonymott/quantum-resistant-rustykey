import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: "esm",
	platform: "neutral",
	outDir: "dist",
	dts: true,
	sourcemap: true,
	clean: true,
	// Keep dist/index.js to match package.json "main" / "exports"
	fixedExtension: false,
	// Emscripten glue may reference Node built-ins; keep them external at bundle time.
	deps: {
		neverBundle: ["module", "fs", "path", "url", "node:fs/promises"],
	},
});
