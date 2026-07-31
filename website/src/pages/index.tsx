import type { ReactNode } from "react"
import clsx from "clsx"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import Layout from "@theme/Layout"
import Heading from "@theme/Heading"

import styles from "./index.module.css"

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header className={clsx("hero hero--rk", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className="rk-install">pnpm i quantum-resistant-rustykey@latest</div>
        <div className="rk-actions">
          <Link className="button button--primary button--lg" to="/docs/intro">
            Read the docs
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://pqc.rustykey.me"
          >
            Open live testbed
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout
      title={`${siteConfig.title} docs`}
      description="WebAssembly post-quantum cryptography for Node and the browser — SQIsign, ML-DSA, FN-DSA, SLH-DSA, ML-KEM."
    >
      <HomepageHeader />
      <main>
        <section className="container margin-vert--lg">
          <div className="rk-card-grid">
            <div className="rk-card">
              <h3>WebAuthn-sized PQC</h3>
              <p>
                SQIsign targets the constrained CTAP2 buffer where Dilithium and Falcon-1024 do not
                fit — with a live testbed at pqc.rustykey.me.
              </p>
            </div>
            <div className="rk-card">
              <h3>TypeScript-first APIs</h3>
              <p>
                One shared signature interface across FN-DSA, ML-DSA, SQIsign, and SLH-DSA — plus
                ML-KEM loaders for Node and browsers.
              </p>
            </div>
            <div className="rk-card">
              <h3>Vetted C → WASM</h3>
              <p>
                Cryptographic cores come from upstream C (mlkem-native, Falcon, SQIsign) compiled with
                Emscripten — not a from-scratch rewrite.
              </p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}
