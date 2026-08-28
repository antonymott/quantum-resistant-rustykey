import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  docsSidebar: [
    "intro",
    {
      type: "category",
      label: "Packages",
      collapsed: false,
      items: [
        "packages/overview",
        "packages/ml-kem",
        "packages/signatures",
        "packages/slh-dsa",
        "packages/sqisign-webgpu",
      ],
    },
    {
      type: "category",
      label: "Guides",
      collapsed: false,
      items: [
        "guides/security",
        "guides/sqisign-wasm",
        "guides/building",
        "guides/testing",
        "guides/provenance",
      ],
    },
    {
      type: "category",
      label: "Reference",
      collapsed: false,
      items: [
        "reference/api",
        "reference/vc-rest",
        "reference/performance",
      ],
    },
  ],
}

export default sidebars
