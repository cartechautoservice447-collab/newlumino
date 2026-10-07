import React, { useState, useEffect } from "react";
import {
  Wand2,
  Sparkles,
  FileText,
  Code2,
  Brain,
  ListChecks,
  Check,
  Copy,
  ArrowRight,
  RotateCcw,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  selectedNote: Note | null;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
}

type PolishMode = "study_guide" | "code_debug" | "mnemonics" | "key_takeaways";

const MODES: { id: PolishMode; label: string; desc: string; icon: React.ElementType }[] = [
  {
    id: "study_guide",
    label: "Study Guide",
    desc: "Executive summary, clean tables & active hierarchy",
    icon: FileText,
  },
  {
    id: "code_debug",
    label: "Code & Logic Audit",
    desc: "Syntax validation, edge cases & terminal outputs",
    icon: Code2,
  },
  {
    id: "mnemonics",
    label: "Memory Mnemonics",
    desc: "Acronyms & visual spatial memory pegs",
    icon: Brain,
  },
  {
    id: "key_takeaways",
    label: "Key Takeaways",
    desc: "High-yield concept extraction",
    icon: ListChecks,
  },
];

export function AiNotePolisherDialog({
  open,
  onOpenChange,
  notes,
  selectedNote,
  onUpdateNote,
}: Props) {
  const { showNotification } = useNotifications();

  const [activeTargetId, setActiveTargetId] = useState<string>(
    selectedNote?.id || (notes[0]?.id ?? "")
  );
  const [selectedMode, setSelectedMode] = useState<PolishMode>("study_guide");
  const [isProcessing, setIsProcessing] = useState(false);
  const [polishedResult, setPolishedResult] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"preview" | "original">("preview");
  const [copied, setCopied] = useState(false);

  const targetNote = notes.find((n) => n.id === activeTargetId) || selectedNote || notes[0] || null;

  useEffect(() => {
    if (open && selectedNote) {
      setActiveTargetId(selectedNote.id);
      setPolishedResult(null);
      setChangeLog([]);
    }
  }, [open, selectedNote]);

  const handleTransform = async () => {
    if (!targetNote) {
      showNotification({
        message: "No Note Selected",
        description: "Choose a note to polish.",
        type: "warning",
      });
      return;
    }

    if (!targetNote.body?.trim()) {
      showNotification({
        message: "Empty Note",
        description: "Write some notes before running AI polishing.",
        type: "warning",
      });
      return;
    }

    haptic("medium");
    setIsProcessing(true);
    setPolishedResult(null);

    try {
      const res = await fetch("/api/ai/note-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteTitle: targetNote.title,
          noteBody: targetNote.body,
          mode: selectedMode,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.polishedContent) {
        setPolishedResult(data.polishedContent);
        setChangeLog(data.summaryOfChanges || ["Enhanced note formatting and structure"]);
        setActiveTab("preview");
        haptic("success");
      } else {
        throw new Error("Empty transformation result");
      }
    } catch (err) {
      console.error("Polishing failed:", err);
      showNotification({
        message: "AI Transformation Failed",
        description: "Could not enhance note. Please check connection.",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyToNote = () => {
    if (!targetNote || !polishedResult || !onUpdateNote) return;
    haptic("success");
    onUpdateNote(targetNote.id, { body: polishedResult });
    showNotification({
      message: "Note Updated with AI Polish",
      description: `"${targetNote.title}" updated successfully.`,
      type: "success",
    });
    onOpenChange(false);
  };

  const handleCopy = () => {
    if (!polishedResult) return;
    haptic("light");
    navigator.clipboard.writeText(polishedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel scroll-sleek max-h-[90vh] overflow-y-auto border-white/10 sm:max-w-[650px] p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-primary/30 text-cyan-400 border border-cyan-500/30 shadow-[0_0_16px_-4px_rgba(6,182,212,0.5)]">
              <Wand2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight">
                AI Note Polisher &amp; Code Debugger
              </DialogTitle>
              <p className="text-[0.68rem] text-muted-foreground">
                Enhance structure, verify code logic, and craft mnemonic hooks
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Note Selector & Mode Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                Target Note
              </label>
              <span className="text-[0.65rem] text-cyan-400 font-mono">
                {targetNote?.body?.length || 0} characters
              </span>
            </div>
            <select
              value={activeTargetId}
              onChange={(e) => {
                haptic("light");
                setActiveTargetId(e.target.value);
                setPolishedResult(null);
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

          {/* Transformation Modes */}
          <div className="space-y-1.5">
            <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
              Select Enhancement Mode
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setSelectedMode(m.id);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition-all cursor-pointer active:scale-95",
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-500/15 text-foreground ring-1 ring-cyan-500/40"
                        : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isSelected ? "text-cyan-400" : "text-muted-foreground")} />
                    <span className="text-xs font-bold leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Processing trigger button */}
          <button
            type="button"
            disabled={isProcessing || !targetNote}
            onClick={handleTransform}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-primary to-emerald-500 py-3 text-xs font-bold text-white shadow-xl hover:opacity-95 active:scale-98 transition disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gemini is Enhancing Note Content...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Polish Note with Gemini AI</span>
              </>
            )}
          </button>

          {/* Result view */}
          {polishedResult && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 animate-in fade-in">
              {/* Summary of enhancements */}
              {changeLog.length > 0 && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Enhancements Made:</span>
                  </div>
                  <ul className="text-[0.68rem] text-muted-foreground list-disc list-inside space-y-0.5">
                    {changeLog.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* View mode toggle */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md font-semibold transition cursor-pointer",
                      activeTab === "preview" ? "bg-white/[0.12] text-foreground" : "text-muted-foreground"
                    )}
                  >
                    AI Enhanced Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("original")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md font-semibold transition cursor-pointer",
                      activeTab === "original" ? "bg-white/[0.12] text-foreground" : "text-muted-foreground"
                    )}
                  >
                    Original Note
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Markdown Rendered Preview */}
              <div className="max-h-60 overflow-y-auto scroll-sleek rounded-xl border border-white/5 bg-black/40 p-3.5 text-xs text-foreground">
                <MarkdownPreview content={activeTab === "preview" ? polishedResult : targetNote.body} />
              </div>

              {/* Apply Button */}
              {onUpdateNote && (
                <button
                  type="button"
                  onClick={handleApplyToNote}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 active:scale-98 transition cursor-pointer shadow-lg"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Apply AI Enhancements to "{targetNote.title}"</span>
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
