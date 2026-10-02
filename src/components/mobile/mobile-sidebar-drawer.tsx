import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  Sliders,
  Sparkles,
  Clock,
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
  onOpenCheatsheet?: () => void;
  onNavigateDailyGoal?: () => void;
  onOpenExamSimulator?: () => void;
  onOpenNotePolisher?: () => void;
  pomodoroRunning?: boolean;
  pomodoroTimeFormatted?: string;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
}

/**
 * Mobile Left-to-Right Swipe Drawer:
 * DEDICATED EXCLUSIVELY TO STUDY TOOLS SUITE.
 * Swiping left-to-right side ONLY shows this study tools interface.
 */
export const MobileSidebarDrawer = React.memo(function MobileSidebarDrawer({
  open,
  onOpenChange,
  onOpenSettings,
  onOpenNewCourse,
  onOpenPomodoro,
  onOpenCheatsheet,
  onNavigateDailyGoal,
  onOpenExamSimulator,
  onOpenNotePolisher,
  pomodoroRunning = false,
  pomodoroTimeFormatted = "25:00",
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: MobileSidebarDrawerProps) {
  const { settings, update } = useCustomization();
  const { user, signOut } = useAuth();

  // Tap-open drawer only. Edge-swipe and drag-to-close gestures are intentionally disabled
  // so dashboard scrolling remains on the browser compositor path.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleClose = () => {
    haptic("light");
    onOpenChange(false);
  };
  if (!mounted) return null;

  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalPercent = Math.min(100, Math.round((todayFocusSeconds / (dailyGoalHours * 3600)) * 100));

  return createPortal(
    <div className="fixed inset-0 z-50 select-none md:hidden overflow-hidden pointer-events-auto">
      {/* Lightweight backdrop; no gesture handler */}
      <div
        onClick={handleClose}
        className={cn(
          "absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Left-to-Right Sliding Drawer: EXCLUSIVELY STUDY TOOLS */}
      <div
        className={cn(
          "glass-panel absolute inset-y-0 left-0 flex w-[88vw] max-w-[330px] flex-col rounded-r-3xl border-r border-y border-white/20 bg-black/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 overflow-hidden transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Top Header: Pure Study Tools Interface */}
        <div className="flex items-center justify-between p-3.5 pb-2.5 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 text-primary border border-primary/30 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]">
              <Zap className="h-4 w-4 text-amber-300" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground leading-tight">
                Study Tools
              </h2>
              <p className="text-[0.65rem] text-muted-foreground">
                Markdown Cheatsheet • Pomodoro
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
          {/* Tool 2: MD Cheatsheet */}
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

          {/* Tool 4: Pomodoro & Soundscape */}
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
                      Pomodoro &amp; Soundscape
                    </h4>
                    {pomodoroRunning && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[0.58rem] font-bold text-emerald-400">
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground truncate">
                    {todayMinutes}m focused • Timer &amp; soundscapes
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
}, MobileSidebarDrawerPropsAreEqual);

function MobileSidebarDrawerPropsAreEqual(prev: MobileSidebarDrawerProps, next: MobileSidebarDrawerProps) {
  return prev.open === next.open &&
  prev.pomodoroRunning === next.pomodoroRunning &&
  prev.pomodoroTimeFormatted === next.pomodoroTimeFormatted &&
  prev.todayFocusSeconds === next.todayFocusSeconds &&
  prev.dailyGoalHours === next.dailyGoalHours;
}
