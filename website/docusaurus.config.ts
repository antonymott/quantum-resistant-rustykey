import { createRequire } from "node:module"
import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"
import { parsePackageMeta } from "./src/lib/packageMeta"

/** Root package.json is the single source of truth for Node / pnpm versions in docs. */
const require = createRequire(import.meta.url)
const rootPkg = require("../package.json") as {
  engines?: { node?: string }
  packageManager?: string
}
const packageMeta = parsePackageMeta(rootPkg)

const config: Config = {
  title: "quantum-resistant-rustykey",
  tagline:
    "TypeScript-first WebAssembly post-quantum crypto for Node and the browser. Built for WebAuthn-scale signatures.",
  favicon: "img/favicon.png",

  future: {
    v4: true,
  },

  url: "https://antonymott.github.io",
  baseUrl: "/quantum-resistant-rustykey/",

  organizationName: "antonymott",
  projectName: "quantum-resistant-rustykey",
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  onBrokenLinks: "throw",

  // Injected into MDX via @site/src/components/PackageMeta
  customFields: {
    packageMeta,
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/antonymott/quantum-resistant-rustykey/tree/main/website/",
          sidebarCollapsed: false,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/logo.png",
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "quantum-resistant-rustykey",
      logo: {
        alt: "RustyKey",
        src: "img/logo.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://pqc.rustykey.me",
          label: "Testbed",
          position: "left",
        },
        {
          href: "https://www.npmjs.com/package/quantum-resistant-rustykey",
          label: "npm",
          position: "right",
        },
        {
          href: "https://github.com/antonymott/quantum-resistant-rustykey",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting started", to: "/docs/intro" },
            { label: "Signatures", to: "/docs/packages/signatures" },
            { label: "API overview", to: "/docs/reference/api" },
          ],
        },
        {
          title: "Package",
          items: [
            {
              label: "npm",
              href: "https://www.npmjs.com/package/quantum-resistant-rustykey",
            },
            {
              label: "GitHub",
              href: "https://github.com/antonymott/quantum-resistant-rustykey",
            },
            {
              label: "PQC testbed",
              href: "https://pqc.rustykey.me",
            },
          ],
        },
        {
          title: "About",
          items: [
            {
              label: "RustyKey®",
              href: "https://rustykey.io",
            },
            {
              label: "IETF cose-sqisign",
              href: "https://datatracker.ietf.org/doc/draft-mott-cose-sqisign/",
            },
          ],
        },
      ],
      copyright: `
        Copyright © ${new Date().getFullYear()} Antony R Mott / RustyKey®.
        Built with Docusaurus.
        RustyKey® is a FIDO Alliance member.
        FIDO® is a trademark of FIDO Alliance, Inc.
      `,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ["bash", "json", "http"],
    },
  } satisfies Preset.ThemeConfig,
}

export default config
