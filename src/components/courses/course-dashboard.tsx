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
import { useCustomization } from "@/context/customization-context";
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

  const { settings } = useCustomization();
  const isFluidTheme = settings.websiteTheme === "fluid-glass";

  const totalNotes = notes.length;
  const favNotes = notes.filter((n) => n.favorite).length;

  return (
    <main
      className={cn(
        "relative min-h-[100dvh] w-full overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 transition-colors duration-500",
        isFluidTheme ? "liquid-stage" : "app-backdrop"
      )}
    >
      {/* Default: grain mesh overlay */}
      {!isFluidTheme && (
        <div className="grain-overlay pointer-events-none absolute inset-0" />
      )}

      {/* Fluid Glass: 3 authentic atmospheric glow orbs */}
      {isFluidTheme && (settings.fluidOrbsEnabled ?? true) && (
        <>
          <div className="liquid-orb liquid-orb-a" aria-hidden />
          <div className="liquid-orb liquid-orb-b" aria-hidden />
          <div className="liquid-orb liquid-orb-c" aria-hidden />
        </>
      )}
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

        {/* Mobile-Only Feature 2: Daily Focus Progress Ring & Study Streak Widget */}
        <div className="sm:hidden mt-3.5 glass-panel rounded-3xl p-3.5 border border-primary/25 bg-gradient-to-br from-primary/10 via-white/[0.02] to-amber-500/10 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Progress Ring & Focus Minutes */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Circular Progress Ring */}
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <svg className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary transition-all duration-700 ease-out"
                    strokeDasharray={`${progressPct}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono text-[0.65rem] font-bold text-foreground">
                  {progressPct}%
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-foreground truncate">Today's Focus</h4>
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[0.58rem] font-bold text-amber-300 flex items-center gap-0.5">
                    <Flame className="h-2.5 w-2.5" />
                    <span>Streak</span>
                  </span>
                </div>
                <p className="text-[0.65rem] text-muted-foreground truncate mt-0.5">
                  {todayMinutes}m of {dailyGoalHours * 60}m daily goal
                </p>
              </div>
            </div>

            {/* Right: 1-Tap Quick Start Focus Button */}
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onStartFocus?.();
              }}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary/20 border border-primary/40 px-3 py-2 text-xs font-bold text-primary active:scale-90 hover:bg-primary/30 transition shadow-sm cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Start Focus</span>
            </button>
          </div>
        </div>

        {/* Mobile-Only Feature 1: "Continue Studying" / Recent Notes Shelf */}
        {recentNotes.length > 0 && (
          <div className="sm:hidden mt-4 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Continue Studying
                </h3>
              </div>
              <span className="text-[0.6rem] font-mono text-muted-foreground">
                Recent notes
              </span>
            </div>

            {/* Horizontal Swipeable Carousel */}
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scroll-sleek snap-x snap-mandatory">
              {recentNotes.map((note) => {
                const course = courses.find((c) => c.id === note.courseId);
                const accent = course ? (ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky) : ACCENT_STYLES.sky;

                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      haptic("light");
                      onOpenNote?.(note.id, note.courseId || undefined);
                    }}
                    className="glass-panel snap-start shrink-0 w-[230px] rounded-2xl p-3 border border-white/10 hover:border-primary/40 bg-white/[0.03] active:scale-[0.97] transition cursor-pointer flex flex-col justify-between select-none shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border ${accent.border} ${accent.bg} px-1.5 py-0.2 text-[0.6rem] font-bold ${accent.text} truncate max-w-[140px]`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${accent.dot} shrink-0`} />
                          <span className="truncate">{course?.name || "General"}</span>
                        </span>
                        {note.favorite && (
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-foreground truncate">
                        {note.title || "Untitled Note"}
                      </h4>

                      <p className="text-[0.65rem] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {note.body?.replace(/[#*`>_-]/g, "").slice(0, 80) || "Empty note snippet..."}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[0.6rem] text-muted-foreground/70">
                      <span>{formatDate(note.updatedAt)}</span>
                      <span className="text-primary font-medium flex items-center gap-0.5">
                        Resume <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter and Actions Bar */}
        <div id="courses-section" className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 scroll-mt-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course title or description..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-xl focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Pills and Create Button Row */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
            {categories.length > 2 ? (
              categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-white/15 text-foreground border border-white/20 shadow-sm"
                      : "text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  {cat}
                </button>
              ))
            ) : (
              <div className="text-[0.65rem] uppercase tracking-widest text-muted-foreground/40 font-bold px-1">
                Your Library
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              haptic("medium");
              setAdding(true);
            }}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Course</span>
          </button>
        </div>

        {/* MOBILE VIEW: Mobile Liquid Glass Course Cards */}
        <div className="sm:hidden mt-5 flex flex-col gap-3.5 w-full">
          {filteredCourses.map((c, i) => {
            const courseNotes = notes.filter((n) => n.courseId === c.id);
            const last = courseNotes.length > 0
              ? Math.max(...courseNotes.map((n) => n.updatedAt))
              : c.updatedAt || c.createdAt;
            const style = ACCENT_STYLES[c.color] ?? ACCENT_STYLES.sky;

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  haptic("light");
                  onOpenCourse(c.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    haptic("light");
                    onOpenCourse(c.id);
                  }
                }}
                style={{ animationDelay: `${i * 35}ms` }}
                className="glass-panel animate-panel-in group relative cursor-pointer overflow-hidden rounded-[1.75rem] p-4.5 text-left border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-3xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),0_12px_36px_0_rgba(0,0,0,0.4)] active:scale-[0.975] transition-all duration-300 select-none flex flex-col justify-between w-full"
              >
                {/* Delete course button */}
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCourse(c);
                  }}
                  className="absolute right-3.5 top-3.5 z-10 rounded-xl border border-white/10 bg-black/40 p-2 text-muted-foreground backdrop-blur-md transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/20 hover:text-destructive active:scale-90 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div>
                  <div className="flex items-start justify-between gap-3 pr-8">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${style.border} ${style.bg} ${style.text} ${style.glow} shadow-md transition-transform group-hover:scale-105 shrink-0`}
                    >
                      <FolderOpen className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-0.5 text-xs font-mono font-medium tabular-nums text-muted-foreground">
                      {courseNotes.length} {courseNotes.length === 1 ? "note" : "notes"}
                    </span>
                  </div>

                  <h3 className="mt-3 truncate text-[1.05rem] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>

                  {c.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
                      {c.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground/40 italic">
                      No description provided
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border ${style.border} ${style.bg} px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold ${style.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {c.color}
                    </span>
                    {c.category && c.category !== c.description?.slice(0, 30) && (
                      <span className="inline-block rounded-lg border border-white/5 bg-white/[0.05] px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold text-muted-foreground/80">
                        {c.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-muted-foreground/70">
                    {last ? `Edited ${formatDate(last)}` : "No notes yet"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    Open Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP VIEW: Original 3-Column Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 w-full">
          {filteredCourses.map((c, i) => {
            const courseNotes = notes.filter((n) => n.courseId === c.id);
            const last = courseNotes.length > 0
              ? Math.max(...courseNotes.map((n) => n.updatedAt))
              : c.updatedAt || c.createdAt;
            const style = ACCENT_STYLES[c.color] ?? ACCENT_STYLES.sky;

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  haptic("light");
                  onOpenCourse(c.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    haptic("light");
                    onOpenCourse(c.id);
                  }
                }}
                style={{ animationDelay: `${i * 45}ms` }}
                className="glass-panel animate-panel-in group relative cursor-pointer overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:border-white/20 hover:shadow-2xl active:scale-[0.985] select-none flex flex-col justify-between"
              >
                {/* Delete course button */}
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCourse(c);
                  }}
                  className="absolute right-3.5 top-3.5 z-10 rounded-xl border border-white/10 bg-black/40 p-2 text-muted-foreground opacity-0 backdrop-blur-md transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100 active:scale-90 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${style.border} ${style.bg} ${style.text} ${style.glow} group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <FolderOpen className="h-6 w-6" />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-mono tabular-nums text-muted-foreground">
                      {courseNotes.length} {courseNotes.length === 1 ? "note" : "notes"}
                    </span>
                  </div>

                  <h3 className="mt-4 truncate text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>

                  {c.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
                      {c.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground/40 italic">
                      No description provided
                    </p>
                  )}

                  <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border ${style.border} ${style.bg} px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold ${style.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {c.color}
                    </span>
                    {c.category && c.category !== c.description?.slice(0, 30) && (
                      <span className="inline-block rounded-lg border border-white/5 bg-white/[0.05] px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold text-muted-foreground/80">
                        {c.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3.5">
                  <span className="text-xs text-muted-foreground/70">
                    {last ? `Edited ${formatDate(last)}` : "No notes yet"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    Open Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCourses.length === 0 ? (
          <div className="mt-12 glass-panel rounded-3xl p-12 text-center max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-muted-foreground/60 mx-auto mb-4">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No courses found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery
                ? "Try a different search query."
                : "Create your first course folder to begin taking notes."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setAdding(true);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Create First Course
            </button>
          </div>
        ) : null}
      </div>

      {/* New Course Modal - Responsive Bottom Sheet on Mobile / Centered on Desktop */}
      {adding ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-md">
          <div className="glass-panel animate-panel-in w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/15 max-h-[90dvh] overflow-y-auto scroll-sleek pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-7">
            {/* Mobile Drag Indicator Pill */}
            <div className="sm:hidden mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
            
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              New Course Folder
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Creates a synchronized course in the shared backend across NewLumino and Fluid Glass Studio.
            </p>

            <div className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-[0.68rem] uppercase tracking-wider text-muted-foreground/80 mb-1.5 font-semibold">
                  Course Title
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="e.g. CS50P — Python, Biology 101, Linear Algebra"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.68rem] uppercase tracking-wider text-muted-foreground/80 mb-1.5 font-semibold">
                  Description (optional)
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="e.g. Programming in Python, lectures, and active recall notes"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.68rem] uppercase tracking-wider text-muted-foreground/80 mb-2 font-semibold">
                  Accent Color
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COURSE_ACCENTS.map((acc) => {
                    const st = ACCENT_STYLES[acc];
                    const isSelected = selectedColor === acc;
                    return (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => setSelectedColor(acc)}
                        className={`flex items-center sm:flex-col justify-center sm:justify-center gap-2 sm:gap-1.5 rounded-xl border p-2.5 sm:p-2 text-center transition ${
                          isSelected
                            ? `${st.border} ${st.bg} scale-102 sm:scale-105 shadow-md`
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className={`h-4 w-4 rounded-full ${st.dot} flex items-center justify-center shrink-0`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                        </span>
                        <span className="text-[0.68rem] sm:text-[0.6rem] capitalize text-foreground/80 font-medium">
                          {acc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[0.68rem] uppercase tracking-wider text-muted-foreground/80 mb-1.5 font-semibold">
                  Category Tag
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="e.g. Programming, Science, Design"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 sm:mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!title.trim()}
                className="rounded-xl border border-white/10 bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 touch-manipulation cursor-pointer"
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal - Responsive Sheet */}
      {deletingCourse ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-md">
          <div className="glass-panel animate-panel-in w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-destructive/20 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Delete &ldquo;{deletingCourse.name}&rdquo;?
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              This permanently removes this course folder and every note contained inside from the shared cloud database. This will also update Fluid Glass Studio in real time.
            </p>
            <div className="mt-5 sm:mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl border border-destructive/40 bg-destructive px-5 py-2.5 text-xs font-semibold text-destructive-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
