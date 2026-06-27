import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(600);
// rim present on the preview glass?
const hasRim = await p.$eval("#glass", el => [...el.children].some(c => c.style && c.style.maskComposite==="exclude" || (c.style && c.style.webkitMaskComposite==="xor")));
await p.locator("#stage").screenshot({ path: "bench/gen-preview.png" });
console.log("rim element present:", hasRim, "| console errors:", errs.length?errs.slice(0,3):"none");
await b.close();
