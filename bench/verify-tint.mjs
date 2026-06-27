import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();
await p.goto("http://localhost:8753/index.html?v="+Date.now(), { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  function bgOf(opts, which) {
    const d = document.createElement('div'); d.style.cssText='position:absolute;width:120px;height:80px;border-radius:12px';
    document.body.appendChild(d);
    const g = Glasskit.apply(d, opts);
    const ov = [...d.children].find(c=>c.style && c.style.zIndex==='2');
    const res = { el: d.style.background, overlay: ov?ov.style.background:'' };
    g.destroy(); d.remove(); return res;
  }
  return {
    triplet_svg: bgOf({mode:'svg', tint:'69,81,81', tintOpacity:0.34}),
    rgba_svg:    bgOf({mode:'svg', tint:'rgba(69,81,81,0.34)'}),
    hex_svg:     bgOf({mode:'svg', tint:'#455151'}),
    named_css:   bgOf({mode:'css', tint:'teal', tintOpacity:0.3}),
    clone_tint:  bgOf({mode:'svg-clone', tint:'rgba(69,81,81,0.34)', background:document.body}),
  };
});
console.log(JSON.stringify(r,null,1));
await b.close();
