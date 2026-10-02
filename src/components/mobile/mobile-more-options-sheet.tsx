import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  FolderOpen,
  FolderClosed,
  Layers,
  Star,
  Plus,
  Trash2,
  ArrowLeft,
  X,
  Check,
  Zap,
  Clock,
  Target,
  FileText,
  Droplets,
  Sliders,
  FolderPlus,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useCustomization } from "@/context/customization-context";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import type { Collection, Course } from "@/lib/notes";
import type { Filter } from "@/hooks/use-notes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Navigation Interface inside Tool Option
  collections?: Collection[];
  activeCourse?: Course | null;
  filter?: Filter;
  onFilterChange?: (f: Filter) => void;
  counts?: { all: number; favorites: number; byCollection: Record<string, number> };
  onAddCollection?: (name: string, category?: string) => void;
  onDeleteCollection?: (id: string) => void;
  onBackToCourses?: () => void;
  // Tool options
  onOpenSettings: () => void;
  onOpenNewCourse: () => void;
  onOpenPomodoro: () => void;
  onOpenCheatsheet: () => void;
  onOpenExamSimulator?: () => void;
  onOpenNotePolisher?: () => void;
  onNavigateDailyGoal?: () => void;
  pomodoroRunning?: boolean;
  pomodoroTimeFormatted?: string;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
};

const SHEET_EASE = "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)";
const BACKDROP_EASE = "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)";
const OPEN_TRANSFORM = "translate3d(0, 0, 0)";
const CLOSED_TRANSFORM = "translate3d(0, 100%, 0)"; // 100% of the sheet's own height
const BACKDROP_MAX = 0.75;
const UNMOUNT_DELAY = 340;

const EMPTY_COLLECTIONS: Collection[] = [];
const DEFAULT_FILTER: Filter = { kind: "all" };
const DEFAULT_COUNTS = { all: 0, favorites: 0, byCollection: {} as Record<string, number> };

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const COUNT_BADGE = "font-mono text-xs px-2 py-0.5 rounded-lg bg-white/10 font-bold";

type FolderDraft = { adding: boolean; draft: string };

/* ------------------------------------------------------------------ */
/* New-folder control: owns its own state so typing never re-renders   */
/* the whole sheet. State is mirrored into a parent ref so it survives */
/* tab switches / close-reopen exactly like before.                    */
/* ------------------------------------------------------------------ */
const NewFolderControl = React.memo(function NewFolderControl({
  stateRef,
  onAdd,
}: {
  stateRef: { current: FolderDraft };
  onAdd?: (name: string, category?: string) => void;
}) {
  const [adding, setAddingState] = useState(stateRef.current.adding);
  const [draft, setDraftState] = useState(stateRef.current.draft);

  const setAdding = (v: boolean) => {
    stateRef.current.adding = v;
    setAddingState(v);
  };
  const setDraft = (v: string) => {
    stateRef.current.draft = v;
    setDraftState(v);
  };

  const commit = () => {
    const name = draft.trim();
    if (!name || !onAdd) return;
    haptic("success");
    onAdd(name);
    setDraft("");
    setAdding(false);
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => {
          haptic("light");
          setAdding(true);
        }}
        className="flex items-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-2 py-1 text-[0.68rem] text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer font-medium"
      >
        <Plus className="h-3 w-3 text-primary" />
        <span>New Folder</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setAdding(false);
        }}
        placeholder="Folder name..."
        className="rounded-lg border border-primary/40 bg-white/[0.08] px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none w-32"
      />
      <button
        type="button"
        onClick={commit}
        className="rounded-lg bg-primary p-1 text-primary-foreground hover:bg-primary/90 cursor-pointer"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => setAdding(false)}
        className="rounded-lg bg-white/10 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Collection row (memoized: only changed rows re-render)             */
/* ------------------------------------------------------------------ */
const CollectionRow = React.memo(function CollectionRow({
  id,
  name,
  isActive,
  count,
  onSelect,
  onDelete,
}: {
  id: Collection["id"];
  name: string;
  isActive: boolean;
  count: number;
  onSelect: (id: Collection["id"]) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 transition-all duration-200 select-none",
        isActive
          ? "border-primary/50 bg-primary/15 text-foreground font-medium shadow-sm"
          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:border-white/10 hover:bg-white/[0.05]"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(id)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
      >
        <FolderClosed className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
        <span className="text-xs font-semibold truncate">{name}</span>
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className={COUNT_BADGE}>{count}</span>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              haptic("warning");
              onDelete(id);
            }}
            title="Delete folder"
            className="p-1 rounded-lg text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-all cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Pomodoro button (the only thing that changes every second)         */
/* ------------------------------------------------------------------ */
const PomodoroButton = React.memo(function PomodoroButton({
  running,
  timeFormatted,
  todayMinutes,
  onPress,
}: {
  running: boolean;
  timeFormatted: string;
  todayMinutes: number;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
        "hover:border-primary/40 hover:bg-white/[0.06]",
        "active:scale-[0.96] active:translate-y-1 active:bg-primary/20 active:shadow-[inset_0_3px_12px_rgba(0,0,0,0.5)] active:border-primary/50",
        running
          ? "border-primary/40 bg-primary/10 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
          : "border-white/10 bg-white/[0.03]"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 group-active:scale-90",
            running
              ? "border-primary/50 bg-primary/20 text-primary animate-pulse"
              : "border-primary/30 bg-primary/15 text-primary"
          )}
        >
          <Clock className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-foreground truncate">Pomodoro &amp; Soundscape</h4>
            {running && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-emerald-400">
                Live
              </span>
            )}
          </div>
          <p className="text-[0.68rem] text-muted-foreground truncate">
            {todayMinutes}m logged • Binaural beats
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-mono text-xs font-bold text-foreground bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-lg">
          {timeFormatted}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1" />
      </div>
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Liquid glass + theme card: subscribes to the customization context */
/* itself, so settings changes don't re-render the entire sheet.      */
/* ------------------------------------------------------------------ */
const ThemeCard = React.memo(function ThemeCard() {
  const { settings, update } = useCustomization();

  return (
    <div className="glass-panel rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-400">
            <Droplets className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground truncate">Liquid Glass Physics</h4>
            <p className="text-[0.62rem] text-muted-foreground truncate">Refraction &amp; spring bounce</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic("medium");
            update({ liquidGlassEnabled: !settings.liquidGlassEnabled });
          }}
          className={cn(
            "rounded-xl px-2.5 py-1 text-[0.68rem] font-bold transition-all duration-200 cursor-pointer active:scale-90",
            settings.liquidGlassEnabled
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-white/10 bg-white/[0.05] text-muted-foreground"
          )}
        >
          {settings.liquidGlassEnabled ? "ACTIVE" : "OFF"}
        </button>
      </div>

      {/* Quick Theme Switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
        <button
          type="button"
          onClick={() => {
            haptic("light");
            update({ theme: "original" });
          }}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[0.68rem] font-medium transition-all duration-200 cursor-pointer active:scale-95",
            settings.theme === "original"
              ? "bg-white/[0.12] text-foreground font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-3 w-3 text-primary" />
          <span>Glass</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic("light");
            update({ theme: "dark" });
          }}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[0.68rem] font-medium transition-all duration-200 cursor-pointer active:scale-95",
            settings.theme === "dark"
              ? "bg-white/[0.12] text-foreground font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Moon className="h-3 w-3" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic("light");
            update({ theme: "light" });
          }}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[0.68rem] font-medium transition-all duration-200 cursor-pointer active:scale-95",
            settings.theme === "light"
              ? "bg-white/[0.12] text-foreground font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sun className="h-3 w-3 text-amber-400" />
          <span>Light</span>
        </button>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Sign-out button: owns the auth subscription                        */
/* ------------------------------------------------------------------ */
const SignOutButton = React.memo(function SignOutButton({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={() => {
        haptic("warning");
        onClose();
        void signOut();
      }}
      className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Log Out ({user.email?.split("@")[0] || "Account"})</span>
    </button>
  );
});

/**
 * Mobile Tool Icon Option Sheet:
 * Contains the Navigation Interface (Courses, Collections, All Notes, Starred, Folders)
 * as well as quick tool utilities.
 */
export const MobileMoreOptionsSheet = React.memo(function MobileMoreOptionsSheet({
  open,
  onOpenChange,
  collections = EMPTY_COLLECTIONS,
  activeCourse,
  filter = DEFAULT_FILTER,
  onFilterChange,
  counts = DEFAULT_COUNTS,
  onAddCollection,
  onDeleteCollection,
  onBackToCourses,
  onOpenSettings,
  onOpenNewCourse,
  onOpenPomodoro,
  onOpenCheatsheet,
  onOpenExamSimulator,
  onOpenNotePolisher,
  onNavigateDailyGoal,
  pomodoroRunning = false,
  pomodoroTimeFormatted = "25:00",
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: Props) {
  const [activeTab, setActiveTab] = useState<"navigation" | "tools">("navigation");

  // `rendered` keeps the sheet in the DOM while the close animation plays.
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true); // adjust during render: no extra commit
  const visible = open || rendered;

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const folderDraftRef = useRef<FolderDraft>({ adding: false, draft: "" });

  // All drag state lives in a ref: touch-moves cause zero React renders.
  const drag = useRef({
    startY: 0,
    startX: 0,
    startTime: 0,
    dragging: false,
    pendingY: 0,
    frame: null as number | null,
    height: typeof window !== "undefined" ? window.innerHeight * 0.9 : 640,
  });

  // Single, cleaned-up unmount timer (was two uncleaned timers)
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setRendered(false), UNMOUNT_DELAY);
    return () => clearTimeout(timer);
  }, [open]);

  // Sheet height: imperative, rAF-coalesced, listener only while visible
  useIsoLayoutEffect(() => {
    if (!visible) return;
    let frame: number | null = null;
    const apply = () => {
      frame = null;
      const h = window.innerHeight * 0.9;
      drag.current.height = h;
      if (sheetRef.current) sheetRef.current.style.height = `${h}px`;
    };
    apply();
    const onResize = () => {
      if (frame === null) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [visible]);

  // Cancel any pending drag frame on unmount
  useEffect(() => {
    const d = drag.current;
    return () => {
      if (d.frame !== null) cancelAnimationFrame(d.frame);
    };
  }, []);

  const handleClose = useCallback(() => {
    haptic("light");
    onOpenChange(false);
  }, [onOpenChange]);

  // ---- Touch handlers for drag-down dismiss (direct DOM writes) ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const d = drag.current;
    d.startY = touch.clientY;
    d.startX = touch.clientX;
    d.startTime = Date.now();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const d = drag.current;
    const deltaY = touch.clientY - d.startY;
    if (deltaY <= 0) return;
    const deltaX = Math.abs(touch.clientX - d.startX);
    if (deltaY <= deltaX) return;

    if (!d.dragging) {
      // Only allow drag-down if content is scrolled to top (checked once, at drag start)
      const scroller = scrollRef.current;
      if (scroller && scroller.scrollTop > 0) return;
      d.dragging = true;
      if (sheetRef.current) sheetRef.current.style.transition = "none";
      if (backdropRef.current) backdropRef.current.style.transition = "none";
    }

    d.pendingY = deltaY;
    if (d.frame === null) {
      d.frame = requestAnimationFrame(() => {
        d.frame = null;
        const y = d.pendingY;
        if (sheetRef.current) sheetRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
        if (backdropRef.current) {
          const progress = Math.max(0, Math.min(1, 1 - y / d.height));
          backdropRef.current.style.opacity = String(progress * BACKDROP_MAX);
        }
      });
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const d = drag.current;
      if (d.frame !== null) {
        cancelAnimationFrame(d.frame);
        d.frame = null;
      }
      if (!d.dragging) return;
      d.dragging = false;

      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - d.startY;
      const duration = Math.max(1, Date.now() - d.startTime);
      const velocity = deltaY / duration;

      const sheet = sheetRef.current;
      const backdrop = backdropRef.current;
      if (sheet) sheet.style.transition = SHEET_EASE;
      if (backdrop) backdrop.style.transition = BACKDROP_EASE;

      if (deltaY > 90 || velocity > 0.35) {
        haptic("light");
        if (sheet) sheet.style.transform = `translate3d(0, ${d.height}px, 0)`;
        if (backdrop) backdrop.style.opacity = "0";
        onOpenChange(false);
      } else {
        if (sheet) sheet.style.transform = OPEN_TRANSFORM;
        if (backdrop) backdrop.style.opacity = String(BACKDROP_MAX);
      }
    },
    [onOpenChange]
  );

  // ---- Stable handlers for memoized children ----
  const handleSelectCollection = useCallback(
    (id: Collection["id"]) => {
      haptic("light");
      if (onFilterChange) onFilterChange({ kind: "collection", id });
      handleClose();
    },
    [onFilterChange, handleClose]
  );

  const handlePomodoro = useCallback(() => {
    haptic("medium");
    handleClose();
    onOpenPomodoro();
  }, [handleClose, onOpenPomodoro]);

  if (!visible) return null;

  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalPercent = Math.min(100, Math.round((todayFocusSeconds / (dailyGoalHours * 3600)) * 100));

  return createPortal(
    <div className="fixed inset-0 z-50 select-none md:hidden overflow-hidden pointer-events-auto">
      {/* Dynamic Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        style={{
          opacity: open ? BACKDROP_MAX : 0,
          transition: BACKDROP_EASE,
          willChange: "opacity",
        }}
        className="absolute inset-0 bg-black backdrop-blur-md cursor-pointer"
      />

      {/* Bottom Sheet Container (height is set imperatively) */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: open ? OPEN_TRANSFORM : CLOSED_TRANSFORM,
          transition: SHEET_EASE,
          willChange: "transform",
        }}
        className="glass-panel absolute inset-x-0 bottom-0 flex flex-col rounded-t-[2.25rem] border-t border-x border-white/20 bg-black/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 overflow-hidden"
      >
        {/* Top Grab Zone & Header */}
        <div className="flex flex-col items-center pt-3 pb-2.5 px-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          {/* Tactile Pull Pill */}
          <div className="h-1.5 w-12 rounded-full bg-white/30 active:bg-primary/60 transition-all mb-2" />

          {/* Dual Segment Switcher: Navigation Interface vs Quick Tools */}
          <div className="flex items-center justify-between w-full gap-2">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 flex-1">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setActiveTab("navigation");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation",
                  activeTab === "navigation"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Navigation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setActiveTab("tools");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation",
                  activeTab === "tools"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                <span>Quick Tools</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scroll-sleek overscroll-contain p-3.5 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] space-y-3"
        >
          {/* TAB 1: NAVIGATION INTERFACE (Applied inside the tool icon option) */}
          {activeTab === "navigation" && (
            <div className="space-y-3 animate-panel-in">
              {/* Active Course Banner */}
              {activeCourse && (
                <div className="glass-panel flex items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/20 text-primary">
                      <FolderOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        {activeCourse.name}
                      </h4>
                      <p className="text-[0.65rem] text-muted-foreground truncate">
                        {counts.all} notes in course
                      </p>
                    </div>
                  </div>

                  {onBackToCourses && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("light");
                        handleClose();
                        onBackToCourses();
                      }}
                      className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.68rem] font-semibold text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>All Courses</span>
                    </button>
                  )}
                </div>
              )}

              {/* Main Navigation Filters: All Notes & Starred */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    if (onFilterChange) onFilterChange({ kind: "all" });
                    handleClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-200 cursor-pointer active:scale-98",
                    filter.kind === "all"
                      ? "border-primary/50 bg-primary/20 text-foreground font-bold shadow-sm ring-1 ring-primary/40"
                      : "border-white/5 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className={cn("h-4 w-4", filter.kind === "all" && "text-primary")} />
                    <span className="text-xs font-semibold">All Notes</span>
                  </div>
                  <span className={COUNT_BADGE}>{counts.all}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    if (onFilterChange) onFilterChange({ kind: "favorites" });
                    handleClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-200 cursor-pointer active:scale-98",
                    filter.kind === "favorites"
                      ? "border-yellow-500/50 bg-yellow-500/20 text-foreground font-bold shadow-sm ring-1 ring-yellow-500/40"
                      : "border-white/5 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-semibold">Starred Notes</span>
                  </div>
                  <span className={COUNT_BADGE}>{counts.favorites}</span>
                </button>
              </div>

              {/* Collections & Folders Section */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground/80 font-bold flex items-center gap-1.5">
                    <FolderClosed className="h-3.5 w-3.5 text-primary" />
                    <span>Folders &amp; Modules</span>
                  </span>

                  <NewFolderControl stateRef={folderDraftRef} onAdd={onAddCollection} />
                </div>

                {/* Collections List */}
                <div className="space-y-1">
                  {collections.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground/60 italic rounded-2xl border border-white/5 bg-white/[0.02]">
                      No custom folders created yet.
                    </div>
                  ) : (
                    collections.map((col) => (
                      <CollectionRow
                        key={col.id}
                        id={col.id}
                        name={col.name}
                        isActive={filter.kind === "collection" && filter.id === col.id}
                        count={counts.byCollection[col.id] || 0}
                        onSelect={handleSelectCollection}
                        onDelete={onDeleteCollection}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* AI Intelligence Quick Navigation Card */}
              {(onOpenExamSimulator || onOpenNotePolisher) && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>AI Study Intelligence</span>
                    </span>
                    <span className="text-[0.58rem] font-mono rounded bg-primary/20 px-1 py-0.2 text-primary font-bold">
                      Gemini 3.8
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {onOpenExamSimulator && (
                      <button
                        type="button"
                        onClick={() => {
                          haptic("medium");
                          handleClose();
                          onOpenExamSimulator();
                        }}
                        className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-left hover:bg-amber-500/15 active:scale-95 transition cursor-pointer"
                      >
                        <Target className="h-4 w-4 text-amber-300 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">Exam Simulator</p>
                          <p className="text-[0.6rem] text-muted-foreground truncate">Timed mock drill</p>
                        </div>
                      </button>
                    )}

                    {onOpenNotePolisher && (
                      <button
                        type="button"
                        onClick={() => {
                          haptic("medium");
                          handleClose();
                          onOpenNotePolisher();
                        }}
                        className="flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-2.5 text-left hover:bg-cyan-500/15 active:scale-95 transition cursor-pointer"
                      >
                        <Wand2 className="h-4 w-4 text-cyan-300 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">Note Polisher</p>
                          <p className="text-[0.6rem] text-muted-foreground truncate">Format &amp; debug</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUICK TOOLS UTILITIES */}
          {activeTab === "tools" && (
            <div className="space-y-2.5 animate-panel-in">
              {/* Option 1: Pomodoro & Soundscape */}
              <PomodoroButton
                running={pomodoroRunning}
                timeFormatted={pomodoroTimeFormatted}
                todayMinutes={todayMinutes}
                onPress={handlePomodoro}
              />

              {/* Option 2: Daily Goal & Analytics */}
              {onNavigateDailyGoal && (
                <button
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    handleClose();
                    onNavigateDailyGoal();
                  }}
                  className={cn(
                    "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                    "border-sky-500/20 bg-sky-500/10 hover:border-sky-500/40 hover:bg-sky-500/15",
                    "active:scale-[0.96] active:translate-y-1 active:bg-sky-500/25 active:shadow-[inset_0_3px_12px_rgba(0,0,0,0.5)] active:border-sky-400/60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/20 text-sky-400 transition-all duration-200 group-active:scale-90">
                      <Target className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          Daily Goal &amp; Analytics
                        </h4>
                        <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-sky-400 border border-sky-500/30">
                          {goalPercent}%
                        </span>
                      </div>
                      <p className="text-[0.68rem] text-muted-foreground truncate">
                        {todayMinutes}m of {dailyGoalHours * 60}m target reached
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 text-sky-400/70 transition-transform group-active:translate-x-1 shrink-0" />
                </button>
              )}

              {/* Option 5: Markdown Cheatsheet */}
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  handleClose();
                  onOpenCheatsheet();
                }}
                className={cn(
                  "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                  "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
                  "active:scale-[0.96] active:translate-y-1 active:bg-white/[0.1] active:shadow-[inset_0_3px_12px_rgba(0,0,0,0.5)] active:border-white/30"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 transition-all duration-200 group-active:scale-90">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-foreground truncate">
                      Markdown Cheatsheet
                    </h4>
                    <p className="text-[0.68rem] text-muted-foreground truncate">
                      Formatting syntax &amp; task lists
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1 shrink-0" />
              </button>

              {/* AI Study Intelligence Section: Tool #2 & Tool #5 */}
              {(onOpenExamSimulator || onOpenNotePolisher) && (
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[0.65rem] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>AI Study Intelligence</span>
                    </span>
                    <span className="text-[0.58rem] font-mono rounded bg-primary/20 px-1 py-0.2 text-primary font-bold">
                      Gemini 3.8
                    </span>
                  </div>

                  {/* AI Tool 2: Adaptive Exam Simulator & Diagnostic Drill */}
                  {onOpenExamSimulator && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("medium");
                        handleClose();
                        onOpenExamSimulator();
                      }}
                      className={cn(
                        "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                        "border-amber-500/25 bg-amber-500/10 hover:border-amber-500/50 hover:bg-amber-500/15",
                        "active:scale-[0.96] active:translate-y-1 active:bg-amber-500/25 active:border-amber-400"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-300 transition-all duration-200 group-active:scale-90 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                          <Target className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              AI Exam Simulator
                            </h4>
                            <span className="rounded-full bg-amber-500/25 px-1.5 py-0.2 text-[0.6rem] font-bold text-amber-300">
                              Diagnostic
                            </span>
                          </div>
                          <p className="text-[0.68rem] text-muted-foreground truncate">
                            Timed mock drills, scoring &amp; blindspot audit
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-amber-300/70 transition-transform group-active:translate-x-1 shrink-0" />
                    </button>
                  )}

                  {/* AI Tool 5: Note Polisher & Smart Code Debugger */}
                  {onOpenNotePolisher && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("medium");
                        handleClose();
                        onOpenNotePolisher();
                      }}
                      className={cn(
                        "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                        "border-cyan-500/25 bg-cyan-500/10 hover:border-cyan-500/50 hover:bg-cyan-500/15",
                        "active:scale-[0.96] active:translate-y-1 active:bg-cyan-500/25 active:border-cyan-400"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 transition-all duration-200 group-active:scale-90 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                          <Wand2 className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              AI Note Polisher &amp; Code
                            </h4>
                            <span className="rounded-full bg-cyan-500/25 px-1.5 py-0.2 text-[0.6rem] font-bold text-cyan-300">
                              Enhance
                            </span>
                          </div>
                          <p className="text-[0.68rem] text-muted-foreground truncate">
                            Study guide format, code debug &amp; mnemonics
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-cyan-300/70 transition-transform group-active:translate-x-1 shrink-0" />
                    </button>
                  )}
                </div>
              )}

              {/* Option 6: Liquid Glass Physics & Quick Themes */}
              <ThemeCard />

              {/* Bottom Actions: New Course & Settings */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    handleClose();
                    onOpenNewCourse();
                  }}
                  className="glass-panel flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-foreground active:scale-95 transition-all hover:bg-white/[0.08] cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-primary" />
                  <span>+ New Course</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    handleClose();
                    onOpenSettings();
                  }}
                  className="glass-panel flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-foreground active:scale-95 transition-all hover:bg-white/[0.08] cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Account Sign Out */}
              <SignOutButton onClose={handleClose} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}, MobileMoreOptionsSheetPropsAreEqual);

function MobileMoreOptionsSheetPropsAreEqual(prev: Props, next: Props) {
  return prev.open === next.open &&
  prev.collections === next.collections &&
  prev.activeCourse === next.activeCourse &&
  prev.filter === next.filter &&
  prev.counts === next.counts &&
  prev.pomodoroRunning === next.pomodoroRunning &&
  prev.pomodoroTimeFormatted === next.pomodoroTimeFormatted &&
  Math.floor((prev.todayFocusSeconds ?? 0) / 60) === Math.floor((next.todayFocusSeconds ?? 0) / 60) &&
  prev.dailyGoalHours === next.dailyGoalHours;
}