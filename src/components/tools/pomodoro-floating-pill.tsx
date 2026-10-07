import React from "react";
import { Play, Pause, X, Sparkles, Volume2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOUNDSCAPE_OPTIONS } from "@/lib/soundscapes";
import type { PomodoroState } from "@/hooks/use-pomodoro";
import { haptic } from "@/lib/haptics";

interface Props {
  pomodoro: PomodoroState;
  onOpenFullDialog: () => void;
  className?: string;
}

export function PomodoroFloatingPill({ pomodoro, onOpenFullDialog, className }: Props) {
  const {
    mode,
    timeLeft,
    isRunning,
    soundscape,
    miniPillDismissed,
    setMiniPillDismissed,
    togglePlay,
  } = pomodoro;

  // Only show mini-pill if user has actively started the timer
  if (!isRunning || miniPillDismissed) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const currentSound = SOUNDSCAPE_OPTIONS.find((s) => s.id === soundscape);

  return (
    <div
      className={cn(
        "fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] right-3 sm:top-auto sm:bottom-6 sm:right-6 z-40 animate-panel-in select-none",
        className
      )}
    >
      <div
        onClick={() => {
          haptic("medium");
          onOpenFullDialog();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            haptic("medium");
            onOpenFullDialog();
          }
        }}
        className={cn(
          "liquid-surface group flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-2xl backdrop-blur-2xl transition-all duration-300 cursor-pointer touch-manipulation",
          isRunning
            ? "border-primary/40 bg-black/70 shadow-[0_0_20px_-3px_hsl(var(--primary)/0.5)] ring-1 ring-primary/40"
            : "border-white/15 bg-black/60 hover:bg-black/75"
        )}
      >
        {/* Glowing Indicator Dot */}
        <span
          className={cn(
            "h-2 w-2 rounded-full transition-all duration-300",
            isRunning
              ? mode === "focus"
                ? "bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]"
                : "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              : "bg-muted-foreground/60"
          )}
        />

        {/* Mode Label */}
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
          {mode === "focus" ? "Focus" : "Break"}
        </span>

        {/* Time Left */}
        <span className="font-mono text-xs font-bold tabular-nums text-foreground">
          {timeFormatted}
        </span>

        {/* Soundscape Emoji */}
        {soundscape !== "none" && currentSound && (
          <span className="text-xs opacity-80" title={currentSound.name}>
            {currentSound.icon}
          </span>
        )}

        {/* Play/Pause Quick Toggle */}
        <button
          type="button"
          aria-label={isRunning ? "Pause timer" : "Start timer"}
          onClick={(e) => {
            e.stopPropagation();
            haptic("heavy");
            togglePlay();
          }}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-foreground transition-all active:scale-90 touch-manipulation cursor-pointer",
            isRunning
              ? "bg-primary/20 text-primary hover:bg-primary/30"
              : "bg-white/10 hover:bg-white/20"
          )}
        >
          {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
        </button>

        {/* Dismiss Pill (Only when paused) */}
        {!isRunning && (
          <button
            type="button"
            aria-label="Dismiss timer pill"
            onClick={(e) => {
              e.stopPropagation();
              haptic("light");
              setMiniPillDismissed(true);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
