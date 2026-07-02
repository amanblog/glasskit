/* Glasskit generator — state, live preview, presets, multi-format code export */
(function () {
  "use strict";

  var state = {
    mode: "webgl", shape: "card", scene: "mesh",
    w: 340, h: 210, radius: 30,
    frost: 6, refraction: 90, depth: 22, dispersion: 0.4, splay: 0,
    lightAngle: -45, lightIntensity: 0.8, curvature: 2.2, convexity: 1, bevel: 0.6,
    tintOpacity: 0, tint: "255,255,255", sheen: 0, sheenColor: "255,255,255", sheenAngle: null,
    shadow: "none",
  };
  var DEFAULT_SHADOW = "0 8px 30px rgba(0,0,0,0.18)";

  var $ = function (s) { return document.querySelector(s); };
  var glass = $("#glass"), sceneDom = $("#sceneDom"), sceneCanvas = $("#sceneCanvas");
  var inst = null, codeTab = "react";

  /* ----------------------------- scenes ----------------------------- */
  var SCENES = {
    mesh: { grad: ["#ff7a59", "#a855f7", "#3b82f6", "#06b6d4"], dots: ["#fde047", "#34d399", "#fb7185", "#22d3ee"] },
    sunset: { grad: ["#f59e0b", "#ef4444", "#db2777", "#7c3aed"], dots: ["#fff7ed", "#fecaca", "#fbcfe8", "#ddd6fe"] },
    ocean: { grad: ["#0ea5e9", "#2563eb", "#4f46e5", "#0f172a"], dots: ["#67e8f9", "#a5b4fc", "#bae6fd", "#e0e7ff"] },
    mono: { grad: ["#e5e7eb", "#9ca3af", "#4b5563", "#111827"], dots: ["#ffffff", "#d1d5db", "#9ca3af", "#6b7280"] },
  };
  var DOT_POS = [[12, 18], [70, 12], [40, 55], [85, 60], [22, 78], [60, 85], [90, 30], [8, 45]];

  function buildDomScene() {
    var s = SCENES[state.scene];
    var html = "";
    DOT_POS.forEach(function (p, i) {
      var size = 90 + (i % 4) * 40;
      html += '<div style="position:absolute;left:' + p[0] + '%;top:' + p[1] + '%;width:' + size +
        'px;height:' + size + 'px;border-radius:50%;background:' + s.dots[i % s.dots.length] +
        ';opacity:.55;transform:translate(-50%,-50%);filter:blur(2px)"></div>';
    });
    html += '<div style="position:absolute;left:5%;bottom:6%;font:800 84px ' +
      'system-ui;color:#fff;opacity:.9">LOOP</div>';
    html += '<div style="position:absolute;right:6%;top:8%;font:800 64px system-ui;color:#fff;opacity:.85">GLASS</div>';
    sceneDom.style.background = "linear-gradient(135deg," + s.grad.join(",") + ")";
    sceneDom.innerHTML = html;
  }
  function paintCanvasScene() {
    var s = SCENES[state.scene], r = $("#stage").getBoundingClientRect();
    var w = sceneCanvas.width = Math.round(r.width), h = sceneCanvas.height = Math.round(r.height);
    var ctx = sceneCanvas.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, w, h);
    s.grad.forEach(function (c, i) { g.addColorStop(i / (s.grad.length - 1), c); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    DOT_POS.forEach(function (p, i) {
      ctx.globalAlpha = .55; ctx.fillStyle = s.dots[i % s.dots.length];
      ctx.beginPath(); ctx.arc(p[0] / 100 * w, p[1] / 100 * h, (90 + (i % 4) * 40) / 2, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = .9; ctx.fillStyle = "#fff"; ctx.font = "800 84px system-ui";
    ctx.fillText("LOOP", w * .05, h * .94); ctx.font = "800 64px system-ui";
    ctx.fillText("GLASS", w * .7, h * .16); ctx.globalAlpha = 1;
  }

  function buildSwatches() {
    var wrap = $("#swatches"); wrap.innerHTML = "";
    Object.keys(SCENES).forEach(function (k) {
      var b = document.createElement("button");
      b.className = "swatch" + (k === state.scene ? " on" : "");
      b.style.background = "linear-gradient(135deg," + SCENES[k].grad.join(",") + ")";
      b.title = k;
      b.onclick = function () { state.scene = k; renderScene(); rebuild(); };
      wrap.appendChild(b);
    });
  }
  function renderScene() {
    buildDomScene(); buildSwatches();
    if (state.mode === "webgl") { paintCanvasScene(); sceneCanvas.style.display = "block"; sceneDom.style.display = "none"; }
    else { sceneCanvas.style.display = "none"; sceneDom.style.display = "block"; }
  }

  /* --------------------------- apply engine --------------------------- */
  function glassOpts() {
    var o = {
      mode: state.mode, frost: state.frost, refraction: state.refraction, depth: state.depth,
      dispersion: state.dispersion, splay: state.splay, lightAngle: state.lightAngle,
      lightIntensity: state.lightIntensity, curvature: state.curvature, convexity: state.convexity, bevel: state.bevel,
      tintOpacity: state.tintOpacity, tint: state.tint, sheen: state.sheen, sheenColor: state.sheenColor, shadow: state.shadow, radius: state.radius,
    };
    if (state.sheenAngle != null) o.sheenAngle = state.sheenAngle;
    if (state.mode === "svg-clone") o.background = sceneDom;
    if (state.mode === "webgl") o.background = sceneCanvas;
    return o;
  }
  /* mobile: the stage is a pinned mini-preview — size it to the shape and
     keep the glass inside the visible area (fully when it fits, centred when not) */
  var stageEl = $("#stage");
  function isNarrow() { return window.matchMedia("(max-width: 980px)").matches; }
  function fitStage() {
    var prev = stageEl.style.height;
    stageEl.style.height = isNarrow()
      ? Math.min(Math.max(260, state.h + 80), Math.round(window.innerHeight * 0.45)) + "px"
      : "";
    if (prev !== stageEl.style.height && state.mode === "webgl") paintCanvasScene();
    clampGlass();
  }
  function clampGlass() {
    var rw = stageEl.clientWidth, rh = stageEl.clientHeight;
    if (!rw || !rh) return;
    var w = glass.offsetWidth || state.w, h = glass.offsetHeight || state.h;
    var cs = getComputedStyle(glass);
    var l = parseFloat(glass.style.left) || parseFloat(cs.left) || 0;
    var t = parseFloat(glass.style.top) || parseFloat(cs.top) || 0;
    var nl = w + 16 <= rw ? Math.min(Math.max(l, 8), rw - w - 8) : (rw - w) / 2;
    var nt = h + 16 <= rh ? Math.min(Math.max(t, 8), rh - h - 8) : (rh - h) / 2;
    if (nl !== l) glass.style.left = nl + "px";
    if (nt !== t) glass.style.top = nt + "px";
  }
  window.addEventListener("resize", fitStage);

  function rebuild() {
    if (inst) inst.destroy();
    glass.style.width = state.w + "px"; glass.style.height = state.h + "px";
    glass.style.borderRadius = (state.shape === "circle" ? "50%" : state.radius + "px");
    fitStage();
    inst = Glasskit.apply(glass, glassOpts());
    showResolved(); buildCode();
  }
  function liveUpdate() {
    glass.style.borderRadius = (state.shape === "circle" ? "50%" : state.radius + "px");
    if (inst) inst.update(glassOpts());
    buildCode();
  }
  function showResolved() {
    var resolved = Glasskit.pickMode(state.mode, state.mode === "svg-clone" || state.mode === "webgl");
    var note = $("#modeNote"), res = $("#resolved");
    res.innerHTML = "engine: <b>" + (inst ? inst.mode : resolved) + "</b>";
    var m = inst ? inst.mode : resolved, txt = "", warn = false;
    if (m === "css") txt = "Blur only — no refraction, but works in every browser.";
    else if (m === "svg") { txt = "Real refraction on the live backdrop. Chromium only — falls back to blur in Safari/Firefox."; warn = !Glasskit.isChromium(); }
    else if (m === "svg-clone") txt = "Real refraction in Chrome / Safari / Firefox (clones the backdrop). DOM only, not <canvas>.";
    else if (m === "webgl") txt = "Real refraction in a shader of a supplied background. Cross-browser.";
    if (state.mode === "auto") txt = "Auto picked “" + m + "” for this browser. " + txt;
    note.textContent = txt; note.className = "modeNote" + (warn ? " warn" : "");
  }

  /* ----------------------------- controls ----------------------------- */
  document.querySelectorAll("#modeSeg button").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll("#modeSeg button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on"); state.mode = b.dataset.m; renderScene(); rebuild();
    };
  });

  var SHAPES = { card: [340, 210, 30], button: [180, 56, 16], pill: [320, 110, 55], circle: [220, 220, 110], square: [300, 200, 4] };
  $("#shape").onchange = function (e) {
    state.shape = e.target.value; var s = SHAPES[state.shape];
    state.w = s[0]; state.h = s[1]; state.radius = s[2];
    var rs = document.getElementById("sl_radius"); if (rs) { rs.value = s[2]; document.getElementById("v_radius").textContent = s[2]; }
    rebuild();
  };

  var FIGMA = [
    ["frost", "Frost", 0, 30, 1, "", "Backdrop blur behind the glass. Higher = frostier, more opaque."],
    ["refraction", "Refraction", 0, 200, 1, "", "How strongly the edges bend the background, like a real lens."],
    ["depth", "Depth", 2, 80, 1, "", "Width of the refracting bevel band at the edge. Lower = thinner edge."],
    ["lightAngle", "Light angle", -180, 180, 1, "°", "Direction of the simulated light source — drives the rim light and shadow."],
    ["lightIntensity", "Light intensity", 0, 1, 0.02, "", "Strength of the specular rim highlight / edge light."],
  ];
  var OPTICAL = [
    ["bevel", "Bevel / thickness (0 = flat)", 0, 1, 0.05, "", "Directional 3D edge thickness. 1 = full beveled glass, 0 = flat pane with just a border (search-box look)."],
    ["sheen", "Sheen / gloss (0 = off)", 0, 1, 0.02, "", "Diagonal gloss sweep across the glass face. 0 = off (the light border stays)."],
    ["sheenAngle", "Sheen angle", -180, 180, 5, "°", "Direction of the gloss sweep across the face. Defaults to follow the light angle."],
    ["tintOpacity", "Tint opacity", 0, 0.4, 0.01, "", "Opacity of the glass color fill laid over the backdrop."],
    ["radius", "Corner radius", 0, 120, 1, "", "Corner rounding of the glass element, in pixels."],
  ];
  var ADVANCED = [
    ["dispersion", "Dispersion", 0, 1, 0.02, "", "Chromatic aberration — splits light into a prismatic RGB fringe at the edge. 0 = none (the Apple look)."],
    ["splay", "Splay", 0, 1, 0.02, "", "Softens and widens how the bevel fades into the flat center."],
    ["curvature", "Curvature", 1, 6, 0.1, "", "Edge profile shape: ~2 = round/spherical, ~4 = squircle (a thin, concentrated rim)."],
    ["convexity", "Convexity", -1, 1, 0.05, "", "Lens bulge: +1 magnifies (thick), 0 flat, -1 concave (shrinks the view)."],
  ];
  function buildSliders(list, host) {
    host.innerHTML = "";
    list.forEach(function (p) {
      var k = p[0], row = document.createElement("div"); row.className = "row";
      var cur = state[k] == null && k === "sheenAngle" ? (state.lightAngle + 90) : state[k];
      var tip = p[6] ? ' <span class="info" tabindex="0" role="img" aria-label="' + escapeHtml(p[6]) + '">i<span class="tip">' + escapeHtml(p[6]) + '</span></span>' : '';
      row.innerHTML = '<label><span class="lbl">' + p[1] + tip + '</span> <b id="v_' + k + '">' + cur + p[5] + '</b></label>' +
        '<input id="sl_' + k + '" type="range" min="' + p[2] + '" max="' + p[3] + '" step="' + p[4] + '" value="' + cur + '">';
      host.appendChild(row);
      row.querySelector("input").addEventListener("input", function (e) {
        state[k] = parseFloat(e.target.value);
        document.getElementById("v_" + k).textContent = state[k] + p[5];
        liveUpdate();
      });
    });
  }

  var PRESETS = {
    "Frosted card": { shape: "card", frost: 10, refraction: 60, depth: 26, dispersion: 0.2, splay: 0.3, lightAngle: -45, lightIntensity: 0.7, curvature: 2.2, convexity: 1, tintOpacity: 0.1 },
    "iOS button": { shape: "button", frost: 6, refraction: 80, depth: 14, dispersion: 0.35, splay: 0.1, lightAngle: -60, lightIntensity: 0.9, curvature: 2.4, convexity: 1, tintOpacity: 0.08 },
    "Dock": { shape: "pill", frost: 8, refraction: 50, depth: 30, dispersion: 0.15, splay: 0.4, lightAngle: -90, lightIntensity: 0.7, curvature: 2, convexity: 1, tintOpacity: 0.07 },
    "Modal": { shape: "card", frost: 16, refraction: 40, depth: 24, dispersion: 0.1, splay: 0.5, lightAngle: -45, lightIntensity: 0.6, curvature: 2, convexity: 1, tintOpacity: 0.12 },
    "Lens": { shape: "circle", frost: 2, refraction: 160, depth: 50, dispersion: 0.6, splay: 0, lightAngle: -45, lightIntensity: 0.85, curvature: 3, convexity: 1, tintOpacity: 0.04 },
    "Magnifier": { shape: "circle", frost: 0, refraction: 120, depth: 60, dispersion: 0.25, splay: 0, lightAngle: -30, lightIntensity: 0.8, curvature: 4, convexity: 1, tintOpacity: 0.02 },
    "Reset": Object.assign({ shape: "card" }, { frost: 6, refraction: 90, depth: 22, dispersion: 0.4, splay: 0, lightAngle: -45, lightIntensity: 0.8, curvature: 2.2, convexity: 1, bevel: 0.6, tintOpacity: 0, tint: "255,255,255", sheen: 0, sheenAngle: null, shadow: "none" }),
  };
  function buildPresets() {
    var host = $("#presets"); host.innerHTML = "";
    Object.keys(PRESETS).forEach(function (name) {
      var c = document.createElement("button"); c.className = "chip"; c.textContent = name;
      c.onclick = function () { applyPreset(PRESETS[name]); }; host.appendChild(c);
    });
  }
  function applyPreset(p) {
    Object.keys(p).forEach(function (k) { state[k] = p[k]; });
    if (p.shape) { var s = SHAPES[p.shape]; state.w = s[0]; state.h = s[1]; state.radius = s[2]; $("#shape").value = p.shape; }
    buildSliders(FIGMA, $("#figmaSliders")); buildSliders(OPTICAL, $("#opticalSliders")); buildSliders(ADVANCED, $("#advancedSliders"));
    tintColorInput.value = rgbToHex(state.tint);
    sheenColorInput.value = rgbToHex(state.sheenColor);
    syncShadowControl();
    rebuild();
  }

  /* ------------------------------ drag ------------------------------ */
  (function () {
    var sx, sy, ox, oy, down = false;
    glass.addEventListener("pointerdown", function (e) {
      down = true; glass.classList.add("drag"); glass.setPointerCapture(e.pointerId);
      // read the real rendered position — initial left/top come from the stylesheet,
      // so glass.style.left is empty until the first drag; fall back to computed values
      var cs = getComputedStyle(glass);
      sx = e.clientX; sy = e.clientY;
      ox = parseFloat(glass.style.left) || parseFloat(cs.left) || 0;
      oy = parseFloat(glass.style.top) || parseFloat(cs.top) || 0;
    });
    glass.addEventListener("pointermove", function (e) {
      if (!down) return;
      // keep at least 60px of the glass on-stage so it can't be lost off-screen
      var VIS = 60, w = glass.offsetWidth, h = glass.offsetHeight;
      var rw = stageEl.clientWidth, rh = stageEl.clientHeight;
      glass.style.left = Math.min(Math.max(ox + e.clientX - sx, VIS - w), rw - VIS) + "px";
      glass.style.top = Math.min(Math.max(oy + e.clientY - sy, VIS - h), rh - VIS) + "px";
    });
    glass.addEventListener("pointerup", function () { down = false; glass.classList.remove("drag"); });
  })();

  /* -------------------------- code generators -------------------------- */
  function num(v) { return Number.isInteger(v) ? v : parseFloat(v.toFixed(3)); }
  function needsBg() { return state.mode === "svg-clone" || state.mode === "webgl"; }
  function jsOpts(indent) {
    var p = ["mode: '" + state.mode + "'",
      "frost: " + num(state.frost), "refraction: " + num(state.refraction), "depth: " + num(state.depth),
      "dispersion: " + num(state.dispersion), "splay: " + num(state.splay), "lightAngle: " + num(state.lightAngle),
      "lightIntensity: " + num(state.lightIntensity), "curvature: " + num(state.curvature),
      "convexity: " + num(state.convexity), "tintOpacity: " + num(state.tintOpacity),
      "sheen: " + num(state.sheen), "radius: " + num(state.radius)];
    if (state.bevel !== 1) p.push("bevel: " + num(state.bevel));
    if (state.tint !== "255,255,255") p.push("tint: '" + state.tint + "'");
    if (state.sheenColor !== "255,255,255") p.push("sheenColor: '" + state.sheenColor + "'");
    if (state.sheenAngle != null) p.push("sheenAngle: " + num(state.sheenAngle));
    if (state.shadow !== DEFAULT_SHADOW) p.push("shadow: '" + state.shadow + "'");
    if (needsBg()) p.push("background: '#bg'  // the element/canvas to refract");
    return indent + p.join(",\n" + indent);
  }
  function styleStr() {
    return "width:" + state.w + "px;height:" + state.h + "px;border-radius:" +
      (state.shape === "circle" ? "50%" : state.radius + "px");
  }

  var GEN = {
    react: function () {
      var attrs = ["mode=\"" + state.mode + "\"",
        "frost={" + num(state.frost) + "} refraction={" + num(state.refraction) + "} depth={" + num(state.depth) + "}",
        "dispersion={" + num(state.dispersion) + "} splay={" + num(state.splay) + "}",
        "lightAngle={" + num(state.lightAngle) + "} lightIntensity={" + num(state.lightIntensity) + "}",
        "curvature={" + num(state.curvature) + "} convexity={" + num(state.convexity) + "}" + (state.bevel !== 1 ? " bevel={" + num(state.bevel) + "}" : "") + " tintOpacity={" + num(state.tintOpacity) + "}",
        "sheen={" + num(state.sheen) + "}" + (state.tint !== "255,255,255" ? " tint=\"" + state.tint + "\"" : "") + (state.sheenColor !== "255,255,255" ? " sheenColor=\"" + state.sheenColor + "\"" : "") +
        (state.sheenAngle != null ? " sheenAngle={" + num(state.sheenAngle) + "}" : "") +
        (state.shadow !== DEFAULT_SHADOW ? " shadow=\"" + state.shadow + "\"" : "")];
      var bg = needsBg() ? "\n      background=\"#bg\"" : "";
      return "// npm i glasskit-js\nimport Glass from 'glasskit-js/react';\n\nexport default function Demo() {\n  return (\n    <Glass\n      " +
        attrs.join("\n      ") + bg + "\n      radius={" + num(state.radius) + "}\n      style={{ width: " + state.w + ", height: " + state.h +
        ", borderRadius: " + (state.shape === "circle" ? "'50%'" : state.radius) + " }}\n    >\n      Liquid Glass\n    </Glass>\n  );\n}";
    },
    vue: function () {
      return "<!-- npm i glasskit-js -->\n<script setup>\nimport { ref, onMounted, onBeforeUnmount } from 'vue'\nimport Glass from 'glasskit-js'\n\nconst el = ref()\nlet g\nonMounted(() => {\n  g = Glasskit.apply(el.value, {\n" +
        jsOpts("    ") + "\n  })\n})\nonBeforeUnmount(() => g && g.destroy())\n<\/script>\n\n<template>\n  <div ref=\"el\" style=\"" + styleStr() + "\">Liquid Glass</div>\n</template>";
    },
    vanilla: function () {
      var bgEl = needsBg() ? '<div id="bg"><!-- your background/content --></div>\n' : "";
      return "<!-- 1. load the engine -->\n<script src=\"https://unpkg.com/glasskit-js\"><\/script>\n\n<!-- 2. your markup -->\n" +
        bgEl + '<div id="glass" style="' + styleStr() + '">Liquid Glass</div>\n\n<script>\n  Glasskit.apply(document.querySelector(\'#glass\'), {\n' +
        jsOpts("    ") + "\n  });\n<\/script>";
    },
    "web component": function () {
      var bg = needsBg() ? ' background="#bg"' : "";
      return "<!-- registers <glass-kit> automatically -->\n<script src=\"https://unpkg.com/glasskit-js\"><\/script>\n\n<glass-kit mode=\"" + state.mode +
        "\"\n  frost=\"" + num(state.frost) + "\" refraction=\"" + num(state.refraction) + "\" depth=\"" + num(state.depth) +
        "\" dispersion=\"" + num(state.dispersion) + "\"\n  splay=\"" + num(state.splay) + "\" light-angle=\"" + num(state.lightAngle) +
        "\" light-intensity=\"" + num(state.lightIntensity) + "\"\n  curvature=\"" + num(state.curvature) + "\" convexity=\"" + num(state.convexity) +
        "\"" + (state.bevel !== 1 ? " bevel=\"" + num(state.bevel) + "\"" : "") + (state.tint !== "255,255,255" ? " tint=\"" + state.tint + "\"" : "") + " tint-opacity=\"" + num(state.tintOpacity) + "\" sheen=\"" + num(state.sheen) + "\"" +
        (state.sheenColor !== "255,255,255" ? " sheen-color=\"" + state.sheenColor + "\"" : "") +
        (state.sheenAngle != null ? " sheen-angle=\"" + num(state.sheenAngle) + "\"" : "") +
        (state.shadow !== DEFAULT_SHADOW ? " shadow=\"" + state.shadow + "\"" : "") +
        " radius=\"" + num(state.radius) + "\"" + bg +
        "\n  style=\"" + styleStr() + ";display:flex;align-items:flex-end;padding:20px;color:#fff\">\n  Liquid Glass\n</glass-kit>";
    },
    css: function () {
      var li = state.lightIntensity;
      var drop = state.shadow && state.shadow !== "none" ? ",\n    " + state.shadow : "";
      return "/* Pure CSS — every browser, but BLUR ONLY (no refraction).\n   For real refraction use the React / Vue / Vanilla / Web Component tabs. */\n.glass {\n  width: " +
        state.w + "px; height: " + state.h + "px;\n  border-radius: " + (state.shape === "circle" ? "50%" : state.radius + "px") + ";\n  background: rgba(" + state.tint + ", " + num(state.tintOpacity) +
        ");\n  backdrop-filter: blur(" + num(state.frost) + "px) saturate(1.4) brightness(1.04);\n  -webkit-backdrop-filter: blur(" + num(state.frost) +
        "px) saturate(1.4) brightness(1.04);\n  box-shadow:\n    inset 0 0 0 1px rgba(255,255,255," + num(0.3 * li) +
        "),\n    inset 1.4px 1.4px 2px rgba(255,255,255," + num(0.5 * li) + ")" + drop + ";\n}";
    },
    tailwind: function () {
      var li = Math.round(state.lightIntensity * 100) / 100;
      var drop = state.shadow && state.shadow !== "none" ? "," + state.shadow.replace(/ /g, "_") : "";
      return "<!-- Pure CSS via Tailwind (blur only, no refraction). Arbitrary values mirror your sliders. -->\n<div class=\"\n  w-[" +
        state.w + "px] h-[" + state.h + "px] rounded-[" + (state.shape === "circle" ? "9999px" : state.radius + "px") + "]\n  bg-[rgba(" + state.tint.replace(/\s+/g, "") + "," + num(state.tintOpacity) +
        ")]\n  backdrop-blur-[" + num(state.frost) + "px] backdrop-saturate-150 backdrop-brightness-105\n  shadow-[inset_0_0_0_1px_rgba(255,255,255," + num(0.3 * li) +
        ")" + drop + "]\n\">\n  Liquid Glass\n</div>";
    },
  };
  var TABS = ["react", "vue", "vanilla", "web component", "css", "tailwind"];

  function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function highlight(code) {
    var out = escapeHtml(code);
    // comments + strings in one non-overlapping pass
    out = out.replace(/(\/\/[^\n]*|&lt;!--[\s\S]*?--&gt;|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      function (m, com, str) {
        if (com) return '<span class="tok-com">' + com + "</span>";
        return '<span class="tok-str">' + str + "</span>";
      });
    out = out.replace(/\b(import|from|export|default|function|return|const|let|new|onMounted|onBeforeUnmount|ref)\b/g, '<span class="tok-key">$1</span>');
    return out;
  }
  function buildTabs() {
    var host = $("#tabs"); host.innerHTML = "";
    TABS.forEach(function (t) {
      var b = document.createElement("button"); b.className = "tab" + (t === codeTab ? " on" : "");
      b.textContent = t; b.onclick = function () { codeTab = t; buildTabs(); buildCode(); }; host.appendChild(b);
    });
  }
  function buildCode() {
    var code = GEN[codeTab](); $("#code").innerHTML = highlight(code);
    $("#copyBtn").dataset.raw = code; $("#copyBtn").textContent = "Copy"; $("#copyBtn").className = "copy";
  }
  $("#copyBtn").onclick = function () {
    var raw = this.dataset.raw || "";
    navigator.clipboard.writeText(raw).then(function () {
      var b = $("#copyBtn"); b.textContent = "Copied ✓"; b.className = "copy done";
      setTimeout(function () { b.textContent = "Copy"; b.className = "copy"; }, 1400);
    });
  };

  /* --------------------------- sheen color --------------------------- */
  function rgbToHex(rgb) { return "#" + rgb.split(",").map(function (x) { return (+x).toString(16).padStart(2, "0"); }).join(""); }
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255); }
  var tintColorInput = $("#tintColor");
  tintColorInput.value = rgbToHex(state.tint);
  tintColorInput.addEventListener("input", function (e) { state.tint = hexToRgb(e.target.value); liveUpdate(); });
  var sheenColorInput = $("#sheenColor");
  sheenColorInput.value = rgbToHex(state.sheenColor);
  sheenColorInput.addEventListener("input", function (e) { state.sheenColor = hexToRgb(e.target.value); liveUpdate(); });

  /* --------------------------- drop shadow --------------------------- */
  var shadowPreset = $("#shadowPreset"), shadowCustom = $("#shadowCustom"), shadowCustomRow = $("#shadowCustomRow");
  // value-strings here must match the <option value> in index.html
  function syncShadowControl() {
    var opts = Array.prototype.map.call(shadowPreset.options, function (o) { return o.value; });
    if (opts.indexOf(state.shadow) >= 0 && state.shadow !== "__custom") {
      shadowPreset.value = state.shadow; shadowCustomRow.style.display = "none";
    } else {
      shadowPreset.value = "__custom"; shadowCustomRow.style.display = ""; shadowCustom.value = state.shadow;
    }
  }
  shadowPreset.addEventListener("change", function (e) {
    if (e.target.value === "__custom") {
      shadowCustomRow.style.display = ""; shadowCustom.value = state.shadow; shadowCustom.focus();
    } else {
      shadowCustomRow.style.display = "none"; state.shadow = e.target.value; liveUpdate();
    }
  });
  shadowCustom.addEventListener("input", function (e) { state.shadow = e.target.value.trim(); liveUpdate(); });
  syncShadowControl();

  /* ------------------------------ boot ------------------------------ */
  window.addEventListener("resize", function () { if (state.mode === "webgl") paintCanvasScene(); });
  renderScene();
  buildSliders(FIGMA, $("#figmaSliders"));
  buildSliders(OPTICAL, $("#opticalSliders"));
  buildSliders(ADVANCED, $("#advancedSliders"));
  buildPresets();
  buildTabs();
  rebuild();
})();
