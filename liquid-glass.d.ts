/** liquid-glass.js — TypeScript definitions */

export type LiquidGlassMode = "auto" | "css" | "svg" | "svg-clone" | "webgl";

export interface LiquidGlassOptions {
  /**
   * Rendering engine.
   * - `css`        blur + tint + highlight. Every browser. No real refraction.
   * - `svg`        real refraction on the live backdrop. Chromium only.
   * - `svg-clone`  real refraction in Chrome/Safari/Firefox (clones `background`). DOM only.
   * - `webgl`      real refraction of a supplied `background` (img/canvas/video).
   * - `auto`       Chromium→svg; else `background` set→svg-clone; else css.
   * @default "auto"
   */
  mode?: LiquidGlassMode;
  /** Figma "Frost" — backdrop blur in px. @default 6 */
  frost?: number;
  /** Figma "Refraction" — edge displacement strength in px. @default 90 */
  refraction?: number;
  /** Figma "Depth" — bezel width in px. @default 22 */
  depth?: number;
  /** Figma "Dispersion" — chromatic aberration, 0..1. @default 0.4 */
  dispersion?: number;
  /** Figma "Splay" — softens/widens the bezel falloff, 0..1. @default 0 */
  splay?: number;
  /** Figma "Light" angle in degrees. @default -45 */
  lightAngle?: number;
  /** Figma "Light" % — specular highlight, 0..1. @default 0.8 */
  lightIntensity?: number;
  /** Profile exponent: ~2 spherical, ~4 squircle. @default 2.2 */
  curvature?: number;
  /** +1 convex (magnify) .. 0 flat .. -1 concave (shrink). @default 1 */
  convexity?: number;
  /** Glass tint as "r,g,b". @default "255,255,255" */
  tint?: string;
  /** Tint opacity 0..1. @default 0.08 */
  tintOpacity?: number;
  /** Diagonal gloss over the card face, 0..1 (0 removes it; the light border stays). @default 0.7 */
  sheen?: number;
  /** Gloss color as "r,g,b". @default "255,255,255" */
  sheenColor?: string;
  /** Backdrop saturation (css mode). @default 1.4 */
  saturate?: number;
  /** Backdrop brightness (css mode). @default 1.04 */
  brightness?: number;
  /** Outer drop shadow as any CSS box-shadow value; "none" or "" removes it. The inner light border/bezel are controlled by `lightIntensity`. @default "0 8px 30px rgba(0,0,0,0.18)" */
  shadow?: string;
  /** Override corner radius (px). null = read element's border-radius. @default null */
  radius?: number | null;
  /** Element or selector to refract. Required for `svg-clone` and `webgl`. */
  background?: Element | string | null;
}

export interface LiquidGlassInstance {
  readonly el: HTMLElement;
  /** The resolved mode actually in use (after `auto` / fallbacks). */
  readonly mode: LiquidGlassMode;
  /** Hot-update any subset of options. */
  update(patch: Partial<LiquidGlassOptions>): LiquidGlassInstance;
  /** Re-read the background (call after the refracted content changes). */
  refresh(): LiquidGlassInstance;
  /** Remove all DOM, filters and listeners. */
  destroy(): void;
}

export interface LiquidGlassStatic {
  apply(el: HTMLElement, options?: LiquidGlassOptions): LiquidGlassInstance;
  /** Register the <liquid-glass> custom element (auto-called on load). */
  defineElement(): void;
  isChromium(): boolean;
  pickMode(requested: LiquidGlassMode, hasBackground: boolean): LiquidGlassMode;
  DEFAULTS: Required<Omit<LiquidGlassOptions, "background" | "radius">> & {
    radius: number | null;
    background: Element | string | null;
  };
  version: string;
}

declare const LiquidGlass: LiquidGlassStatic;
export default LiquidGlass;
