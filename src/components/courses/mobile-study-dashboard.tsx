import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FolderOpen,
  Flame,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { haptic } from "@/lib/haptics";
import { COURSE_ACCENTS, formatDate, type Course, type CourseAccent, type Note } from "@/lib/notes";
import { cn } from "@/lib/utils";
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
  todayFocusSeconds: number;
  dailyGoalHours: number;
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
}: {
  todayFocusSeconds: number;
  dailyGoalHours: number;
  onStartFocus: () => void;
}) {
  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.max(1, Math.round(dailyGoalHours * 60));
  const progress = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  return (
    <section className="glass-panel relative overflow-hidden rounded-[1.85rem] border border-primary/25 bg-gradient-to-br from-primary/10 via-white/[0.02] to-amber-500/10 p-4.5 shadow-lg">
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
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
              <span className="absolute font-mono text-[0.68rem] font-bold text-foreground">
                {progress}%
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-foreground truncate">Today's Focus</h2>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[0.58rem] font-bold text-amber-300">
                  <Flame className="h-2.5 w-2.5" />
                  <span>Streak</span>
                </span>
              </div>
              <p className="mt-0.5 truncate text-[0.65rem] text-muted-foreground">
                {todayMinutes}m of {goalMinutes}m daily goal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartFocus}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-3.5 py-2.5 text-xs font-bold text-primary shadow-sm transition-transform active:scale-90 hover:bg-primary/30"
            aria-label="Start a focus session"
          >
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            <span>Start Focus</span>
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
    <div className="grid grid-cols-[1.25fr_1.25fr_0.85fr] gap-2">
      <button
        type="button"
        onClick={onOpenCourses}
        className="mobile-glass-lite min-h-11 rounded-xl border border-white/10 px-2.5 py-2 text-left transition-transform active:scale-[0.98]"
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
  return <section>
    <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-foreground">Recent activity</h2><span className="text-[11px] text-muted-foreground">Pick up quickly</span></div>
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none overscroll-x-contain">
      {notes.map((note) => {
        const course = note.courseId ? coursesById.get(note.courseId) : undefined;
        const accent = course ? ACCENT_STYLES[course.color] : ACCENT_STYLES.sky;
        return <button key={note.id} type="button" onClick={() => { haptic("light"); onOpenNote(note.id, note.courseId || undefined); }} className="mobile-glass-lite w-[205px] shrink-0 snap-start rounded-2xl p-3 text-left transition-transform active:scale-[0.98]">
          <span className={cn("inline-flex max-w-full items-center gap-1.5 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", accent.border, accent.bg, accent.text)}><span className={cn("h-1.5 w-1.5 rounded-full", accent.dot)} />{course?.name || "General"}</span>
          <strong className="mt-2 block truncate text-xs text-foreground">{note.title || "Untitled note"}</strong>
          <span className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" />{formatDate(note.updatedAt)}</span>
        </button>;
      })}
    </div>
  </section>;
});

const MobileCourseCard = memo(function MobileCourseCard({ course, summary, onOpenCourse, onAddNote, onDelete }: { course: Course; summary: CourseSummary; onOpenCourse: (id: string) => void; onAddNote: () => void; onDelete: (course: Course) => void }) {
  const accent = ACCENT_STYLES[course.color];
  return <article className="glass-panel mobile-glass-content-auto rounded-2xl p-3.5">
    <div className="flex items-start gap-3">
      <button type="button" aria-label={`Open ${course.name}`} onClick={() => { haptic("light"); onOpenCourse(course.id); }} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", accent.border, accent.bg, accent.text)}><FolderOpen className="h-5 w-5" /></button>
      <button type="button" onClick={() => { haptic("light"); onOpenCourse(course.id); }} className="min-w-0 flex-1 text-left"><h3 className="truncate text-sm font-bold text-foreground">{course.name}</h3><p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">{course.description || "No description yet"}</p></button>
      <button type="button" aria-label={`Delete ${course.name}`} onClick={() => onDelete(course)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:scale-95"><Trash2 className="h-4 w-4" /></button>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2.5"><div className="min-w-0 text-[10px] text-muted-foreground"><span className="font-semibold text-foreground/80">{summary.noteCount}</span> {summary.noteCount === 1 ? "note" : "notes"}{summary.latestUpdatedAt ? ` · ${formatDate(summary.latestUpdatedAt)}` : ""}</div><div className="flex shrink-0 gap-1.5"><button type="button" onClick={onAddNote} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2.5 text-[10px] font-bold text-primary transition-transform active:scale-95"><Plus className="h-3 w-3" /> Note</button><button type="button" onClick={() => onOpenCourse(course.id)} className="mobile-glass-lite inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-bold text-foreground transition-transform active:scale-95">Open <ArrowRight className="h-3 w-3" /></button></div></div>
    {course.category && <span className={cn("mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]", accent.border, accent.bg, accent.text)}><span className={cn("h-1 w-1 rounded-full", accent.dot)} />{course.category}</span>}
  </article>;
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
    <div className="mt-3 space-y-2.5">{filteredCourses.map((course) => <MobileCourseCard key={course.id} course={course} summary={summaries.get(course.id) || { noteCount: 0, latestUpdatedAt: course.updatedAt || course.createdAt }} onOpenCourse={onOpenCourse} onAddNote={() => onQuickNewNote(course.id)} onDelete={setDeletingCourse} />)}{!filteredCourses.length && <div className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-8 text-center"><p className="text-xs font-semibold text-foreground">No courses found</p><p className="mt-1 text-[11px] text-muted-foreground">Try another search or create a course.</p></div>}</div>
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
  const onOpenCourse = useStableEvent(props.onOpenCourse); const onOpenNote = useStableEvent(props.onOpenNote); const onCreateNote = useStableEvent(props.onQuickNewNote); const onOpenMenu = useStableEvent(props.onOpenMenu); const onOpenSettings = useStableEvent(props.onOpenSettings); const onStartFocus = useStableEvent(props.onStartFocus); const onOpenAllNotes = useStableEvent(props.onOpenAllNotes); const onOpenFavorites = useStableEvent(props.onOpenFavorites); const onDeleteCourse = useStableEvent(props.onDeleteCourse); const onAddCourse = useStableEvent(props.onAddCourse);
  const { coursesById, summaries, recentNotes, favoriteCount } = useMemo(() => {
    const courseMap = new Map(props.courses.map((course) => [course.id, course]));
    const nextSummaries = new Map<string, CourseSummary>();
    for (const course of props.courses) nextSummaries.set(course.id, { noteCount: 0, latestUpdatedAt: course.updatedAt || course.createdAt });
    for (const note of props.notes) { if (!note.courseId) continue; const current = nextSummaries.get(note.courseId) || { noteCount: 0, latestUpdatedAt: 0 }; current.noteCount += 1; current.latestUpdatedAt = Math.max(current.latestUpdatedAt, note.updatedAt); nextSummaries.set(note.courseId, current); }
    return { coursesById: courseMap, summaries: nextSummaries, recentNotes: [...props.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), favoriteCount: props.notes.reduce((total, note) => total + Number(note.favorite), 0) };
  }, [props.courses, props.notes]);
  const recentActivity = useMemo(() => recentNotes.slice(1), [recentNotes]);
  const resumeNote = recentNotes[0]; const resumeCourse = resumeNote?.courseId ? coursesById.get(resumeNote.courseId) : undefined;
  const meta = user?.user_metadata as { username?: string; full_name?: string } | null; const name = meta?.username || meta?.full_name?.split(" ")[0];
  const subtitle = resumeCourse ? `Continue your ${resumeCourse.name} study session` : resumeNote ? "Continue your latest study session" : "Choose a course and build today’s momentum";
  return <main className="dashboard-vertical-scroll h-[100dvh] overflow-y-auto overscroll-y-contain px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 md:hidden"><div className="mx-auto w-full max-w-xl space-y-6"><MobileDashboardHeader name={name} subtitle={subtitle} onOpenMenu={onOpenMenu} onOpenSettings={onOpenSettings} /><MobileResumeStudy note={resumeNote} course={resumeCourse} onOpenNote={onOpenNote} onCreateNote={onCreateNote} /><MobileStudyToday todayFocusSeconds={props.todayFocusSeconds} dailyGoalHours={props.dailyGoalHours} onStartFocus={onStartFocus} /><MobileQuickStats
  courseCount={props.courses.length}
  noteCount={props.notes.length}
  favoriteCount={favoriteCount}
  onOpenCourses={() => document.getElementById("mobile-course-library")?.scrollIntoView({ behavior: "smooth", block: "start" })}
  onOpenAllNotes={onOpenAllNotes}
  onOpenFavorites={onOpenFavorites}
/><MobileMomentumAndActivity notes={props.notes} todayFocusSeconds={props.todayFocusSeconds} dailyGoalHours={props.dailyGoalHours} /><MobileRecentActivity notes={recentActivity} coursesById={coursesById} onOpenNote={onOpenNote} /><MobileCourseLibrary courses={props.courses} summaries={summaries} onOpenCourse={onOpenCourse} onQuickNewNote={onCreateNote} onDeleteCourse={onDeleteCourse} onAddCourse={onAddCourse} /></div></ma</div></main>;
}
