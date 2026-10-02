import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
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
  Check,
  Star,
  Clock,
  Flame,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { COURSE_ACCENTS, formatDate, type Course, type CourseAccent, type Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";
import { useMediaQuery } from "@/lib/use-media-query";
import { useStableCallback } from "@/lib/use-stable-callback";
import { MobileMomentumAndActivity } from "./mobile-momentum-and-activity";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

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

/** Tailwind's default `sm` breakpoint — keep in sync with the `sm:` classes below. */
const DESKTOP_QUERY = "(min-width: 640px)";

const MemoizedMomentum = memo(MobileMomentumAndActivity);

type Props = {
  courses: Course[];
  notes: Note[];
  onOpenCourse: (id: string) => void;
  onAddCourse: (name: string, description?: string, color?: CourseAccent, category?: string) => void;
  onDeleteCourse: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMenu?: () => void;
  // Accepted for API compatibility with the parent; the dashboard never rendered these.
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

type CourseDraft = {
  title: string;
  description: string;
  color: CourseAccent;
  category: string;
};

type CourseStat = { count: number; latest: number };

const EMPTY_DRAFT: CourseDraft = { title: "", description: "", color: "sky", category: "" };

/* -------------------------------------------------------------------------- */
/*  Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

function getProgressPct(todayFocusSeconds: number, dailyGoalHours: number) {
  const goalSeconds = Math.max(60, dailyGoalHours * 3600);
  return Math.min(100, Math.round((todayFocusSeconds / goalSeconds) * 100));
}

/**
 * One pass over the note library: per-course counts/latest edit, favourite
 * count, and the 4 most recently updated notes (stable for ties, identical to
 * a stable sort + slice(0, 4)).
 */
function summarizeNotes(notes: Note[]) {
  const stats = new Map<string, CourseStat>();
  const recent: Note[] = [];
  let favorites = 0;

  for (const note of notes) {
    if (note.favorite) favorites += 1;

    if (note.courseId) {
      const current = stats.get(note.courseId);
      if (!current) {
        stats.set(note.courseId, { count: 1, latest: note.updatedAt });
      } else {
        current.count += 1;
        current.latest = Math.max(current.latest, note.updatedAt);
      }
    }

    let i = recent.length;
    while (i > 0 && recent[i - 1].updatedAt < note.updatedAt) i -= 1;
    if (i < 4) {
      recent.splice(i, 0, note);
      if (recent.length > 4) recent.pop();
    }
  }

  return { stats, favorites, recent };
}

/* -------------------------------------------------------------------------- */
/*  Header (owns the auth subscription so auth refreshes never re-render the   */
/*  whole dashboard)                                                           */
/* -------------------------------------------------------------------------- */

const DashboardHeader = memo(function DashboardHeader({
  onOpenMenu,
  onOpenSettings,
}: {
  onOpenMenu: () => void;
  onOpenSettings: () => void;
}) {
  const { user, signOut } = useAuth();

  const meta = user?.user_metadata as { username?: string; full_name?: string } | null;
  const name = meta?.username || meta?.full_name || user?.email?.split("@")[0] || "Student";

  // Time-of-Day Contextual Dynamic Greeting
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
        subtitle: "Review your key takeaways.",
        pill: "Evening Review 🌙",
      };
    }
    return {
      greeting: `Night Owl, ${name}!`,
      subtitle: "Late-night deep work and quiet retention.",
      pill: "Night Owl 🦉",
    };
  }, [name]);

  const handleOpenMenu = useCallback(() => {
    haptic("medium");
    onOpenMenu();
  }, [onOpenMenu]);

  const handleSignOut = useCallback(() => void signOut(), [signOut]);

  return (
    <header className="glass-panel animate-panel-in flex flex-wrap items-center justify-between gap-3.5 sm:gap-5 rounded-[2rem] p-5 sm:p-8 min-h-[96px] sm:min-h-[116px] shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Brand Logo Icon Button: Opens the study tools menu */}
        <button
          type="button"
          aria-label="Open study tools"
          onClick={handleOpenMenu}
          className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/25 to-emerald-500/20 text-primary shadow-[0_0_24px_-4px_hsl(var(--primary)/0.7)] shrink-0 active:scale-90 hover:scale-105 hover:border-primary transition-all duration-200 cursor-pointer"
          title="Open Study Tools"
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
            onClick={handleSignOut}
            className="hidden sm:flex rounded-xl border border-white/10 bg-white/[0.05] p-2 sm:p-2.5 text-muted-foreground transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive active:scale-95 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </header>
  );
});

/* -------------------------------------------------------------------------- */
/*  Stat cards                                                                 */
/* -------------------------------------------------------------------------- */

const StatCard = memo(function StatCard({
  title,
  label,
  value,
  Icon,
  hoverClass,
  iconClass,
  onClick,
}: {
  title: string;
  label: string;
  value: number;
  Icon: LucideIcon;
  hoverClass: string;
  iconClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-panel group rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left transition-all duration-200 ${hoverClass} hover:bg-white/[0.06] active:scale-[0.96] cursor-pointer shadow-sm`}
      title={title}
    >
      <div
        className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/[0.06] ${iconClass} shrink-0 transition-transform group-hover:scale-110`}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-foreground font-mono">{value}</p>
      </div>
    </button>
  );
});

const StatCards = memo(function StatCards({
  courseCount,
  totalNotes,
  favNotes,
  onJumpToCourses,
  onOpenAllNotes,
  onOpenFavorites,
}: {
  courseCount: number;
  totalNotes: number;
  favNotes: number;
  onJumpToCourses: () => void;
  onOpenAllNotes: () => void;
  onOpenFavorites: () => void;
}) {
  return (
    <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4">
      <StatCard
        title="Jump to Courses"
        label="Courses"
        value={courseCount}
        Icon={FolderOpen}
        hoverClass="hover:border-primary/40"
        iconClass="text-primary"
        onClick={onJumpToCourses}
      />
      <StatCard
        title="View All Notes"
        label="Notes"
        value={totalNotes}
        Icon={BookOpen}
        hoverClass="hover:border-accent/40"
        iconClass="text-accent"
        onClick={onOpenAllNotes}
      />
      <StatCard
        title="View Favorites"
        label="Favorites"
        value={favNotes}
        Icon={Star}
        hoverClass="hover:border-amber-500/40"
        iconClass="text-amber-400"
        onClick={onOpenFavorites}
      />
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Mobile-only: Daily Focus widget                                            */
/* -------------------------------------------------------------------------- */

const FocusWidget = memo(function FocusWidget({
  progressPct,
  todayMinutes,
  dailyGoalHours,
  onStartFocus,
}: {
  progressPct: number;
  todayMinutes: number;
  dailyGoalHours: number;
  onStartFocus: () => void;
}) {
  const handleStart = useCallback(() => {
    haptic("medium");
    onStartFocus();
  }, [onStartFocus]);

  return (
    <div className="sm:hidden mt-7 glass-panel rounded-[1.75rem] p-4 border border-primary/25 bg-gradient-to-br from-primary/10 via-white/[0.02] to-amber-500/10 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Progress Ring & Focus Minutes */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
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
            <span className="absolute font-mono text-[0.68rem] font-bold text-foreground">
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
          onClick={handleStart}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary/20 border border-primary/40 px-3.5 py-2.5 text-xs font-bold text-primary active:scale-90 hover:bg-primary/30 transition shadow-sm cursor-pointer"
        >
          <Zap className="h-3.5 w-3.5 text-amber-300" />
          <span>Start Focus</span>
        </button>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Mobile-only: "Continue Studying" shelf                                     */
/* -------------------------------------------------------------------------- */

const RecentNoteCard = memo(function RecentNoteCard({
  note,
  course,
  onOpenNote,
}: {
  note: Note;
  course: Course | undefined;
  onOpenNote: (noteId: string, courseId?: string) => void;
}) {
  const accent = course ? (ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky) : ACCENT_STYLES.sky;
  const snippet = useMemo(
    () => note.body?.replace(/[#*`>_-]/g, "").slice(0, 80) || "Empty note snippet...",
    [note.body],
  );

  const handleClick = useCallback(() => {
    haptic("light");
    onOpenNote(note.id, note.courseId || undefined);
  }, [onOpenNote, note.id, note.courseId]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className="glass-panel snap-start shrink-0 w-[246px] rounded-[1.25rem] p-3.5 border border-white/10 hover:border-primary/40 bg-white/[0.03] active:scale-[0.97] transition cursor-pointer flex flex-col justify-between select-none shadow-sm"
    >
      <div>
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md border ${accent.border} ${accent.bg} px-1.5 py-0.2 text-[0.6rem] font-bold ${accent.text} truncate max-w-[140px]`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${accent.dot} shrink-0`} />
            <span className="truncate">{course?.name || "General"}</span>
          </span>
          {note.favorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
        </div>

        <h4 className="text-xs font-bold text-foreground truncate">{note.title || "Untitled Note"}</h4>

        <p className="text-[0.65rem] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{snippet}</p>
      </div>

      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[0.6rem] text-muted-foreground/70">
        <span>{formatDate(note.updatedAt)}</span>
        <span className="text-primary font-medium flex items-center gap-0.5">
          Resume <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </div>
    </div>
  );
});

const RecentNotesShelf = memo(function RecentNotesShelf({
  recentNotes,
  courseById,
  onOpenNote,
}: {
  recentNotes: Note[];
  courseById: Map<string, Course>;
  onOpenNote: (noteId: string, courseId?: string) => void;
}) {
  return (
    <div className="sm:hidden mt-7 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Continue Studying</h3>
        </div>
        <span className="text-[0.6rem] font-mono text-muted-foreground">Recent notes</span>
      </div>

      {/* Horizontal Swipeable Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 scroll-sleek snap-x snap-mandatory">
        {recentNotes.map((note) => (
          <RecentNoteCard
            key={note.id}
            note={note}
            course={note.courseId ? courseById.get(note.courseId) : undefined}
            onOpenNote={onOpenNote}
          />
        ))}
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Search + category pills + create button                                    */
/* -------------------------------------------------------------------------- */

const SearchField = memo(function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search course title or description..."
        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-xl focus:border-primary/50 focus:outline-none"
      />
    </div>
  );
});

const LibraryBar = memo(function LibraryBar({
  categories,
  selectedCategory,
  onSelectCategory,
  onCreate,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
        {categories.length > 2 ? (
          categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
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
        onClick={onCreate}
        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        <span>Create Course</span>
      </button>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Course cards                                                               */
/* -------------------------------------------------------------------------- */

type CourseCardProps = {
  course: Course;
  index: number;
  noteCount: number;
  latestNoteAt: number | undefined;
  onOpen: (id: string) => void;
  onRequestDelete: (course: Course) => void;
};

const CourseCardMobile = memo(function CourseCardMobile({
  course,
  index,
  noteCount,
  latestNoteAt,
  onOpen,
  onRequestDelete,
}: CourseCardProps) {
  const last = latestNoteAt || course.updatedAt || course.createdAt;
  const accent = ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(course.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(course.id);
        }
      }}
      style={{ animationDelay: `${index * 35}ms` }}
      className="mobile-scroll-content-visibility glass-panel animate-panel-in group relative cursor-pointer overflow-hidden rounded-[1.75rem] p-4.5 text-left border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-3xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2),0_12px_36px_0_rgba(0,0,0,0.4)] active:scale-[0.975] transition-all duration-300 select-none flex flex-col justify-between w-full"
    >
      {/* Delete course button */}
      <button
        type="button"
        aria-label={`Delete ${course.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete(course);
        }}
        className="absolute right-3.5 top-3.5 z-10 rounded-xl border border-white/10 bg-black/40 p-2 text-muted-foreground backdrop-blur-md transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/20 hover:text-destructive active:scale-90 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div>
        <div className="flex items-start justify-between gap-3 pr-8">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${accent.border} ${accent.bg} ${accent.text} ${accent.glow} shadow-md transition-transform group-hover:scale-105 shrink-0`}
          >
            <FolderOpen className="h-5 w-5" />
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-0.5 text-xs font-mono font-medium tabular-nums text-muted-foreground">
            {noteCount} {noteCount === 1 ? "note" : "notes"}
          </span>
        </div>

        <h3 className="mt-3 truncate text-[1.05rem] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {course.name}
        </h3>

        {course.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
            {course.description}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground/40 italic">No description provided</p>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border ${accent.border} ${accent.bg} px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold ${accent.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
            {course.color}
          </span>
          {course.category && course.category !== course.description?.slice(0, 30) && (
            <span className="inline-block rounded-lg border border-white/5 bg-white/[0.05] px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold text-muted-foreground/80">
              {course.category}
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
});

const CourseCardDesktop = memo(function CourseCardDesktop({
  course,
  index,
  noteCount,
  latestNoteAt,
  onOpen,
  onRequestDelete,
}: CourseCardProps) {
  const last = latestNoteAt || course.updatedAt || course.createdAt;
  const accent = ACCENT_STYLES[course.color] ?? ACCENT_STYLES.sky;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(course.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(course.id);
        }
      }}
      style={{ animationDelay: `${index * 45}ms` }}
      className="glass-panel animate-panel-in group relative cursor-pointer overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:border-white/20 hover:shadow-2xl active:scale-[0.985] select-none flex flex-col justify-between"
    >
      {/* Delete course button */}
      <button
        type="button"
        aria-label={`Delete ${course.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete(course);
        }}
        className="absolute right-3.5 top-3.5 z-10 rounded-xl border border-white/10 bg-black/40 p-2 text-muted-foreground opacity-0 backdrop-blur-md transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100 active:scale-90 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div>
        <div className="flex items-start justify-between gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${accent.border} ${accent.bg} ${accent.text} ${accent.glow} group-hover:scale-110 transition-transform shadow-lg`}
          >
            <FolderOpen className="h-6 w-6" />
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-mono tabular-nums text-muted-foreground">
            {noteCount} {noteCount === 1 ? "note" : "notes"}
          </span>
        </div>

        <h3 className="mt-4 truncate text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {course.name}
        </h3>

        {course.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
            {course.description}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground/40 italic">No description provided</p>
        )}

        <div className="mt-3.5 flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border ${accent.border} ${accent.bg} px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold ${accent.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
            {course.color}
          </span>
          {course.category && course.category !== course.description?.slice(0, 30) && (
            <span className="inline-block rounded-lg border border-white/5 bg-white/[0.05] px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] font-semibold text-muted-foreground/80">
              {course.category}
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
});

/**
 * Only the layout that matches the current breakpoint is mounted (the original
 * rendered both and hid one with CSS, doubling DOM + reconciliation work).
 */
const CourseList = memo(function CourseList({
  courses,
  courseStats,
  isDesktop,
  onOpen,
  onRequestDelete,
}: {
  courses: Course[];
  courseStats: Map<string, CourseStat>;
  isDesktop: boolean;
  onOpen: (id: string) => void;
  onRequestDelete: (course: Course) => void;
}) {
  const Card = isDesktop ? CourseCardDesktop : CourseCardMobile;

  const cards = courses.map((c, i) => {
    const stats = courseStats.get(c.id);
    return (
      <Card
        key={c.id}
        course={c}
        index={i}
        noteCount={stats?.count ?? 0}
        latestNoteAt={stats?.latest}
        onOpen={onOpen}
        onRequestDelete={onRequestDelete}
      />
    );
  });

  return isDesktop ? (
    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 w-full">{cards}</div>
  ) : (
    <div className="sm:hidden mt-5 flex flex-col gap-3.5 w-full">{cards}</div>
  );
});

const EmptyState = memo(function EmptyState({
  hasSearch,
  onCreateFirst,
}: {
  hasSearch: boolean;
  onCreateFirst: () => void;
}) {
  return (
    <div className="mt-12 glass-panel rounded-3xl p-12 text-center max-w-md mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-muted-foreground/60 mx-auto mb-4">
        <FolderOpen className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No courses found</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasSearch ? "Try a different search query." : "Create your first course folder to begin taking notes."}
      </p>
      <button
        type="button"
        onClick={onCreateFirst}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg"
      >
        <Plus className="h-4 w-4" />
        Create First Course
      </button>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Modals (form state is local so typing never re-renders the dashboard)      */
/* -------------------------------------------------------------------------- */

const NewCourseModal = memo(function NewCourseModal({
  initialDraft,
  onCancel,
  onCreate,
}: {
  initialDraft: CourseDraft;
  onCancel: (draft: CourseDraft) => void;
  onCreate: (title: string, description: string, color: CourseAccent, category: string) => void;
}) {
  const [title, setTitle] = useState(initialDraft.title);
  const [description, setDescription] = useState(initialDraft.description);
  const [selectedColor, setSelectedColor] = useState<CourseAccent>(initialDraft.color);
  const [category, setCategory] = useState(initialDraft.category);

  const submit = () => {
    if (!title.trim()) return;
    haptic("success");
    onCreate(title, description, selectedColor, category);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-md">
      <div className="glass-panel animate-panel-in w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/15 max-h-[90dvh] overflow-y-auto scroll-sleek pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-7">
        {/* Mobile Drag Indicator Pill */}
        <div className="sm:hidden mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />

        <h3 className="text-lg font-bold tracking-tight text-foreground">New Course Folder</h3>
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
              placeholder="e.g. Programming in Python, lectures, and course notes"
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
            onClick={() => onCancel({ title, description, color: selectedColor, category })}
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
  );
});

const DeleteCourseModal = memo(function DeleteCourseModal({
  course,
  onCancel,
  onConfirm,
}: {
  course: Course;
  onCancel: () => void;
  onConfirm: (course: Course) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-md">
      <div className="glass-panel animate-panel-in w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-destructive/20 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Delete &ldquo;{course.name}&rdquo;?
        </h3>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          This permanently removes this course folder and every note contained inside from the shared cloud database. This will also update Fluid Glass Studio in real time.
        </p>
        <div className="mt-5 sm:mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(course)}
            className="rounded-xl border border-destructive/40 bg-destructive px-5 py-2.5 text-xs font-semibold text-destructive-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Dashboard view                                                             */
/* -------------------------------------------------------------------------- */

type ViewProps = {
  courses: Course[];
  notes: Note[];
  todayFocusSeconds: number;
  dailyGoalHours: number;
  onOpenCourse: (id: string) => void;
  onAddCourse: (name: string, description?: string, color?: CourseAccent, category?: string) => void;
  onDeleteCourse: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onOpenNote: (noteId: string, courseId?: string) => void;
  onOpenAllNotes: () => void;
  onOpenFavorites: () => void;
  onStartFocus: () => void;
};

/**
 * Callbacks are always stable (see CourseDashboard), so they are intentionally
 * excluded. Focus time only re-renders the view when the displayed minute or
 * percentage changes.
 */
function areViewPropsEqual(prev: ViewProps, next: ViewProps) {
  return (
    prev.courses === next.courses &&
    prev.notes === next.notes &&
    prev.dailyGoalHours === next.dailyGoalHours &&
    Math.floor(prev.todayFocusSeconds / 60) === Math.floor(next.todayFocusSeconds / 60) &&
    getProgressPct(prev.todayFocusSeconds, prev.dailyGoalHours) ===
      getProgressPct(next.todayFocusSeconds, next.dailyGoalHours)
  );
}

const CourseDashboardView = memo(function CourseDashboardView({
  courses,
  notes,
  todayFocusSeconds,
  dailyGoalHours,
  onOpenCourse,
  onAddCourse,
  onDeleteCourse,
  onOpenSettings,
  onOpenMenu,
  onOpenNote,
  onOpenAllNotes,
  onOpenFavorites,
  onStartFocus,
}: ViewProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CourseDraft>(EMPTY_DRAFT);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const coursesSectionRef = useRef<HTMLDivElement>(null);

  // Keep typing instant: the input uses the live value, the list filters a deferred one.
  const deferredQuery = useDeferredValue(searchQuery);

  const progressPct = getProgressPct(todayFocusSeconds, dailyGoalHours);
  const todayMinutes = Math.floor(todayFocusSeconds / 60);

  const { stats: courseStats, favorites: favNotes, recent: recentNotes } = useMemo(
    () => summarizeNotes(notes),
    [notes],
  );

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c] as const)), [courses]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      if (c.category) set.add(c.category);
    }
    return ["all", ...Array.from(set)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    return courses.filter((c) => {
      const matchSearch =
        !deferredQuery ||
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q);
      const matchCat = selectedCategory === "all" || c.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [courses, deferredQuery, selectedCategory]);

  const handleJumpToCourses = useCallback(() => {
    haptic("light");
    coursesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleOpenAllNotes = useCallback(() => {
    haptic("light");
    onOpenAllNotes();
  }, [onOpenAllNotes]);

  const handleOpenFavorites = useCallback(() => {
    haptic("light");
    onOpenFavorites();
  }, [onOpenFavorites]);

  const handleOpenCourse = useCallback(
    (id: string) => {
      haptic("light");
      onOpenCourse(id);
    },
    [onOpenCourse],
  );

  const handleRequestDelete = useCallback((course: Course) => setDeletingCourse(course), []);
  const handleCancelDelete = useCallback(() => setDeletingCourse(null), []);
  const handleConfirmDelete = useCallback(
    (course: Course) => {
      haptic("warning");
      onDeleteCourse(course.id);
      setDeletingCourse(null);
    },
    [onDeleteCourse],
  );

  const handleOpenAdd = useCallback(() => {
    haptic("medium");
    setAdding(true);
  }, []);
  const handleCreateFirst = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setAdding(true);
  }, []);
  const handleCancelAdd = useCallback((nextDraft: CourseDraft) => {
    setDraft(nextDraft); // original kept the form contents when cancelled
    setAdding(false);
  }, []);
  const handleCreate = useCallback(
    (title: string, description: string, color: CourseAccent, category: string) => {
      onAddCourse(title, description, color, category);
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    },
    [onAddCourse],
  );

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 transition-colors duration-500">
      <div className="relative mx-auto w-full max-w-[1240px] p-3.5 sm:p-8">
        <DashboardHeader onOpenMenu={onOpenMenu} onOpenSettings={onOpenSettings} />

        <StatCards
          courseCount={courses.length}
          totalNotes={notes.length}
          favNotes={favNotes}
          onJumpToCourses={handleJumpToCourses}
          onOpenAllNotes={handleOpenAllNotes}
          onOpenFavorites={handleOpenFavorites}
        />

        {/* Mobile-only sections are not mounted on desktop (they were display:none before) */}
        {!isDesktop && (
          <FocusWidget
            progressPct={progressPct}
            todayMinutes={todayMinutes}
            dailyGoalHours={dailyGoalHours}
            onStartFocus={onStartFocus}
          />
        )}

        {!isDesktop && recentNotes.length > 0 && (
          <RecentNotesShelf recentNotes={recentNotes} courseById={courseById} onOpenNote={onOpenNote} />
        )}

        {!isDesktop && (
          <div className="sm:hidden mt-9 mb-3">
            <MemoizedMomentum
              notes={notes}
              todayFocusSeconds={todayFocusSeconds}
              dailyGoalHours={dailyGoalHours}
            />
          </div>
        )}

        {/* Filter and Actions Bar */}
        <div
          id="courses-section"
          ref={coursesSectionRef}
          className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 scroll-mt-6"
        >
          <SearchField value={searchQuery} onChange={setSearchQuery} />
        </div>

        <LibraryBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onCreate={handleOpenAdd}
        />

        <CourseList
          courses={filteredCourses}
          courseStats={courseStats}
          isDesktop={isDesktop}
          onOpen={handleOpenCourse}
          onRequestDelete={handleRequestDelete}
        />

        {filteredCourses.length === 0 ? (
          <EmptyState hasSearch={!!deferredQuery} onCreateFirst={handleCreateFirst} />
        ) : null}
      </div>

      {adding ? <NewCourseModal initialDraft={draft} onCancel={handleCancelAdd} onCreate={handleCreate} /> : null}

      {deletingCourse ? (
        <DeleteCourseModal course={deletingCourse} onCancel={handleCancelDelete} onConfirm={handleConfirmDelete} />
      ) : null}
    </div>
  );
}, areViewPropsEqual);

/* -------------------------------------------------------------------------- */
/*  Public component                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Thin shell: turns every parent callback into a stable function that always
 * calls the latest one (the old memo comparator ignored callbacks, so they
 * could go stale). The heavy view only re-renders when its data changes.
 */
export function CourseDashboard(props: Props) {
  const { courses, notes, todayFocusSeconds = 0, dailyGoalHours = 2 } = props;

  const onOpenCourse = useStableCallback(props.onOpenCourse);
  const onAddCourse = useStableCallback(props.onAddCourse);
  const onDeleteCourse = useStableCallback(props.onDeleteCourse);
  const onOpenSettings = useStableCallback(props.onOpenSettings);
  const onOpenMenu = useStableCallback(props.onOpenMenu);
  const onOpenNote = useStableCallback(props.onOpenNote);
  const onOpenAllNotes = useStableCallback(props.onOpenAllNotes);
  const onOpenFavorites = useStableCallback(props.onOpenFavorites);
  const onStartFocus = useStableCallback(props.onStartFocus);

  return (
    <CourseDashboardView
      courses={courses}
      notes={notes}
      todayFocusSeconds={todayFocusSeconds}
      dailyGoalHours={dailyGoalHours}
      onOpenCourse={onOpenCourse}
      onAddCourse={onAddCourse}
      onDeleteCourse={onDeleteCourse}
      onOpenSettings={onOpenSettings}
      onOpenMenu={onOpenMenu}
      onOpenNote={onOpenNote}
      onOpenAllNotes={onOpenAllNotes}
      onOpenFavorites={onOpenFavorites}
      onStartFocus={onStartFocus}
    />
  );
}
