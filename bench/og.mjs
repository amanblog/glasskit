/* Renders the 1200×630 OG share image to site/og.png */
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}
body{width:1200px;height:630px;background:#0a0a0f;overflow:hidden;position:relative;color:#f5f5f7}
.mesh{position:absolute;inset:0;background:
  radial-gradient(60% 60% at 78% 18%,#a855f7aa,transparent 60%),
  radial-gradient(50% 50% at 92% 70%,#06b6d488,transparent 60%),
  radial-gradient(55% 55% at 70% 95%,#ff7a5966,transparent 60%)}
.wrap{position:absolute;inset:0;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:16px}
.logo{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#a78bfa,#22d3ee);box-shadow:inset 0 0 0 1.5px #fff6,0 6px 24px #7c3aed88}
.brand b{font-size:30px;font-weight:680;letter-spacing:-.01em}
.brand span{color:#9aa0ac;font-size:18px;margin-left:2px}
h1{font-size:74px;line-height:1.02;letter-spacing:-.03em;font-weight:740;max-width:760px}
h1 .g{background:linear-gradient(120deg,#fff,#a78bfa 55%,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
p{font-size:24px;color:#c3c7d0;margin-top:22px;max-width:680px}
.chips{display:flex;gap:12px;margin-top:30px}
.chip{font-size:17px;color:#f5f5f7;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:10px 18px}
.chip b{color:#a78bfa}
/* floating glass mock */
.glass{position:absolute;right:90px;top:150px;width:330px;height:330px;border-radius:48px;
  background:rgba(255,255,255,.08);backdrop-filter:blur(2px);
  box-shadow:inset 0 0 0 1.5px #ffffff44,inset 3px 3px 5px #ffffff66,inset -4px -4px 14px #00000022,0 30px 80px #0007;
  transform:rotate(-8deg)}
.glass:after{content:"";position:absolute;inset:0;border-radius:48px;
  background:linear-gradient(135deg,#ffffff55,transparent 35%,transparent 70%,#ffffff22)}
</style></head><body>
<div class="mesh"></div>
<div class="glass"></div>
<div class="wrap">
  <div class="brand"><div class="logo"></div><b>Glasskit</b><span>liquid glass generator</span></div>
  <div>
    <h1>Real glass.<br><span class="g">Any element.<br>Any framework.</span></h1>
    <p>Switch the engine, copy the code, benchmark the cost.</p>
    <div class="chips"><span class="chip"><b>4 engines</b> CSS·SVG·Clone·WebGL</span><span class="chip">Cross-browser refraction</span></div>
  </div>
</div></body></html>`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(HTML, { waitUntil: "networkidle" });
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(__dirname, "..", "site", "og.png") });
await browser.close();
console.log("wrote site/og.png");
