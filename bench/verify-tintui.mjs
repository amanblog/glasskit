import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport:{width:1400,height:950} });
const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(400);
const present = await p.$("#tintColor") !== null;
// set tint color + opacity, check react code emits tint
await p.$eval("#tintColor", el => { el.value="#455151"; el.dispatchEvent(new Event("input",{bubbles:true})); });
await p.$eval("#sl_tintOpacity", el => { el.value=0.3; el.dispatchEvent(new Event("input",{bubbles:true})); });
await p.waitForTimeout(150);
await p.click('#tabs .tab:has-text("react")').catch(()=>{});
await p.waitForTimeout(120);
const react = await p.$eval("#code", el => el.textContent);
console.log("tint picker present:", present);
console.log("react emits tint=\"69,81,81\":", react.includes('tint="69,81,81"'));
console.log("console errors:", errs.length?errs.slice(0,2):"none");
await b.close();
