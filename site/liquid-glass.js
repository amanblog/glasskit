/*!
 * liquid-glass.js — drop-in "Figma Glass" / Apple Liquid Glass for any element.
 * Zero dependencies. UMD (window.LiquidGlass + CommonJS) + <glass-kit> web component.
 *
 *   const g = LiquidGlass.apply(el, { mode: 'auto', refraction: 90, dispersion: 0.5 });
 *   g.update({ frost: 12 });   g.destroy();
 *
 * MODES (the switch nobody else gives you):
 *   'css'       blur + tint + highlight. Every browser. No real refraction.
 *   'svg'       real refraction on the LIVE backdrop via backdrop-filter. CHROMIUM ONLY.
 *   'svg-clone' real refraction in Chrome / Safari / Firefox by cloning a `background`
 *               element and filtering the clone. Cross-browser. Refracts DOM (not <canvas>).
 *   'webgl'     real refraction in a shader of a supplied `background` (img/canvas/video).
 *   'auto'      Chromium -> 'svg'; else `background` set -> 'svg-clone'; else 'css'.
 *
 * Params map onto Figma's Glass panel: frost, refraction, depth, dispersion, splay,
 * lightAngle, lightIntensity (+ optical extras: curvature, convexity, tint).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else { root.Glasskit = root.LiquidGlass = factory(); }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var UID = 0;
  var XLINK = 'http://www.w3.org/1999/xlink';

  var DEFAULTS = {
    mode: 'auto',
    frost: 6,             // Figma "Frost"      — backdrop blur (px)
    refraction: 90,       // Figma "Refraction" — edge displacement strength (px)
    depth: 22,            // Figma "Depth"      — bezel width (px)
    dispersion: 0.4,      // Figma "Dispersion" — chromatic aberration (0..1)
    splay: 0,             // Figma "Splay"      — softens/widens bezel falloff (0..1)
    lightAngle: -45,      // Figma "Light" angle (deg)
    lightIntensity: 0.8,  // Figma "Light" %    — specular highlight (0..1)
    curvature: 2.2,       // profile exponent: ~2 spherical, ~4 squircle
    convexity: 1,         // +1 convex (magnify) .. 0 flat .. -1 concave (shrink)
    tint: '255,255,255',  // "r,g,b"
    tintOpacity: 0.08,
    sheen: 0.7,           // diagonal gloss over the card FACE (0 = remove; border stays)
    sheenColor: '255,255,255', // "r,g,b" — recolor the gloss
    saturate: 1.4,
    brightness: 1.04,
    radius: null,         // null = read element border-radius
    background: null      // Element|selector — required for 'svg-clone' & 'webgl'
  };

  /* ---------------------------- helpers ---------------------------- */
  function isChromium() {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    var ua = navigator.userAgent;
    var chromium = /(Chrome|Chromium|Edg|OPR)\//.test(ua) && !/\bEdge\//.test(ua);
    var ok = !!(window.CSS && CSS.supports &&
      (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')));
    return chromium && ok;
  }
  function clamp8(v) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }
  // only ever emit a clean "r,g,b" triplet into inline CSS — blocks url()/expression smuggling
  function safeRGB(v) { return (typeof v === 'string' && /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(v)) ? v.replace(/\s+/g, '') : '255,255,255'; }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function resolveEl(x) { return typeof x === 'string' ? document.querySelector(x) : x; }
  function readRadius(el) { return parseFloat(getComputedStyle(el).borderRadius) || 0; }
  function ns(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

  function pickMode(requested, hasBackground) {
    if (requested && requested !== 'auto') return requested;
    if (isChromium()) return 'svg';
    return hasBackground ? 'svg-clone' : 'css';
  }

  /* rounded-box signed distance field (negative inside) */
  function sdf(x, y, hw, hh, r) {
    var qx = Math.abs(x - hw) - (hw - r);
    var qy = Math.abs(y - hh) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }

  /* displacement map: R = x-shift, G = y-shift, 128 = neutral */
  function buildMap(w, h, radius, bezel, splay, curvature, convexity) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    var cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
    var ctx = cvs.getContext('2d');
    var img = ctx.createImageData(w, h), data = img.data;
    var hw = w / 2, hh = h / 2, r = Math.min(radius, hw, hh), b = Math.max(1, bezel);
    var exp = Math.max(0.3, curvature * (1 - 0.5 * splay));
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var d = sdf(x + 0.5, y + 0.5, hw, hh, r);
        var nx = sdf(x + 1.5, y + 0.5, hw, hh, r) - sdf(x - 0.5, y + 0.5, hw, hh, r);
        var nyv = sdf(x + 0.5, y + 1.5, hw, hh, r) - sdf(x + 0.5, y - 0.5, hw, hh, r);
        var nl = Math.hypot(nx, nyv) || 1, m = 0;
        if (d < 0 && d > -b) { var t = -d / b; m = Math.pow(1 - t, exp) * convexity; }
        var i = (y * w + x) * 4;
        data[i] = clamp8(128 - (nx / nl) * m * 127);
        data[i + 1] = clamp8(128 - (nyv / nl) * m * 127);
        data[i + 2] = 128; data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cvs.toDataURL();
  }

  /* ============================ instance ============================ */
  function apply(el, options) {
    var o = Object.assign({}, DEFAULTS, options || {});
    var bg = resolveEl(o.background);
    var id = 'lg' + (++UID);
    var mode = pickMode(o.mode, !!bg);
    // graceful fallback if a refraction mode lacks its background source
    if ((mode === 'svg-clone' || mode === 'webgl') && !bg) mode = isChromium() ? 'svg' : 'css';

    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var prevBg = el.style.backgroundColor;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:2;';
    el.appendChild(overlay);

    var svg, filter, feImage, feR, feG, feB, feBlur;
    var lensWrap, clone;            // svg-clone
    var glcanvas, gl, glState;      // webgl
    var rafId = 0;
    var lastMapKey = '';

    if (mode === 'svg' || mode === 'svg-clone') buildSvgFilter();
    if (mode === 'svg-clone') buildClone();
    if (mode === 'webgl') buildGL();

    /* ---- SVG filter (shared by backdrop + clone modes) ---- */
    function buildSvgFilter() {
      svg = ns('svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
      var defs = ns('defs');
      filter = ns('filter');
      filter.setAttribute('id', id);
      filter.setAttribute('filterUnits', 'userSpaceOnUse');
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      feImage = ns('feImage');
      feImage.setAttribute('result', 'map');
      feImage.setAttribute('preserveAspectRatio', 'none');
      feR = disp('pR'); var mR = chan('mr', 'pR', 'r');
      feG = disp('pG'); var mG = chan('mg', 'pG', 'g');
      feB = disp('pB'); var mB = chan('mb', 'pB', 'b');
      var b1 = blend('mr', 'mg', 'rg'), b2 = blend('rg', 'mb', 'rgb');
      feBlur = ns('feGaussianBlur'); feBlur.setAttribute('in', 'rgb');
      [feImage, feR, mR, feG, mG, feB, mB, b1, b2, feBlur].forEach(function (n) { filter.appendChild(n); });
      defs.appendChild(filter); svg.appendChild(defs); document.body.appendChild(svg);

      function disp(res) {
        var f = ns('feDisplacementMap');
        f.setAttribute('in', 'SourceGraphic'); f.setAttribute('in2', 'map');
        f.setAttribute('xChannelSelector', 'R'); f.setAttribute('yChannelSelector', 'G');
        f.setAttribute('result', res); return f;
      }
      function chan(res, inp, w) {
        var f = ns('feColorMatrix'); f.setAttribute('in', inp); f.setAttribute('result', res);
        f.setAttribute('type', 'matrix');
        f.setAttribute('values',
          w === 'r' ? '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0' :
          w === 'g' ? '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0' :
                      '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0'); return f;
      }
      function blend(a, b, res) {
        var f = ns('feBlend'); f.setAttribute('in', a); f.setAttribute('in2', b);
        f.setAttribute('mode', 'screen'); f.setAttribute('result', res); return f;
      }
    }

    function refreshMap() {
      if (mode !== 'svg' && mode !== 'svg-clone') return;
      var r = el.getBoundingClientRect();
      var rad = o.radius == null ? readRadius(el) : o.radius;
      var key = [Math.round(r.width), Math.round(r.height), rad, o.depth, o.splay, o.curvature, o.convexity].join(',');
      if (key === lastMapKey) return;
      lastMapKey = key;
      var url = buildMap(r.width, r.height, rad, o.depth, o.splay, o.curvature, o.convexity);
      feImage.setAttribute('href', url);
      feImage.setAttributeNS(XLINK, 'xlink:href', url);
      feImage.setAttribute('width', r.width); feImage.setAttribute('height', r.height);
      if (mode === 'svg') {
        // backdrop-filter applies in the element's own space → region is 0,0,w,h
        feImage.setAttribute('x', 0); feImage.setAttribute('y', 0);
        filter.setAttribute('x', 0); filter.setAttribute('y', 0);
        filter.setAttribute('width', r.width); filter.setAttribute('height', r.height);
      }
      // clone mode: the map + filter region track the visible window every frame (syncClone)
    }

    /* ---- clone layer (cross-browser refraction) ---- */
    function buildClone() {
      lensWrap = document.createElement('div');
      lensWrap.style.cssText = 'position:absolute;inset:0;border-radius:inherit;overflow:hidden;z-index:0;pointer-events:none;';
      clone = bg.cloneNode(true);
      clone.removeAttribute('id');
      clone.style.position = 'absolute';
      clone.style.margin = '0';
      clone.style.filter = 'url(#' + id + ')';
      clone.style.webkitFilter = 'url(#' + id + ')';
      lensWrap.appendChild(clone);
      el.insertBefore(lensWrap, overlay);
      el.style.backgroundColor = 'transparent';
      syncClone();
    }
    function syncClone() {
      if (!clone) return;
      var er = el.getBoundingClientRect(), br = bg.getBoundingClientRect();
      clone.style.left = (br.left - er.left) + 'px';
      clone.style.top = (br.top - er.top) + 'px';
      clone.style.width = br.width + 'px';
      clone.style.height = br.height + 'px';
      // The filter runs in the clone's user space (origin = background top-left). Move the
      // displacement map + filter region to sit exactly over the glass window, wherever it is.
      var ox = er.left - br.left, oy = er.top - br.top, pad = Math.ceil(o.frost * 2 + 12);
      feImage.setAttribute('x', ox); feImage.setAttribute('y', oy);
      filter.setAttribute('x', ox - pad); filter.setAttribute('y', oy - pad);
      filter.setAttribute('width', er.width + pad * 2); filter.setAttribute('height', er.height + pad * 2);
    }
    function reclone() {
      if (!lensWrap) return;
      var nc = bg.cloneNode(true);
      nc.removeAttribute('id'); nc.style.position = 'absolute'; nc.style.margin = '0';
      nc.style.filter = 'url(#' + id + ')'; nc.style.webkitFilter = 'url(#' + id + ')';
      lensWrap.replaceChild(nc, clone); clone = nc; syncClone();
    }

    /* ---- apply backdrop/filter scales + frost ---- */
    function applyFilterParams() {
      var k = o.dispersion * 0.4;
      if (feR) {
        feR.setAttribute('scale', o.refraction * (1 - k));
        feG.setAttribute('scale', o.refraction);
        feB.setAttribute('scale', o.refraction * (1 + k));
        feBlur.setAttribute('stdDeviation', o.frost);
      }
      if (mode === 'svg') {
        var f = 'url(#' + id + ')'; el.style.backdropFilter = f; el.style.webkitBackdropFilter = f;
      } else if (mode === 'css') {
        var c = 'blur(' + num(o.frost, 6) + 'px) saturate(' + num(o.saturate, 1.4) + ') brightness(' + num(o.brightness, 1.04) + ')';
        el.style.backdropFilter = c; el.style.webkitBackdropFilter = c;
      }
    }

    /* ---- tint + specular overlay (all modes) ---- */
    function applyOverlay() {
      var li = num(o.lightIntensity, 0.8), a = (num(o.lightAngle, -45) + 90) * Math.PI / 180;
      if (mode === 'css' || mode === 'svg') el.style.backgroundColor = 'rgba(' + safeRGB(o.tint) + ',' + num(o.tintOpacity, 0.08) + ')';
      // FACE gloss — controlled by `sheen`/`sheenColor`, independent of the border light below
      var sc = safeRGB(o.sheenColor), sh = num(o.sheen, 0.7);
      overlay.style.background = sh <= 0 ? 'none' :
        'linear-gradient(' + (num(o.lightAngle, -45) + 90) + 'deg,rgba(' + sc + ',' + (0.6 * sh).toFixed(3) +
        ') 0%,rgba(' + sc + ',0) 30%,rgba(' + sc + ',0) 70%,rgba(' + sc + ',' + (0.14 * sh).toFixed(3) + ') 100%)';
      overlay.style.boxShadow =
        'inset 0 0 0 1px rgba(255,255,255,' + (0.30 * li) + '),' +
        'inset ' + (Math.cos(a) * 2).toFixed(1) + 'px ' + (Math.sin(a) * 2).toFixed(1) + 'px 2px rgba(255,255,255,' + (0.5 * li) + '),' +
        'inset ' + (-Math.cos(a) * 2).toFixed(1) + 'px ' + (-Math.sin(a) * 2).toFixed(1) + 'px 6px rgba(0,0,0,.15),' +
        '0 8px 30px rgba(0,0,0,.18)';
    }

    /* ------------------------------ WebGL ------------------------------ */
    function buildGL() {
      glcanvas = document.createElement('canvas');
      glcanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;z-index:0;';
      el.insertBefore(glcanvas, overlay);
      el.style.backgroundColor = 'transparent';
      gl = glcanvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
      if (!gl) { mode = 'css'; applyFilterParams(); return; }
      var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
      var fs = [
        'precision highp float;',
        'uniform sampler2D u_bg;uniform vec2 u_win,u_origin,u_size,u_light;',
        'uniform float u_radius,u_bezel,u_refraction,u_dispersion,u_frost,u_lightI,u_curv,u_convex;',
        'float sd(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
        'vec4 bl(vec2 uv,float rad){if(rad<0.5)return texture2D(u_bg,uv);vec2 px=rad/u_win;vec4 c=vec4(0.);for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){c+=texture2D(u_bg,uv+vec2(float(i),float(j))*px*0.5);}}return c/25.;}',
        'void main(){',
        ' vec2 fc=vec2(gl_FragCoord.x,u_size.y-gl_FragCoord.y);',
        ' vec2 c=fc-u_size*0.5;vec2 b=u_size*0.5;float r=min(u_radius,min(b.x,b.y));',
        ' float d=sd(c,b,r);float e=1.0;',
        ' float dx=sd(c+vec2(e,0.),b,r)-sd(c-vec2(e,0.),b,r);',
        ' float dy=sd(c+vec2(0.,e),b,r)-sd(c-vec2(0.,e),b,r);',
        ' vec2 n=normalize(vec2(dx,dy)+1e-6);',
        ' float m=0.;if(d<0.&&d>-u_bezel){float t=-d/u_bezel;m=pow(1.-t,u_curv)*u_convex;}',
        ' vec2 disp=-n*m*u_refraction;vec2 base=u_origin+fc;float k=u_dispersion*0.4;',
        ' vec4 cr=bl((base+disp*(1.-k))/u_win,u_frost);',
        ' vec4 cg=bl((base+disp)/u_win,u_frost);',
        ' vec4 cb=bl((base+disp*(1.+k))/u_win,u_frost);',
        ' vec3 col=vec3(cr.r,cg.g,cb.b);',
        ' float spec=pow(max(dot(n,u_light),0.),4.)*abs(m)*u_lightI;col+=spec+0.04*u_lightI*abs(m);',
        ' float al=smoothstep(0.75,-0.75,d);gl_FragColor=vec4(col,al);}'
      ].join('\n');
      var prog = linkProg(vs, fs); gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // uv.y is top-origin to match the element math
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      glState = { prog: prog, tex: tex, src: null };
      loadGLBg(bg);

      function linkProg(v, f) {
        function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x);
          if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.warn('LG shader:', gl.getShaderInfoLog(x)); return x; }
        var p = gl.createProgram();
        gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f));
        gl.linkProgram(p); return p;
      }
    }
    function loadGLBg(src) {
      if (!gl || !src) return;
      if (typeof src === 'string') { var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { glState.src = im; uploadGL(im); }; im.src = src; }
      else { glState.src = src; uploadGL(src); }
    }
    function uploadGL(src) {
      if (!gl || !src) return;
      gl.bindTexture(gl.TEXTURE_2D, glState.tex);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) {}
    }
    function renderGL() {
      if (!gl || !glState || !glState.src) return;
      // render the drawing buffer at device-pixel resolution so high-frequency
      // detail (text edges) doesn't alias when the browser upscales on HiDPI screens.
      var dpr = window.devicePixelRatio || 1;
      var r = el.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (glcanvas.width !== w || glcanvas.height !== h) { glcanvas.width = w; glcanvas.height = h; }
      gl.viewport(0, 0, w, h);
      var tag = glState.src.tagName;
      if (tag === 'CANVAS' || tag === 'VIDEO') uploadGL(glState.src);
      var p = glState.prog, U = function (n) { return gl.getUniformLocation(p, n); };
      var rad = o.radius == null ? readRadius(el) : o.radius, a = o.lightAngle * Math.PI / 180;
      // every pixel-space uniform scales by dpr together, keeping the shader internally consistent
      // sample UVs are relative to the BACKGROUND's on-screen rect, not the window
      var br = bg && bg.getBoundingClientRect ? bg.getBoundingClientRect() : null;
      var bw = br && br.width ? br.width : innerWidth, bh = br && br.height ? br.height : innerHeight;
      gl.uniform2f(U('u_win'), bw * dpr, bh * dpr);
      gl.uniform2f(U('u_origin'), (br && br.width ? r.left - br.left : r.left) * dpr, (br && br.height ? r.top - br.top : r.top) * dpr);
      gl.uniform2f(U('u_size'), w, h);
      gl.uniform1f(U('u_radius'), rad * dpr);
      gl.uniform1f(U('u_bezel'), o.depth * dpr);
      gl.uniform1f(U('u_refraction'), o.refraction * dpr);
      gl.uniform1f(U('u_dispersion'), o.dispersion);
      gl.uniform1f(U('u_frost'), o.frost * dpr);
      gl.uniform1f(U('u_curv'), o.curvature);
      gl.uniform1f(U('u_convex'), o.convexity);
      gl.uniform1f(U('u_lightI'), o.lightIntensity);
      gl.uniform2f(U('u_light'), Math.cos(a), Math.sin(a));
      gl.uniform1i(U('u_bg'), 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /* ---- per-frame loop only for modes that need positional sync ---- */
    function tick() { if (mode === 'svg-clone') syncClone(); else if (mode === 'webgl') renderGL(); rafId = requestAnimationFrame(tick); }
    if (mode === 'svg-clone' || mode === 'webgl') rafId = requestAnimationFrame(tick);

    var ro = new ResizeObserver(function () { refreshMap(); if (mode === 'svg-clone') syncClone(); });
    ro.observe(el);

    refreshMap(); applyFilterParams(); applyOverlay();

    var instance = {
      el: el, mode: mode,
      update: function (patch) {
        Object.assign(o, patch || {});
        if (patch && patch.background != null && mode === 'webgl') loadGLBg(resolveEl(o.background));
        refreshMap(); applyFilterParams(); applyOverlay();
        return instance;
      },
      refresh: function () { if (mode === 'svg-clone') reclone(); else if (mode === 'webgl') loadGLBg(resolveEl(o.background)); return instance; },
      destroy: function () {
        if (rafId) cancelAnimationFrame(rafId);
        ro.disconnect();
        // free the WebGL context explicitly — browsers cap ~16 per page
        if (gl) { var lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); gl = null; }
        [svg, lensWrap, glcanvas, overlay].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
        el.style.backdropFilter = ''; el.style.webkitBackdropFilter = ''; el.style.backgroundColor = prevBg;
      }
    };
    return instance;
  }

  /* ===================== <glass-kit> web component ===================== */
  var ATTRS = ['mode', 'frost', 'refraction', 'depth', 'dispersion', 'splay', 'light-angle',
    'light-intensity', 'curvature', 'convexity', 'tint', 'tint-opacity', 'sheen', 'sheen-color',
    'radius', 'background'];
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function defineElement() {
    if (typeof customElements === 'undefined' || customElements.get('glass-kit')) return;
    var Base = (typeof HTMLElement !== 'undefined') ? HTMLElement : function () {};
    function readOpts(node) {
      var opts = {};
      ATTRS.forEach(function (a) {
        if (!node.hasAttribute(a)) return;
        var v = node.getAttribute(a), key = camel(a);
        opts[key] = (a === 'mode' || a === 'tint' || a === 'sheen-color' || a === 'background') ? v : parseFloat(v);
      });
      return opts;
    }
    var C = function () { return Reflect.construct(Base, [], C); };
    C.prototype = Object.create(Base.prototype);
    C.observedAttributes = ATTRS;
    C.prototype.connectedCallback = function () {
      var self = this; if (this.style.display === '') this.style.display = 'block';
      requestAnimationFrame(function () { self._lg = apply(self, readOpts(self)); });
    };
    C.prototype.attributeChangedCallback = function () { if (this._lg) this._lg.update(readOpts(this)); };
    C.prototype.disconnectedCallback = function () { if (this._lg) { this._lg.destroy(); this._lg = null; } };
    try { customElements.define('glass-kit', C); } catch (e) {}
  }
  if (typeof window !== 'undefined') { if (document.readyState !== 'loading') defineElement(); else document.addEventListener('DOMContentLoaded', defineElement); }

  return { apply: apply, defineElement: defineElement, isChromium: isChromium, pickMode: pickMode, DEFAULTS: DEFAULTS, version: '1.0.1' };
});
