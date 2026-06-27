import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(500);
const sliders = await p.evaluate(() => {
  const v = id => { const el=document.getElementById(id); return el?el.value:null; };
  return { sheen:v("sl_sheen"), tintOpacity:v("sl_tintOpacity"), bevel:v("sl_bevel"),
           shadowSel: document.getElementById("shadowPreset").value,
           advanced: [...document.querySelectorAll("#advancedSliders input")].map(i=>i.id),
           figma: [...document.querySelectorAll("#figmaSliders input")].map(i=>i.id) };
});
console.log(JSON.stringify(sliders,null,0));
console.log("errors:", errs.length?errs.slice(0,3):"none");
await b.close();
