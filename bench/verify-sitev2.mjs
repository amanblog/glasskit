import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(800);

// hero + shards applied?
const hero = await p.evaluate(() => {
  const shards = [...document.querySelectorAll("[data-hero-glass]")];
  return {
    shards: shards.length,
    glassed: shards.filter((s) => s.querySelector("svg filter, div")).length,
    h1: document.querySelector("h1")?.textContent.trim().slice(0, 60),
    serif: getComputedStyle(document.querySelector("h1")).fontFamily.includes("Instrument"),
  };
});
console.log("hero:", JSON.stringify(hero));
await p.screenshot({ path: "bench/v2-hero.png" });

// generator functional sweep
await p.click(".btnPrimary");
await p.waitForTimeout(700);
await p.screenshot({ path: "bench/v2-generator.png" });

const gen = await p.evaluate(async () => {
  const out = {};
  // mode switch
  document.querySelector('#modeSeg button[data-m="css"]').click();
  await new Promise((r) => setTimeout(r, 300));
  out.modeCss = document.querySelector("#resolved").textContent.includes("css");
  document.querySelector('#modeSeg button[data-m="svg"]').click();
  await new Promise((r) => setTimeout(r, 300));
  // slider
  const s = document.querySelector("#sl_frost");
  s.value = 20; s.dispatchEvent(new Event("input", { bubbles: true }));
  out.sliderVal = document.querySelector("#v_frost").textContent;
  // preset chip
  const chip = [...document.querySelectorAll("#presets .chip")].find((c) => /Frosted/.test(c.textContent));
  chip.click();
  await new Promise((r) => setTimeout(r, 300));
  out.preset = document.querySelector("#v_frost").textContent;
  // shape select
  const sh = document.querySelector("#shape");
  sh.value = "pill"; sh.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  out.shapeW = document.querySelector("#glass").style.width;
  sh.value = "card"; sh.dispatchEvent(new Event("change", { bubbles: true }));
  // tabs + code + copy
  const tabs = [...document.querySelectorAll("#tabs .tab")].map((t) => t.textContent);
  out.tabs = tabs.join(",");
  [...document.querySelectorAll("#tabs .tab")].find((t) => t.textContent === "vanilla").click();
  out.codeHasApply = /Glasskit\.apply/.test(document.querySelector("#code").textContent);
  // shadow custom row toggle
  const sp = document.querySelector("#shadowPreset");
  sp.value = "__custom"; sp.dispatchEvent(new Event("change", { bubbles: true }));
  out.customRow = document.querySelector("#shadowCustomRow").style.display;
  sp.value = "none"; sp.dispatchEvent(new Event("change", { bubbles: true }));
  // tint & sheen pickers exist
  out.pickers = !!document.querySelector("#tintColor") && !!document.querySelector("#sheenColor");
  // swatches
  out.swatches = document.querySelectorAll("#swatches .swatch").length;
  return out;
});
console.log("generator:", JSON.stringify(gen, null, 1));

// drag the glass
const g = await p.$("#glass");
const bb = await g.boundingBox();
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await p.mouse.down();
await p.mouse.move(bb.x + bb.width / 2 + 80, bb.y + bb.height / 2 + 40, { steps: 5 });
await p.mouse.up();
const bb2 = await g.boundingBox();
console.log("drag moved:", Math.round(bb2.x - bb.x), Math.round(bb2.y - bb.y), "(expect ~80,40)");

// full page + mobile
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(300);
await p.screenshot({ path: "bench/v2-full.png", fullPage: true });
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(500);
await p.screenshot({ path: "bench/v2-mobile.png", fullPage: true });

console.log("errors:", errors.length ? errors.join("\n") : "none ✓");
await b.close();
