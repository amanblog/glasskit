import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();

const candidates = [
  "https://mdn.github.io/shared-assets/videos/flower.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
];

for (const url of candidates) {
  const r = await p.evaluate((url) => new Promise((resolve) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous"; v.muted = true; v.loop = true; v.playsInline = true; v.src = url;
    let done = false;
    const finish = (o) => { if (!done) { done = true; resolve(o); } };
    const t = setTimeout(() => finish({ ok: false, why: "timeout" }), 9000);
    v.addEventListener("error", () => finish({ ok: false, why: "load-error (" + (v.error && v.error.code) + ")" }));
    v.addEventListener("playing", () => {
      try {
        const c = document.createElement("canvas"); c.width = 32; c.height = 32;
        const g = c.getContext("2d"); g.drawImage(v, 0, 0, 32, 32);
        g.getImageData(0, 0, 1, 1); // throws if tainted (CORS)
        clearTimeout(t); finish({ ok: true, why: "drawable + readable (CORS ok)" });
      } catch (e) { clearTimeout(t); finish({ ok: false, why: "tainted: " + e.message.slice(0, 40) }); }
    });
    v.play().catch((e) => finish({ ok: false, why: "play-rejected: " + e.message.slice(0, 30) }));
  }), url);
  console.log((r.ok ? "✅" : "❌") + "  " + r.why.padEnd(34) + "  " + url);
}
await b.close();
