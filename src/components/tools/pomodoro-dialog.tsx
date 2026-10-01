import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Coffee,
  FileText,
  Flame,
  Headphones,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipForward,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Volume2,
  VolumeX,
  Wand2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { SOUNDSCAPE_OPTIONS } from "@/lib/soundscapes";
import { cn } from "@/lib/utils";
import type { PomodoroState, PomodoroMode } from "@/hooks/use-pomodoro";
import {
  requestAIPomodoroPlan,
  type PomodoroBreakPref,
  type PomodoroDifficulty,
  type PomodoroPlanResult,
  type PomodoroRecallStrategy,
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

function formatSeconds(sec: number) {
  const safe = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(safe / 60);
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  const remSeconds = safe % 60;
  if (hours > 0) return hours + "h " + remMinutes + "m";
  if (minutes > 0) return minutes + "m " + remSeconds + "s";
  return remSeconds + "s";
}

function modeLabel(mode: PomodoroMode) {
  if (mode === "focus") return "Focused Study";
  return "Rest & Recharge";
}

function phaseName(mode: PomodoroMode) {
  if (mode === "shortBreak") return "Short Break";
  if (mode === "longBreak") return "Long Break";
  return "Focus";
}

function SessionRing({
  timeLeft,
  totalDuration,
  mode,
  isRunning,
  flowScore,
}: {
  timeLeft: number;
  totalDuration: number;
  mode: PomodoroMode;
  isRunning: boolean;
  flowScore: number;
}) {
  const circumference = 703.7;
  const elapsed = Math.max(0, totalDuration - timeLeft);
  const fraction = Math.min(1, totalDuration > 0 ? elapsed / totalDuration : 0);
  const offset = circumference * (1 - fraction);
  const angle = fraction * 360;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const time = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  const elapsedMinutes = Math.floor(elapsed / 60);

  return (
    <div className="relative my-5 flex w-full flex-col items-center justify-center">
      <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl" />

      <div className="relative flex h-72 w-72 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 260 260" aria-hidden>
          <defs>
            <linearGradient id="pomodoroTimerGradient" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#4cd7f6" />
              <stop offset="60%" stopColor="#4edea3" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="pomodoroPausedGradient" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="pomodoroRingGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur result="blur" stdDeviation="4.5" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <circle
            cx="130"
            cy="130"
            r="112"
            fill="none"
            stroke="rgba(255,255,255,.07)"
            strokeDasharray="4 6"
            strokeWidth="10"
          />
          <circle
            cx="130"
            cy="130"
            r="112"
            fill="none"
            stroke="rgba(255,255,255,.04)"
            strokeWidth="12"
          />
          <circle
            cx="130"
            cy="130"
            r="112"
            fill="none"
            filter={isRunning ? "url(#pomodoroRingGlow)" : undefined}
            stroke={isRunning ? "url(#pomodoroTimerGradient)" : "url(#pomodoroPausedGradient)"}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="12"
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out",
              isRunning ? "animate-[pomodoroRingBreathing_3s_ease-in-out_infinite]" : "animate-[pomodoroPausedPulse_2.5s_ease-in-out_infinite]",
            )}
          />
          <g transform={"rotate(" + angle + " 130 130)"} className="transition-transform duration-700 ease-out">
            <circle
              cx="242"
              cy="130"
              r="5"
              fill="#ffffff"
              stroke={isRunning ? "#4cd7f6" : "#fbbf24"}
              strokeWidth="2.5"
              className={cn(isRunning && "animate-[pomodoroHeadGlow_2s_ease-in-out_infinite]")}
            />
            <circle cx="242" cy="130" r="9" fill={isRunning ? "#4cd7f6" : "#fbbf24"} opacity=".35" />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-0.5 backdrop-blur-md">
            <Timer className={cn("h-3.5 w-3.5", isRunning ? "text-emerald-300" : "text-amber-300")} />
            <span className="text-[11px] font-semibold text-slate-400">
              {elapsedMinutes}m elapsed • {Math.round(totalDuration / 60)}m block
            </span>
          </div>
          <div className="font-mono text-[48px] font-extrabold tracking-tighter text-white drop-shadow-[0_0_20px_rgba(78,222,163,.35)] sm:text-[54px]">
            {time}
          </div>
          <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            {modeLabel(mode)}
          </span>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 backdrop-blur-md">
            <Waves className={cn("h-4 w-4", isRunning ? "text-cyan-300" : "text-amber-300")} />
            <span className={cn("text-[11px] font-semibold", isRunning ? "text-cyan-300" : "text-amber-300")}>
              {isRunning ? "Cognitive Flow: " + flowScore + "% Peak" : "Session Paused"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
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
    activePlan,
    noteTimeSpent,
    sessionHistory,
    totalTrackedSeconds,
    dailyGoalHours,
    todayFocusSeconds,
    setSoundscape,
    setSoundVolume,
    togglePlay,
    resetTimer,
    switchMode,
    setPreset,
    applyAIPlan,
    addTime,
    skipTime,
    completeSession,
    clearAnalytics,
  } = pomodoro;

  const [panel, setPanel] = useState<"session" | "ai" | "analytics">("session");
  const [soundOpen, setSoundOpen] = useState(false);
  const [targetHours, setTargetHours] = useState(2);
  const [selectedCourseName, setSelectedCourseName] = useState(activeCourse?.name || courses[0]?.name || "General Study");
  const [breakPreference, setBreakPreference] = useState<PomodoroBreakPref>("adaptive");
  const [difficulty, setDifficulty] = useState<PomodoroDifficulty>("high_code");
  const [sessionGoal, setSessionGoal] = useState(selectedNote ? "Master " + selectedNote.title : "Complete core study milestones");
  const [rhythm, setRhythm] = useState<PomodoroRhythm>("ai_adaptive");
  const [activeRecallStrategy, setActiveRecallStrategy] = useState<PomodoroRecallStrategy>("session_end");
  const [generatedPlan, setGeneratedPlan] = useState<PomodoroPlanResult | null>(activePlan);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [objectives, setObjectives] = useState<Record<string, boolean>>({});
  const [customTasks, setCustomTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);

  const flowScore = generatedPlan?.efficiencyScore || activePlan?.efficiencyScore || 94;

  const objectiveTexts = useMemo(() => {
    if (generatedPlan?.milestones?.length) return generatedPlan.milestones.slice(0, 3);
    return [
      selectedNote?.title ? "Study: " + selectedNote.title : "Review the active study material",
      activeCourse?.name ? "Practice key concepts for " + activeCourse.name : "Practice the key concepts from this block",
      "Review and consolidate key takeaways",
    ];
  }, [activeCourse?.name, generatedPlan, selectedNote?.title]);

  const objectiveList = [...objectiveTexts, ...customTasks];
  const completedObjectiveCount = objectiveList.filter((item) => objectives[item]).length;

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
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleApplyPlan = (plan: PomodoroPlanResult) => {
    haptic("heavy");
    applyAIPlan(plan);
    setGeneratedPlan(plan);
    setPanel("session");
  };

  const handleAddTask = () => {
    const value = taskInput.trim();
    if (!value) return;
    setCustomTasks((prev) => [...prev, value]);
    setTaskInput("");
    setShowTaskInput(false);
  };

  const handleHeaderSoundToggle = () => {
    haptic("light");
    setSoundscape((current) => {
      if (current === "none") return "rain";
      return "none";
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        haptic(value ? "medium" : "light");
        onOpenChange(value);
      }}
    >
      <DialogContent className="fixed inset-0 m-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#0f131c] p-0 text-[#dfe2ef] shadow-none sm:inset-1/2 sm:h-[96vh] sm:w-[min(620px,calc(100vw-2rem))] sm:max-w-[620px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:border sm:border-white/10 sm:shadow-2xl">
        <style>{\`
          @keyframes pomodoroRingBreathing{0%,100%{filter:drop-shadow(0 0 10px rgba(78,222,163,.4)) drop-shadow(0 0 22px rgba(76,215,246,.25))}50%{filter:drop-shadow(0 0 18px rgba(78,222,163,.75)) drop-shadow(0 0 32px rgba(76,215,246,.45))}}
          @keyframes pomodoroPausedPulse{0%,100%{filter:drop-shadow(0 0 6px rgba(251,191,36,.3));opacity:.75}50%{filter:drop-shadow(0 0 14px rgba(251,191,36,.6));opacity:.95}}
          @keyframes pomodoroHeadGlow{0%,100%{transform:scale(1);filter:drop-shadow(0 0 5px #4cd7f6) drop-shadow(0 0 12px #4edea3)}50%{transform:scale(1.3);filter:drop-shadow(0 0 10px #4cd7f6) drop-shadow(0 0 20px #6ffbbe)}}
        \`}</style>

        <header className="z-50 shrink-0 border-b border-white/[0.06] bg-[#0a0e17]/90 px-5 pb-2 backdrop-blur-2xl pt-[calc(.75rem+env(safe-area-inset-top,0px))]">
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
                onClick={handleHeaderSoundToggle}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95",
                  soundscape === "none" ? "bg-white/[0.05] text-slate-400" : "bg-cyan-400/10 text-cyan-300",
                )}
              >
                <Waves className="h-5 w-5" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-[#003824]">
                <Headphones className="h-[18px] w-[18px]" />
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {panel === "session" ? (
            <main className="flex w-full flex-col px-5 pb-10">
              <div className="flex flex-col gap-2 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex max-w-[70%] items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#4cd7f6]" />
                    <span className="truncate">{activeCourse?.name || "General Study"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Focus Phase {String((completedSessions % 4) + 1)} of 4
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <h1 className="font-sans text-[26px] font-bold tracking-tight text-white sm:text-[30px]">
                    {selectedNote?.title || phaseName(mode)}
                  </h1>
                  <p className="flex items-center gap-1.5 text-[12px] text-slate-400">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
                    {selectedNote ? "Active note • Live focus tracking" : phaseName(mode) + " • Live focus tracking"}
                  </p>
                </div>
              </div>

              <SessionRing
                timeLeft={timeLeft}
                totalDuration={totalDuration}
                mode={mode}
                isRunning={isRunning}
                flowScore={flowScore}
              />

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Add 5 Minutes"
                  onClick={() => {
                    haptic("light");
                    addTime(300);
                  }}
                  className="flex h-12 flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] text-sm font-semibold text-white shadow-sm backdrop-blur-md active:scale-95"
                >
                  <Plus className="h-[18px] w-[18px] text-emerald-300" />
                  +5m
                </button>

                <button
                  type="button"
                  aria-label={isRunning ? "Pause Session" : "Start Session"}
                  onClick={() => {
                    haptic("heavy");
                    togglePlay();
                  }}
                  className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-[0_0_28px_rgba(16,185,129,.5)] transition-transform active:scale-90",
                    isRunning
                      ? "bg-gradient-to-tr from-emerald-700 via-emerald-400 to-emerald-200 text-[#022115]"
                      : "bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 text-stone-900 shadow-[0_0_24px_rgba(245,158,11,.4)]",
                  )}
                >
                  {isRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
                </button>

                <button
                  type="button"
                  aria-label="Skip Interval"
                  onClick={() => {
                    haptic("medium");
                    skipTime(300);
                  }}
                  className="flex h-12 flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] text-sm font-semibold text-slate-200 shadow-sm backdrop-blur-md active:scale-95"
                >
                  Skip
                  <SkipForward className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phase</span>
                {([
                  { id: "focus" as PomodoroMode, label: settings.focusMinutes + "m Focus" },
                  { id: "shortBreak" as PomodoroMode, label: settings.shortBreakMinutes + "m Short" },
                  { id: "longBreak" as PomodoroMode, label: settings.longBreakMinutes + "m Long" },
                ]).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      haptic("light");
                      switchMode(item.id);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] font-bold transition-transform active:scale-95",
                      mode === item.id
                        ? item.id === "focus"
                          ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-300"
                          : item.id === "shortBreak"
                            ? "border-amber-300/40 bg-amber-300/15 text-amber-300"
                            : "border-cyan-300/40 bg-cyan-300/15 text-cyan-300"
                        : "border-white/[0.07] bg-white/[0.03] text-slate-400",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    resetTimer();
                  }}
                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-[10px] font-bold text-slate-400 active:scale-95"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setPreset(25, 5);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-bold active:scale-95",
                    settings.focusMinutes === 25 ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-300" : "border-white/[0.07] bg-white/[0.03] text-slate-400",
                  )}
                >
                  25 / 5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setPreset(50, 10);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-bold active:scale-95",
                    settings.focusMinutes === 50 ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-300" : "border-white/[0.07] bg-white/[0.03] text-slate-400",
                  )}
                >
                  50 / 10
                </button>
              </div>

              <section className="mt-5 flex flex-col gap-3 rounded-2xl bg-white/[0.05] p-4 shadow-md backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                      <CheckCircle2 className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Session Objectives</h2>
                      <span className="text-[10px] text-slate-400">
                        {completedObjectiveCount} of {objectiveList.length || 1} verified in session
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Add micro-task"
                    onClick={() => setShowTaskInput((value) => !value)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-emerald-300 active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {objectiveList.slice(0, 6).map((item, index) => {
                    const done = !!objectives[item];
                    return (
                      <button
                        key={item + index}
                        type="button"
                        onClick={() => {
                          haptic("light");
                          setObjectives((prev) => ({ ...prev, [item]: !prev[item] }));
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-2.5 text-left transition-transform active:scale-[0.99]",
                          done ? "bg-white/[0.06] opacity-90" : index === 1 ? "bg-white/[0.08]" : "bg-white/[0.035]",
                        )}
                      >
                        <span className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          done ? "bg-emerald-300 text-[#003824]" : "bg-[#0a0e17]",
                        )}>
                          {done ? <Check className="h-3.5 w-3.5" /> : <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[13px]", done ? "text-slate-400 line-through" : "text-white")}>{item}</span>
                          <span className="mt-0.5 block text-[10px] text-slate-500">{done ? "Verified" : index === 1 ? "Active Objective" : "Pending"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {showTaskInput ? (
                  <div className="flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5">
                    <input
                      value={taskInput}
                      onChange={(event) => setTaskInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleAddTask();
                      }}
                      placeholder="Add micro-task..."
                      className="w-full bg-transparent py-1 text-xs text-white outline-none placeholder:text-slate-500"
                      autoFocus
                    />
                    <button type="button" onClick={handleAddTask} className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 active:scale-95">Add</button>
                  </div>
                ) : null}
              </section>

              <section className="mt-4 flex flex-col gap-3 rounded-2xl bg-white/[0.05] p-4 shadow-md backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                      <Volume2 className="h-[19px] w-[19px]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audio Focus Environment</span>
                      <h2 className="text-sm font-semibold text-white">
                        {soundscape === "none" ? "Soundscape Off" : "Binaural Beats (Gamma 40Hz)"}
                      </h2>
                    </div>
                  </div>
                  {soundscape !== "none" && isRunning ? (
                    <div className="flex h-6 items-end gap-1 px-1">
                      <span className="h-5 w-1 animate-bounce rounded-full bg-cyan-300" />
                      <span className="h-3 w-1 animate-bounce rounded-full bg-emerald-300" />
                      <span className="h-6 w-1 animate-bounce rounded-full bg-cyan-300" />
                      <span className="h-4 w-1 animate-bounce rounded-full bg-emerald-300" />
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setSoundOpen((value) => !value)}
                      className="flex h-10 w-full items-center justify-between rounded-full bg-white/[0.07] px-3 text-xs font-semibold text-white"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <Headphones className="h-4 w-4 text-cyan-300" />
                        {SOUNDSCAPE_OPTIONS.find((item) => item.id === soundscape)?.name || "Mute"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                    {soundOpen ? (
                      <div className="absolute bottom-11 left-0 z-50 w-full rounded-2xl border border-white/10 bg-[#151b26] p-1.5 shadow-2xl">
                        {SOUNDSCAPE_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              haptic("light");
                              setSoundscape(option.id);
                              setSoundOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs active:scale-[0.99]",
                              soundscape === option.id ? "bg-emerald-300/10 text-emerald-300" : "text-slate-300 hover:bg-white/[0.05]",
                            )}
                          >
                            <span className="text-base">{option.icon}</span>
                            <span className="truncate">{option.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex w-32 items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2">
                    <VolumeX className="h-4 w-4 text-slate-400" />
                    <Slider
                      value={[soundVolume * 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => setSoundVolume((value[0] || 0) / 100)}
                    />
                    <Volume2 className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </section>

              <div className="mt-2 flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    haptic("heavy");
                    completeSession();
                  }}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-cyan-300 text-sm font-bold text-[#022115] shadow-[0_0_24px_rgba(16,185,129,.35)] active:scale-[.98]"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Complete & Log Session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    switchMode("shortBreak");
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/[0.05] text-sm font-semibold text-slate-300 active:scale-[.98]"
                >
                  <Coffee className="h-[18px] w-[18px] text-amber-300" />
                  Take 5m Bio Break
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPanel("ai")}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs font-bold text-violet-200 active:scale-[.98]"
                >
                  <Wand2 className="h-4 w-4 text-violet-300" />
                  AI Planner
                </button>
                <button
                  type="button"
                  onClick={() => setPanel("analytics")}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs font-bold text-cyan-200 active:scale-[.98]"
                >
                  <BarChart3 className="h-4 w-4 text-cyan-300" />
                  Time Monitor
                </button>
              </div>
            </main>
          ) : null}

          {panel === "ai" ? (
            <main className="flex w-full flex-col gap-4 px-5 pb-10 pt-4">
              <button type="button" onClick={() => setPanel("session")} className="flex items-center gap-2 self-start text-xs font-bold text-emerald-300">
                <ArrowDown className="h-4 w-4 rotate-90" /> Back to Session
              </button>

              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                  <h2 className="text-sm font-bold text-white">AI Automatic Pomodoro Planner</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Gemini calculates focus/rest intervals, milestones, cognitive pacing and an execution plan from your selected study context.</p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Total Study Duration</span>
                    <span className="font-mono text-violet-300">{targetHours}h • {Math.round(targetHours * 60)}m</span>
                  </div>
                  <div className="mt-2 flex gap-1.5 overflow-x-auto">
                    {[0.5, 1, 1.5, 2, 2.5, 3, 4].map((hours) => (
                      <button key={hours} type="button" onClick={() => setTargetHours(hours)} className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold", targetHours === hours ? "bg-violet-500 text-white" : "bg-white/[0.05] text-slate-400")}>{hours}h</button>
                    ))}
                  </div>
                </div>

                <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-xs font-bold text-white">Course / Subject</span>
                  <select value={selectedCourseName} onChange={(event) => setSelectedCourseName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e17] px-3 py-2 text-xs text-white outline-none">
                    {courses.map((course) => <option key={course.id} value={course.name}>{course.name}</option>)}
                    <option value="General Study">General Study / Other</option>
                  </select>
                </label>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-xs font-bold text-white">Rest & Break Duration</span>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {[
                      { id: "adaptive" as PomodoroBreakPref, label: "Smart Adaptive" },
                      { id: "short_5m" as PomodoroBreakPref, label: "5m Short" },
                      { id: "standard_10m" as PomodoroBreakPref, label: "10m Deep" },
                      { id: "long_15m" as PomodoroBreakPref, label: "15m Recharge" },
                    ].map((item) => (
                      <button key={item.id} type="button" onClick={() => setBreakPreference(item.id)} className={cn("rounded-xl border py-2 text-[11px] font-bold", breakPreference === item.id ? "border-violet-500/50 bg-violet-500 text-white" : "border-white/10 text-slate-400")}>{item.label}</button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-xs font-bold text-white">Cognitive Intensity</span>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      { id: "high_code" as PomodoroDifficulty, label: "High Coding / Math" },
                      { id: "conceptual" as PomodoroDifficulty, label: "Theoretical / Reading" },
                      { id: "problem_solving" as PomodoroDifficulty, label: "Problem Sets" },
                      { id: "revision" as PomodoroDifficulty, label: "Revision" },
                    ].map((item) => (
                      <button key={item.id} type="button" onClick={() => setDifficulty(item.id)} className={cn("rounded-xl border p-2 text-left text-[11px] font-bold", difficulty === item.id ? "border-violet-500 bg-violet-500/20 text-white" : "border-white/10 text-slate-400")}>{item.label}</button>
                    ))}
                  </div>
                </div>

                <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-xs font-bold text-white">Specific Target Goal / Milestone</span>
                  <input value={sessionGoal} onChange={(event) => setSessionGoal(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e17] px-3 py-2 text-xs text-white outline-none" />
                </label>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-xs font-bold text-white">Cognitive Rhythm</span>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      { id: "ai_adaptive" as PomodoroRhythm, label: "AI Auto-Optimal" },
                      { id: "deep_50_10" as PomodoroRhythm, label: "50m / 10m" },
                      { id: "classic_25_5" as PomodoroRhythm, label: "25m / 5m" },
                      { id: "ultradian_90_20" as PomodoroRhythm, label: "90m / 20m" },
                      { id: "sprint_15_3" as PomodoroRhythm, label: "15m / 3m" },
                    ].map((item) => (
                      <button key={item.id} type="button" onClick={() => setRhythm(item.id)} className={cn("rounded-xl border py-2 text-[11px] font-bold", rhythm === item.id ? "border-violet-500/50 bg-violet-500 text-white" : "border-white/10 text-slate-400")}>{item.label}</button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-xs font-bold text-white">Active Recall Flashcards Strategy</span>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {[
                      { id: "session_end" as PomodoroRecallStrategy, label: "Session End" },
                      { id: "cycle_end" as PomodoroRecallStrategy, label: "Every Cycle" },
                      { id: "none" as PomodoroRecallStrategy, label: "Manual Only" },
                    ].map((item) => (
                      <button key={item.id} type="button" onClick={() => setActiveRecallStrategy(item.id)} className={cn("rounded-xl border py-2 text-[11px] font-bold", activeRecallStrategy === item.id ? "border-violet-500/50 bg-violet-500 text-white" : "border-white/10 text-slate-400")}>{item.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="button" disabled={isGeneratingPlan} onClick={handleGeneratePlan} className="flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-xs font-bold text-white disabled:opacity-50">
                {isGeneratingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGeneratingPlan ? "Calculating Optimal Execution Plan..." : "Generate AI Execution Plan & Schedule"}
              </button>

              {generatedPlan ? (
                <div className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      <div>
                        <h3 className="text-xs font-bold text-white">AI Optimized Schedule Ready</h3>
                        <p className="text-[10px] text-slate-400">Cognitive Efficiency Score: <span className="font-bold text-emerald-300">{generatedPlan.efficiencyScore}/100</span></p>
                      </div>
                    </div>
                    <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">{generatedPlan.cyclesCount} Cycles</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{generatedPlan.planSummary}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/[0.04] p-2"><span className="font-mono text-lg font-bold text-emerald-300">{generatedPlan.recommendedFocusMinutes}m</span><p className="text-[9px] uppercase tracking-wider text-slate-500">Focus</p></div>
                    <div className="rounded-xl bg-white/[0.04] p-2"><span className="font-mono text-lg font-bold text-amber-300">{generatedPlan.recommendedBreakMinutes}m</span><p className="text-[9px] uppercase tracking-wider text-slate-500">Rest</p></div>
                    <div className="rounded-xl bg-white/[0.04] p-2"><span className="font-mono text-lg font-bold text-cyan-300">{generatedPlan.totalWorkMinutes}m</span><p className="text-[9px] uppercase tracking-wider text-slate-500">Net Focus</p></div>
                  </div>
                  {generatedPlan.milestones?.length ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Execution Milestones</p>
                      {generatedPlan.milestones.map((item, index) => (
                        <div key={item + index} className="flex items-start gap-2 rounded-xl bg-white/[0.03] p-2 text-[11px] text-slate-300">
                          <span className="rounded-md bg-emerald-300/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300">#{index + 1}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="rounded-xl bg-violet-400/10 p-2.5 text-[10px] leading-relaxed text-violet-200"><span className="font-bold">Cognitive Pacing:</span> {generatedPlan.cognitivePacingAdvice}</div>
                  <button type="button" onClick={() => handleApplyPlan(generatedPlan)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-[#002b1b] active:scale-[.98]">
                    <Play className="h-4 w-4 fill-current" /> Start AI Optimized Session Now
                  </button>
                  {selectedNote && onOpenFlashcards ? (
                    <button type="button" onClick={() => onOpenFlashcards(selectedNote)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 text-xs font-bold text-violet-200 active:scale-[.98]">
                      <Brain className="h-4 w-4" /> Open Flashcards for this Note
                    </button>
                  ) : null}
                </div>
              ) : null}
            </main>
          ) : null}

          {panel === "analytics" ? (
            <main className="flex w-full flex-col gap-4 px-5 pb-10 pt-4">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setPanel("session")} className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <ArrowDown className="h-4 w-4 rotate-90" /> Back to Session
                </button>
                <button type="button" onClick={() => { haptic("light"); clearAnalytics(); }} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clear</button>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cyan-300" />
                  <h2 className="text-sm font-bold text-white">Time Monitor & Study Tracking</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Automatic real-time breakdown of time invested into each note and Pomodoro session logs.</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="font-mono text-lg font-bold text-emerald-300">{formatSeconds(totalTrackedSeconds)}</span>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">Total Study</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="font-mono text-lg font-bold text-cyan-300">{Object.keys(noteTimeSpent).length}</span>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">Notes Studied</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <span className="font-mono text-lg font-bold text-amber-300">{completedSessions}</span>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">Cycles Finished</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-white"><FileText className="h-4 w-4 text-emerald-300" /> Time Spent on Each Note</h3>
                  <span className="text-[10px] font-mono text-slate-500">Live tracking</span>
                </div>

                {Object.values(noteTimeSpent).length ? (
                  <div className="max-h-56 space-y-2 overflow-y-auto overscroll-contain">
                    {Object.values(noteTimeSpent).sort((a, b) => b.seconds - a.seconds).map((item) => {
                      const pct = totalTrackedSeconds > 0 ? (item.seconds / totalTrackedSeconds) * 100 : 0;
                      return (
                        <div key={item.noteId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-white">{item.noteTitle}</p>
                              <p className="truncate text-[10px] text-slate-500">{item.courseName}</p>
                            </div>
                            <span className="shrink-0 font-mono text-xs font-bold text-emerald-300">{formatSeconds(item.seconds)}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300" style={{ width: Math.max(5, pct) + "%" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Timer className="mx-auto h-7 w-7 text-slate-600" />
                    <p className="mt-2 text-xs font-semibold text-white">No note study sessions recorded yet</p>
                    <p className="mt-1 text-[10px] text-slate-500">Start the timer while viewing a note to log active focus time.</p>
                  </div>
                )}
              </div>

              {sessionHistory.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white"><Award className="h-4 w-4 text-amber-300" /> Recent Pomodoro Session Logs</h3>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto overscroll-contain">
                    {sessionHistory.slice(0, 10).map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{session.noteTitle}</p>
                          <p className="truncate text-[10px] font-mono text-slate-500">{new Date(session.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {session.courseName}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block font-mono text-[10px] font-bold text-emerald-300">{session.durationMinutes}m focus</span>
                          <span className="block text-[9px] font-bold text-cyan-300">{session.efficiencyScore}% score</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Today’s Focus Goal</span>
                  <span className="font-mono font-bold text-emerald-300">{Math.floor(todayFocusSeconds / 60)}m / {Math.round(dailyGoalHours * 60)}m</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300" style={{ width: Math.min(100, Math.round((todayFocusSeconds / Math.max(60, dailyGoalHours * 3600)) * 100)) + "%" }} />
                </div>
              </div>
            </main>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
