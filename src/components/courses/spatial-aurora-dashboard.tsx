import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  ChevronRight,
  Flag,
  Flame,
  FolderOpen,
  Mic,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Timer,
  Volume2,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { type Course, type CourseAccent, type Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";

type Props = {
  courses: Course[];
  notes: Note[];
  onOpenCourse: (id: string) => void;
  onOpenMenu?: () => void;
  onQuickNewNote?: () => void;
  onOpenNote?: (noteId: string, courseId?: string) => void;
  onOpenAllNotes?: () => void;
  onOpenFavorites?: () => void;
  onStartFocus?: () => void;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
  onNavigateDailyGoal?: () => void;
};

const COURSE_ACCENT: Record<CourseAccent, { text: string; border: string; bg: string; glow: string }> = {
  amber: { text: "text-amber-300", border: "border-amber-400/30", bg: "bg-amber-400/10", glow: "hover:border-amber-400/35" },
  cyan: { text: "text-cyan-300", border: "border-cyan-400/30", bg: "bg-cyan-400/10", glow: "hover:border-cyan-400/35" },
  emerald: { text: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-400/10", glow: "hover:border-emerald-400/35" },
  rose: { text: "text-rose-300", border: "border-rose-400/30", bg: "bg-rose-400/10", glow: "hover:border-rose-400/35" },
  sky: { text: "text-sky-300", border: "border-sky-400/30", bg: "bg-sky-400/10", glow: "hover:border-sky-400/35" },
  violet: { text: "text-violet-300", border: "border-violet-400/30", bg: "bg-violet-400/10", glow: "hover:border-violet-400/35" },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name.slice(0, 2) || "NL").toUpperCase();
}

function timeAgo(timestamp: number) {
  const delta = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days === 1 ? "1d ago" : days + "d ago";
}

function excerpt(body: string) {
  const plain = body
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 150 ? plain.slice(0, 150).trim() + "…" : plain;
}

function MiniRadial({ percent }: { percent: number }) {
  const safe = Math.min(100, Math.max(0, percent));
  const circumference = 257.6;
  const offset = circumference - (circumference * safe) / 100;

  return (
    <div className="relative h-[114px] w-[114px] shrink-0">
      <svg className="-rotate-90 h-full w-full" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.07)" strokeLinecap="round" strokeWidth="7.5" />
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="url(#spatialAuroraGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="7.5"
          className="drop-shadow-[0_0_8px_rgba(78,222,163,0.7)] transition-[stroke-dashoffset] duration-700"
        />
        <defs>
          <linearGradient id="spatialAuroraGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#4edea3" />
            <stop offset="50%" stopColor="#4cd7f6" />
            <stop offset="100%" stopColor="#b090ff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[27px] font-extrabold leading-none tracking-tight text-white">
          {safe}
          <span className="text-xs font-bold text-emerald-300">%</span>
        </span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">REACHED</span>
      </div>
    </div>
  );
}

export function SpatialAuroraDashboard({
  courses,
  notes,
  onOpenCourse,
  onOpenMenu,
  onQuickNewNote,
  onOpenNote,
  onOpenAllNotes,
  onOpenFavorites,
  onStartFocus,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
  onNavigateDailyGoal,
}: Props) {
  const { user } = useAuth();
  const [soundscapeActive, setSoundscapeActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const searchRef = useRef<HTMLInputElement>(null);

  const meta = user?.user_metadata as { username?: string; full_name?: string } | null;
  const name = meta?.username || meta?.full_name || user?.email?.split("@")[0] || "Student";
  const displayName = name.split(/\s+/)[0] || "Student";

  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date()),
    [],
  );

  const focusGoalSeconds = Math.max(60, dailyGoalHours * 3600);
  const progressPct = Math.min(100, Math.round((todayFocusSeconds / focusGoalSeconds) * 100));
  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.round(dailyGoalHours * 60);

  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((course) => {
      if (course.category?.trim()) set.add(course.category.trim());
    });
    return ["all", ...Array.from(set)];
  }, [courses]);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4),
    [notes],
  );
  const featuredNote = recentNotes[0] ?? null;

  const noteCountByCourse = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((note) => {
      if (note.courseId) counts.set(note.courseId, (counts.get(note.courseId) ?? 0) + 1);
    });
    return counts;
  }, [notes]);

  const latestNoteByCourse = useMemo(() => {
    const latest = new Map<string, Note>();
    notes.forEach((note) => {
      if (!note.courseId) return;
      const current = latest.get(note.courseId);
      if (!current || current.updatedAt < note.updatedAt) latest.set(note.courseId, note);
    });
    return latest;
  }, [notes]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      if (selectedCategory !== "all" && course.category !== selectedCategory) return false;
      if (!query) return true;
      const noteMatch = notes.some(
        (note) =>
          note.courseId === course.id &&
          (note.title.toLowerCase().includes(query) || note.body.toLowerCase().includes(query)),
      );
      return (
        course.name.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.category?.toLowerCase().includes(query) ||
        noteMatch
      );
    });
  }, [courses, notes, searchQuery, selectedCategory]);

  const favoriteCount = useMemo(() => notes.filter((note) => note.favorite).length, [notes]);

  const scrollToWorkspaces = () => {
    document.getElementById("spatial-active-workspaces")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="spatial-aurora-dashboard relative h-full min-h-0 w-full overflow-hidden bg-[#070a10] text-[#dfe2ef]">
      <style>{".spatial-aurora-dashboard{isolation:isolate}.spatial-aurora-dashboard .aurora-glass{background:linear-gradient(135deg,rgba(28,36,54,.65) 0%,rgba(14,18,29,.82) 100%);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,.08);box-shadow:0 12px 32px -8px rgba(0,0,0,.55),inset 0 1px 1px rgba(255,255,255,.12)}.spatial-aurora-dashboard .aurora-glass-subtle{background:linear-gradient(145deg,rgba(23,29,44,.55) 0%,rgba(13,17,27,.72) 100%);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06)}.spatial-aurora-dashboard .aurora-glass-pill{background:rgba(255,255,255,.045);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08)}.spatial-aurora-dashboard .aurora-luminous{animation:spatialAuroraFloat 8s ease-in-out infinite alternate}.spatial-aurora-dashboard .aurora-eq{animation:spatialSoundwave 1.2s ease-in-out infinite alternate}@keyframes spatialAuroraFloat{0%{transform:translateY(0) scale(1);opacity:.7}100%{transform:translateY(-12px) scale(1.06);opacity:.95}}@keyframes spatialSoundwave{0%{height:4px}100%{height:18px}}")}</style>

      <div className="pointer-events-none absolute -top-28 left-1/2 z-0 h-[440px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-400/[0.18] via-cyan-500/[0.12] to-violet-600/[0.15] blur-[125px] aurora-luminous" />
      <div className="pointer-events-none absolute -left-28 top-[460px] z-0 h-88 w-88 rounded-full bg-cyan-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 bottom-24 z-0 h-96 w-96 rounded-full bg-violet-400/[0.12] blur-[130px]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain pb-28">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070a10]/75 pt-[env(safe-area-inset-top,0px)] backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3 px-5 pb-3 pt-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-400 to-indigo-500 p-[1.5px] shadow-[0_0_18px_rgba(78,222,163,.35)]">
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0c111c] text-sm font-bold tracking-wide text-emerald-300">
                    {initials(name)}
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-[#070a10] shadow-[0_0_8px_#4edea3]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">SPATIAL AURORA</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-[11px] font-medium text-slate-400">{todayLabel}</span>
                </div>
                <h1 className="mt-0.5 truncate text-[17px] font-bold leading-snug tracking-tight text-white" style={{ fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif' }}>
                  Welcome back, {displayName}
                </h1>
                <p className="mt-0.5 truncate text-[11px] italic tracking-wide text-emerald-200/70">
                  "Quiet craft leads to compounding mastery"
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-pressed={soundscapeActive}
                aria-label="Toggle Soundscape"
                onClick={() => {
                  haptic("light");
                  setSoundscapeActive((active) => !active);
                }}
                className={cn(
                  "group flex h-9 items-center gap-2 rounded-full border px-3 transition-[background,border-color,transform] duration-150 active:scale-95",
                  soundscapeActive
                    ? "border-emerald-300/45 bg-emerald-300/10"
                    : "border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09]",
                )}
              >
                <div className="flex h-3.5 w-3 shrink-0 items-end gap-0.5">
                  <span className={cn("w-0.5 rounded-full bg-emerald-300", soundscapeActive ? "aurora-eq" : "h-1")} />
                  <span className={cn("w-0.5 rounded-full bg-emerald-300", soundscapeActive ? "aurora-eq" : "h-1.5")} />
                  <span className={cn("w-0.5 rounded-full bg-emerald-300", soundscapeActive ? "aurora-eq" : "h-1")} />
                </div>
                <span className="hidden text-[11px] font-semibold tracking-wide text-white sm:inline">40Hz Binaural</span>
                <Volume2 className="h-3.5 w-3.5 text-slate-400 sm:hidden" />
              </button>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => haptic("light")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-slate-400 transition-[background,color,transform] duration-150 hover:bg-white/[0.09] hover:text-white active:scale-95"
              >
                <Bell className="h-[19px] w-[19px]" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5 pt-6">
          <section className="relative w-full overflow-hidden rounded-[30px] aurora-glass p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br from-emerald-300/30 via-cyan-300/20 to-transparent blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-violet-300/20 blur-2xl" />

            <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/15 text-emerald-300 shadow-[0_0_12px_rgba(78,222,163,.3)]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-[12px] font-bold uppercase tracking-widest text-white">Focus Horizon</span>
              </div>
              <div className="aurora-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                <Flame className="h-[15px] w-[15px] text-amber-400" />
                <span className="font-bold tracking-tight text-amber-200">Daily Momentum</span>
              </div>
            </div>

            <div className="relative z-10 my-3 flex items-center gap-5">
              <MiniRadial percent={progressPct} />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-extrabold leading-tight tracking-tight text-white">{todayMinutes}m</span>
                  <span className="text-xs font-semibold tracking-wide text-slate-400">/ {goalMinutes}m goal</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                  Your real focus time from this session day. Keep the flow moving toward your daily goal.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#4edea3]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                    {progressPct >= 100 ? "Goal Reached" : "Flow Synchronized"}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-4 pt-1">
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onStartFocus?.();
                }}
                className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-300 px-4 font-bold text-[15px] text-[#022115] shadow-[0_8px_24px_rgba(78,222,163,.35)] transition-[box-shadow,transform] duration-150 hover:shadow-[0_12px_30px_rgba(78,222,163,.48)] active:scale-[0.98]"
              >
                <Sparkles className="h-[22px] w-[22px] transition-transform duration-150 group-hover:scale-110" />
                <span className="tracking-wide">Immerse into Study</span>
                <span className="ml-1 rounded-full bg-black/20 px-2 py-0.5 text-[11px] font-black uppercase text-[#002b1b]">25m block</span>
              </button>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={scrollToWorkspaces}
              className="aurora-glass-subtle flex flex-col items-center rounded-2xl p-3.5 text-center transition-[border-color,background,transform] duration-150 hover:border-white/20 active:scale-[.98]"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-300 shadow-[0_0_10px_rgba(78,222,163,.2)]">
                <BookOpen className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[24px] font-extrabold leading-tight text-white">{courses.length}</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Courses</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAllNotes?.()}
              className="aurora-glass-subtle flex flex-col items-center rounded-2xl p-3.5 text-center transition-[border-color,background,transform] duration-150 hover:border-white/20 active:scale-[.98]"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-300 shadow-[0_0_10px_rgba(76,215,246,.2)]">
                <BookOpen className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[24px] font-extrabold leading-tight text-white">{notes.length}</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Knowledge Notes</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenFavorites?.()}
              className="aurora-glass-subtle flex flex-col items-center rounded-2xl p-3.5 text-center transition-[border-color,background,transform] duration-150 hover:border-white/20 active:scale-[.98]"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-300/10 text-violet-300 shadow-[0_0_10px_rgba(208,188,255,.25)]">
                <Bookmark className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[24px] font-extrabold leading-tight text-white">{favoriteCount}</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Bookmarked Topics</span>
            </button>
          </section>

          {featuredNote ? (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-[18px] w-[18px] text-cyan-300" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">Continue Learning</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAllNotes?.()}
                  className="flex items-center gap-0.5 text-xs font-semibold text-emerald-300 hover:underline"
                >
                  <span>Explore All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="group relative overflow-hidden rounded-3xl aurora-glass p-5 transition-[border-color] duration-150 hover:border-cyan-300/30">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#4cd7f6]" />
                      <span className="truncate">{featuredNote.courseId ? courses.find((course) => course.id === featuredNote.courseId)?.name || "Course" : "General"}</span>
                    </span>
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-slate-400">{timeAgo(featuredNote.updatedAt)}</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Open latest note"
                    onClick={() => onOpenNote?.(featuredNote.id, featuredNote.courseId || undefined)}
                    className="text-amber-300 transition-colors hover:text-amber-200"
                  >
                    <Bookmark className="h-5 w-5 fill-current" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenNote?.(featuredNote.id, featuredNote.courseId || undefined)}
                  className="block w-full text-left"
                >
                  <h3 className="text-[16px] font-bold leading-snug text-white transition-colors group-hover:text-cyan-300">{featuredNote.title || "Untitled Note"}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-400">
                    {excerpt(featuredNote.body) || "Open this note to continue learning from your latest saved work."}
                  </p>
                </button>

                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/20 text-cyan-300">
                        <Volume2 className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-[11px] font-bold leading-tight text-white">Recent Note Preview</span>
                        <span className="block truncate text-[10px] text-slate-400">Saved knowledge · updated {timeAgo(featuredNote.updatedAt)}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-cyan-300">READY</span>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Timer className="h-[15px] w-[15px]" />
                    <span>Updated {timeAgo(featuredNote.updatedAt)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenNote?.(featuredNote.id, featuredNote.courseId || undefined)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.07] px-4 py-1.5 text-xs font-bold text-cyan-300 transition-[background,transform] duration-150 hover:bg-white/[0.12] active:scale-95"
                  >
                    <span>Continue Note</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-11 pr-12 text-sm text-white placeholder:text-slate-400 outline-none backdrop-blur-xl transition-[background,border-color] focus:border-emerald-300/50 focus:bg-white/[0.07]"
                placeholder="Search courses, tags, and topics..."
                type="search"
                aria-label="Search courses, tags, and topics"
              />
              <button
                type="button"
                aria-label="Focus voice search"
                onClick={() => {
                  haptic("light");
                  searchRef.current?.focus();
                }}
                className="absolute inset-y-0 right-3 my-auto flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-emerald-300 transition-[background,transform] duration-150 hover:bg-white/[0.1] active:scale-95"
              >
                <Mic className="h-[17px] w-[17px]" />
              </button>
            </div>

            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-0.5" aria-label="Course categories">
              {categories.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-[background,color,transform] duration-150 active:scale-95",
                      active
                        ? "bg-emerald-300 text-[#002b1b] shadow-[0_2px_12px_rgba(78,222,163,.3)]"
                        : "border border-white/[0.06] bg-white/[0.05] font-semibold text-slate-400 hover:bg-white/[0.08] hover:text-white",
                    )}
                  >
                    {category === "all" ? "General" : category}
                  </button>
                );
              })}
            </div>
          </section>

          <section id="spatial-active-workspaces" className="scroll-mt-24 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="h-[18px] w-[18px] text-violet-300" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">Active Workspaces</h2>
              </div>
              <span className="text-xs font-medium text-slate-400">{filteredCourses.length} active domains</span>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredCourses.map((course) => {
                  const Icon = FolderOpen;
                  const accent = COURSE_ACCENT[course.color] ?? COURSE_ACCENT.sky;
                  const noteCount = noteCountByCourse.get(course.id) ?? 0;
                  const latest = latestNoteByCourse.get(course.id);

                  return (
                    <article
                      key={course.id}
                      className={cn(
                        "group rounded-2xl aurora-glass-subtle border border-white/[0.07] p-4 transition-[border-color,transform] duration-150",
                        accent.glow,
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => onOpenCourse(course.id)} className="flex min-w-0 items-center gap-3 text-left">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", accent.bg, accent.border, accent.text)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-bold text-white transition-colors group-hover:text-emerald-200">
                              {course.name}
                            </h3>
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                              {course.description || "Workspace for saved study materials"}
                            </p>
                          </div>
                        </button>
                        <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                          {noteCount} {noteCount === 1 ? "note" : "notes"}
                        </span>
                      </div>

                      <div className="mb-2.5 mt-3.5 flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", accent.bg, accent.border, accent.text)}>
                          {course.category || "General"}
                        </span>
                        <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-400">
                          {latest ? "Updated " + timeAgo(latest.updatedAt) : "No notes yet"}
                        </span>
                        <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-400">
                          {noteCount > 0 ? "Study Ready" : "Empty Workspace"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/[0.05] pt-2.5">
                        <span className="text-xs text-slate-400">
                          {latest ? "Edited " + timeAgo(latest.updatedAt) : "Created " + timeAgo(course.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenCourse(course.id)}
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-semibold transition-[color,transform] duration-150 active:scale-95",
                            accent.text,
                          )}
                        >
                          <span>Open Workspace</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl aurora-glass-subtle p-6 text-center">
                <Search className="mx-auto h-6 w-6 text-slate-500" />
                <p className="mt-2 text-sm font-semibold text-white">No workspaces match this view.</p>
                <p className="mt-1 text-xs text-slate-400">Try another search term or category.</p>
              </div>
            )}
          </section>

          <div className="h-3 shrink-0" />
        </main>
      </div>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto flex h-16 w-full max-w-[420px] items-center justify-between rounded-full border border-white/[0.09] bg-[#0a0f18]/85 px-3 shadow-[0_20px_48px_-8px_rgba(0,0,0,.85)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => (document.querySelector(".spatial-aurora-dashboard main") as HTMLElement | null)?.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex h-full flex-1 flex-col items-center justify-center text-emerald-300"
          >
            <BookOpen className="h-[22px] w-[22px]" />
            <span className="mt-0.5 text-[10px] font-bold tracking-tight">Courses</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAllNotes?.()}
            className="flex h-full flex-1 flex-col items-center justify-center text-slate-400 transition-colors hover:text-white"
          >
            <BookOpen className="h-[22px] w-[22px]" />
            <span className="mt-0.5 text-[10px] font-medium tracking-tight">Notes</span>
          </button>
          <div className="flex shrink-0 items-center justify-center px-1.5">
            <button
              type="button"
              aria-label="Create new item"
              onClick={() => onQuickNewNote?.()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-300 via-teal-400 to-cyan-300 text-[#002b1b] shadow-[0_0_24px_rgba(78,222,163,.45)] transition-transform duration-150 active:scale-90"
            >
              <Plus className="h-[26px] w-[26px]" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigateDailyGoal?.()}
            className="flex h-full flex-1 flex-col items-center justify-center text-slate-400 transition-colors hover:text-white"
          >
            <Flag className="h-[22px] w-[22px]" />
            <span className="mt-0.5 text-[10px] font-medium tracking-tight">Goal</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenMenu?.()}
            className="flex h-full flex-1 flex-col items-center justify-center text-slate-400 transition-colors hover:text-white"
          >
            <Wrench className="h-[22px] w-[22px]" />
            <span className="mt-0.5 text-[10px] font-medium tracking-tight">Tools</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
