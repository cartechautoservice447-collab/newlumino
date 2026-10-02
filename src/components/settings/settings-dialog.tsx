import React from "react";
import { RotateCcw, X, Sparkles, RefreshCw, UserCheck, Cloud, Moon, Sun, Droplets, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCustomization } from "@/context/customization-context";
import { useAuth } from "@/context/auth-context";
import { liquidSpringParams, type MotionLevel, type ThemeBase, type UiFont, type WebsiteTheme } from "@/lib/customization";
import { haptic } from "@/lib/haptics";

function Section({ title, hint, children }: { title: string; hint?: string | undefined; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md">
      <div>
        <h3 className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground/80 font-bold">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Ticks<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | "custom";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] p-1 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            haptic("light");
            onChange(o.value);
          }}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs transition-all touch-manipulation cursor-pointer font-medium",
            value === o.value
              ? "bg-white/[0.12] text-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="tabular-nums text-foreground/90 font-mono font-semibold">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}

const websiteThemes: { value: WebsiteTheme; label: string; badge?: string; desc: string }[] = [
  {
    value: "default",
    label: "Default Original Theme",
    badge: "Main Website",
    desc: "Current website default luminous glass system & custom shaders",
  },
  {
    value: "fluid-glass",
    label: "Old Website Theme",
    badge: "Fluid Glass Studio",
    desc: "Exact 3D water-gel lens, stage orbs & liquid refraction",
  },
];

const colorThemes: { value: ThemeBase; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "White / Light" },
];

const motions: { value: MotionLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "ultra", label: "Ultra" },
];

const fonts: { value: UiFont; label: string }[] = [
  { value: "inter", label: "Inter" },
  { value: "system", label: "System Sans" },
  { value: "mono", label: "JetBrains Mono" },
];

const motionHint: Record<MotionLevel, string> = {
  low: "Animations off — maximum performance and battery saving.",
  medium: "Standard transitions for layout changes and card hovers.",
  high: "Fluid panel resizing, hover scaling and button press depth.",
  ultra: "Spring easing, micro-pulse glow rings and GPU-accelerated transitions.",
};

function SettingsContent({
  realtimeStatus = "connected",
  isSyncing = false,
  onRefresh,
  onOpenAuth,
  onClose,
}: {
  realtimeStatus?: "connected" | "connecting" | "offline";
  isSyncing?: boolean;
  onRefresh?: () => void;
  onOpenAuth?: () => void;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const { settings, update, applyGlassPreset, reset, resetOldThemeDefaults } = useCustomization();
  const spring = liquidSpringParams(settings.liquidBounce);

  return (
    <div className="space-y-3.5">
      {/* Shared Backend (Fluid Glass Studio) Cloud Sync Section */}
      <Section
        title="Shared Backend (Fluid Glass Studio)"
        hint="Real-time multi-client synchronization with Fluid Glass Studio."
      >
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {realtimeStatus === "connected" ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </>
                ) : realtimeStatus === "connecting" ? (
                  <span className="relative inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                ) : (
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-500" />
                )}
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {realtimeStatus === "connected"
                    ? "Real-time Live Synced"
                    : realtimeStatus === "connecting"
                    ? "Connecting..."
                    : "Local / Offline"}
                </p>
                <p className="text-[0.68rem] text-muted-foreground">
                  {user ? `Signed in as ${user.email}` : "Local offline mode"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onRefresh && (
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    onRefresh();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-foreground hover:bg-white/[0.1] active:scale-95 transition cursor-pointer"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin text-primary")} />
                  <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                </button>
              )}
            </div>
          </div>

          {!user && onOpenAuth && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3">
              <div>
                <p className="text-xs font-semibold text-primary">Enable Cloud Sync</p>
                <p className="text-[0.68rem] text-muted-foreground">
                  Sign in to automatically sync across devices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  if (onClose) onClose();
                  onOpenAuth();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition cursor-pointer shrink-0"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Theme Selector"
        hint="Choose between the current website default theme and the old website theme."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {websiteThemes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                haptic("light");
                update({ websiteTheme: t.value });
              }}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all touch-manipulation cursor-pointer",
                settings.websiteTheme === t.value
                  ? "border-primary/50 bg-white/[0.12] text-foreground font-semibold shadow-md ring-1 ring-primary/40"
                  : "border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              )}
            >
              <div className="flex w-full items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-foreground">{t.label}</span>
                {t.badge && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide shrink-0",
                      settings.websiteTheme === t.value
                        ? "bg-primary/20 text-primary"
                        : "bg-white/10 text-muted-foreground"
                    )}
                  >
                    {t.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight text-muted-foreground/80 font-normal">
                {t.desc}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* Dedicated Old Website Theme (Fluid Glass Studio) Customization Section */}
      {settings.websiteTheme === "fluid-glass" && (
        <Section
          title="Old Website Theme (Fluid Glass Studio)"
          hint="Exact glass element, 3D water-gel lens, stage refraction & liquid physics from fluid-glass-studio."
        >
          <div className="space-y-4">
            {/* 1. UI Text Clarity — exact from fluid-glass-studio EngineSettingsModal */}
            <div className="space-y-3 rounded-2xl border border-white/20 bg-white/5 p-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-foreground">UI Text Clarity</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Controls clarity and color strength of normal interface text only. Glass physics and appearance are unchanged.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/10 bg-black/10 p-1">
                {(["default", "smooth", "medium", "punchy"] as const).map((clarity) => (
                  <button
                    key={clarity}
                    type="button"
                    onClick={() => {
                      haptic("light");
                      update({ fluidTextClarity: clarity });
                    }}
                    aria-pressed={settings.fluidTextClarity === clarity}
                    className={cn(
                      "rounded-lg px-2 py-2 text-xs font-medium capitalize transition cursor-pointer",
                      settings.fluidTextClarity === clarity
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    )}
                  >
                    {clarity}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Performance Mode — exact from fluid-glass-studio EngineSettingsModal */}
            <div className="space-y-3 rounded-2xl border border-white/20 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-400" />
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-foreground">Performance Mode</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose the visual-performance profile used across the Glass interface.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    update({ fluidPerformance: "high" });
                  }}
                  aria-pressed={settings.fluidPerformance === "high"}
                  className={cn(
                    "rounded-xl border p-3 text-left transition cursor-pointer",
                    settings.fluidPerformance === "high"
                      ? "border-white/40 bg-white/15 text-foreground font-semibold"
                      : "border-white/10 bg-white/[.03] text-muted-foreground hover:bg-white/10"
                  )}
                >
                  <span className="block text-sm font-medium">High</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">Balanced visual effects</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    update({ fluidPerformance: "ultra" });
                  }}
                  aria-pressed={settings.fluidPerformance === "ultra"}
                  className={cn(
                    "rounded-xl border p-3 text-left transition cursor-pointer",
                    settings.fluidPerformance === "ultra"
                      ? "border-white/40 bg-white/15 text-foreground font-semibold"
                      : "border-white/10 bg-white/[.03] text-muted-foreground hover:bg-white/10"
                  )}
                >
                  <span className="block text-sm font-medium">Ultra</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">Maximum visual effects</span>
                </button>
              </div>
            </div>

            {/* 3. Appearance — exact ThemeToggle from fluid-glass-studio */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/5 p-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-foreground">Appearance</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {settings.fluidAppearance === "dark" ? "Night mode — obsidian liquid" : "Day mode — bright liquid"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  const nextApp = settings.fluidAppearance === "dark" ? "light" : "dark";
                  update({
                    fluidAppearance: nextApp,
                    ...(nextApp === "light" ? { fluidPureBlack: false } : {}),
                  });
                }}
                aria-label={settings.fluidAppearance === "dark" ? "Switch to day mode" : "Switch to night mode"}
                aria-pressed={settings.fluidAppearance === "dark"}
                className="relative flex h-10 w-[4.75rem] flex-shrink-0 items-center rounded-full border border-white/30 bg-white/15 px-1 backdrop-blur-xl transition-colors hover:bg-white/25 cursor-pointer"
                style={{ backdropFilter: "blur(12px) saturate(160%)" }}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300",
                    settings.fluidAppearance === "dark" ? "ml-auto mr-0" : "ml-0 mr-auto"
                  )}
                >
                  {settings.fluidAppearance === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </span>
                <span className="sr-only">{settings.fluidAppearance === "dark" ? "Night mode" : "Day mode"}</span>
              </button>
            </div>

            {/* 4. Pure Black — exact from fluid-glass-studio EngineSettingsModal */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/5 p-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-foreground">Pure Black</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Flat black background instead of the gradient glow. Glass panels stay as they are.
                </p>
              </div>
              <Switch
                checked={settings.fluidPureBlack}
                onCheckedChange={(v) => {
                  haptic("light");
                  update({
                    fluidPureBlack: v,
                    ...(v ? { fluidAppearance: "dark" } : {}),
                  });
                }}
                aria-label="Toggle pure black background"
              />
            </div>

            {/* 5. Background Theme — exact from fluid-glass-studio EngineSettingsModal */}
            <div className="space-y-4 rounded-2xl border border-white/20 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-foreground">Background Theme</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Independent background controls. Glass panels and Glass physics are unchanged.
                  </p>
                </div>
                <Switch
                  checked={settings.fluidBackgroundThemeEnabled}
                  onCheckedChange={(v) => {
                    haptic("light");
                    update({ fluidBackgroundThemeEnabled: v });
                  }}
                  aria-label="Enable background theme controls"
                />
              </div>
              {settings.fluidBackgroundThemeEnabled && (
                <div className="space-y-5 border-t border-white/10 pt-4">
                  {/* Background Opacity slider */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">
                        Background Opacity
                      </span>
                      <span className="font-mono text-xs text-accent-foreground">{settings.fluidBackgroundOpacity}%</span>
                    </div>
                    <Slider
                      value={[settings.fluidBackgroundOpacity]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(vals) => update({ fluidBackgroundOpacity: vals[0] ?? 100 })}
                      aria-label="Background Opacity"
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Controls only the background layer behind the Glass UI.
                    </p>
                  </div>
                  {/* Fully Dark Theme */}
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Fully Dark Theme</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use a uniform deep-dark background so the existing Glass sits cleanly on top.
                      </p>
                    </div>
                    <Switch
                      checked={settings.fluidFullDarkBackground}
                      onCheckedChange={(v) => {
                        haptic("light");
                        update({ fluidFullDarkBackground: v });
                      }}
                      aria-label="Toggle fully dark background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Ambient Orbs Switch */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/5 p-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-foreground">Ambient Orbs</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Floating luminous cyan/purple orbs drifting behind the glass.
                </p>
              </div>
              <Switch
                checked={settings.fluidOrbsEnabled}
                onCheckedChange={(v) => {
                  haptic("light");
                  update({ fluidOrbsEnabled: v });
                }}
                aria-label="Toggle ambient drifting orbs"
              />
            </div>

            {/* 7. Liquid Glass Physics — exact divider and sliders from fluid-glass-studio */}
            <div className="flex items-center gap-3 pt-2">
              <h3 className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-foreground">Liquid Glass Physics</h3>
              <span className="h-px flex-1 bg-gradient-to-r from-white/40 to-transparent" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">Liquid Density</span>
                  <span className="font-mono text-xs text-accent-foreground">{settings.fluidDensity}px</span>
                </div>
                <Slider
                  value={[settings.fluidDensity]}
                  min={0}
                  max={40}
                  step={1}
                  onValueChange={(vals) => update({ fluidDensity: vals[0] ?? 12 })}
                  aria-label="Liquid Density"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Viscosity & refraction — backdrop blur radius of every glass surface.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">Liquid Transparency</span>
                  <span className="font-mono text-xs text-accent-foreground">{settings.fluidTransparency}%</span>
                </div>
                <Slider
                  value={[settings.fluidTransparency]}
                  min={5}
                  max={95}
                  step={1}
                  onValueChange={(vals) => update({ fluidTransparency: vals[0] ?? 45 })}
                  aria-label="Liquid Transparency"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Alpha blending — how much of the world behind shows through the panel.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">Liquid Clearness</span>
                  <span className="font-mono text-xs text-accent-foreground">{settings.fluidClearness} idx</span>
                </div>
                <Slider
                  value={[settings.fluidClearness]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(vals) => update({ fluidClearness: vals[0] ?? 35 })}
                  aria-label="Liquid Clearness"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Distortion & glare clarity — SVG turbulence index on refracted edges.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">Liquid Gel</span>
                  <span className="font-mono text-xs text-accent-foreground">{settings.fluidGel}%</span>
                </div>
                <Slider
                  value={[settings.fluidGel]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(vals) => update({ fluidGel: vals[0] ?? 55 })}
                  aria-label="Liquid Gel"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Surface tension curves, 3D inner bevel and drop shadow depth.
                </p>
              </div>

              {/* Bounce Sub-Card */}
              <div className="space-y-4 rounded-2xl border border-white/20 bg-white/5 p-4">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">
                      Liquid Bounce · Stiffness
                    </span>
                    <span className="font-mono text-xs text-accent-foreground">{settings.fluidBounceStiffness}</span>
                  </div>
                  <Slider
                    value={[settings.fluidBounceStiffness]}
                    min={100}
                    max={500}
                    step={5}
                    onValueChange={(vals) => update({ fluidBounceStiffness: vals[0] ?? 200 })}
                    aria-label="Liquid Bounce Stiffness"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Spring stiffness driving the gel bounce on hover, click and drag.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">
                      Liquid Bounce · Damping
                    </span>
                    <span className="font-mono text-xs text-accent-foreground">{settings.fluidBounceDamping}</span>
                  </div>
                  <Slider
                    value={[settings.fluidBounceDamping]}
                    min={10}
                    max={40}
                    step={1}
                    onValueChange={(vals) => update({ fluidBounceDamping: vals[0] ?? 24 })}
                    aria-label="Liquid Bounce Damping"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Lower damping = wobblier liquid; higher damping settles instantly.
                  </p>
                </div>
              </div>

              {/* 8. Reset Button — exact from fluid-glass-studio EngineSettingsModal */}
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  resetOldThemeDefaults();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-2.5 text-xs font-semibold text-foreground hover:bg-white/20 transition active:scale-98 cursor-pointer"
              >
                <RotateCcw className="size-4" />
                Reset engine defaults
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* Default Original Theme Settings — Color theme is always available.
          It is applied whenever the Default Original Theme website mode is active. */}
      <Section
        title="Default Theme Appearance"
        hint={
          settings.websiteTheme === "fluid-glass"
            ? "Choose the Original, Dark, or White / Light appearance to use when you switch back to the Default Original Theme."
            : "Choose the Original, Dark, or White / Light appearance for the current Default Original Theme."
        }
      >
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] p-1">
          {colorThemes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                haptic("light");
                update({ theme: t.value });
              }}
              aria-pressed={settings.theme === t.value}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs transition-colors touch-manipulation cursor-pointer",
                settings.theme === t.value
                  ? "bg-white/[0.12] text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      {settings.websiteTheme !== "fluid-glass" && (
        <>

          <Section title="Glass quality" hint={settings.glassPreset === "custom" ? "Custom" : undefined}>
            <Ticks
              value={settings.glassPreset}
              options={[
                { value: "low" as const, label: "Low" },
                { value: "medium" as const, label: "Medium" },
                { value: "high" as const, label: "High" },
                { value: "ultra" as const, label: "Ultra" },
              ]}
              onChange={applyGlassPreset}
            />
            <div className="space-y-3 pt-1">
              <SliderRow
                label="Glass blur"
                value={settings.glassBlur}
                suffix="px"
                min={0}
                max={32}
                step={1}
                onChange={(v) => update({ glassBlur: v })}
              />
              <SliderRow
                label="Glass transparency"
                value={settings.glassOpacity}
                suffix="%"
                min={10}
                max={90}
                step={1}
                onChange={(v) => update({ glassOpacity: v })}
              />
              <SliderRow
                label="Glass thickness"
                value={settings.glassThickness}
                suffix="px"
                min={0}
                max={4}
                step={0.5}
                onChange={(v) => update({ glassThickness: v })}
              />
            </div>
          </Section>

          <Section
            title="Liquid Glass Physics"
            hint={
              settings.liquidGlassEnabled
                ? "Apple-style fluid glass — refraction, specular light and spring-physics bounce on every glass panel."
                : "Off — panels use the standard glass system above."
            }
          >
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Enable Liquid Glass Engine</p>
                <p className="text-[0.68rem] text-muted-foreground/70">
                  Real-time fluid physics, refraction &amp; spring bounce
                </p>
              </div>
              <Switch
                checked={settings.liquidGlassEnabled}
                onCheckedChange={(v) => update({ liquidGlassEnabled: v })}
              />
            </div>

            <div
              className={cn(
                "space-y-3 pt-1 transition-opacity",
                !settings.liquidGlassEnabled && "pointer-events-none opacity-40",
              )}
            >
              <SliderRow
                label="Liquid density"
                value={settings.liquidDensity}
                suffix="px"
                min={0}
                max={40}
                step={1}
                onChange={(v) => update({ liquidDensity: v })}
              />
              <SliderRow
                label="Liquid transparency"
                value={settings.liquidTransparency}
                suffix="%"
                min={5}
                max={95}
                step={1}
                onChange={(v) => update({ liquidTransparency: v })}
              />
              <SliderRow
                label="Liquid clearness"
                value={settings.liquidClearness}
                min={0}
                max={100}
                step={1}
                onChange={(v) => update({ liquidClearness: v })}
              />
              <SliderRow
                label="Liquid gel"
                value={settings.liquidGel}
                min={0}
                max={100}
                step={1}
                onChange={(v) => update({ liquidGel: v })}
              />
              <div>
                <SliderRow
                  label="Liquid bounce"
                  value={settings.liquidBounce}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(v) => update({ liquidBounce: v })}
                />
                <p className="pt-1 pl-0.5 text-[0.68rem] text-muted-foreground/60 font-mono">
                  stiffness {Math.round(spring.stiffness)} · damping {Math.round(spring.damping)}
                </p>
              </div>
            </div>
          </Section>
        </>
      )}

      <Section title="Motion & fluidity" hint={motionHint[settings.motion]}>
        <Ticks value={settings.motion} options={motions} onChange={(v) => update({ motion: v })} />
      </Section>

      <Section title="Typography">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] p-1">
          {fonts.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                haptic("light");
                update({ uiFont: f.value });
              }}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs transition-all touch-manipulation cursor-pointer",
                settings.uiFont === f.value
                  ? "bg-white/[0.12] text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="space-y-3 pt-1">
          <SliderRow
            label="UI font size"
            value={settings.uiFontSize}
            suffix="px"
            min={12}
            max={20}
            step={1}
            onChange={(v) => update({ uiFontSize: v })}
          />
          <SliderRow
            label="UI line height"
            value={settings.uiLineHeight}
            min={1.2}
            max={2}
            step={0.05}
            onChange={(v) => update({ uiLineHeight: Number(v.toFixed(2)) })}
          />
          <SliderRow
            label="Editor font size"
            value={settings.editorFontSize}
            suffix="px"
            min={11}
            max={22}
            step={1}
            onChange={(v) => update({ editorFontSize: v })}
          />
          <SliderRow
            label="Editor line height"
            value={settings.editorLineHeight}
            min={1.2}
            max={2.4}
            step={0.05}
            onChange={(v) => update({ editorLineHeight: Number(v.toFixed(2)) })}
          />
        </div>
      </Section>

      <button
        type="button"
        onClick={() => {
          haptic("warning");
          reset();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-white/[0.08] hover:text-foreground active:scale-95 touch-manipulation cursor-pointer"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset all customization to defaults
      </button>
    </div>
  );
}

export const SettingsDialog = React.memo(function SettingsDialog({
  open,
  onOpenChange,
  realtimeStatus,
  isSyncing,
  onRefresh,
  onOpenAuth,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  realtimeStatus?: "connected" | "connecting" | "offline";
  isSyncing?: boolean;
  onRefresh?: () => void;
  onOpenAuth?: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        haptic(val ? "medium" : "light");
        onOpenChange(val);
      }}
    >
      <DialogContent className="glass-panel scroll-sleek w-[calc(100vw-0.75rem)] max-w-none max-h-[calc(100dvh-0.75rem)] overflow-y-auto border-white/10 rounded-3xl p-4 sm:w-full sm:max-w-[560px] sm:max-h-[85vh] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">
            Engine Customization
          </DialogTitle>
        </DialogHeader>

        <SettingsContent
          realtimeStatus={realtimeStatus}
          isSyncing={isSyncing}
          onRefresh={onRefresh}
          onOpenAuth={onOpenAuth}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}, SettingsDialogPropsAreEqual);

function SettingsDialogPropsAreEqual(prev: { open: boolean; realtimeStatus?: string; isSyncing?: boolean }, next: { open: boolean; realtimeStatus?: string; isSyncing?: boolean }) {
  return prev.open === next.open && prev.realtimeStatus === next.realtimeStatus && prev.isSyncing === next.isSyncing;
}
