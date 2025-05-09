import { defineConfig } from "tsup"

export default defineConfig({
    entry: ["src/index.ts"],
    clean: false,
    format: ["esm"],
    sourcemap: true,
    splitting: true,
    dts: true,
    outDir: "install"
})