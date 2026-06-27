import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:8753/_figtune.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.locator(".scene").screenshot({ path: "bench/figtune.png" });
await b.close();
