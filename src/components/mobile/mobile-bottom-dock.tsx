import { memo } from "react";
import { FolderOpen, Layers, Target, Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type Props = {
  currentView: "dashboard" | "workspace" | "daily-goal";
  selectedNoteId: string | null;
  activeFilterKind: "all" | "favorites" | "collection";
  notesCount: number;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
  onNavigateCourses: () => void;
  onNavigateNotes: () => void;
  onNavigateEditor: () => void;
  onNavigateDailyGoal: () => void;
  onCreateNote: () => void;
  onOpenMoreSheet: () => void;
  onOpenSettings?: () => void;
};

function MobileBottomDockComponent({
  currentView,
  selectedNoteId,
  activeFilterKind,
  notesCount,
  todayFocusSeconds = 0,
  dailyGoalHours = 2.0,
  onNavigateCourses,
  onNavigateNotes,
  onNavigateEditor,
  onNavigateDailyGoal,
  onCreateNote,
  onOpenMoreSheet,
  onOpenSettings,
}: Props) {
  const isDashboard = currentView === "dashboard";
  const isDailyGoal = currentView === "daily-goal";
  const isNotesList = currentView === "workspace" && !selectedNoteId;
  const isEditor = currentView === "workspace" && !!selectedNoteId;

  const goalSeconds = Math.max(60, dailyGoalHours * 3600);
  const progressPct = Math.min(100, Math.round((todayFocusSeconds / goalSeconds) * 100));

  return (
    <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-2 sm:inset-x-3 z-40 md:hidden select-none">
      <nav className="glass-panel relative flex items-center justify-around rounded-3xl border border-white/15 bg-black/75 px-1 sm:px-2 py-2 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
        {/* Tab 1: Courses */}
        <button
          type="button"
          onClick={() => {
            haptic("light");
            onNavigateCourses();
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-1.5 sm:px-2.5 min-w-0 max-w-[70px] sm:max-w-none transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer",
            isDashboard
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
            isDashboard ? "bg-primary/20 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]" : "bg-transparent"
          )}>
            <FolderOpen className="h-4 w-4" />
          </div>
          <span className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-wider font-semibold truncate">Courses</span>
        </button>

        {/* Tab 2: Notes List */}
        <button
          type="button"
          onClick={() => {
            haptic("light");
            onNavigateNotes();
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-1.5 sm:px-2.5 min-w-0 max-w-[70px] sm:max-w-none transition-all duration-200 active:scale-90 relative touch-manipulation cursor-pointer",
            isNotesList
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl transition-all relative",
            isNotesList ? "bg-primary/20 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]" : "bg-transparent"
          )}>
            <Layers className="h-4 w-4" />
            {notesCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground px-1 font-mono">
                {notesCount > 99 ? "99+" : notesCount}
              </span>
            ) : null}
          </div>
          <span className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-wider font-semibold truncate">Notes</span>
        </button>

        {/* Center: FAB New Note */}
        <div className="relative -top-3 shrink-0">
          <button
            type="button"
            aria-label="Create note"
            onClick={() => {
              haptic("heavy");
              onCreateNote();
            }}
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-emerald-400 text-primary-foreground shadow-[0_8px_25px_-4px_hsl(var(--primary)/0.8)] ring-4 ring-background transition-transform duration-200 hover:scale-105 active:scale-90 touch-manipulation cursor-pointer"
          >
            <Plus className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Daily Study Goal */}
        <button
          type="button"
          onClick={() => {
            haptic("light");
            onNavigateDailyGoal();
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-1.5 sm:px-2.5 min-w-0 max-w-[70px] sm:max-w-none transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer",
            isDailyGoal
              ? "text-amber-400 font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl transition-all relative",
            isDailyGoal ? "bg-amber-400/20 text-amber-400 shadow-[0_0_12px_-2px_rgba(251,191,36,0.6)]" : "bg-transparent"
          )}>
            <Target className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 text-[0.55rem] font-bold text-black px-1 font-mono">
              {progressPct}%
            </span>
          </div>
          <span className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-wider font-semibold truncate">Goal</span>
        </button>

        {/* Tab 4: More / Quick Tools */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            haptic("medium");
            onOpenMoreSheet();
          }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-1.5 sm:px-2.5 min-w-0 max-w-[70px] sm:max-w-none text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer relative z-10"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-transparent hover:bg-white/[0.08]">
            <MoreHorizontal className="h-4 w-4" />
          </div>
          <span className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-wider font-semibold truncate">Tools</span>
        </button>
      </nav>
    </div>
  );
}

export const MobileBottomDock = memo(MobileBottomDockComponent);
