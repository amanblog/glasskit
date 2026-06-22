import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });

const stage = await p.$("#stage");
for (const mode of ["svg-clone", "webgl"]) {
  await p.click(`#modeSeg button[data-m="${mode}"]`);
  await p.waitForTimeout(300);
  // compute spots from stage size: over "GLASS" (top-right), over "LOOP" (bottom-left), center
  const spots = await p.evaluate(() => {
    const s = document.querySelector("#stage").getBoundingClientRect();
    return {
      glasstext: [Math.round(s.width * 0.6), Math.round(s.height * 0.06)],
      looptext: [Math.round(s.width * 0.04), Math.round(s.height - 250)],
      center: [Math.round(s.width / 2 - 170), Math.round(s.height / 2 - 105)],
    };
  });
  for (const [name, [x, y]] of Object.entries(spots)) {
    await p.evaluate(([x, y]) => {
      const g = document.querySelector("#glass");
      g.style.left = x + "px"; g.style.top = y + "px";
    }, [x, y]);
    await p.waitForTimeout(450);
    await stage.screenshot({ path: `bench/fix-${mode}-${name}.png` });
  }
}
console.log("errors:", errs.length ? errs.join("; ") : "none ✓");
await b.close();
