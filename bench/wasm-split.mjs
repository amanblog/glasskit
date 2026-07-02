import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();
await p.goto("http://localhost:8753/index.html", { waitUntil: "networkidle" });
const res = await p.evaluate(() => {
  function sdf(x,y,hw,hh,r){var qx=Math.abs(x-hw)-(hw-r),qy=Math.abs(y-hh)-(hh-r);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;}
  function clamp8(v){return v<0?0:v>255?255:Math.round(v);}
  function parts(w,h){
    var radius=30,bezel=22,splay=0,curvature=2.2,convexity=1;
    var cvs=document.createElement('canvas');cvs.width=w;cvs.height=h;var ctx=cvs.getContext('2d');
    var img=ctx.createImageData(w,h),data=img.data;
    var hw=w/2,hh=h/2,r=Math.min(radius,hw,hh),bz=Math.max(1,bezel),exp=Math.max(0.3,curvature*(1-0.5*splay));
    var tL0=performance.now();
    for(var y=0;y<h;y++)for(var x=0;x<w;x++){var d=sdf(x+.5,y+.5,hw,hh,r);var nx=sdf(x+1.5,y+.5,hw,hh,r)-sdf(x-.5,y+.5,hw,hh,r);var nyv=sdf(x+.5,y+1.5,hw,hh,r)-sdf(x+.5,y-.5,hw,hh,r);var nl=Math.hypot(nx,nyv)||1,m=0;if(d<0&&d>-bz){var t=-d/bz;m=Math.pow(1-t,exp)*convexity;}var i=(y*w+x)*4;data[i]=clamp8(128-(nx/nl)*m*127);data[i+1]=clamp8(128-(nyv/nl)*m*127);data[i+2]=128;data[i+3]=255;}
    var tL=performance.now()-tL0;
    var tC0=performance.now();ctx.putImageData(img,0,0);var url=cvs.toDataURL();var tC=performance.now()-tC0;
    return [tL,tC,url.length];
  }
  const sizes=[["card 340x210",340,210],["modal 600x400",600,400],["huge @2dpr 1800x1200",1800,1200]];
  const out=[];
  for(const [name,w,h] of sizes){parts(w,h);let L=0,C=0;const N=8;for(let i=0;i<N;i++){const[l,c]=parts(w,h);L+=l;C+=c;}out.push({name,loop:+(L/N).toFixed(2),canvas:+(C/N).toFixed(2)});}
  return out;
});
console.log("split of buildMap time (loop = WASM-able, canvas = NOT):\n");
for(const r of res){const tot=(r.loop+r.canvas).toFixed(2);const pct=Math.round(100*r.loop/(r.loop+r.canvas));console.log(`  ${r.name.padEnd(22)} loop ${String(r.loop).padStart(6)}ms  canvas ${String(r.canvas).padStart(6)}ms  (loop=${pct}% of ${tot}ms)`);}
await b.close();
