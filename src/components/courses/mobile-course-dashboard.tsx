import { memo, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Flame,
  FolderOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { COURSE_ACCENTS, formatDate, type Course, type CourseAccent, type Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";
import { MobileMomentumAndActivity } from "./mobile-momentum-and-activity";

const ACCENT_STYLES: Record<CourseAccent, {
  bg: string;
  border: string;
  text: string;
  glow: string;
  dot: string;
}> = {
  sky: {
    bg: "bg-sky-500/15",
    border: "border-sky-500/30",
    text: "text-sky-400",
    glow: "shadow-[0_0_24px_-6px_rgba(56,189,248,0.7)]",
    dot: "bg-sky-400",
  },
  violet: {
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-400",
    glow: "shadow-[0_0_24px_-6px_rgba(167,139,250,0.7)]",
    dot: "bg-violet-400",
  },
  amber: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "shadow-[0_0_24px_-6px_rgba(251,191,36,0.7)]",
    dot: "bg-amber-400",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    glow: "shadow-[0_0_24px_-6px_rgba(52,211,153,0.7)]",
    dot: "bg-emerald-400",
  },
  rose: {
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    text: "text-rose-400",
    glow: "shadow-[0_0_24px_-6px_rgba(251,113,133,0.7)]",
    dot: "bg-rose-400",
  },
  cyan: {
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    glow: "shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)]",
    dot: "bg-cyan-400",
  },
};

type Props = {
  courses: Course[];
  notes: Note[];
  onOpenCourse: (id: string) => void;
  onAddCourse: (name: string, description?: string, color?: CourseAccent, category?: string) => void | Promise<void>;
  onDeleteCourse: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMenu?: () => void;
  onOpenNote?: (noteId: string, courseId?: string) => void;
  onOpenAllNotes?: () => void;
  onOpenFavorites?: () => void;
  onStartFocus?: () => void;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
};

const getGreeting = (name: string) => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { greeting: "Good Morning, " + name + "!", subtitle: "Ready for your morning study sprint?", pill: "Morning Sprint ☀️" };
  }
  if (hour >= 12 && hour < 17) {
    return { greeting: "Good Afternoon, " + name + "!", subtitle: "Keep your study momentum going strong.", pill: "Deep Focus ⚡" };
  }
  if (hour >= 17 && hour < 22) {
    return { greeting: "Good Evening, " + name + "!", subtitle: "Review your key takeaways and active recall.", pill: "Evening Review 🌙" };
  }
  return { greeting: "Night Owl, " + name + "!", subtitle: "Late-night deep work and quiet retention.", pill: "Night Owl 🦉" };
};

export const MobileCourseDashboard = memo(function MobileCourseDashboard({
  courses,
  notes,
  onOpenCourse,
  onAddCourse,
  onDeleteCourse,
  onOpenSettings,
  onOpenMenu,
  onOpenNote,
  onOpenAllNotes,
  onOpenFavorites,
  onStartFocus,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: Props) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState<CourseAccent>("sky");
  const [category, setCategory] = useState("");
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const meta = user?.user_metadata as { username?: string; full_name?: string } | null;
  const name = meta?.username || meta?.full_name || user?.email?.split("@")[0] || "Student";
  const greetingInfo = useMemo(() => getGreeting(name), [name]);

  const courseById = useMemo(() => {
    const map = new Map<string, Course>();
    for (const course of courses) map.set(course.id, course);
    return map;
  }, [courses]);

  const courseStats = useMemo(() => {
    const map = new Map<string, { count: number; lastUpdated?: number }>();
    for (const note of notes) {
      if (!note.courseId) continue;
      const current = map.get(note.courseId);
      if (!current) {
        map.set(note.courseId, { count: 1, lastUpdated: note.updatedAt });
        continue;
      }
      current.count += 1;
      if (note.updatedAt > (current.lastUpdated ?? 0)) current.lastUpdated = note.updatedAt;
    }
    return map;
  }, [notes]);

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4)
      .map((note) => ({ note, course: note.courseId ? courseById.get(note.courseId) : undefined }));
  }, [notes, courseById]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const course of courses) {
      if (course.category) values.add(course.category);
    }
    return ["all", ...values];
  }, [courses]);

  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredCourses = useMemo(() => {
    if (!normalizedQuery && selectedCategory === "all") return courses;

    return courses.filter((course) => {
      const matchesSearch =
        !normalizedQuery ||
        course.name.toLowerCase().includes(normalizedQuery) ||
        course.description?.toLowerCase().includes(normalizedQuery) ||
        course.category?.toLowerCase().includes(normalizedQuery);

      return matchesSearch && (selectedCategory === "all" || course.category === selectedCategory);
    });
  }, [courses, normalizedQuery, selectedCategory]);

  const goalSeconds = Math.max(60, dailyGoalHours * 3600);
  const progressPct = Math.min(100, Math.round((todayFocusSeconds / goalSeconds) * 100));
  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const favoriteCount = useMemo(
    () => notes.reduce((count, note) => count + (note.favorite ? 1 : 0), 0),
    [notes],
  );

  const submit = () => {
    const courseTitle = title.trim();
    if (!courseTitle) return;

    haptic("success");
    void onAddCourse(courseTitle, description, selectedColor, category);
    setTitle("");
    setDescription("");
    setSelectedColor("sky");
    setCategory("");
    setAdding(false);
  };

  const confirmDelete = () => {
    if (!deletingCourse) return;
    haptic("warning");
    onDeleteCourse(deletingCourse.id);
    setDeletingCourse(null);
  };

  return (
    <div className="mobile-dashboard-rewrite mobile-native-scroll-root relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-visible pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <main className="mx-auto w-full max-w-[1240px] p-3.5">
        <header className="glass-panel animate-panel-in flex items-center justify-between gap-3.5 rounded-[2rem] p-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open study tools"
              onClick={() => {
                haptic("medium");
                onOpenMenu?.();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/25 to-emerald-500/20 text-primary shadow-[0_0_24px_-4px_hsl(var(--primary)/0.7)] active:scale-90 transition-transform duration-150"
            >
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[1.35rem] font-bold tracking-tight text-foreground">
                {greetingInfo.greeting}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{greetingInfo.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Settings"
            onClick={onOpenSettings}
            className="flex shrink-0 items-center rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-muted-foreground active:scale-95 transition-transform duration-150"
          >
            <Settings className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              haptic("light");
              document.getElementById("courses-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="glass-panel flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center active:scale-[0.96] transition-transform duration-150"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-primary"><FolderOpen className="h-4 w-4" /></div>
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Courses</span>
            <span className="font-mono text-base font-bold text-foreground">{courses.length}</span>
          </button>
          <button
            type="button"
            onClick={() => { haptic("light"); onOpenAllNotes?.(); }}
            className="glass-panel flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center active:scale-[0.96] transition-transform duration-150"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-accent"><BookOpen className="h-4 w-4" /></div>
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Notes</span>
            <span className="font-mono text-base font-bold text-foreground">{notes.length}</span>
          </button>
          <button
            type="button"
            onClick={() => { haptic("light"); onOpenFavorites?.(); }}
            className="glass-panel flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center active:scale-[0.96] transition-transform duration-150"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-amber-400"><Star className="h-4 w-4" /></div>
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Favorites</span>
            <span className="font-mono text-base font-bold text-foreground">{favoriteCount}</span>
          </button>
        </div>

        <section className="mt-7 glass-panel rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-primary/10 via-white/[0.02] to-amber-500/10 p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                  <path className="text-white/10" strokeWidth="3.2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    className="text-primary transition-[stroke-dasharray] duration-500 ease-out"
                    strokeDasharray={String(progressPct) + ", 100"}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono text-[0.68rem] font-bold text-foreground">{progressPct}%</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate text-xs font-bold text-foreground">Today's Focus</h2>
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[0.58rem] font-bold text-amber-300">
                    <Flame className="h-2.5 w-2.5" /> Streak
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[0.65rem] text-muted-foreground">
                  {todayMinutes}m of {dailyGoalHours * 60}m daily goal
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { haptic("medium"); onStartFocus?.(); }}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-3.5 py-2.5 text-xs font-bold text-primary active:scale-90 transition-transform duration-150"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" /> Start Focus
            </button>
          </div>
        </section>

        {recentNotes.length > 0 && (
          <section className="mt-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Continue Studying</h2>
              </div>
              <span className="text-[0.6rem] font-mono text-muted-foreground">Recent notes</span>
            </div>
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory">
              {recentNotes.map(({ note, course }) => {
                const accent = course ? (ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky) : ACCENT_STYLES.sky;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => { haptic("light"); onOpenNote?.(note.id, note.courseId || undefined); }}
                    className="glass-panel flex w-[246px] shrink-0 snap-start flex-col justify-between rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-3.5 text-left shadow-sm active:scale-[0.97] transition-transform duration-150"
                  >
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-1">
                        <span className={cn("inline-flex max-w-[140px] items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[0.6rem] font-bold", accent.border, accent.bg, accent.text)}>
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", accent.dot)} />
                          <span className="truncate">{course?.name || "General"}</span>
                        </span>
                        {note.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                      </div>
                      <h3 className="truncate text-xs font-bold text-foreground">{note.title || "Untitled Note"}</h3>
                      <p className="mt-1 line-clamp-2 text-[0.65rem] leading-relaxed text-muted-foreground">
                        {note.body?.replace(/[#*>\u0060_-]/g, "").slice(0, 80) || "Empty note snippet..."}
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-[0.6rem] text-muted-foreground/70">
                      <span>{formatDate(note.updatedAt)}</span>
                      <span className="flex items-center gap-0.5 font-medium text-primary">Resume <ArrowRight className="h-2.5 w-2.5" /></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-9 mb-3">
          <MobileMomentumAndActivity notes={notes} todayFocusSeconds={todayFocusSeconds} dailyGoalHours={dailyGoalHours} />
        </div>

        <section id="courses-section" className="scroll-mt-6">
          <div className="mt-7">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search course title or description..."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/60 backdrop-blur-xl focus:border-primary/50 focus:outline-none"
                enterKeyHint="search"
              />
            </div>

            <div className="mt-5 flex items-center gap-2">
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 scrollbar-none overscroll-x-contain">
                {categories.length > 2 ? categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors duration-150",
                      selectedCategory === cat ? "border border-white/20 bg-white/15 text-foreground shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {cat}
                  </button>
                )) : (
                  <span className="px-1 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground/40">Your Library</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => { haptic("medium"); setAdding(true); }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform duration-150"
              >
                <Plus className="h-4 w-4" /> Create Course
              </button>
            </div>
          </div>

          <div className="mt-5 flex w-full flex-col gap-3.5">
            {filteredCourses.map((course) => {
              const stats = courseStats.get(course.id);
              const noteCount = stats?.count ?? 0;
              const last = stats?.lastUpdated ?? course.updatedAt ?? course.createdAt;
              const style = ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky;

              return (
                <article
                  key={course.id}
                  onClick={() => { haptic("light"); onOpenCourse(course.id); }}
                  className="glass-panel group relative flex w-full cursor-pointer select-none flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4.5 text-left shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),0_12px_36px_0_rgba(0,0,0,0.4)] transition-transform duration-150 active:scale-[0.975]"
                >
                  <button
                    type="button"
                    aria-label={"Delete " + course.name}
                    onClick={(event) => { event.stopPropagation(); setDeletingCourse(course); }}
                    className="absolute right-3.5 top-3.5 z-10 rounded-xl border border-white/10 bg-black/40 p-2 text-muted-foreground backdrop-blur-md active:scale-90 transition-transform duration-150"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <div>
                    <div className="flex items-start justify-between gap-3 pr-8">
                      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-md", style.border, style.bg, style.text, style.glow)}>
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-0.5 text-xs font-mono font-medium tabular-nums text-muted-foreground">
                        {noteCount} {noteCount === 1 ? "note" : "notes"}
                      </span>
                    </div>

                    <h3 className="mt-3 truncate text-[1.05rem] font-bold tracking-tight text-foreground">{course.name}</h3>
                    {course.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">{course.description}</p>
                    ) : (
                      <p className="mt-1 text-xs italic text-muted-foreground/40">No description provided</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em]", style.border, style.bg, style.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                        {course.color}
                      </span>
                      {course.category && course.category !== course.description?.slice(0, 30) && (
                        <span className="inline-block rounded-lg border border-white/5 bg-white/[0.05] px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                          {course.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-xs text-muted-foreground/70">{last ? "Edited " + formatDate(last) : "No notes yet"}</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredCourses.length === 0 && (
            <div className="mx-auto mt-12 max-w-md rounded-3xl glass-panel p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-muted-foreground/60"><FolderOpen className="h-7 w-7" /></div>
              <h3 className="text-base font-semibold text-foreground">No courses found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {normalizedQuery ? "Try a different search query." : "Create your first course folder to begin taking notes."}
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setAdding(true); }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg"
              >
                <Plus className="h-4 w-4" /> Create First Course
              </button>
            </div>
          )}
        </section>
      </main>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-t-3xl border border-white/15 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">New Course Folder</h2>
            <p className="mt-1 text-xs text-muted-foreground">Creates a synchronized course in the shared backend across NewLumino and Fluid Glass Studio.</p>

            <div className="mt-4 space-y-3.5">
              <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Course Title
                <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="e.g. CS50P — Python, Biology 101, Linear Algebra" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none" />
              </label>

              <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Description (optional)
                <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Programming in Python, lectures, and active recall notes" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none" />
              </label>

              <div>
                <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/80">Accent Color</span>
                <div className="grid grid-cols-3 gap-2">
                  {COURSE_ACCENTS.map((accent) => {
                    const style = ACCENT_STYLES[accent];
                    const isSelected = selectedColor === accent;
                    return (
                      <button
                        key={accent}
                        type="button"
                        onClick={() => setSelectedColor(accent)}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-center transition-transform duration-150",
                          isSelected ? cn(style.border, style.bg, "scale-[1.02] shadow-md") : "border-white/10 bg-white/[0.03]",
                        )}
                      >
                        <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", style.dot)}>{isSelected && <Check className="h-2.5 w-2.5 text-white" />}</span>
                        <span className="text-[0.68rem] capitalize text-foreground/80">{accent}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Category Tag
                <input value={category} onChange={(event) => setCategory(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="e.g. Programming, Science, Design" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none" />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-muted-foreground active:scale-95 transition-transform duration-150">Cancel</button>
              <button type="button" onClick={submit} disabled={!title.trim()} className="rounded-xl border border-white/10 bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform duration-150">Create Course</button>
            </div>
          </div>
        </div>
      )}

      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm rounded-t-3xl border border-destructive/20 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Delete &ldquo;{deletingCourse.name}&rdquo;?</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This permanently removes this course folder and every note contained inside from the shared cloud database. This will also update Fluid Glass Studio in real time.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingCourse(null)} className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-muted-foreground active:scale-95 transition-transform duration-150">Cancel</button>
              <button type="button" onClick={confirmDelete} className="rounded-xl border border-destructive/40 bg-destructive px-5 py-2.5 text-xs font-semibold text-destructive-foreground shadow-lg active:scale-[0.98] transition-transform duration-150">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
