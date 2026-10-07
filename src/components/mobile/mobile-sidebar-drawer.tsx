import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  Sliders,
  Sparkles,
  Clock,
  Brain,
  Maximize2,
  Target,
  FileText,
  Droplets,
  FolderPlus,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Flame,
  X,
  Compass,
  Wand2,
} from "lucide-react";
import { useCustomization } from "@/context/customization-context";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface MobileSidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
  onOpenNewCourse?: () => void;
  onOpenPomodoro?: () => void;
  onOpenFlashcards?: () => void;
  onOpenCheatsheet?: () => void;
  onNavigateDailyGoal?: () => void;
  onOpenExamSimulator?: () => void;
  onOpenNotePolisher?: () => void;
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
  onOpenPomodoro,
  onOpenFlashcards,
  onOpenCheatsheet,
  onNavigateDailyGoal,
  onOpenExamSimulator,
  onOpenNotePolisher,
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

  // Open progress ratio from 0 to 1
  const openProgress = Math.max(0, Math.min(1, dragX / drawerWidth));
  const backdropOpacity = openProgress * 0.75;
  const transformOffset = dragX - drawerWidth; // from -drawerWidth (hidden) to 0 (open)

  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalPercent = Math.min(100, Math.round((todayFocusSeconds / (dailyGoalHours * 3600)) * 100));

  return createPortal(
    <div className="fixed inset-0 z-50 select-none md:hidden overflow-hidden pointer-events-auto">
      {/* Dynamic backdrop with real-time blur and opacity */}
      <div
        onClick={handleClose}
        style={{
          opacity: backdropOpacity,
          transition: isDragging ? "none" : "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="absolute inset-0 bg-black backdrop-blur-md cursor-pointer"
      />

      {/* Left-to-Right Sliding Drawer: EXCLUSIVELY STUDY TOOLS */}
      <div
        ref={drawerRef}
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        onTouchCancel={handleDrawerTouchEnd}
        style={{
          width: `${drawerWidth}px`,
          transform: `translate3d(${transformOffset}px, 0, 0)`,
          transition: isDragging
            ? "none"
            : "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="glass-panel absolute inset-y-0 left-0 flex flex-col rounded-r-3xl border-r border-y border-white/20 bg-black/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 overflow-hidden"
      >
        {/* Right edge drag pill handle indicator */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-14 rounded-full bg-white/30 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.2)]" />

        {/* Top Header: Pure Study Tools Interface */}
        <div className="flex items-center justify-between p-3.5 pb-2.5 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 text-primary border border-primary/30 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]">
              <Zap className="h-4 w-4 text-amber-300" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground leading-tight">
                Study Tools &amp; Focus
              </h2>
              <p className="text-[0.65rem] text-muted-foreground">
                MD Cheatsheet • Flashcards • Pomodoro
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer"
            aria-label="Close tools menu"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content: Study Tools Modules */}
        <div className="flex-1 overflow-y-auto scroll-sleek p-2.5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-2.5 min-h-0">
          {/* Tool 1: MD Cheatsheet */}
          {onOpenCheatsheet && (
            <button
              type="button"
              onClick={() => {
                haptic("light");
                onOpenChange(false);
                onOpenCheatsheet();
              }}
              className={cn(
                "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer",
                "border-cyan-500/20 bg-cyan-500/10 hover:border-cyan-500/40 hover:bg-cyan-500/15",
                "active:scale-[0.96] active:translate-y-0.5 active:bg-cyan-500/20 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-cyan-400/50"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 transition-all duration-200 group-active:scale-90">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-foreground truncate">
                      MD Cheatsheet
                    </h4>
                    <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[0.58rem] font-bold text-cyan-300">
                      Syntax
                    </span>
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground truncate">
                    Markdown code, tables, math &amp; task lists
                  </p>
                </div>
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-cyan-400/70 transition-transform group-active:translate-x-1 shrink-0" />
            </button>
          )}

          {/* Tool 2: Flashcards */}
          {onOpenFlashcards && (
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onOpenChange(false);
                onOpenFlashcards();
              }}
              className={cn(
                "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer",
                "border-purple-500/20 bg-purple-500/10 hover:border-purple-500/40 hover:bg-purple-500/15",
                "active:scale-[0.96] active:translate-y-0.5 active:bg-purple-500/25 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-purple-400/60"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/20 text-purple-300 transition-all duration-200 group-active:scale-90">
                  <Brain className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-foreground truncate">
                      Study Flashcards
                    </h4>
                    <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[0.58rem] font-bold text-purple-300">
                      AI ✨
                    </span>
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground truncate">
                    FSRS spaced repetition &amp; study decks
                  </p>
                </div>
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-purple-300/70 transition-transform group-active:translate-x-1 shrink-0" />
            </button>
          )}

          {/* Tool 3: Pomodoro Focus Timer */}
          {onOpenPomodoro && (
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onOpenChange(false);
                onOpenPomodoro();
              }}
              className={cn(
                "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer",
                "hover:border-primary/40 hover:bg-white/[0.06]",
                "active:scale-[0.96] active:translate-y-0.5 active:bg-primary/20 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-primary/50",
                pomodoroRunning
                  ? "border-primary/40 bg-primary/10 shadow-[0_0_14px_-4px_hsl(var(--primary)/0.3)]"
                  : "border-white/10 bg-white/[0.03]"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 group-active:scale-90",
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
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[0.58rem] font-bold text-emerald-400">
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground truncate">
                    {todayMinutes}m focused today
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-xs font-bold text-foreground bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded-lg">
                  {pomodoroTimeFormatted}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1" />
              </div>
            </button>
          )}

          {/* AI Intelligence Suite: AI Adaptive Exam Simulator (#2) & AI Note Polisher (#5) */}
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
                  onOpenChange(false);
                  onOpenExamSimulator();
                }}
                className={cn(
                  "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer",
                  "border-amber-500/25 bg-amber-500/10 hover:border-amber-500/50 hover:bg-amber-500/15",
                  "active:scale-[0.96] active:translate-y-0.5 active:bg-amber-500/25 active:border-amber-400"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-300 transition-all duration-200 group-active:scale-90 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                    <Target className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        AI Exam Simulator
                      </h4>
                      <span className="rounded-full bg-amber-500/25 px-1.5 py-0.2 text-[0.58rem] font-bold text-amber-300">
                        Diagnostic
                      </span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground truncate">
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
                  onOpenChange(false);
                  onOpenNotePolisher();
                }}
                className={cn(
                  "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer",
                  "border-cyan-500/25 bg-cyan-500/10 hover:border-cyan-500/50 hover:bg-cyan-500/15",
                  "active:scale-[0.96] active:translate-y-0.5 active:bg-cyan-500/25 active:border-cyan-400"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 transition-all duration-200 group-active:scale-90 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                    <Wand2 className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        AI Note Polisher &amp; Code
                      </h4>
                      <span className="rounded-full bg-cyan-500/25 px-1.5 py-0.2 text-[0.58rem] font-bold text-cyan-300">
                        Enhance
                      </span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground truncate">
                      Study guide format, code debug &amp; mnemonics
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-cyan-300/70 transition-transform group-active:translate-x-1 shrink-0" />
              </button>
            )}
          </div>

          {/* Option 4: Daily Goal & Analytics */}
          {onNavigateDailyGoal && (
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onOpenChange(false);
                onNavigateDailyGoal();
              }}
              className={cn(
                "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer",
                "border-sky-500/20 bg-sky-500/10 hover:border-sky-500/40 hover:bg-sky-500/15",
                "active:scale-[0.96] active:translate-y-0.5 active:bg-sky-500/25 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-sky-400/60"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/20 text-sky-400 transition-all duration-200 group-active:scale-90">
                  <Target className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-foreground truncate">
                      Daily Goal &amp; Analytics
                    </h4>
                    <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[0.58rem] font-bold text-sky-400">
                      {goalPercent}%
                    </span>
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground truncate">
                    {todayMinutes}m of {dailyGoalHours * 60}m target
                  </p>
                </div>
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-sky-400/70 transition-transform group-active:translate-x-1 shrink-0" />
            </button>
          )}

          {/* Option 5: Markdown Cheatsheet */}
          {onOpenCheatsheet && (
            <button
              type="button"
              onClick={() => {
                haptic("light");
                onOpenChange(false);
                onOpenCheatsheet();
              }}
              className={cn(
                "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer",
                "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
                "active:scale-[0.96] active:translate-y-0.5 active:bg-white/[0.1] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-white/30"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 transition-all duration-200 group-active:scale-90">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground truncate">
                    Markdown Cheatsheet
                  </h4>
                  <p className="text-[0.65rem] text-muted-foreground truncate">
                    Syntax, code &amp; task lists
                  </p>
                </div>
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1 shrink-0" />
            </button>
          )}

          {/* Option 6: Liquid Glass Physics & Quick Themes */}
          <div className="glass-panel rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-400">
                  <Droplets className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">Liquid Glass</h4>
                  <p className="text-[0.6rem] text-muted-foreground truncate">Refraction &amp; bounce</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  update({ liquidGlassEnabled: !settings.liquidGlassEnabled });
                }}
                className={cn(
                  "rounded-xl px-2 py-0.5 text-[0.65rem] font-bold transition-all duration-200 cursor-pointer active:scale-90",
                  settings.liquidGlassEnabled
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-white/10 bg-white/[0.05] text-muted-foreground"
                )}
              >
                {settings.liquidGlassEnabled ? "ACTIVE" : "OFF"}
              </button>
            </div>

            {/* Theme Selector */}
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  update({ theme: "original" });
                }}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg py-1 text-[0.65rem] font-medium transition-all cursor-pointer active:scale-95",
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
                  "flex items-center justify-center gap-1 rounded-lg py-1 text-[0.65rem] font-medium transition-all cursor-pointer active:scale-95",
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
                  "flex items-center justify-center gap-1 rounded-lg py-1 text-[0.65rem] font-medium transition-all cursor-pointer active:scale-95",
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
            {onOpenNewCourse && (
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onOpenChange(false);
                  onOpenNewCourse();
                }}
                className="glass-panel flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-xs font-bold text-foreground active:scale-95 transition-all hover:bg-white/[0.08] cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5 text-primary" />
                <span>+ Course</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onOpenChange(false);
                  onOpenSettings();
                }}
                className="glass-panel flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-xs font-bold text-foreground active:scale-95 transition-all hover:bg-white/[0.08] cursor-pointer"
              >
                <Sliders className="h-3.5 w-3.5 text-purple-400" />
                <span>Settings</span>
              </button>
            )}
          </div>

          {/* Account Sign Out */}
          {user && (
            <button
              type="button"
              onClick={() => {
                haptic("warning");
                onOpenChange(false);
                void signOut();
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out ({user.email?.split("@")[0] || "Account"})</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
