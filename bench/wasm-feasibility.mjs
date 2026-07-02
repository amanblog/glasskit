import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });

// Measure the ONLY CPU-bound JS in the library: buildMap (SDF displacement map).
// This is what WASM could theoretically accelerate. Everything else (backdrop-filter,
// feDisplacementMap, feGaussianBlur, WebGL shaders) runs in the browser's native/GPU
// pipeline, which WASM cannot touch.
const res = await p.evaluate(() => {
  function sdf(x, y, hw, hh, r) {
    var qx = Math.abs(x - hw) - (hw - r);
    var qy = Math.abs(y - hh) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }
  function clamp8(v) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }
  function buildMap(w, h) {
    var radius = 30, bezel = 22, splay = 0, curvature = 2.2, convexity = 1;
    var cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
    var ctx = cvs.getContext('2d');
    var img = ctx.createImageData(w, h), data = img.data;
    var hw = w / 2, hh = h / 2, r = Math.min(radius, hw, hh), b = Math.max(1, bezel);
    var exp = Math.max(0.3, curvature * (1 - 0.5 * splay));
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var d = sdf(x + 0.5, y + 0.5, hw, hh, r);
      var nx = sdf(x + 1.5, y + 0.5, hw, hh, r) - sdf(x - 0.5, y + 0.5, hw, hh, r);
      var nyv = sdf(x + 0.5, y + 1.5, hw, hh, r) - sdf(x + 0.5, y - 0.5, hw, hh, r);
      var nl = Math.hypot(nx, nyv) || 1, m = 0;
      if (d < 0 && d > -b) { var t = -d / b; m = Math.pow(1 - t, exp) * convexity; }
      var i = (y * w + x) * 4;
      data[i] = clamp8(128 - (nx / nl) * m * 127);
      data[i + 1] = clamp8(128 - (nyv / nl) * m * 127);
      data[i + 2] = 128; data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cvs.toDataURL();
  }
  const sizes = [
    ["button 160x44", 160, 44],
    ["card 340x210", 340, 210],
    ["modal 600x400", 600, 400],
    ["big 900x600", 900, 600],
    ["huge @2dpr 1800x1200", 1800, 1200],
  ];
  const out = [];
  for (const [name, w, h] of sizes) {
    buildMap(w, h); // warm
    const N = 8;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) buildMap(w, h);
    const ms = (performance.now() - t0) / N;
    out.push({ name, px: w * h, msPerBuild: +ms.toFixed(2) });
  }
  return out;
});

console.log("buildMap() — the only CPU-bound JS WASM could accelerate:\n");
for (const r of res) {
  console.log(`  ${r.name.padEnd(22)} ${String(r.px).padStart(9)} px   ${String(r.msPerBuild).padStart(7)} ms`);
}
console.log("\nNote: buildMap runs ONCE per setup and per resize — NOT per frame.");
console.log("Per-frame refraction/blur is browser-native (backdrop-filter / SVG / WebGL), not JS.");
await b.close();
