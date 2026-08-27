#!/usr/bin/env node
/**
 * Keep static docs (README badge, website packageManager) aligned with root
 * package.json `engines.node` + `packageManager`. Docusaurus pages also read
 * these at build time via website/docusaurus.config.ts customFields.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))

const nodeEngines = String(pkg.engines?.node ?? "").trim()
if (!nodeEngines) {
  console.error("Missing engines.node in package.json")
  process.exit(1)
}
const nodeVersion = nodeEngines.replace(/^(>=|>|<=|<|=|~|\^)\s*/, "")
const packageManager = String(pkg.packageManager ?? "").trim()
if (!packageManager) {
  console.error("Missing packageManager in package.json")
  process.exit(1)
}

function replaceOnce(path, pattern, replacement, label) {
  const before = readFileSync(path, "utf8")
  if (!pattern.test(before)) {
    console.error(`No match for ${label} in ${path}`)
    process.exit(1)
  }
  const after = before.replace(pattern, replacement)
  if (after !== before) {
    writeFileSync(path, after)
    console.log(`Updated ${label}: ${path}`)
  } else {
    console.log(`Already current ${label}: ${path}`)
  }
}

replaceOnce(
  join(root, "README.md"),
  /!\[Node v[\d.]+\]\(https:\/\/img\.shields\.io\/badge\/node-v[\d.]+-blue\.svg\)/,
  `![Node v${nodeVersion}](https://img.shields.io/badge/node-v${nodeVersion}-blue.svg)`,
  "Node badge",
)

const websitePkgPath = join(root, "website", "package.json")
const websitePkg = JSON.parse(readFileSync(websitePkgPath, "utf8"))
let websiteChanged = false
if (websitePkg.engines?.node !== nodeEngines) {
  websitePkg.engines = { ...(websitePkg.engines ?? {}), node: nodeEngines }
  websiteChanged = true
}
if (websitePkg.packageManager !== packageManager) {
  websitePkg.packageManager = packageManager
  websiteChanged = true
}
if (websiteChanged) {
  writeFileSync(websitePkgPath, `${JSON.stringify(websitePkg, null, 2)}\n`)
  console.log("Updated website/package.json engines/packageManager from root")
} else {
  console.log("Already current: website/package.json tooling fields")
}

console.log(
  `Synced tooling docs from engines.node=${nodeEngines}, packageManager=${packageManager}`,
)
