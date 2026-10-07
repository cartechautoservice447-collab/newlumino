import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CUSTOMIZATION,
  FLUID_GLASS_DEFAULTS,
  GLASS_PRESETS,
  loadCustomization,
  saveCustomization,
  toCssVars,
  type Customization,
  type QualityLevel,
} from "@/lib/customization";
import { LiquidGlassEngine } from "@/components/notes/liquid-glass-engine";

type Ctx = {
  settings: Customization;
  update: (patch: Partial<Customization>) => void;
  applyGlassPreset: (preset: Exclude<QualityLevel, "custom">) => void;
  reset: () => void;
  resetOldThemeDefaults: () => void;
};

const CustomizationContext = createContext<Ctx | null>(null);

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Customization>(DEFAULT_CUSTOMIZATION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadCustomization());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCustomization(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    const root = document.documentElement;
    const vars = toCssVars(settings);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset["motion"] = settings.motion;
    root.dataset["liquidGlass"] = settings.liquidGlassEnabled ? "on" : "off";

    if (settings.websiteTheme === "fluid-glass") {
      root.dataset["theme"] = "fluid-glass";
      root.dataset["fluidAppearance"] = settings.fluidAppearance;
      root.dataset["fluidPureBlack"] = settings.fluidPureBlack ? "on" : "off";
      root.dataset["backgroundTheme"] = settings.fluidBackgroundThemeEnabled ? "on" : "off";
      root.dataset["fullDarkBackground"] =
        settings.fluidBackgroundThemeEnabled && settings.fluidFullDarkBackground ? "on" : "off";
      root.dataset["uiTextClarity"] = settings.fluidTextClarity;
      root.dataset["glassPerformance"] = settings.fluidPerformance;
      root.classList.toggle("pure-black", settings.fluidPureBlack);
      root.classList.toggle("dark", settings.fluidAppearance === "dark");
      root.style.colorScheme = settings.fluidAppearance;
    } else {
      // Default Website: Original / Dark / White Light (Exact NewLumino theme engine)
      root.dataset["theme"] = settings.theme;
      root.classList.remove("pure-black");
      root.classList.toggle("dark", settings.theme === "dark");
      root.style.colorScheme = settings.theme === "dark" ? "dark" : "light";
      delete root.dataset["fluidAppearance"];
      delete root.dataset["fluidPureBlack"];
      delete root.dataset["backgroundTheme"];
      delete root.dataset["fullDarkBackground"];
      delete root.dataset["uiTextClarity"];
      delete root.dataset["glassPerformance"];
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Customization>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      const touchesGlass =
        "glassBlur" in patch || "glassOpacity" in patch || "glassThickness" in patch;
      if (touchesGlass && !("glassPreset" in patch)) next.glassPreset = "custom";
      return next;
    });
  }, []);

  const applyGlassPreset = useCallback((preset: Exclude<QualityLevel, "custom">) => {
    setSettings((prev) => ({ ...prev, glassPreset: preset, ...GLASS_PRESETS[preset] }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_CUSTOMIZATION), []);

  const resetOldThemeDefaults = useCallback(() => {
    setSettings((prev) => ({ ...prev, ...FLUID_GLASS_DEFAULTS }));
  }, []);

  const value = useMemo(
    () => ({ settings, update, applyGlassPreset, reset, resetOldThemeDefaults }),
    [settings, update, applyGlassPreset, reset, resetOldThemeDefaults],
  );

  return (
    <CustomizationContext.Provider value={value}>
      {children}
      <LiquidGlassEngine />
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const ctx = useContext(CustomizationContext);
  if (!ctx) throw new Error("useCustomization must be used within CustomizationProvider");
  return ctx;
}
