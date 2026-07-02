/* Byte-identity + speed check: new ring-optimized buildMap vs the original.
 * Extracts BOTH implementations from real sources (working tree vs `git show main`)
 * so we test shipped code, not a re-typed copy. */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

function chunk(src, from, to) {
  const a = src.indexOf(from), b = src.indexOf(to);
  if (a < 0 || b < 0 || b <= a) throw new Error("marker not found: " + from);
  return src.slice(a, b);
}
const HELPERS_FROM = "/* rounded-box signed";
const MAP_FROM_OLD = "/* displacement map";
const MAP_FROM_NEW = "/* displacement map";
const MAP_TO = "/* ============================ instance";

const newSrc = readFileSync("liquid-glass.js", "utf8");
const oldSrc = execSync("git show main:liquid-glass.js", { encoding: "utf8" });

const helpers = chunk(oldSrc, HELPERS_FROM, MAP_FROM_OLD) +
  "function clamp8(v){return v<0?0:v>255?255:Math.round(v);}";
const oldMap = chunk(oldSrc, MAP_FROM_OLD, MAP_TO);
const newMap = chunk(newSrc, MAP_FROM_NEW, MAP_TO);

const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();
await p.goto("about:blank");

const result = await p.evaluate(({ helpers, oldMap, newMap }) => {
  const oldBuild = new Function(helpers + oldMap + "; return buildMap;")();
  const newBuild = new Function(helpers + newMap + "; return buildMap;")();

  // --- correctness: byte-identical dataURLs across a broad config matrix ---
  const sizes = [[1,1],[7,5],[33,47],[160,44],[180,56],[340,210],[320,110],[220,220],[600,400],[900,600]];
  const radii = [0, 4, 16, 30, 55, 110, 999];
  const bezels = [1, 8, 22, 60];
  const splays = [0, 0.5, 1];
  const curvs = [1, 2.2, 4, 6];
  const convs = [-1, -0.3, 0, 0.5, 1];

  let tested = 0, mismatches = [];
  // deterministic pseudo-random sweep (LCG) over the cross-product
  let seed = 12345;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let i = 0; i < 160; i++) {
    const [w, h] = sizes[rnd(sizes.length)];
    const args = [w, h, radii[rnd(radii.length)], bezels[rnd(bezels.length)],
      splays[rnd(splays.length)], curvs[rnd(curvs.length)], convs[rnd(convs.length)]];
    const a = oldBuild(...args), c = newBuild(...args);
    tested++;
    if (a !== c) mismatches.push(args.join(","));
  }
  // exhaustive on one realistic size (card) across all params
  for (const r of radii) for (const bz of bezels) for (const cv of convs) {
    const args = [340, 210, r, bz, 0, 2.2, cv];
    tested++;
    if (oldBuild(...args) !== newBuild(...args)) mismatches.push(args.join(","));
  }
  // cache correctness: repeated call returns the same string
  const c1 = newBuild(340, 210, 30, 22, 0, 2.2, 1);
  const c2 = newBuild(340, 210, 30, 22, 0, 2.2, 1);
  const cacheOk = c1 === c2;

  // --- speed: old vs new (cache-busted via convexity epsilon), plus cached path ---
  function bench(fn, w, h, N, bust) {
    fn(w, h, 30, 22, 0, 2.2, 1); // warm
    const t0 = performance.now();
    for (let i = 0; i < N; i++) fn(w, h, 30, 22, 0, 2.2, bust ? 1 + i * 1e-9 : 1);
    return (performance.now() - t0) / N;
  }
  const speeds = [];
  for (const [name, w, h] of [["card 340x210",340,210],["modal 600x400",600,400],["huge 1800x1200",1800,1200]]) {
    speeds.push({
      name,
      oldMs: +bench(oldBuild, w, h, 6, true).toFixed(2),
      newMs: +bench(newBuild, w, h, 6, true).toFixed(2),
      cachedMs: +bench(newBuild, w, h, 50, false).toFixed(4),
    });
  }
  return { tested, mismatches, cacheOk, speeds };
}, { helpers, oldMap, newMap });

console.log(`configs tested: ${result.tested}`);
console.log(`byte-identical: ${result.mismatches.length === 0 ? "ALL ✓" : "MISMATCH ✗ → " + result.mismatches.slice(0, 5).join(" | ")}`);
console.log(`LRU cache returns identical result: ${result.cacheOk ? "✓" : "✗"}`);
console.log("\nspeed (ms per build, cache-busted):");
for (const s of result.speeds) {
  console.log(`  ${s.name.padEnd(16)} old ${String(s.oldMs).padStart(7)}  new ${String(s.newMs).padStart(7)}  (${(s.oldMs / s.newMs).toFixed(1)}×)   cached ${s.cachedMs}ms`);
}
await b.close();
if (result.mismatches.length) process.exit(1);
