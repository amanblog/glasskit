import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  const out = {};
  function probe(opts) {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:200px;height:40px'; // NO border-radius set
    document.body.appendChild(d);
    const g = Glasskit.apply(d, opts);
    const res = { bg: d.style.background, radius: d.style.borderRadius };
    g.destroy();
    res.afterDestroyRadius = d.style.borderRadius;
    res.afterDestroyBg = d.style.background;
    d.remove();
    return res;
  }
  out.solid    = probe({ mode:'css', tint:'255,0,0', tintOpacity:0.2 });
  out.gradient = probe({ mode:'css', tint:'linear-gradient(180deg, rgba(255,255,255,0.216) 0%, rgba(19,19,19,0.222) 100%)' });
  out.radius   = probe({ mode:'css', radius:999 });
  out.evil     = probe({ mode:'css', tint:'linear-gradient(red,red), url(//evil/x)' });
  return out;
});
const has=(s,sub)=>s.toLowerCase().includes(sub);
console.log("solid    -> rgba bg          :", has(r.solid.bg,"rgba(255, 0, 0"));
console.log("gradient -> linear-gradient  :", has(r.gradient.bg,"linear-gradient"));
console.log("radius   -> border-radius set:", r.radius.radius === "999px");
console.log("radius   -> restored on destroy:", r.radius.afterDestroyRadius === "");
console.log("evil     -> url() rejected    :", !has(r.evil.bg,"url(") && has(r.evil.bg,"rgba("));
await b.close();
