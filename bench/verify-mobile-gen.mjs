import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });

// --- mobile ---
const m = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errs = [];
m.on("pageerror", (e) => errs.push(e.message));
await m.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });
await m.evaluate(() => document.querySelector("#generator").scrollIntoView({ behavior: "instant" }));
await m.waitForTimeout(600);

const r1 = await m.evaluate(() => {
  const s = document.querySelector("#stage").getBoundingClientRect();
  const g = document.querySelector("#glass").getBoundingClientRect();
  return {
    stageH: Math.round(s.height),
    glassInside: g.left >= s.left && g.top >= s.top && g.right <= s.right && g.bottom <= s.bottom,
    touchAction: getComputedStyle(document.querySelector("#glass")).touchAction,
  };
});
console.log("mobile stage:", JSON.stringify(r1));

// sticky: scroll deep into the controls, stage должен stay pinned under header
await m.evaluate(() => window.scrollBy(0, 700));
await m.waitForTimeout(400);
const r2 = await m.evaluate(() => {
  const s = document.querySelector("#stage").getBoundingClientRect();
  const h = document.querySelector("header").getBoundingClientRect();
  return { stageTop: Math.round(s.top), headerBottom: Math.round(h.bottom), pinned: Math.abs(s.top - (h.bottom + 8)) < 3 };
});
console.log("sticky while scrolled:", JSON.stringify(r2));
await m.screenshot({ path: "bench/v2-mobile-sticky.png" });

// touch drag
const gb = await (await m.$("#glass")).boundingBox();
await m.touchscreen.tap(gb.x + 10, gb.y + 10); // ensure no crash on tap
const before = await m.evaluate(() => document.querySelector("#glass").style.left);
await m.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
await m.mouse.down();
await m.mouse.move(gb.x + gb.width / 2 + 60, gb.y + gb.height / 2 + 20, { steps: 4 });
await m.mouse.up();
const after = await m.evaluate(() => document.querySelector("#glass").style.left);
console.log("drag on mobile viewport:", before, "→", after);

// shape change resizes stage + keeps glass visible
const r3 = await m.evaluate(async () => {
  const sh = document.querySelector("#shape");
  sh.value = "circle"; sh.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  const s = document.querySelector("#stage").getBoundingClientRect();
  const g = document.querySelector("#glass").getBoundingClientRect();
  return { stageH: Math.round(s.height), inside: g.left >= s.left - 1 && g.top >= s.top - 1 && g.right <= s.right + 1 && g.bottom <= s.bottom + 1 };
});
console.log("after shape→circle:", JSON.stringify(r3));

// drag clamp: try to fling it far off-stage
const r4 = await m.evaluate(() => {
  const g = document.querySelector("#glass");
  g.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, clientY: 100, pointerId: 1, bubbles: true }));
  g.dispatchEvent(new PointerEvent("pointermove", { clientX: 3000, clientY: 3000, pointerId: 1, bubbles: true }));
  g.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, bubbles: true }));
  const s = document.querySelector("#stage").getBoundingClientRect();
  const r = g.getBoundingClientRect();
  return { visibleX: Math.round(s.right - r.left), visibleY: Math.round(s.bottom - r.top) };
});
console.log("fling clamp (≥60 visible):", JSON.stringify(r4));

// --- desktop unchanged ---
const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });
await d.evaluate(() => document.querySelector("#generator").scrollIntoView({ behavior: "instant" }));
await d.waitForTimeout(500);
const r5 = await d.evaluate(() => {
  const s = document.querySelector("#stage");
  return { inlineH: s.style.height === "", h: Math.round(s.getBoundingClientRect().height) };
});
console.log("desktop stage (no inline height, CSS-driven):", JSON.stringify(r5));
console.log("errors:", errs.length ? errs.join(";") : "none ✓");
await b.close();
