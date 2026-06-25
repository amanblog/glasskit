# Contributing / Development

Maintainer notes for the Glasskit repo. End-user docs live in [README.md](./README.md).

## Repo layout

```
liquid-glass.js      ← the engine (zero deps, UMD + <glass-kit> web component)
liquid-glass.d.ts    ← TypeScript types
LiquidGlass.mjs      ← React/Next.js wrapper (default export, no JSX — works in any bundler)
LiquidGlass.d.ts     ← React wrapper types
package.json         ← npm package "glasskit-js"
demo.html            ← minimal standalone playground
site/                ← the generator website (static, deploy as-is)
  index.html · app.js · benchmark.html · liquid-glass.js
bench/               ← automated cross-browser benchmark runner (Playwright)
```

> ⚠️ The engine is duplicated at `site/liquid-glass.js` for the static site. After editing
> the root `liquid-glass.js`, copy it over: `cp liquid-glass.js site/liquid-glass.js`.

## The generator website (`site/`)

Static — no build step. Tune visually → switch engine → copy code for React, Vue,
vanilla, web component, CSS, or Tailwind. Plus a preset gallery and a benchmark page.

```bash
npx serve site         # or: python3 -m http.server --directory site
```

The live site is auto-deployed to **GitHub Pages** on every push to `main` that touches
`site/` (see `.github/workflows/pages.yml`). To host elsewhere — e.g. **Cloudflare Pages**
— create a project with an **empty build command** and **output/root directory `site`**
(Vercel: framework "Other", output dir `site`), then set your domain in the
`og:`/`canonical` tags and regenerate `og.png` via `bench/og.mjs`.

## The benchmark

**In-browser** (`site/benchmark.html`): spawns batches of glass elements per engine,
animates them over a live backdrop, and records **avg/min FPS, avg & p95 frame time,
jank %, and JS heap**. Results are saved per browser in `localStorage`, so running it in
Chrome → Safari → Firefox builds a cross-browser comparison. Export JSON anytime.

**Automated** (`bench/run-playwright.mjs`): drives the page across every installed engine.

```bash
npm i                                   # installs playwright-core
npm run bench                           # uses your installed Chrome
node bench/run-playwright.mjs --dur 2.5 --counts 1,5,15,30,60 --modes css,svg,svg-clone,webgl
npx playwright install webkit firefox   # to also bench Safari & Firefox engines
```
Writes `bench/results.json` and `bench/results.csv`.

> Note: headless reports vsync-capped 60fps; real differences show under load and on
> retina (`dpr 2`). `svg-clone` is the heaviest (one clone per element); `webgl` is
> capped by the browser's ~8–16 live GL contexts — both are surfaced as findings.

## Releasing

Publishing runs on a version tag via **npm Trusted Publishing (OIDC)** — no token,
provenance generated automatically (`.github/workflows/release.yml`). The trusted
publisher is already configured on npm (repo `amanblog/glasskit`, workflow `release.yml`).

```bash
npm version patch        # bumps package.json + creates the vX.Y.Z tag & commit
git push --follow-tags   # CI verifies tag == version, then publishes with provenance
```

The publish step is idempotent — re-pushing an existing version's tag is a no-op, not a
failure. Keep the engine's `version` string (bottom of `liquid-glass.js`) in sync with
`package.json` when bumping.
