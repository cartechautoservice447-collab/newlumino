import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Award,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Flame,
  Zap,
  Target,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";

export interface DiagnosticQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topicTag: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  selectedNote: Note | null;
  activeCourseName?: string | null;
  onStartFlashcards?: (note: Note) => void;
}

export function AiExamSimulatorDialog({
  open,
  onOpenChange,
  notes,
  selectedNote,
  activeCourseName,
  onStartFlashcards,
}: Props) {
  const { showNotification } = useNotifications();

  // Configuration state
  const [activeTargetNoteId, setActiveTargetNoteId] = useState<string>(
    selectedNote?.id || (notes[0]?.id ?? "")
  );
  const [drillMode, setDrillMode] = useState<"5m_sprint" | "10m_standard" | "15m_comprehensive">("5m_sprint");
  const [difficulty, setDifficulty] = useState<"balanced" | "challenging" | "code_heavy">("balanced");

  // Exam execution state
  const [stage, setStage] = useState<"config" | "loading" | "taking" | "summary">("config");
  const [examTitle, setExamTitle] = useState("");
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const targetNote = notes.find((n) => n.id === activeTargetNoteId) || selectedNote || notes[0] || null;

  // Sync selectedNote when dialog opens
  useEffect(() => {
    if (open && selectedNote) {
      setActiveTargetNoteId(selectedNote.id);
    }
  }, [open, selectedNote]);

  // Handle countdown timer during exam
  useEffect(() => {
    if (stage === "taking") {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  const handleStartExam = async () => {
    if (!targetNote) {
      showNotification({
        message: "No Note Selected",
        description: "Select a note to generate your diagnostic mock exam.",
        type: "warning",
      });
      return;
    }

    haptic("medium");
    setStage("loading");

    try {
      const res = await fetch("/api/ai/exam-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteTitle: targetNote.title,
          noteBody: targetNote.body,
          courseName: activeCourseName || "Study Notes",
          drillMode,
          difficulty,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setExamTitle(data.examTitle || `${targetNote.title} • Diagnostic Exam`);
        setCurrentIndex(0);
        setUserAnswers({});
        setSelectedOption(null);
        setRevealed(false);
        const totalSec = (data.durationMinutes || 5) * 60;
        setSecondsRemaining(totalSec);
        setStage("taking");
        haptic("success");
      } else {
        throw new Error("No questions returned");
      }
    } catch (err) {
      console.error("Exam generation failed:", err);
      showNotification({
        message: "Exam Generation Failed",
        description: "Could not synthesize test. Check network connection.",
        type: "error",
      });
      setStage("config");
    }
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;
    haptic("light");
    setRevealed(true);
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: selectedOption }));
  };

  const handleNextQuestion = () => {
    haptic("light");
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setRevealed(false);
    } else {
      handleFinishExam();
    }
  };

  const handleFinishExam = () => {
    haptic("success");
    setStage("summary");

    // Calculate score
    let correct = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });

    const percent = Math.round((correct / (questions.length || 1)) * 100);
    if (percent >= 75) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#38bdf8", "#a855f7"],
      });
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Score calculations
  const totalCorrect = questions.reduce(
    (acc, q, idx) => (userAnswers[idx] === q.correctIndex ? acc + 1 : acc),
    0
  );
  const scorePercent = questions.length ? Math.round((totalCorrect / questions.length) * 100) : 0;
  const weakTopics = questions
    .filter((q, idx) => userAnswers[idx] !== q.correctIndex)
    .map((q) => q.topicTag);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel scroll-sleek max-h-[90vh] overflow-y-auto border-white/10 sm:max-w-[620px] p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-rose-500/30 text-amber-300 border border-amber-500/30 shadow-[0_0_16px_-4px_rgba(245,158,11,0.5)]">
                <Target className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight">
                  AI Adaptive Exam Simulator
                </DialogTitle>
                <p className="text-[0.68rem] text-muted-foreground">
                  Diagnostic mock exams synthesized with Gemini
                </p>
              </div>
            </div>

            {stage === "taking" && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-mono font-bold text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* STAGE 1: CONFIGURATION */}
        {stage === "config" && (
          <div className="space-y-4 pt-2">
            {/* Note Selector */}
            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                Select Exam Target Note
              </label>
              <select
                value={activeTargetNoteId}
                onChange={(e) => {
                  haptic("light");
                  setActiveTargetNoteId(e.target.value);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id} className="bg-slate-900 text-foreground">
                    {n.title || "Untitled Note"}
                  </option>
                ))}
              </select>
            </div>

            {/* Drill Mode / Duration */}
            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                Drill Duration &amp; Question Depth
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "5m_sprint", label: "5m Sprint", desc: "5 Rapid MCQs", icon: Zap },
                  { id: "10m_standard", label: "10m Standard", desc: "7 Core Questions", icon: Target },
                  { id: "15m_comprehensive", label: "15m Deep", desc: "10 Rigorous Items", icon: Flame },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = drillMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setDrillMode(item.id as any);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition-all cursor-pointer active:scale-95",
                        isSelected
                          ? "border-primary/50 bg-primary/20 text-foreground ring-1 ring-primary/40"
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[0.62rem] text-muted-foreground">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Setting */}
            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                Exam Cognitive Rigor
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "balanced", label: "Standard Core" },
                  { id: "challenging", label: "Deep Conceptual" },
                  { id: "code_heavy", label: "Code & Logic Audit" },
                ].map((item) => {
                  const isSelected = difficulty === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setDifficulty(item.id as any);
                      }}
                      className={cn(
                        "rounded-xl border py-2 px-2 text-center text-xs font-semibold transition cursor-pointer active:scale-95",
                        isSelected
                          ? "border-amber-500/50 bg-amber-500/15 text-foreground ring-1 ring-amber-500/40"
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Note Preview pill */}
            {targetNote && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Exam Scope: </span>
                {targetNote.body ? `${targetNote.body.slice(0, 140)}...` : "Empty note content."}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartExam}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-primary to-emerald-500 py-3 text-xs font-bold text-white shadow-xl hover:opacity-95 active:scale-98 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Synthesize &amp; Start Diagnostic Mock Exam</span>
            </button>
          </div>
        )}

        {/* STAGE 2: LOADING */}
        {stage === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_24px_rgba(16,185,129,0.4)]">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Synthesizing Diagnostic Drill</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Gemini is parsing "{targetNote?.title}" to engineer high-yield practice questions...
              </p>
            </div>
          </div>
        )}

        {/* STAGE 3: EXAM IN PROGRESS */}
        {stage === "taking" && questions[currentIndex] && (
          <div className="space-y-4 pt-2">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-foreground font-mono">
                  {questions[currentIndex].topicTag}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question prompt */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                {questions[currentIndex].question}
              </h3>

              {questions[currentIndex].codeSnippet && (
                <pre className="rounded-xl border border-white/10 bg-black/50 p-3 text-xs font-mono text-emerald-400 overflow-x-auto">
                  <code>{questions[currentIndex].codeSnippet}</code>
                </pre>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              {questions[currentIndex].options.map((option, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === questions[currentIndex].correctIndex;
                let borderStyle = "border-white/5 bg-white/[0.02]";

                if (revealed) {
                  if (isCorrect) borderStyle = "border-emerald-500/60 bg-emerald-500/20 text-emerald-300";
                  else if (isSelected && !isCorrect)
                    borderStyle = "border-rose-500/60 bg-rose-500/20 text-rose-300";
                } else if (isSelected) {
                  borderStyle = "border-primary/50 bg-primary/20 text-foreground ring-1 ring-primary/40";
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={revealed}
                    onClick={() => {
                      haptic("light");
                      setSelectedOption(optIdx);
                    }}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer active:scale-98 text-xs sm:text-sm",
                      borderStyle,
                      !revealed && "hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/10 text-[0.68rem] font-bold">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-relaxed">{option}</span>
                    {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {revealed && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box after answer confirmation */}
            {revealed && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs space-y-1 animate-in fade-in">
                <span className="font-bold text-sky-400">💡 Rational Explanation:</span>
                <p className="text-muted-foreground leading-relaxed">
                  {questions[currentIndex].explanation}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {!revealed ? (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleConfirmAnswer}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40 transition cursor-pointer"
                >
                  Confirm Choice
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
                >
                  <span>{currentIndex + 1 < questions.length ? "Next Question" : "View Diagnostic Report"}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE 4: POST-EXAM SUMMARY & DIAGNOSTIC REPORT */}
        {stage === "summary" && (
          <div className="space-y-4 pt-2 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
              <Award className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Diagnostic Drill Completed</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{examTitle}</p>
            </div>

            {/* Score Metric Card */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
              <div>
                <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">Score</span>
                <p className="text-xl font-bold font-mono text-primary">{scorePercent}%</p>
              </div>
              <div>
                <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">Correct</span>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {totalCorrect}/{questions.length}
                </p>
              </div>
              <div>
                <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">Readiness</span>
                <p className="text-xs font-bold text-foreground mt-1">
                  {scorePercent >= 80 ? "🔥 Exam Ready" : scorePercent >= 60 ? "⚡ Good Base" : "⚠️ Needs Review"}
                </p>
              </div>
            </div>

            {/* Weak Spots Detected */}
            {weakTopics.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Cognitive Blindspots Detected:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(weakTopics)).map((topic, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-amber-200"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStage("config")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-foreground hover:bg-white/[0.08] transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retake / New Drill</span>
              </button>

              {onStartFlashcards && targetNote && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onStartFlashcards(targetNote);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-primary py-2.5 text-xs font-bold text-white transition cursor-pointer"
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>Review Flashcards</span>
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
