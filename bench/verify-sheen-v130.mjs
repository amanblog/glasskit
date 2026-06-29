import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });

// 1) Engine: sheenColor accepts a full CSS color (rgb()) -> color-mix in the gloss
const r = await p.evaluate(() => {
  const el = document.createElement("div");
  el.style.cssText = "width:200px;height:120px;border-radius:20px";
  document.body.appendChild(el);
  const g = LiquidGlass.apply(el, { mode: "css", sheen: 0.8, sheenColor: "rgb(255,80,80)", sheenAngle: 120 });
  const ov = el.parentNode.querySelector(":scope > *"); // overlay is a child layer
  // find the overlay layer (the one with a linear-gradient background)
  let bg = "";
  el.querySelectorAll("*").forEach((n) => { const s = getComputedStyle(n).background; if (/linear-gradient/.test(s)) bg = s; });
  // overlay may be sibling/child; scan element subtree + the element itself
  if (!bg) { const s = getComputedStyle(el).background; if (/linear-gradient/.test(s)) bg = s; }
  return { version: LiquidGlass.version, bg, mode: g.mode };
});
console.log("engine version:", r.version);
console.log("resolved mode:", r.mode);
console.log("gloss bg:", r.bg.slice(0, 220));
console.log("uses color-mix (full CSS color accepted):", /color-mix/.test(r.bg) ? "yes ✓" : "NO ✗");
console.log("angle 120deg applied:", /120deg/.test(r.bg) ? "yes ✓" : "NO ✗");

// 2) Engine: bare r,g,b triplet still works (back-compat) -> rgba()
const r2 = await p.evaluate(() => {
  const el = document.createElement("div");
  el.style.cssText = "width:200px;height:120px;border-radius:20px";
  document.body.appendChild(el);
  LiquidGlass.apply(el, { mode: "css", sheen: 0.8, sheenColor: "255,200,150" });
  let bg = ""; el.querySelectorAll("*").forEach((n) => { const s = getComputedStyle(n).background; if (/linear-gradient/.test(s)) bg = s; });
  if (!bg) { const s = getComputedStyle(el).background; if (/linear-gradient/.test(s)) bg = s; }
  return bg;
});
console.log("triplet back-compat (rgba, no color-mix):", /rgba\(255, 200, 150/.test(r2) && !/color-mix/.test(r2) ? "yes ✓" : "NO ✗");

// 3) Engine: sheenAngle null follows lightAngle (lightAngle -30 -> 60deg)
const r3 = await p.evaluate(() => {
  const el = document.createElement("div");
  el.style.cssText = "width:200px;height:120px;border-radius:20px";
  document.body.appendChild(el);
  LiquidGlass.apply(el, { mode: "css", sheen: 0.8, lightAngle: -30 });
  let bg = ""; el.querySelectorAll("*").forEach((n) => { const s = getComputedStyle(n).background; if (/linear-gradient/.test(s)) bg = s; });
  if (!bg) { const s = getComputedStyle(el).background; if (/linear-gradient/.test(s)) bg = s; }
  return bg;
});
console.log("sheenAngle null follows light (60deg):", /60deg/.test(r3) ? "yes ✓" : "NO ✗ -> " + r3.slice(0,80));

// 4) Generator: sheenAngle slider exists, and export only includes it when changed
const genDefault = await p.evaluate(() => {
  const sl = document.querySelector("#sl_sheenAngle");
  [...document.querySelectorAll("#tabs .tab")].find((t) => t.textContent === "vanilla").click();
  return { hasSlider: !!sl, code: document.querySelector("#code").textContent };
});
console.log("generator has sheen-angle slider:", genDefault.hasSlider ? "yes ✓" : "NO ✗");
console.log("export omits sheenAngle by default:", /sheenAngle/.test(genDefault.code) ? "NO ✗" : "yes ✓");

const genChanged = await p.evaluate(() => {
  const s = document.querySelector("#sl_sheenAngle");
  s.value = 135; s.dispatchEvent(new Event("input", { bubbles: true }));
  [...document.querySelectorAll("#tabs .tab")].find((t) => t.textContent === "vanilla").click();
  return document.querySelector("#code").textContent;
});
console.log("export includes sheenAngle when changed:", /sheenAngle:\s*135/.test(genChanged) ? "yes ✓" : "NO ✗");

await b.close();
