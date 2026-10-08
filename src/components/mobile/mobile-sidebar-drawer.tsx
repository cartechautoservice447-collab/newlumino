import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  Sliders,
  Sparkles,
  Clock,
  Brain,
  Target,
  FileText,
  FolderPlus,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Flame,
  X,
  Search,
  BookOpen,
  Star,
  Layers,
  Wand2,
} from "lucide-react";
import { useCustomization } from "@/context/customization-context";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import type { Note } from "@/lib/notes";

interface MobileSidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
  onOpenNewCourse?: () => void;
  onOpenCourses?: () => void;
  onOpenAllNotes?: () => void;
  onOpenFavorites?: () => void;
  onOpenNote?: (noteId: string, courseId?: string) => void;
  notes?: Note[];
  onOpenPomodoro?: () => void;
  onOpenFlashcards?: () => void;
  onOpenCheatsheet?: () => void;
  onNavigateDailyGoal?: () => void;
  onOpenExamSimulator?: () => void;
  onOpenNotePolisher?: () => void;
  onOpenAiExplain?: () => void;
  onOpenCollectionExam?: () => void;
  pomodoroRunning?: boolean;
  pomodoroTimeFormatted?: string;
  onToggleFocus?: () => void;
  focusMode?: boolean;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
}

/**
 * Mobile Left-to-Right Swipe Drawer:
 * DEDICATED EXCLUSIVELY TO STUDY TOOLS SUITE.
 * Swiping left-to-right side ONLY shows this study tools interface.
 */
export function MobileSidebarDrawer({
  open,
  onOpenChange,
  onOpenSettings,
  onOpenNewCourse,
  onOpenCourses,
  onOpenAllNotes,
  onOpenFavorites,
  onOpenNote,
  notes = [],
  onOpenPomodoro,
  onOpenFlashcards,
  onOpenCheatsheet,
  onNavigateDailyGoal,
  onOpenExamSimulator,
  onOpenNotePolisher,
  onOpenAiExplain,
  onOpenCollectionExam,
  pomodoroRunning = false,
  pomodoroTimeFormatted = "25:00",
  onToggleFocus,
  focusMode = false,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: MobileSidebarDrawerProps) {
  const { settings, update } = useCustomization();
  const { user, signOut } = useAuth();

  const [mounted, setMounted] = useState(open);
  const [isDragging, setIsDragging] = useState(false);
  
  // Drawer width in pixels (88vw capped at 330px)
  const [drawerWidth, setDrawerWidth] = useState(
    typeof window !== "undefined" ? Math.min(330, window.innerWidth * 0.88) : 310
  );

  // dragX: 0 = fully closed (hidden left), drawerWidth = fully open
  const [dragX, setDragX] = useState(open ? drawerWidth : 0);

  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const currentDragMode = useRef<"left-to-right-open" | "right-to-left-close" | null>(null);

  // Sync drawer width on resize
  useEffect(() => {
    const updateWidth = () => {
      const w = Math.min(330, window.innerWidth * 0.88);
      setDrawerWidth(w);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // When `open` prop changes programmatically
  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsDragging(false);
      setDragX(drawerWidth);
    } else if (!isDragging) {
      // Animate out to left
      setDragX(0);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 340);
      return () => clearTimeout(timer);
    }
  }, [open, drawerWidth, isDragging]);

  // Global left-edge touch listener for "Swipe from left to right to open Study Tools"
  useEffect(() => {
    let trackingGesture = false;

    const handleWindowTouchStart = (e: TouchEvent) => {
      if (open || e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Do not engage left-edge swipe if touch is in the bottom dock area (bottom 95px)
      if (touch.clientY >= window.innerHeight - 95) return;
      // Do not engage left-edge swipe if touch is in the very top system bar area
      if (touch.clientY <= 15) return;

      // Detect touch starting strictly near the left edge of the screen (left 35px)
      if (touch.clientX <= 35) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        touchStartTime.current = Date.now();
        trackingGesture = true;
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!trackingGesture || open || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current; // positive = moving RIGHT
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Only engage if clear rightward horizontal swipe
      if (deltaX > 24 && deltaX > deltaY * 2.2) {
        currentDragMode.current = "left-to-right-open";
        setIsDragging(true);
        setMounted(true);

        // Position drawer in real time tracking the finger
        const currentX = Math.max(0, Math.min(drawerWidth, deltaX));
        setDragX(currentX);
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (!trackingGesture) return;
      trackingGesture = false;

      if (currentDragMode.current === "left-to-right-open") {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX.current;
        const duration = Math.max(1, Date.now() - touchStartTime.current);
        const velocity = deltaX / duration; // px/ms

        setIsDragging(false);
        currentDragMode.current = null;

        // If swiped right past 70px or flick velocity > 0.35
        if (deltaX > 70 || velocity > 0.35) {
          haptic("medium");
          setDragX(drawerWidth);
          onOpenChange(true);
        } else {
          // Snap back closed to left
          setDragX(0);
          setTimeout(() => {
            setMounted(false);
          }, 300);
        }
      }
    };

    window.addEventListener("touchstart", handleWindowTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", handleWindowTouchMove, { capture: true, passive: true });
    window.addEventListener("touchend", handleWindowTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", handleWindowTouchEnd, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", handleWindowTouchStart, { capture: true });
      window.removeEventListener("touchmove", handleWindowTouchMove, { capture: true });
      window.removeEventListener("touchend", handleWindowTouchEnd, { capture: true });
      window.removeEventListener("touchcancel", handleWindowTouchEnd, { capture: true });
    };
  }, [open, drawerWidth, onOpenChange]);

  // Touch handlers on the opened drawer for "Swipe left to close"
  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    currentDragMode.current = "right-to-left-close";
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (currentDragMode.current !== "right-to-left-close" || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current; // negative = moving LEFT
    const deltaY = Math.abs(touch.clientY - touchStartY.current);

    // Only engage horizontal drag-to-close if moving left and horizontal delta clearly dominates vertical
    if (deltaX < -24 && Math.abs(deltaX) > deltaY * 2.2) {
      setIsDragging(true);
      // Drawer follows finger to the left in real time
      const currentX = Math.max(0, Math.min(drawerWidth, drawerWidth + deltaX));
      setDragX(currentX);
    }
  };

  const handleDrawerTouchEnd = (e: React.TouchEvent) => {
    if (currentDragMode.current !== "right-to-left-close") return;
    currentDragMode.current = null;

    if (isDragging) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const duration = Math.max(1, Date.now() - touchStartTime.current);
      const velocity = Math.abs(deltaX) / duration;

      setIsDragging(false);

      // If dragged left past 75px or flicked left
      if (deltaX < -75 || (deltaX < -20 && velocity > 0.35)) {
        haptic("light");
        setDragX(0);
        onOpenChange(false);
        setTimeout(() => {
          setMounted(false);
        }, 300);
      } else {
        // Snap back to fully open
        setDragX(drawerWidth);
      }
    }
  };

  const handleClose = () => {
    haptic("light");
    setIsDragging(false);
    setDragX(0);
    onOpenChange(false);
    setTimeout(() => {
      setMounted(false);
    }, 320);
  };

  if (!mounted) return null;
  // Command palette state: search the entire study surface from one place.
  const [commandQuery, setCommandQuery] = useState("");

  const closeThen = (action?: () => void) => {
    haptic("light");
    handleClose();
    window.setTimeout(() => action?.(), 220);
  };

  const continueNotes = notes.filter((note) => note.title || note.body).slice(0, 2);
  const commandItems = [
    { id: "focus", label: "Start focus", hint: pomodoroRunning ? "Resume live timer" : "Open focus cockpit", icon: Zap, action: onOpenPomodoro },
    { id: "flashcards", label: "Study flashcards", hint: "Spaced repetition", icon: Brain, action: onOpenFlashcards },
    { id: "ai-explain", label: "Learning Lab", hint: "Explain concepts with AI", icon: Sparkles, action: onOpenAiExplain },
    { id: "exam", label: "Exam review", hint: "Timed diagnostic drill", icon: Target, action: onOpenExamSimulator },
    { id: "polish", label: "Note polish", hint: "Improve notes & debug code", icon: Wand2, action: onOpenNotePolisher },
    { id: "daily-goal", label: "Daily Study Goal", hint: Math.round(goalPercent) + "% of target", icon: Flame, action: onNavigateDailyGoal },
    { id: "all-notes", label: "Recent notes", hint: "Open your notes workspace", icon: BookOpen, action: onOpenAllNotes },
    { id: "favorites", label: "Favorites", hint: "Open saved notes", icon: Star, action: onOpenFavorites },
    { id: "new-course", label: "New course", hint: "Create a course", icon: FolderPlus, action: onOpenNewCourse },
    { id: "settings", label: "Settings", hint: "Customize NewLumino", icon: Sliders, action: onOpenSettings },
  ].filter((item) => typeof item.action === "function");

  const normalizedQuery = commandQuery.trim().toLowerCase();
  const filteredCommands = normalizedQuery
    ? commandItems.filter((item) => (item.label + " " + item.hint).toLowerCase().includes(normalizedQuery))
    : commandItems.slice(0, 6);

  return createPortal(
    <div className="fixed inset-0 z-50 select-none md:hidden overflow-hidden pointer-events-auto">
      <div
        onClick={handleClose}
        style={{
          opacity: backdropOpacity,
          transition: isDragging ? "none" : "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <div
        ref={drawerRef}
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        onTouchCancel={handleDrawerTouchEnd}
        style={{
          width: Math.min(drawerWidth, 340),
          transform: "translate3d(" + transformOffset + "px, 0, 0)",
          transition: isDragging ? "none" : "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="glass-panel absolute inset-y-0 left-0 flex flex-col overflow-hidden rounded-r-[2rem] border-r border-y border-white/15 bg-transparent shadow-2xl backdrop-blur-3xl"
      >
        <div className="absolute right-1 top-1/2 -translate-y-1/2 h-14 w-1 rounded-full bg-white/25 pointer-events-none" />

        <header className="shrink-0 border-b border-white/[0.08] bg-white/[0.02] px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Zap className="h-4.5 w-4.5 text-amber-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary/80">Study Command Center</p>
              <h2 className="truncate text-sm font-extrabold tracking-tight text-foreground">Everything for your next study block</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close Study Command Center"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-muted-foreground transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75" />
            <input
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Search or command..."
              aria-label="Search or command"
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.045] pl-9 pr-3 text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground/65 focus:border-primary/30 focus:bg-white/[0.06]"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-sleek px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {!normalizedQuery && continueNotes.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[9px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Continue</h3>
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>

              {continueNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    if (!onOpenNote) return;
                    closeThen(() => onOpenNote(note.id, note.courseId || undefined));
                  }}
                  className="group glass-panel w-full rounded-2xl border border-white/[0.09] bg-white/[0.025] p-3.5 text-left transition active:scale-[0.985]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-extrabold text-foreground">{note.title || "Untitled note"}</p>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{note.body?.replace(/\s+/g, " ").trim() || "Open this note and continue studying."}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-active:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </section>
          )}

          {!normalizedQuery && (
            <>
              <section className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Next best action</h3>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                </div>

                <button
                  type="button"
                  onClick={() => closeThen(onOpenAiExplain)}
                  className="glass-panel group flex w-full items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-3.5 text-left transition active:scale-[0.985]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-200">
                    <Brain className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold text-foreground">Review weak concepts</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Open Learning Lab and turn weak areas into a focused review.</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-violet-200/70" />
                </button>
              </section>

              <section className="mt-5 space-y-2.5">
                <h3 className="text-[9px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Study queue</h3>
                {[
                  { label: "Flashcards", time: "7 min", icon: Brain, action: onOpenFlashcards },
                  { label: "Exam review", time: "12 min", icon: Target, action: onOpenExamSimulator },
                  { label: "Note polish", time: "5 min", icon: Wand2, action: onOpenNotePolisher },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={!item.action}
                    onClick={() => closeThen(item.action)}
                    className="glass-panel flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-left transition active:scale-[0.985] disabled:opacity-45"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-[10px] font-bold text-foreground">{item.label}</span>
                    <span className="text-[9px] font-mono font-semibold text-muted-foreground">{item.time}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  </button>
                ))}
              </section>

              <section className="mt-5 space-y-2.5">
                <h3 className="text-[9px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Explore</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Courses", icon: BookOpen, action: onOpenCourses },
                    { label: "Collections", icon: Layers, action: onOpenNewCourse },
                    { label: "Recent", icon: Clock, action: onOpenAllNotes },
                    { label: "Favorites", icon: Star, action: onOpenFavorites },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={!item.action}
                      onClick={() => closeThen(item.action)}
                      className="glass-panel flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-left transition active:scale-[0.985] disabled:opacity-45"
                    >
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-bold text-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-bold uppercase tracking-[0.17em] text-muted-foreground">AI Intelligence</h3>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary">LIVE</span>
                </div>
                <button
                  type="button"
                  disabled={!onOpenAiExplain}
                  onClick={() => closeThen(onOpenAiExplain)}
                  className="glass-panel group flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.055] p-3.5 text-left transition active:scale-[0.985] disabled:opacity-45"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold text-foreground">Learning Lab</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Ask, explain, connect, and strengthen weak concepts.</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary/70" />
                </button>
              </section>
            </>
          )}

          {normalizedQuery && (
            <section className="space-y-2">
              <div className="flex items-center justify-between px-0.5 pb-1">
                <h3 className="text-[9px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Commands</h3>
                <span className="text-[9px] font-mono text-muted-foreground/70">{filteredCommands.length}</span>
              </div>

              {filteredCommands.length > 0 ? filteredCommands.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => closeThen(item.action)}
                  className="glass-panel group flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 text-left transition active:scale-[0.985]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-extrabold text-foreground">{item.label}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.hint}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] px-4 py-8 text-center">
                  <Search className="mx-auto h-5 w-5 text-muted-foreground/45" />
                  <p className="mt-2 text-[11px] font-semibold text-foreground">No command found</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">Try “focus”, “flashcards”, “goal”, or “AI”.</p>
                </div>
              )}
            </section>
          )}

          <section className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                  <Flame className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Today</p>
                  <p className="truncate text-[10px] font-bold text-foreground">{todayMinutes}m focused · {goalPercent}% of goal</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!onNavigateDailyGoal}
                onClick={() => closeThen(onNavigateDailyGoal)}
                className="flex h-8 shrink-0 items-center gap-1 rounded-xl border border-primary/15 bg-primary/[0.07] px-2.5 text-[9px] font-bold text-primary disabled:opacity-45"
              >
                Goal
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => closeThen(onOpenNewCourse)}
              disabled={!onOpenNewCourse}
              className="glass-panel flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.025] text-[9px] font-bold text-foreground disabled:opacity-45"
            >
              <FolderPlus className="h-3.5 w-3.5 text-primary" />
              New Course
            </button>
            <button
              type="button"
              onClick={() => closeThen(onOpenSettings)}
              disabled={!onOpenSettings}
              className="glass-panel flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.025] text-[9px] font-bold text-foreground disabled:opacity-45"
            >
              <Sliders className="h-3.5 w-3.5 text-violet-300" />
              Settings
            </button>
          </div>

          {user && (
            <button
              type="button"
              onClick={() => {
                haptic("warning");
                handleClose();
                window.setTimeout(() => void signOut(), 220);
              }}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-2.5 text-[9px] font-semibold text-rose-300 transition active:scale-[0.985]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
