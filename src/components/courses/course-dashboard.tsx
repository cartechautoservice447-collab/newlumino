import { useState, useMemo } from "react";
import {
  FolderOpen,
  Plus,
  ArrowRight,
  Settings,
  LogOut,
  Trash2,
  Sparkles,
  BookOpen,
  Search,
  RefreshCw,
  Radio,
  Check,
  UserCheck,
  Star,
  Clock,
  Flame,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { COURSE_ACCENTS, formatDate, type Course, type CourseAccent, type Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";

const ACCENT_STYLES: Record<
  CourseAccent,
  { bg: string; border: string; text: string; glow: string; dot: string }
> = {
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
  onAddCourse: (name: string, description?: string, color?: CourseAccent, category?: string) => void;
  onDeleteCourse: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMenu?: () => void;
  onQuickNewNote?: () => void;
  onOpenNote?: (noteId: string, courseId?: string) => void;
  onOpenAllNotes?: () => void;
  onOpenFavorites?: () => void;
  onStartFocus?: () => void;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
  realtimeStatus?: "connected" | "connecting" | "offline";
  isSyncing?: boolean;
  onRefresh?: () => void;
  onOpenAuth?: () => void;
};

export function CourseDashboard({
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
  realtimeStatus = "connected",
  isSyncing = false,
  onRefresh,
  onOpenAuth,
}: Props) {
  const { user, signOut } = useAuth();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState<CourseAccent>("sky");
  const [category, setCategory] = useState("");
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const meta = user?.user_metadata as { username?: string; full_name?: string } | null;
  const name = meta?.username || meta?.full_name || user?.email?.split("@")[0] || "Student";

  // Feature 7: Time-of-Day Contextual Dynamic Greeting
  const greetingInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: `Good Morning, ${name}!`,
        subtitle: "Ready for your morning study sprint?",
        pill: "Morning Sprint ☀️",
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        greeting: `Good Afternoon, ${name}!`,
        subtitle: "Keep your study momentum going strong.",
        pill: "Deep Focus ⚡",
      };
    }
    if (hour >= 17 && hour < 22) {
      return {
        greeting: `Good Evening, ${name}!`,
        subtitle: "Review your key takeaways and active recall.",
        pill: "Evening Review 🌙",
      };
    }
    return {
      greeting: `Night Owl, ${name}!`,
      subtitle: "Late-night deep work and quiet retention.",
      pill: "Night Owl 🦉",
    };
  }, [name]);

  // Feature 1: Top 4 most recently updated notes for "Continue Studying"
  const recentNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  }, [notes]);

  // Focus calculations for Feature 2
  const goalSeconds = Math.max(60, dailyGoalHours * 3600);
  const progressPct = Math.min(100, Math.round((todayFocusSeconds / goalSeconds) * 100));
  const todayMinutes = Math.floor(todayFocusSeconds / 60);

  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ["all", ...Array.from(set)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === "all" || c.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [courses, searchQuery, selectedCategory]);

  const submit = () => {
    if (!title.trim()) return;
    haptic("success");
    onAddCourse(title, description, selectedColor, category);
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

  const totalNotes = notes.length;
  const favNotes = notes.filter((n) => n.favorite).length;

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 transition-colors duration-500">
      <div className="relative mx-auto w-full max-w-[1240px] p-3.5 sm:p-8">

        {/* Header Bar with Feature 7: Time-of-Day Contextual Dynamic Greeting */}
        <header className="glass-panel animate-panel-in flex flex-wrap items-center justify-between gap-3.5 sm:gap-5 rounded-[2rem] p-5 sm:p-8 min-h-[96px] sm:min-h-[116px] shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Brand Logo Icon Button: Clicking opens Study Tools (Zen Focus, MD Cheatsheet, Flashcards, Pomodoro) */}
            <button
              type="button"
              aria-label="Open study tools"
              onClick={() => {
                haptic("medium");
                onOpenMenu?.();
              }}
              className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/25 to-emerald-500/20 text-primary shadow-[0_0_24px_-4px_hsl(var(--primary)/0.7)] shrink-0 active:scale-90 hover:scale-105 hover:border-primary transition-all duration-200 cursor-pointer"
              title="Open Study Tools (Zen Focus, MD Cheatsheet, Flashcards, Pomodoro)"
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[1.35rem] sm:text-[1.85rem] font-bold tracking-tight text-foreground truncate">
                  {greetingInfo.greeting}
                </h1>
                <span className="hidden sm:inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-bold text-primary">
                  {greetingInfo.pill}
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-[0.92rem] text-muted-foreground truncate">
                {greetingInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Action Buttons: Settings Gear Icon on Mobile & Desktop */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Settings"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-2.5 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-foreground active:scale-95 cursor-pointer shadow-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            {user ? (
              <button
                type="button"
                aria-label="Log out"
                onClick={() => void signOut()}
                className="hidden sm:flex rounded-xl border border-white/10 bg-white/[0.05] p-2 sm:p-2.5 text-muted-foreground transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive active:scale-95 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </header>

        {/* Feature 3: Interactive Deep-Linking Stat Cards Grid */}
        <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              haptic("light");
              const el = document.getElementById("courses-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="glass-panel group rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left transition-all duration-200 hover:border-primary/40 hover:bg-white/[0.06] active:scale-[0.96] cursor-pointer shadow-sm"
            title="Jump to Courses"
          >
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/[0.06] text-primary shrink-0 transition-transform group-hover:scale-110">
              <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-wider text-muted-foreground truncate">Courses</p>
              <p className="text-base sm:text-lg font-bold text-foreground font-mono">{courses.length}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic("light");
              onOpenAllNotes?.();
            }}
            className="glass-panel group rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left transition-all duration-200 hover:border-accent/40 hover:bg-white/[0.06] active:scale-[0.96] cursor-pointer shadow-sm"
            title="View All Notes"
          >
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/[0.06] text-accent shrink-0 transition-transform group-hover:scale-110">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-wider text-muted-foreground truncate">Notes</p>
              <p className="text-base sm:text-lg font-bold text-foreground font-mono">{totalNotes}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic("light");
              onOpenFavorites?.();
            }}
            className="glass-panel group rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left transition-all duration-200 hover:border-amber-500/40 hover:bg-white/[0.06] active:scale-[0.96] cursor-pointer shadow-sm"
            title="View Favorites"
          >
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/[0.06] text-amber-400 shrink-0 transition-transform group-hover:scale-110">
              <Star className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-wider text-muted-foreground truncate">Favorites</p>
              <p className="text-base sm:text-lg font-bold text-foreground font-mono">{favNotes}</p>
            </div>
          </button>
        </div>

        {/* Mobile Feature 2: Premium Daily Focus Command Center */}
        <section className="sm:hidden mt-6 rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-white/[0.03] to-amber-500/10 p-5 shadow-[0_18px_48px_-18px_rgba(0,0,0,.65)] backdrop-blur-3xl">
          <div className="relative overflow-hidden rounded-[1.5rem]">
            <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-primary">Daily Focus</p>
                </div>
                <h3 className="mt-1 text-[1.02rem] font-bold tracking-tight text-foreground">Build today's momentum</h3>
                <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted-foreground">
                  Your live study progress toward the daily focus target.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-wider text-amber-300">
                <Flame className="h-2.5 w-2.5" /> Streak
              </span>
            </div>

            <div className="relative mt-5 flex items-center gap-4">
              <div className="relative flex h-[78px] w-[78px] shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                  <path
                    stroke="currentColor"
                    strokeWidth="2.8"
                    fill="none"
                    className="text-white/8"
                    d="M18 2.2a15.8 15.8 0 1 1 0 31.6 15.8 15.8 0 0 1 0-31.6"
                  />
                  <path
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    fill="none"
                    className="text-primary transition-all duration-700 ease-out"
                    strokeDasharray={`${progressPct},100`}
                    d="M18 2.2a15.8 15.8 0 1 1 0 31.6 15.8 15.8 0 0 1 0-31.6"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-sm font-black text-foreground">{progressPct}%</span>
                  <span className="text-[0.48rem] font-bold uppercase tracking-widest text-muted-foreground">Focused</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[1.7rem] font-black tracking-tight text-foreground">{todayMinutes}m</span>
                  <span className="text-[0.68rem] font-semibold text-muted-foreground">/ {Math.round(dailyGoalHours * 60)}m goal</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-300 to-cyan-300 shadow-[0_0_12px_rgba(78,222,163,.35)] transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(2, progressPct)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", progressPct >= 100 ? "bg-emerald-300" : "bg-cyan-300 animate-pulse")} />
                  <span className="text-[0.62rem] font-semibold text-muted-foreground">
                    {progressPct >= 100 ? "Daily target reached" : "Flow synchronized"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onStartFocus?.();
              }}
              className="relative mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-emerald-400 to-cyan-300 px-4 text-[0.82rem] font-bold text-[#022115] shadow-[0_10px_28px_-10px_rgba(78,222,163,.65)] transition-all duration-200 active:scale-[0.985]"
            >
              <Zap className="h-4 w-4" />
              <span>{progressPct >= 100 ? "Start another focus block" : "Start a focused study block"}</span>
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-[0.58rem] font-black">25m</span>
            </button>
          </div>
        </section>

        {/* Mobile Feature 1: Premium Continue Learning Shelf */}
        {recentNotes.length > 0 && (
          <section className="sm:hidden mt-7 space-y-3">
            <div className="flex items-end justify-between px-1">
              <div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-cyan-300" />
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cyan-300">Continue Learning</p>
                </div>
                <h3 className="mt-1 text-[0.95rem] font-bold tracking-tight text-foreground">Pick up where you left off</h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenAllNotes?.()}
                className="shrink-0 text-[0.62rem] font-bold text-primary transition-transform active:translate-x-0.5"
              >
                View all
              </button>
            </div>

            {(() => {
              const featured = recentNotes[0];
              const featuredCourse = courses.find((c) => c.id === featured.courseId);
              const featuredAccent = featuredCourse
                ? (ACCENT_STYLES[featuredCourse.color] ?? ACCENT_STYLES.sky)
                : ACCENT_STYLES.sky;

              return (
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    onOpenNote?.(featured.id, featured.courseId || undefined);
                  }}
                  className="glass-panel group relative w-full overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(28,36,54,.78),rgba(12,17,26,.90))] p-4 text-left shadow-[0_16px_40px_-16px_rgba(0,0,0,.75)] transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex min-w-0 max-w-[75%] items-center gap-1.5 rounded-full border ${featuredAccent.border} ${featuredAccent.bg} px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wider ${featuredAccent.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${featuredAccent.dot}`} />
                        <span className="truncate">{featuredCourse?.name || "General"}</span>
                      </span>
                      {featured.favorite ? <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" /> : <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" />}
                    </div>

                    <h4 className="mt-3 truncate text-[1rem] font-bold tracking-tight text-foreground group-active:text-cyan-200">
                      {featured.title || "Untitled Note"}
                    </h4>
                    <p className="mt-1.5 line-clamp-2 text-[0.7rem] leading-relaxed text-muted-foreground">
                      {featured.body?.replace(/[#*\`>_-]/g, "").slice(0, 110) || "Open this note to continue learning."}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-muted-foreground/80">
                        <Clock className="h-3 w-3" />
                        Edited {formatDate(featured.updatedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[0.62rem] font-bold text-cyan-300">
                        Resume <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })()}

            {recentNotes.length > 1 && (
              <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 pt-0.5 scroll-sleek">
                {recentNotes.slice(1).map((note) => {
                  const course = courses.find((c) => c.id === note.courseId);
                  const accent = course ? (ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky) : ACCENT_STYLES.sky;

                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        onOpenNote?.(note.id, note.courseId || undefined);
                      }}
                      className="glass-panel snap-start flex w-[236px] shrink-0 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 text-left shadow-sm transition-all duration-200 active:scale-[0.985]"
                    >
                      <div className="min-w-0">
                        <span className={`inline-flex max-w-full items-center gap-1 rounded-md border ${accent.border} ${accent.bg} px-2 py-0.5 text-[0.58rem] font-bold ${accent.text}`}>
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />
                          <span className="truncate">{course?.name || "General"}</span>
                        </span>
                        <h4 className="mt-2 truncate text-xs font-bold text-foreground">{note.title || "Untitled Note"}</h4>
                        <p className="mt-1 line-clamp-2 text-[0.62rem] leading-relaxed text-muted-foreground">{note.body?.replace(/[#*\`>_-]/g, "").slice(0, 76) || "No preview available."}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[0.56rem] text-muted-foreground/70">
                        <span>{formatDate(note.updatedAt)}</span>
                        <span className="font-semibold text-primary">Resume →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

19299