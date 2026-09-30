export type WebsiteTheme = "default" | "fluid-glass";
export type ThemeBase = "original" | "dark" | "light";
export type QualityLevel = "low" | "medium" | "high" | "ultra" | "custom";
export type MotionLevel = "low" | "medium" | "high" | "ultra";
export type UiFont = "inter" | "system" | "mono";

export type FluidGlassAppearance = "dark" | "light";
export type FluidGlassTextClarity = "default" | "smooth" | "medium" | "punchy";

export type Customization = {
  websiteTheme: WebsiteTheme;
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
  // Liquid Glass Engine (Current website default)
  liquidGlassEnabled: boolean;
  liquidDensity: number; // px 0..40 — viscosity/refraction blur
  liquidTransparency: number; // % 5..95 — alpha blending
  liquidClearness: number; // 0..100 — SVG turbulence distortion/glare clarity
  liquidGel: number; // 0..100 — surface tension / inner bevel depth
  liquidBounce: number; // 0..100 — spring springiness (drives stiffness+damping)

  // Fluid Glass Studio (Old website theme)
  fluidAppearance: FluidGlassAppearance;
  fluidPureBlack: boolean;
  fluidOrbsEnabled: boolean;
  fluidTextClarity: FluidGlassTextClarity;
  fluidPerformance: "high" | "ultra";
  fluidDensity: number; // 0..40 (default 12)
  fluidTransparency: number; // 5..95 (default 45)
  fluidClearness: number; // 0..100 (default 35)
  fluidGel: number; // 0..100 (default 55)
  fluidBounceStiffness: number; // 100..500 (default 200)
  fluidBounceDamping: number; // 10..40 (default 24)
  // Fluid Glass Studio — Background Theme (exact from fluid-glass-studio)
  fluidBackgroundThemeEnabled: boolean;
  fluidBackgroundOpacity: number; // 0..100 (default 100)
  fluidFullDarkBackground: boolean;
};

export const FLUID_GLASS_DEFAULTS = {
  fluidAppearance: "dark" as FluidGlassAppearance,
  fluidPureBlack: false,
  fluidOrbsEnabled: true,
  fluidTextClarity: "default" as FluidGlassTextClarity,
  fluidPerformance: "high" as "high" | "ultra",
  fluidDensity: 12,
  fluidTransparency: 45,
  fluidClearness: 35,
  fluidGel: 55,
  fluidBounceStiffness: 200,
  fluidBounceDamping: 24,
  fluidBackgroundThemeEnabled: false,
  fluidBackgroundOpacity: 100,
  fluidFullDarkBackground: false,
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
  websiteTheme: "default",
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
  ...FLUID_GLASS_DEFAULTS,
};

const KEY = "glass-notes:customization:v1";

export function loadCustomization(): Customization {
  if (typeof window === "undefined") return DEFAULT_CUSTOMIZATION;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CUSTOMIZATION;
    const rawParsed = JSON.parse(raw) as Record<string, unknown>;
    if (rawParsed.theme === "fluid-glass") {
      rawParsed.websiteTheme = "fluid-glass";
      rawParsed.theme = "original";
    }
    return { ...DEFAULT_CUSTOMIZATION, ...(rawParsed as Partial<Customization>) };
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
  const vars: Record<string, string> = {
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

  // Fluid Glass Studio (Old website theme) tokens — exact from fluid-glass-studio
  const fluidTransparency = (c.fluidTransparency ?? 45) / 100;
  const darkVeilAlpha =
    fluidTransparency <= 0.45
      ? 0.0775 + 0.45 * fluidTransparency
      : 0.46 - 0.4 * fluidTransparency;

  // When old website theme is active, --liquid-density drives the glass blur in GlassPanel/index.css
  // so it MUST come from fluidDensity not liquidDensity
  if (c.websiteTheme === "fluid-glass") {
    vars["--liquid-density"] = `${c.fluidDensity ?? 12}px`;
  }

  vars["--fluid-density"] = `${c.fluidDensity ?? 12}px`;
  vars["--fluid-transparency"] = `${fluidTransparency}`;
  vars["--liquid-glass-alpha"] = `${fluidTransparency}`;
  vars["--liquid-glass-dark-alpha"] = `${fluidTransparency * 0.16}`;
  vars["--liquid-veil-alpha"] = `${fluidTransparency * 0.36}`;
  vars["--liquid-dark-veil-alpha"] = `${darkVeilAlpha}`;
  vars["--fluid-clearness"] = `${c.fluidClearness ?? 35}`;
  vars["--fluid-gel"] = `${c.fluidGel ?? 55}`;
  vars["--fluid-bounce"] = `${c.fluidBounceStiffness ?? 200}`;
  vars["--fluid-bounce-damping"] = `${c.fluidBounceDamping ?? 24}`;
  vars["--background-opacity"] = `${(c.fluidBackgroundOpacity ?? 100) / 100}`;

  const gel = (c.fluidGel ?? 55) / 100;
  vars["--fluid-border-radius"] = `${18 + gel * 26}px`;
  vars["--fluid-card-radius"] = `${16 + gel * 20}px`;
  vars["--fluid-shadow-inset-top"] = `${1 + gel * 1.5}px`;
  vars["--fluid-shadow-inset-blur"] = `${2 + gel * 3}px`;
  vars["--fluid-shadow-inset-bot"] = `-${2 + gel * 3}px`;
  vars["--fluid-shadow-inset-bot-blur"] = `${4 + gel * 6}px`;
  vars["--fluid-shadow-drop-y"] = `${8 + gel * 10}px`;
  vars["--fluid-shadow-drop-blur"] = `${32 + gel * 24}px`;

  if (c.fluidAppearance === "dark") {
    vars["--water-gel-bg"] = `rgb(255 255 255 / var(--liquid-glass-dark-alpha, 0.07))`;
  } else {
    vars["--water-gel-bg"] = `rgb(255 255 255 / var(--liquid-glass-alpha, 0.45))`;
  }

  return vars;
}

/** Derives spring params (Framer-Motion-style) from a single 0..100 "bounce" value. */
export function liquidSpringParams(bounce: number): { stiffness: number; damping: number } {
  const t = Math.min(100, Math.max(0, bounce)) / 100;
  return {
    stiffness: 100 + t * 400, // 100 .. 500
    damping: 40 - t * 30, // 40 .. 10
  };
}
