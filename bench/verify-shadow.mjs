import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
const res = await p.evaluate(() => {
  const out = {};
  function shadowOf(opts) {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:120px;height:80px;border-radius:16px';
    document.body.appendChild(d);
    const g = Glasskit.apply(d, opts);
    const overlay = d.querySelector('div'); // the overlay is appended
    const bs = overlay.style.boxShadow;
    g.destroy(); d.remove();
    return bs;
  }
  out.default = shadowOf({ mode:'css' });
  out.none = shadowOf({ mode:'css', shadow:'none' });
  out.empty = shadowOf({ mode:'css', shadow:'' });
  out.custom = shadowOf({ mode:'css', shadow:'0 20px 60px rgba(255,0,0,0.5)' });
  out.malicious = shadowOf({ mode:'css', shadow:'0 0 0 red;background:url(//evil/x)' });
  return out;
});
const has = (s, sub) => s.includes(sub);
console.log("default  has drop 8px 30px :", has(res.default, "8px 30px"));
console.log("none     has NO drop       :", !has(res.none, "8px 30px") && !has(res.none,"rgba(0, 0, 0, 0.18)"));
console.log("empty    has NO drop       :", !has(res.empty, "8px 30px"));
console.log("custom   has red 20px 60px :", has(res.custom, "20px 60px") && (has(res.custom,"255, 0, 0") || has(res.custom,"rgba(255")));
console.log("malicious rejected (no url):", !/url\(/i.test(res.malicious));
console.log("--- raw custom:", res.custom.slice(-60));
await b.close();
