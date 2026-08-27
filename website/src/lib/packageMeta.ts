/** Parsed tooling versions from the repo root package.json (source of truth). */

export type PackageMeta = {
  /** Raw engines.node, e.g. ">=26.7.0" */
  nodeEngines: string
  /** Prose form for docs, e.g. "≥ 26.7.0" */
  nodeEnginesDisplay: string
  /** Numeric / semver floor for badges, e.g. "26.7.0" */
  nodeVersion: string
  /** Raw packageManager, e.g. "pnpm@11.24.0" */
  packageManager: string
  /** pnpm version only, e.g. "11.24.0" */
  pnpmVersion: string
}

export function parsePackageMeta(pkg: {
  engines?: { node?: string }
  packageManager?: string
}): PackageMeta {
  const nodeEngines = pkg.engines?.node?.trim() || ">=0.0.0"
  const nodeVersion = nodeEngines.replace(/^(>=|>|<=|<|=|~|\^)\s*/, "")
  const nodeEnginesDisplay = nodeEngines
    .replace(/^>=\s*/, "≥ ")
    .replace(/^>\s*/, "> ")
    .replace(/^<=\s*/, "≤ ")
    .replace(/^<\s*/, "< ")

  const packageManager = pkg.packageManager?.trim() || "pnpm@0.0.0"
  const pnpmVersion = packageManager.replace(/^pnpm@/, "")

  return {
    nodeEngines,
    nodeEnginesDisplay,
    nodeVersion,
    packageManager,
    pnpmVersion,
  }
}
