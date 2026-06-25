import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(500);
const aside = await p.$("aside");
await aside.screenshot({ path: "bench/shadow-control.png" });
await b.close();
