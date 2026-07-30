---
title: Building from source
description: Prerequisites and build steps for quantum-resistant-rustykey.
---

# Building from source

## Prerequisites

- **Node ≥ 26.5.0** and **pnpm** (see root `packageManager`)
- **Emscripten** or **Docker** — only if you run `pnpm build:vendor` to regenerate `src/vendor/*`

## Steps

```bash
git clone https://github.com/antonymott/quantum-resistant-rustykey.git
cd quantum-resistant-rustykey
pnpm i
```

Optional — clone mlkem-native if regenerating vendored bundles:

```bash
git clone --depth 1 https://github.com/pq-code-package/mlkem-native.git vendor/mlkem-native
pnpm build:vendor
```

Compile TypeScript / package dist:

```bash
pnpm build
```

## Project structure (ML-KEM path)

`mlkem-native` (C) → Emscripten under `wasm/` → TypeScript in `mlkem-src/` → bundled `src/vendor/mlkem*.js` → `tsdown` → `dist/`.
