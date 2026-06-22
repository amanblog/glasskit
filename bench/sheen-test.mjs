import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });
await p.click(`#modeSeg button[data-m="svg-clone"]`);
await p.waitForTimeout(300);
const stage = await p.$("#stage");

async function setSheen(v) {
  await p.evaluate((v) => {
    const s = document.querySelector("#sl_sheen");
    s.value = v; s.dispatchEvent(new Event("input", { bubbles: true }));
  }, v);
  await p.waitForTimeout(400);
}
await setSheen(0.7); await stage.screenshot({ path: "bench/sheen-on.png" });
await setSheen(0); await stage.screenshot({ path: "bench/sheen-off.png" });

// confirm code export carries sheen
const code = await p.evaluate(() => {
  [...document.querySelectorAll("#tabs .tab")].find((t) => t.textContent === "vanilla").click();
  return document.querySelector("#code").textContent;
});
console.log("vanilla code has sheen:", /sheen:/.test(code) ? "yes ✓" : "NO");
console.log("sheen line:", code.split("\n").find((l) => /sheen/.test(l))?.trim());
await b.close();
