import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  FolderOpen,
  Flame,
  Lightbulb,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { haptic } from "@/lib/haptics";
import { COURSE_ACCENTS, formatDate, type Course, type CourseAccent, type Note } from "@/lib/notes";
import { cn } from "@/lib/utils";
import type { PomodoroSessionRecord } from "@/lib/pomodoro-ai";
import { MobileMomentumAndActivity } from "./mobile-momentum-and-activity";

type Props = {
  courses: Course[];
  notes: Note[];
  onOpenCourse: (id: string) => void;
  onAddCourse: (name: string, description?: string, color?: CourseAccent, category?: string) => void | Promise<void>;
  onDeleteCourse: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onQuickNewNote: (courseId?: string) => void;
  onOpenNote: (noteId: string, courseId?: string) => void;
  onOpenAllNotes: () => void;
  onOpenFavorites: () => void;
  onStartFocus: () => void;
  onOpenDailyGoal: () => void;
  todayFocusSeconds: number;
  dailyGoalHours: number;
  sessionHistory?: PomodoroSessionRecord[];
  realtimeStatus?: "connected" | "connecting" | "offline";
  isSyncing?: boolean;
};

type CourseSummary = {
  noteCount: number;
  latestUpdatedAt: number;
};

const ACCENT_STYLES: Record<CourseAccent, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  sky: { bg: "bg-sky-500/15", border: "border-sky-400/30", text: "text-sky-300", dot: "bg-sky-300", glow: "shadow-[0_0_18px_-7px_rgba(56,189,248,0.8)]" },
  violet: { bg: "bg-violet-500/15", border: "border-violet-400/30", text: "text-violet-300", dot: "bg-violet-300", glow: "shadow-[0_0_18px_-7px_rgba(167,139,250,0.8)]" },
  amber: { bg: "bg-amber-500/15", border: "border-amber-300/30", text: "text-amber-200", dot: "bg-amber-300", glow: "shadow-[0_0_18px_-7px_rgba(251,191,36,0.8)]" },
  emerald: { bg: "bg-emerald-500/15", border: "border-emerald-300/30", text: "text-emerald-200", dot: "bg-emerald-300", glow: "shadow-[0_0_18px_-7px_rgba(52,211,153,0.8)]" },
  rose: { bg: "bg-rose-500/15", border: "border-rose-300/30", text: "text-rose-200", dot: "bg-rose-300", glow: "shadow-[0_0_18px_-7px_rgba(251,113,133,0.8)]" },
  cyan: { bg: "bg-cyan-500/15", border: "border-cyan-300/30", text: "text-cyan-200", dot: "bg-cyan-300", glow: "shadow-[0_0_18px_-7px_rgba(34,211,238,0.8)]" },
};

function cleanSnippet(body: string, max = 84) {
  const clean = body.replace(/[#*`>_-]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Keeps memoized dashboard sections independent from callback identity changes in the app shell. */
function useStableEvent<T extends (...args: any[]) => void>(handler: T) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  return useCallback((...args: Parameters<T>) => handlerRef.current(...args), []) as T;
}

const MobileDashboardHeader = memo(function MobileDashboardHeader({
  name,
  subtitle,
  onOpenMenu,
  onOpenSettings,
}: {
  name?: string;
  subtitle: string;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">{greetingForHour(new Date().getHours())}</p>
        <h1 className="mt-1 truncate text-[1.35rem] font-bold tracking-tight text-foreground">{name ? `${name}, ready?` : "Ready to learn?"}</h1>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" aria-label="Open study tools" onClick={onOpenMenu} className="mobile-glass-lite flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-transform active:scale-95">
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <button type="button" aria-label="Open settings" onClick={onOpenSettings} className="mobile-glass-lite flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-transform active:scale-95">
          <Settings className="h-[17px] w-[17px]" />
        </button>
      </div>
    </header>
  );
});

const MobileResumeStudy = memo(function MobileResumeStudy({
  note,
  course,
  onOpenNote,
  onCreateNote,
}: {
  note?: Note;
  course?: Course;
  onOpenNote: (noteId: string, courseId?: string) => void;
  onCreateNote: () => void;
}) {
  const accent = course ? ACCENT_STYLES[course.color] : ACCENT_STYLES.sky;
  const open = () => {
    haptic("light");
    if (note) onOpenNote(note.id, note.courseId || undefined);
    else onCreateNote();
  };

  return (
    <section className="glass-panel relative overflow-hidden rounded-[1.55rem] border-primary/25 p-4">
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Continue studying
          </span>
          {note && <span className="text-[10px] font-mono text-muted-foreground">{formatDate(note.updatedAt)}</span>}
        </div>
        {note ? (
          <>
            <div className="mt-3 flex items-start gap-3">
              <span className={cn("mobile-glass-lite flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", accent.border, accent.text)}><BookOpen className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className={cn("truncate text-[11px] font-semibold", accent.text)}>{course?.name || "Personal study"}</p>
                <h2 className="mt-0.5 truncate text-[1.02rem] font-bold text-foreground">{note.title || "Untitled note"}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{cleanSnippet(note.body) || "Pick up where you left off."}</p>
              </div>
            </div>
            <button type="button" onClick={open} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]">
              Resume note <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-[1.02rem] font-bold text-foreground">Create your first study note</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A focused note gives your learning workspace a place to start.</p>
            <button type="button" onClick={open} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-transform active:scale-[0.98]">
              New note <Plus className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
});

const MobileStudyToday = memo(function MobileStudyToday({
  todayFocusSeconds,
  dailyGoalHours,
  onStartFocus,
  onOpenDailyGoal,
}: {
  todayFocusSeconds: number;
  dailyGoalHours: number;
  onStartFocus: () => void;
  onOpenDailyGoal: () => void;
}) {
  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.max(1, Math.round(dailyGoalHours * 60));
  const progress = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  return (
    <section className="glass-panel relative overflow-hidden rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-primary/10 via-white/[0.02] to-amber-500/10 p-4.5 shadow-lg">
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <path
                  className="text-white/10"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary transition-[stroke-dasharray] duration-500 ease-out"
                  strokeDasharray={progress + ", 100"}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-[0.64rem] font-bold text-foreground">{progress}%</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xs font-bold text-foreground">Today's Focus</h2>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[0.56rem] font-bold text-amber-300">
                  <Flame className="h-2.5 w-2.5" />
                  <span>Streak</span>
                </span>
              </div>
              <p className="mt-0.5 truncate text-[0.64rem] text-muted-foreground">
                {todayMinutes}m of {goalMinutes}m daily goal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic("medium");
              onStartFocus();
            }}
            className="shrink-0 flex min-h-10 w-[104px] items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-2.5 py-2.5 text-center text-[0.68rem] font-extrabold leading-tight text-primary shadow-sm transition-all active:scale-[0.97] hover:bg-primary/30 touch-manipulation"
            aria-label="Start a focus session"
          >
            <Zap className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">Start Focus</span>
          </button>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-emerald-300 transition-[width] duration-500 ease-out"
            style={{ width: progress + "%" }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/75">
          <span>Today</span>
          <span>{todayMinutes} / {goalMinutes} min</span>
        </div>
      </div>
    </section>
  );
});

const MobileQuickStats = memo(function MobileQuickStats({
  courseCount,
  noteCount,
  favoriteCount,
  onOpenCourses,
  onOpenAllNotes,
  onOpenFavorites,
}: {
  courseCount: number;
  noteCount: number;
  favoriteCount: number;
  onOpenCourses: () => void;
  onOpenAllNotes: () => void;
  onOpenFavorites: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <button
        type="button"
        onClick={onOpenCourses}
        className="mobile-glass-lite min-h-12 rounded-xl border border-white/10 px-2.5 py-2.5 text-left transition-transform active:scale-[0.98]"
      >
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
          <FolderOpen className="h-3 w-3 text-primary" />
          Courses
        </span>
        <span className="mt-0.5 block text-[13px] font-extrabold tabular-nums text-foreground">{courseCount}</span>
      </button>
      <button
        type="button"
        onClick={onOpenAllNotes}
        className="mobile-glass-lite min-h-11 rounded-xl border border-white/10 px-2.5 py-2 text-left transition-transform active:scale-[0.98]"
      >
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
          <BookOpen className="h-3 w-3 text-primary" />
          Notes
        </span>
        <span className="mt-0.5 block text-[13px] font-extrabold tabular-nums text-foreground">{noteCount}</span>
      </button>
      <button
        type="button"
        onClick={onOpenFavorites}
        className="mobile-glass-lite min-h-11 rounded-xl border border-white/10 px-2.5 py-2 text-left transition-transform active:scale-[0.98]"
      >
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
          <Star className="h-3 w-3 text-amber-300" />
          Fav
        </span>
        <span className="mt-0.5 block text-[13px] font-extrabold tabular-nums text-foreground">{favoriteCount}</span>
      </button>
    </div>
  );
});


const DAY_MS = 86_400_000;

function localDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function localDayStart(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function formatStudyMinutes(minutes: number) {
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? hours + "h " + remainder + "m" : hours + "h";
}

function formatPercentDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? "New" : "—";
  const delta = Math.round(((current - previous) / previous) * 100);
  return (delta > 0 ? "+" : "") + delta + "%";
}

function studyWindowLabel(hour: number) {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 24) return "evening";
  return "late night";
}

type MobileStudyAnalytics = {
  weekly: Array<{ label: string; date: string; minutes: number; height: number; isToday: boolean }>;
  weeklyTotal: number;
  previousWeekTotal: number;
  weeklyDelta: string;
  currentStreak: number;
  bestStreak: number;
  averageSessionMinutes: number;
  bestWindow: string;
  topCourse: string;
};

const MobileWeeklyStudyPulse = memo(function MobileWeeklyStudyPulse({
  weekly,
  weeklyTotal,
  previousWeekTotal,
  weeklyDelta,
  currentStreak,
  bestStreak,
}: {
  weekly: MobileStudyAnalytics["weekly"];
  weeklyTotal: number;
  previousWeekTotal: number;
  weeklyDelta: string;
  currentStreak: number;
  bestStreak: number;
}) {
  const trendPositive = weeklyTotal > previousWeekTotal;
  return (
    <section className="mobile-glass-lite mobile-premium-enter overflow-hidden rounded-[1.65rem] border p-4" style={{ animationDelay: "110ms" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <BarChart3 className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[12px] font-bold uppercase tracking-[0.14em] text-foreground">Weekly Study Pulse</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Your last 7 days</p>
          </div>
        </div>
        <span className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold",
          trendPositive ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-white/10 bg-white/[0.04] text-muted-foreground",
        )}>
          {weeklyDelta}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2.5">
        {weekly.map((day, index) => (
          <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-[0.12em]",
              day.isToday ? "text-primary" : "text-muted-foreground/70",
            )}>
              {day.label}
            </span>
            <div className="flex h-16 w-full max-w-[30px] items-end overflow-hidden rounded-full border border-white/[0.07] bg-white/[0.025] p-0.5">
              <span
                className={cn(
                  "mobile-pulse-bar block w-full origin-bottom rounded-full",
                  day.isToday
                    ? "bg-gradient-to-t from-primary via-cyan-300 to-emerald-300"
                    : "bg-gradient-to-t from-white/15 via-primary/40 to-primary/65",
                )}
                style={{ height: day.height + "%", animationDelay: (180 + index * 45) + "ms" }}
              />
            </div>
            <span className="text-[8px] font-mono font-semibold tabular-nums text-muted-foreground">
              {day.minutes ? formatStudyMinutes(day.minutes) : "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 items-center gap-2 border-t border-white/[0.07] pt-3">
        <div>
          <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Weekly total</span>
          <span className="mt-1 block text-[11px] font-extrabold tabular-nums text-foreground">{formatStudyMinutes(weeklyTotal)}</span>
        </div>
        <div className="border-l border-white/[0.07] pl-3">
          <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Current streak</span>
          <span className="mt-1 block text-[11px] font-extrabold tabular-nums text-foreground">{currentStreak} days</span>
        </div>
        <div className="border-l border-white/[0.07] pl-3">
          <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Best streak</span>
          <span className="mt-1 block text-[11px] font-extrabold tabular-nums text-foreground">{bestStreak} days</span>
        </div>
      </div>
    </section>
  );
});

const MobileStudyInsights = memo(function MobileStudyInsights({
  averageSessionMinutes,
  bestWindow,
  topCourse,
  weeklyDelta,
}: {
  averageSessionMinutes: number;
  bestWindow: string;
  topCourse: string;
  weeklyDelta: string;
}) {
  const hasHistory = averageSessionMinutes > 0;
  return (
    <section className="glass-panel mobile-premium-enter overflow-hidden rounded-[1.65rem] border border-primary/20 p-4" style={{ animationDelay: "200ms" }}>
      <div className="relative">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
            <Lightbulb className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-foreground">Study Insight</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {hasHistory ? "Your recent pattern points to " + bestWindow + " study." : "Personalized once you complete a focus session."}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <p className="text-[12px] font-semibold leading-relaxed text-foreground">
            {hasHistory
              ? "You average " + averageSessionMinutes + " minutes per completed session, with " + (topCourse === "—" ? "your study time still building" : topCourse + " leading your recent focus") + "."
              : "Complete your first focus block and NewLumino will turn your study history into a useful pattern."}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="mobile-glass-lite rounded-xl border px-2.5 py-2.5">
            <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Avg session</span>
            <span className="mt-1 block text-[12px] font-extrabold tabular-nums text-foreground">{hasHistory ? averageSessionMinutes + "m" : "—"}</span>
          </div>
          <div className="mobile-glass-lite rounded-xl border px-2.5 py-2.5">
            <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Best time</span>
            <span className="mt-1 block truncate text-[12px] font-extrabold capitalize text-foreground">{hasHistory ? bestWindow : "—"}</span>
          </div>
          <div className="mobile-glass-lite rounded-xl border px-2.5 py-2.5">
            <span className="block text-[8px] font-bold uppercase tracking-[0.11em] text-muted-foreground">Week</span>
            <span className="mt-1 block text-[12px] font-extrabold tabular-nums text-foreground">{weeklyDelta}</span>
          </div>
        </div>
      </div>
    </section>
  );
});

const MobileRecentActivity = memo(function MobileRecentActivity({
  notes,
  coursesById,
  onOpenNote,
}: {
  notes: Note[];
  coursesById: Map<string, Course>;
  onOpenNote: (noteId: string, courseId?: string) => void;
}) {
  if (!notes.length) return null;

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Recent activity</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Continue where you left off</p>
        </div>
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground/80">
          {notes.length} {notes.length === 1 ? "recent note" : "recent notes"}
        </span>
      </div>

      <div className="w-full flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 pt-0.5 scrollbar-none overscroll-x-contain touch-pan-x">
        {notes.map((note) => {
          const course = note.courseId ? coursesById.get(note.courseId) : undefined;
          const accent = course ? (ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky) : ACCENT_STYLES.sky;

          return (
            <button
              key={note.id}
              type="button"
              onClick={() => {
                haptic("light");
                onOpenNote(note.id, note.courseId || undefined);
              }}
              className="group relative flex min-h-[148px] w-[245px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4 text-left shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.15),0_8px_24px_0_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all duration-200 active:scale-[0.98] min-[375px]:w-[265px]"
              aria-label={"Open " + (note.title || "Untitled Note")}
            >
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-1.5">
                  <span
                    className={cn(
                      "inline-flex max-w-[170px] items-center gap-1 truncate rounded-lg border px-2 py-0.5 text-[10px] font-bold shadow-sm",
                      accent.border,
                      accent.bg,
                      accent.text,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", accent.dot)} />
                    <span className="truncate">{course?.name || "General"}</span>
                  </span>

                  {note.favorite ? (
                    <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                </div>

                <h3 className="mt-1 line-clamp-1 text-[13px] font-bold tracking-tight text-foreground">
                  {note.title || "Untitled Note"}
                </h3>

                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/80">
                  {cleanSnippet(note.body, 85) || "Empty note snippet..."}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5 text-[10px] text-muted-foreground/75">
                <span className="flex min-w-0 items-center gap-1 truncate font-mono">
                  <Clock3 className="h-2.5 w-2.5 shrink-0 opacity-60" />
                  <span className="truncate">{formatDate(note.updatedAt)}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">
                  Resume
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});

const MobileCourseCard = memo(function MobileCourseCard({
  course,
  summary,
  animationIndex,
  onOpenCourse,
  onAddNote,
  onDelete,
}: {
  course: Course;
  summary: CourseSummary;
  animationIndex: number;
  onOpenCourse: (id: string) => void;
  onAddNote: () => void;
  onDelete: (course: Course) => void;
}) {
  const style = ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky;
  const last = summary.latestUpdatedAt || course.updatedAt || course.createdAt;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        haptic("light");
        onOpenCourse(course.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          haptic("light");
          onOpenCourse(course.id);
        }
      }}
      style={{ animationDelay: animationIndex * 35 + "ms" }}
      className="glass-panel animate-panel-in group relative w-full cursor-pointer select-none overflow-hidden rounded-[2rem] border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 text-left shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),0_12px_36px_0_rgba(0,0,0,0.4)] transition-all duration-300 active:scale-[0.975]"
    >
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
            style.border,
            style.bg,
            style.text,
            style.glow,
          )}>
            <FolderOpen className="h-5 w-5" />
          </span>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-0.5 text-xs font-mono font-medium tabular-nums text-muted-foreground">
            {summary.noteCount} {summary.noteCount === 1 ? "note" : "notes"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label={"Add note in " + course.name}
            onClick={(event) => {
              event.stopPropagation();
              haptic("medium");
              onAddNote();
            }}
            className="flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary transition-all active:scale-90 hover:bg-primary/30 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Note</span>
          </button>

          <button
            type="button"
            aria-label={"Delete " + course.name}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(course);
            }}
            className="rounded-xl border border-white/10 bg-black/40 p-1.5 text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/20 hover:text-destructive active:scale-90 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="mt-2.5 truncate text-[1.12rem] font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {course.name}
        </h3>

        {course.description ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
            {course.description}
          </p>
        ) : (
          <p className="mt-1.5 text-xs italic text-muted-foreground/40">
            No description provided
          </p>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em]",
            style.border,
            style.bg,
            style.text,
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
            {course.color}
          </span>

          {course.category && course.category !== course.description?.slice(0, 30) && (
            <span className="inline-block rounded-lg border border-white/5 bg-white/[0.05] px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
              {course.category}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4.5 flex items-center justify-between border-t border-white/5 pt-3.5">
        <span className="text-xs text-muted-foreground/70">
          {last ? "Edited " + formatDate(last) : "No notes yet"}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          Open Workspace
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
});

const MobileCourseLibrary = memo(function MobileCourseLibrary({ courses, summaries, onOpenCourse, onQuickNewNote, onDeleteCourse, onAddCourse }: { courses: Course[]; summaries: Map<string, CourseSummary>; onOpenCourse: (id: string) => void; onQuickNewNote: () => void; onDeleteCourse: (id: string) => void; onAddCourse: (name: string, description?: string, color?: CourseAccent, category?: string) => void | Promise<void> }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const categories = useMemo(() => ["all", ...Array.from(new Set(courses.map((course) => course.category?.trim()).filter(Boolean) as string[]))], [courses]);
  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => (category === "all" || course.category === category) && (!query || `${course.name} ${course.description} ${course.category || ""}`.toLowerCase().includes(query)));
  }, [courses, search, category]);
  return <section id="mobile-course-library" className="scroll-mt-4 pb-4">
    <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-foreground">Your courses</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Your study library</p></div><button type="button" onClick={() => setIsCreating(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary px-3 text-[11px] font-bold text-primary-foreground transition-transform active:scale-95"><Plus className="h-3.5 w-3.5" /> Course</button></div>
    <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses…" className="mobile-glass-lite h-11 w-full rounded-xl pl-10 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/45" /></label>
    <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1.5 scrollbar-none overscroll-x-contain">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("mobile-glass-lite min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold capitalize transition-colors", category === item ? "border-primary/40 text-primary" : "text-muted-foreground")}>{item}</button>)}</div>
    <div className="mt-3 space-y-2.5">{filteredCourses.map((course, index) => <MobileCourseCard key={course.id} course={course} summary={summaries.get(course.id) || { noteCount: 0, latestUpdatedAt: course.updatedAt || course.createdAt }} animationIndex={index} onOpenCourse={onOpenCourse} onAddNote={() => onQuickNewNote(course.id)} onDelete={setDeletingCourse} />)}{!filteredCourses.length && <div className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-8 text-center"><p className="text-xs font-semibold text-foreground">No courses found</p><p className="mt-1 text-[11px] text-muted-foreground">Try another search or create a course.</p></div>}</div>
    {isCreating && <CourseForm onClose={() => setIsCreating(false)} onCreate={onAddCourse} />}
    {deletingCourse && <DeleteCourseConfirm course={deletingCourse} onCancel={() => setDeletingCourse(null)} onConfirm={() => { onDeleteCourse(deletingCourse.id); setDeletingCourse(null); }} />}
  </section>;
});

function CourseForm({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description?: string, color?: CourseAccent, category?: string) => void | Promise<void> }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [category, setCategory] = useState(""); const [color, setColor] = useState<CourseAccent>("sky"); const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!name.trim() || submitting) return; setSubmitting(true); try { await onCreate(name, description, color, category); onClose(); } finally { setSubmitting(false); } };
  return <div role="dialog" aria-modal="true" aria-label="Create course" className="fixed inset-0 z-[90] flex items-end bg-black/55 p-3"><form onSubmit={submit} className="glass-panel w-full rounded-[1.5rem] p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-foreground">Create course</h2><button type="button" aria-label="Close create course" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground"><X className="h-4 w-4" /></button></div><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Course name" className="glass-panel mt-4 h-11 w-full rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/45" /><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" className="glass-panel mt-2 h-11 w-full rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/45" /><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category (optional)" className="glass-panel mt-2 h-11 w-full rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/45" /><div className="mt-3 flex gap-2">{COURSE_ACCENTS.map((accent) => <button key={accent} type="button" aria-label={`Use ${accent} course color`} onClick={() => setColor(accent)} className={cn("h-8 w-8 rounded-full border-2 transition-transform active:scale-90", ACCENT_STYLES[accent].bg, ACCENT_STYLES[accent].border, color === accent ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#171923]" : "opacity-70")} />)}</div><button disabled={!name.trim() || submitting} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50">{submitting ? "Creating…" : "Create course"}<ArrowRight className="h-3.5 w-3.5" /></button></form></div>;
}

function DeleteCourseConfirm({ course, onCancel, onConfirm }: { course: Course; onCancel: () => void; onConfirm: () => void }) {
  return <div role="alertdialog" aria-modal="true" aria-label={`Delete ${course.name}`} className="fixed inset-0 z-[91] flex items-end bg-black/60 p-3"><div className="w-full rounded-[1.5rem] border border-white/10 bg-[#171923] p-4 shadow-2xl"><h2 className="text-sm font-bold text-foreground">Delete {course.name}?</h2><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">This removes the course and its notes. This action cannot be undone.</p><div className="mt-4 flex gap-2"><button type="button" onClick={onCancel} className="h-11 flex-1 rounded-xl border border-white/10 text-xs font-bold text-foreground">Keep course</button><button type="button" onClick={onConfirm} className="h-11 flex-1 rounded-xl bg-destructive text-xs font-bold text-destructive-foreground">Delete course</button></div></div></div>;
}

export function MobileStudyDashboard(props: Props) {
  const { user } = useAuth();
  const onOpenCourse = useStableEvent(props.onOpenCourse); const onOpenNote = useStableEvent(props.onOpenNote); const onCreateNote = useStableEvent(props.onQuickNewNote); const onOpenMenu = useStableEvent(props.onOpenMenu); const onOpenSettings = useStableEvent(props.onOpenSettings); const onStartFocus = useStableEvent(props.onStartFocus); const onOpenDailyGoal = useStableEvent(props.onOpenDailyGoal); const onOpenAllNotes = useStableEvent(props.onOpenAllNotes); const onOpenFavorites = useStableEvent(props.onOpenFavorites); const onDeleteCourse = useStableEvent(props.onDeleteCourse); const onAddCourse = useStableEvent(props.onAddCourse);
  const { coursesById, summaries, recentNotes, favoriteCount } = useMemo(() => {
    const courseMap = new Map(props.courses.map((course) => [course.id, course]));
    const nextSummaries = new Map<string, CourseSummary>();
    for (const course of props.courses) nextSummaries.set(course.id, { noteCount: 0, latestUpdatedAt: course.updatedAt || course.createdAt });
    for (const note of props.notes) { if (!note.courseId) continue; const current = nextSummaries.get(note.courseId) || { noteCount: 0, latestUpdatedAt: 0 }; current.noteCount += 1; current.latestUpdatedAt = Math.max(current.latestUpdatedAt, note.updatedAt); nextSummaries.set(note.courseId, current); }
    return { coursesById: courseMap, summaries: nextSummaries, recentNotes: [...props.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), favoriteCount: props.notes.reduce((total, note) => total + Number(note.favorite), 0) };
  }, [props.courses, props.notes]);

  const recentActivity = useMemo(() => recentNotes.slice(1), [recentNotes]);
  const studyAnalytics = useMemo<MobileStudyAnalytics>(() => {
    const history = props.sessionHistory ?? [];
    const dailyGoalMinutes = Math.max(1, Math.round(props.dailyGoalHours * 60));

    const weekly = Array.from({ length: 7 }, (_, index) => {
      const offset = index - 6;
      const date = localDayStart(offset);
      const key = localDayKey(date.getTime());
      const minutes = history.reduce((sum, session) => (
        localDayKey(session.timestamp) === key ? sum + session.durationMinutes : sum
      ), 0) + (offset === 0 ? Math.floor(props.todayFocusSeconds / 60) : 0);

      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
        date: key,
        minutes,
        height: 0,
        isToday: offset === 0,
      };
    });

    const maxMinutes = Math.max(dailyGoalMinutes, ...weekly.map((day) => day.minutes), 1);
    const normalizedWeekly = weekly.map((day) => ({
      ...day,
      height: day.minutes > 0 ? Math.max(12, Math.round((day.minutes / maxMinutes) * 100)) : 5,
    }));

    const todayStart = localDayStart().getTime();
    const previousWeekTotal = history.reduce((sum, session) => {
      const sessionDay = new Date(session.timestamp);
      sessionDay.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((todayStart - sessionDay.getTime()) / DAY_MS);
      return diffDays >= 7 && diffDays <= 13 ? sum + session.durationMinutes : sum;
    }, 0);
    const weeklyTotal = normalizedWeekly.reduce((sum, day) => sum + day.minutes, 0);

    const activityKeys = new Set(history.map((session) => localDayKey(session.timestamp)));
    if (props.todayFocusSeconds > 0) activityKeys.add(localDayKey(Date.now()));

    let currentStreak = 0;
    for (let offset = 0; offset < 60; offset += 1) {
      if (!activityKeys.has(localDayKey(localDayStart(-offset).getTime()))) break;
      currentStreak += 1;
    }

    let bestStreak = 0;
    let run = 0;
    for (let offset = 59; offset >= 0; offset -= 1) {
      if (activityKeys.has(localDayKey(localDayStart(-offset).getTime()))) {
        run += 1;
        bestStreak = Math.max(bestStreak, run);
      } else {
        run = 0;
      }
    }

    const recentSessions = history.filter((session) => {
      const sessionDay = new Date(session.timestamp);
      sessionDay.setHours(0, 0, 0, 0);
      return Math.floor((todayStart - sessionDay.getTime()) / DAY_MS) >= 0 &&
        Math.floor((todayStart - sessionDay.getTime()) / DAY_MS) < 7;
    });

    const averageSessionMinutes = recentSessions.length
      ? Math.round(recentSessions.reduce((sum, session) => sum + session.durationMinutes, 0) / recentSessions.length)
      : 0;

    const courseMinutes = new Map<string, number>();
    const timeBuckets = new Map<string, number>();
    for (const session of recentSessions) {
      courseMinutes.set(session.courseName, (courseMinutes.get(session.courseName) || 0) + session.durationMinutes);
      const bucket = studyWindowLabel(new Date(session.timestamp).getHours());
      timeBuckets.set(bucket, (timeBuckets.get(bucket) || 0) + session.durationMinutes);
    }

    const topCourse = [...courseMinutes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const bestWindow = [...timeBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return {
      weekly: normalizedWeekly,
      weeklyTotal,
      previousWeekTotal,
      weeklyDelta: formatPercentDelta(weeklyTotal, previousWeekTotal),
      currentStreak,
      bestStreak,
      averageSessionMinutes,
      bestWindow,
      topCourse,
    };
  }, [props.dailyGoalHours, props.sessionHistory, props.todayFocusSeconds]);
  const resumeNote = recentNotes[0]; const resumeCourse = resumeNote?.courseId ? coursesById.get(resumeNote.courseId) : undefined;
  const meta = user?.user_metadata as { username?: string; full_name?: string } | null; const name = meta?.username || meta?.full_name?.split(" ")[0];
  const subtitle = resumeCourse ? `Continue your ${resumeCourse.name} study session` : resumeNote ? "Continue your latest study session" : "Choose a course and build today’s momentum";
  return (
    <main className="dashboard-vertical-scroll h-[100dvh] overflow-y-auto overscroll-y-contain px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 md:hidden">
      <div className="mx-auto w-full max-w-xl pb-2">
        <section className="space-y-4" aria-labelledby="mobile-dashboard-today">
          <h2 id="mobile-dashboard-today" className="px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Today</h2>
          <div className="space-y-4">
            <MobileDashboardHeader
              name={name}
              subtitle={subtitle}
              onOpenMenu={onOpenMenu}
              onOpenSettings={onOpenSettings}
            />
            <MobileResumeStudy
              note={resumeNote}
              course={resumeCourse}
              onOpenNote={onOpenNote}
              onCreateNote={onCreateNote}
            />
            <MobileStudyToday
              todayFocusSeconds={props.todayFocusSeconds}
              dailyGoalHours={props.dailyGoalHours}
              onStartFocus={onStartFocus}
              onOpenDailyGoal={onOpenDailyGoal}
            />
            <MobileQuickStats
              courseCount={props.courses.length}
              noteCount={props.notes.length}
              favoriteCount={favoriteCount}
              onOpenCourses={() => document.getElementById("mobile-course-library")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              onOpenAllNotes={onOpenAllNotes}
              onOpenFavorites={onOpenFavorites}
            />
          </div>
        </section>

        <section className="mt-9 space-y-4" aria-labelledby="mobile-dashboard-progress">
          <div className="px-0.5">
            <h2 id="mobile-dashboard-progress" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Progress</h2>
            <p className="mt-1 text-xs text-muted-foreground/75">A calm view of your study rhythm and momentum.</p>
          </div>
          <div className="space-y-4">
            <MobileMomentumAndActivity
              notes={props.notes}
              todayFocusSeconds={props.todayFocusSeconds}
              dailyGoalHours={props.dailyGoalHours}
            />
            <MobileWeeklyStudyPulse
              weekly={studyAnalytics.weekly}
              weeklyTotal={studyAnalytics.weeklyTotal}
              previousWeekTotal={studyAnalytics.previousWeekTotal}
              weeklyDelta={studyAnalytics.weeklyDelta}
              currentStreak={studyAnalytics.currentStreak}
              bestStreak={studyAnalytics.bestStreak}
            />
            <MobileStudyInsights
              averageSessionMinutes={studyAnalytics.averageSessionMinutes}
              bestWindow={studyAnalytics.bestWindow}
              topCourse={studyAnalytics.topCourse}
              weeklyDelta={studyAnalytics.weeklyDelta}
            />
            <MobileRecentActivity
              notes={recentActivity}
              coursesById={coursesById}
              onOpenNote={onOpenNote}
            />
          </div>
        </section>

        <section className="mt-9 space-y-4" aria-labelledby="mobile-dashboard-library">
          <div className="px-0.5">
            <h2 id="mobile-dashboard-library" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Library</h2>
            <p className="mt-1 text-xs text-muted-foreground/75">Your courses and study spaces.</p>
          </div>
          <MobileCourseLibrary
            courses={props.courses}
            summaries={summaries}
            onOpenCourse={onOpenCourse}
            onQuickNewNote={onCreateNote}
            onDeleteCourse={onDeleteCourse}
            onAddCourse={onAddCourse}
          />
        </section>
      </div>
    </main>
  );
}
