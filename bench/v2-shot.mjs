import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
await p.screenshot({ path: "bench/v2-hero2.png" });
await b.close();
