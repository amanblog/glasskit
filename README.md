# Glasskit

**Drop-in Apple / Figma "Liquid Glass" for the web.**

[![npm version](https://img.shields.io/npm/v/glasskit-js?color=8b5cf6&label=npm)](https://www.npmjs.com/package/glasskit-js)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/glasskit-js?color=8b5cf6)](https://bundlephobia.com/package/glasskit-js)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-8b5cf6)](https://www.npmjs.com/package/glasskit-js?activeTab=dependencies)
[![types included](https://img.shields.io/npm/types/glasskit-js?color=8b5cf6)](./liquid-glass.d.ts)
[![license MIT](https://img.shields.io/npm/l/glasskit-js?color=8b5cf6)](./LICENSE)

The only liquid-glass tool that lets you **switch the rendering engine** (pure CSS · SVG
displacement · cross-browser clone · WebGL), apply it to **any element/shape**, and use it
from **vanilla JS, a web component, or React** — with zero dependencies.

> 🎛️ **[Try the generator →](https://amanblog.github.io/glasskit/)** — tune it visually and copy the code in any framework.

```bash
npm i glasskit-js
```

> npm: **`glasskit-js`** · global: **`Glasskit`** · web component: **`<glass-kit>`**

---

## Usage

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

---

## Modes — the switch nobody else gives you

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

## Params ↔ Figma's Glass panel

| Figma slider | Option | | Optical extras | Option |
|---|---|---|---|---|
| Frost | `frost` | | curvature (sphere→squircle) | `curvature` |
| Refraction | `refraction` | | convex↔concave | `convexity` |
| Depth | `depth` | | tint | `tint`, `tintOpacity` |
| Dispersion | `dispersion` | | corner radius | `radius` |
| Splay | `splay` | | face gloss | `sheen`, `sheenColor`, `sheenAngle` |
| Light (angle / %) | `lightAngle` / `lightIntensity` | | drop shadow | `shadow` |

- **`tint`** takes either `"r,g,b"` (paired with `tintOpacity`) **or a full CSS gradient** — `tint="linear-gradient(180deg, rgba(255,255,255,.2), rgba(19,19,19,.22))"`.
- **`sheen`** is the diagonal face gloss (`0` = off). **`sheenColor`** takes `"r,g,b"` **or any CSS color** (`rgb()`/`rgba()`/`hsl()`/hex/named). **`sheenAngle`** rotates the gloss in degrees; omit it (or `null`) to follow `lightAngle`.
- **`radius`** sets `border-radius` on the element *and* the refraction map — `radius={999}` alone gives you a pill; no need to also set it in `style`.
- **`shadow`** is any CSS `box-shadow` (`"none"` removes it); the inner light border/bezel follow `lightIntensity`.

## Shapes

Any **rounded rectangle (incl. pills & circles)** works with zero extra code — a
`ResizeObserver` regenerates the refraction map on resize. Arbitrary outlines (blobs,
SVG paths) keep the blur/tint/highlight via `clip-path`, but refraction edges assume a
rounded box; supply a custom displacement map for true custom outlines.

---

Built something with it, or want to hack on the engine, generator, or benchmark?
See **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

## License

MIT — see [LICENSE](./LICENSE).
