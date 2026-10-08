import { memo, useMemo } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Play,
  SlidersHorizontal,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { PomodoroState } from "@/hooks/use-pomodoro";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type Props = {
  pomodoro: PomodoroState;
  onOpenPomodoro: () => void;
  onBack: () => void;
};

const PRESETS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6];

function formatMinutes(minutes: number) {
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? hours + "h " + remainder + "m" : hours + "h";
}

const GoalContext = memo(function GoalContext({
  focusedMinutes,
  goalMinutes,
  remainingMinutes,
  progressPct,
}: {
  focusedMinutes: number;
  goalMinutes: number;
  remainingMinutes: number;
  progressPct: number;
}) {
  return (
    <section className="mobile-glass-lite rounded-[1.45rem] border border-white/[0.09] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <Target className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Study context
            </p>
            <p className="mt-0.5 truncate text-[12px] font-bold text-foreground">
              Today's focus mission
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold tabular-nums",
            progressPct >= 100
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
              : "border-primary/20 bg-primary/10 text-primary",
          )}
        >
          {progressPct}% complete
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
          <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
            Focused
          </span>
          <span className="mt-1 block text-[12px] font-extrabold tabular-nums text-foreground">
            {formatMinutes(focusedMinutes)}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
          <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
            Target
          </span>
          <span className="mt-1 block text-[12px] font-extrabold tabular-nums text-foreground">
            {formatMinutes(goalMinutes)}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
          <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
            Remaining
          </span>
          <span className="mt-1 block text-[12px] font-extrabold tabular-nums text-foreground">
            {remainingMinutes > 0 ? formatMinutes(remainingMinutes) : "Done"}
          </span>
        </div>
      </div>
    </section>
  );
});

const GoalHero = memo(function GoalHero({
  progressPct,
  focusedMinutes,
  goalMinutes,
  remainingMinutes,
  goalReached,
  onOpenPomodoro,
}: {
  progressPct: number;
  focusedMinutes: number;
  goalMinutes: number;
  remainingMinutes: number;
  goalReached: boolean;
  onOpenPomodoro: () => void;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  return (
    <section className="glass-panel relative overflow-hidden rounded-[1.9rem] border border-primary/20 p-4 shadow-[0_18px_48px_-28px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <div className="flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Focus trajectory
        </div>

        <div className="relative mt-4 h-[190px] w-[190px]">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90"
            aria-label={progressPct + "% of daily goal complete"}
          >
            <defs>
              <linearGradient id="mobile-goal-progress" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="52%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-white/[0.08]"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="url(#mobile-goal-progress)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[2.4rem] font-black tracking-[-0.04em] text-foreground tabular-nums">
              {progressPct}%
            </span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {formatMinutes(focusedMinutes)} / {formatMinutes(goalMinutes)}
            </span>
          </div>
        </div>

        <div className="mt-1">
          {goalReached ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Daily goal mastered
            </span>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{formatMinutes(remainingMinutes)}</span>{" "}
              until today's target
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            haptic("medium");
            onOpenPomodoro();
          }}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {goalReached ? "Start another focus session" : "Start focus session"}
        </button>
      </div>
    </section>
  );
});

const GoalInsights = memo(function GoalInsights({
  remainingMinutes,
  completedSessions,
  averageSessionMinutes,
  goalReached,
}: {
  remainingMinutes: number;
  completedSessions: number;
  averageSessionMinutes: number;
  goalReached: boolean;
}) {
  const title = goalReached
    ? "Protect the momentum"
    : remainingMinutes <= 25
      ? "Finish the last stretch"
      : remainingMinutes <= 60
        ? "One focused block can move this forward"
        : "Build the next deep-work block";

  const detail = goalReached
    ? "Your target is complete. A short optional block can reinforce retention without changing today's score."
    : remainingMinutes <= 25
      ? "A final 20–25 minute sprint is enough to close the gap."
      : averageSessionMinutes > 0
        ? "Your recent sessions average " + averageSessionMinutes + " minutes. Use that as your next block."
        : "Use a 25–50 minute focus block, then take a restorative break.";

  return (
    <section className="mobile-glass-lite rounded-[1.55rem] border border-white/[0.09] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <TrendingUp className="h-[17px] w-[17px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Next best action
              </p>
              <h2 className="mt-0.5 text-[12px] font-bold text-foreground">{title}</h2>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] font-mono font-bold text-muted-foreground">
              {completedSessions} sessions
            </span>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
              <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                Average block
              </span>
              <span className="mt-1 block text-[12px] font-extrabold tabular-nums text-foreground">
                {averageSessionMinutes ? averageSessionMinutes + "m" : "Not yet"}
              </span>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
              <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
                <Zap className="h-3 w-3 text-primary" />
                Goal state
              </span>
              <span className="mt-1 block text-[12px] font-extrabold text-foreground">
                {goalReached ? "Mastered" : "In progress"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

const GoalTargetEditor = memo(function GoalTargetEditor({
  dailyGoalHours,
  onChange,
}: {
  dailyGoalHours: number;
  onChange: (hours: number) => void;
}) {
  return (
    <section className="glass-panel rounded-[1.55rem] border border-white/[0.09] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10 text-violet-200">
            <SlidersHorizontal className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Goal calibration
            </p>
            <h2 className="mt-0.5 text-[12px] font-bold text-foreground">Choose your daily target</h2>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[9px] font-mono font-bold text-violet-200">
          {dailyGoalHours}h
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {PRESETS.map((hours) => (
          <button
            key={hours}
            type="button"
            aria-pressed={dailyGoalHours === hours}
            onClick={() => {
              haptic("light");
              onChange(hours);
            }}
            className={cn(
              "min-h-11 rounded-xl border px-2 text-[11px] font-bold tabular-nums transition-transform active:scale-[0.97] touch-manipulation",
              dailyGoalHours === hours
                ? "border-primary/35 bg-primary/15 text-primary shadow-[0_8px_22px_-14px_hsl(var(--primary)/0.9)]"
                : "border-white/[0.08] bg-white/[0.025] text-muted-foreground",
            )}
          >
            {hours}h
            {dailyGoalHours === hours ? <Check className="mx-auto mt-0.5 h-3 w-3" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
});

const GoalActivity = memo(function GoalActivity({
  todaySessions,
}: {
  todaySessions: PomodoroState["sessionHistory"];
}) {
  return (
    <section className="mobile-glass-lite rounded-[1.55rem] border border-white/[0.09] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
            <TimerReset className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Activity stream
            </p>
            <h2 className="mt-0.5 text-[12px] font-bold text-foreground">Today's sessions</h2>
          </div>
        </div>
        <span className="shrink-0 text-[9px] font-mono font-semibold text-muted-foreground">
          {todaySessions.length} logged
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {todaySessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.10] bg-white/[0.018] px-3 py-5 text-center">
            <Clock3 className="mx-auto h-5 w-5 text-muted-foreground/50" />
            <p className="mt-2 text-[10px] font-semibold text-foreground">Your first block starts here</p>
            <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
              Completed Pomodoro sessions will appear here automatically.
            </p>
          </div>
        ) : (
          todaySessions.slice(0, 6).map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold text-foreground">
                  {session.noteTitle || "Focus session"}
                </p>
                <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                  {session.courseName || "Personal study"} •{" "}
                  {new Date(session.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="block text-[10px] font-bold tabular-nums text-emerald-200">
                  +{session.durationMinutes}m
                </span>
                <span className="mt-0.5 block text-[8px] text-muted-foreground">
                  {session.efficiencyScore}% focus
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
});

export const MobileDailyGoalInterface = memo(function MobileDailyGoalInterface({
  pomodoro,
  onOpenPomodoro,
  onBack,
}: Props) {
  const {
    todayFocusSeconds,
    dailyGoalHours,
    setDailyGoalHours,
    completedSessions,
    sessionHistory,
  } = pomodoro;

  const focusedMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.max(1, Math.round(dailyGoalHours * 60));
  const remainingMinutes = Math.max(0, goalMinutes - focusedMinutes);
  const progressPct = Math.min(100, Math.round((focusedMinutes / goalMinutes) * 100));
  const goalReached = focusedMinutes >= goalMinutes;

  const todaySessions = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return sessionHistory.filter((session) => session.timestamp >= todayStart.getTime());
  }, [sessionHistory]);

  const averageSessionMinutes = useMemo(() => {
    if (!todaySessions.length) return 0;
    return Math.round(
      todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0) / todaySessions.length,
    );
  }, [todaySessions]);

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden md:hidden">
      <header
        className="z-30 shrink-0 border-b border-white/[0.08] bg-background px-3 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Back to dashboard"
            onClick={() => {
              haptic("light");
              onBack();
            }}
            className="mobile-glass-lite flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-transform active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary/80">Goal command</p>
            <h1 className="truncate text-[14px] font-bold tracking-tight text-foreground">Daily Study Goal</h1>
          </div>

          <span
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-xl border text-[10px] font-bold tabular-nums",
              goalReached
                ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            {progressPct}%
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 scroll-sleek">
        <div className="mx-auto w-full max-w-xl space-y-3.5">
          <GoalContext
            focusedMinutes={focusedMinutes}
            goalMinutes={goalMinutes}
            remainingMinutes={remainingMinutes}
            progressPct={progressPct}
          />
          <GoalHero
            progressPct={progressPct}
            focusedMinutes={focusedMinutes}
            goalMinutes={goalMinutes}
            remainingMinutes={remainingMinutes}
            goalReached={goalReached}
            onOpenPomodoro={onOpenPomodoro}
          />
          <GoalInsights
            remainingMinutes={remainingMinutes}
            completedSessions={completedSessions}
            averageSessionMinutes={averageSessionMinutes}
            goalReached={goalReached}
          />
          <GoalTargetEditor dailyGoalHours={dailyGoalHours} onChange={setDailyGoalHours} />
          <GoalActivity todaySessions={todaySessions} />
        </div>
      </div>

      <footer
        className="shrink-0 border-t border-white/[0.08] bg-background px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-xl gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5">
          <button
            type="button"
            onClick={() => {
              haptic("medium");
              onOpenPomodoro();
            }}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Start Focus
          </button>
          <div className="mobile-glass-lite flex min-w-[92px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] px-3 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <Flame className="h-3 w-3 text-amber-300" />
            {goalReached ? "Goal hit" : "In progress"}
          </div>
        </div>
      </footer>
    </main>
  );
});
