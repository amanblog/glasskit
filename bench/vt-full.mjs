import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:8753/video-test.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.click('.srcbtn[data-s="canvas"]'); await p.waitForTimeout(900);
await p.screenshot({ path: "bench/vt-canvas-full.png" });
await p.click('.srcbtn[data-s="image"]'); await p.waitForTimeout(700);
await p.screenshot({ path: "bench/vt-image-full.png" });
await b.close();
