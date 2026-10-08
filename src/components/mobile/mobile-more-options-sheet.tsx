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
import type { Collection, Course, Note } from "@/lib/notes";
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
  // Smart Study Queue
  notes?: Note[];
  courses?: Course[];
  selectedNoteId?: string | null;
  onOpenNote?: (noteId: string, courseId?: string) => void;
  onOpenFlashcardsForNote?: (note: Note) => void;
  onOpenAllNotes?: () => void;
  onOpenFavorites?: () => void;
  // Tool options
  onOpenSettings: () => void;
  onOpenNewCourse: () => void;
  onOpenPomodoro: () => void;
  onOpenFlashcards: () => void;
  onOpenCheatsheet: () => void;
  onOpenExamSimulator?: () => void;
  onOpenNotePolisher?: () => void;
  onOpenAiExplain?: () => void;
  onOpenCollectionExam?: () => void;
  onNavigateDailyGoal?: () => void;
  pomodoroRunning?: boolean;
  pomodoroTimeFormatted?: string;
  onToggleFocus?: () => void;
  focusMode?: boolean;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
};

/**
 * Mobile Tool Icon Option Sheet:
 * Contains the Smart Study Queue as well as quick tool utilities.
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
  notes = [],
  courses = [],
  selectedNoteId = null,
  onOpenNote,
  onOpenFlashcardsForNote,
  onOpenAllNotes,
  onOpenFavorites,
  onOpenSettings,
  onOpenNewCourse,
  onOpenPomodoro,
  onOpenFlashcards,
  onOpenCheatsheet,
  onOpenExamSimulator,
  onOpenNotePolisher,
  onOpenAiExplain,
  onOpenCollectionExam,
  onNavigateDailyGoal,
  pomodoroRunning = false,
  pomodoroTimeFormatted = "25:00",
  onToggleFocus,
  focusMode = false,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: Props) {
  const { settings, update } = useCustomization();
  const { user, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"queue" | "tools">("queue");
  const [newColDraft, setNewColDraft] = useState("");
  const [addingCol, setAddingCol] = useState(false);

  const [mounted, setMounted] = useState(open);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  // Sync viewport height
  useEffect(() => {
    const updateHeight = () => {
      setSheetHeight(window.innerHeight);
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
      setIsDragging(true);
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartY.current;
    const duration = Math.max(1, Date.now() - touchStartTime.current);
    const velocity = deltaY / duration;

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
        onClick={handleClose}
        style={{
          opacity: backdropOpacity,
          transition: isDragging ? "none" : "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="absolute inset-0 bg-black backdrop-blur-md cursor-pointer"
      />

      {/* Bottom Sheet Container (Full height to top touch) */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          height: `${sheetHeight}px`,
          transform: `translate3d(0, ${dragY}px, 0)`,
          transition: isDragging
            ? "none"
            : "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="glass-panel absolute inset-x-0 bottom-0 top-0 h-full max-h-screen flex flex-col rounded-t-none sm:rounded-t-[2.25rem] border-t border-x border-white/20 bg-black/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 overflow-hidden"
      >
        {/* Top Grab Zone & Header with safe area padding */}
        <div className="flex flex-col items-center pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 px-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          {/* Tactile Pull Pill */}
          <div className="h-1.5 w-12 rounded-full bg-white/30 active:bg-primary/60 transition-all mb-2" />

          {/* Dual Segment Switcher: Navigation Interface vs Quick Tools */}
          <div className="flex items-center justify-between w-full gap-2">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 flex-1">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setActiveTab("queue");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation",
                  activeTab === "queue"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Target className="h-3.5 w-3.5" />
                <span>Study Queue</span>
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
          {/* TAB 1: SMART STUDY QUEUE */}
          {activeTab === "queue" && (
            <div className="space-y-3 animate-panel-in">
              {(() => {
                const now = Date.now();
                const day = 86_400_000;
                const activeCourseId = activeCourse?.id ?? null;

                const scopedNotes = activeCourseId
                  ? notes.filter((note) => {
                      if (note.courseId === activeCourseId) return true;
                      return note.collectionId
                        ? collections.some(
                            (collection) =>
                              collection.id === note.collectionId &&
                              (collection.courseId === activeCourseId || collection.parentId === activeCourseId),
                          )
                        : false;
                    })
                  : notes;

                const getCourseName = (note: Note) =>
                  courses.find((course) => course.id === note.courseId)?.name ??
                  activeCourse?.name ??
                  "Study library";

                const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

                const reviewCandidate = [...scopedNotes]
                  .filter((note) => note.id !== selectedNoteId && note.favorite && now - note.updatedAt > 2 * day)
                  .sort((a, b) => a.updatedAt - b.updatedAt)[0] ?? null;

                const unfinishedCandidate = [...scopedNotes]
                  .filter((note) => note.id !== selectedNoteId && note.body.trim().length < 180)
                  .sort((a, b) => a.body.trim().length - b.body.trim().length || b.updatedAt - a.updatedAt)[0] ?? null;

                const staleCandidate = [...scopedNotes]
                  .filter((note) => note.id !== selectedNoteId && now - note.updatedAt > 7 * day)
                  .sort((a, b) => a.updatedAt - b.updatedAt)[0] ?? null;

                const queueItems: Array<{
                  id: string;
                  kind: "continue" | "review" | "finish" | "refresh";
                  title: string;
                  subtitle: string;
                  meta: string;
                  note?: Note;
                }> = [];

                if (selectedNote) {
                  queueItems.push({
                    id: `continue-${selectedNote.id}`,
                    kind: "continue",
                    title: "Continue where you left off",
                    subtitle: selectedNote.title || "Untitled note",
                    meta: getCourseName(selectedNote),
                    note: selectedNote,
                  });
                }

                if (reviewCandidate) {
                  queueItems.push({
                    id: `review-${reviewCandidate.id}`,
                    kind: "review",
                    title: "Review a starred note",
                    subtitle: reviewCandidate.title || "Starred note",
                    meta: `Last updated ${Math.max(1, Math.floor((now - reviewCandidate.updatedAt) / day))}d ago`,
                    note: reviewCandidate,
                  });
                }

                if (unfinishedCandidate) {
                  queueItems.push({
                    id: `finish-${unfinishedCandidate.id}`,
                    kind: "finish",
                    title: "Finish an unfinished note",
                    subtitle: unfinishedCandidate.title || "Untitled note",
                    meta: `${unfinishedCandidate.body.trim().length} characters written`,
                    note: unfinishedCandidate,
                  });
                }

                if (staleCandidate && !queueItems.some((item) => item.note?.id === staleCandidate.id)) {
                  queueItems.push({
                    id: `refresh-${staleCandidate.id}`,
                    kind: "refresh",
                    title: "Refresh an older topic",
                    subtitle: staleCandidate.title || "Older study note",
                    meta: `Last touched ${Math.max(1, Math.floor((now - staleCandidate.updatedAt) / day))}d ago`,
                    note: staleCandidate,
                  });
                }

                if (queueItems.length < 3 && onToggleFocus && !focusMode) {
                  queueItems.push({
                    id: "focus-block",
                    kind: "continue",
                    title: "Start a focused study block",
                    subtitle: activeCourse?.name ?? "Your study workspace",
                    meta: `${todayMinutes}m logged today`,
                  });
                }

                const visibleQueue = queueItems.slice(0, 4);
                const queueCount = visibleQueue.length;
                const goalLabel = goalPercent >= 100 ? "Daily target complete" : `${goalPercent}% of today's goal`;

                const runQueueItem = (item: (typeof visibleQueue)[number]) => {
                  haptic(item.kind === "review" ? "medium" : "light");
                  handleClose();

                  if (item.note && onOpenNote && (item.kind === "continue" || item.kind === "finish" || item.kind === "refresh")) {
                    onOpenNote(item.note.id, item.note.courseId ?? undefined);
                    return;
                  }

                  if (item.note && item.kind === "review" && onOpenFlashcardsForNote) {
                    onOpenFlashcardsForNote(item.note);
                    return;
                  }

                  if (item.id === "focus-block" && onToggleFocus) {
                    onToggleFocus();
                  }
                };

                return (
                  <>
                    {/* Queue hero */}
                    <div className="rounded-3xl border border-primary/20 bg-primary/[0.08] p-3.5 shadow-[0_12px_40px_-24px_hsl(var(--primary)/0.55)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                              <Target className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary/80">
                                Smart Study Queue
                              </p>
                              <h3 className="mt-0.5 text-sm font-black text-foreground truncate">
                                {activeCourse?.name ?? "Your next best study actions"}
                              </h3>
                            </div>
                          </div>
                          <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-foreground">
                            {queueCount > 0
                              ? `${queueCount} prioritized action${queueCount === 1 ? "" : "s"} selected from your current study state.`
                              : "Nothing urgent. Use this space to pick your next study move."}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[0.58rem] font-bold text-primary">
                          NEXT
                        </span>
                      </div>

                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-2.5">
                        <div className="flex items-center justify-between gap-2 text-[0.62rem]">
                          <span className="font-semibold text-muted-foreground">Today's momentum</span>
                          <span className="font-mono font-bold text-foreground">{todayMinutes}m / {dailyGoalHours * 60}m</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-300"
                            style={{ width: `${goalPercent}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.58rem]">
                          <span className="text-muted-foreground">{goalLabel}</span>
                          <span className="font-mono font-bold text-primary">{queueCount} queued</span>
                        </div>
                      </div>
                    </div>

                    {/* Prioritized queue */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Up next
                        </span>
                        <span className="text-[0.58rem] text-muted-foreground/70">auto-prioritized</span>
                      </div>

                      {visibleQueue.length > 0 ? (
                        visibleQueue.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => runQueueItem(item)}
                            className={cn(
                              "group w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 cursor-pointer active:scale-[0.98]",
                              index === 0
                                ? "border-primary/30 bg-primary/[0.08] hover:bg-primary/[0.12]"
                                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                                item.kind === "continue" && "border-primary/30 bg-primary/15 text-primary",
                                item.kind === "review" && "border-amber-500/30 bg-amber-500/15 text-amber-300",
                                item.kind === "finish" && "border-cyan-500/30 bg-cyan-500/15 text-cyan-300",
                                item.kind === "refresh" && "border-violet-500/30 bg-violet-500/15 text-violet-300",
                              )}
                            >
                              {item.kind === "review" ? (
                                <Brain className="h-4 w-4" />
                              ) : item.kind === "finish" ? (
                                <Check className="h-4 w-4" />
                              ) : item.kind === "refresh" ? (
                                <Clock className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[0.72rem] font-bold text-foreground truncate">{item.title}</p>
                                {index === 0 && (
                                  <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.53rem] font-bold text-primary">
                                    NOW
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[0.66rem] text-muted-foreground truncate">{item.subtitle}</p>
                              <p className="mt-1 text-[0.57rem] text-muted-foreground/70 truncate">{item.meta}</p>
                            </div>

                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-active:translate-x-1" />
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                          <Sparkles className="mx-auto h-5 w-5 text-primary/70" />
                          <p className="mt-2 text-xs font-bold text-foreground">Queue is clear</p>
                          <p className="mt-1 text-[0.63rem] text-muted-foreground">
                            Create or open a note to give the queue something useful to prioritize.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Fast library access */}
                    <div className="space-y-2 border-t border-white/10 pt-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Library</span>
                        <span className="text-[0.58rem] text-muted-foreground/70">{notes.length} notes</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {onOpenAllNotes && (
                          <button
                            type="button"
                            onClick={() => {
                              haptic("light");
                              handleClose();
                              onOpenAllNotes();
                            }}
                            className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06] cursor-pointer"
                          >
                            <span className="text-[0.68rem] font-semibold text-foreground">All Notes</span>
                            <Layers className="h-3.5 w-3.5 text-primary" />
                          </button>
                        )}
                        {onOpenFavorites && (
                          <button
                            type="button"
                            onClick={() => {
                              haptic("light");
                              handleClose();
                              onOpenFavorites();
                            }}
                            className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06] cursor-pointer"
                          >
                            <span className="text-[0.68rem] font-semibold text-foreground">Starred</span>
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          </button>
                        )}
                        {onBackToCourses && (
                          <button
                            type="button"
                            onClick={() => {
                              haptic("light");
                              handleClose();
                              onBackToCourses();
                            }}
                            className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06] cursor-pointer"
                          >
                            <span className="text-[0.68rem] font-semibold text-foreground">Courses</span>
                            <FolderOpen className="h-3.5 w-3.5 text-primary" />
                          </button>
                        )}
                        {onNavigateDailyGoal && (
                          <button
                            type="button"
                            onClick={() => {
                              haptic("light");
                              handleClose();
                              onNavigateDailyGoal();
                            }}
                            className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06] cursor-pointer"
                          >
                            <span className="text-[0.68rem] font-semibold text-foreground">Daily Goal</span>
                            <Target className="h-3.5 w-3.5 text-amber-300" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Account / utility controls stay compact and out of the queue */}
                    <div className="grid grid-cols-2 gap-2">
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
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 2: QUICK TOOLS UTILITIES */}
          {activeTab === "tools" && (
            <div className="space-y-2.5 animate-panel-in">
              {/* Option 1: Pomodoro Focus Timer */}
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
                        Pomodoro Focus Timer
                      </h4>
                      {pomodoroRunning && (
                        <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-emerald-400">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-[0.68rem] text-muted-foreground truncate">
                      {todayMinutes}m logged today • Deep focus intervals
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-xs font-bold text-foreground bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-lg">
                    {pomodoroTimeFormatted}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1" />
                </div>
              </button>

              {/* Option 2: Flashcards */}
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
                        Study Flashcards
                      </h4>
                      <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-purple-300">
                        AI ✨
                      </span>
                    </div>
                    <p className="text-[0.68rem] text-muted-foreground truncate">
                      FSRS spaced repetition &amp; study decks
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-purple-300/70 transition-transform group-active:translate-x-1 shrink-0" />
              </button>

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

              {/* AI Study Intelligence */}
              {(onOpenExamSimulator || onOpenNotePolisher || onOpenAiExplain) && (
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

                  {/* AI Explain */}
                  {onOpenAiExplain && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("medium");
                        handleClose();
                        onOpenAiExplain();
                      }}
                      className={cn(
                        "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                        "border-violet-500/25 bg-violet-500/10 hover:border-violet-500/50 hover:bg-violet-500/15",
                        "active:scale-[0.96] active:translate-y-1 active:bg-violet-500/25 active:border-violet-400"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/20 text-violet-300 transition-all duration-200 group-active:scale-90">
                          <Brain className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-foreground truncate">AI Explain</h4>
                            <span className="rounded-full bg-violet-500/25 px-1.5 py-0.2 text-[0.6rem] font-bold text-violet-300">Tutor</span>
                          </div>
                          <p className="text-[0.68rem] text-muted-foreground truncate">Concepts, examples &amp; clear explanations</p>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-violet-300/70 transition-transform group-active:translate-x-1 shrink-0" />
                    </button>
                  )}

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

                  {/* AI Tool 3: 4-Stage Progressive Collection Exam */}
                  {onOpenCollectionExam && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("medium");
                        handleClose();
                        onOpenCollectionExam();
                      }}
                      className={cn(
                        "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-out cursor-pointer",
                        "border-emerald-500/25 bg-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/15",
                        "active:scale-[0.96] active:translate-y-1 active:bg-emerald-500/25 active:border-emerald-400"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 transition-all duration-200 group-active:scale-90 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                          <Layers className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              4-Stage Progressive Exam
                            </h4>
                            <span className="rounded-full bg-emerald-500/25 px-1.5 py-0.2 text-[0.6rem] font-bold text-emerald-300">
                              Sequential
                            </span>
                          </div>
                          <p className="text-[0.68rem] text-muted-foreground truncate">
                            Theory &rarr; Logic &rarr; Debug &rarr; Project challenge
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-emerald-300/70 transition-transform group-active:translate-x-1 shrink-0" />
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
