import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
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
  Layers,
  BookOpen,
  Wand2,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  Compass,
  MessageSquare,
  Volume2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";
import { SocraticTutorPanel } from "@/components/tools/socratic-tutor-panel";

export interface DiagnosticQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceCitation?: string;
  distractorExplanations?: string[];
  topicTag: string;
  difficultyLevel?: string;
  questionType?: string;
  keyTakeaway?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  selectedNote: Note | null;
  activeCourseName?: string | null;
  onStartFlashcards?: (note: Note) => void;
  onCreateNote?: (title: string, body: string) => string;
  onOpenNotePolisher?: (note: Note) => void;
  onOpenCollectionExam?: () => void;
}

export function AiExamSimulatorDialog({
  open,
  onOpenChange,
  notes,
  selectedNote,
  activeCourseName,
  onStartFlashcards,
  onCreateNote,
  onOpenNotePolisher,
  onOpenCollectionExam,
}: Props) {
  const { showNotification } = useNotifications();

  // Mode: single note vs multi-note comprehensive
  const [scopeMode, setScopeMode] = useState<"single" | "multi">("single");
  const [activeTargetNoteId, setActiveTargetNoteId] = useState<string>(
    selectedNote?.id || (notes[0]?.id ?? "")
  );
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [drillMode, setDrillMode] = useState<"5m_sprint" | "10m_standard" | "15m_comprehensive">("5m_sprint");
  const [difficulty, setDifficulty] = useState<"balanced" | "challenging" | "code_heavy">("balanced");

  // Exam execution state
  const [stage, setStage] = useState<"config" | "loading" | "taking" | "summary">("config");
  const [examTitle, setExamTitle] = useState("");
  const [overallDiagnosticSummary, setOverallDiagnosticSummary] = useState("");
  const [keyFocusAreas, setKeyFocusAreas] = useState<string[]>([]);
  const [showDistractorBreakdown, setShowDistractorBreakdown] = useState(false);
  const [showReviewList, setShowReviewList] = useState(false);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300);

  // Phase 3: Socratic Oral & Interactive Reasoning Tutor State
  const [activeSocraticIndex, setActiveSocraticIndex] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const targetNote = notes.find((n) => n.id === activeTargetNoteId) || selectedNote || notes[0] || null;

  // Sync state when dialog opens
  useEffect(() => {
    if (open) {
      if (selectedNote) {
        setActiveTargetNoteId(selectedNote.id);
        setSelectedNoteIds([selectedNote.id]);
      } else if (notes.length > 0) {
        setActiveTargetNoteId(notes[0].id);
        setSelectedNoteIds(notes.slice(0, 3).map((n) => n.id));
      }
      setActiveSocraticIndex(null);
    }
  }, [open, selectedNote, notes]);

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

  const toggleMultiNoteId = (id: string) => {
    haptic("light");
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((i) => i !== id) : prev) : [...prev, id]
    );
  };

  const handleSelectAllCourseNotes = () => {
    haptic("light");
    setSelectedNoteIds(notes.map((n) => n.id));
  };

  const handleStartExam = async () => {
    const includedNotes =
      scopeMode === "multi"
        ? notes.filter((n) => selectedNoteIds.includes(n.id))
        : targetNote
          ? [targetNote]
          : [];

    if (includedNotes.length === 0) {
      showNotification({
        message: "No Notes Selected",
        description: "Select at least one note to synthesize your diagnostic mock exam.",
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
          noteTitle: includedNotes[0]?.title || "Study Session",
          noteBody: includedNotes[0]?.body || "",
          notesList: includedNotes.map((n) => ({ title: n.title, body: n.body })),
          courseName: activeCourseName || "Study Notes",
          drillMode,
          difficulty,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setExamTitle(
          data.examTitle ||
            (scopeMode === "multi"
              ? `${activeCourseName || "Course"} • Cross-Topic Exam`
              : `${targetNote?.title} • Diagnostic Exam`)
        );
        setOverallDiagnosticSummary(data.overallDiagnosticSummary || "");
        setKeyFocusAreas(data.keyFocusAreas || []);
        setCurrentIndex(0);
        setUserAnswers({});
        setSelectedOption(null);
        setRevealed(false);
        setShowDistractorBreakdown(false);
        setShowReviewList(false);
        setActiveSocraticIndex(null);
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
    setActiveSocraticIndex(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setRevealed(false);
      setShowDistractorBreakdown(false);
    } else {
      handleFinishExam();
    }
  };

  const handleFinishExam = () => {
    haptic("success");
    setStage("summary");
    setActiveSocraticIndex(null);

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
  const missedQuestions = questions.filter((q, idx) => userAnswers[idx] !== q.correctIndex);
  const weakTopics = missedQuestions.map((q) => q.topicTag);

  // Phase 1: Remediation Action: Synthesize targeted remediation notes & launch Note Polisher
  const handleGenerateRemediationNote = () => {
    if (!onCreateNote) {
      showNotification({
        message: "Action Unavailable",
        description: "Note creation handler is not attached.",
        type: "warning",
      });
      return;
    }

    haptic("success");
    const dateStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const noteTitle = `Diagnostic Remediation: ${examTitle.replace(/•.*/, "").trim()} (${dateStr})`;

    const markdownContent = [
      `# ${noteTitle}`,
      `> **Assessment Reference**: ${examTitle}`,
      `> **Score Achieved**: ${scorePercent}% (${totalCorrect}/${questions.length} Correct) • Date: ${new Date().toLocaleString()}`,
      ``,
      `## 1.0 Executive Diagnostic Assessment`,
      overallDiagnosticSummary ||
        `This targeted remediation guide focuses specifically on concepts missed during the diagnostic assessment drill.`,
      ``,
      `## 2.0 Priority Focus Areas & Blindspots`,
      ...(keyFocusAreas.length > 0
        ? keyFocusAreas.map((fa, i) => `${i + 1}. **${fa}**`)
        : [`1. Review identified misconception traps in the section below.`]),
      ``,
      `## 3.0 Missed Concepts Deep-Dive & Rationales`,
      ...(missedQuestions.length > 0
        ? missedQuestions.map((q, idx) => {
            const userPick = userAnswers[questions.indexOf(q)];
            return [
              `### 3.${idx + 1} [${q.topicTag}] ${q.question}`,
              ``,
              `- **Correct Principle**: ${q.options[q.correctIndex]}`,
              `- **Identified Trap Answer**: ${userPick !== undefined ? q.options[userPick] : "Unanswered"}`,
              `- **Pedagogical Explanation**: ${q.explanation}`,
              q.sourceCitation ? `- **Source Citation**: \`${q.sourceCitation}\`` : ``,
              q.keyTakeaway ? `- **Key Takeaway**: **${q.keyTakeaway}**` : ``,
              ``,
            ]
              .filter(Boolean)
              .join("\n");
          })
        : [`- All questions answered with 100% accuracy. Continue spaced reinforcement drills.`]),
      ``,
      `## 4.0 Actionable Mastery Protocol`,
      `- [ ] Complete 1 active spaced-repetition flashcard cycle on weak items.`,
      `- [ ] Re-run the 5-minute diagnostic drill to verify concept reconsolidation.`,
      `- [ ] Verify syntax and boundary constraints in practical code drills.`,
    ].join("\n");

    const newId = onCreateNote(noteTitle, markdownContent);
    const createdNoteObj: Note = {
      id: newId,
      title: noteTitle,
      body: markdownContent,
      favorite: false,
      courseId: null,
      collectionId: null,
      revision: 0,
      sourceId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    showNotification({
      message: "Remediation Note Created",
      description: `Targeted review guide generated. Opening in AI Note Polisher...`,
      type: "success",
    });

    onOpenChange(false);
    if (onOpenNotePolisher) {
      setTimeout(() => {
        onOpenNotePolisher(createdNoteObj);
      }, 250);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none max-h-none rounded-none sm:rounded-none m-0 border-0 bg-slate-950/98 text-foreground backdrop-blur-3xl flex flex-col p-0 z-50 overflow-hidden shadow-none ring-0">
        {/* Pinned Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 bg-white/[0.02] backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 pr-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-rose-500/30 text-amber-300 border border-amber-500/30 shadow-[0_0_18px_-4px_rgba(245,158,11,0.5)] shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>AI Adaptive Exam Simulator</span>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[0.62rem] font-semibold text-amber-300 uppercase tracking-wider">
                  Phase 1, 2 &amp; 3 Suite
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">
                Diagnostic active-recall mock exams, Socratic oral AI debriefing, and gap remediation note generation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mr-10 sm:mr-12">
            {stage === "taking" && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-mono font-bold text-foreground shadow-sm">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Workstation Body */}
        <div className="flex-1 overflow-y-auto scroll-sleek p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* STAGE 1: CONFIGURATION */}
        {stage === "config" && (
          <div className="space-y-4 pt-2">
            {/* Scope Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                  Exam Scope &amp; Target Strategy
                </label>
                {onOpenCollectionExam && (
                  <button
                    type="button"
                    onClick={() => {
                      haptic("medium");
                      onOpenChange(false);
                      onOpenCollectionExam();
                    }}
                    className="text-[0.68rem] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 transition-all"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Switch to 4-Stage Progressive Assessment &rarr;</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setScopeMode("single");
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
                    scopeMode === "single"
                      ? "border-primary/50 bg-primary/15 text-foreground ring-1 ring-primary/40 shadow-sm"
                      : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <FileText className={cn("h-4 w-4", scopeMode === "single" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <div className="text-xs font-bold">Single-Note Focused Drill</div>
                    <div className="text-[0.62rem] text-muted-foreground">Deep dive into a specific topic note</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setScopeMode("multi");
                    if (selectedNoteIds.length === 0 && notes.length > 0) {
                      setSelectedNoteIds(notes.slice(0, 4).map((n) => n.id));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
                    scopeMode === "multi"
                      ? "border-amber-500/50 bg-amber-500/15 text-foreground ring-1 ring-amber-500/40 shadow-sm"
                      : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <Layers className={cn("h-4 w-4", scopeMode === "multi" ? "text-amber-400" : "text-muted-foreground")} />
                  <div>
                    <div className="text-xs font-bold">Multi-Note Comprehensive</div>
                    <div className="text-[0.62rem] text-muted-foreground">Cross-topic synthesis across multiple notes</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            {scopeMode === "single" ? (
              <div className="space-y-1.5">
                <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                  Target Document
                </label>
                <select
                  value={activeTargetNoteId}
                  onChange={(e) => {
                    haptic("light");
                    setActiveTargetNoteId(e.target.value);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-white/[0.07] transition"
                >
                  {notes.map((n) => (
                    <option key={n.id} value={n.id} className="bg-slate-900 text-foreground">
                      {n.title || "Untitled Note"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                    Select Notes for Comprehensive Synthesis ({selectedNoteIds.length} Selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllCourseNotes}
                    className="text-[0.65rem] font-bold text-primary hover:text-primary/80 transition cursor-pointer"
                  >
                    Select All Notes
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto scroll-sleek space-y-1 pr-1">
                  {notes.map((n) => {
                    const isChecked = selectedNoteIds.includes(n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => toggleMultiNoteId(n.id)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl border p-2 text-xs text-left transition cursor-pointer",
                          isChecked
                            ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                            : "border-white/5 bg-white/[0.01] text-muted-foreground hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isChecked ? (
                            <CheckSquare className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate font-medium">{n.title || "Untitled"}</span>
                        </div>
                        <span className="text-[0.62rem] text-muted-foreground font-mono shrink-0 pl-2">
                          {n.body ? `${n.body.trim().split(/\s+/).length} words` : "Empty"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

            <button
              type="button"
              onClick={handleStartExam}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-primary to-emerald-500 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl hover:opacity-95 active:scale-98 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {scopeMode === "multi"
                  ? `Synthesize Multi-Note Comprehensive Exam (${selectedNoteIds.length} Notes)`
                  : "Synthesize & Start Diagnostic Mock Exam"}
              </span>
            </button>
          </div>
        )}

        {/* STAGE 2: LOADING */}
        {stage === "loading" && (
          <div className="flex flex-col items-center justify-center py-14 space-y-4 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_24px_rgba(16,185,129,0.4)]">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Synthesizing Diagnostic Drill</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Gemini is analyzing syllabus concepts, building distractor analyses, and verifying note citations...
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
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
                      "w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer active:scale-98 text-xs sm:text-sm",
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

            {/* Detailed Explanation & Pedagogical Grounding after answer confirmation */}
            {revealed && (
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-sky-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Rational Explanation &amp; Analysis:</span>
                  </div>

                  {/* Phase 3: Socratic AI Tutor & Oral Debrief Button */}
                  <button
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setActiveSocraticIndex(activeSocraticIndex === currentIndex ? null : currentIndex);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm",
                      activeSocraticIndex === currentIndex
                        ? "border-sky-400 bg-sky-500/30 text-white ring-1 ring-sky-400"
                        : "border-sky-500/40 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                    )}
                  >
                    <Brain className="h-3.5 w-3.5 text-sky-400" />
                    <span>{activeSocraticIndex === currentIndex ? "Hide Socratic Tutor ▲" : "Socratic Oral Debrief ▼"}</span>
                  </button>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {questions[currentIndex].explanation}
                </p>

                {questions[currentIndex].sourceCitation && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 space-y-0.5">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400">
                      Verified Note Grounding
                    </span>
                    <p className="text-[0.72rem] text-foreground font-mono leading-relaxed">
                      "{questions[currentIndex].sourceCitation}"
                    </p>
                  </div>
                )}

                {questions[currentIndex].keyTakeaway && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-0.5">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-300">
                      Core Takeaway Principle
                    </span>
                    <p className="text-[0.72rem] text-foreground font-semibold">
                      {questions[currentIndex].keyTakeaway}
                    </p>
                  </div>
                )}

                {questions[currentIndex].distractorExplanations &&
                  questions[currentIndex].distractorExplanations.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDistractorBreakdown((prev) => !prev)}
                        className="text-[0.68rem] font-bold text-sky-400 hover:text-sky-300 underline underline-offset-2 cursor-pointer transition"
                      >
                        {showDistractorBreakdown
                          ? "Hide Option Misconception Breakdown ▲"
                          : "View Option Misconception Breakdown (Why each option is right/wrong) ▼"}
                      </button>

                      {showDistractorBreakdown && (
                        <div className="mt-2 space-y-1.5 rounded-xl border border-white/10 bg-black/40 p-3 animate-in fade-in">
                          {questions[currentIndex].options.map((opt, oIdx) => {
                            const isOptCorrect = oIdx === questions[currentIndex].correctIndex;
                            const reason = questions[currentIndex].distractorExplanations?.[oIdx];
                            return (
                              <div key={oIdx} className="text-[0.68rem] leading-relaxed">
                                <span className={cn("font-bold mr-1.5", isOptCorrect ? "text-emerald-400" : "text-amber-400")}>
                                  Option {String.fromCharCode(65 + oIdx)} ({isOptCorrect ? "Correct" : "Trap"}):
                                </span>
                                <span className="text-muted-foreground">{reason || opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                {/* Embedded Socratic Tutor Panel (Phase 3) */}
                {activeSocraticIndex === currentIndex && (
                  <div className="pt-2 animate-in fade-in">
                    <SocraticTutorPanel
                      question={questions[currentIndex]}
                      userAnswer={userAnswers[currentIndex]}
                      noteTitle={targetNote?.title || "Exam Session"}
                      onClose={() => setActiveSocraticIndex(null)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {!revealed ? (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleConfirmAnswer}
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-40 transition cursor-pointer shadow-md"
                >
                  Confirm Choice
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-lg hover:opacity-95"
                >
                  <span>{currentIndex + 1 < questions.length ? "Next Question" : "View Diagnostic Report"}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE 4: POST-EXAM SUMMARY & DIAGNOSTIC REMEDIATION (Phase 1 & 3) */}
        {stage === "summary" && (
          <div className="space-y-4 pt-2 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
              <Award className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Diagnostic Drill Completed</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{examTitle}</p>
            </div>

            {/* AI Cognitive Diagnostic Overview */}
            {overallDiagnosticSummary && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Cognitive Diagnostic Assessment</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {overallDiagnosticSummary}
                </p>
              </div>
            )}

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
                  {scorePercent >= 80 ? "Exam Ready" : scorePercent >= 60 ? "Good Base" : "Needs Review"}
                </p>
              </div>
            </div>

            {/* Phase 1: Targeted Diagnostic Remediation Center */}
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.08] p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                  <Compass className="h-4 w-4" />
                  <span>"Close-The-Loop" Targeted Remediation Center</span>
                </div>
                <span className="text-[0.65rem] font-semibold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded font-mono">
                  {missedQuestions.length} Missed Concept{missedQuestions.length === 1 ? "" : "s"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Immediately reconsolidate fragile memory traces by creating targeted study guides and flashcard practice sets from missed questions.
              </p>

              {/* Weak spots list */}
              {weakTopics.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
                    Identified Weak Topic Domains:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(weakTopics)).map((topic, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[0.68rem] font-bold text-amber-200"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Remediation Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {onCreateNote && (
                  <button
                    type="button"
                    onClick={handleGenerateRemediationNote}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 p-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition cursor-pointer"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Auto-Polish Missed Topics Guide</span>
                  </button>
                )}

                {onStartFlashcards && targetNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onStartFlashcards(targetNote);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-primary p-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition cursor-pointer"
                  >
                    <Brain className="h-3.5 w-3.5" />
                    <span>Practice Weak-Spot Flashcards</span>
                  </button>
                )}
              </div>
            </div>

            {/* Key Focus Areas */}
            {keyFocusAreas.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Target className="h-3.5 w-3.5 text-amber-400" />
                  <span>Key Actionable Focus Areas:</span>
                </div>
                <ul className="text-[0.68rem] text-muted-foreground list-disc list-inside space-y-1">
                  {keyFocusAreas.map((fa, i) => (
                    <li key={i}>{fa}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full Question Breakdown & Socratic Oral Review (Phase 3) */}
            <div className="text-left pt-1">
              <button
                type="button"
                onClick={() => setShowReviewList((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs font-bold text-foreground hover:bg-white/[0.06] transition cursor-pointer"
              >
                <span>Full Question &amp; Socratic Review ({questions.length} Items)</span>
                <span>{showReviewList ? "Hide ▲" : "Review All ▼"}</span>
              </button>

              {showReviewList && (
                <div className="mt-2 space-y-3 max-h-[480px] overflow-y-auto scroll-sleek pr-1 animate-in fade-in">
                  {questions.map((q, idx) => {
                    const userPick = userAnswers[idx];
                    const isCorrect = userPick === q.correctIndex;
                    const isSocraticOpen = activeSocraticIndex === idx;

                    return (
                      <div
                        key={q.id || idx}
                        className={cn(
                          "rounded-xl border p-3.5 text-xs space-y-2",
                          isCorrect
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-rose-500/30 bg-rose-500/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-foreground">
                            Q{idx + 1}: {q.question}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCorrect ? (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[0.65rem] font-bold text-emerald-400">
                                Correct
                              </span>
                            ) : (
                              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[0.65rem] font-bold text-rose-400">
                                Missed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[0.68rem] text-muted-foreground space-y-0.5">
                          <p>
                            <span className="font-semibold text-foreground">Your answer: </span>
                            {userPick !== undefined ? q.options[userPick] : "Not answered"}
                          </p>
                          {!isCorrect && (
                            <p>
                              <span className="font-semibold text-emerald-400">Correct answer: </span>
                              {q.options[q.correctIndex]}
                            </p>
                          )}
                          <p className="pt-0.5 text-foreground/80 leading-relaxed italic">
                            {q.explanation}
                          </p>
                          {q.sourceCitation && (
                            <p className="text-emerald-400/90 font-mono text-[0.65rem]">
                              Evidence: "{q.sourceCitation}"
                            </p>
                          )}
                        </div>

                        {/* Trigger Socratic Oral Debrief on this question */}
                        <div className="pt-1 flex items-center justify-between border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              haptic("light");
                              setActiveSocraticIndex(isSocraticOpen ? null : idx);
                            }}
                            className="flex items-center gap-1.5 text-[0.7rem] font-bold text-sky-400 hover:text-sky-300 transition cursor-pointer"
                          >
                            <Brain className="h-3.5 w-3.5" />
                            <span>{isSocraticOpen ? "Hide Socratic Professor" : "Open Socratic Debrief & Audio Tutor"}</span>
                          </button>
                        </div>

                        {/* Render Socratic Tutor Panel for this item */}
                        {isSocraticOpen && (
                          <div className="pt-2 animate-in fade-in">
                            <SocraticTutorPanel
                              question={q}
                              userAnswer={userPick}
                              noteTitle={targetNote?.title || "Exam Review"}
                              onClose={() => setActiveSocraticIndex(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStage("config")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-white/[0.08] transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Configure New Drill</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
