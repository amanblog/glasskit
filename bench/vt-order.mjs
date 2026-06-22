import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
await p.goto("http://localhost:8753/video-test.html?v="+Date.now(), { waitUntil: "networkidle" });
async function order(){
  return await p.evaluate(()=>{
    return [...document.querySelectorAll(".card")]
      .map(c=>({id:c.id, x:c.getBoundingClientRect().left}))
      .sort((a,b)=>a.x-b.x).map(c=>c.id.replace("c_",""));
  });
}
for(const s of ["canvas","video","image","text"]){
  await p.click(`.srcbtn[data-s="${s}"]`); await p.waitForTimeout(300);
  console.log(s.padEnd(7), "→", (await order()).join(" · "));
}
await b.close();
