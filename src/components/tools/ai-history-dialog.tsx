import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Brain, CheckCircle2, ChevronRight, Clock3, Code2, Eye, FileText,
  FlaskConical, History, Layers, Play, RefreshCw, RotateCcw, Sparkles, Target,
  Trash2, Wand2, X, Zap, type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/context/auth-context";
import {
  clearAiHistory, deleteAiHistory, listAiHistory,
  type AiHistoryRecord, type AiHistoryTool,
} from "@/lib/ai-history";

export type AiHistoryAction =
  | "open" | "deeper" | "simplify" | "example" | "visualize" | "compare" | "gap" | "practice" | "teach"
  | "flashcards" | "exam" | "plan" | "repolish" | "diagram" | "save_note"
  | "retake" | "review" | "polish" | "collection" | "weak_only" | "regenerate" | "export";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: AiHistoryTool;
  onAction: (action: AiHistoryAction, record: AiHistoryRecord) => void;
}

type ToolMeta = { label: string; description: string; icon: LucideIcon; tone: string; actions: { id: AiHistoryAction; label: string; icon: LucideIcon }[] };

const META: Record<AiHistoryTool, ToolMeta> = {
  learning_lab: {
    label: "AI Learning Lab", description: "Explanations, adaptive teaching, visual models, comparisons and practice.", icon: Brain, tone: "text-primary",
    actions: [
      { id: "open", label: "Open result", icon: Eye }, { id: "deeper", label: "Explain deeper", icon: Sparkles },
      { id: "simplify", label: "Simplify", icon: Zap }, { id: "example", label: "Show example", icon: FlaskConical },
      { id: "visualize", label: "Visualize", icon: Layers }, { id: "compare", label: "Compare", icon: Code2 },
      { id: "gap", label: "Find gap", icon: Target }, { id: "practice", label: "Quiz me", icon: CheckCircle2 },
      { id: "teach", label: "Teach me", icon: Brain }, { id: "flashcards", label: "Flashcards", icon: FileText },
      { id: "exam", label: "Practice exam", icon: Target }, { id: "plan", label: "Study plan", icon: Clock3 },
    ],
  },
  note_polisher: {
    label: "AI Note Polisher", description: "Note transformations, diagrams, structure and remediation passes.", icon: Wand2, tone: "text-violet-300",
    actions: [
      { id: "open", label: "Open result", icon: Eye }, { id: "repolish", label: "Re-polish", icon: RefreshCw },
      { id: "diagram", label: "Visual architecture", icon: Layers }, { id: "save_note", label: "Save as note", icon: FileText },
    ],
  },
  exam_simulator: {
    label: "AI Exam Simulator", description: "Diagnostic mock exams, answer reviews and remediation bridges.", icon: Target, tone: "text-amber-300",
    actions: [
      { id: "open", label: "Open review", icon: Eye }, { id: "review", label: "Review attempt", icon: CheckCircle2 },
      { id: "retake", label: "Retake exam", icon: RotateCcw }, { id: "flashcards", label: "Review flashcards", icon: FileText },
      { id: "polish", label: "Remediate note", icon: Wand2 }, { id: "collection", label: "4-stage assessment", icon: Layers },
    ],
  },
  progressive_exam: {
    label: "4-Stage Pro Exam", description: "Theory, code logic, debugging and project assessment history.", icon: Layers, tone: "text-emerald-300",
    actions: [
      { id: "open", label: "Open report", icon: Eye }, { id: "review", label: "Review stages", icon: CheckCircle2 },
      { id: "retake", label: "Retake 4-stage", icon: RotateCcw }, { id: "polish", label: "Remediate note", icon: Wand2 },
      { id: "export", label: "Export study guide", icon: FileText },
    ],
  },
  flashcards: {
    label: "AI Study Flashcards", description: "Generated decks, spaced-repetition review and weak-card drills.", icon: FileText, tone: "text-cyan-300",
    actions: [
      { id: "open", label: "Resume deck", icon: Play }, { id: "review", label: "Restart review", icon: RotateCcw },
      { id: "weak_only", label: "Review weak only", icon: Target }, { id: "regenerate", label: "Regenerate cards", icon: RefreshCw },
    ],
  },
};

function formatRelative(iso: string) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "Unknown time";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d ago";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function payloadPreview(record: AiHistoryRecord) {
  const payload = record.payload || {};
  const result = payload.result as any;
  if (record.tool === "learning_lab") return result?.coreAnswer || "Learning Lab result saved.";
  if (record.tool === "note_polisher") return payload.polishedResult || "Polished note result saved.";
  if (record.tool === "exam_simulator") return payload.overallDiagnosticSummary || "Diagnostic exam attempt saved.";
  if (record.tool === "progressive_exam") return payload.evaluation?.executiveSummary || "4-stage assessment result saved."; 
  if (record.tool === "flashcards") return "Deck with " + String(Array.isArray(payload.deck) ? payload.deck.length : 0) + " cards saved."; 
  return "AI session saved.";
}

export function AiHistoryDialog({ open, onOpenChange, tool, onAction }: Props) {
  const { user } = useAuth();
  const meta = META[tool];
  const [records, setRecords] = useState<AiHistoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => records.find((record) => record.id === selectedId) || records[0] || null, [records, selectedId]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) => (record.title + " " + record.subtitle + " " + record.action).toLowerCase().includes(q));
  }, [records, query]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setQuery("");
    listAiHistory(user?.id, tool).then((next) => {
      if (!active) return;
      setRecords(next);
      setSelectedId(next[0]?.id || null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, tool, user?.id]);

  const runAction = (action: AiHistoryAction) => {
    if (!selected) return;
    haptic("medium");
    onAction(action, selected);
  };

  const removeSelected = async () => {
    if (!selected) return;
    haptic("medium");
    await deleteAiHistory(user?.id, selected.id);
    const next = records.filter((record) => record.id !== selected.id);
    setRecords(next);
    setSelectedId(next[0]?.id || null);
  };

  const clearHistory = async () => {
    haptic("heavy");
    await clearAiHistory(user?.id, tool);
    setRecords([]);
    setSelectedId(null);
  };

  const Icon = meta.icon;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="fixed inset-0 left-0 top-0 m-0 flex h-[100dvh] w-screen max-h-none max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none sm:rounded-none">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-background/92 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Back to AI tool" onClick={() => onOpenChange(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]"><Icon className={cn("h-5 w-5", meta.tone)} /></div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-bold tracking-tight">{meta.label} History</DialogTitle>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.62rem] font-bold text-muted-foreground sm:inline"><History className="mr-1 inline h-3 w-3" />{records.length} saved</span>
            <button type="button" aria-label="Close history" onClick={() => onOpenChange(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-sleek">
          <div className="mx-auto grid min-h-full w-full max-w-[1440px] gap-4 p-3 sm:p-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-5 lg:p-6">
            <aside className="min-w-0 space-y-3">
              <div className="glass-panel rounded-2xl p-3.5">
                <div className="flex items-center justify-between gap-2"><div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Full history</div><button type="button" onClick={clearHistory} disabled={!records.length} className="text-[0.62rem] font-bold text-rose-300 disabled:opacity-40">Clear all</button></div>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search history" className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-black/15 px-3 text-xs outline-none focus:border-primary/60" />
              </div>
              <div className="space-y-2">
                {loading && <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-xs text-muted-foreground">Loading AI history…</div>}
                {!loading && !filtered.length && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center"><History className="mx-auto h-6 w-6 text-muted-foreground/60" /><p className="mt-2 text-sm font-semibold">No history yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Completed sessions from this AI tool will appear here.</p></div>}
                {filtered.map((record) => <button key={record.id} type="button" onClick={() => setSelectedId(record.id)} className={cn("w-full rounded-2xl border p-3 text-left transition", selected?.id === record.id ? "border-primary/35 bg-primary/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]")}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-bold">{record.title}</div><div className="mt-1 line-clamp-2 text-[0.68rem] leading-5 text-muted-foreground">{record.subtitle || record.action}</div></div><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /></div><div className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{formatRelative(record.createdAt)}</div></button>)}
              </div>
            </aside>

            <main className="min-w-0 space-y-4">
              {!selected ? <div className="glass-panel rounded-3xl p-8"><History className="h-6 w-6 text-muted-foreground/60" /><h2 className="mt-3 text-lg font-bold">Your AI timeline is ready</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Run this AI tool to create a resumable history entry.</p></div> : <>
                <section className="glass-panel rounded-3xl p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">{selected.action}</div><h2 className="mt-1 text-xl font-bold tracking-tight">{selected.title}</h2><p className="mt-1 text-xs text-muted-foreground">{selected.subtitle || "Saved AI session"} • {new Date(selected.createdAt).toLocaleString()}</p></div><button type="button" aria-label="Delete history item" onClick={() => void removeSelected()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/15 bg-rose-400/[0.06] text-rose-300"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Saved result</div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground/90">{payloadPreview(selected)}</p></div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {meta.actions.map((item) => { const ActionIcon = item.icon; return <button key={item.id} type="button" onClick={() => runAction(item.id)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-bold text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"><ActionIcon className={cn("h-3.5 w-3.5", meta.tone)} />{item.label}</button>; })}
                  </div>
                </section>
                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold"><Clock3 className="h-4 w-4 text-primary" />Context snapshot</div>
                  <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/[0.07] bg-black/15 p-3 text-[0.68rem] leading-5 text-muted-foreground">{JSON.stringify(selected.context || {}, null, 2)}</pre>
                </section>
              </>}
            </main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}