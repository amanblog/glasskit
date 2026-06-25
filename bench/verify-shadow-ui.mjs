import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs=[]; p.on("pageerror",e=>errs.push("PAGEERR: "+e.message));
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(400);

const overlayShadow = () => p.$eval("#glass", el => { const o = [...el.children].find(c => c.style && c.style.zIndex === "2"); return o ? o.style.boxShadow : "(no overlay)"; });
const codeFor = async (tab) => { await p.click(`#tabs .tab:has-text("${tab}")`).catch(()=>{}); await p.waitForTimeout(120); return p.$eval("#code", el => el.textContent); };

console.log("default overlay has drop:", (await overlayShadow()).includes("8px 30px"));

// pick "None"
await p.selectOption("#shadowPreset", "none"); await p.waitForTimeout(150);
console.log("none -> overlay drop gone:", !(await overlayShadow()).includes("8px 30px"));
let css = await codeFor("css");
console.log("none -> css omits drop   :", !css.includes("0 8px 30px") && !/0,0,0,0\.18/.test(css));

// pick "Strong"
await p.selectOption("#shadowPreset", "0 24px 70px rgba(0,0,0,0.45)"); await p.waitForTimeout(150);
console.log("strong -> overlay 24px 70:", (await overlayShadow()).includes("24px 70px"));
let react = await codeFor("react");
console.log("strong -> react has shadow:", react.includes('shadow="0 24px 70px rgba(0,0,0,0.45)"'));
let wc = await codeFor("web component");
console.log("strong -> wc has shadow   :", wc.includes('shadow="0 24px 70px rgba(0,0,0,0.45)"'));
let tw = await codeFor("tailwind");
console.log("strong -> tailwind underscores:", tw.includes("0_24px_70px_rgba(0,0,0,0.45)"));

// Custom
await p.selectOption("#shadowPreset", "__custom"); await p.waitForTimeout(100);
await p.fill("#shadowCustom", "0 0 0 2px red"); await p.waitForTimeout(150);
console.log("custom -> overlay has red :", (await overlayShadow()).toLowerCase().includes("red") || (await overlayShadow()).includes("255, 0, 0"));
let van = await codeFor("vanilla");
console.log("custom -> vanilla has it  :", van.includes("shadow: '0 0 0 2px red'"));

// Default again -> code omits shadow everywhere
await p.selectOption("#shadowPreset", "0 8px 30px rgba(0,0,0,0.18)"); await p.waitForTimeout(150);
let react2 = await codeFor("react");
console.log("default -> react omits shadow:", !react2.includes("shadow="));

console.log("console errors:", errs.length?errs:"none");
await b.close();
