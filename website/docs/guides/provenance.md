---
title: Supply-chain provenance
description: Sigstore attestations and reproducible C→WASM verification.
---

# Supply-chain provenance

Two complementary checks:

| Check | What it proves |
|---|---|
| **Sigstore / GitHub Artifact Attestations** | This npm tarball was built by this repo’s CI at a specific commit |
| **Reproducible WASM (`verify:repro`)** | Shipped `src/vendor/*.js` WASM bundles match a rebuild from the pinned C trees under the pinned Emscripten image |

```bash
# Provenance (Option A)
gh attestation verify "$(npm pack quantum-resistant-rustykey@<version> 2>/dev/null)" \
  --repo antonymott/quantum-resistant-rustykey

# Reproducible C→WASM (Option B)
git checkout <tag>
pnpm i
pnpm fetch:vendors
REQUIRE_REPRODUCIBLE=1 pnpm build:vendor
pnpm verify:repro
```

Pins live in [`vendor.lock.json`](https://github.com/antonymott/quantum-resistant-rustykey/blob/main/vendor.lock.json) (vendor tree hashes + Emscripten image digest). Expected WASM hashes are in `repro.hashes.json`.

:::note What provenance does *not* prove
Sigstore alone is **not** a bit-for-bit reproducible build and does **not** alone prove WASM ↔ C equivalence. Use `pnpm verify:repro` for that.
:::

## Public source maps (audit artifacts)

CI also builds **audit** modules with `-g -gsource-map`, `ASSERTIONS`, and `STACK_OVERFLOW_CHECK` (no `-s SINGLE_FILE`). Download the `wasm-audit-sourcemaps` artifact from the **Attest build provenance** workflow run. Full compile logs are in the `build-log` artifact / Actions log.

Audit builds are for reviewers; npm still ships the production `SINGLE_FILE` bundles verified by `verify:repro`.

## Publish flow

Run **Attest build provenance** → download `npm-tarball` (`.tgz`) → `npm publish ./quantum-resistant-rustykey-<v>.tgz` with 2FA. Publishing a laptop rebuild breaks attestation verification for users.
