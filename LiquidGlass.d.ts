import * as React from "react";
import { LiquidGlassOptions } from "./liquid-glass";

export interface LiquidGlassProps
  extends LiquidGlassOptions,
    React.HTMLAttributes<HTMLElement> {
  /** Element tag to render (e.g. "div", "button", "section"). @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

declare const LiquidGlass: React.ForwardRefExoticComponent<
  LiquidGlassProps & React.RefAttributes<HTMLElement>
>;
export default LiquidGlass;
