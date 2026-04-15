import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const crateDir = join(root, "fndsa-rs");
const outDir = join(root, "src/vendor/fndsa");

function run(command, args, cwd = root) {
	const result = spawnSync(command, args, { cwd, stdio: "inherit" });
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

run("rustup", ["target", "add", "wasm32-unknown-unknown"]);
run("wasm-pack", [
	"build",
	crateDir,
	"--target",
	"web",
	"--release",
	"--out-dir",
	outDir,
]);
