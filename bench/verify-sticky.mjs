import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(400);
// scroll main into view first (hero is above)
await p.evaluate(() => document.querySelector("main").scrollIntoView());
await p.waitForTimeout(200);
const stageTop1 = await p.$eval("#stage", el => Math.round(el.getBoundingClientRect().top));
const stageH = await p.$eval("#stage", el => Math.round(el.getBoundingClientRect().height));
// scroll down a lot (through the controls)
await p.evaluate(() => window.scrollBy(0, 500));
await p.waitForTimeout(200);
const stageTop2 = await p.$eval("#stage", el => Math.round(el.getBoundingClientRect().top));
const asideBottom = await p.$eval("aside", el => Math.round(el.getBoundingClientRect().bottom));
console.log("stage height:", stageH, "(viewport 800)");
console.log("stage top before scroll:", stageTop1, "| after scroll 500:", stageTop2, "(sticky if stays ~58)");
console.log("fits viewport:", stageH <= 800);
await b.close();
