/* Renders the 1200×630 OG share image to site/og.png
 * by screenshotting the real hero (serve site/ on :8753 first). */
import { chromium } from "playwright-core";

const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1200); // fonts + glass shards settled
await p.addStyleTag({ content: ".skip{display:none} body::after{opacity:.03}" });
await p.screenshot({ path: "site/og.png" });
console.log("wrote site/og.png (2400×1260 @2x)");
await b.close();
