import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const required = [
	join(root, "dist", "index.js"),
	join(root, "dist", "index.d.ts"),
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0) {
	console.error("Missing required dist artifacts:");
	for (const path of missing) {
		console.error(`  - ${path}`);
	}
	console.error("Run `pnpm build` before publish.");
	process.exit(1);
}

console.log("dist artifacts verified.");
