import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:8753/video-test.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);

for (const id of ["c_css", "c_svg", "c_clone", "c_webgl"]) {
  const el = await p.$("#" + id);
  await el.screenshot({ path: `bench/vt-${id}.png` });
}

// is the cloned canvas inside the clone card actually blank?
const cloneInfo = await p.evaluate(() => {
  const card = document.querySelector("#c_clone");
  const inner = card.querySelector("canvas");
  if (!inner) return { hasCanvasClone: false };
  const c = document.createElement("canvas");
  c.width = inner.width || 10; c.height = inner.height || 10;
  let nonZero = 0;
  try {
    const g = c.getContext("2d");
    g.drawImage(inner, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) nonZero++;
  } catch (e) { return { hasCanvasClone: true, error: e.message }; }
  return { hasCanvasClone: true, w: inner.width, h: inner.height, nonZeroPixels: nonZero };
});
console.log("clone-card inner canvas:", JSON.stringify(cloneInfo));
await b.close();
