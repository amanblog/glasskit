import { chromium } from "playwright-core";

const URL = "http://localhost:8753/benchmark.html";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto(URL, { waitUntil: "networkidle" });

// shrink the job: 1s per test, only counts 1 & 5
await page.fill("#dur", "1");
for (const v of ["15", "30"]) await page.uncheck(`.c[value="${v}"]`);

await page.click("#run");
await page.waitForFunction(() => /Done|Stopped/.test(document.querySelector("#status").textContent), null, { timeout: 60000 });

const rows = await page.evaluate(() =>
  [...document.querySelectorAll("#resultHost tbody tr")].map((tr) =>
    [...tr.children].map((td) => td.textContent)));
const status = await page.evaluate(() => document.querySelector("#status").textContent);
const compareRows = await page.evaluate(() => document.querySelectorAll("#compareHost tbody tr").length);

console.log("STATUS:", status);
console.log("RESULT ROWS:");
rows.forEach((r) => console.log("  " + r.join(" | ")));
console.log("compare table rows:", compareRows);
console.log("\nERRORS:", errors.length ? "\n" + errors.join("\n") : "none ✓");
await browser.close();
process.exit(errors.length ? 1 : 0);
