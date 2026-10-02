import { memo, useCallback } from "react";
import { FolderOpen, Layers, Target, Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useStableCallback } from "@/lib/use-stable-callback";

type Props = {
  currentView: "dashboard" | "workspace" | "daily-goal";
  selectedNoteId: string | null;
  // Accepted for API compatibility with the parent; the dock never rendered it.
  activeFilterKind?: "all" | "favorites" | "collection";
  notesCount: number;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
  onNavigateCourses: () => void;
  onNavigateNotes: () => void;
  onNavigateEditor: () => void;
  onNavigateDailyGoal: () => void;
  onCreateNote: () => void;
  onOpenMoreSheet: () => void;
};

type DockProps = {
  isDashboard: boolean;
  isNotesList: boolean;
  isDailyGoal: boolean;
  notesCount: number;
  progressPct: number;
  onNavigateCourses: () => void;
  onNavigateNotes: () => void;
  onNavigateDailyGoal: () => void;
  onCreateNote: () => void;
  onOpenMoreSheet: () => void;
};

function getProgressPct(todayFocusSeconds: number, dailyGoalHours: number) {
  const goalSeconds = Math.max(60, dailyGoalHours * 3600);
  return Math.min(100, Math.round((todayFocusSeconds / goalSeconds) * 100));
}

/**
 * Renders only from primitives + stable callbacks, so a ticking focus timer
 * re-renders it only when the displayed percentage actually changes.
 */
const DockView = memo(function DockView({
  isDashboard,
  isNotesList,
  isDailyGoal,
  notesCount,
  progressPct,
  onNavigateCourses,
  onNavigateNotes,
  onNavigateDailyGoal,
  onCreateNote,
  onOpenMoreSheet,
}: DockProps) {
  const handleCourses = useCallback(() => {
    haptic("light");
    onNavigateCourses();
  }, [onNavigateCourses]);

  const handleNotes = useCallback(() => {
    haptic("light");
    onNavigateNotes();
  }, [onNavigateNotes]);

  const handleCreate = useCallback(() => {
    haptic("heavy");
    onCreateNote();
  }, [onCreateNote]);

  const handleGoal = useCallback(() => {
    haptic("light");
    onNavigateDailyGoal();
  }, [onNavigateDailyGoal]);

  const handleMore = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      haptic("medium");
      onOpenMoreSheet();
    },
    [onOpenMoreSheet],
  );

  return (
    <div className="fixed bottom-[calc(0.3rem+env(safe-area-inset-bottom,0px))] inset-x-2 z-40 md:hidden select-none">
      <nav className="glass-panel relative grid grid-cols-5 items-center rounded-3xl border border-white/15 bg-black/60 px-2 py-2 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
        {/* Tab 1: Courses */}
        <button
          type="button"
          onClick={handleCourses}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2.5 transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer",
            isDashboard ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
              isDashboard
                ? "bg-primary/20 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]"
                : "bg-transparent",
            )}
          >
            <FolderOpen className="h-4 w-4" />
          </div>
          <span className="text-[0.62rem] uppercase tracking-wider font-semibold">Courses</span>
        </button>

        {/* Tab 2: Notes List */}
        <button
          type="button"
          onClick={handleNotes}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2.5 transition-all duration-200 active:scale-90 relative touch-manipulation cursor-pointer",
            isNotesList ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl transition-all relative",
              isNotesList
                ? "bg-primary/20 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]"
                : "bg-transparent",
            )}
          >
            <Layers className="h-4 w-4" />
            {notesCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground px-1 font-mono">
                {notesCount > 99 ? "99+" : notesCount}
              </span>
            ) : null}
          </div>
          <span className="text-[0.62rem] uppercase tracking-wider font-semibold">Notes</span>
        </button>

        {/* Center: FAB New Note */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            aria-label="Create note"
            onClick={handleCreate}
            className="flex h-12 w-12 items-center justify-center justify-self-center rounded-full bg-gradient-to-tr from-primary to-emerald-400 text-primary-foreground shadow-[0_8px_25px_-4px_hsl(var(--primary)/0.8)] ring-4 ring-background transition-transform duration-200 hover:scale-105 active:scale-90 touch-manipulation cursor-pointer"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Daily Study Goal */}
        <button
          type="button"
          onClick={handleGoal}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2.5 transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer",
            isDailyGoal ? "text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl transition-all relative",
              isDailyGoal
                ? "bg-amber-400/20 text-amber-400 shadow-[0_0_12px_-2px_rgba(251,191,36,0.6)]"
                : "bg-transparent",
            )}
          >
            <Target className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 text-[0.55rem] font-bold text-black px-1 font-mono">
              {progressPct}%
            </span>
          </div>
          <span className="text-[0.62rem] uppercase tracking-wider font-semibold">Goal</span>
        </button>

        {/* Tab 4: More / Quick Tools */}
        <button
          type="button"
          onClick={handleMore}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2.5 text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer relative z-10"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-transparent hover:bg-white/[0.08]">
            <MoreHorizontal className="h-4 w-4" />
          </div>
          <span className="text-[0.62rem] uppercase tracking-wider font-semibold">Tools</span>
        </button>
      </nav>
    </div>
  );
});

/**
 * Public component. Cheap shell: derives primitives, stabilises callbacks
 * (the old custom comparator ignored callbacks, so they could go stale), and
 * lets DockView skip every render where nothing visible changed.
 */
export function MobileBottomDock({
  currentView,
  selectedNoteId,
  notesCount,
  todayFocusSeconds = 0,
  dailyGoalHours = 2.0,
  onNavigateCourses,
  onNavigateNotes,
  onNavigateDailyGoal,
  onCreateNote,
  onOpenMoreSheet,
}: Props) {
  const stableCourses = useStableCallback(onNavigateCourses);
  const stableNotes = useStableCallback(onNavigateNotes);
  const stableGoal = useStableCallback(onNavigateDailyGoal);
  const stableCreate = useStableCallback(onCreateNote);
  const stableMore = useStableCallback(onOpenMoreSheet);

  return (
    <DockView
      isDashboard={currentView === "dashboard"}
      isNotesList={currentView === "workspace" && !selectedNoteId}
      isDailyGoal={currentView === "daily-goal"}
      notesCount={notesCount}
      progressPct={getProgressPct(todayFocusSeconds, dailyGoalHours)}
      onNavigateCourses={stableCourses}
      onNavigateNotes={stableNotes}
      onNavigateDailyGoal={stableGoal}
      onCreateNote={stableCreate}
      onOpenMoreSheet={stableMore}
    />
  );
}
