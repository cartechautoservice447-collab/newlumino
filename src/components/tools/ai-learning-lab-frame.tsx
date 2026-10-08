import React from "react";
import { Brain, BookOpen, History, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export type AiLearningLabFrameProps = {
  title: string;
  subtitle: string;
  status?: string;
  statusTone?: "primary" | "emerald" | "amber" | "violet" | "cyan";
  icon?: React.ElementType;
  context: React.ReactNode;
  intelligence: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  onOpenHistory?: () => void;
  children: React.ReactNode;
  className?: string;
};

const statusClasses = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
};

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">{children}</div>;
}

export function AiLearningLabFrame({
  title,
  subtitle,
  status,
  statusTone = "primary",
  icon: Icon = Brain,
  context,
  intelligence,
  footer,
  onClose,
  onOpenHistory,
  children,
  className,
}: AiLearningLabFrameProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-background text-foreground", className)}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-background/92 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight">{title}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onOpenHistory ? <LabHistoryButton onClick={onOpenHistory} label={title + " history"} /> : null}
          {status ? <span className={cn("hidden rounded-full border px-2.5 py-1 text-[0.62rem] font-bold sm:inline", statusClasses[statusTone])}>{status}</span> : null}
          <button
            type="button"
            aria-label={"Close " + title}
            onClick={() => {
              haptic("light");
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-sleek">
        <div className="mx-auto grid w-full max-w-[1560px] gap-4 p-3 sm:p-5 lg:grid-cols-[248px_minmax(0,1fr)_282px] lg:gap-5 lg:p-6">
          <aside className="order-1 min-w-0 space-y-3 lg:sticky lg:top-0 lg:h-fit">
            <div className="glass-panel rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <Label>Study context</Label>
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-3">{context}</div>
            </div>
          </aside>

          <main className="order-2 min-w-0 space-y-4">
            {children}
          </main>

          <aside className="order-3 min-w-0 space-y-3 lg:sticky lg:top-0 lg:h-fit">
            {intelligence}
          </aside>
        </div>
      </div>

      {footer ? (
        <footer className="shrink-0 border-t border-white/10 bg-background/95 px-3 py-2 backdrop-blur-xl sm:px-5">
          <div className="mx-auto flex max-w-[1560px] gap-2 overflow-x-auto scroll-sleek">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );
}

export function LabHistoryButton({ onClick, label = "Open AI history" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <History className="h-4 w-4" />
    </button>
  );
}

export function LabPanel({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4", className)}>
      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export function LabInsightCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
      <Label>{title}</Label>
      <p className="mt-1.5 text-lg font-bold tracking-tight text-foreground">{value}</p>
      {description ? <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function LabToolButton({
  label,
  onClick,
  tone = "primary",
  icon,
}: {
  label: string;
  onClick: () => void;
  tone?: "primary" | "emerald" | "amber" | "violet" | "cyan";
  icon?: React.ReactNode;
}) {
  const tones = {
    primary: "border-primary/20 bg-primary/[0.08] text-primary",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200",
    amber: "border-amber-400/20 bg-amber-400/[0.08] text-amber-200",
    violet: "border-violet-400/20 bg-violet-400/[0.08] text-violet-200",
    cyan: "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-200",
  } as const;

  return (
    <button
      type="button"
      onClick={() => {
        haptic("medium");
        onClick();
      }}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition hover:bg-white/[0.08] active:scale-[0.98]",
        tones[tone],
      )}
    >
      {icon}
      {label}
    </button>
  );
}
