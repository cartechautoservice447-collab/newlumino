import React, { useState, useEffect, useRef } from "react";
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
  Brain,
  Maximize2,
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
import { useLivePomodoroTime } from "@/hooks/use-live-pomodoro-time";
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
  onOpenFlashcards: () => void;
  onOpenCheatsheet: () => void;
  onOpenExamSimulator?: () => void;
  onOpenNotePolisher?: () => void;
  onNavigateDailyGoal?: () => void;
  pomodoroRunning?: boolean;
  pomodoroTimeFormatted?: string;
  pomodoroEndAt?: number | null;
  onToggleFocus?: () => void;
  focusMode?: boolean;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
};

/**
 * Mobile Tool Icon Option Sheet:
 * Contains the Navigation Interface (Courses, Collections, All Notes, Starred, Folders)
 * as well as quick tool utilities.
 */
export function MobileMoreOptionsSheet({
  open,
  onOpenChange,
  collections = [],
  activeCourse,
  filter = { kind: "all" },
  onFilterChange,
  counts = { all: 0, favorites: 0, byCollection: {} },
  onAddCollection,
  onDeleteCollection,
  onBackToCourses,
  onOpenSettings,
  onOpenNewCourse,
  onOpenPomodoro,
  onOpenFlashcards,
  onOpenCheatsheet,
  onOpenExamSimulator,
  onOpenNotePolisher,
  onNavigateDailyGoal,
  pomodoroRunning = false,
  pomodoroTimeFormatted = "25:00",
  pomodoroEndAt = null,
  onToggleFocus,
  focusMode = false,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: Props) {
  const { settings, update } = useCustomization();
  const { user, signOut } = useAuth();

  const liveTimeLeft = useLivePomodoroTime(
    pomodoroEndAt,
    pomodoroRunning,
    Number(pomodoroTimeFormatted.split(":")[0] || 0) * 60 + Number(pomodoroTimeFormatted.split(":")[1] || 0),
    open,
  );
  const liveMinutes = Math.floor(liveTimeLeft / 60);
  const liveSeconds = liveTimeLeft % 60;
  const liveTimeFormatted = `${String(liveMinutes).padStart(2, "0")}:${String(liveSeconds).padStart(2, "0")}`;

  const [activeTab, setActiveTab] = useState<"navigation" | "tools">("navigation");
  const [newColDraft, setNewColDraft] = useState("");
  const [addingCol, setAddingCol] = useState(false);

  const [mounted, setMounted] = useState(open);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight * 0.9 : 640
  );

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragFrameRef = useRef<number | null>(null);
  const dragTargetRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  // Sync viewport height
  useEffect(() => {
    const updateHeight = () => {
      setSheetHeight(window.innerHeight * 0.9);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // When `open` prop changes
  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsDragging(false);
      setDragY(0);
    } else if (!isDragging) {
      setDragY(sheetHeight);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 340);
      return () => clearTimeout(timer);
    }
  }, [open, sheetHeight, isDragging]);

  const handleClose = () => {
    haptic("light");
    setIsDragging(false);
    setDragY(sheetHeight);
    onOpenChange(false);
    setTimeout(() => {
      setMounted(false);
    }, 320);
  };

  const handleCommitCollection = () => {
    if (!newColDraft.trim() || !onAddCollection) return;
    haptic("success");
    onAddCollection(newColDraft.trim());
    setNewColDraft("");
    setAddingCol(false);
  };

  // Touch handlers for drag-down dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;
    const deltaX = Math.abs(touch.clientX - touchStartX.current);

    // Only allow drag-down if content is scrolled to top
    const isAtTop = !scrollRef.current || scrollRef.current.scrollTop <= 0;

    if (deltaY > 0 && deltaY > deltaX && isAtTop) {
      if (!draggingRef.current) {
        draggingRef.current = true;
        setIsDragging(true);
      }
      dragTargetRef.current = deltaY;
      if (dragFrameRef.current === null) {
        dragFrameRef.current = requestAnimationFrame(() => {
          dragFrameRef.current = null;
          const nextY = dragTargetRef.current;
          sheetRef.current?.style.setProperty("--sheet-y", `${nextY}px`);
          backdropRef.current?.style.setProperty(
            "--sheet-backdrop-opacity",
            String((Math.max(0, Math.min(1, 1 - nextY / sheetHeight))) * 0.75),
          );
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartY.current;
    const duration = Math.max(1, Date.now() - touchStartTime.current);
    const velocity = deltaY / duration;

    draggingRef.current = false;
    setIsDragging(false);

    if (deltaY > 90 || velocity > 0.35) {
      haptic("light");
      setDragY(sheetHeight);
      onOpenChange(false);
      setTimeout(() => {
        setMounted(false);
      }, 300);
    } else {
      setDragY(0);
    }
  };

  if (!mounted) return null;

  const openProgress = Math.max(0, Math.min(1, 1 - dragY / sheetHeight));
  const backdropOpacity = openProgress * 0.75;

  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalPercent = Math.min(100, Math.round((todayFocusSeconds / (dailyGoalHours * 3600)) * 100));

  return createPortal(
    <div className="fixed inset-0 z-50 select-none md:hidden overflow-hidden pointer-events-auto">
      {/* Dynamic Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        style={{
          opacity: "var(--sheet-backdrop-opacity, 0)",
          ["--sheet-backdrop-opacity" as string]: String(backdropOpacity),
          transition: isDragging ? "none" : "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="absolute inset-0 bg-black backdrop-blur-md cursor-pointer"
      />

      {/* Bottom Sheet Container */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          height: `${sheetHeight}px`,
          transform: "translate3d(0, var(--sheet-y, 0px), 0)",
          ["--sheet-y" as string]: `${dragY}px`,
          transition: isDragging
            ? "none"
            : "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="glass-panel absolute inset-x-0 bottom-0 flex flex-col rounded-t-[2.25rem] border-t border-x border-white/20 bg-black/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 overflow-hidden will-change-transform"
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
                  <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-white/10 font-bold">
                    {counts.all}
                  </span>
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
                  <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-white/10 font-bold">
                    {counts.favorites}
                  </span>
                </button>
              </div>

              {/* Collections & Folders Section */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground/80 font-bold flex items-center gap-1.5">
                    <FolderClosed className="h-3.5 w-3.5 text-primary" />
                    <span>Folders &amp; Modules</span>
                  </span>

                  {!addingCol ? (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setAddingCol(true);
                      }}
                      className="flex items-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-2 py-1 text-[0.68rem] text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer font-medium"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                      <span>New Folder</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={newColDraft}
                        onChange={(e) => setNewColDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCommitCollection();
                          if (e.key === "Escape") setAddingCol(false);
                        }}
                        placeholder="Folder name..."
                        className="rounded-lg border border-primary/40 bg-white/[0.08] px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none w-32"
                      />
                      <button
                        type="button"
                        onClick={handleCommitCollection}
                        className="rounded-lg bg-primary p-1 text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingCol(false)}
                        className="rounded-lg bg-white/10 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Collections List */}
                <div className="space-y-1">
                  {collections.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground/60 italic rounded-2xl border border-white/5 bg-white/[0.02]">
                      No custom folders created yet.
                    </div>
                  ) : (
                    collections.map((col) => {
                      const isActive = filter.kind === "collection" && filter.id === col.id;
                      const count = counts.byCollection[col.id] || 0;

                      return (
                        <div
                          key={col.id}
                          className={cn(
                            "group flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 transition-all duration-200 select-none",
                            isActive
                              ? "border-primary/50 bg-primary/15 text-foreground font-medium shadow-sm"
                              : "border-white/5 bg-white/[0.02] text-muted-foreground hover:border-white/10 hover:bg-white/[0.05]"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              haptic("light");
                              if (onFilterChange) onFilterChange({ kind: "collection", id: col.id });
                              handleClose();
                            }}
                            className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <FolderClosed className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                            <span className="text-xs font-semibold truncate">{col.name}</span>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-white/10 font-bold">
                              {count}
                            </span>

                            {onDeleteCollection && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  haptic("warning");
                                  onDeleteCollection(col.id);
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
                    })
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
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  handleClose();
                  onOpenPomodoro();
                }}
                className={cn(
                  "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                  "hover:border-primary/40 hover:bg-white/[0.06]",
                  "active:scale-[0.96] active:translate-y-1 active:bg-primary/20 active:shadow-[inset_0_3px_12px_rgba(0,0,0,0.5)] active:border-primary/50",
                  pomodoroRunning
                    ? "border-primary/40 bg-primary/10 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 group-active:scale-90",
                      pomodoroRunning
                        ? "border-primary/50 bg-primary/20 text-primary animate-pulse"
                        : "border-primary/30 bg-primary/15 text-primary"
                    )}
                  >
                    <Clock className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        Pomodoro &amp; Soundscape
                      </h4>
                      {pomodoroRunning && (
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
                    {liveTimeFormatted}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1" />
                </div>
              </button>

              {/* Option 2: Active Recall & Flashcards */}
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  handleClose();
                  onOpenFlashcards();
                }}
                className={cn(
                  "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                  "border-purple-500/20 bg-purple-500/10 hover:border-purple-500/40 hover:bg-purple-500/15",
                  "active:scale-[0.96] active:translate-y-1 active:bg-purple-500/25 active:shadow-[inset_0_3px_12px_rgba(0,0,0,0.5)] active:border-purple-400/60"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/20 text-purple-300 transition-all duration-200 group-active:scale-90">
                    <Brain className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        Active Recall &amp; Flashcards
                      </h4>
                      <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-purple-300">
                        AI ✨
                      </span>
                    </div>
                    <p className="text-[0.68rem] text-muted-foreground truncate">
                      FSRS spaced repetition • Note verification
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-purple-300/70 transition-transform group-active:translate-x-1 shrink-0" />
              </button>

              {/* Option 3: Zen Focus Mode */}
              {onToggleFocus && (
                <button
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    handleClose();
                    onToggleFocus();
                  }}
                  className={cn(
                    "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                    "hover:border-emerald-500/40 hover:bg-white/[0.06]",
                    "active:scale-[0.96] active:translate-y-1 active:bg-emerald-500/20 active:shadow-[inset_0_3px_12px_rgba(0,0,0,0.5)] active:border-emerald-500/50",
                    focusMode
                      ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_14px_-4px_rgba(16,185,129,0.3)]"
                      : "border-white/10 bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 group-active:scale-90",
                        focusMode
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                          : "border-white/10 bg-white/[0.05] text-muted-foreground"
                      )}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          Zen Focus Canvas
                        </h4>
                        {focusMode && (
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-emerald-400">
                            ON
                          </span>
                        )}
                      </div>
                      <p className="text-[0.68rem] text-muted-foreground truncate">
                        Distraction-free edge-to-edge writing
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
                      focusMode ? "bg-emerald-500" : "bg-white/15"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                        focusMode ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </div>
                </button>
              )}

              {/* Option 4: Daily Goal & Analytics */}
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
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    haptic("warning");
                    handleClose();
                    void signOut();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out ({user.email?.split("@")[0] || "Account"})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
