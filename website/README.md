# Website for https://antonymott.github.io/quantum-resistant-rustykey/

This is a [Docusaurus](https://docusaurus.io/) site (SimpleWebAuthn-inspired layout).

```bash
# from repo root
pnpm docs:dev      # http://localhost:3000/quantum-resistant-rustykey/
pnpm docs:build
pnpm docs:serve
```

Or:

```bash
cd website
pnpm install
pnpm start
```

Deploys automatically on merge to `main` via `.github/workflows/deploy-docs.yml` (GitHub Pages).

Enable Pages in the repo: **Settings → Pages → Source: GitHub Actions**.
