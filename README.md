# Glasskit

**Drop-in Apple / Figma "Liquid Glass" for the web — and the generator that ships the code.**

The only liquid-glass tool that lets you **switch the rendering engine** (pure CSS · SVG
displacement · cross-browser clone · WebGL), apply it to **any element/shape**, **copy the
code in any framework**, and **measure the real performance cost** before you ship.

> npm: **`glasskit-js`** · global: **`Glasskit`** · web component: **`<glass-kit>`**

```
liquid-glass.js      ← the engine (zero deps, UMD + <glass-kit> web component)
liquid-glass.d.ts    ← TypeScript types
LiquidGlass.mjs      ← React/Next.js wrapper (default export, no JSX — works in any bundler)
package.json         ← npm package "glasskit-js"
demo.html            ← minimal standalone playground
site/                ← the generator website (static, deploy as-is)
  index.html · app.js · benchmark.html · liquid-glass.js
bench/               ← automated cross-browser benchmark runner (Playwright)
```

---

## The engine

### Modes — the switch nobody else gives you

| Mode | Real refraction | Browsers | Refracts | Best for |
|------|:---:|---|---|---|
| `css` | ✗ (blur) | **all** | live backdrop | default product UI, mobile, Safari/FF |
| `svg` | ✓ | **Chromium** | live backdrop | the "wow" surface on Chrome/Edge |
| `svg-clone` | ✓ | **all** | a cloned DOM element | cross-browser refraction over DOM |
| `webgl` | ✓ | **all** | an img/canvas/video | hero over a fixed background/video |
| `auto` | — | — | — | Chromium→`svg`, else `svg-clone` if `background` set, else `css` |

`svg-clone` is the cross-browser trick: Safari/Firefox don't allow an SVG filter in
`backdrop-filter`, so it **clones the background element and filters the clone** instead.
It refracts DOM, not `<canvas>` pixels — use `webgl` for canvas/video backgrounds.

### Params ↔ Figma's Glass panel

| Figma slider | Option | | Optical extras | Option |
|---|---|---|---|---|
| Frost | `frost` | | curvature (sphere→squircle) | `curvature` |
| Refraction | `refraction` | | convex↔concave | `convexity` |
| Depth | `depth` | | tint | `tint`, `tintOpacity` |
| Dispersion | `dispersion` | | corner radius | `radius` |
| Splay | `splay` | | | |
| Light (angle / %) | `lightAngle` / `lightIntensity` | | | |

### Usage

```html
<!-- vanilla / CDN -->
<script src="https://unpkg.com/glasskit-js"></script>
<script>
  const g = Glasskit.apply(document.querySelector('#card'), {
    mode: 'auto', frost: 8, refraction: 90, dispersion: 0.5
  });
  g.update({ frost: 12 });  // hot-update   ·   g.destroy();
</script>
```

```html
<!-- web component (registered automatically) -->
<glass-kit mode="auto" refraction="90" dispersion="0.5"
           style="width:340px;height:210px;border-radius:30px">Glass</glass-kit>
```

```jsx
// React
import Glass from 'glasskit-js/react';
<Glass as="button" mode="auto" refraction={90} dispersion={0.5}
       style={{ borderRadius: 999, padding: '14px 28px' }}>Get tickets</Glass>
```

### Shapes
Any **rounded rectangle (incl. pills & circles)** works with zero extra code — a
`ResizeObserver` regenerates the refraction map on resize. Arbitrary outlines (blobs,
SVG paths) keep the blur/tint/highlight via `clip-path`, but refraction edges assume a
rounded box; supply a custom displacement map for true custom outlines.

---

## The generator website (`site/`)

Static — no build step. Tune visually → switch engine → copy code for React, Vue,
vanilla, web component, CSS, or Tailwind. Plus a preset gallery and a benchmark page.

```bash
npx serve site         # or: python3 -m http.server --directory site
```

**Deploy to Cloudflare Pages:** create a Pages project, set the **build command empty**
and the **output/root directory to `site`**. Pure static files. (Vercel: framework
"Other", output dir `site`.) Then set your domain in the `og:`/`canonical` tags and add an
`og.png` (a generator script lives at `bench/og.mjs`).

---

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

---

## Releasing (CI)

Two GitHub Actions handle shipping:

- **`.github/workflows/pages.yml`** — deploys `site/` to GitHub Pages on every push to `main` that touches `site/`.
- **`.github/workflows/release.yml`** — publishes to npm when a `v*` tag is pushed (with provenance). Requires an `NPM_TOKEN` repo secret (npm automation token).

Cutting a release:

```bash
npm version patch        # bumps package.json + creates the vX.Y.Z tag & commit
git push --follow-tags   # CI verifies tag == version, then npm publish
```

To publish by hand instead: `npm publish --provenance --access public`.

## License
MIT — see [LICENSE](LICENSE).
