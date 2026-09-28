import { RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCustomization } from "@/context/customization-context";
import { liquidSpringParams, type MotionLevel, type ThemeBase, type UiFont } from "@/lib/customization";

function Section({ title, hint, children }: { title: string; hint?: string | undefined; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <div>
        <h3 className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground/80">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p> : null}
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
    <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] p-1 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs transition-colors",
            value === o.value
              ? "bg-white/[0.1] text-foreground"
              : "text-muted-foreground hover:text-foreground",
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
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground/80">
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

const themes: { value: ThemeBase; label: string }[] = [
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

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { settings, update, applyGlassPreset, reset } = useCustomization();
  const spring = liquidSpringParams(settings.liquidBounce);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel scroll-sleek max-h-[85vh] overflow-y-auto border-white/10 sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">
            Engine Customization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Section title="Color theme">
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] p-1">
              {themes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update({ theme: t.value })}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    settings.theme === t.value
                      ? "bg-white/[0.1] text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

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
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
              <div>
                <p className="text-xs text-foreground">Enable Liquid Glass Engine</p>
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
                <p className="pt-1 pl-0.5 text-[0.68rem] text-muted-foreground/60">
                  stiffness {Math.round(spring.stiffness)} · damping {Math.round(spring.damping)}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Motion & fluidity" hint={motionHint[settings.motion]}>
            <Ticks value={settings.motion} options={motions} onChange={(v) => update({ motion: v })} />
          </Section>

          <Section title="Typography">
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] p-1">
              {fonts.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => update({ uiFont: f.value })}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    settings.uiFont === f.value
                      ? "bg-white/[0.1] text-foreground"
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
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
