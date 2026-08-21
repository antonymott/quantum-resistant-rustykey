# WASM audit artifacts

CI (`Attest build provenance`) uploads `wasm-audit-sourcemaps` built with:

- pinned Emscripten from `vendor.lock.json`
- `-g -gsource-map`, `-s ASSERTIONS=1`, `-s STACK_OVERFLOW_CHECK=2`
- no `-s SINGLE_FILE` (separate `.wasm` + `.wasm.map`)

Maps list C sources such as `vendor/mlkem-native/mlkem/src/poly.c`. These are **not** the npm-shipped `SINGLE_FILE` modules (`src/vendor/`, checked by `pnpm verify:repro`).

Local: `pnpm build:audit` → `wasm/audit-build/` (gitignored).
