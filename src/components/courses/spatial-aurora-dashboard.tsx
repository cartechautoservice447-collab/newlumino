import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  ChevronRight,
  Flag,
  Flame,
  Layers,
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
import type { Course, CourseAccent, Note } from "@/lib/notes";
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

const accentClasses: Record<CourseAccent, string> = {
  amber: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  cyan: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10",
  emerald: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  rose: "text-rose-300 border-rose-400/30 bg-rose-400/10",
  sky: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  violet: "text-violet-300 border-violet-400/30 bg-violet-400/10",
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (value.slice(0, 2) || "NL").toUpperCase();
}

function age(timestamp: number) {
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days === 1 ? "1d ago" : days + "d ago";
}

function notePreview(body: string) {
  const clean = body.replace(/[#>*_~\-]/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > 150 ? clean.slice(0, 150).trim() + "..." : clean;
}

function ProgressRing({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent));
  const circumference = 257.6;
  return (
    <div className="relative h-[114px] w-[114px] shrink-0">
      <svg className="-rotate-90 h-full w-full" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7.5" />
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="url(#spatial-aurora-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * safe) / 100}
          strokeLinecap="round"
          strokeWidth="7.5"
        />
        <defs>
          <linearGradient id="spatial-aurora-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#4edea3" />
            <stop offset="50%" stopColor="#4cd7f6" />
            <stop offset="100%" stopColor="#b090ff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[27px] font-black leading-none text-white">
          {safe}<span className="text-xs text-emerald-300">%</span>
        </span>
        <span className="mt-1 text-[9px] font-bold tracking-widest text-slate-400">REACHED</span>
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
  const [soundscape, setSoundscape] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const metadata = user?.user_metadata as { username?: string; full_name?: string } | null;
  const name = metadata?.username || metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const firstName = name.split(/\s+/)[0] || "Student";

  const categories = useMemo(() => {
    const values = new Set<string>();
    courses.forEach((course) => {
      if (course.category) values.add(course.category);
    });
    return ["all", ...Array.from(values)];
  }, [courses]);

  const recentNote = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null,
    [notes],
  );
  const favoriteCount = useMemo(() => notes.filter((note) => note.favorite).length, [notes]);

  const goalSeconds = Math.max(60, dailyGoalHours * 3600);
  const progress = Math.min(100, Math.round((todayFocusSeconds / goalSeconds) * 100));
  const focusMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.round(dailyGoalHours * 60);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (category !== "all" && course.category !== category) return false;
      if (!q) return true;
      return (
        course.name.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        (course.category || "").toLowerCase().includes(q) ||
        notes.some(
          (note) =>
            note.courseId === course.id &&
            (note.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q)),
        )
      );
    });
  }, [category, courses, notes, query]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#070a10] text-[#dfe2ef]">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-[440px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-400/20 via-cyan-500/10 to-violet-600/15 blur-[125px]" />
      <div className="pointer-events-none absolute -left-28 top-[460px] h-88 w-88 rounded-full bg-cyan-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-96 w-96 rounded-full bg-violet-400/10 blur-[130px]" />

      <div className="relative z-10 h-full overflow-y-auto overscroll-contain pb-28">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070a10]/80 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <div className="rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-400 to-indigo-500 p-[1.5px] shadow-[0_0_18px_rgba(78,222,163,.35)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#0c111c] text-sm font-bold text-emerald-300">
                    {initials(name)}
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-[#070a10]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-wider text-emerald-300">SPATIAL AURORA</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-[11px] text-slate-400">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
                </div>
                <h1 className="truncate text-[17px] font-bold tracking-tight text-white">Welcome back, {firstName}</h1>
                <p className="truncate text-[11px] italic tracking-wide text-emerald-200/70">"Quiet craft leads to compounding mastery"</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-pressed={soundscape}
                aria-label="Toggle Soundscape"
                onClick={() => {
                  haptic("light");
                  setSoundscape((value) => !value);
                }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold transition-transform duration-150 active:scale-95",
                  soundscape ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/[0.08] bg-white/[0.05]",
                )}
              >
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden text-white sm:inline">40Hz Binaural</span>
              </button>
              <button type="button" aria-label="Notifications" onClick={() => haptic("light")} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-slate-400 active:scale-95">
                <Bell className="h-[19px] w-[19px]" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5 pt-6">
          <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(28,36,54,.68),rgba(14,18,29,.86))] p-5 shadow-[0_18px_44px_-14px_rgba(0,0,0,.65)] backdrop-blur-[30px]">
            <div className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-300/25 via-cyan-300/14 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-14 h-52 w-52 rounded-full bg-violet-300/14 blur-3xl" />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/12 text-emerald-300">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Focus Horizon</span>
                    <h2 className="mt-0.5 truncate text-[15px] font-bold text-white">Daily momentum</h2>
                  </div>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-amber-200">
                <Flame className="h-3.5 w-3.5 text-amber-400" /> {progress >= 100 ? "Goal Reached" : "Flow Synchronized"}
              </span>
            </div>

            <div className="relative z-10 mt-5 flex items-center gap-5">
              <div className="shrink-0 scale-[0.88] origin-left">
                <ProgressRing percent={progress} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[31px] font-extrabold text-white">{focusMinutes}m</span>
                  <span className="text-[11px] font-semibold text-slate-400">/ {goalMinutes}m goal</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">Your live focus progress from today. Keep the flow moving toward your daily goal.</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-[width] duration-700" style={{ width: `${Math.max(2, progress)}%` }} />
                </div>
              </div>
            </div>

            <button type="button" onClick={() => { haptic("medium"); onStartFocus?.(); }} className="relative z-10 mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-300 px-4 text-[14px] font-bold text-[#022115] shadow-[0_10px_28px_-10px_rgba(78,222,163,.7)] active:scale-[0.985]">
              <Sparkles className="h-[19px] w-[19px]" />
              {progress >= 100 ? "Start another focus block" : "Immerse into Study"}
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-black">25m block</span>
            </button>
          </section>

          <section className="grid grid-cols-3 gap-2.5">
            <button type="button" onClick={() => document.getElementById("spatial-workspaces")?.scrollIntoView({ behavior: "smooth" })} className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3.5 text-center backdrop-blur-xl active:scale-[0.98]">
              <BookOpen className="mx-auto mb-2 h-8 w-8 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-1.5 text-emerald-300" />
              <span className="block text-[24px] font-extrabold text-white">{courses.length}</span>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Courses</span>
            </button>
            <button type="button" onClick={onOpenAllNotes} className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3.5 text-center backdrop-blur-xl active:scale-[0.98]">
              <BookOpen className="mx-auto mb-2 h-8 w-8 rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-1.5 text-cyan-300" />
              <span className="block text-[24px] font-extrabold text-white">{notes.length}</span>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Knowledge Notes</span>
            </button>
            <button type="button" onClick={onOpenFavorites} className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3.5 text-center backdrop-blur-xl active:scale-[0.98]">
              <Bookmark className="mx-auto mb-2 h-8 w-8 rounded-xl border border-violet-300/25 bg-violet-300/10 p-1.5 text-violet-300" />
              <span className="block text-[24px] font-extrabold text-white">{favoriteCount}</span>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Bookmarked Topics</span>
            </button>
          </section>

          {recentNote ? (
            <section className="flex flex-col gap-3.5">
              <div className="flex items-end justify-between px-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-[18px] w-[18px] text-cyan-300" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Continue Learning</span>
                  </div>
                  <h2 className="mt-1 text-[15px] font-bold tracking-tight text-white">Pick up where you left off</h2>
                </div>
                <button type="button" onClick={onOpenAllNotes} className="shrink-0 text-[11px] font-semibold text-emerald-300 active:translate-x-0.5">Explore all</button>
              </div>

              <button
                type="button"
                onClick={() => onOpenNote?.(recentNote.id, recentNote.courseId || undefined)}
                className="group relative overflow-hidden rounded-3xl border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(28,36,54,.72),rgba(14,18,29,.90))] p-5 text-left shadow-[0_16px_40px_-14px_rgba(0,0,0,.72)] transition-all duration-200 active:scale-[0.99]"
              >
                <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 max-w-[76%] items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      <span className="truncate">{recentNote.courseId ? courses.find((course) => course.id === recentNote.courseId)?.name || "Course" : "General"}</span>
                    </span>
                    <Bookmark className="h-5 w-5 shrink-0 text-amber-300" />
                  </div>

                  <h3 className="mt-3 truncate text-[17px] font-bold text-white">{recentNote.title || "Untitled Note"}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-400">{notePreview(recentNote.body) || "Open this note to continue learning."}</p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400"><Timer className="h-[14px] w-[14px]" />Updated {age(recentNote.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold text-cyan-300">Resume <ArrowRight className="h-3 w-3" /></span>
                  </div>
                </div>
              </button>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-11 pr-11 text-sm text-white outline-none backdrop-blur-xl focus:border-emerald-300/50" placeholder="Search courses, tags, and topics..." type="search" />
              <button type="button" aria-label="Focus search" onClick={() => haptic("light")} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-white/[0.06] text-emerald-300 active:scale-95"><Mic className="h-[17px] w-[17px]" /></button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              {categories.map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} className={cn("shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold active:scale-95", category === item ? "bg-emerald-300 text-[#002b1b]" : "border border-white/[0.06] bg-white/[0.05] text-slate-400")}>{item === "all" ? "General" : item}</button>
              ))}
            </div>
          </section>

          <section id="spatial-workspaces" className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><Layers className="h-[18px] w-[18px] text-violet-300" /><h2 className="text-xs font-bold uppercase tracking-wider text-white">Active Workspaces</h2></div><span className="text-xs text-slate-400">{filteredCourses.length} active domains</span></div>
            <div className="flex flex-col gap-3">
              {filteredCourses.map((course) => {
                const courseNotes = notes.filter((note) => note.courseId === course.id);
                const latest = [...courseNotes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
                const accent = accentClasses[course.color];
                return (
                  <article key={course.id} className={cn("rounded-2xl border p-4 backdrop-blur-xl", accent)}>
                    <button type="button" onClick={() => onOpenCourse(course.id)} className="flex w-full items-start justify-between gap-3 text-left">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", accent)}><BookOpen className="h-5 w-5" /></div>
                        <div className="min-w-0"><h3 className="truncate text-[15px] font-bold text-white">{course.name}</h3><p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{course.description || "Workspace for saved study materials"}</p></div>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">{courseNotes.length} {courseNotes.length === 1 ? "note" : "notes"}</span>
                    </button>
                    <div className="mt-3.5 flex flex-wrap items-center gap-2"><span className="rounded-md bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{course.category || "General"}</span><span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">{latest ? "Updated " + age(latest.updatedAt) : "No notes yet"}</span></div>
                    <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5"><span className="text-xs text-slate-400">{latest ? "Edited " + age(latest.updatedAt) : "Created " + age(course.createdAt)}</span><button type="button" onClick={() => onOpenCourse(course.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 active:scale-95">Open Workspace <ArrowRight className="h-3.5 w-3.5" /></button></div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto flex h-16 w-full max-w-[420px] items-center justify-between rounded-full border border-white/[0.09] bg-[#0a0f18]/85 px-3 shadow-[0_20px_48px_-8px_rgba(0,0,0,.85)] backdrop-blur-2xl">
          <button type="button" onClick={() => document.getElementById("spatial-workspaces")?.scrollIntoView({ behavior: "smooth" })} className="flex h-full flex-1 flex-col items-center justify-center text-emerald-300"><BookOpen className="h-[22px] w-[22px]" /><span className="mt-0.5 text-[10px] font-bold">Courses</span></button>
          <button type="button" onClick={onOpenAllNotes} className="flex h-full flex-1 flex-col items-center justify-center text-slate-400"><BookOpen className="h-[22px] w-[22px]" /><span className="mt-0.5 text-[10px]">Notes</span></button>
          <div className="flex shrink-0 items-center px-1.5"><button type="button" aria-label="Create new item" onClick={onQuickNewNote} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-300 via-teal-400 to-cyan-300 text-[#002b1b] shadow-[0_0_24px_rgba(78,222,163,.45)] active:scale-90"><Plus className="h-[26px] w-[26px]" /></button></div>
          <button type="button" onClick={onNavigateDailyGoal} className="flex h-full flex-1 flex-col items-center justify-center text-slate-400"><Flag className="h-[22px] w-[22px]" /><span className="mt-0.5 text-[10px]">Goal</span></button>
          <button type="button" onClick={onOpenMenu} className="flex h-full flex-1 flex-col items-center justify-center text-slate-400"><Wrench className="h-[22px] w-[22px]" /><span className="mt-0.5 text-[10px]">Tools</span></button>
        </div>
      </nav>
    </div>
  );
}
