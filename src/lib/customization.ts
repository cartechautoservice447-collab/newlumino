export type ThemeBase = "original" | "dark" | "light";
export type QualityLevel = "low" | "medium" | "high" | "ultra" | "custom";
export type MotionLevel = "low" | "medium" | "high" | "ultra";
export type UiFont = "inter" | "system" | "mono";

export type Customization = {
  theme: ThemeBase;
  glassPreset: QualityLevel;
  glassBlur: number; // px 0..32
  glassOpacity: number; // % 10..90
  glassThickness: number; // 0..4 (border px + shadow depth)
  motion: MotionLevel;
  uiFont: UiFont;
  uiFontSize: number; // px
  uiLineHeight: number;
  editorFontSize: number; // px
  editorLineHeight: number;
  // Liquid Glass Engine
  liquidGlassEnabled: boolean;
  liquidDensity: number; // px 0..40 — viscosity/refraction blur
  liquidTransparency: number; // % 5..95 — alpha blending
  liquidClearness: number; // 0..100 — SVG turbulence distortion/glare clarity
  liquidGel: number; // 0..100 — surface tension / inner bevel depth
  liquidBounce: number; // 0..100 — spring springiness (drives stiffness+damping)
};

export const GLASS_PRESETS: Record<
  Exclude<QualityLevel, "custom">,
  Pick<Customization, "glassBlur" | "glassOpacity" | "glassThickness">
> = {
  low: { glassBlur: 0, glassOpacity: 70, glassThickness: 0.5 },
  medium: { glassBlur: 8, glassOpacity: 45, glassThickness: 1 },
  high: { glassBlur: 18, glassOpacity: 32, glassThickness: 1.5 },
  ultra: { glassBlur: 28, glassOpacity: 22, glassThickness: 2.5 },
};

export const FONT_STACKS: Record<UiFont, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Consolas", ui-monospace, monospace',
};

export const DEFAULT_CUSTOMIZATION: Customization = {
  theme: "original",
  glassPreset: "high",
  ...GLASS_PRESETS.high,
  motion: "high",
  uiFont: "inter",
  uiFontSize: 15,
  uiLineHeight: 1.55,
  editorFontSize: 14,
  editorLineHeight: 1.8,
  liquidGlassEnabled: false,
  liquidDensity: 20,
  liquidTransparency: 55,
  liquidClearness: 55,
  liquidGel: 50,
  liquidBounce: 55,
};

const KEY = "glass-notes:customization:v1";

export function loadCustomization(): Customization {
  if (typeof window === "undefined") return DEFAULT_CUSTOMIZATION;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CUSTOMIZATION;
    const parsed = JSON.parse(raw) as Partial<Customization>;
    return { ...DEFAULT_CUSTOMIZATION, ...parsed };
  } catch {
    return DEFAULT_CUSTOMIZATION;
  }
}

export function saveCustomization(value: Customization) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

const MOTION_SCALE: Record<MotionLevel, number> = {
  low: 0,
  medium: 0.7,
  high: 1,
  ultra: 1.25,
};

export function toCssVars(c: Customization): Record<string, string> {
  return {
    "--glass-blur": `${c.glassBlur}px`,
    "--glass-alpha": `${c.glassOpacity / 100}`,
    "--glass-border-w": `${c.glassThickness}px`,
    "--glass-depth": `${c.glassThickness}`,
    "--motion-scale": `${MOTION_SCALE[c.motion]}`,
    "--ui-font": FONT_STACKS[c.uiFont],
    "--ui-font-size": `${c.uiFontSize}px`,
    "--ui-line-height": `${c.uiLineHeight}`,
    "--editor-font-size": `${c.editorFontSize}px`,
    "--editor-line-height": `${c.editorLineHeight}`,
    "--liquid-density": `${c.liquidDensity}px`,
    "--liquid-transparency": `${c.liquidTransparency / 100}`,
    "--liquid-clearness": `${c.liquidClearness}`,
    "--liquid-gel": `${c.liquidGel}`,
    "--liquid-bounce": `${c.liquidBounce}`,
  };
}

/** Derives spring params (Framer-Motion-style) from a single 0..100 "bounce" value. */
export function liquidSpringParams(bounce: number): { stiffness: number; damping: number } {
  const t = Math.min(100, Math.max(0, bounce)) / 100;
  return {
    stiffness: 100 + t * 400, // 100 .. 500
    damping: 40 - t * 30, // 40 .. 10
  };
}
