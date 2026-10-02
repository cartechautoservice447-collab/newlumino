import React, { useState, useEffect, useCallback } from "react";
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
  X,
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

/* ------------------------------------------------------------------ */
/* Module-level constants: class strings are merged once, not on      */
/* every render, and inline style objects keep a stable identity.     */
/* ------------------------------------------------------------------ */
const CLOSE_DELAY = 300;

const BACKDROP_BASE =
  "absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer transition-opacity duration-300";
const BACKDROP_OPEN = cn(BACKDROP_BASE, "opacity-100");
const BACKDROP_CLOSED = cn(BACKDROP_BASE, "opacity-0");
const BACKDROP_STYLE = { willChange: "opacity" } as const;

const PANEL_BASE =
  "glass-panel absolute inset-y-0 left-0 flex w-[88vw] max-w-[330px] flex-col rounded-r-3xl border-r border-y border-white/20 bg-black/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 overflow-hidden transition-transform duration-300 ease-out";
const PANEL_OPEN = cn(PANEL_BASE, "translate-x-0");
const PANEL_CLOSED = cn(PANEL_BASE, "-translate-x-full");
const PANEL_STYLE = { willChange: "transform" } as const;

const CONTENT_CLASS =
  "flex-1 overflow-y-auto scroll-sleek p-2.5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-2.5 min-h-0";

const TOOL_BTN_BASE =
  "glass-panel group w-full flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ease-out cursor-pointer";

const CHEAT_BTN = cn(
  TOOL_BTN_BASE,
  "border-cyan-500/20 bg-cyan-500/10 hover:border-cyan-500/40 hover:bg-cyan-500/15",
  "active:scale-[0.96] active:translate-y-0.5 active:bg-cyan-500/20 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-cyan-400/50"
);
const POMO_BTN_RUNNING = cn(
  TOOL_BTN_BASE,
  "hover:border-primary/40 hover:bg-white/[0.06]",
  "active:scale-[0.96] active:translate-y-0.5 active:bg-primary/20 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-primary/50",
  "border-primary/40 bg-primary/10 shadow-[0_0_14px_-4px_hsl(var(--primary)/0.3)]"
);
const POMO_BTN_IDLE = cn(
  TOOL_BTN_BASE,
  "hover:border-primary/40 hover:bg-white/[0.06]",
  "active:scale-[0.96] active:translate-y-0.5 active:bg-primary/20 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-primary/50",
  "border-white/10 bg-white/[0.03]"
);
const POMO_ICON_BASE =
  "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 group-active:scale-90";
const POMO_ICON_RUNNING = cn(POMO_ICON_BASE, "border-primary/50 bg-primary/20 text-primary animate-pulse");
const POMO_ICON_IDLE = cn(POMO_ICON_BASE, "border-primary/30 bg-primary/15 text-primary");
const EXAM_BTN = cn(
  TOOL_BTN_BASE,
  "border-amber-500/25 bg-amber-500/10 hover:border-amber-500/50 hover:bg-amber-500/15",
  "active:scale-[0.96] active:translate-y-0.5 active:bg-amber-500/25 active:border-amber-400"
);
const POLISH_BTN = cn(
  TOOL_BTN_BASE,
  "border-cyan-500/25 bg-cyan-500/10 hover:border-cyan-500/50 hover:bg-cyan-500/15",
  "active:scale-[0.96] active:translate-y-0.5 active:bg-cyan-500/25 active:border-cyan-400"
);
const GOAL_BTN = cn(
  TOOL_BTN_BASE,
  "border-sky-500/20 bg-sky-500/10 hover:border-sky-500/40 hover:bg-sky-500/15",
  "active:scale-[0.96] active:translate-y-0.5 active:bg-sky-500/25 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-sky-400/60"
);
const MD_BTN = cn(
  TOOL_BTN_BASE,
  "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
  "active:scale-[0.96] active:translate-y-0.5 active:bg-white/[0.1] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] active:border-white/30"
);

const LG_ACTIVE = cn(
  "rounded-xl px-2 py-0.5 text-[0.65rem] font-bold transition-all duration-200 cursor-pointer active:scale-90",
  "bg-primary text-primary-foreground shadow-sm"
);
const LG_OFF = cn(
  "rounded-xl px-2 py-0.5 text-[0.65rem] font-bold transition-all duration-200 cursor-pointer active:scale-90",
  "border border-white/10 bg-white/[0.05] text-muted-foreground"
);

const THEME_BASE =
  "flex items-center justify-center gap-1 rounded-lg py-1 text-[0.65rem] font-medium transition-all cursor-pointer active:scale-95";
const THEME_ACTIVE = cn(THEME_BASE, "bg-white/[0.12] text-foreground font-bold shadow-sm");
const THEME_INACTIVE = cn(THEME_BASE, "text-muted-foreground hover:text-foreground");

/* Haptic strength per action, exactly as before */
type ToolAction =
  | "cheatsheet"
  | "pomodoro"
  | "exam"
  | "polisher"
  | "goal"
  | "course"
  | "settings";

const ACTION_HAPTIC: Record<ToolAction, "light" | "medium"> = {
  cheatsheet: "light",
  pomodoro: "medium",
  exam: "medium",
  polisher: "medium",
  goal: "medium",
  course: "medium",
  settings: "medium",
};

/* ------------------------------------------------------------------ */
/* Static buttons: no props, so they render once and never again.     */
/* Clicks are handled by one delegated handler on the content area.   */
/* ------------------------------------------------------------------ */
const CheatsheetButton = React.memo(function CheatsheetButton() {
  return (
    <button type="button" data-action="cheatsheet" className={CHEAT_BTN}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 transition-all duration-200 group-active:scale-90">
          <FileText className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-foreground truncate">MD Cheatsheet</h4>
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
  );
});

const MarkdownButton = React.memo(function MarkdownButton() {
  return (
    <button type="button" data-action="cheatsheet" className={MD_BTN}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 transition-all duration-200 group-active:scale-90">
          <FileText className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-foreground truncate">Markdown Cheatsheet</h4>
          <p className="text-[0.65rem] text-muted-foreground truncate">Syntax, code &amp; task lists</p>
        </div>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1 shrink-0" />
    </button>
  );
});

const AiHeader = React.memo(function AiHeader() {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[0.65rem] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        <span>AI Study Intelligence</span>
      </span>
      <span className="text-[0.58rem] font-mono rounded bg-primary/20 px-1 py-0.2 text-primary font-bold">
        Gemini 3.8
      </span>
    </div>
  );
});

const ExamButton = React.memo(function ExamButton() {
  return (
    <button type="button" data-action="exam" className={EXAM_BTN}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-300 transition-all duration-200 group-active:scale-90 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
          <Target className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-foreground truncate">AI Exam Simulator</h4>
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
  );
});

const PolisherButton = React.memo(function PolisherButton() {
  return (
    <button type="button" data-action="polisher" className={POLISH_BTN}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 transition-all duration-200 group-active:scale-90 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
          <Wand2 className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-foreground truncate">AI Note Polisher &amp; Code</h4>
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
  );
});

const CourseButton = React.memo(function CourseButton() {
  return (
    <button
      type="button"
      data-action="course"
      className="glass-panel flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-xs font-bold text-foreground active:scale-95 transition-all hover:bg-white/[0.08] cursor-pointer"
    >
      <FolderPlus className="h-3.5 w-3.5 text-primary" />
      <span>+ Course</span>
    </button>
  );
});

const SettingsButton = React.memo(function SettingsButton() {
  return (
    <button
      type="button"
      data-action="settings"
      className="glass-panel flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-xs font-bold text-foreground active:scale-95 transition-all hover:bg-white/[0.08] cursor-pointer"
    >
      <Sliders className="h-3.5 w-3.5 text-purple-400" />
      <span>Settings</span>
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Buttons with live data: re-render only when their own values change */
/* ------------------------------------------------------------------ */
const PomodoroButton = React.memo(function PomodoroButton({
  running,
  timeFormatted,
  todayMinutes,
}: {
  running: boolean;
  timeFormatted: string;
  todayMinutes: number;
}) {
  return (
    <button
      type="button"
      data-action="pomodoro"
      className={running ? POMO_BTN_RUNNING : POMO_BTN_IDLE}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={running ? POMO_ICON_RUNNING : POMO_ICON_IDLE}>
          <Clock className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-foreground truncate">Pomodoro &amp; Soundscape</h4>
            {running && (
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
          {timeFormatted}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-active:translate-x-1" />
      </div>
    </button>
  );
});

const GoalButton = React.memo(function GoalButton({
  goalPercent,
  todayMinutes,
  goalMinutes,
}: {
  goalPercent: number;
  todayMinutes: number;
  goalMinutes: number;
}) {
  return (
    <button type="button" data-action="goal" className={GOAL_BTN}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/20 text-sky-400 transition-all duration-200 group-active:scale-90">
          <Target className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-foreground truncate">Daily Goal &amp; Analytics</h4>
            <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[0.58rem] font-bold text-sky-400">
              {goalPercent}%
            </span>
          </div>
          <p className="text-[0.65rem] text-muted-foreground truncate">
            {todayMinutes}m of {goalMinutes}m target
          </p>
        </div>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-sky-400/70 transition-transform group-active:translate-x-1 shrink-0" />
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Theme card: owns the customization subscription, so settings       */
/* changes no longer re-render the whole drawer.                      */
/* ------------------------------------------------------------------ */
const ThemeCard = React.memo(function ThemeCard() {
  const { settings, update } = useCustomization();

  return (
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
          className={settings.liquidGlassEnabled ? LG_ACTIVE : LG_OFF}
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
          className={settings.theme === "original" ? THEME_ACTIVE : THEME_INACTIVE}
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
          className={settings.theme === "dark" ? THEME_ACTIVE : THEME_INACTIVE}
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
          className={settings.theme === "light" ? THEME_ACTIVE : THEME_INACTIVE}
        >
          <Sun className="h-3 w-3 text-amber-400" />
          <span>Light</span>
        </button>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Sign-out: owns the auth subscription                               */
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
      className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Log Out ({user.email?.split("@")[0] || "Account"})</span>
    </button>
  );
});

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
  // Tap-open drawer only. Edge-swipe and drag-to-close gestures are intentionally disabled
  // so dashboard scrolling remains on the browser compositor path.

  // `rendered` keeps the drawer in the DOM while the close animation plays.
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true); // adjust during render: no extra commit/effect pass
  const visible = open || rendered;

  // Single unmount timer, cleaned up on reopen/unmount
  useEffect(() => {
    if (open || !rendered) return;
    const timer = window.setTimeout(() => setRendered(false), CLOSE_DELAY);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleClose = useCallback(() => {
    haptic("light");
    onOpenChange(false);
  }, [onOpenChange]);

  // One delegated handler instead of a closure per button
  const handleToolClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const btn = (e.target as Element).closest<HTMLElement>("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action as ToolAction;

      let cb: (() => void) | undefined;
      switch (action) {
        case "cheatsheet":
          cb = onOpenCheatsheet;
          break;
        case "pomodoro":
          cb = onOpenPomodoro;
          break;
        case "exam":
          cb = onOpenExamSimulator;
          break;
        case "polisher":
          cb = onOpenNotePolisher;
          break;
        case "goal":
          cb = onNavigateDailyGoal;
          break;
        case "course":
          cb = onOpenNewCourse;
          break;
        case "settings":
          cb = onOpenSettings;
          break;
      }
      if (!cb) return;

      haptic(ACTION_HAPTIC[action]);
      onOpenChange(false);
      cb();
    },
    [
      onOpenChange,
      onOpenCheatsheet,
      onOpenPomodoro,
      onOpenExamSimulator,
      onOpenNotePolisher,
      onNavigateDailyGoal,
      onOpenNewCourse,
      onOpenSettings,
    ]
  );

  if (!visible) return null;

  const todayMinutes = minutesOf(todayFocusSeconds);
  const goalPercent = percentOf(todayFocusSeconds, dailyGoalHours);

  return createPortal(
    <div className="fixed inset-0 z-50 select-none md:hidden overflow-hidden pointer-events-auto">
      {/* Lightweight backdrop; no gesture handler */}
      <div
        onClick={handleClose}
        className={open ? BACKDROP_OPEN : BACKDROP_CLOSED}
        style={BACKDROP_STYLE}
      />

      {/* Left-to-Right Sliding Drawer: EXCLUSIVELY STUDY TOOLS */}
      <div className={open ? PANEL_OPEN : PANEL_CLOSED} style={PANEL_STYLE}>
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
        <div onClick={handleToolClick} className={CONTENT_CLASS}>
          {/* Tool 2: MD Cheatsheet */}
          {onOpenCheatsheet && <CheatsheetButton />}

          {/* Tool 4: Pomodoro & Soundscape */}
          {onOpenPomodoro && (
            <PomodoroButton
              running={pomodoroRunning}
              timeFormatted={pomodoroTimeFormatted}
              todayMinutes={todayMinutes}
            />
          )}

          {/* AI Intelligence Suite: AI Adaptive Exam Simulator (#2) & AI Note Polisher (#5) */}
          <div className="space-y-2 pt-1 border-t border-white/10">
            <AiHeader />
            {onOpenExamSimulator && <ExamButton />}
            {onOpenNotePolisher && <PolisherButton />}
          </div>

          {/* Option 4: Daily Goal & Analytics */}
          {onNavigateDailyGoal && (
            <GoalButton
              goalPercent={goalPercent}
              todayMinutes={todayMinutes}
              goalMinutes={dailyGoalHours * 60}
            />
          )}

          {/* Option 5: Markdown Cheatsheet */}
          {onOpenCheatsheet && <MarkdownButton />}

          {/* Option 6: Liquid Glass Physics & Quick Themes */}
          <ThemeCard />

          {/* Bottom Actions: New Course & Settings */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {onOpenNewCourse && <CourseButton />}
            {onOpenSettings && <SettingsButton />}
          </div>

          {/* Account Sign Out */}
          <SignOutButton onClose={close} />
        </div>
      </div>
    </div>,
    document.body
  );
}, MobileSidebarDrawerPropsAreEqual);

/* Derived display values: compare what is actually shown, not raw seconds */
function minutesOf(seconds: number) {
  return Math.floor(seconds / 60);
}
function percentOf(seconds: number, goalHours: number) {
  return Math.min(100, Math.round((seconds / (goalHours * 3600)) * 100));
}

function MobileSidebarDrawerPropsAreEqual(
  prev: MobileSidebarDrawerProps,
  next: MobileSidebarDrawerProps
) {
  // While closed, nothing is visible except a brief close animation, so skip
  // the per-second Pomodoro ticks entirely. Opening re-renders with fresh props.
  if (!prev.open && !next.open) return true;

  const ps = prev.todayFocusSeconds ?? 0;
  const ns = next.todayFocusSeconds ?? 0;
  const pg = prev.dailyGoalHours ?? 2;
  const ng = next.dailyGoalHours ?? 2;

  return (
    prev.open === next.open &&
    prev.pomodoroRunning === next.pomodoroRunning &&
    prev.pomodoroTimeFormatted === next.pomodoroTimeFormatted &&
    pg === ng &&
    minutesOf(ps) === minutesOf(ns) &&
    percentOf(ps, pg) === percentOf(ns, ng)
  );
}