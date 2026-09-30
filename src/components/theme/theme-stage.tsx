import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCustomization } from "@/context/customization-context";

type Props = {
  children: ReactNode;
  className?: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Single authoritative theme stage shared by the Dashboard and Workspace.
 * The Fluid Glass branch mirrors the original fluid-glass-studio stage,
 * including its exact gradients, atmospheric orbs, and background controls.
 */
export function ThemeStage({ children, className }: Props) {
  const { settings } = useCustomization();
  const isFluidTheme = settings.websiteTheme === "fluid-glass";

  const backgroundAlpha = clamp01((settings.fluidBackgroundOpacity ?? 100) / 100);
  const customBackground =
    settings.fluidBackgroundThemeEnabled && !settings.fluidFullDarkBackground
      ? `radial-gradient(120% 90% at 10% 0%, oklch(0.62 0.18 250 / ${backgroundAlpha}) 0%, transparent 60%),radial-gradient(100% 80% at 100% 10%, oklch(0.58 0.17 285 / ${backgroundAlpha}) 0%, transparent 55%),linear-gradient(170deg, oklch(0.5 0.17 258 / ${backgroundAlpha}), oklch(0.36 0.15 268 / ${backgroundAlpha}))`
      : undefined;

  const stageStyle =
    isFluidTheme && settings.fluidBackgroundThemeEnabled
      ? {
          background: settings.fluidFullDarkBackground ? "#050507" : customBackground,
          backgroundColor: settings.fluidFullDarkBackground ? "#050507" : "#07070c",
        }
      : undefined;

  const showFluidOrbs = isFluidTheme && (settings.fluidOrbsEnabled ?? true);

  return (
    <main
      className={cn(
        "relative min-h-[100dvh] w-full overflow-hidden transition-colors duration-500",
        isFluidTheme ? "liquid-stage" : "app-backdrop",
        className,
      )}
      style={stageStyle}
    >
      {!isFluidTheme && (
        <div className="grain-overlay pointer-events-none absolute inset-0" aria-hidden />
      )}

      {showFluidOrbs && (
        <>
          <div
            className="liquid-orb liquid-orb-a"
            style={
              settings.fluidBackgroundThemeEnabled
                ? { opacity: settings.fluidFullDarkBackground ? 0 : 0.75 * backgroundAlpha }
                : undefined
            }
            aria-hidden
          />
          <div
            className="liquid-orb liquid-orb-b"
            style={
              settings.fluidBackgroundThemeEnabled
                ? { opacity: settings.fluidFullDarkBackground ? 0 : 0.75 * backgroundAlpha }
                : undefined
            }
            aria-hidden
          />
          <div
            className="liquid-orb liquid-orb-c"
            style={
              settings.fluidBackgroundThemeEnabled
                ? { opacity: settings.fluidFullDarkBackground ? 0 : 0.75 * backgroundAlpha }
                : undefined
            }
            aria-hidden
          />
        </>
      )}

      {children}
    </main>
  );
}
