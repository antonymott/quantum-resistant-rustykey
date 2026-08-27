import type { ReactElement } from "react"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import type { PackageMeta as PackageMetaFields } from "../lib/packageMeta"

function usePackageMeta(): PackageMetaFields {
  const { siteConfig } = useDocusaurusContext()
  return siteConfig.customFields?.packageMeta as PackageMetaFields
}

/** Renders engines.node as “≥ 26.7.0” (from root package.json). */
export function NodeEnginesDisplay(): ReactElement {
  return <>{usePackageMeta().nodeEnginesDisplay}</>
}

/** Renders “Requires Node ≥ ….” from root package.json. */
export function NodeRequirement(): ReactElement {
  return (
    <>
      Requires <strong>Node {usePackageMeta().nodeEnginesDisplay}</strong>.
    </>
  )
}

/** Renders “Node ≥ … and pnpm” for prerequisite lists. */
export function NodeAndPnpmPrerequisite(): ReactElement {
  const meta = usePackageMeta()
  return (
    <>
      <strong>Node {meta.nodeEnginesDisplay}</strong> and <strong>pnpm</strong> (see root{" "}
      <code>packageManager</code>)
    </>
  )
}
