import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, X, Sparkles, RefreshCw, UserCheck, Cloud, Moon, Sun, Droplets, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCustomization } from "@/context/customization-context";
import { useAuth } from "@/context/auth-context";
import { liquidSpringParams, type MotionLevel, type ThemeBase, type UiFont, type BackgroundOption } from "@/lib/customization";
import { haptic } from "@/lib/haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import { AiNotificationSection } from "./ai-notification-section";

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

const themes: { value: ThemeBase; label: string; badge?: string; desc: string }[] = [
  {
    value: "original",
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
  {
    value: "dark",
    label: "Dark",
    desc: "Obsidian dark appearance",
  },
  {
    value: "light",
    label: "White / Light",
    desc: "Daylight clean bright glass",
  },
];

const backgroundOptions: {
  value: BackgroundOption;
  label: string;
  badge?: string;
  desc: string;
  previewGradient: string;
}[] = [
  {
    value: "default",
    label: "Default Background",
    badge: "Current Website",
    desc: "Original NewLumino deep multi-layered radial backdrop with subtle mesh grain",
    previewGradient: "radial-gradient(circle at 20% 20%, oklch(0.45 0.14 262), oklch(0.17 0.023 268))",
  },
  {
    value: "fluid-glass",
    label: "Old Website Background",
    badge: "Fluid Glass Studio",
    desc: "Exact liquid stage from fluid-glass-studio repo with ambient drifting orbs",
    previewGradient: "radial-gradient(circle at 20% 20%, oklch(0.55 0.2 265), oklch(0.5 0.2 330) 60%, oklch(0.17 0.04 265))",
  },
  {
    value: "aurora",
    label: "Aurora Borealis",
    badge: "New Gradient",
    desc: "Luminous emerald & cyan atmospheric nebula glow with floating particles",
    previewGradient: "radial-gradient(circle at 20% 20%, oklch(0.58 0.22 165), oklch(0.42 0.19 215) 60%, oklch(0.12 0.02 230))",
  },
  {
    value: "cosmic-sunset",
    label: "Cosmic Sunset",
    badge: "New Gradient",
    desc: "Velvet violet, twilight magenta & warm sunset amber cosmic dusk glow",
    previewGradient: "radial-gradient(circle at 20% 20%, oklch(0.58 0.24 320), oklch(0.68 0.22 35) 60%, oklch(0.11 0.025 270))",
  },
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
  noteTitle,
  activeCourseName,
  focusMinutes,
  dailyGoalHours,
}: {
  realtimeStatus?: "connected" | "connecting" | "offline";
  isSyncing?: boolean;
  onRefresh?: () => void;
  onOpenAuth?: () => void;
  onClose?: () => void;
  noteTitle?: string;
  activeCourseName?: string;
  focusMinutes?: number;
  dailyGoalHours?: number;
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

      {/* AI-Integrated Notification System Section */}
      <AiNotificationSection
        noteTitle={noteTitle}
        activeCourseName={activeCourseName}
        focusMinutes={focusMinutes}
        dailyGoalHours={dailyGoalHours}
      />

      <Section
        title="Theme Selector"
        hint="Choose between the current website default theme and the old website theme."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {themes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                haptic("light");
                update({ theme: t.value });
              }}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all touch-manipulation cursor-pointer",
                settings.theme === t.value
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
                      settings.theme === t.value
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

      {/* Dedicated Background Option Section */}
      <Section
        title="Background Option"
        hint="Select the ambient backdrop gradient: default website, old website liquid stage, or new gradients."
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {backgroundOptions.map((bg) => {
              const isSelected = settings.backgroundOption === bg.value;
              return (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => {
                    haptic("light");
                    update({ backgroundOption: bg.value });
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all touch-manipulation cursor-pointer relative overflow-hidden group",
                    isSelected
                      ? "border-primary/50 bg-white/[0.12] text-foreground font-semibold shadow-md ring-1 ring-primary/40"
                      : "border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-inner shrink-0"
                        style={{ background: bg.previewGradient }}
                      />
                      <span className="text-xs font-bold text-foreground truncate">{bg.label}</span>
                    </div>
                    {bg.badge && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide shrink-0",
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-white/10 text-muted-foreground"
                        )}
                      >
                        {bg.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] leading-tight text-muted-foreground/80 font-normal">
                    {bg.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-1">
            <SliderRow
              label="Background Opacity"
              value={settings.backgroundOpacity ?? 100}
              suffix="%"
              min={10}
              max={100}
              step={5}
              onChange={(v) => update({ backgroundOpacity: v })}
            />
          </div>
        </div>
      </Section>

      {/* Dedicated Old Website Theme (Fluid Glass Studio) Customization Section */}
      {settings.theme === "fluid-glass" && (
        <Section
          title="Old Website Theme (Fluid Glass Studio)"
          hint="Exact glass element, 3D water-gel lens, stage refraction & liquid physics from fluid-glass-studio."
        >
          <div className="space-y-3.5">
            {/* Appearance Toggle: Night vs Day */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Appearance Mode</p>
                <p className="text-[0.68rem] text-muted-foreground/70">
                  {settings.fluidAppearance === "dark"
                    ? "Night mode — obsidian liquid glass"
                    : "Day mode — bright liquid glass"}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    update({ fluidAppearance: "dark" });
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition cursor-pointer",
                    settings.fluidAppearance === "dark"
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Moon className="h-3 w-3" />
                  <span>Night</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    update({ fluidAppearance: "light" });
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition cursor-pointer",
                    settings.fluidAppearance === "light"
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sun className="h-3 w-3" />
                  <span>Day</span>
                </button>
              </div>
            </div>

            {/* Pure Black Stage Switch */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Pure Black Stage</p>
                <p className="text-[0.68rem] text-muted-foreground/70">
                  Flat pitch black background instead of the gradient glow. Glass panels stay as they are.
                </p>
              </div>
              <Switch
                checked={settings.fluidPureBlack}
                onCheckedChange={(v) => update({ fluidPureBlack: v })}
              />
            </div>

            {/* Ambient Drifting Orbs Switch */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Ambient Drifting Orbs</p>
                <p className="text-[0.68rem] text-muted-foreground/70">
                  Floating luminous cyan/purple orbs drifting behind the glass.
                </p>
              </div>
              <Switch
                checked={settings.fluidOrbsEnabled}
                onCheckedChange={(v) => update({ fluidOrbsEnabled: v })}
              />
            </div>

            {/* UI Text Clarity */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">UI Text Clarity</p>
                <p className="text-[0.68rem] text-muted-foreground/70">
                  Controls clarity and sharpness of normal interface text inside the glass panels.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/10 bg-black/10 p-1">
                {(["default", "smooth", "medium", "punchy"] as const).map((clarity) => (
                  <button
                    key={clarity}
                    type="button"
                    onClick={() => {
                      haptic("light");
                      update({ fluidTextClarity: clarity });
                    }}
                    className={cn(
                      "rounded-md py-1 text-center text-xs font-medium capitalize transition cursor-pointer",
                      settings.fluidTextClarity === clarity
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    {clarity}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Mode */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-xs font-semibold text-foreground">Performance Mode</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    update({ fluidPerformance: "high" });
                  }}
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition cursor-pointer",
                    settings.fluidPerformance === "high"
                      ? "border-primary/50 bg-primary/10 text-foreground font-semibold"
                      : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]"
                  )}
                >
                  <span className="block text-xs font-bold">High</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">Balanced visual effects</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    update({ fluidPerformance: "ultra" });
                  }}
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition cursor-pointer",
                    settings.fluidPerformance === "ultra"
                      ? "border-primary/50 bg-primary/10 text-foreground font-semibold"
                      : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]"
                  )}
                >
                  <span className="block text-xs font-bold">Ultra</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">Maximum visual effects</span>
                </button>
              </div>
            </div>

            {/* Fluid Glass Physics Sliders (Old Website) */}
            <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-2">
                <Droplets className="h-3.5 w-3.5 text-sky-400" />
                <p className="text-xs font-bold text-foreground">Fluid Glass Physics (Old Website Engine)</p>
              </div>
              <SliderRow
                label="Liquid density (Viscosity & refraction blur)"
                value={settings.fluidDensity}
                suffix="px"
                min={0}
                max={40}
                step={1}
                onChange={(v) => update({ fluidDensity: v })}
              />
              <SliderRow
                label="Liquid transparency (Alpha blending)"
                value={settings.fluidTransparency}
                suffix="%"
                min={5}
                max={95}
                step={1}
                onChange={(v) => update({ fluidTransparency: v })}
              />
              <SliderRow
                label="Liquid clearness (Distortion index)"
                value={settings.fluidClearness}
                suffix=" idx"
                min={0}
                max={100}
                step={1}
                onChange={(v) => update({ fluidClearness: v })}
              />
              <SliderRow
                label="Liquid gel (Surface tension & 3D bevel depth)"
                value={settings.fluidGel}
                suffix="%"
                min={0}
                max={100}
                step={1}
                onChange={(v) => update({ fluidGel: v })}
              />
              <SliderRow
                label="Liquid bounce · Stiffness"
                value={settings.fluidBounceStiffness}
                min={100}
                max={500}
                step={5}
                onChange={(v) => update({ fluidBounceStiffness: v })}
              />
              <SliderRow
                label="Liquid bounce · Damping"
                value={settings.fluidBounceDamping}
                min={10}
                max={40}
                step={1}
                onChange={(v) => update({ fluidBounceDamping: v })}
              />
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  resetOldThemeDefaults();
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] py-2 text-xs font-semibold text-muted-foreground hover:bg-white/[0.1] hover:text-foreground transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Old Website Theme Defaults
              </button>
            </div>
          </div>
        </Section>
      )}

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

/**
 * Mobile Swipeable Bottom Sheet
 * Tracks finger position in REAL-TIME as user swipes from bottom to top.
 * Features a buttery-smooth spring transition when released or opened,
 * and allows smooth drag-down to dismiss.
 */
function MobileSwipeableSettingsSheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0); // Offset in pixels from resting open position
  const [sheetHeight, setSheetHeight] = useState(typeof window !== "undefined" ? window.innerHeight * 0.92 : 650);

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Gesture tracking refs
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const currentDragMode = useRef<"up-to-open" | "down-to-close" | null>(null);

  // Keep sheetHeight in sync with viewport
  useEffect(() => {
    const updateHeight = () => {
      const h = window.innerHeight * 0.92;
      setSheetHeight(h);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // When `open` prop changes programmatically
  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsDragging(false);
      setDragY(0);
    } else if (!isDragging) {
      // Animate out
      setDragY(sheetHeight);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open, sheetHeight, isDragging]);

  // Global bottom-edge touch listener for "Swipe up from bottom to open"
  useEffect(() => {
    let trackingGesture = false;

    const handleWindowTouchStart = (e: TouchEvent) => {
      if (open || e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Check if touch begins near bottom of screen (bottom 130px)
      if (touch.clientY >= window.innerHeight - 130) {
        touchStartY.current = touch.clientY;
        touchStartX.current = touch.clientX;
        touchStartTime.current = Date.now();
        trackingGesture = true;
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!trackingGesture || open || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaY = touchStartY.current - touch.clientY; // positive = moving UP
      const deltaX = Math.abs(touch.clientX - touchStartX.current);

      if (deltaY > 6 && deltaY > deltaX) {
        // Engaged! The finger is swiping UP from bottom
        currentDragMode.current = "up-to-open";
        setIsDragging(true);
        setMounted(true);

        // Calculate sheet position in REAL TIME tracking finger exactly!
        // At deltaY = 0, dragY = sheetHeight (fully hidden)
        // As deltaY increases, dragY decreases towards 0 (fully open)
        const currentY = Math.max(0, sheetHeight - deltaY);
        setDragY(currentY);
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (!trackingGesture) return;
      trackingGesture = false;

      if (currentDragMode.current === "up-to-open") {
        const touch = e.changedTouches[0];
        const deltaY = touchStartY.current - touch.clientY;
        const duration = Math.max(1, Date.now() - touchStartTime.current);
        const velocity = deltaY / duration; // px per ms

        setIsDragging(false);
        currentDragMode.current = null;

        // If swiped up past 80px or upward flick velocity > 0.35px/ms
        if (deltaY > 80 || velocity > 0.35) {
          haptic("medium");
          setDragY(0);
          onOpenChange(true);
        } else {
          // Snap back down
          setDragY(sheetHeight);
          setTimeout(() => {
            setMounted(false);
          }, 300);
        }
      }
    };

    window.addEventListener("touchstart", handleWindowTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", handleWindowTouchMove, { capture: true, passive: true });
    window.addEventListener("touchend", handleWindowTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", handleWindowTouchEnd, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", handleWindowTouchStart, { capture: true });
      window.removeEventListener("touchmove", handleWindowTouchMove, { capture: true });
      window.removeEventListener("touchend", handleWindowTouchEnd, { capture: true });
      window.removeEventListener("touchcancel", handleWindowTouchEnd, { capture: true });
    };
  }, [open, sheetHeight, onOpenChange]);

  // Touch listener on the sheet for "Swipe down to close"
  const handleSheetTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartTime.current = Date.now();
    currentDragMode.current = "down-to-close";
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (currentDragMode.current !== "down-to-close" || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current; // positive = moving DOWN
    const deltaX = Math.abs(touch.clientX - touchStartX.current);

    // Only allow drag-down if content is scrolled to the top or dragging on handle
    const isAtTop = !scrollRef.current || scrollRef.current.scrollTop <= 0;

    if (deltaY > 0 && deltaY > deltaX && isAtTop) {
      setIsDragging(true);
      // Sheet follows finger downwards in real-time
      setDragY(deltaY);
    }
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (currentDragMode.current !== "down-to-close") return;
    currentDragMode.current = null;

    if (isDragging) {
      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - touchStartY.current;
      const duration = Math.max(1, Date.now() - touchStartTime.current);
      const velocity = deltaY / duration;

      setIsDragging(false);

      // If dragged down past 100px or downward flick > 0.35px/ms
      if (deltaY > 100 || velocity > 0.35) {
        haptic("light");
        setDragY(sheetHeight);
        onOpenChange(false);
        setTimeout(() => {
          setMounted(false);
        }, 300);
      } else {
        // Snap back up to fully open
        setDragY(0);
      }
    }
  };

  // Close with smooth transition
  const handleClose = () => {
    haptic("light");
    setIsDragging(false);
    setDragY(sheetHeight);
    onOpenChange(false);
    setTimeout(() => {
      setMounted(false);
    }, 320);
  };

  if (!mounted) return null;

  // Calculate backdrop opacity based on sheet height and drag position
  const openProgress = Math.max(0, Math.min(1, 1 - dragY / sheetHeight));
  const backdropOpacity = openProgress * 0.75;

  return createPortal(
    <div className="fixed inset-0 z-50 select-none md:hidden overflow-hidden pointer-events-auto">
      {/* Backdrop with real-time blur and opacity */}
      <div
        onClick={handleClose}
        style={{
          opacity: backdropOpacity,
          transition: isDragging ? "none" : "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="absolute inset-0 bg-black backdrop-blur-md cursor-pointer"
      />

      {/* Mobile Bottom-to-Top Sliding Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
        onTouchCancel={handleSheetTouchEnd}
        style={{
          height: `${sheetHeight}px`,
          transform: `translate3d(0, ${dragY}px, 0)`,
          transition: isDragging
            ? "none"
            : "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="glass-panel absolute inset-x-0 bottom-0 flex flex-col rounded-t-[2.25rem] border-t border-x border-white/20 bg-black/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 overflow-hidden"
      >
        {/* Grab Handle & Top Header Drag Zone */}
        <div className="flex flex-col items-center pt-3 pb-2.5 px-4 cursor-grab active:cursor-grabbing touch-none select-none border-b border-white/10 shrink-0 bg-white/[0.02]">
          {/* Tactile Pull Pill */}
          <div className="h-1.5 w-14 rounded-full bg-white/30 active:bg-primary/60 transition-all mb-2" />

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground leading-tight">
                  Engine Customization
                </h2>
                <p className="text-[0.68rem] text-muted-foreground">
                  Swipe down to close · Real-time styling
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scroll-sleek overscroll-contain p-4 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  realtimeStatus,
  isSyncing,
  onRefresh,
  onOpenAuth,
  noteTitle,
  activeCourseName,
  focusMinutes,
  dailyGoalHours,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  realtimeStatus?: "connected" | "connecting" | "offline";
  isSyncing?: boolean;
  onRefresh?: () => void;
  onOpenAuth?: () => void;
  noteTitle?: string;
  activeCourseName?: string;
  focusMinutes?: number;
  dailyGoalHours?: number;
}) {
  const isMobile = useIsMobile();

  // On Mobile: Render the interactive real-time swipeable bottom-to-top sheet
  if (isMobile) {
    return (
      <MobileSwipeableSettingsSheet open={open} onOpenChange={onOpenChange}>
        <SettingsContent
          realtimeStatus={realtimeStatus}
          isSyncing={isSyncing}
          onRefresh={onRefresh}
          onOpenAuth={onOpenAuth}
          onClose={() => onOpenChange(false)}
          noteTitle={noteTitle}
          activeCourseName={activeCourseName}
          focusMinutes={focusMinutes}
          dailyGoalHours={dailyGoalHours}
        />
      </MobileSwipeableSettingsSheet>
    );
  }

  // On Desktop / Laptop: Render the elegant centered glass modal dialog
  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        haptic(val ? "medium" : "light");
        onOpenChange(val);
      }}
    >
      <DialogContent className="glass-panel scroll-sleek max-h-[85vh] overflow-y-auto border-white/10 sm:max-w-[560px]">
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
          noteTitle={noteTitle}
          activeCourseName={activeCourseName}
          focusMinutes={focusMinutes}
          dailyGoalHours={dailyGoalHours}
        />
      </DialogContent>
    </Dialog>
  );
}

