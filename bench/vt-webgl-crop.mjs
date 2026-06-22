import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PAGEERR: "+e.message));
await p.goto("http://localhost:8753/video-test.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.click('.srcbtn[data-s="canvas"]'); await p.waitForTimeout(900);
await (await p.$("#c_webgl")).screenshot({ path: "bench/vt-webgl-after.png" });
console.log("errors:", errs.length?errs:"none");
await b.close();
