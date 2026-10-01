import React, { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  FileText,
  Flame,
  Headphones,
  Layers,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Volume2,
  VolumeX,
  Wand2,
  Waves,
  Zap,
} from "lucide-react";import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { SOUNDSCAPE_OPTIONS, type SoundscapeType } from "@/lib/soundscapes";
import { cn } from "@/lib/utils";
import type { PomodoroState } from "@/hooks/use-pomodoro";
import {
  requestAIPomodoroPlan,
  type PomodoroPlanRequest,
  type PomodoroPlanResult,
  type PomodoroDifficulty,
  type PomodoroBreakPref,
  type PomodoroRhythm,
  type PomodoroRecallStrategy,
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
  onOpenFlashcards,
}: Props) {
  const {
    mode,
    timeLeft,
    totalDuration,
    isRunning,
    soundscape,
    soundVolume,
    completedSessions,
    settings,
    setSoundscape,
    setSoundVolume,
    togglePlay,
    resetTimer,
    switchMode,
    setPreset,
    addTime,
    skipTime,
    completeSession,
    activePlan,
    applyAIPlan,
    noteTimeSpent,
    sessionHistory,
    totalTrackedSeconds,
  } = pomodoro;

  // Active View Tab inside Pomodoro Dialog
  const [activeTab, setActiveTab] = useState<"timer" | "ai_planner" | "analytics">("timer");

  // AI Planner Fill-in-the-Box States
  const [targetHours, setTargetHours] = useState<number>(2.0);
  const [selectedCourseName, setSelectedCourseName] = useState<string>(
    activeCourse?.name || (courses[0]?.name ?? "Computer Science")
  );
  const [breakPreference, setBreakPreference] = useState<PomodoroBreakPref>("adaptive");
  const [difficulty, setDifficulty] = useState<PomodoroDifficulty>("high_code");
  const [sessionGoal, setSessionGoal] = useState<string>(
    selectedNote ? `Master "${selectedNote.title}" and practical exercises` : "Complete core study milestones"
  );
  const [rhythm, setRhythm] = useState<PomodoroRhythm>("ai_adaptive");
  const [activeRecallStrategy, setActiveRecallStrategy] = useState<PomodoroRecallStrategy>("session_end");

  // AI Generation State
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [generatedPlan, setGeneratedPlan] = useState<PomodoroPlanResult | null>(activePlan);
  const [soundOpen, setSoundOpen] = useState(false);
  const [sessionTasks, setSessionTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // SVG circular progress calculation
  const progressPercent = Math.max(0, Math.min(100, (1 - timeLeft / totalDuration) * 100));
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const handleGeneratePlan = async () => {
    haptic("heavy");
    setIsGeneratingPlan(true);
    try {
      const plan = await requestAIPomodoroPlan({
        targetHours,
        courseName: selectedCourseName,
        breakPreference,
        difficulty,
        sessionGoal,
        rhythm,
        activeRecallStrategy,
        noteTitle: selectedNote?.title,
        noteSnippet: selectedNote?.body?.slice(0, 300),
      });
      setGeneratedPlan(plan);
      haptic("success");
    } catch (_err) {
      // Handled in lib fallback
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleApplyAndStart = (plan: PomodoroPlanResult) => {
    haptic("heavy");
    applyAIPlan(plan);
    setActiveTab("timer");
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) return `${h}h ${remM}m`;
    if (m > 0) return `${m}m ${sec % 60}s`;
    return `${sec}s`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        haptic(val ? "medium" : "light");
        onOpenChange(val);
      }}
    >
      <DialogContent className="glass-panel fixed inset-0 m-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#0f131c] p-0 text-[#dfe2ef] shadow-none sm:inset-1/2 sm:h-[96vh] sm:w-[min(620px,calc(100vw-2rem))] sm:max-w-[620px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:border sm:border-white/10 sm:shadow-2xl">
        <header className="z-50 shrink-0 border-b border-white/[0.06] bg-[#0a0e17]/90 px-5 pb-2 pt-[calc(.75rem+env(safe-area-inset-top,0px))] backdrop-blur-2xl">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Exit Session"
                onClick={() => onOpenChange(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-slate-400 transition-transform active:scale-95"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 backdrop-blur-md">
                <span className={cn("h-2 w-2 rounded-full shadow-[0_0_8px_#4edea3]", isRunning ? "bg-emerald-300 animate-pulse" : "bg-amber-300")} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Active Session</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Ambient Soundscape"
                aria-pressed={soundscape !== "none"}
                onClick={() => {
                  haptic("light");
                  setSoundscape(soundscape === "none" ? "rain" : "none");
                }}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95",
                  soundscape === "none" ? "bg-white/[0.05] text-slate-400" : "bg-cyan-400/10 text-cyan-300",
                )}
              >
                <Waves className="h-5 w-5" />
              </button>
              <button type="button" aria-label="AI Planner" onClick={() => { haptic("light"); setActiveTab("ai_planner"); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-violet-300 active:scale-95">
                <Wand2 className="h-5 w-5" />
              </button>
              <button type="button" aria-label="Time Monitor" onClick={() => { haptic("light"); setActiveTab("analytics"); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-cyan-300 active:scale-95">
                <BarChart3 className="h-5 w-5" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-[#003824]">
                <Headphones className="h-[18px] w-[18px]" />
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* TAB 1: Supplied Animated Pomodoro Session */}
        {activeTab === "timer" && (
          <div className="mt-3 animate-panel-in space-y-4">
            <style>{'@keyframes pomodoroAuraPulse{0%,100%{transform:scale(1);opacity:.45}50%{transform:scale(1.1);opacity:.8}}@keyframes pomodoroRingBreathing{0%,100%{filter:drop-shadow(0 0 10px rgba(78,222,163,.4)) drop-shadow(0 0 22px rgba(76,215,246,.25))}50%{filter:drop-shadow(0 0 18px rgba(78,222,163,.75)) drop-shadow(0 0 32px rgba(76,215,246,.45))}}@keyframes pomodoroPausedPulse{0%,100%{filter:drop-shadow(0 0 6px rgba(251,191,36,.3));opacity:.75}50%{filter:drop-shadow(0 0 14px rgba(251,191,36,.6));opacity:.95}}@keyframes pomodoroHeadGlow{0%,100%{transform:scale(1);filter:drop-shadow(0 0 5px #4cd7f6) drop-shadow(0 0 12px #4edea3)}50%{transform:scale(1.3);filter:drop-shadow(0 0 10px #4cd7f6) drop-shadow(0 0 20px #6ffbbe)}}'}</style>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex max-w-[70%] items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-300 backdrop-blur-md">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_8px_#4cd7f6]" />
                  <span className="truncate">{activeCourse?.name || "General Study"}</span>
                </span>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider", mode === "focus" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", mode === "focus" ? "bg-emerald-300 animate-pulse" : "bg-amber-300")} />
                  {mode === "focus" ? "Focus Phase " + ((completedSessions % 4) + 1) + " of 4" : phaseName(mode)}
                </span>
              </div>
              <h2 className="text-[26px] font-bold tracking-tight text-white sm:text-[30px]">{selectedNote?.title || (mode === "focus" ? "Focused Study Session" : phaseName(mode))}</h2>
              <p className="flex items-center gap-1.5 text-[12px] text-slate-400">
                <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
                {selectedNote ? "Active note • Live focus tracking" : "Live session • Automatic focus tracking"}
              </p>
            </div>

            <div className="relative my-2 flex items-center justify-center">
              <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" style={{ animation: "pomodoroAuraPulse 4s ease-in-out infinite" }} />
              <div className="pointer-events-none absolute h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl" style={{ animation: "pomodoroAuraPulse 4s ease-in-out infinite", animationDelay: "-2s" }} />

              <div className="relative flex h-72 w-72 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 260 260" aria-hidden>
                  <defs>
                    <linearGradient id="newPomodoroTimerGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#4cd7f6" />
                      <stop offset="60%" stopColor="#4edea3" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="newPomodoroPausedGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <filter id="newPomodoroGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4.5" />
                      <feComposite in="SourceGraphic" operator="over" />
                    </filter>
                  </defs>
                  <circle cx="130" cy="130" r="112" fill="none" stroke="rgba(255,255,255,.07)" strokeDasharray="4 6" strokeWidth="10" />
                  <circle cx="130" cy="130" r="112" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                  <circle
                    cx="130"
                    cy="130"
                    r="112"
                    fill="none"
                    filter="url(#newPomodoroGlow)"
                    stroke={isRunning ? "url(#newPomodoroTimerGradient)" : "url(#newPomodoroPausedGradient)"}
                    strokeDasharray="703.7"
                    strokeDashoffset={703.7 - (703.7 * Math.max(0, Math.min(1, totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0)))}
                    strokeLinecap="round"
                    strokeWidth="12"
                    style={{ animation: isRunning ? "pomodoroRingBreathing 3s ease-in-out infinite" : "pomodoroPausedPulse 2.5s ease-in-out infinite" }}
                  />
                  <g
                    transform={"rotate(" + (Math.max(0, Math.min(1, totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0)) * 360) + " 130 130)"}
                    className="transition-transform duration-700 ease-out"
                  >
                    <circle cx="242" cy="130" r="5" fill="#fff" stroke={isRunning ? "#4cd7f6" : "#fbbf24"} strokeWidth="2.5" style={{ animation: isRunning ? "pomodoroHeadGlow 2s ease-in-out infinite" : undefined }} />
                    <circle cx="242" cy="130" r="9" fill={isRunning ? "#4cd7f6" : "#fbbf24"} opacity=".35" />
                  </g>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                  <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-0.5 backdrop-blur-md">
                    <Timer className={cn("h-3.5 w-3.5", isRunning ? "text-emerald-300" : "text-amber-300")} />
                    <span className="text-[11px] font-semibold text-slate-400">{Math.floor(Math.max(0, totalDuration - timeLeft) / 60)}m elapsed • {Math.round(totalDuration / 60)}m block</span>
                  </div>
                  <div className="font-mono text-[48px] font-extrabold tracking-tighter text-white drop-shadow-[0_0_20px_rgba(78,222,163,.35)] sm:text-[54px]">{timeFormatted}</div>
                  <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{mode === "focus" ? "Remaining Target" : "Paused"}</span>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 backdrop-blur-md">
                    <Waves className={cn("h-4 w-4", isRunning ? "text-cyan-300" : "text-amber-300")} />
                    <span className={cn("text-[11px] font-semibold", isRunning ? "text-cyan-300" : "text-amber-300")}>{isRunning ? "Cognitive Flow: " + Math.round(activePlan?.efficiencyScore || 94) + "% Peak" : "Session Paused"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button type="button" aria-label="Add 5 Minutes" onClick={() => { haptic("light"); addTime(300); }} className="flex h-12 flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] text-sm font-semibold text-white shadow-sm backdrop-blur-md active:scale-95">
                <Plus className="h-[18px] w-[18px] text-emerald-300" />+5m
              </button>
              <button type="button" aria-label={isRunning ? "Pause Session" : "Start Session"} onClick={() => { haptic("heavy"); togglePlay(); }} className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-[0_0_28px_rgba(16,185,129,.5)] active:scale-90", isRunning ? "bg-gradient-to-tr from-emerald-700 via-emerald-400 to-emerald-200 text-[#022115]" : "bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 text-stone-900")}>
                {isRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
              </button>
              <button type="button" aria-label="Next Interval" onClick={() => { haptic("medium"); skipTime(300); }} className="flex h-12 flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] text-sm font-semibold text-slate-200 shadow-sm backdrop-blur-md active:scale-95">
                Skip <SkipForward className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phase</span>
              {[
                { id: "focus" as const, label: "Focus " + settings.focusMinutes + "m" },
                { id: "shortBreak" as const, label: "Short " + settings.shortBreakMinutes + "m" },
                { id: "longBreak" as const, label: "Long " + settings.longBreakMinutes + "m" },
              ].map((item) => (
                <button key={item.id} type="button" onClick={() => { haptic("light"); switchMode(item.id); }} className={cn("rounded-full border px-3 py-1 text-[10px] font-bold active:scale-95", mode === item.id ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-300" : "border-white/[0.07] bg-white/[0.03] text-slate-400")}>
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={() => { haptic("light"); resetTimer(); }} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-[10px] font-bold text-slate-400 active:scale-95"><RotateCcw className="mr-1 inline h-3 w-3" />Reset</button>
              <button type="button" onClick={() => { haptic("light"); setPreset(25, 5); }} className={cn("rounded-full border px-3 py-1 text-[10px] font-bold active:scale-95", settings.focusMinutes === 25 ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-300" : "border-white/[0.07] bg-white/[0.03] text-slate-400")}>25 / 5</button>
              <button type="button" onClick={() => { haptic("light"); setPreset(50, 10); }} className={cn("rounded-full border px-3 py-1 text-[10px] font-bold active:scale-95", settings.focusMinutes === 50 ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-300" : "border-white/[0.07] bg-white/[0.03] text-slate-400")}>50 / 10</button>
            </div>

            <section className="rounded-2xl bg-white/[0.05] p-4 shadow-md backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300"><CheckCircle2 className="h-[18px] w-[18px]" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Session Objectives</h3>
                    <span className="text-[10px] text-slate-400">{((activePlan?.milestones?.slice(0, 3).length || 3) + sessionTasks.length)} objectives</span>
                  </div>
                </div>
                <button type="button" aria-label="Add micro-task" onClick={() => setShowTaskInput((value) => !value)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-emerald-300 active:scale-95"><Plus className="h-5 w-5" /></button>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {(activePlan?.milestones?.slice(0, 3) || [
                  selectedNote?.title ? "Study: " + selectedNote.title : "Review the active study material",
                  activeCourse?.name ? "Practice key concepts for " + activeCourse.name : "Practice the key concepts from this block",
                  "Review and consolidate key takeaways",
                ]).map((task, index) => (
                  <div key={task + index} className={cn("flex items-start gap-3 rounded-xl p-2.5", index === 1 ? "bg-white/[0.08]" : "bg-white/[0.035]")}>
                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", index === 0 ? "bg-emerald-300/20" : "bg-[#0a0e17]")}>
                      <span className={cn("h-2.5 w-2.5 rounded-full", index === 0 ? "bg-emerald-300 animate-pulse" : "bg-slate-600")} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-white">{task}</p>
                      <span className="text-[10px] text-slate-500">{index === 1 ? "Active Objective" : "Pending"}</span>
                    </div>
                  </div>
                ))}
                {sessionTasks.map((task, index) => (
                  <div key={"custom-" + task + index} className="flex items-start gap-3 rounded-xl bg-white/[0.035] p-2.5">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#0a0e17]" />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] text-white">{task}</p><span className="text-[10px] text-slate-500">Micro-task</span></div>
                  </div>
                ))}
              </div>

              {showTaskInput ? (
                <div className="mt-3 flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5">
                  <input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { const value = taskInput.trim(); if (value) setSessionTasks((prev) => prev.concat(value)); setTaskInput(""); setShowTaskInput(false); } }} placeholder="Add micro-task..." className="w-full bg-transparent py-1 text-xs text-white outline-none placeholder:text-slate-500" />
                  <button type="button" onClick={() => { const value = taskInput.trim(); if (value) setSessionTasks((prev) => prev.concat(value)); setTaskInput(""); setShowTaskInput(false); }} className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Add</button>
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-2xl bg-white/[0.05] p-4 shadow-md backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300"><Volume2 className="h-[19px] w-[19px]" /></div>
                  <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audio Focus Environment</span><h3 className="text-sm font-semibold text-white">{soundscape === "none" ? "Soundscape Off" : "Binaural Beats (Gamma 40Hz)"}</h3></div>
                </div>
                {soundscape !== "none" && isRunning ? <div className="flex h-6 items-end gap-1"><span className="h-5 w-1 animate-bounce rounded-full bg-cyan-300" /><span className="h-3 w-1 animate-bounce rounded-full bg-emerald-300" /><span className="h-6 w-1 animate-bounce rounded-full bg-cyan-300" /><span className="h-4 w-1 animate-bounce rounded-full bg-emerald-300" /></div> : null}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <button type="button" onClick={() => setSoundOpen((value) => !value)} className="flex h-10 w-full items-center justify-between rounded-full bg-white/[0.07] px-3 text-xs font-semibold text-white">
                    <span className="flex min-w-0 items-center gap-1.5 truncate"><Headphones className="h-4 w-4 text-cyan-300" />{SOUNDSCAPE_OPTIONS.find((item) => item.id === soundscape)?.name || "Mute"}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                  {soundOpen ? (
                    <div className="absolute bottom-11 left-0 z-50 w-full rounded-2xl border border-white/10 bg-[#151b26] p-1.5 shadow-2xl">
                      {SOUNDSCAPE_OPTIONS.map((option) => (
                        <button key={option.id} type="button" onClick={() => { haptic("light"); setSoundscape(option.id); setSoundOpen(false); }} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs", soundscape === option.id ? "bg-emerald-300/10 text-emerald-300" : "text-slate-300")}>
                          <span className="text-base">{option.icon}</span><span className="truncate">{option.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex w-32 items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2">
                  <VolumeX className="h-4 w-4 text-slate-400" />
                  <Slider value={[soundVolume * 100]} min={0} max={100} step={5} onValueChange={(value) => setSoundVolume((value[0] || 0) / 100)} />
                  <Volume2 className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-2.5 pt-1">
              <button type="button" onClick={() => { haptic("heavy"); completeSession(); }} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-cyan-300 text-sm font-bold text-[#022115] shadow-[0_0_24px_rgba(16,185,129,.35)] active:scale-[.98]">
                <CheckCircle2 className="h-5 w-5" />Complete &amp; Log Session
              </button>
              <button type="button" onClick={() => { haptic("medium"); switchMode("shortBreak"); }} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/[0.05] text-sm font-semibold text-slate-300 active:scale-[.98]">
                <Coffee className="h-[18px] w-[18px] text-amber-300" />Take 5m Bio Break
              </button>
            </div>
          </div>
        )}
        {/* TAB 2: AI Smart Planner (Fill-in-the-Boxes Form & Accurate Result View) */}
        {activeTab === "ai_planner" && (
          <div className="mt-3 animate-panel-in space-y-4">
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-300" />
                <h4 className="text-xs font-bold text-foreground">
                  AI Automatic Pomodoro Planner
                </h4>
              </div>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                Fill the study parameters below. Gemini will calculate the exact work/rest intervals, milestone sequence, and cognitive pacing for your session.
              </p>
            </div>

            {/* The 7 Fill-in-the-Box Configuration Fields */}
            <div className="space-y-3">
              {/* Box 1: Target Hours */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">1. Total Study Duration</span>
                  <span className="font-mono font-bold text-purple-300">{targetHours} Hours ({Math.round(targetHours * 60)} mins)</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-sleek">
                  {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setTargetHours(hr);
                      }}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all active:scale-95 touch-manipulation cursor-pointer",
                        targetHours === hr
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
                          : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {hr}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Box 2: Target Course */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <span className="text-xs font-bold text-foreground">2. Course / Subject</span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCourseName}
                    onChange={(e) => {
                      haptic("light");
                      setSelectedCourseName(e.target.value);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-purple-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.name} className="bg-neutral-900 text-foreground">
                        {c.name}
                      </option>
                    ))}
                    <option value="General Study" className="bg-neutral-900 text-foreground">
                      General Study / Other
                    </option>
                  </select>
                </div>
              </div>

              {/* Box 3: Rest & Break Preference */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <span className="text-xs font-bold text-foreground">3. Rest &amp; Break Duration</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "adaptive", label: "Smart Adaptive" },
                    { id: "short_5m", label: "5m Short" },
                    { id: "standard_10m", label: "10m Deep" },
                    { id: "long_15m", label: "15m Recharge" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setBreakPreference(b.id as PomodoroBreakPref);
                      }}
                      className={cn(
                        "rounded-xl border py-1.5 text-center text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer",
                        breakPreference === b.id
                          ? "border-purple-500/50 bg-purple-600 text-white font-bold"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Box 4: Difficulty & Cognitive Intensity */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <span className="text-xs font-bold text-foreground">4. Cognitive Intensity &amp; Subject Difficulty</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "high_code", label: "💻 High Coding / Math", desc: "Complex logic & problem solving" },
                    { id: "conceptual", label: "🧠 Theoretical / Reading", desc: "Deep comprehension & synthesis" },
                    { id: "problem_solving", label: "⚡ Problem Sets / Pset", desc: "Active debugging & exercises" },
                    { id: "revision", label: "🔄 Revision & Polishing", desc: "Quick scanning & review" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setDifficulty(d.id as PomodoroDifficulty);
                      }}
                      className={cn(
                        "rounded-xl border p-2 text-left transition-all active:scale-95 touch-manipulation cursor-pointer",
                        difficulty === d.id
                          ? "border-purple-500 bg-purple-600/20 text-foreground font-bold ring-1 ring-purple-500/40"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <p className="text-xs font-semibold">{d.label}</p>
                      <p className="text-[0.62rem] text-muted-foreground truncate">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Box 5: Session Goal / Target Topic */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <span className="text-xs font-bold text-foreground">5. Specific Target Goal / Milestone</span>
                <input
                  type="text"
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(e.target.value)}
                  placeholder="e.g. Master Functions & Complete Problem Set 1..."
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Box 6: Preferred Rhythm */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <span className="text-xs font-bold text-foreground">6. Cognitive Rhythm</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: "ai_adaptive", label: "✨ AI Auto-Optimal" },
                    { id: "deep_50_10", label: "50m Focus / 10m Rest" },
                    { id: "classic_25_5", label: "25m Focus / 5m Rest" },
                    { id: "ultradian_90_20", label: "90m Ultradian Deep" },
                    { id: "sprint_15_3", label: "15m Sprint (Fast)" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setRhythm(r.id as PomodoroRhythm);
                      }}
                      className={cn(
                        "rounded-xl border py-1.5 px-2 text-center text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer",
                        rhythm === r.id
                          ? "border-purple-500/50 bg-purple-600 text-white font-bold"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Box 7: Active Recall Integration */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <span className="text-xs font-bold text-foreground">7. Active Recall Flashcards Strategy</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "session_end", label: "End of Session Drill" },
                    { id: "cycle_end", label: "After Every Cycle" },
                    { id: "none", label: "Manual Only" },
                  ].map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setActiveRecallStrategy(a.id as PomodoroRecallStrategy);
                      }}
                      className={cn(
                        "rounded-xl border py-1.5 text-center text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer",
                        activeRecallStrategy === a.id
                          ? "border-purple-500/50 bg-purple-600 text-white font-bold"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              disabled={isGeneratingPlan}
              onClick={handleGeneratePlan}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-400/50 bg-gradient-to-r from-purple-600 to-indigo-600 p-3.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all active:scale-95 hover:brightness-110 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPlan ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Calculating Optimal Execution Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate AI Execution Plan &amp; Schedule</span>
                </>
              )}
            </button>

            {/* ACCURATE RESULT VIEW */}
            {generatedPlan && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3 animate-panel-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">AI Optimized Schedule Ready</h4>
                      <p className="text-[0.62rem] text-muted-foreground">
                        Cognitive Efficiency Score: <span className="text-emerald-400 font-bold">{generatedPlan.efficiencyScore}/100</span>
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                    {generatedPlan.cyclesCount} Cycles
                  </span>
                </div>

                <p className="text-xs text-foreground leading-relaxed">
                  {generatedPlan.planSummary}
                </p>

                {/* Interval Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <span className="font-mono text-base font-bold text-primary">
                      {generatedPlan.recommendedFocusMinutes}m
                    </span>
                    <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Focus Interval</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <span className="font-mono text-base font-bold text-amber-400">
                      {generatedPlan.recommendedBreakMinutes}m
                    </span>
                    <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Rest Interval</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {generatedPlan.totalWorkMinutes}m
                    </span>
                    <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Net Focus Time</p>
                  </div>
                </div>

                {/* Milestones Sequence */}
                {generatedPlan.milestones && generatedPlan.milestones.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                      Execution Milestones:
                    </p>
                    <div className="space-y-1">
                      {generatedPlan.milestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2 text-xs text-foreground/90"
                        >
                          <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-emerald-400 font-mono">
                            #{idx + 1}
                          </span>
                          <span className="text-xs leading-snug">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cognitive Advice */}
                {generatedPlan.cognitivePacingAdvice && (
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 text-[0.7rem] text-purple-200/90 leading-relaxed">
                    💡 <span className="font-semibold">Cognitive Pacing:</span> {generatedPlan.cognitivePacingAdvice}
                  </div>
                )}

                {/* 1-Tap Start Button */}
                <button
                  type="button"
                  onClick={() => handleApplyAndStart(generatedPlan)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400 bg-emerald-500 p-3 text-xs font-bold text-black shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-all active:scale-95 hover:bg-emerald-400 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-black" />
                  <span>Start AI Optimized Session Now ({generatedPlan.recommendedFocusMinutes}m / {generatedPlan.recommendedBreakMinutes}m)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Time Monitoring & Note Analytics */}
        {activeTab === "analytics" && (
          <div className="mt-3 animate-panel-in space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-foreground">Time Monitor &amp; Study Tracking</h4>
              </div>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                Automatic real-time breakdown of time invested into each note, course distribution, and Pomodoro session logs.
              </p>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="font-mono text-xl font-bold text-primary">
                  {formatSeconds(totalTrackedSeconds)}
                </span>
                <p className="text-[0.62rem] uppercase tracking-wider text-muted-foreground mt-0.5">Total Study Time</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="font-mono text-xl font-bold text-emerald-400">
                  {Object.keys(noteTimeSpent).length}
                </span>
                <p className="text-[0.62rem] uppercase tracking-wider text-muted-foreground mt-0.5">Notes Studied</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="font-mono text-xl font-bold text-amber-400">
                  {completedSessions}
                </span>
                <p className="text-[0.62rem] uppercase tracking-wider text-muted-foreground mt-0.5">Cycles Finished</p>
              </div>
            </div>

            {/* Note-by-Note Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Time Spent on Each Note:</span>
                </h5>
                <span className="text-[0.65rem] text-muted-foreground font-mono">
                  Live tracking
                </span>
              </div>

              {Object.keys(noteTimeSpent).length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-xs text-muted-foreground">
                  <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-foreground">No note study sessions recorded yet</p>
                  <p className="mt-0.5 text-[0.68rem]">Start the timer while viewing any note to log active focus time!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto scroll-sleek pr-1">
                  {Object.values(noteTimeSpent)
                    .sort((a, b) => b.seconds - a.seconds)
                    .map((item) => {
                      const pct = totalTrackedSeconds > 0 ? (item.seconds / totalTrackedSeconds) * 100 : 0;
                      return (
                        <div
                          key={item.noteId}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5 transition-all hover:border-white/20"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-bold text-foreground truncate">{item.noteTitle}</p>
                              <p className="text-[0.65rem] text-muted-foreground truncate">{item.courseName}</p>
                            </div>
                            <span className="font-mono font-bold text-emerald-400 shrink-0">
                              {formatSeconds(item.seconds)}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                              style={{ width: `${Math.max(5, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Session History Log */}
            {sessionHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  <span>Recent Pomodoro Session Logs:</span>
                </h5>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto scroll-sleek pr-1">
                  {sessionHistory.slice(0, 10).map((sess) => (
                    <div
                      key={sess.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-semibold text-foreground truncate">{sess.noteTitle}</p>
                        <p className="text-[0.62rem] text-muted-foreground font-mono">
                          {new Date(sess.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {sess.courseName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-primary">{sess.durationMinutes}m focus</span>
                        <span className="block text-[0.6rem] text-emerald-400 font-bold">{sess.efficiencyScore}% score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
