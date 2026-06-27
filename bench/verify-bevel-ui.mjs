import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(400);
const hasBevel = await p.$eval("#opticalSliders", el => !!el.querySelector("#sl_bevel"));
console.log("bevel slider present:", hasBevel);
// drag bevel to 0 and check the react code reflects it
await p.$eval("#sl_bevel", el => { el.value = 0; el.dispatchEvent(new Event("input",{bubbles:true})); });
await p.waitForTimeout(150);
await p.click('#tabs .tab:has-text("react")').catch(()=>{});
await p.waitForTimeout(120);
const react = await p.$eval("#code", el => el.textContent);
console.log("react emits bevel={0}:", react.includes("bevel={0}"));
console.log("console errors:", errs.length?errs.slice(0,3):"none");
await b.close();
