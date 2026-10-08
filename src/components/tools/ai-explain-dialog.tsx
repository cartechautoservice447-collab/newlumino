import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  Copy,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";

type ExplainMode =
  | "clear"
  | "step_by_step"
  | "analogy"
  | "example"
  | "exam"
  | "code";

type ExplainResult = {
  title: string;
  coreAnswer: string;
  explanation: string;
  analogy: string;
  example: string;
  keyPoints: string[];
  commonMistake: string;
  checkQuestion: string;
  followUpQuestions: string[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  selectedNote: Note | null;
}

const MODES: { id: ExplainMode; label: string; description: string }[] = [
  { id: "clear", label: "Clear", description: "Simple, direct explanation" },
  { id: "step_by_step", label: "Step by Step", description: "Build the idea in logical steps" },
  { id: "analogy", label: "Analogy", description: "Connect it to a real-world idea" },
  { id: "example", label: "Example", description: "Teach it through an applied example" },
  { id: "exam", label: "Exam Ready", description: "Focus on what matters in assessment" },
  { id: "code", label: "Code Focus", description: "Explain syntax, logic and behavior" },
];

function stripMarkdown(value: string) {
  return value.replace(/[#>*_~\-]/g, " ").replace(/\s+/g, " ").trim();
}

export function AiExplainDialog({
  open,
  onOpenChange,
  notes,
  selectedNote,
}: Props) {
  const { showNotification } = useNotifications();
  const [activeTargetId, setActiveTargetId] = useState(selectedNote?.id || notes[0]?.id || "");
  const [mode, setMode] = useState<ExplainMode>("clear");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [copied, setCopied] = useState(false);

  const targetNote = useMemo(
    () => (activeTargetId ? notes.find((note) => note.id === activeTargetId) || selectedNote || notes[0] || null : null),
    [activeTargetId, notes, selectedNote],
  );

  useEffect(() => {
    if (open) {
      const nextId = selectedNote?.id || notes[0]?.id || "";
      setActiveTargetId(nextId);
      setResult(null);
      setCopied(false);
      setQuery("");
    }
  }, [open, selectedNote, notes]);

  const notePreview = targetNote?.body ? stripMarkdown(targetNote.body).slice(0, 220) : "";

  const handleExplain = async () => {
    const source = targetNote?.body?.trim() || "";
    const concept = query.trim();

    if (!concept && !source) {
      showNotification({
        message: "Nothing to Explain",
        description: "Choose a note or enter a concept/question first.",
        type: "warning",
      });
      return;
    }

    haptic("medium");
    setIsExplaining(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteTitle: targetNote?.title || "",
          noteBody: source,
          concept,
          mode,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data?.success || !data?.result) {
        throw new Error("Empty explanation result");
      }

      setResult(data.result as ExplainResult);
      haptic("success");
    } catch (error) {
      console.error("AI Explain failed:", error);
      showNotification({
        message: "AI Explain Failed",
        description: "Could not generate an explanation. Please try again.",
        type: "error",
      });
    } finally {
      setIsExplaining(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = [
      result.title,
      "",
      "Core Answer",
      result.coreAnswer,
      "",
      "Explanation",
      result.explanation,
      "",
      "Analogy",
      result.analogy,
      "",
      "Example",
      result.example,
      "",
      "Key Points",
      ...result.keyPoints.map((point) => `- ${point}`),
      "",
      "Common Mistake",
      result.commonMistake,
      "",
      "Check Your Understanding",
      result.checkQuestion,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      haptic("light");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showNotification({
        message: "Copy Failed",
        description: "The explanation could not be copied.",
        type: "error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 left-0 top-0 m-0 flex h-[100dvh] w-screen max-w-none max-h-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-slate-950/98 p-0 text-foreground shadow-none ring-0 sm:rounded-none">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.025] px-4 py-3.5 sm:px-8 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/20 via-cyan-500/15 to-emerald-500/15 text-violet-300 shadow-[0_0_20px_-5px_rgba(167,139,250,0.45)]">
              <Brain className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-foreground sm:text-lg">
                <span>AI Explain</span>
                <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-violet-300">
                  Study Tutor
                </span>
              </DialogTitle>
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                Turn difficult concepts into clear, structured understanding grounded in your notes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close AI Explain"
            className="mr-9 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-muted-foreground transition active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-sleek">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
            <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/35 via-slate-900/70 to-cyan-950/25 p-4 shadow-xl backdrop-blur-2xl sm:p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
                <Sparkles className="h-4 w-4" />
                Explain Anything From Your Study Workspace
              </div>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">
                Ask about a specific concept, formula, paragraph, code block, or question. AI Explain uses the selected note as grounding context when available.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <label className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                    What should AI explain?
                  </label>
                  <textarea
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="min-h-[118px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3.5 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 focus:border-violet-400/50"
                    placeholder="Example: Explain entropy in simple terms and show how it relates to the second law of thermodynamics."
                  />
                </div>

                <div className="min-w-0">
                  <label className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                    Source Note
                  </label>
                  <div className="relative">
                    <select
                      value={activeTargetId}
                      onChange={(event) => setActiveTargetId(event.target.value)}
                      className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/30 px-3 pr-9 text-sm text-white outline-none focus:border-violet-400/50"
                    >
                      <option value="">No source note</option>
                      {notes.map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.title || "Untitled Note"}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  {targetNote ? (
                    <div className="mt-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-cyan-300" />
                        <span className="truncate text-xs font-bold text-white">{targetNote.title || "Untitled Note"}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[0.7rem] leading-relaxed text-slate-400">
                        {notePreview || "This note has no readable preview."}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Explanation Style</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {MODES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setMode(item.id);
                      }}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition active:scale-[0.98]",
                        mode === item.id
                          ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                          : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="block text-xs font-bold">{item.label}</span>
                      <span className="mt-0.5 block text-[0.62rem] leading-relaxed opacity-75">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[0.68rem] text-slate-400">
                  <MessageCircleQuestion className="h-4 w-4 text-emerald-300" />
                  <span>Grounded to your selected note when provided.</span>
                </div>
                <button
                  type="button"
                  onClick={handleExplain}
                  disabled={isExplaining}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-violet-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                >
                  {isExplaining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                  {isExplaining ? "Explaining..." : "Explain This"}
                </button>
              </div>
            </section>

            {result ? (
              <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/15 p-5 shadow-xl backdrop-blur-xl sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-300">Core Answer</span>
                        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">{result.title}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 text-xs font-semibold text-slate-300 transition active:scale-95"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-[15px]">{result.coreAnswer}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                        <Brain className="h-4 w-4" />
                        Explanation
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{result.explanation}</p>
                    </article>

                    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                        <Lightbulb className="h-4 w-4" />
                        Analogy
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{result.analogy}</p>
                    </article>

                    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
                        <ArrowRight className="h-4 w-4" />
                        Worked Example
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{result.example}</p>
                    </article>

                    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
                        <MessageCircleQuestion className="h-4 w-4" />
                        Common Mistake
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{result.commonMistake}</p>
                    </article>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                    <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Key Points</div>
                    <div className="space-y-2.5">
                      {result.keyPoints.map((point, index) => (
                        <div key={index} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-[0.62rem] font-bold text-emerald-300">
                            {index + 1}
                          </span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/15 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                      <MessageCircleQuestion className="h-4 w-4" />
                      Check Your Understanding
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{result.checkQuestion}</p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Next Questions</div>
                    <div className="space-y-2">
                      {result.followUpQuestions.map((question, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setQuery(question);
                            haptic("light");
                          }}
                          className="flex w-full items-start gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-2.5 text-left text-xs text-slate-300 transition hover:bg-white/[0.05] active:scale-[0.99]"
                        >
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
                          <span>{question}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </section>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center sm:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">Ready to explain</h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-400">
                  Enter a concept or question above, choose a learning style, and AI Explain will turn it into a structured lesson.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
