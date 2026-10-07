import React from "react";
import {
  Target,
  Flame,
  Clock,
  Sparkles,
  Award,
  TrendingUp,
  Play,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { RadialGoalChart } from "./radial-goal-chart";
import { cn } from "@/lib/utils";
import type { PomodoroState } from "@/hooks/use-pomodoro";
import { haptic } from "@/lib/haptics";

interface DailyGoalViewProps {
  pomodoro: PomodoroState;
  onOpenPomodoro: () => void;
  onBackToCourses?: () => void;
}

export function DailyGoalView({
  pomodoro,
  onOpenPomodoro,
  onBackToCourses,
}: DailyGoalViewProps) {
  const {
    todayFocusSeconds,
    dailyGoalHours,
    setDailyGoalHours,
    completedSessions,
    sessionHistory,
    togglePlay,
    isRunning,
  } = pomodoro;

  const currentHours = todayFocusSeconds / 3600;
  const progressPct = Math.min(100, Math.round((todayFocusSeconds / (dailyGoalHours * 3600)) * 100));
  const isGoalReached = todayFocusSeconds >= dailyGoalHours * 3600;

  // Filter today's completed sessions
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaySessions = sessionHistory.filter((s) => s.timestamp >= todayStart);

  const PRESETS = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0];

  return (
    <div className="flex flex-1 flex-col h-full overflow-y-auto scroll-sleek p-4 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
      {/* Top Header Wrapped in Glass Panel */}
      <div className="shrink-0 z-30 mb-2">
        <div className="glass-panel animate-panel-in rounded-3xl p-4 shadow-2xl backdrop-blur-3xl border border-white/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-300 shadow-[0_0_15px_-3px_rgba(251,191,36,0.6)]">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Daily Study Goal
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Track your focused study hours and maintain cognitive momentum
                  </p>
                </div>
              </div>
            </div>

            {/* Streak & Status Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-sm">
                <Flame className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>Active Focus Today</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic("heavy");
                  onOpenPomodoro();
                }}
                className="flex items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-lg transition-transform active:scale-95 cursor-pointer hover:brightness-110"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Open Pomodoro</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Radial Progress Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-7 glass-panel rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          {/* Radial Circular Progress Ring */}
          <RadialGoalChart
            currentSeconds={todayFocusSeconds}
            goalHours={dailyGoalHours}
            size={220}
            strokeWidth={16}
            className="my-2"
          />

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 w-full mt-6 pt-5 border-t border-white/10 text-center">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-2.5">
              <span className="font-mono text-lg font-bold text-primary">
                {currentHours >= 1 ? `${currentHours.toFixed(1)}h` : `${Math.floor(todayFocusSeconds / 60)}m`}
              </span>
              <p className="text-[0.62rem] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Focused</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-2.5">
              <span className="font-mono text-lg font-bold text-purple-300">
                {dailyGoalHours}h
              </span>
              <p className="text-[0.62rem] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Target</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-2.5">
              <span className="font-mono text-lg font-bold text-emerald-400">
                {completedSessions}
              </span>
              <p className="text-[0.62rem] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Sessions</p>
            </div>
          </div>
        </div>

        {/* Adjust Target Goal & Presets */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="glass-panel rounded-3xl border border-white/15 bg-white/[0.03] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-300" />
              <h3 className="text-sm font-bold text-foreground">Set Daily Target</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Select how many focused hours you plan to study each day:
            </p>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setDailyGoalHours(hrs);
                  }}
                  className={cn(
                    "rounded-2xl border py-2.5 text-center text-xs font-mono font-bold transition-all active:scale-95 touch-manipulation cursor-pointer",
                    dailyGoalHours === hrs
                      ? "border-amber-400/60 bg-gradient-to-tr from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                  )}
                >
                  {hrs}h
                </button>
              ))}
            </div>

            {/* Motivational Status Box */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span>Cognitive Pacing Tip</span>
              </div>
              <p className="text-[0.72rem] text-muted-foreground leading-relaxed">
                Aim for consistent 25–50 minute deep work intervals with 5–10 minute restorative breaks to avoid cognitive fatigue.
              </p>
            </div>
          </div>

          {/* Quick Start Pomodoro Card */}
          <div className="glass-panel rounded-3xl border border-primary/30 bg-primary/10 p-5 shadow-xl flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Ready to focus?</h4>
              <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                Start a timed session with ambient soundscapes
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                haptic("heavy");
                onOpenPomodoro();
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition-all active:scale-95 hover:brightness-110 cursor-pointer shrink-0"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start</span>
            </button>
          </div>
        </div>
      </div>

      {/* Today's Focus Logs */}
      <div className="glass-panel rounded-3xl border border-white/15 bg-white/[0.03] p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Today's Focus Activity</h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {todaySessions.length} sessions logged
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-xs text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-foreground">No focus sessions recorded today yet</p>
            <p className="mt-1 text-[0.7rem]">Launch Pomodoro to automatically log your focused hours toward your daily goal!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySessions.slice(0, 5).map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-bold text-foreground truncate">{sess.noteTitle}</p>
                  <p className="text-[0.65rem] text-muted-foreground font-mono">
                    {sess.courseName} • {new Date(sess.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-emerald-400">+{sess.durationMinutes} mins</span>
                  <span className="block text-[0.6rem] text-muted-foreground">{sess.efficiencyScore}% focus score</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
