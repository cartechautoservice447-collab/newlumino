import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  SkipForward,
  CheckCircle2,
  Sparkles,
  Timer,
  Brain,
  Coffee,
  Zap,
  BarChart3,
  Calendar,
  X,
  BookOpen,
  Layers,
  Award,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PomodoroState } from "@/hooks/use-pomodoro";
import {
  requestAIPomodoroPlan,
  type PomodoroPlanRequest,
  type PomodoroPlanResult,
  type PomodoroDifficulty,
  type PomodoroBreakPref,
  type PomodoroRhythm,
} from "@/lib/pomodoro-ai";
import type { Course, Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pomodoro: PomodoroState;
  courses?: Course[];
  activeCourse?: Course | null;
  notes?: Note[];
  selectedNote?: Note | null;
  onOpenFlashcards?: (note: Note) => void;
}

export function PomodoroDialog({
  open,
  onOpenChange,
  pomodoro,
  courses = [],
  activeCourse,
  notes = [],
  selectedNote,
}: Props) {
  const {
    mode,
    timeLeft,
    totalDuration,
    isRunning,
    completedSessions,
    settings,
    togglePlay,
    resetTimer,
    switchMode,
    setPreset,
    addTime,
    skipTime,
    completeSession,
    activePlan,
    applyAIPlan,
    sessionHistory,
    todayFocusSeconds,
    dailyGoalHours,
  } = pomodoro;

  const [activeTab, setActiveTab] = useState<"timer" | "planner" | "stats">("timer");

  // AI Architect State
  const [targetHours, setTargetHours] = useState<number>(2.0);
  const [selectedCourseName, setSelectedCourseName] = useState<string>(
    activeCourse?.name || (courses[0]?.name ?? "Computer Science")
  );
  const [breakPreference, setBreakPreference] = useState<PomodoroBreakPref>("adaptive");
  const [difficulty, setDifficulty] = useState<PomodoroDifficulty>("high_code");
  const [sessionGoal, setSessionGoal] = useState<string>(
    selectedNote ? `Master "${selectedNote.title}" and practical concepts` : "Complete core study milestones"
  );
  const [rhythm, setRhythm] = useState<PomodoroRhythm>("ai_adaptive");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [generatedPlan, setGeneratedPlan] = useState<PomodoroPlanResult | null>(activePlan);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress Calculation
  const progressPercent = totalDuration > 0
    ? Math.max(0, Math.min(100, Math.round(((totalDuration - timeLeft) / totalDuration) * 100)))
    : 0;

  const todayMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.round(dailyGoalHours * 60);
  const dailyPercent = Math.min(100, Math.round((todayFocusSeconds / Math.max(60, dailyGoalHours * 3600)) * 100));

  const handleGenerateAIPlan = async () => {
    setIsGeneratingPlan(true);
    haptic("medium");
    try {
      const req: PomodoroPlanRequest = {
        targetHours,
        courseName: selectedCourseName,
        breakPreference,
        difficulty,
        sessionGoal,
        rhythm,
        noteTitle: selectedNote?.title,
        noteSnippet: selectedNote?.body?.slice(0, 300),
      };
      const res = await requestAIPomodoroPlan(req);
      setGeneratedPlan(res);
      haptic("success");
    } catch {
      haptic("warning");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleApplyPlan = () => {
    if (!generatedPlan) return;
    haptic("success");
    applyAIPlan(generatedPlan);
    setActiveTab("timer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none max-h-none rounded-none sm:rounded-none m-0 border-0 bg-slate-950/98 text-foreground backdrop-blur-3xl flex flex-col p-0 z-50 overflow-hidden shadow-none ring-0">
        {/* Pinned Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 shrink-0 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3 pr-10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_-2px_hsl(var(--primary)/0.5)] shrink-0">
              <Timer className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight">
                Pomodoro Focus &amp; AI Planner
              </DialogTitle>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {mode === "focus" ? "Deep study session" : mode === "shortBreak" ? "Short breather" : "Long recovery interval"}
              </p>
            </div>
          </div>

          {/* Segment Navigation */}
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 mr-10 sm:mr-12">
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setActiveTab("timer");
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation",
                activeTab === "timer"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Timer
            </button>
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setActiveTab("planner");
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation flex items-center gap-1",
                activeTab === "planner"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Plan
            </button>
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setActiveTab("stats");
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation",
                activeTab === "stats"
                  ? "bg-white/15 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Stats
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto scroll-sleek overscroll-contain p-4 sm:p-8 space-y-6 max-w-3xl mx-auto w-full">
          {activeTab === "timer" && (
            <div className="flex flex-col items-center space-y-6">
              {/* Mode Switcher Buttons */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    switchMode("focus");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 transition-all active:scale-95 touch-manipulation cursor-pointer",
                    mode === "focus"
                      ? "border-primary/50 bg-primary/20 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <Brain className="h-4 w-4" />
                  <span className="text-xs font-bold">Focus</span>
                  <span className="text-[0.65rem] opacity-75">{settings.focusMinutes}m</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    switchMode("shortBreak");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 transition-all active:scale-95 touch-manipulation cursor-pointer",
                    mode === "shortBreak"
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_-2px_rgba(16,185,129,0.4)]"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <Coffee className="h-4 w-4" />
                  <span className="text-xs font-bold">Short Break</span>
                  <span className="text-[0.65rem] opacity-75">{settings.shortBreakMinutes}m</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    switchMode("longBreak");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 transition-all active:scale-95 touch-manipulation cursor-pointer",
                    mode === "longBreak"
                      ? "border-sky-500/50 bg-sky-500/20 text-sky-400 shadow-[0_0_12px_-2px_rgba(56,189,248,0.4)]"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-bold">Long Break</span>
                  <span className="text-[0.65rem] opacity-75">{settings.longBreakMinutes}m</span>
                </button>
              </div>

              {/* Main Circular Countdown Display */}
              <div className="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 my-1">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
                  {/* Track */}
                  <circle
                    cx="120"
                    cy="120"
                    r="102"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-white/[0.06]"
                  />
                  {/* Neon Glow Bar */}
                  <circle
                    cx="120"
                    cy="120"
                    r="102"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 102}
                    strokeDashoffset={2 * Math.PI * 102 * (1 - progressPercent / 100)}
                    className={cn(
                      "transition-all duration-500 ease-linear",
                      mode === "focus"
                        ? "text-primary"
                        : mode === "shortBreak"
                        ? "text-emerald-400"
                        : "text-sky-400"
                    )}
                  />
                </svg>

                {/* Inner Info Container */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  {/* Context Note or Course Tag */}
                  {selectedNote ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground truncate max-w-[170px] mb-1.5">
                      <BookOpen className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{selectedNote.title}</span>
                    </div>
                  ) : activeCourse ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground truncate max-w-[170px] mb-1.5">
                      <Layers className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{activeCourse.name}</span>
                    </div>
                  ) : null}

                  {/* Main Numeric Time */}
                  <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-foreground tabular-nums">
                    {timeFormatted}
                  </span>

                  {/* Live Status Indicator */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isRunning
                          ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                          : "bg-amber-400"
                      )}
                    />
                    <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                      {isRunning ? "Running" : "Paused"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Action Controls */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
                {/* Reset */}
                <button
                  type="button"
                  aria-label="Reset timer"
                  onClick={() => {
                    haptic("light");
                    resetTimer();
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground active:scale-90 transition-all cursor-pointer touch-manipulation"
                  title="Reset Timer"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>

                {/* Main Play / Pause Button */}
                <button
                  type="button"
                  onClick={() => {
                    haptic("heavy");
                    togglePlay();
                  }}
                  className={cn(
                    "flex h-16 w-28 items-center justify-center gap-2 rounded-2xl font-black text-sm tracking-wide shadow-xl transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer",
                    isRunning
                      ? "border border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_20px_-3px_rgba(245,158,11,0.5)]"
                      : "border border-primary/50 bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_25px_-3px_hsl(var(--primary)/0.6)]"
                  )}
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-6 w-6" />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-6 w-6 ml-0.5 fill-current" />
                      <span>START</span>
                    </>
                  )}
                </button>

                {/* +5 Min Quick Add */}
                <button
                  type="button"
                  aria-label="Add 5 minutes"
                  onClick={() => {
                    haptic("medium");
                    addTime(300);
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground active:scale-90 transition-all cursor-pointer touch-manipulation font-bold text-xs"
                  title="Add 5 Minutes"
                >
                  +5m
                </button>

                {/* Finish / Skip */}
                <button
                  type="button"
                  aria-label="Finish session interval"
                  onClick={() => {
                    haptic("success");
                    completeSession();
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all cursor-pointer touch-manipulation"
                  title="Mark Interval Finished"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
              </div>

              {/* Quick Presets Bar */}
              <div className="w-full pt-2 border-t border-white/10">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">
                  Quick Pacing Presets
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      haptic("medium");
                      setPreset(25, 5);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all active:scale-95 cursor-pointer touch-manipulation",
                      settings.focusMinutes === 25 && settings.shortBreakMinutes === 5
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="text-xs font-extrabold">25 / 5</span>
                    <span className="text-[0.6rem] opacity-70">Classic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      haptic("medium");
                      setPreset(50, 10);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all active:scale-95 cursor-pointer touch-manipulation",
                      settings.focusMinutes === 50 && settings.shortBreakMinutes === 10
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="text-xs font-extrabold">50 / 10</span>
                    <span className="text-[0.6rem] opacity-70">Deep Sprint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      haptic("medium");
                      setPreset(90, 20);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all active:scale-95 cursor-pointer touch-manipulation",
                      settings.focusMinutes === 90 && settings.shortBreakMinutes === 20
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="text-xs font-extrabold">90 / 20</span>
                    <span className="text-[0.6rem] opacity-70">Ultradian</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      haptic("medium");
                      setPreset(15, 3);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all active:scale-95 cursor-pointer touch-manipulation",
                      settings.focusMinutes === 15 && settings.shortBreakMinutes === 3
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="text-xs font-extrabold">15 / 3</span>
                    <span className="text-[0.6rem] opacity-70">Burst</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "planner" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-purple-500/25 bg-purple-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-300" />
                  <h3 className="text-sm font-bold text-foreground">AI Study Architect</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate adaptive focus-and-break cycles tuned for your target course and difficulty.
                </p>
              </div>

              {/* Goal Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Study Target / Goal</label>
                <input
                  type="text"
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(e.target.value)}
                  placeholder="e.g. Master algorithms and implement exercises"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-purple-500/50 focus:outline-none"
                />
              </div>

              {/* Course Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Course</label>
                  <select
                    value={selectedCourseName}
                    onChange={(e) => setSelectedCourseName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.name} className="bg-slate-900">
                        {c.name}
                      </option>
                    ))}
                    {courses.length === 0 && (
                      <option value="General Study" className="bg-slate-900">General Study</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Target Hours</label>
                  <select
                    value={targetHours}
                    onChange={(e) => setTargetHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value={1} className="bg-slate-900">1.0 Hour</option>
                    <option value={2} className="bg-slate-900">2.0 Hours</option>
                    <option value={3} className="bg-slate-900">3.0 Hours</option>
                    <option value={4} className="bg-slate-900">4.0 Hours</option>
                  </select>
                </div>
              </div>

              {/* Rhythm and Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as PomodoroDifficulty)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="high_code" className="bg-slate-900">Intensive Coding</option>
                    <option value="conceptual" className="bg-slate-900">Theory & Concepts</option>
                    <option value="problem_solving" className="bg-slate-900">Problem Solving</option>
                    <option value="revision" className="bg-slate-900">Quick Revision</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Interval Rhythm</label>
                  <select
                    value={rhythm}
                    onChange={(e) => setRhythm(e.target.value as PomodoroRhythm)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="ai_adaptive" className="bg-slate-900">AI Adaptive</option>
                    <option value="classic_25_5" className="bg-slate-900">25m / 5m Classic</option>
                    <option value="deep_50_10" className="bg-slate-900">50m / 10m Deep</option>
                    <option value="ultradian_90_20" className="bg-slate-900">90m / 20m Ultrawide</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAIPlan}
                disabled={isGeneratingPlan}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-purple-500/40 bg-purple-600 px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-98 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 animate-spin" style={{ animationDuration: isGeneratingPlan ? "1s" : "0s" }} />
                <span>{isGeneratingPlan ? "Architecting Schedule..." : "Synthesize AI Study Plan"}</span>
              </button>

              {/* Result Preview */}
              {generatedPlan && (
                <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      {generatedPlan.recommendedFocusMinutes}m Focus • {generatedPlan.recommendedBreakMinutes}m Break
                    </span>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground bg-white/[0.06] px-2 py-0.5 rounded-md">
                      {generatedPlan.cyclesCount} Cycles
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {generatedPlan.planSummary}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <p className="text-[0.68rem] font-bold text-foreground uppercase tracking-wider">Milestones</p>
                    {generatedPlan.milestones.map((m, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPlan}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary px-3 py-2 text-xs font-bold text-primary-foreground active:scale-95 transition cursor-pointer"
                  >
                    <span>Apply Plan to Timer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-4">
              {/* Daily Progress Gauge */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">Today's Focus Logged</span>
                  <span className="text-xs font-mono font-bold text-primary">{dailyPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-300"
                    style={{ width: `${dailyPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[0.68rem] text-muted-foreground">
                  <span>{todayMinutes} minutes</span>
                  <span>Goal: {goalMinutes} minutes ({dailyGoalHours}h)</span>
                </div>
              </div>

              {/* Intervals Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <Award className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-xl font-extrabold font-mono text-foreground">{completedSessions}</p>
                  <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-semibold">
                    Intervals Done
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <Clock className="h-5 w-5 text-sky-400 mx-auto mb-1" />
                  <p className="text-xl font-extrabold font-mono text-foreground">{todayMinutes}m</p>
                  <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-semibold">
                    Total Time
                  </p>
                </div>
              </div>

              {/* Recent History */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Recent Intervals ({sessionHistory.length})
                </p>
                {sessionHistory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto scroll-sleek">
                    {sessionHistory.slice(0, 8).map((sess) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{sess.noteTitle || sess.courseName}</p>
                          <p className="text-[0.65rem] text-muted-foreground truncate">{sess.courseName}</p>
                        </div>
                        <span className="font-mono text-xs font-bold text-primary shrink-0 pl-2">
                          +{sess.durationMinutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
                    No completed focus intervals yet today. Start the timer to log your first block!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-white/[0.01] border-t border-white/10 flex items-center justify-between text-[0.68rem] text-muted-foreground px-5 shrink-0">
          <span>{todayMinutes}m focused today</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="font-bold text-foreground hover:text-primary transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
