import { chromium } from "playwright-core";

const URL = "http://localhost:8753/index.html";
const modes = ["svg", "css", "svg-clone", "webgl", "auto"];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

for (const m of modes) {
  await page.click(`#modeSeg button[data-m="${m}"]`);
  await page.waitForTimeout(350);
  const info = await page.evaluate(() => {
    const g = document.querySelector("#glass");
    return {
      resolved: document.querySelector("#resolved")?.textContent?.trim(),
      backdrop: getComputedStyle(g).backdropFilter || getComputedStyle(g).webkitBackdropFilter,
      children: [...g.children].map((c) => c.tagName.toLowerCase() + (c.tagName === "CANVAS" ? "" : "")),
      hasCanvas: !!g.querySelector("canvas"),
      codeLen: document.querySelector("#code")?.textContent?.length || 0,
    };
  });
  console.log(`mode=${m.padEnd(9)} | ${info.resolved} | backdrop=${(info.backdrop || "none").slice(0, 28)} | kids=${info.children.join(",")} | code=${info.codeLen}b`);
  await page.screenshot({ path: `bench/smoke-${m}.png` });
}

// verify each code tab generates non-empty output
const tabReport = await page.evaluate(() => {
  const tabs = [...document.querySelectorAll("#tabs .tab")];
  const out = [];
  for (const t of tabs) { t.click(); out.push(t.textContent + ":" + (document.querySelector("#code").textContent.length)); }
  return out;
});
console.log("code tabs:", tabReport.join("  "));

console.log("\nERRORS:", errors.length ? "\n" + errors.join("\n") : "none ✓");
await browser.close();
process.exit(errors.length ? 1 : 0);
