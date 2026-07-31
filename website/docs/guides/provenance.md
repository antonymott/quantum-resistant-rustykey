---
title: Supply-chain provenance
description: Verify Sigstore / GitHub Artifact Attestations for published tarballs.
---

# Supply-chain provenance

Each release tarball can be built in GitHub Actions and signed with a Sigstore-backed **build provenance attestation** (keyless via GitHub OIDC). That proves the exact artifact was produced by this repository’s CI at a specific commit.

```bash
gh attestation verify "$(npm pack quantum-resistant-rustykey@<version> 2>/dev/null)" \
  --repo antonymott/quantum-resistant-rustykey
```

:::note What this proves
**Provenance** — who built it, which repo/commit, which workflow.  
It is **not** a bit-for-bit reproducible build and does **not** alone prove WASM ↔ C equivalence. Behavioural correctness is covered by tests / KATs.
:::

Publish flow for attested releases: run **Attest build provenance** → download the `npm-tarball` artifact (`.tgz`) → `npm publish ./quantum-resistant-rustykey-<v>.tgz` with 2FA.
