import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  X,
  FileText,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders,
  Play,
  Check,
  Copy,
  ChevronLeft,
  Volume2,
  VolumeX,
  FolderOpen,
  Lock,
  Unlock,
  Terminal,
  Bug,
  Code2,
  Layers,
  Wand2,
  BarChart3,
  Bookmark,
  Share2,
  RefreshCw,
  ExternalLink,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import type { Note, Collection } from "@/lib/notes";
import { MarkdownPreview } from "@/components/notes/markdown-preview";

export type ExamDifficulty = "foundational" | "intermediate" | "advanced" | "competitive";
export type FocusDomain = "fullstack" | "algorithms" | "system_design" | "devops_cloud" | "custom";

export interface TheoryQuestion {
  id: string;
  type: "multiple_choice" | "fill_in_blank" | "conceptual_tradeoff";
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  sourceNoteTitle?: string;
  keyConcept?: string;
}

export interface CodeLogicProblem {
  id: string;
  title: string;
  problemDescription: string;
  codeSnippet: string;
  question: string;
  options?: string[];
  correctAnswer: string | number;
  expectedOutputOrLogic: string;
  complexityAnalysis: string;
  explanation: string;
}

export interface DebuggingCase {
  id: string;
  title: string;
  brokenCode: string;
  bugDescription: string;
  hint: string;
  options?: string[];
  correctFixIndex?: number;
  fixedCodeSnippet: string;
  rootCauseExplanation: string;
  invariantRule: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  specification: string;
  testCondition: string;
}

export interface ProjectChallenge {
  title: string;
  timeLimitMinutes: number;
  projectBrief: string;
  architectureRequirements: string[];
  starterCodeOrScaffold: string;
  keyMilestones: ProjectMilestone[];
  solutionReference: string;
  gradingRubric: { criteria: string; weightPercent: number; description: string }[];
}

export interface ProgressiveExamSuite {
  title: string;
  collectionName: string;
  totalMinutes: number;
  difficulty: ExamDifficulty;
  focusDomain: FocusDomain;
  stages: {
    stage1Theory: {
      title: string;
      timeLimitMinutes: number;
      instructions: string;
      items: TheoryQuestion[];
    };
    stage2CodeLogic: {
      title: string;
      timeLimitMinutes: number;
      instructions: string;
      items: CodeLogicProblem[];
    };
    stage3Debugging: {
      title: string;
      timeLimitMinutes: number;
      instructions: string;
      items: DebuggingCase[];
    };
    stage4Project: ProjectChallenge;
  };
}

export interface EvaluationResult {
  masteryScore: number;
  masteryGrade: string;
  stageBreakdown: {
    theory: { score: number; maxScore: number; percentage: number; feedback: string };
    codeLogic: { score: number; maxScore: number; percentage: number; feedback: string };
    codeDebugging: { score: number; maxScore: number; percentage: number; feedback: string };
    project: { score: number; maxScore: number; percentage: number; feedback: string };
  };
  executiveSummary: string;
  keyStrengths: string[];
  criticalGaps: string[];
  misconceptionsIdentified: string[];
  socraticRemediationRoadmap: {
    step: number;
    title: string;
    actionableGuidance: string;
    recommendedReviewNote: string;
  }[];
  exportableStudyGuide: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: Collection[];
  notes: Note[];
  initialCollectionId?: string | null;
  activeCourseName?: string;
  onCreateNote?: (title: string, body: string, collectionId?: string | null) => void;
  onOpenNotePolisher?: (note: Note) => void;
}

type StepType = "setup" | "generating" | "stage_hub" | "stage1" | "stage2" | "stage3" | "stage4" | "evaluating" | "results" | "review";

export function AiCollectionExamDialog({
  open,
  onOpenChange,
  collections,
  notes,
  initialCollectionId,
  activeCourseName = "Current Workspace",
  onCreateNote,
  onOpenNotePolisher,
}: Props) {
  // Setup Options State (The 4 fill-the-blanks / customization options)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialCollectionId || collections[0]?.id || "all"
  );
  const [totalMinutes, setTotalMinutes] = useState<number>(45);
  const [difficulty, setDifficulty] = useState<ExamDifficulty>("intermediate");
  const [focusDomain, setFocusDomain] = useState<FocusDomain>("fullstack");
  const [customGoalText, setCustomGoalText] = useState<string>("");

  // App Workflow State
  const [step, setStep] = useState<StepType>("setup");
  const [examSuite, setExamSuite] = useState<ProgressiveExamSuite | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("Synthesizing curriculum & diagnostic items...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stage Completion & Progress State
  const [stage1Completed, setStage1Completed] = useState<boolean>(false);
  const [stage2Completed, setStage2Completed] = useState<boolean>(false);
  const [stage3Completed, setStage3Completed] = useState<boolean>(false);
  const [stage4Completed, setStage4Completed] = useState<boolean>(false);

  // Stage Answers & Student Inputs
  const [stage1Answers, setStage1Answers] = useState<Record<string, number | string>>({});
  const [stage2Answers, setStage2Answers] = useState<Record<string, number>>({});
  const [stage3Answers, setStage3Answers] = useState<Record<string, number>>({});
  const [projectCode, setProjectCode] = useState<string>("");
  const [completedMilestones, setCompletedMilestones] = useState<string[]>([]);
  const [projectNotes, setProjectNotes] = useState<string>("");

  // Evaluation Output State
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [savedNoteSuccess, setSavedNoteSuccess] = useState<boolean>(false);

  // Timer State
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45 * 60);
  const [timerSoundEnabled, setTimerSoundEnabled] = useState<boolean>(true);

  // Active review sub-tab
  const [reviewTab, setReviewTab] = useState<"all" | "theory" | "logic" | "debug" | "project">("all");

  // Sync initial collection
  useEffect(() => {
    if (initialCollectionId) {
      setSelectedCollectionId(initialCollectionId);
    } else if (collections[0]?.id && selectedCollectionId === "all") {
      setSelectedCollectionId(collections[0].id);
    }
  }, [initialCollectionId, collections]);

  // Relevant notes for the selected collection
  const targetNotes = useMemo(() => {
    if (!selectedCollectionId || selectedCollectionId === "all") {
      return notes;
    }
    return notes.filter((n) => n.collectionId === selectedCollectionId);
  }, [notes, selectedCollectionId]);

  const selectedCollectionObj = useMemo(() => {
    if (selectedCollectionId === "all") {
      return { id: "all", name: "All Workspace Notes", courseId: null };
    }
    return collections.find((c) => c.id === selectedCollectionId) || { id: "unknown", name: "Selected Collection", courseId: null };
  }, [collections, selectedCollectionId]);

  // Live Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (timerActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

  if (!open) return null;

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 1. Generate 4-Stage Progressive Exam Suite
  const handleGenerateExam = async () => {
    haptic("medium");
    setStep("generating");
    setErrorMsg(null);
    setLoadingMessage(`Analyzing ${targetNotes.length} notes in "${selectedCollectionObj.name}"...`);

    const messageInterval = setInterval(() => {
      setLoadingMessage((prev) => {
        if (prev.includes("Analyzing")) return "Synthesizing Stage 1 Theory & Conceptual Invariants...";
        if (prev.includes("Stage 1")) return "Constructing Stage 2 Algorithmic Logic & Tracing Models...";
        if (prev.includes("Stage 2")) return "Engineering Stage 3 Real-World Code Flaws & Debug Scenarios...";
        if (prev.includes("Stage 3")) return "Architecting Stage 4 End-to-End Project Challenge & Rubric...";
        return "Finalizing progressive exam security & milestones...";
      });
    }, 2800);

    try {
      const res = await fetch("/api/ai/collection-exam-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: selectedCollectionObj.name,
          notes: targetNotes.map((n) => ({ id: n.id, title: n.title, body: n.body })),
          totalMinutes,
          difficulty,
          focusDomain,
          customGoals: customGoalText,
        }),
      });

      clearInterval(messageInterval);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: ProgressiveExamSuite = await res.json();
      setExamSuite(data);
      setProjectCode(data.stages.stage4Project.starterCodeOrScaffold || "");
      setSecondsRemaining(totalMinutes * 60);
      setTimerActive(true);
      setStep("stage_hub");
      haptic("heavy");
    } catch (err: any) {
      clearInterval(messageInterval);
      console.error("Exam generation failed:", err);
      setErrorMsg("Failed to generate exam from collection. Please retry or adjust parameters.");
      setStep("setup");
    }
  };

  // Stage 1 Completion
  const handleCompleteStage1 = () => {
    haptic("medium");
    setStage1Completed(true);
    setStep("stage_hub");
  };

  // Stage 2 Completion
  const handleCompleteStage2 = () => {
    haptic("medium");
    setStage2Completed(true);
    setStep("stage_hub");
  };

  // Stage 3 Completion
  const handleCompleteStage3 = () => {
    haptic("medium");
    setStage3Completed(true);
    setStep("stage_hub");
  };

  // Stage 4 Completion
  const handleCompleteStage4 = () => {
    haptic("medium");
    setStage4Completed(true);
    setStep("stage_hub");
  };

  const toggleMilestone = (mId: string) => {
    haptic("light");
    setCompletedMilestones((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  // 2. Final AI Evaluation Calculation
  const handleCalculateFinalEvaluation = async () => {
    haptic("heavy");
    setStep("evaluating");
    setTimerActive(false);

    // Calculate raw scores
    const s1Items = examSuite?.stages.stage1Theory.items || [];
    let s1Score = 0;
    s1Items.forEach((item) => {
      const studentAns = stage1Answers[item.id];
      if (studentAns !== undefined && studentAns === item.correctAnswer) {
        s1Score += 1;
      }
    });

    const s2Items = examSuite?.stages.stage2CodeLogic.items || [];
    let s2Score = 0;
    s2Items.forEach((item) => {
      const studentAns = stage2Answers[item.id];
      if (studentAns !== undefined && studentAns === item.correctAnswer) {
        s2Score += 1;
      }
    });

    const s3Items = examSuite?.stages.stage3Debugging.items || [];
    let s3Score = 0;
    s3Items.forEach((item) => {
      const studentAns = stage3Answers[item.id];
      if (studentAns !== undefined && studentAns === item.correctFixIndex) {
        s3Score += 1;
      }
    });

    try {
      const res = await fetch("/api/ai/collection-exam-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: selectedCollectionObj.name,
          examConfig: { totalMinutes, difficulty, focusDomain },
          stageResults: {
            stage1: { score: s1Score, maxScore: s1Items.length, answers: stage1Answers, items: s1Items },
            stage2: { score: s2Score, maxScore: s2Items.length, answers: stage2Answers, items: s2Items },
            stage3: { score: s3Score, maxScore: s3Items.length, answers: stage3Answers, items: s3Items },
            stage4: {
              projectSubmission: projectCode,
              completedMilestones,
              selfAssessmentNotes: projectNotes,
            },
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Evaluation failed.");
      }

      const evalData: EvaluationResult = await res.json();
      setEvaluation(evalData);
      setStep("results");

      if (evalData.masteryScore >= 75) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error("Evaluation calculation error:", err);
      // Fallback
      setStep("results");
    }
  };

  const handleExportToNotes = () => {
    if (!evaluation || !onCreateNote) return;
    const title = `${selectedCollectionObj.name} - AI Mastery Report (${evaluation.masteryGrade})`;
    onCreateNote(title, evaluation.exportableStudyGuide, selectedCollectionId === "all" ? null : selectedCollectionId);
    setSavedNoteSuccess(true);
    haptic("medium");
    setTimeout(() => setSavedNoteSuccess(false), 3000);
  };

  const handleOpenPolisherRemediation = () => {
    if (!evaluation || !onOpenNotePolisher) return;
    const tempNote: Note = {
      id: "remediation-" + Date.now(),
      title: `${selectedCollectionObj.name}: Diagnostic Remediation Guide`,
      body: evaluation.exportableStudyGuide,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      courseId: null,
      collectionId: selectedCollectionId === "all" ? null : selectedCollectionId,
      favorite: false,
      revision: 1,
      sourceId: null,
    };
    onOpenChange(false);
    onOpenNotePolisher(tempNote);
  };

  const resetAll = () => {
    haptic("medium");
    setStep("setup");
    setExamSuite(null);
    setStage1Completed(false);
    setStage2Completed(false);
    setStage3Completed(false);
    setStage4Completed(false);
    setStage1Answers({});
    setStage2Answers({});
    setStage3Answers({});
    setProjectCode("");
    setCompletedMilestones([]);
    setEvaluation(null);
  };

  const allStagesCompleted = stage1Completed && stage2Completed && stage3Completed && stage4Completed;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-2xl text-foreground overflow-hidden animate-panel-in">
      {/* Top Universal Fullscreen Header */}
      <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6 bg-white/[0.03]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-tr from-amber-500/20 to-primary/20 text-amber-300 shadow-md">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                AI Multi-Stage Mastery Exam
              </h1>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider hidden xs:inline-block">
                Collection Studio
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {examSuite ? examSuite.title : `Structured 4-Stage Diagnostic for "${selectedCollectionObj.name}"`}
            </p>
          </div>
        </div>

        {/* Header Right: Live Timer + Close */}
        <div className="flex items-center gap-3">
          {timerActive && (
            <div className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition-colors",
              secondsRemaining < 300
                ? "border-rose-500/40 bg-rose-500/20 text-rose-300 animate-pulse"
                : "border-white/15 bg-white/[0.06] text-foreground"
            )}>
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}

          {step !== "setup" && step !== "generating" && step !== "evaluating" && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Reset current exam session and return to setup?")) {
                  resetAll();
                }
              }}
              title="Reset Exam"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            aria-label="Close Exam Dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* VIEW 1: SETUP SCREEN (4 FILL THE BLANKS / CONFIG OPTIONS) */}
        {step === "setup" && (
          <div className="max-w-4xl mx-auto py-4 space-y-8 animate-panel-in">
            {/* Hero Banner */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 -mt-10 -mr-10 h-60 w-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">
                <Sparkles className="h-4 w-4" />
                <span>Sequential Mastery Pipeline</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                Configure 4-Stage Progressive Collection Exam
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                The AI will analyze all notes inside your selected collection and build a 4-tier sequential assessment:
                <strong className="text-foreground"> 1. Theory &rarr; 2. Code Logic &rarr; 3. Code Debugging &rarr; 4. Real Project</strong>.
                Each stage unlocks only after the previous one is mastered.
              </p>
            </div>

            {/* Error banner if any */}
            {errorMsg && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-300">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* The 4 Custom Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Option 1: Choose Collection */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="flex h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] items-center justify-center font-bold">1</span>
                      Target Study Collection
                    </label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {targetNotes.length} notes available
                    </span>
                  </div>

                  <select
                    value={selectedCollectionId}
                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm text-foreground focus:border-amber-400 focus:outline-none backdrop-blur-md"
                  >
                    <option value="all" className="bg-slate-900 text-foreground">
                      All Workspace Notes ({notes.length} notes)
                    </option>
                    {collections.map((col) => {
                      const count = notes.filter((n) => n.collectionId === col.id).length;
                      return (
                        <option key={col.id} value={col.id} className="bg-slate-900 text-foreground">
                          {col.name} ({count} notes)
                        </option>
                      );
                    })}
                  </select>

                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Selected collection notes will form the corpus for all 4 diagnostic stages.
                  </p>
                </div>
              </div>

              {/* Option 2: Set Total Exam Time */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="flex h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] items-center justify-center font-bold">2</span>
                      Total Exam Time Duration
                    </label>
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      {totalMinutes} Minutes
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          haptic("light");
                          setTotalMinutes(mins);
                        }}
                        className={cn(
                          "rounded-xl py-2 text-xs font-bold transition-all",
                          totalMinutes === mins
                            ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                            : "bg-white/[0.05] text-muted-foreground hover:bg-white/[0.09] hover:text-foreground"
                        )}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Custom:</span>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={totalMinutes}
                      onChange={(e) => setTotalMinutes(Math.max(5, parseInt(e.target.value) || 30))}
                      className="w-24 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-foreground focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[11px] text-muted-foreground">minutes total</span>
                  </div>
                </div>
              </div>

              {/* Option 3: Target Difficulty Level */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span className="flex h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] items-center justify-center font-bold">3</span>
                    Difficulty &amp; Rigor
                  </label>
                  <span className="text-[11px] capitalize font-semibold text-primary">
                    {difficulty}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "foundational", label: "Foundations", desc: "Core invariants & definitions" },
                    { key: "intermediate", label: "Production", desc: "Standard engineering drills" },
                    { key: "advanced", label: "Staff Architect", desc: "Complex invariants & race traps" },
                    { key: "competitive", label: "Competitive", desc: "Deep algorithmic rigor" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setDifficulty(item.key as ExamDifficulty);
                      }}
                      className={cn(
                        "rounded-2xl p-2.5 text-left border transition-all",
                        difficulty === item.key
                          ? "border-amber-500/50 bg-amber-500/15 text-foreground shadow-sm"
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      )}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground/80 truncate">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 4: Evaluation Focus / Code Language Domain */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span className="flex h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] items-center justify-center font-bold">4</span>
                    Code &amp; System Focus Domain
                  </label>
                  <span className="text-[11px] font-semibold text-cyan-400">
                    {focusDomain.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "fullstack", label: "Full-Stack TS/React" },
                    { key: "algorithms", label: "Algorithms & Logic" },
                    { key: "system_design", label: "Systems Architecture" },
                    { key: "devops_cloud", label: "Cloud & Reliability" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setFocusDomain(item.key as FocusDomain);
                      }}
                      className={cn(
                        "rounded-2xl p-2.5 text-left border transition-all",
                        focusDomain === item.key
                          ? "border-cyan-500/50 bg-cyan-500/15 text-foreground shadow-sm"
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      )}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    value={customGoalText}
                    onChange={(e) => setCustomGoalText(e.target.value)}
                    placeholder="Custom focus (e.g. concurrency, caching, Redux, DB indexing)..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Launch Progressive Exam Action Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
              <div className="text-xs text-muted-foreground">
                Ready to synthesize 4 progressive stages with AI Gemini intelligence.
              </div>

              <button
                type="button"
                onClick={handleGenerateExam}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>Initialize 4-Stage Mastery Assessment</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: AI WORKING / GENERATING */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto space-y-6 animate-panel-in">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-2xl animate-pulse">
                <Brain className="h-10 w-10 animate-bounce" />
              </div>
              <div className="absolute -inset-2 rounded-3xl border border-amber-400/20 animate-ping pointer-events-none" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">AI Intelligence Synthesizing</h3>
              <p className="mt-1 text-xs font-mono text-amber-300 min-h-[1.5rem]">
                {loadingMessage}
              </p>
            </div>

            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-primary w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* VIEW 3: STAGE HUB (THE 4 PROGRESSIVE STEPS INTERFACE) */}
        {step === "stage_hub" && examSuite && (
          <div className="max-w-4xl mx-auto space-y-6 animate-panel-in">
            {/* Stage Hub Header */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                  <Flame className="h-4 w-4" />
                  <span>Sequential 4-Stage Progressive Pipeline</span>
                </div>
                <h2 className="text-xl font-bold text-foreground mt-1">
                  {examSuite.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete each stage sequentially. Each tier unlocks automatically upon completing the previous milestone.
                </p>
              </div>

              {/* Overall Progress Pill */}
              <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 px-3.5 py-2 rounded-2xl shrink-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Progress</div>
                  <div className="text-xs font-mono font-bold text-amber-300">
                    {[stage1Completed, stage2Completed, stage3Completed, stage4Completed].filter(Boolean).length} of 4 Complete
                  </div>
                </div>
              </div>
            </div>

            {/* The 4 Stage Cards Grid */}
            <div className="space-y-4">
              {/* STAGE 1: Start Theory */}
              <div className={cn(
                "rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
                stage1Completed
                  ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                  : "border-amber-500/40 bg-white/[0.05] shadow-lg"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 rounded-2xl items-center justify-center shrink-0 shadow-md",
                    stage1Completed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  )}>
                    {stage1Completed ? <CheckCircle2 className="h-6 w-6" /> : <Brain className="h-6 w-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                        Stage 1 &bull; {examSuite.stages.stage1Theory.timeLimitMinutes}m Target
                      </span>
                      {stage1Completed && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground mt-1">
                      {examSuite.stages.stage1Theory.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      {examSuite.stages.stage1Theory.instructions} ({examSuite.stages.stage1Theory.items.length} diagnostic items)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    setStep("stage1");
                  }}
                  className={cn(
                    "w-full md:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0",
                    stage1Completed
                      ? "bg-white/10 hover:bg-white/15 text-foreground"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
                  )}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{stage1Completed ? "Review Stage 1 Theory" : "Start Theory"}</span>
                </button>
              </div>

              {/* STAGE 2: Start Code Logic */}
              <div className={cn(
                "rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
                stage2Completed
                  ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                  : stage1Completed
                  ? "border-cyan-500/40 bg-white/[0.05] shadow-lg"
                  : "border-white/5 bg-white/[0.02] opacity-60 pointer-events-none"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 rounded-2xl items-center justify-center shrink-0 shadow-md",
                    stage2Completed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : stage1Completed
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  )}>
                    {!stage1Completed ? <Lock className="h-6 w-6" /> : stage2Completed ? <CheckCircle2 className="h-6 w-6" /> : <Code2 className="h-6 w-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                        Stage 2 &bull; {examSuite.stages.stage2CodeLogic.timeLimitMinutes}m Target
                      </span>
                      {stage2Completed ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      ) : !stage1Completed ? (
                        <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Locked (Requires Stage 1)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground mt-1">
                      {examSuite.stages.stage2CodeLogic.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      {examSuite.stages.stage2CodeLogic.instructions} ({examSuite.stages.stage2CodeLogic.items.length} algorithmic tracing cases)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!stage1Completed}
                  onClick={() => {
                    haptic("medium");
                    setStep("stage2");
                  }}
                  className={cn(
                    "w-full md:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0",
                    !stage1Completed
                      ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                      : stage2Completed
                      ? "bg-white/10 hover:bg-white/15 text-foreground"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md"
                  )}
                >
                  {stage1Completed ? <Play className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  <span>{stage2Completed ? "Review Stage 2 Code Logic" : "Start Code Logic"}</span>
                </button>
              </div>

              {/* STAGE 3: Start Code Debugging */}
              <div className={cn(
                "rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
                stage3Completed
                  ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                  : stage2Completed
                  ? "border-purple-500/40 bg-white/[0.05] shadow-lg"
                  : "border-white/5 bg-white/[0.02] opacity-60 pointer-events-none"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 rounded-2xl items-center justify-center shrink-0 shadow-md",
                    stage3Completed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : stage2Completed
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  )}>
                    {!stage2Completed ? <Lock className="h-6 w-6" /> : stage3Completed ? <CheckCircle2 className="h-6 w-6" /> : <Bug className="h-6 w-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                        Stage 3 &bull; {examSuite.stages.stage3Debugging.timeLimitMinutes}m Target
                      </span>
                      {stage3Completed ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      ) : !stage2Completed ? (
                        <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Locked (Requires Stage 2)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground mt-1">
                      {examSuite.stages.stage3Debugging.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      {examSuite.stages.stage3Debugging.instructions} ({examSuite.stages.stage3Debugging.items.length} debugging scenarios)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!stage2Completed}
                  onClick={() => {
                    haptic("medium");
                    setStep("stage3");
                  }}
                  className={cn(
                    "w-full md:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0",
                    !stage2Completed
                      ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                      : stage3Completed
                      ? "bg-white/10 hover:bg-white/15 text-foreground"
                      : "bg-purple-500 hover:bg-purple-400 text-slate-950 shadow-md"
                  )}
                >
                  {stage2Completed ? <Play className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  <span>{stage3Completed ? "Review Stage 3 Debugging" : "Start Code Debugging"}</span>
                </button>
              </div>

              {/* STAGE 4: Start The Project */}
              <div className={cn(
                "rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
                stage4Completed
                  ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                  : stage3Completed
                  ? "border-emerald-500/40 bg-white/[0.05] shadow-lg"
                  : "border-white/5 bg-white/[0.02] opacity-60 pointer-events-none"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 rounded-2xl items-center justify-center shrink-0 shadow-md",
                    stage4Completed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : stage3Completed
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  )}>
                    {!stage3Completed ? <Lock className="h-6 w-6" /> : stage4Completed ? <CheckCircle2 className="h-6 w-6" /> : <Terminal className="h-6 w-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                        Stage 4 &bull; {examSuite.stages.stage4Project.timeLimitMinutes}m Target
                      </span>
                      {stage4Completed ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          Completed ({completedMilestones.length}/4 Milestones)
                        </span>
                      ) : !stage3Completed ? (
                        <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Locked (Requires Stage 3)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground mt-1">
                      {examSuite.stages.stage4Project.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      {examSuite.stages.stage4Project.projectBrief.slice(0, 120)}...
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!stage3Completed}
                  onClick={() => {
                    haptic("medium");
                    setStep("stage4");
                  }}
                  className={cn(
                    "w-full md:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0",
                    !stage3Completed
                      ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                      : stage4Completed
                      ? "bg-white/10 hover:bg-white/15 text-foreground"
                      : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
                  )}
                >
                  {stage3Completed ? <Play className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  <span>{stage4Completed ? "Review Stage 4 Project" : "Start The Project"}</span>
                </button>
              </div>
            </div>

            {/* Final Calculation Bar (Prominently displayed once all stages done or attempted) */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                {allStagesCompleted
                  ? "All 4 progressive stages completed! Press to synthesize final AI evaluation and diagnostic report."
                  : "Complete all 4 sequential stages to unlock comprehensive AI calculation."}
              </div>

              <button
                type="button"
                disabled={!stage1Completed}
                onClick={handleCalculateFinalEvaluation}
                className={cn(
                  "w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl",
                  allStagesCompleted
                    ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 animate-pulse"
                    : "bg-white/10 hover:bg-white/20 text-foreground"
                )}
              >
                <Sparkles className="h-4 w-4" />
                <span>Calculate Final AI Mastery Evaluation</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: STAGE 1 - THEORY */}
        {step === "stage1" && examSuite && (
          <div className="max-w-3xl mx-auto space-y-6 animate-panel-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Stages Hub</span>
              </button>
              <span className="text-xs font-bold text-amber-300">
                Stage 1 &bull; Theory &amp; Foundations
              </span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-foreground">
                {examSuite.stages.stage1Theory.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {examSuite.stages.stage1Theory.instructions}
              </p>
            </div>

            <div className="space-y-6">
              {examSuite.stages.stage1Theory.items.map((item, idx) => {
                const studentAns = stage1Answers[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        Question {idx + 1} of {examSuite.stages.stage1Theory.items.length}
                      </span>
                      {item.sourceNoteTitle && (
                        <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                          From: {item.sourceNoteTitle}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                      {item.question}
                    </h4>

                    {/* Multiple Choice / Options */}
                    {item.options && item.options.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {item.options.map((opt, optIdx) => {
                          const isSelected = studentAns === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                haptic("light");
                                setStage1Answers((prev) => ({ ...prev, [item.id]: optIdx }));
                              }}
                              className={cn(
                                "w-full rounded-2xl p-3.5 text-left text-xs sm:text-sm border transition-all flex items-center justify-between gap-3",
                                isSelected
                                  ? "border-amber-400/60 bg-amber-400/15 text-foreground font-medium shadow-sm"
                                  : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "flex h-6 w-6 shrink-0 rounded-full border items-center justify-center text-[11px] font-bold",
                                  isSelected
                                    ? "border-amber-400 bg-amber-400 text-slate-950"
                                    : "border-white/20 bg-white/5 text-muted-foreground"
                                )}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="px-5 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Save &amp; Return to Hub
              </button>

              <button
                type="button"
                onClick={handleCompleteStage1}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <span>Complete Stage 1 &rarr; Unlock Stage 2</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 5: STAGE 2 - CODE LOGIC */}
        {step === "stage2" && examSuite && (
          <div className="max-w-3xl mx-auto space-y-6 animate-panel-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Stages Hub</span>
              </button>
              <span className="text-xs font-bold text-cyan-300">
                Stage 2 &bull; Algorithmic Logic &amp; Tracing
              </span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-foreground">
                {examSuite.stages.stage2CodeLogic.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {examSuite.stages.stage2CodeLogic.instructions}
              </p>
            </div>

            <div className="space-y-6">
              {examSuite.stages.stage2CodeLogic.items.map((prob, idx) => {
                const studentAns = stage2Answers[prob.id];
                return (
                  <div
                    key={prob.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                        Logic Case {idx + 1}: {prob.title}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                      {prob.problemDescription}
                    </p>

                    {/* Code Snippet */}
                    <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs overflow-x-auto text-emerald-300 leading-relaxed">
                      <pre>{prob.codeSnippet}</pre>
                    </div>

                    <h4 className="text-xs sm:text-sm font-semibold text-foreground pt-2">
                      {prob.question}
                    </h4>

                    {/* Options */}
                    {prob.options && (
                      <div className="space-y-2">
                        {prob.options.map((opt, optIdx) => {
                          const isSelected = studentAns === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                haptic("light");
                                setStage2Answers((prev) => ({ ...prev, [prob.id]: optIdx }));
                              }}
                              className={cn(
                                "w-full rounded-2xl p-3.5 text-left text-xs sm:text-sm border transition-all flex items-center justify-between gap-3 font-mono",
                                isSelected
                                  ? "border-cyan-400/60 bg-cyan-400/15 text-foreground font-medium shadow-sm"
                                  : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "flex h-6 w-6 shrink-0 rounded-full border items-center justify-center text-[11px] font-bold font-sans",
                                  isSelected
                                    ? "border-cyan-400 bg-cyan-400 text-slate-950"
                                    : "border-white/20 bg-white/5 text-muted-foreground"
                                )}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="px-5 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Save &amp; Return to Hub
              </button>

              <button
                type="button"
                onClick={handleCompleteStage2}
                className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <span>Complete Stage 2 &rarr; Unlock Stage 3</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 6: STAGE 3 - CODE DEBUGGING */}
        {step === "stage3" && examSuite && (
          <div className="max-w-3xl mx-auto space-y-6 animate-panel-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Stages Hub</span>
              </button>
              <span className="text-xs font-bold text-purple-300">
                Stage 3 &bull; Code Debugging &amp; Flaws
              </span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-foreground">
                {examSuite.stages.stage3Debugging.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {examSuite.stages.stage3Debugging.instructions}
              </p>
            </div>

            <div className="space-y-6">
              {examSuite.stages.stage3Debugging.items.map((bugCase, idx) => {
                const studentAns = stage3Answers[bugCase.id];
                return (
                  <div
                    key={bugCase.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                        <Bug className="h-3.5 w-3.5" />
                        Flaw Scenario {idx + 1}: {bugCase.title}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                      {bugCase.bugDescription}
                    </p>

                    {/* Broken Code */}
                    <div className="rounded-2xl border border-rose-500/30 bg-slate-950 p-4 font-mono text-xs overflow-x-auto text-rose-300 leading-relaxed">
                      <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">
                        Broken Code Snippet:
                      </div>
                      <pre>{bugCase.brokenCode}</pre>
                    </div>

                    {bugCase.hint && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                        <strong>Hint:</strong> {bugCase.hint}
                      </div>
                    )}

                    <h4 className="text-xs sm:text-sm font-semibold text-foreground pt-2">
                      Select the surgical fix to resolve the flaw and enforce invariants:
                    </h4>

                    {/* Options */}
                    {bugCase.options && (
                      <div className="space-y-2">
                        {bugCase.options.map((opt, optIdx) => {
                          const isSelected = studentAns === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                haptic("light");
                                setStage3Answers((prev) => ({ ...prev, [bugCase.id]: optIdx }));
                              }}
                              className={cn(
                                "w-full rounded-2xl p-3.5 text-left text-xs sm:text-sm border transition-all flex items-center justify-between gap-3",
                                isSelected
                                  ? "border-purple-400/60 bg-purple-400/15 text-foreground font-medium shadow-sm"
                                  : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "flex h-6 w-6 shrink-0 rounded-full border items-center justify-center text-[11px] font-bold",
                                  isSelected
                                    ? "border-purple-400 bg-purple-400 text-slate-950"
                                    : "border-white/20 bg-white/5 text-muted-foreground"
                                )}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-purple-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="px-5 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Save &amp; Return to Hub
              </button>

              <button
                type="button"
                onClick={handleCompleteStage3}
                className="px-6 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <span>Complete Stage 3 &rarr; Unlock Stage 4 Project</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 7: STAGE 4 - REAL-WORLD ARCHITECTURE PROJECT */}
        {step === "stage4" && examSuite && (
          <div className="max-w-4xl mx-auto space-y-6 animate-panel-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Stages Hub</span>
              </button>
              <span className="text-xs font-bold text-emerald-300">
                Stage 4 &bull; Real-World Project Challenge
              </span>
            </div>

            {/* Project Brief & Requirements */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Terminal className="h-4 w-4" />
                <span>Architectural Milestone Challenge</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                {examSuite.stages.stage4Project.title}
              </h3>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {examSuite.stages.stage4Project.projectBrief}
              </p>

              <div className="pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  System &amp; Architectural Invariants:
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {examSuite.stages.stage4Project.architectureRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Verification Milestones Checklist */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Testable Project Milestones
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {completedMilestones.length} of {examSuite.stages.stage4Project.keyMilestones.length} Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {examSuite.stages.stage4Project.keyMilestones.map((m) => {
                  const isChecked = completedMilestones.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMilestone(m.id)}
                      className={cn(
                        "rounded-2xl p-4 text-left border transition-all flex items-start justify-between gap-3",
                        isChecked
                          ? "border-emerald-500/50 bg-emerald-500/15 text-foreground shadow-sm"
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-bold text-foreground">{m.title}</div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed">{m.specification}</div>
                        <div className="text-[10px] text-emerald-400/80 font-mono">Test: {m.testCondition}</div>
                      </div>
                      <div className={cn(
                        "h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5",
                        isChecked ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-white/20 bg-white/5"
                      )}>
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Code Editor & Implementation Workspace */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-emerald-400" />
                  <span>TypeScript Project Implementation Scaffold</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(projectCode);
                    haptic("light");
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy Code</span>
                </button>
              </div>

              <textarea
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                rows={16}
                spellCheck={false}
                placeholder="Write and complete your implementation here..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-emerald-300 focus:border-emerald-400 focus:outline-none leading-relaxed resize-y"
              />
            </div>

            {/* Self-Assessment Notes / Reflection */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Architectural Notes &amp; Verification Observations (Optional)
              </label>
              <textarea
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                rows={3}
                placeholder="Note any trade-offs, O(1) performance guarantees, or edge cases handled..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-xs text-foreground focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("stage_hub")}
                className="px-5 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Save &amp; Return to Hub
              </button>

              <button
                type="button"
                onClick={handleCompleteStage4}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <span>Complete Stage 4 &rarr; Return to Hub</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 8: EVALUATION IN PROGRESS */}
        {step === "evaluating" && (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto space-y-6 animate-panel-in">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-2xl animate-pulse">
                <Sparkles className="h-10 w-10 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Calculating Comprehensive AI Evaluation</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Synthesizing performance across Theory, Code Logic, Debugging, and Project Implementation...
              </p>
            </div>
          </div>
        )}

        {/* VIEW 9: FINAL RESULTS & MASTERY INTERFACE */}
        {step === "results" && evaluation && (
          <div className="max-w-4xl mx-auto py-2 space-y-6 animate-panel-in">
            {/* Master Score Hero Card */}
            <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.09] to-white/[0.02] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
                  <Award className="h-4 w-4" />
                  <span>Comprehensive Mastery Verdict</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {evaluation.masteryGrade}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                  {evaluation.executiveSummary}
                </p>
              </div>

              {/* Big Score Gauge */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="h-28 w-28 rounded-full border-4 border-amber-400/40 bg-amber-400/10 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {evaluation.masteryScore}%
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Mastery
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Stage Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Theory */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Stage 1: Theory</span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {evaluation.stageBreakdown.theory.percentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {evaluation.stageBreakdown.theory.feedback}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-muted-foreground/70">
                  Score: {evaluation.stageBreakdown.theory.score} / {evaluation.stageBreakdown.theory.maxScore}
                </div>
              </div>

              {/* Code Logic */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Stage 2: Logic</span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {evaluation.stageBreakdown.codeLogic.percentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {evaluation.stageBreakdown.codeLogic.feedback}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-muted-foreground/70">
                  Score: {evaluation.stageBreakdown.codeLogic.score} / {evaluation.stageBreakdown.codeLogic.maxScore}
                </div>
              </div>

              {/* Debugging */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Stage 3: Debug</span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {evaluation.stageBreakdown.codeDebugging.percentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {evaluation.stageBreakdown.codeDebugging.feedback}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-muted-foreground/70">
                  Score: {evaluation.stageBreakdown.codeDebugging.score} / {evaluation.stageBreakdown.codeDebugging.maxScore}
                </div>
              </div>

              {/* Project */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Stage 4: Project</span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {evaluation.stageBreakdown.project.percentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {evaluation.stageBreakdown.project.feedback}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-muted-foreground/70">
                  Milestones: {completedMilestones.length} / 4
                </div>
              </div>
            </div>

            {/* Strengths & Critical Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 backdrop-blur-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Demonstrated Strengths</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {evaluation.keyStrengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">&bull;</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Targeted Remediation Areas</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {evaluation.criticalGaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">&bull;</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3-Step Socratic Remediation Roadmap */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl space-y-4">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>AI Socratic Remediation Roadmap</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {evaluation.socraticRemediationRoadmap.map((stepItem) => (
                  <div key={stepItem.step} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold items-center justify-center">
                        {stepItem.step}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">{stepItem.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{stepItem.actionableGuidance}</p>
                    <div className="text-[10px] text-primary/80 font-mono pt-1 truncate">
                      Focus: {stepItem.recommendedReviewNote}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons: Export to Note, Open in Polisher, Retake */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportToNotes}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all",
                    savedNoteSuccess
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
                  )}
                >
                  {savedNoteSuccess ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Bookmark className="h-3.5 w-3.5" />}
                  <span>{savedNoteSuccess ? "Saved to Notes!" : "Save Mastery Report to Notes"}</span>
                </button>

                {onOpenNotePolisher && (
                  <button
                    type="button"
                    onClick={handleOpenPolisherRemediation}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 flex items-center gap-2 transition-all"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Launch Remediation in AI Note Polisher</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={resetAll}
                className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retake / New Exam</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>,
    document.body
  );
}
