/*
 * Automated cross-browser benchmark runner.
 *   node bench/run-playwright.mjs [--dur 2.5] [--counts 1,5,15,30] [--modes css,svg,svg-clone,webgl]
 *
 * Drives benchmark.html in every available engine:
 *   - Chromium via your installed Chrome (no download)
 *   - WebKit / Firefox if installed via:  npx playwright install webkit firefox
 * Writes bench/results.json + bench/results.csv and prints a summary.
 */
import { chromium, webkit, firefox } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(__dirname, "..", "site");

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean).map((s) => {
    const [k, ...v] = s.trim().split(/\s+/); return [k, v.join(" ")];
  })
);
const DUR = args.dur || "2.5";
const COUNTS = (args.counts || "1,5,15,30").split(",");
const MODES = (args.modes || "css,svg,svg-clone,webgl").split(",");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
      if (p.endsWith("/")) p += "index.html";
      fs.readFile(p, (err, buf) => {
        if (err) { res.writeHead(404); res.end("404"); return; }
        res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
        res.end(buf);
      });
    });
    server.listen(0, () => resolve(server));
  });
}

async function runBrowser(engine, server) {
  const port = server.address().port;
  const url = `http://localhost:${port}/benchmark.html`;
  let browser;
  try {
    browser = await engine.launch();
  } catch (e) {
    console.log(`  ⏭  ${engine._name} not available (${String(e.message).split("\n")[0]})`);
    return null;
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.fill("#dur", DUR);
  // set engine + count checkboxes to requested
  await page.evaluate(({ MODES, COUNTS }) => {
    document.querySelectorAll(".m").forEach((c) => { c.checked = MODES.includes(c.value); });
    document.querySelectorAll(".c").forEach((c) => { c.checked = COUNTS.includes(c.value); });
  }, { MODES, COUNTS });
  await page.click("#run");
  await page.waitForFunction(() => /Done|Stopped/.test(document.querySelector("#status").textContent), null, { timeout: 300000 });
  const rec = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.indexOf("lgbench-") === 0) return JSON.parse(localStorage.getItem(k));
    }
    return null;
  });
  await browser.close();
  return rec;
}

const engines = [
  Object.assign(chromium, { _name: "Chromium(Chrome)", _launch: { channel: "chrome" } }),
  Object.assign(webkit, { _name: "WebKit(Safari)" }),
  Object.assign(firefox, { _name: "Firefox" }),
];
// wrap launch to inject channel for chromium
chromium.launch = ((orig) => (o = {}) => orig.call(chromium, { ...o, channel: "chrome" }))(chromium.launch);

console.log(`Liquidglass bench → modes=[${MODES}] counts=[${COUNTS}] dur=${DUR}s`);
const server = await serve();
const all = [];
for (const eng of engines) {
  console.log(`▶ ${eng._name}`);
  const rec = await runBrowser(eng, server).catch((e) => { console.log("  ✗", e.message); return null; });
  if (rec) { all.push(rec); console.log(`  ✓ ${rec.results.length} tests`); }
}
server.close();

if (!all.length) { console.log("No browsers ran. Install: npx playwright install webkit firefox"); process.exit(1); }

fs.writeFileSync(path.join(__dirname, "results.json"), JSON.stringify(all, null, 2));
// CSV
let csv = "browser,dpr,mode,count,fps,minFps,avgMs,p95,jank,heapMB\n";
for (const rec of all)
  for (const r of rec.results)
    csv += [rec.browser, rec.dpr, r.mode, r.count, r.fps, r.minFps, r.avgMs, r.p95, r.jank, r.heapMB ?? ""].join(",") + "\n";
fs.writeFileSync(path.join(__dirname, "results.csv"), csv);

console.log("\n=== Avg FPS by engine × count ===");
for (const rec of all) {
  console.log(`\n${rec.browser} (dpr ${rec.dpr}):`);
  const byMode = {};
  rec.results.forEach((r) => { (byMode[r.mode] ||= {})[r.count] = r.fps; });
  for (const m of Object.keys(byMode))
    console.log(`  ${m.padEnd(10)} ` + Object.entries(byMode[m]).map(([c, f]) => `${c}:${f}fps`).join("  "));
}
console.log("\nWrote bench/results.json and bench/results.csv");
process.exit(0);
