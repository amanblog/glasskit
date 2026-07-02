"use client";
/*
 * <LiquidGlass> — React/Next.js wrapper around liquid-glass.js.
 * Ships without JSX so it works in any bundler (no transform of node_modules needed).
 *
 *   import LiquidGlass from "glasskit-js/react";
 *
 *   <LiquidGlass as="button" mode="auto" refraction={90} dispersion={0.5}
 *                style={{ borderRadius: 999, padding: "14px 28px" }}>
 *     Get tickets
 *   </LiquidGlass>
 *
 * Renders a normal element; the effect follows its own size + border-radius.
 * SSR-safe: the engine only runs in a client effect.
 */
import React, { useRef, useEffect } from "react";
import LG from "./liquid-glass.js";

const GLASS_KEYS = [
  "mode", "frost", "refraction", "depth", "dispersion", "splay",
  "lightAngle", "lightIntensity", "curvature", "convexity", "bevel",
  "tint", "tintOpacity", "sheen", "sheenColor", "sheenAngle", "saturate", "brightness", "shadow", "radius", "background",
];

const LiquidGlass = React.forwardRef(function LiquidGlass({ as: Tag = "div", children, ...props }, forwardedRef) {
  const ref = useRef(null);
  const instRef = useRef(null);

  // split glass options from normal DOM props
  const opts = {};
  const rest = {};
  for (const k in props) {
    if (GLASS_KEYS.includes(k)) opts[k] = props[k];
    else rest[k] = props[k];
  }
  const optsKey = JSON.stringify(opts);

  useEffect(() => {
    if (!ref.current) return;
    instRef.current = LG.apply(ref.current, JSON.parse(optsKey));
    return () => { instRef.current?.destroy(); instRef.current = null; };
    // re-create only when the engine `mode` changes; other params are hot-updated below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.parse(optsKey).mode]);

  useEffect(() => {
    instRef.current?.update(JSON.parse(optsKey));
  }, [optsKey]);

  // keep our internal ref and forward the node to the caller's ref too
  const setRef = (node) => {
    ref.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  return React.createElement(Tag, { ref: setRef, ...rest }, children);
});

export default LiquidGlass;
