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
    root.dataset["theme"] = settings.theme;
    root.dataset["motion"] = settings.motion;
    root.dataset["liquidGlass"] = settings.liquidGlassEnabled ? "on" : "off";
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

  const value = useMemo(
    () => ({ settings, update, applyGlassPreset, reset }),
    [settings, update, applyGlassPreset, reset],
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
