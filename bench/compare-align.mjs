import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });

await p.click(`#modeSeg button[data-m="webgl"]`);
await p.waitForTimeout(300);
await p.evaluate(() => {
  const s = document.querySelector("#stage").getBoundingClientRect();
  const g = document.querySelector("#glass");
  g.style.left = (s.width * 0.78 - 170) + "px";
  g.style.top = (s.height * 0.16 - 105) + "px";
});
await p.waitForTimeout(500);
const rect = await p.evaluate(() => {
  const r = document.querySelector("#glass").getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
});

// A: the refracted card
await p.screenshot({ path: "bench/cmp-webgl.png", clip: rect });
// B: the actual canvas behind it (hide the glass overlay/canvas + content)
await p.evaluate(() => { document.querySelector("#glass").style.visibility = "hidden"; });
await p.waitForTimeout(150);
await p.screenshot({ path: "bench/cmp-behind.png", clip: rect });

// also dump the numbers the shader uses
const nums = await p.evaluate(() => {
  const g = document.querySelector("#glass").getBoundingClientRect();
  const c = document.querySelector("#sceneCanvas");
  const cr = c.getBoundingClientRect();
  return { glass: { l: g.left, t: g.top, w: g.width, h: g.height },
           canvasRect: { l: cr.left, t: cr.top, w: cr.width, h: cr.height },
           canvasBacking: { w: c.width, h: c.height } };
});
console.log(JSON.stringify(nums, null, 2));
await b.close();
