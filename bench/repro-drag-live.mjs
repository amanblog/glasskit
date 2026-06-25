import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await p.goto("https://amanblog.github.io/glasskit/index.html?v="+Date.now(), { waitUntil: "networkidle" });
await p.waitForTimeout(600);

const before = await p.$eval("#glass", el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; });
// drag from card center by +60,+40
const r = await p.$eval("#glass", el => { const b = el.getBoundingClientRect(); return { cx: b.x + b.width/2, cy: b.y + b.height/2 }; });
await p.mouse.move(r.cx, r.cy);
await p.mouse.down();
await p.mouse.move(r.cx + 30, r.cy + 20, { steps: 5 });
await p.mouse.move(r.cx + 60, r.cy + 40, { steps: 5 });
await p.mouse.up();
await p.waitForTimeout(150);
const after = await p.$eval("#glass", el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; });

const expected = { x: before.x + 60, y: before.y + 40 };
const dx = after.x - expected.x, dy = after.y - expected.y;
console.log("before:   ", before);
console.log("expected: ", expected, "(should move +60,+40)");
console.log("after:    ", after);
console.log("error:    ", { dx, dy }, Math.abs(dx) > 10 || Math.abs(dy) > 10 ? "  <-- BUG: card jumped" : "  ok");
await b.close();
