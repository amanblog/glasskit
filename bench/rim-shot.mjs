import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 920, height: 260 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:8753/_rimtest.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.locator(".grid").screenshot({ path: "bench/rim.png" });
await b.close();
