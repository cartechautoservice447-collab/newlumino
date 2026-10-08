import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Eye,
  FolderOpen,
  Flame,
  Menu,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
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
  onOpenMenu,
  onOpenSettings,
  onOpenAllNotes,
}: {
  name?: string;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onOpenAllNotes: () => void;
}) {
  const initial = (name?.[0] || "N").toUpperCase();
  return (
    <header className="flex items-center justify-between gap-3 pt-[max(0.25rem,env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5"><span className="truncate text-[13px] font-extrabold tracking-tight text-foreground">NewLumino</span><span className="text-[8px] font-bold uppercase tracking-[0.18em] text-primary/80">Study</span></div>
          <span className="block truncate text-[9px] font-mono uppercase tracking-[0.14em] text-muted-foreground/75">Focused learning space</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" aria-label="Search notes" onClick={onOpenAllNotes} className="mobile-glass-lite flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-95"><Search className="h-4 w-4" /></button>
        <button type="button" aria-label="Open study command center" onClick={onOpenMenu} className="mobile-glass-lite flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-95"><SlidersHorizontal className="h-4 w-4" /></button>
        <button type="button" aria-label="Open settings" onClick={onOpenSettings} className="mobile-glass-lite flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition active:scale-95">{name ? <span className="text-[11px] font-bold text-primary">{initial}</span> : <CircleUserRound className="h-4 w-4" />}</button>
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
  const open = () => { haptic("light"); if (note) onOpenNote(note.id, note.courseId || undefined); else onCreateNote(); };
  return (
    <section className="glass-panel relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] p-5 shadow-[0_14px_44px_-26px_rgba(0,0,0,0.8)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div><span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary"><Sparkles className="h-3.5 w-3.5" />Continue studying</span><p className="mt-1 text-[10px] text-muted-foreground">Your most recent study thread</p></div>
          {note && <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[9px] font-mono text-muted-foreground">{formatDate(note.updatedAt)}</span>}
        </div>
        {note ? (
          <>
            <div className="mt-5 flex items-start gap-3.5">
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", accent.border, accent.bg, accent.text)}><BookOpen className="h-5 w-5" /></span>
              <div className="min-w-0 pt-0.5"><p className={cn("truncate text-[10px] font-bold uppercase tracking-[0.12em]", accent.text)}>{course?.name || "Personal study"}</p><h2 className="mt-1 line-clamp-2 text-[1.08rem] font-bold leading-snug tracking-tight text-foreground">{note.title || "Untitled note"}</h2><p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{cleanSnippet(note.body, 96) || "Pick up where you left off."}</p></div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3"><span className="truncate text-[10px] font-mono text-muted-foreground">Ready to resume</span><button type="button" onClick={open} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]">Resume Note<ArrowRight className="h-3.5 w-3.5" /></button></div>
          </>
        ) : (
          <><h2 className="mt-5 text-[1.08rem] font-bold tracking-tight text-foreground">Create your first study note</h2><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">A focused note gives your learning workspace a place to start.</p><button type="button" onClick={open} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]">New note<Plus className="h-3.5 w-3.5" /></button></>
        )}
      </div>
    </section>
  );
});

const MobileStudyToday = memo(function MobileStudyToday({
  todayFocusSeconds,
  dailyGoalHours,
  currentStreak,
  onStartFocus,
  onOpenDailyGoal,
}: {
  todayFocusSeconds: number;
  dailyGoalHours: number;
  currentStreak: number;
  onStartFocus: () => void;
  onOpenDailyGoal: () => void;
}) {
  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.max(1, Math.round(dailyGoalHours * 60));
  const progress = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
  const remaining = Math.max(0, goalMinutes - todayMinutes);
  return (
    <section className="glass-panel relative overflow-hidden rounded-[1.9rem] border border-white/[0.08] p-5 shadow-[0_18px_54px_-28px_rgba(0,0,0,0.85)]">
      <div className="pointer-events-none absolute -top-24 left-1/3 h-56 w-56 rounded-full bg-primary/10 blur-[90px]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3"><div><span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Focus momentum</span><h2 className="mt-1 text-[1.02rem] font-bold tracking-tight text-foreground">Today’s Deep Work</h2></div><button type="button" onClick={() => { haptic("light"); onOpenDailyGoal(); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[9px] font-bold text-primary"><Flame className="h-3 w-3" />{currentStreak}d streak</button></div>
        <div className="flex items-center gap-5">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="newluminoFocusRing" x1="0%" x2="100%" y1="0%" y2="100%"><stop offset="0%" stopColor="var(--primary)" /><stop offset="100%" stopColor="var(--secondary)" /></linearGradient></defs><circle className="text-white/[0.08]" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="7" /><circle cx="50" cy="50" fill="transparent" r="40" stroke="url(#newluminoFocusRing)" strokeDasharray={Math.PI * 80} strokeDashoffset={(Math.PI * 80) * (1 - progress / 100)} strokeLinecap="round" strokeWidth="7" /></svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center"><span className="text-2xl font-black leading-none tracking-tight text-foreground">{progress}%</span><span className="mt-1 text-[8px] font-bold uppercase tracking-[0.13em] text-muted-foreground">goal</span></div>
          </div>
          <div className="min-w-0 flex-1"><div className="flex items-baseline gap-1.5"><span className="font-mono text-[30px] font-extrabold leading-none tracking-tight text-foreground">{todayMinutes}</span><span className="text-[12px] text-muted-foreground">/ {goalMinutes}m logged</span></div><div className="mt-2 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px] text-primary" /><span className="text-[11px] font-semibold text-primary">{progress >= 100 ? "Daily goal complete" : "Deep focus momentum"}</span></div><p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{remaining > 0 ? `${remaining}m until today’s focus goal closes.` : "Your daily mastery ring is complete."}</p></div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/10 text-secondary"><Zap className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-foreground">Focus Session</p><p className="truncate text-[9px] font-mono text-muted-foreground">Pomodoro · Deep Focus</p></div></div><span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-secondary">Ready</span></div>
        <button type="button" onClick={() => { haptic("medium"); onStartFocus(); }} className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.985]"><Zap className="h-5 w-5" />Start Focus Session</button>
      </div>
    </section>
  );
});

const MobileQuickStats = memo(function MobileQuickStats({
  courseCount, noteCount, favoriteCount, onOpenCourses, onOpenAllNotes, onOpenFavorites,
}: {
  courseCount: number; noteCount: number; favoriteCount: number; onOpenCourses: () => void; onOpenAllNotes: () => void; onOpenFavorites: () => void;
}) {
  const items = [
    { label: "Courses", count: courseCount, icon: FolderOpen, tone: "primary", onClick: onOpenCourses },
    { label: "Notes", count: noteCount, icon: BookOpen, tone: "secondary", onClick: onOpenAllNotes },
    { label: "Fav", count: favoriteCount, icon: Star, tone: "amber", onClick: onOpenFavorites },
  ];
  return <div className="grid grid-cols-3 gap-3">{items.map((item) => { const Icon = item.icon; const tone = item.tone === "secondary" ? "border-secondary/20 bg-secondary/10 text-secondary" : item.tone === "amber" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : "border-primary/20 bg-primary/10 text-primary"; return <button key={item.label} type="button" onClick={item.onClick} className="glass-panel flex min-h-[112px] flex-col items-center justify-center rounded-[1.45rem] border-white/[0.08] px-2.5 py-4 text-center transition active:scale-[0.98]"><span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", tone)}><Icon className="h-5 w-5" /></span><span className="mt-3 text-xl font-extrabold leading-none tabular-nums text-foreground">{item.count}</span><span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</span></button>; })}</div>;
});

const MobileStudyInsights = memo(function MobileStudyInsights({
  averageSessionMinutes, bestWindow, topCourse, weeklyDelta,
}: { averageSessionMinutes: number; bestWindow: string; topCourse: string; weeklyDelta: string; }) {
  const hasHistory = averageSessionMinutes > 0;
  const items = [
    { label: "Avg session", value: hasHistory ? String(averageSessionMinutes) : "—", suffix: hasHistory ? "min" : "", note: hasHistory ? "Deep-work rhythm" : "Complete a focus session", tone: "text-primary" },
    { label: "Peak window", value: hasHistory ? bestWindow : "—", suffix: "", note: hasHistory ? "Strongest study window" : "Learns from sessions", tone: "text-secondary" },
    { label: "Top subject", value: topCourse === "—" ? "—" : topCourse, suffix: "", note: "Leading recent focus time", tone: "text-foreground" },
    { label: "Weekly momentum", value: weeklyDelta, suffix: "", note: "vs. previous 7 days", tone: "text-primary" },
  ];
  return <section className="space-y-4"><div className="flex items-end justify-between gap-3"><div><h2 className="text-[1.25rem] font-extrabold tracking-tight text-foreground">Study Intelligence</h2><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">A calm view of your cognitive rhythm and momentum.</p></div><span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">Insights</span></div><div className="grid grid-cols-2 gap-3.5">{items.map((item) => <div key={item.label} className="glass-panel flex min-h-[124px] flex-col justify-between rounded-[1.45rem] border-white/[0.08] p-4 shadow-sm"><span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</span><div className="min-w-0"><div className={cn("truncate font-extrabold leading-tight", item.value.length > 12 ? "text-[17px]" : "text-[27px]", item.tone)}>{item.value} {item.suffix && <span className="text-[12px] font-medium text-muted-foreground">{item.suffix}</span>}</div><span className="mt-1 block line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{item.note}</span></div></div>)}</div></section>;
});

const MobileWeeklyStudyPulse = memo(function MobileWeeklyStudyPulse({ weekly, weeklyTotal, }: { weekly: MobileStudyAnalytics["weekly"]; weeklyTotal: number; }) {
  return <section className="glass-panel relative overflow-hidden rounded-[1.7rem] border-white/[0.08] p-5 shadow-[0_14px_42px_-26px_rgba(0,0,0,0.8)]"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Weekly Study Pulse</span><span className="font-mono text-[11px] font-bold tabular-nums text-foreground">{formatStudyMinutes(weeklyTotal)} total</span></div><div className="mt-5 flex h-28 items-end justify-between gap-2.5 px-1">{weekly.map((day) => <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end justify-center"><span className={cn("block w-full max-w-[18px] rounded-full transition-[height] duration-500", day.isToday ? "bg-gradient-to-t from-secondary to-primary shadow-[0_0_16px_-5px]" : "bg-white/[0.11]")} style={{ height: Math.max(10, day.height) + "%" }} /></div><span className={cn("text-[9px] font-bold uppercase tracking-[0.12em]", day.isToday ? "text-primary" : "text-muted-foreground")}>{day.label}</span></div>)}</div></section>;
});

const MobileDeepRecall = memo(function MobileDeepRecall({ note, course, onOpenNote, onStartFocus, }: { note?: Note; course?: Course; onOpenNote: (noteId: string, courseId?: string) => void; onStartFocus: () => void; }) {
  if (!note) return null;
  const accent = course ? ACCENT_STYLES[course.color] : ACCENT_STYLES.sky;
  return <section className="space-y-3.5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><h2 className="text-[1.25rem] font-extrabold tracking-tight text-foreground">Deep Recall</h2><span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.13em] text-primary">Review checkpoint</span></div><span className="shrink-0 text-[10px] text-muted-foreground">Spaced checkpoint</span></div><div className="glass-panel relative overflow-hidden rounded-[1.7rem] border-white/[0.08] p-5 shadow-sm"><div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" /><div className="relative"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", accent.dot)} /><span className={cn("truncate text-[9px] font-bold uppercase tracking-[0.13em]", accent.text)}>{course?.name || "Latest note"} · recall</span></div><span className="font-mono text-[9px] font-semibold text-primary">Active</span></div><div className="mt-4"><h3 className="text-[15px] font-bold leading-snug tracking-tight text-foreground">Can you explain the key idea in “{note.title || "your latest note"}” without reopening it?</h3><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Retrieve the core idea first, then reopen the note to verify what you remembered.</p></div><div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3.5"><button type="button" onClick={() => { haptic("light"); onOpenNote(note.id, note.courseId || undefined); }} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[11px] font-semibold text-foreground transition active:scale-[0.97]"><Eye className="h-3.5 w-3.5 text-secondary" />Reveal Note</button><button type="button" onClick={() => { haptic("medium"); onStartFocus(); }} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-4 py-2.5 text-[11px] font-bold text-primary transition active:scale-[0.97]"><CheckCircle2 className="h-3.5 w-3.5" />Practice Now</button></div></div></div></section>;
});

const MobileRecentActivity = memo(function MobileRecentActivity({ notes, coursesById, onOpenNote, onOpenAllNotes, }: { notes: Note[]; coursesById: Map<string, Course>; onOpenNote: (noteId: string, courseId?: string) => void; onOpenAllNotes: () => void; }) {
  if (!notes.length) return null;
  const relative = (timestamp: number) => { const diff = Math.max(0, Date.now() - timestamp); const minutes = Math.floor(diff / 60000); if (minutes < 1) return "Now"; if (minutes < 60) return minutes + "m ago"; const hours = Math.floor(minutes / 60); if (hours < 24) return hours + "h ago"; const days = Math.floor(hours / 24); if (days === 1) return "Yesterday"; if (days < 7) return days + "d ago"; return formatDate(timestamp); };
  return <section className="space-y-3.5"><div className="flex items-end justify-between gap-3"><div><h2 className="text-[1.25rem] font-extrabold tracking-tight text-foreground">Recent Activity</h2><p className="mt-1 text-[11px] text-muted-foreground">Continue where you left off</p></div><button type="button" onClick={onOpenAllNotes} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-primary">See all<ArrowRight className="h-3 w-3" /></button></div><div className="-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-1 pt-0.5 scrollbar-none overscroll-x-contain">{notes.map((note) => { const course = note.courseId ? coursesById.get(note.courseId) : undefined; const accent = course ? (ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky) : ACCENT_STYLES.sky; return <button key={note.id} type="button" onClick={() => { haptic("light"); onOpenNote(note.id, note.courseId || undefined); }} className="glass-panel group relative flex h-[148px] w-[238px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[1.55rem] border-white/[0.08] p-4 text-left shadow-sm transition active:scale-[0.98]"><div><div className="flex items-center justify-between gap-2"><span className={cn("max-w-[155px] truncate text-[9px] font-bold uppercase tracking-[0.13em]", accent.text)}>{course?.name || "General"}</span><span className="shrink-0 text-[9px] font-mono text-muted-foreground">{relative(note.updatedAt)}</span></div><h3 className="mt-3 line-clamp-2 text-[14px] font-bold leading-snug tracking-tight text-foreground">{note.title || "Untitled Note"}</h3><p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{cleanSnippet(note.body, 76) || "Empty note snippet..."}</p></div><div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5"><span className="text-[9px] font-mono text-muted-foreground">{note.favorite ? "Favorite" : "Recent note"}</span><span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">Resume<ArrowRight className="h-3 w-3" /></span></div></button>; })}</div></section>;
});
const MobileCourseCard = memo(function MobileCourseCard({ course, summary, animationIndex, onOpenCourse, onAddNote, onDelete, }: { course: Course; summary: CourseSummary; animationIndex: number; onOpenCourse: (id: string) => void; onAddNote: () => void; onDelete: (course: Course) => void; }) {
  const style = ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky;
  return <div role="button" tabIndex={0} onClick={() => { haptic("light"); onOpenCourse(course.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); haptic("light"); onOpenCourse(course.id); } }} style={{ animationDelay: animationIndex * 35 + "ms" }} className="glass-panel animate-panel-in group flex min-h-[76px] w-full cursor-pointer items-center gap-3 rounded-[1.5rem] border-white/[0.08] p-3.5 text-left transition active:scale-[0.995]">
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", style.border, style.bg, style.text, style.glow)}><FolderOpen className="h-5 w-5" /></span>
    <div className="min-w-0 flex-1"><h3 className="truncate text-[13px] font-bold tracking-tight text-foreground">{course.name}</h3><div className="mt-1 flex items-center gap-2 text-[9px] font-medium text-muted-foreground"><span>{summary.noteCount} {summary.noteCount === 1 ? "note" : "notes"}</span><span className="h-1 w-1 rounded-full bg-muted-foreground/35" /><span className={cn("truncate font-semibold", style.text)}>{course.category || course.color}</span></div></div>
    <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label={"Add note in " + course.name} onClick={(event) => { event.stopPropagation(); haptic("medium"); onAddNote(); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition active:scale-90"><Plus className="h-3.5 w-3.5" /></button><button type="button" aria-label={"Delete " + course.name} onClick={(event) => { event.stopPropagation(); onDelete(course); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition active:scale-90 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" /></div>
  </div>;
});

const MobileCourseLibrary = memo(function MobileCourseLibrary({ courses, summaries, onOpenCourse, onQuickNewNote, onDeleteCourse, onAddCourse, }: { courses: Course[]; summaries: Map<string, CourseSummary>; onOpenCourse: (id: string) => void; onQuickNewNote: () => void; onDeleteCourse: (id: string) => void; onAddCourse: (name: string, description?: string, color?: CourseAccent, category?: string) => void | Promise<void>; }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const categories = useMemo(() => ["all", ...Array.from(new Set(courses.map((course) => course.category?.trim()).filter(Boolean) as string[]))], [courses]);
  const filteredCourses = useMemo(() => { const query = search.trim().toLowerCase(); return courses.filter((course) => (category === "all" || course.category === category) && (!query || `${course.name} ${course.description || ""} ${course.category || ""}`.toLowerCase().includes(query))); }, [courses, search, category]);
  return <section id="mobile-course-library" className="scroll-mt-5 pb-4"><div className="flex items-end justify-between gap-3"><div><h2 className="text-[1.25rem] font-extrabold tracking-tight text-foreground">Library Spaces</h2><p className="mt-1 text-[11px] text-muted-foreground">Your structured knowledge spaces</p></div><button type="button" onClick={() => setIsCreating(true)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-foreground transition active:scale-90 hover:text-primary" aria-label="Create a new course"><Plus className="h-4 w-4" /></button></div><label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your library…" className="glass-panel h-11 w-full rounded-2xl border-white/[0.08] pl-10 pr-3 text-xs text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40" /></label>{categories.length > 1 && <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("mobile-glass-lite min-h-8 shrink-0 rounded-full px-3 text-[9px] font-bold capitalize transition", category === item ? "border-primary/35 text-primary" : "text-muted-foreground")}>{item}</button>)}</div>}<div className="mt-4 space-y-2.5">{filteredCourses.map((course, index) => <MobileCourseCard key={course.id} course={course} summary={summaries.get(course.id) || { noteCount: 0, latestUpdatedAt: course.updatedAt || course.createdAt }} animationIndex={index} onOpenCourse={onOpenCourse} onAddNote={() => onQuickNewNote(course.id)} onDelete={setDeletingCourse} />)}{!filteredCourses.length && <div className="glass-panel rounded-[1.5rem] border-dashed border-white/[0.12] px-4 py-8 text-center"><p className="text-xs font-semibold text-foreground">No courses found</p><p className="mt-1 text-[11px] text-muted-foreground">Try another search or create a course.</p></div>}</div>{isCreating && <CourseForm onClose={() => setIsCreating(false)} onCreate={onAddCourse} />}{deletingCourse && <DeleteCourseConfirm course={deletingCourse} onCancel={() => setDeletingCourse(null)} onConfirm={() => { onDeleteCourse(deletingCourse.id); setDeletingCourse(null); }} />}</section>;
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
  const resumeNote = recentNotes[0];
  const resumeCourse = resumeNote?.courseId ? coursesById.get(resumeNote.courseId) : undefined;
  const meta = user?.user_metadata as { username?: string; full_name?: string } | null;
  const name = meta?.username || meta?.full_name?.split(" ")[0];

  return (
    <main className="dashboard-vertical-scroll h-[100dvh] overflow-y-auto overscroll-y-contain px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-4 md:hidden">
      <div className="mx-auto w-full max-w-xl pb-5">
        <section className="space-y-6" aria-label="Today">
          <MobileDashboardHeader name={name} onOpenMenu={onOpenMenu} onOpenSettings={onOpenSettings} onOpenAllNotes={onOpenAllNotes} />
          <div className="space-y-5">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">{greetingForHour(new Date().getHours())}</p><h1 className="mt-1 max-w-[330px] text-[1.55rem] font-extrabold leading-tight tracking-tight text-foreground">Ready to continue your learning?</h1><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{resumeCourse ? "Your study space is ready when you are." : "Choose a course and build today’s momentum."}</p></div>
            <MobileResumeStudy note={resumeNote} course={resumeCourse} onOpenNote={onOpenNote} onCreateNote={onCreateNote} />
            <MobileStudyToday todayFocusSeconds={props.todayFocusSeconds} dailyGoalHours={props.dailyGoalHours} currentStreak={studyAnalytics.currentStreak} onStartFocus={onStartFocus} onOpenDailyGoal={onOpenDailyGoal} />
            <MobileQuickStats courseCount={props.courses.length} noteCount={props.notes.length} favoriteCount={favoriteCount} onOpenCourses={() => document.getElementById("mobile-course-library")?.scrollIntoView({ behavior: "smooth", block: "start" })} onOpenAllNotes={onOpenAllNotes} onOpenFavorites={onOpenFavorites} />
          </div>
        </section>

        <section className="mt-12 space-y-7" aria-label="Study intelligence">
          <MobileStudyInsights averageSessionMinutes={studyAnalytics.averageSessionMinutes} bestWindow={studyAnalytics.bestWindow} topCourse={studyAnalytics.topCourse} weeklyDelta={studyAnalytics.weeklyDelta} />
          <MobileWeeklyStudyPulse weekly={studyAnalytics.weekly} weeklyTotal={studyAnalytics.weeklyTotal} />
          <MobileDeepRecall note={resumeNote} course={resumeCourse} onOpenNote={onOpenNote} onStartFocus={onStartFocus} />
          <MobileRecentActivity notes={recentActivity} coursesById={coursesById} onOpenNote={onOpenNote} onOpenAllNotes={onOpenAllNotes} />
        </section>

        <section className="mt-12" aria-label="Library">
          <MobileCourseLibrary courses={props.courses} summaries={summaries} onOpenCourse={onOpenCourse} onQuickNewNote={onCreateNote} onDeleteCourse={onDeleteCourse} onAddCourse={onAddCourse} />
        </section>
      </div>
    </main>
  );
}
