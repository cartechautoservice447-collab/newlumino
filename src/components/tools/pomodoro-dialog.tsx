import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  CheckCircle2,
  Sliders,
  SkipForward,
  Brain,
  Clock,
  BarChart3,
  Wand2,
  Target,
  Zap,
  Calendar,
  Layers,
  FileText,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="glass-panel max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 bg-black/90 p-5 sm:p-7 shadow-2xl backdrop-blur-3xl scroll-sleek sm:max-w-[540px]">
        {/* Top Header */}
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  Pomodoro &amp; Focus Engine
                </DialogTitle>
                <p className="text-[0.68rem] text-muted-foreground">
                  AI Automatic Planning • Live Note Monitoring • Active Soundscapes
                </p>
              </div>
            </div>

            {completedSessions > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
                <Flame className="h-3.5 w-3.5 fill-primary" />
                <span>{completedSessions} done</span>
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Navigation Tabs (Timer / AI Planner / Analytics) */}
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 select-none">
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setActiveTab("timer");
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all touch-manipulation cursor-pointer",
              activeTab === "timer"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Timer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic("light");
              setActiveTab("ai_planner");
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all touch-manipulation cursor-pointer",
              activeTab === "ai_planner"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>AI Plan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic("light");
              setActiveTab("analytics");
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all touch-manipulation cursor-pointer",
              activeTab === "analytics"
                ? "bg-emerald-500 text-black shadow-md font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Time Monitor</span>
          </button>
        </div>

        {/* TAB 1: Classic Timer & Audio Engine */}
        {activeTab === "timer" && (
          <div className="mt-3 animate-panel-in space-y-4">
            {/* Phase Mode Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  switchMode("focus");
                }}
                className={cn(
                  "rounded-xl py-1.5 text-xs font-bold transition-all touch-manipulation cursor-pointer",
                  mode === "focus"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Focus ({settings.focusMinutes}m)
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  switchMode("shortBreak");
                }}
                className={cn(
                  "rounded-xl py-1.5 text-xs font-bold transition-all touch-manipulation cursor-pointer",
                  mode === "shortBreak"
                    ? "bg-amber-400 text-black shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Short Break ({settings.shortBreakMinutes}m)
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  switchMode("longBreak");
                }}
                className={cn(
                  "rounded-xl py-1.5 text-xs font-bold transition-all touch-manipulation cursor-pointer",
                  mode === "longBreak"
                    ? "bg-cyan-400 text-black shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Long Break ({settings.longBreakMinutes}m)
              </button>
            </div>

            {/* Circular Progress & Clock Face */}
            <div className="relative my-2 flex items-center justify-center">
              <svg className="h-48 w-48 -rotate-90 transform" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className="stroke-white/10"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="9"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className={cn(
                    "transition-all duration-700 ease-linear",
                    mode === "focus"
                      ? "text-primary drop-shadow-[0_0_12px_hsl(var(--primary))]"
                      : "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                  )}
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                  {timeFormatted}
                </span>
                <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {mode === "focus" ? "Focused Study" : "Rest & Recharge"}
                </span>
                {selectedNote && mode === "focus" && (
                  <span className="mt-0.5 truncate max-w-[150px] text-[0.62rem] text-primary/80 font-medium">
                    📖 {selectedNote.title}
                  </span>
                )}
              </div>
            </div>

            {/* Primary Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Reset timer"
                onClick={() => {
                  haptic("light");
                  resetTimer();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation cursor-pointer"
                title="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic("heavy");
                  togglePlay();
                }}
                className={cn(
                  "flex h-13 w-28 items-center justify-center gap-2 rounded-2xl border font-bold text-sm shadow-xl transition-transform active:scale-95 touch-manipulation cursor-pointer",
                  isRunning
                    ? "border-amber-400/40 bg-amber-400 text-black hover:bg-amber-300"
                    : "border-primary/40 bg-primary text-primary-foreground hover:brightness-110"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-5 w-5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 fill-current" />
                    <span>Start</span>
                  </>
                )}
              </button>

              <button
                type="button"
                aria-label="Skip to next phase"
                onClick={() => {
                  haptic("medium");
                  switchMode(mode === "focus" ? "shortBreak" : "focus");
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation cursor-pointer"
                title="Skip to next phase"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Interval Presets */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
                Intervals:
              </span>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setPreset(25, 5);
                }}
                className={cn(
                  "rounded-xl border px-3 py-1 text-xs font-mono font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer",
                  settings.focusMinutes === 25
                    ? "border-primary/40 bg-primary/20 text-primary font-bold"
                    : "border-white/10 bg-white/[0.04] text-muted-foreground"
                )}
              >
                25m / 5m
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setPreset(50, 10);
                }}
                className={cn(
                  "rounded-xl border px-3 py-1 text-xs font-mono font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer",
                  settings.focusMinutes === 50
                    ? "border-primary/40 bg-primary/20 text-primary font-bold"
                    : "border-white/10 bg-white/[0.04] text-muted-foreground"
                )}
              >
                50m / 10m
              </button>
            </div>

            {/* Ambient Soundscape Section */}
            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Ambient Soundscape</p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    Plays automatically during active study sessions
                  </p>
                </div>
                {soundscape !== "none" && isRunning && (
                  <span className="flex items-center gap-1 text-[0.65rem] font-bold text-primary animate-pulse">
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Playing</span>
                  </span>
                )}
              </div>

              {/* Soundscape Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SOUNDSCAPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setSoundscape(opt.id);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2 text-left transition-all active:scale-95 touch-manipulation cursor-pointer",
                      soundscape === opt.id
                        ? "border-primary/50 bg-primary/15 text-foreground font-bold shadow-sm"
                        : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                    )}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-tight truncate">{opt.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Volume Slider */}
              {soundscape !== "none" && (
                <div className="flex items-center gap-3 pt-1">
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                  <Slider
                    value={[soundVolume * 100]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(val) => setSoundVolume(val[0] / 100)}
                    className="flex-1"
                  />
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
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
      </DialogContent>
    </Dialog>
  );
}
