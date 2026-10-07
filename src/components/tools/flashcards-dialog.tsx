import React, { useState, useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import {
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Brain,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FolderOpen,
  FileText,
  Flame,
  ArrowRight,
  Layers,
  Loader2,
  Wand2,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Search,
  Quote,
  Target,
  Zap,
  Code2,
  Scale,
  Lightbulb,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";
import {
  extractFlashcardsFromNote,
  extractAllFlashcards,
  requestAIFlashcards,
  type Flashcard,
  type FlashcardArchetype,
  type FlashcardRating,
} from "@/lib/flashcard-generator";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  selectedNote: Note | null;
  activeCourseName?: string | null;
  autoAIGenerate?: boolean;
}

const ARCHETYPES: { id: FlashcardArchetype; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "mixed", label: "Mixed Study", icon: Target, desc: "Balanced blend of theory, code, and conceptual cards" },
  { id: "conceptual", label: "Concepts & Terms", icon: Lightbulb, desc: "Definitions, theoretical mechanisms & principles" },
  { id: "code_cloze", label: "Code & Cloze", icon: Code2, desc: "Output prediction, syntax fill-in-blanks & bugs" },
  { id: "contrast", label: "Contrast & Compare", icon: Scale, desc: "Differentiating confusable functions & mechanisms" },
  { id: "practical", label: "Practical Scenarios", icon: Zap, desc: "Real-world engineering problems & edge cases" },
];

export function FlashcardsDialog({
  open,
  onOpenChange,
  notes,
  selectedNote,
  activeCourseName,
  autoAIGenerate = false,
}: Props) {
  const { showNotification } = useNotifications();
  const [source, setSource] = useState<"current" | "all">("current");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<Record<string, FlashcardRating>>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGeneratedCount, setAiGeneratedCount] = useState(0);

  // 3. Multi-Archetype Study State
  const [activeArchetype, setActiveArchetype] = useState<FlashcardArchetype>("mixed");

  // 5. Adaptive Spaced Repetition (FSRS / Weak Cards) State
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState<boolean>(false);

  // Batch Options State
  const [batchSize, setBatchSize] = useState<number>(8);
  const [batchMode, setBatchMode] = useState<"append" | "replace">("append");
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [showBatchOptions, setShowBatchOptions] = useState<boolean>(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Touch gesture tracking for mobile swipe
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);

  // Target note to study
  const targetNote = selectedNote || notes[0] || null;

  // Generate cards based on source
  const rawCards = useMemo(() => {
    if (source === "current" && targetNote) {
      const extracted = extractFlashcardsFromNote(targetNote);
      if (extracted.length > 0) return extracted;
    }
    return extractAllFlashcards(notes);
  }, [source, targetNote, notes]);

  // Active deck
  const [deck, setDeck] = useState<Flashcard[]>([]);

  useEffect(() => {
    if (open) {
      setDeck(rawCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setCompleted(false);
      setResults({});
      setBatchIndex(0);
      setBatchFeedback(null);
      setIsAdaptiveMode(false);
    }
  }, [source, open]);

  // Handle AI Flashcard Generation with multi-batch and deduplication
  const handleGenerateAI = async (
    sessionType: "general" | "pomodoro" = "general",
    forcedBatchIndex?: number,
    forcedMode?: "append" | "replace",
    forcedArchetype?: FlashcardArchetype,
    forcedWeakTopics?: string[]
  ) => {
    if (!targetNote && notes.length === 0) return;
    setIsGeneratingAI(true);
    setBatchFeedback(null);

    const bIndex = typeof forcedBatchIndex === "number" ? forcedBatchIndex : batchIndex;
    const modeToUse = forcedMode || batchMode;
    const archToUse = forcedArchetype || activeArchetype;
    const weaksToUse = forcedWeakTopics || weakTopics;

    try {
      const noteToUse = source === "current" ? targetNote : null;
      const notesToUse = source === "all" ? notes : targetNote ? [targetNote] : notes;
      const existingPrompts = deck.map((c) => c.front);

      const aiCards = await requestAIFlashcards({
        note: noteToUse,
        notes: notesToUse,
        count: batchSize,
        batchIndex: bIndex,
        sessionType,
        existingPrompts,
        archetype: archToUse,
        weakTopics: weaksToUse,
      });

      if (aiCards.length > 0) {
        if (modeToUse === "append" && deck.length > 0 && !completed) {
          setDeck((prev) => [...prev, ...aiCards]);
          setBatchFeedback(`Batch #${bIndex + 1} added (+${aiCards.length} ${archToUse} cards)`);
        } else if (completed && modeToUse === "append") {
          // Advance into the newly appended batch
          const newStartIdx = deck.length;
          setDeck((prev) => [...prev, ...aiCards]);
          setCurrentIndex(newStartIdx);
          setIsFlipped(false);
          setCompleted(false);
          setBatchFeedback(`Batch #${bIndex + 1} loaded (+${aiCards.length} cards)`);
        } else {
          // Fresh deck replacement
          setDeck(aiCards);
          setCurrentIndex(0);
          setIsFlipped(false);
          setCompleted(false);
          setResults({});
          setBatchFeedback(`Fresh Batch #${bIndex + 1} (${aiCards.length} cards)`);
        }

        setBatchIndex(bIndex + 1);
        setAiGeneratedCount((c) => c + aiCards.length);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        showNotification({
          message: "Flashcards Synthesized",
          description: `Generated ${aiCards.length} verified study flashcards via Gemini AI.`,
          type: "success",
        });
      }
    } catch (err) {
      console.error("AI flashcard generation failed", err);
      setBatchFeedback("Generation failed, please try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Auto trigger AI if requested (e.g. after Pomodoro session)
  useEffect(() => {
    if (open && autoAIGenerate && targetNote) {
      handleGenerateAI("pomodoro");
    }
  }, [open, autoAIGenerate]);

  const currentCard = deck[currentIndex];

  const handleFlip = () => {
    haptic("light");
    setIsFlipped((f) => !f);
  };

  // 5. Adaptive Spaced Repetition (Again, Hard, Good, Easy)
  const handleRate = (cardId: string, rating: FlashcardRating) => {
    if (rating === "easy" || rating === "good") {
      haptic("success");
    } else {
      haptic("warning");
      // Add front prompt to weak topics for adaptive drill
      if (currentCard) {
        setWeakTopics((prev) => Array.from(new Set([...prev, currentCard.front])));
      }
    }

    setResults((prev) => ({ ...prev, [cardId]: rating }));
    setIsFlipped(false);
    setDragOffset(0);

    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      setCompleted(true);
      showNotification({
        message: "Review Session Complete",
        description: `You've mastered ${goodCount + easyCount} concepts! Keep up the momentum.`,
        type: "success",
      });
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchCurrentX.current === null) return;
    const diff = touchCurrentX.current - touchStartX.current;
    const threshold = 75;

    if (diff > threshold && currentCard) {
      handleRate(currentCard.id, "good");
    } else if (diff < -threshold && currentCard) {
      handleRate(currentCard.id, "again");
    }

    touchStartX.current = null;
    touchCurrentX.current = null;
    setDragOffset(0);
  };

  // Spaced repetition analytics
  const againCount = Object.values(results).filter((r) => r === "again").length;
  const hardCount = Object.values(results).filter((r) => r === "hard").length;
  const goodCount = Object.values(results).filter((r) => r === "good").length;
  const easyCount = Object.values(results).filter((r) => r === "easy").length;
  const weakCardsCount = againCount + hardCount;

  const restartMissed = () => {
    haptic("medium");
    const missedCards = deck.filter((c) => results[c.id] === "again" || results[c.id] === "hard");
    if (missedCards.length > 0) {
      setDeck(missedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setCompleted(false);
      setResults({});
      setIsAdaptiveMode(true);
    }
  };

  const handleTriggerAdaptiveAI = () => {
    haptic("heavy");
    setIsAdaptiveMode(true);
    handleGenerateAI("general", batchIndex, "replace", "mixed", weakTopics);
  };

  const restartAll = () => {
    haptic("medium");
    setDeck(rawCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
    setResults({});
    setBatchIndex(0);
    setIsAdaptiveMode(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        haptic(val ? "medium" : "light");
        onOpenChange(val);
      }}
    >
      <DialogContent className="glass-panel max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 bg-black/90 p-4 sm:p-6 shadow-2xl backdrop-blur-3xl scroll-sleek sm:max-w-[560px]">
        {/* Header */}
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_-2px_rgba(168,85,247,0.6)]">
                <Brain className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  Smart Flashcards
                </DialogTitle>
                <p className="text-[0.68rem] text-muted-foreground">
                  FSRS Spaced Repetition • Note-Grounded Accuracy
                </p>
              </div>
            </div>

            {deck.length > 0 && !completed && (
              <span className="font-mono text-xs font-bold text-muted-foreground bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-lg">
                {currentIndex + 1} / {deck.length}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Source Scope Bar */}
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-0.5 scroll-sleek">
          {selectedNote && (
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setSource("current");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer",
                source === "current"
                  ? "border-primary/50 bg-primary/20 text-foreground font-bold shadow-sm"
                  : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate max-w-[150px]">{selectedNote.title || "Current Note"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              haptic("light");
              setSource("all");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer",
              source === "all"
                ? "border-primary/50 bg-primary/20 text-foreground font-bold shadow-sm"
                : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Course Notes ({notes.length})</span>
          </button>

          {/* 5. Adaptive Review Trigger Badge */}
          {weakTopics.length > 0 && (
            <button
              type="button"
              onClick={handleTriggerAdaptiveAI}
              className="flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 shrink-0 transition-all active:scale-95 shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-300" />
              <span>Target Weak Gaps ({weakTopics.length})</span>
            </button>
          )}
        </div>

        {/* 3. Multi-Archetype Selection Bar */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scroll-sleek select-none">
          <span className="text-[0.65rem] uppercase font-bold text-muted-foreground/80 shrink-0 mr-0.5">
            Archetype:
          </span>
          {ARCHETYPES.map((arch) => {
            const Icon = arch.icon;
            const isSelected = activeArchetype === arch.id;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => {
                  haptic("light");
                  setActiveArchetype(arch.id);
                }}
                title={arch.desc}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer",
                  isSelected
                    ? "bg-purple-500 text-white font-bold shadow-md shadow-purple-500/30 ring-1 ring-purple-400"
                    : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{arch.label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Generator Action Bar & Batch Controls */}
        <div className="mt-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-2.5 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground">Gemini AI Deck</p>
                  <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-purple-300">
                    Batch #{batchIndex + 1}
                  </span>
                </div>
                <p className="text-[0.65rem] text-muted-foreground truncate">
                  {batchFeedback
                    ? batchFeedback
                    : aiGeneratedCount > 0
                    ? `${aiGeneratedCount} cards generated • ${activeArchetype}`
                    : `Generate ${batchSize} study flashcards`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Batch Options Toggle */}
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setShowBatchOptions((s) => !s);
                }}
                className={cn(
                  "flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer",
                  showBatchOptions
                    ? "border-purple-400 bg-purple-500/30 text-white"
                    : "border-purple-500/30 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                )}
                title="Configure Batch Size and Options"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-mono">{batchSize}</span>
              </button>

              {/* Generate Batch Button */}
              <button
                type="button"
                disabled={isGeneratingAI}
                onClick={() => {
                  haptic("heavy");
                  handleGenerateAI("general");
                }}
                className="flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_14px_-2px_rgba(168,85,247,0.7)] transition-all active:scale-95 hover:bg-purple-500 disabled:opacity-50 touch-manipulation cursor-pointer"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>+ Batch ({batchSize})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expandable Batch Configuration Options Drawer */}
          {showBatchOptions && (
            <div className="mt-2.5 pt-2.5 border-t border-purple-500/20 space-y-2 text-xs">
              {/* Batch Size Options */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-purple-200">
                  Batch Size:
                </span>
                <div className="flex items-center gap-1.5">
                  {[5, 8, 12, 16].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setBatchSize(sz);
                      }}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all active:scale-95 touch-manipulation cursor-pointer",
                        batchSize === sz
                          ? "border border-purple-400 bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                          : "border border-white/10 bg-white/[0.05] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      )}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Append Mode */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-purple-200">
                  Batch Insertion:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setBatchMode("append");
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[0.7rem] font-bold transition-all active:scale-95 touch-manipulation cursor-pointer",
                      batchMode === "append"
                        ? "border border-purple-400 bg-purple-500 text-white"
                        : "border border-white/10 bg-white/[0.05] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Append (+Add to Deck)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setBatchMode("replace");
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[0.7rem] font-bold transition-all active:scale-95 touch-manipulation cursor-pointer",
                      batchMode === "replace"
                        ? "border border-purple-400 bg-purple-500 text-white"
                        : "border border-white/10 bg-white/[0.05] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Replace (New Deck)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {deck.length > 0 && !completed && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-primary transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
            />
          </div>
        )}

        {/* Completed Screen with FSRS 4-Tier Breakdown */}
        {completed ? (
          <div className="my-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_24px_-4px_hsl(var(--primary)/0.7)] animate-pulse">
              <Sparkles className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Study Interval Complete!
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Spaced repetition review finished for {deck.length} cards
              </p>
            </div>

            {/* 5. 4-Tier Spaced Repetition Scorecard */}
            <div className="grid grid-cols-4 gap-2 w-full">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-center">
                <span className="text-lg font-mono font-bold text-rose-400">{againCount}</span>
                <p className="text-[0.6rem] uppercase font-bold tracking-wider text-rose-300">Again</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-center">
                <span className="text-lg font-mono font-bold text-amber-400">{hardCount}</span>
                <p className="text-[0.6rem] uppercase font-bold tracking-wider text-amber-300">Hard</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
                <span className="text-lg font-mono font-bold text-emerald-400">{goodCount}</span>
                <p className="text-[0.6rem] uppercase font-bold tracking-wider text-emerald-300">Good</p>
              </div>
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2 text-center">
                <span className="text-lg font-mono font-bold text-sky-400">{easyCount}</span>
                <p className="text-[0.6rem] uppercase font-bold tracking-wider text-sky-300">Easy</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full pt-2">
              <button
                type="button"
                disabled={isGeneratingAI}
                onClick={() => handleGenerateAI("general", batchIndex, "append")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/50 bg-gradient-to-r from-purple-600 to-indigo-600 p-2.5 text-xs font-bold text-white shadow-[0_0_16px_rgba(168,85,247,0.5)] transition-all active:scale-95 hover:brightness-110 cursor-pointer"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synthesizing Batch #{batchIndex + 1}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>AI Generate Next Batch (+{batchSize})</span>
                  </>
                )}
              </button>

              {weakCardsCount > 0 && (
                <button
                  type="button"
                  onClick={restartMissed}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-3 py-2.5 text-xs font-bold text-amber-300 transition-all active:scale-95 cursor-pointer hover:bg-amber-400/25"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Review Weak Only ({weakCardsCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={restartAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Brain className="h-4 w-4" />
                <span>Restart All</span>
              </button>
            </div>
          </div>
        ) : deck.length === 0 ? (
          /* Empty Deck State */
          <div className="my-8 flex flex-col items-center justify-center text-center p-4">
            <Brain className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold text-foreground">No flashcards found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Tap <span className="font-bold text-purple-300">+ Batch ({batchSize})</span> above to let AI automatically generate study flashcards from your notes!
            </p>
          </div>
        ) : (
          /* Active Flashcard Swipe Canvas */
          <div className="my-3 space-y-3">
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleFlip}
              style={{
                transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`,
                transition: dragOffset === 0 ? "transform 0.3s ease, border-color 0.2s" : "none",
              }}
              className={cn(
                "relative min-h-[270px] sm:min-h-[310px] w-full cursor-pointer select-none rounded-3xl border p-5 sm:p-6 shadow-2xl backdrop-blur-2xl transition-all flex flex-col justify-between",
                dragOffset > 30
                  ? "border-emerald-400/60 bg-emerald-950/20"
                  : dragOffset < -30
                  ? "border-rose-400/60 bg-rose-950/20"
                  : isFlipped
                  ? "border-purple-400/40 bg-white/[0.07]"
                  : "border-white/15 bg-white/[0.04] hover:border-white/25"
              )}
            >
              {/* Swipe Hints Indicators */}
              {dragOffset > 20 && (
                <div className="absolute top-4 right-4 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  Good →
                </div>
              )}
              {dragOffset < -20 && (
                <div className="absolute top-4 left-4 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/30">
                  ← Again
                </div>
              )}

              {/* Card Meta Top */}
              <div className="flex items-center justify-between text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-primary truncate max-w-[140px]">
                    {currentCard.noteTitle}
                  </span>
                  {currentCard.type && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[0.6rem] font-bold text-foreground">
                      {currentCard.type}
                    </span>
                  )}
                  {currentCard.id.startsWith("ai-") && (
                    <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[0.6rem] font-bold text-purple-300 border border-purple-500/30">
                      AI ✨
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold font-mono">
                  {isFlipped ? "Answer" : "Question"}
                </span>
              </div>

              {/* Card Content Body */}
              <div className="my-auto py-3 text-center">
                {isFlipped ? (
                  <div className="text-left text-foreground text-sm leading-relaxed max-h-[190px] overflow-y-auto scroll-sleek px-1 space-y-2.5">
                    <MarkdownPreview content={currentCard.back} />

                    {/* 2. Note-Grounded Source Attribution Block */}
                    {currentCard.sourceExcerpt && (
                      <div className="mt-3 rounded-2xl border border-purple-500/30 bg-purple-950/30 p-2.5 text-xs">
                        <div className="flex items-center gap-1 text-[0.68rem] font-bold text-purple-300 uppercase tracking-wider">
                          <Quote className="h-3 w-3" />
                          <span>Verified from Note:</span>
                        </div>
                        <p className="mt-1 text-[0.72rem] text-foreground/90 italic border-l-2 border-purple-400/60 pl-2 leading-snug">
                          "{currentCard.sourceExcerpt}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug">
                    {currentCard.front}
                  </p>
                )}
              </div>

              {/* Card Bottom Flip Prompt */}
              <div className="flex items-center justify-center gap-1.5 text-[0.68rem] font-semibold text-muted-foreground/80">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Tap card to flip ({isFlipped ? "view question" : "reveal answer"})</span>
              </div>
            </div>

            {/* 5. FSRS / SM-2 4-Tier Spaced Repetition Rating Buttons */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRate(currentCard.id, "again");
                }}
                className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 p-2 sm:p-2.5 transition-all active:scale-95 hover:bg-rose-500/20 cursor-pointer"
              >
                <span className="text-xs font-bold text-rose-400">Again</span>
                <span className="text-[0.62rem] font-mono text-muted-foreground">&lt;1m</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRate(currentCard.id, "hard");
                }}
                className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2 sm:p-2.5 transition-all active:scale-95 hover:bg-amber-500/20 cursor-pointer"
              >
                <span className="text-xs font-bold text-amber-400">Hard</span>
                <span className="text-[0.62rem] font-mono text-muted-foreground">10m</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRate(currentCard.id, "good");
                }}
                className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2 sm:p-2.5 transition-all active:scale-95 hover:bg-emerald-500/20 cursor-pointer"
              >
                <span className="text-xs font-bold text-emerald-400">Good</span>
                <span className="text-[0.62rem] font-mono text-muted-foreground">1d</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRate(currentCard.id, "easy");
                }}
                className="flex flex-col items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 p-2 sm:p-2.5 transition-all active:scale-95 hover:bg-sky-500/20 cursor-pointer"
              >
                <span className="text-xs font-bold text-sky-400">Easy</span>
                <span className="text-[0.62rem] font-mono text-muted-foreground">4d</span>
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
