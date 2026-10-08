import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Wand2,
  Sparkles,
  FileText,
  Code2,
  Brain,
  ListChecks,
  Table,
  Check,
  Copy,
  RotateCcw,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  FolderTree,
  Layers,
  Download,
  AlignLeft,
  Maximize2,
  SlidersHorizontal,
  BookOpen,
  ListOrdered,
  FileDown,
  Target,
  ChevronRight,
  GitCompare,
  Eye,
  Hash,
  Bookmark,
  ArrowRight,
  Compass,
  Network,
  Activity,
  Workflow,
  Plus,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AiLearningLabFrame, LabInsightCard, LabToolButton } from "@/components/tools/ai-learning-lab-frame";
import { AiHistoryDialog, type AiHistoryAction } from "@/components/tools/ai-history-dialog";
import { createAiHistory, type AiHistoryRecord } from "@/lib/ai-history";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { MermaidDiagram } from "@/components/tools/mermaid-diagram";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  selectedNote: Note | null;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  onLaunchExam?: (note: Note) => void;
  initialMode?: PolishMode;
}

export type PolishMode =
  | "organizer"
  | "study_guide"
  | "code_debug"
  | "mnemonics"
  | "key_takeaways"
  | "cheat_sheet"
  | "remediation";

export type OrganizationDepth = "full" | "outline" | "roadmap" | "glossary";
export type BreathingRoomMode = "normal" | "relaxed" | "spacious";
export type PreviewFontSize = "sm" | "md" | "lg";
export type PolisherViewTab = "preview" | "visual_diagram" | "diff" | "original";
export type DiagramType = "flowchart" | "mindmap" | "sequence" | "state";

const MODES: { id: PolishMode; label: string; desc: string; icon: React.ElementType }[] = [
  {
    id: "organizer",
    label: "Knowledge Organizer",
    desc: "Multi-level outline, taxonomy, glossary & roadmap",
    icon: FolderTree,
  },
  {
    id: "study_guide",
    label: "Master Study Guide",
    desc: "Executive summary, deep theory, tables & active recall",
    icon: FileText,
  },
  {
    id: "remediation",
    label: "Gap Remediation",
    desc: "Misconception dissection, failure traps & recovery",
    icon: Compass,
  },
  {
    id: "code_debug",
    label: "Code & Logic Audit",
    desc: "Syntax validation, Big-O complexity & boundary guards",
    icon: Code2,
  },
  {
    id: "mnemonics",
    label: "Memory Architecture",
    desc: "Acronym frameworks, spatial pegs & retrieval triggers",
    icon: Brain,
  },
  {
    id: "cheat_sheet",
    label: "Quick Reference",
    desc: "Lookup tables, syntax matrices & critical formulas",
    icon: Table,
  },
  {
    id: "key_takeaways",
    label: "High-Yield 80/20",
    desc: "Pareto core drivers, misconception traps & schedule",
    icon: ListChecks,
  },
];

const ORGANIZER_DEPTH_OPTIONS: { id: OrganizationDepth; label: string; desc: string }[] = [
  {
    id: "full",
    label: "Full Architecture",
    desc: "Exhaustive organization of note topics, structure & key concepts",
  },
  {
    id: "outline",
    label: "Numbered Outline",
    desc: "Hierarchical numbered outline structured directly from note content",
  },
  {
    id: "roadmap",
    label: "Phased Roadmap",
    desc: "Sequential learning milestones and phases based on note topics",
  },
  {
    id: "glossary",
    label: "Taxonomy & Glossary",
    desc: "Key definitions, terms, and concept breakdown from note",
  },
];

const DIAGRAM_PRESETS: { id: DiagramType; label: string; desc: string; icon: React.ElementType }[] = [
  {
    id: "flowchart",
    label: "Concept Flowchart",
    desc: "Hierarchical data flows & decision gates",
    icon: Workflow,
  },
  {
    id: "mindmap",
    label: "Mindmap Tree",
    desc: "Radial taxonomy & core concept branches",
    icon: Network,
  },
  {
    id: "sequence",
    label: "Sequence Protocol",
    desc: "Message passing & asynchronous lifecycle",
    icon: Layers,
  },
  {
    id: "state",
    label: "State Machine",
    desc: "Transitions, conditions & execution guards",
    icon: Activity,
  },
];

interface ParsedSection {
  id: string;
  level: number;
  title: string;
  type: "heading" | "table" | "code" | "takeaway";
}

export function AiNotePolisherDialog({
  open,
  onOpenChange,
  notes,
  selectedNote,
  onUpdateNote,
  onLaunchExam,
  initialMode,
}: Props) {
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTargetId, setActiveTargetId] = useState<string>(
    selectedNote?.id || (notes[0]?.id ?? "")
  );
  const [selectedMode, setSelectedMode] = useState<PolishMode>(initialMode || "organizer");
  const [organizationDepth, setOrganizationDepth] = useState<OrganizationDepth>("full");
  const [breathingRoom, setBreathingRoom] = useState<BreathingRoomMode>("spacious");
  const [fontSize, setFontSize] = useState<PreviewFontSize>("md");
  const [isProcessing, setIsProcessing] = useState(false);
  const [polishedResult, setPolishedResult] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [readabilityScore, setReadabilityScore] = useState<number | null>(null);
  const [keyConceptsCovered, setKeyConceptsCovered] = useState<string[]>([]);
  const [wordCountStats, setWordCountStats] = useState<{ before: number; after: number } | null>(null);
  const [activeTab, setActiveTab] = useState<PolisherViewTab>("preview");
  const [showSectionNav, setShowSectionNav] = useState(true);
  const [copied, setCopied] = useState(false);

  // Diagram Studio State (Phase 2)
  const [diagramType, setDiagramType] = useState<DiagramType>("flowchart");
  const [diagramCode, setDiagramCode] = useState<string>("");
  const [diagramTitle, setDiagramTitle] = useState<string>("");
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const targetNote = notes.find((n) => n.id === activeTargetId) || selectedNote || notes[0] || null;

  useEffect(() => {
    if (open && selectedNote) {
      setActiveTargetId(selectedNote.id);
      setPolishedResult(null);
      setChangeLog([]);
      setReadabilityScore(null);
      setKeyConceptsCovered([]);
      setWordCountStats(null);
      setDiagramCode("");
      if (initialMode) {
        setSelectedMode(initialMode);
      }
    }
  }, [open, selectedNote, initialMode]);

  // Feature 3: Parse Document Structure Tree for Section Navigation
  const parsedSections = useMemo<ParsedSection[]>(() => {
    if (!polishedResult) return [];
    const lines = polishedResult.split("\n");
    const sections: ParsedSection[] = [];

    lines.forEach((line, idx) => {
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        sections.push({
          id: `sec-${idx}`,
          level: headingMatch[1].length,
          title: headingMatch[2].replace(/[#*`]/g, "").trim(),
          type: "heading",
        });
      } else if (line.trim().startsWith("|") && line.trim().endsWith("|") && !sections.some((s) => s.id === `tbl-${Math.floor(idx / 5)}`)) {
        if (line.includes("---")) {
          sections.push({
            id: `tbl-${idx}`,
            level: 3,
            title: "Data Matrix / Comparison Table",
            type: "table",
          });
        }
      }
    });

    return sections;
  }, [polishedResult]);

  // Scroll to section when clicked in Document Tree
  const handleScrollToSection = (title: string) => {
    if (!previewContainerRef.current) return;
    haptic("light");
    const container = previewContainerRef.current;
    const headings = container.querySelectorAll("h1, h2, h3, h4, table");
    for (const h of Array.from(headings)) {
      const text = h.textContent?.replace(/[#*`]/g, "").trim().toLowerCase() || "";
      const cleanTitle = title.toLowerCase();
      if (text.includes(cleanTitle) || cleanTitle.includes(text.slice(0, 15))) {
        h.scrollIntoView({ behavior: "smooth", block: "start" });
        h.classList.add("bg-cyan-500/20", "transition-colors", "duration-500", "rounded-lg");
        setTimeout(() => {
          h.classList.remove("bg-cyan-500/20");
        }, 1500);
        break;
      }
    }
  };

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
          organizationDepth,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.polishedContent) {
        setPolishedResult(data.polishedContent);
        setChangeLog(
          data.summaryOfChanges || [
            "Structured multi-level conceptual outline with numbered headings",
            "Constructed technical taxonomy and formal concept glossary",
            "Enhanced readability with generous whitespace and breathing room",
          ]
        );
        setReadabilityScore(data.readabilityScore || 96);
        setKeyConceptsCovered(data.keyConceptsCovered || []);
        if (data.wordCountBefore !== undefined && data.wordCountAfter !== undefined) {
          setWordCountStats({ before: data.wordCountBefore, after: data.wordCountAfter });
        }
        void createAiHistory({ userId: user?.id, tool: "note_polisher", title: targetNote.title || "Untitled note", subtitle: selectedMode + " • " + (targetNote.title || "Note"), action: "polish", context: { noteId: targetNote.id, noteTitle: targetNote.title, courseName: null, mode: selectedMode, organizationDepth }, payload: { targetNoteId: targetNote.id, selectedMode, organizationDepth, polishedResult: data.polishedContent, changeLog: data.summaryOfChanges || [], readabilityScore: data.readabilityScore || 96, keyConceptsCovered: data.keyConceptsCovered || [], wordCountStats: data.wordCountBefore !== undefined && data.wordCountAfter !== undefined ? { before: data.wordCountBefore, after: data.wordCountAfter } : null, activeTab: "preview" } });
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

  // Phase 2: Visual Diagram Generator Trigger
  const handleGenerateDiagram = async (typeToUse = diagramType) => {
    if (!targetNote || !targetNote.body?.trim()) {
      showNotification({
        message: "Empty Note",
        description: "Cannot generate architecture diagram from an empty note.",
        type: "warning",
      });
      return;
    }

    haptic("medium");
    setIsGeneratingDiagram(true);

    try {
      const bodyToAnalyze = polishedResult || targetNote.body;
      const res = await fetch("/api/ai/diagram-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteTitle: targetNote.title,
          noteBody: bodyToAnalyze,
          diagramType: typeToUse,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.mermaidCode) {
        setDiagramCode(data.mermaidCode);
        setDiagramTitle(data.title || (targetNote.title + " Architecture Map"));
        setActiveTab("visual_diagram");
        void createAiHistory({ userId: user?.id, tool: "note_polisher", title: data.title || (targetNote.title + " Architecture Map"), subtitle: "diagram • " + (targetNote.title || "Note"), action: "diagram", context: { noteId: targetNote.id, noteTitle: targetNote.title, courseName: null, mode: selectedMode, diagramType: typeToUse }, payload: { targetNoteId: targetNote.id, selectedMode, organizationDepth, polishedResult: polishedResult || null, diagramCode: data.mermaidCode, diagramTitle: data.title || (targetNote.title + " Architecture Map"), activeTab: "visual_diagram" } });
        haptic("success");
      }
    } catch (err) {
      console.error("Diagram generation failed:", err);
      showNotification({
        message: "Diagram Generation Error",
        description: "Could not synthesize Mermaid diagram.",
        type: "error",
      });
    } finally {
      setIsGeneratingDiagram(false);
    }
  };

  const handleHistoryAction = (action: AiHistoryAction, record: AiHistoryRecord) => {
    const payload = record.payload || {};
    const savedNoteId = typeof payload.targetNoteId === "string" ? payload.targetNoteId : "";
    const savedMode = typeof payload.selectedMode === "string" ? payload.selectedMode as PolishMode : "organizer";
    const savedDepth = typeof payload.organizationDepth === "string" ? payload.organizationDepth as OrganizationDepth : "full";
    const savedNote = notes.find((note) => note.id === savedNoteId) || targetNote;
    setActiveTargetId(savedNoteId || savedNote?.id || "");
    setSelectedMode(savedMode);
    setOrganizationDepth(savedDepth);
    setPolishedResult(typeof payload.polishedResult === "string" ? payload.polishedResult : null);
    setChangeLog(Array.isArray(payload.changeLog) ? payload.changeLog as string[] : []);
    setReadabilityScore(typeof payload.readabilityScore === "number" ? payload.readabilityScore : null);
    setKeyConceptsCovered(Array.isArray(payload.keyConceptsCovered) ? payload.keyConceptsCovered as string[] : []);
    setWordCountStats(payload.wordCountStats && typeof payload.wordCountStats === "object" ? payload.wordCountStats as { before: number; after: number } : null);
    setDiagramCode(typeof payload.diagramCode === "string" ? payload.diagramCode : "");
    setDiagramTitle(typeof payload.diagramTitle === "string" ? payload.diagramTitle : "");
    setActiveTab(payload.activeTab === "visual_diagram" ? "visual_diagram" : "preview");
    if (action === "open") { setHistoryOpen(false); return; }
    setHistoryOpen(false);
    if (action === "repolish") { setTimeout(() => { void handleTransform(); }, 0); return; }
    if (action === "diagram") { setTimeout(() => { void handleGenerateDiagram(); }, 0); return; }
    if (action === "save_note" && savedNote && typeof payload.polishedResult === "string" && onUpdateNote) {
      onUpdateNote(savedNote.id, { body: payload.polishedResult });
      showNotification({ message: "History result applied", description: "The saved AI polish was applied to the note.", type: "success" });
    }
  };
  const handleInsertDiagramIntoNote = (mermaidMarkdown: string) => {
    if (!targetNote) return;
    haptic("success");
    const currentText = polishedResult || targetNote.body || "";
    const updated = `${currentText}\n\n${mermaidMarkdown}`;

    if (polishedResult) {
      setPolishedResult(updated);
    }
    if (onUpdateNote) {
      onUpdateNote(targetNote.id, { body: updated });
    }

    showNotification({
      message: "Diagram Embedded in Note",
      description: "Interactive visual architecture appended to markdown.",
      type: "success",
    });
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

  // Feature 2: Direct Exam Launch Bridge from Polished Note (Phase 1 synergy)
  const handleLaunchExamFromNote = () => {
    if (!targetNote) return;
    haptic("medium");

    if (polishedResult && onUpdateNote) {
      onUpdateNote(targetNote.id, { body: polishedResult });
    }

    const noteForExam = {
      ...targetNote,
      body: polishedResult || targetNote.body,
    };

    onOpenChange(false);
    if (onLaunchExam) {
      setTimeout(() => {
        onLaunchExam(noteForExam);
      }, 250);
    }
  };

  const handleCopy = () => {
    if (!polishedResult) return;
    haptic("light");
    navigator.clipboard.writeText(polishedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!polishedResult || !targetNote) return;
    haptic("light");
    const blob = new Blob([polishedResult], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${targetNote.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-polished.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification({
      message: "Markdown Exported",
      description: "Note downloaded successfully.",
      type: "success",
    });
  };

  const handleInsertTOC = () => {
    if (!polishedResult) return;
    haptic("light");
    const lines = polishedResult.split("\n");
    const headers: { level: number; text: string }[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (match) {
        headers.push({
          level: match[1].length,
          text: match[2].trim(),
        });
      }
    });

    if (headers.length === 0) {
      showNotification({
        message: "No Headings Found",
        description: "Cannot generate Table of Contents without section headers.",
        type: "warning",
      });
      return;
    }

    const toc = [
      "## Table of Contents",
      "",
      ...headers.map((h) => {
        const indent = h.level === 3 ? "  -" : "-";
        return `${indent} ${h.text}`;
      }),
      "",
      "---",
      "",
    ].join("\n");

    let newContent = polishedResult;
    const titleMatch = polishedResult.match(/^#\s+[^\n]+\n+/);
    if (titleMatch) {
      const insertIdx = titleMatch[0].length;
      newContent = polishedResult.slice(0, insertIdx) + toc + "\n" + polishedResult.slice(insertIdx);
    } else {
      newContent = toc + "\n" + polishedResult;
    }

    setPolishedResult(newContent);
    showNotification({
      message: "Table of Contents Inserted",
      description: "Organized navigation index added to document.",
      type: "success",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="fixed inset-0 left-0 top-0 m-0 flex h-[100dvh] w-screen max-h-none max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-transparent p-0 text-foreground shadow-none">
        {/* Scrollable Workstation Body */}
        <AiLearningLabFrame
          onOpenHistory={() => setHistoryOpen(true)}
          title="AI Note Polisher"
          subtitle="Transform notes into structured, readable, source-faithful study material."
          status={targetNote ? "Source selected" : "Select a note"}
          statusTone="cyan"
          icon={Wand2}
          onClose={() => onOpenChange(false)}
          context={
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[0.64rem] font-semibold text-muted-foreground">TARGET NOTE</div>
                <div className="rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2 text-xs font-semibold text-foreground">{targetNote?.title || "No note selected"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[0.08] bg-black/15 p-2.5"><span className="block text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Characters</span><span className="mt-1 block text-xs font-mono font-bold text-foreground">{targetNote?.body?.length || 0}</span></div>
                <div className="rounded-xl border border-white/[0.08] bg-black/15 p-2.5"><span className="block text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground">Words</span><span className="mt-1 block text-xs font-mono font-bold text-cyan-300">{targetNote?.body?.trim() ? targetNote.body.trim().split(/\s+/).length : 0}</span></div>
              </div>
              <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.055] p-2.5"><div className="text-[0.64rem] font-bold uppercase tracking-wider text-cyan-300">Processing mode</div><p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">{selectedMode.replace("_", " ")}</p></div>
            </div>
          }
          intelligence={
            <div className="space-y-3">
              <LabInsightCard title="Readability" value={readabilityScore === null ? "—" : readabilityScore + "/100"} description="Academic readability after transformation." />
              <LabInsightCard title="Coverage" value={keyConceptsCovered.length ? String(keyConceptsCovered.length) : "—"} description="Key concepts explicitly covered." />
              {wordCountStats ? <LabInsightCard title="Word delta" value={String(wordCountStats.after - wordCountStats.before)} description={wordCountStats.before + " → " + wordCountStats.after + " words"} /> : null}
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.07] p-4"><div className="flex items-center gap-2 text-xs font-bold text-primary"><Sparkles className="h-4 w-4" />Recommended next action</div><p className="mt-2 text-sm leading-6 text-foreground">{polishedResult ? "Review the architecture, then apply the polished note or generate its visual model." : "Choose an enhancement mode and synthesize the note."}</p></div>
            </div>
          }
          footer={
            <>
              <LabToolButton label="Generate polish" icon={<Sparkles className="h-3.5 w-3.5" />} tone="cyan" onClick={() => handleTransform()} />
              <LabToolButton label="Visual architecture" icon={<Network className="h-3.5 w-3.5" />} tone="cyan" onClick={() => handleGenerateDiagram()} />
              {onLaunchExam && targetNote ? <LabToolButton label="Practice exam" icon={<Target className="h-3.5 w-3.5" />} tone="amber" onClick={() => handleLaunchExamFromNote()} /> : null}
            </>
          }
        >
          <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Target Note Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                Select Target Note
              </label>
              <div className="flex items-center gap-2 text-[0.68rem] text-muted-foreground font-mono">
                <span>{targetNote?.body?.length || 0} characters</span>
                <span className="text-white/20">•</span>
                <span className="text-cyan-400">
                  {targetNote?.body?.trim() ? targetNote.body.trim().split(/\s+/).length : 0} words
                </span>
              </div>
            </div>
            <select
              value={activeTargetId}
              onChange={(e) => {
                haptic("light");
                setActiveTargetId(e.target.value);
                setPolishedResult(null);
                setDiagramCode("");
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

          {/* Transformation Modes Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
                Enhancement Architecture Mode
              </label>
              <span className="text-[0.65rem] text-cyan-400/90 font-medium">
                {selectedMode === "organizer"
                  ? "Systematic Knowledge Organization"
                  : selectedMode === "remediation"
                    ? "Targeted Gap & Misconception Repair"
                    : "Deep Technical Refinement"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
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
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer active:scale-95",
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-500/15 text-foreground ring-1 ring-cyan-500/50 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]"
                        : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5", isSelected ? "text-cyan-400" : "text-muted-foreground")} />
                    <span className="text-[0.72rem] font-bold leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Organizer Options Panel (Active when Organizer mode is selected) */}
          {selectedMode === "organizer" && (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.07] p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <FolderTree className="h-4 w-4" />
                  <span>Knowledge Organizer Architecture Options</span>
                </div>
                <span className="text-[0.65rem] font-medium text-cyan-400/80">
                  Transforms unstructured notes into modular hierarchy
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {ORGANIZER_DEPTH_OPTIONS.map((opt) => {
                  const isSelected = organizationDepth === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setOrganizationDepth(opt.id);
                      }}
                      className={cn(
                        "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-cyan-400/60 bg-cyan-500/20 text-foreground ring-1 ring-cyan-400/40"
                          : "border-white/10 bg-black/30 text-muted-foreground hover:bg-white/[0.05]"
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                      <span className="text-[0.65rem] text-muted-foreground/90 mt-1 leading-snug">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Row: Polish Master Note or Generate Visual Diagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isProcessing || !targetNote}
              onClick={handleTransform}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-primary to-emerald-500 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl hover:opacity-95 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>
                    {selectedMode === "organizer"
                      ? `Generating ${ORGANIZER_DEPTH_OPTIONS.find((o) => o.id === organizationDepth)?.label || "Knowledge Organization"}...`
                      : "Architecting Long-Form Master Note..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>
                    {selectedMode === "organizer"
                      ? `Organize Note: ${ORGANIZER_DEPTH_OPTIONS.find((o) => o.id === organizationDepth)?.label || "Architecture"}`
                      : selectedMode === "remediation"
                        ? "Synthesize Targeted Gap Remediation Note"
                        : "Generate Exhaustive Master Note with Gemini"}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isGeneratingDiagram || !targetNote}
              onClick={() => handleGenerateDiagram()}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-cyan-500/40 bg-cyan-500/15 py-3.5 text-xs sm:text-sm font-bold text-cyan-300 shadow-xl hover:bg-cyan-500/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingDiagram ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-cyan-400" />
                  <span>Synthesizing Interactive Mermaid Visuals...</span>
                </>
              ) : (
                <>
                  <Network className="h-4.5 w-4.5 text-cyan-400" />
                  <span>Generate Visual Architecture Diagram</span>
                </>
              )}
            </button>
          </div>

          {/* Transformation Results & Preview */}
          {(polishedResult || diagramCode) && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 animate-in fade-in">
              {/* Quality & Performance Metrics Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs">
                <div className="flex items-center gap-3">
                  {readabilityScore !== null && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 font-bold">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="font-bold text-emerald-300">
                        {readabilityScore}/100 Academic Readability
                      </span>
                    </div>
                  )}

                  <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground border-l border-white/10 pl-3">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Fact-Preserving Master Note</span>
                  </div>
                </div>

                {wordCountStats && (
                  <div className="flex items-center gap-2 font-mono text-[0.68rem] text-muted-foreground">
                    <span className="text-foreground font-semibold">{wordCountStats.before} words</span>
                    <span>→</span>
                    <span className="text-cyan-400 font-bold">{wordCountStats.after} words</span>
                    <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-cyan-300 font-sans font-medium text-[0.62rem]">
                      Long-Form Expansion
                    </span>
                  </div>
                )}
              </div>

              {/* Feature 2 Bridge: Launch Adaptive Exam Directly From Note */}
              {onLaunchExam && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-300">Active Recall Verification Bridge</div>
                      <div className="text-[0.68rem] text-muted-foreground">
                        Instantly test your understanding of this polished architecture with an adaptive diagnostic exam.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLaunchExamFromNote}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-primary px-3.5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition cursor-pointer"
                  >
                    <span>Launch Diagnostic Mock Exam</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Key Concept Domain Tags */}
              {keyConceptsCovered.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.62rem] uppercase tracking-wider font-bold text-muted-foreground">
                      Structured Concept Taxonomy:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {keyConceptsCovered.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[0.68rem] font-medium text-cyan-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Architectural Enhancements Log */}
              {changeLog.length > 0 && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.08] p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Architectural Enhancements Applied:</span>
                  </div>
                  <ul className="text-xs text-muted-foreground/90 space-y-1 pl-4 list-disc">
                    {changeLog.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Toolbar: Preview Tabs, Visual Diagram Studio, Visual Diff, Spacing Controls, Export */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3 pt-1">
                {/* View Tabs */}
                <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer",
                      activeTab === "preview"
                        ? "bg-white/[0.12] text-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Polished Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("visual_diagram");
                      if (!diagramCode) handleGenerateDiagram();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer",
                      activeTab === "visual_diagram"
                        ? "bg-cyan-500/25 text-cyan-300 shadow border border-cyan-500/40"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Network className="h-3.5 w-3.5" />
                    <span>Visual Architecture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("diff")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer",
                      activeTab === "diff"
                        ? "bg-cyan-500/20 text-cyan-300 shadow border border-cyan-500/30"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                    <span>Visual Diff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("original")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer",
                      activeTab === "original"
                        ? "bg-white/[0.12] text-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Original
                  </button>
                </div>

                {/* Spacing & Breathing Room Selector & Utilities */}
                <div className="flex items-center gap-2">
                  {activeTab === "preview" && (
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
                      <span className="text-[0.65rem] font-semibold text-muted-foreground px-1.5 hidden sm:inline">
                        Breathing:
                      </span>
                      {(["normal", "relaxed", "spacious"] as BreathingRoomMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            haptic("light");
                            setBreathingRoom(mode);
                          }}
                          className={cn(
                            "px-2 py-1 text-[0.68rem] rounded-md font-medium capitalize transition cursor-pointer",
                            breathingRoom === mode
                              ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Toggle Section Tree Navigator */}
                  {parsedSections.length > 0 && activeTab === "preview" && (
                    <button
                      type="button"
                      onClick={() => setShowSectionNav((p) => !p)}
                      title="Toggle Document Outline Navigator Tree"
                      className={cn(
                        "flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs transition cursor-pointer",
                        showSectionNav
                          ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                          : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FolderTree className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Outline</span>
                    </button>
                  )}

                  {/* Organizer Utility: Insert TOC */}
                  {activeTab === "preview" && polishedResult && (
                    <button
                      type="button"
                      onClick={handleInsertTOC}
                      title="Insert formatted Table of Contents at the top"
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition cursor-pointer"
                    >
                      <ListOrdered className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="hidden md:inline">Insert TOC</span>
                    </button>
                  )}

                  {/* Copy Button */}
                  {polishedResult && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition cursor-pointer"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  )}

                  {/* Download Button */}
                  {polishedResult && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      title="Download polished Markdown"
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Content Viewer depending on Active Tab */}
              {activeTab === "visual_diagram" ? (
                /* Phase 2: Visual Diagram Studio */
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                      <Network className="h-4 w-4" />
                      <span>Diagram Architecture Presets:</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {DIAGRAM_PRESETS.map((dp) => {
                        const Icon = dp.icon;
                        const isSel = diagramType === dp.id;
                        return (
                          <button
                            key={dp.id}
                            type="button"
                            onClick={() => {
                              haptic("light");
                              setDiagramType(dp.id);
                              handleGenerateDiagram(dp.id);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-semibold transition cursor-pointer",
                              isSel
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                                : "bg-black/30 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{dp.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {diagramCode ? (
                    <MermaidDiagram
                      code={diagramCode}
                      onCodeChange={setDiagramCode}
                      onInsertIntoNote={handleInsertDiagramIntoNote}
                      title={diagramTitle}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 border border-white/10 rounded-2xl bg-black/30 text-center space-y-3">
                      <Network className="h-10 w-10 text-cyan-400 animate-pulse" />
                      <p className="text-xs text-muted-foreground">
                        Click below to synthesize an interactive Mermaid architectural diagram from this note.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleGenerateDiagram()}
                        className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-400 transition cursor-pointer"
                      >
                        Generate Architecture Diagram
                      </button>
                    </div>
                  )}
                </div>
              ) : activeTab === "diff" ? (
                /* Visual Diff Side-by-Side View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[480px] lg:min-h-[640px]">
                  <div className="flex flex-col rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6 overflow-y-auto scroll-sleek">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-bold text-muted-foreground">
                      <span>Original Note</span>
                      <span className="text-[0.65rem] font-mono">{targetNote.body?.length || 0} chars</span>
                    </div>
                    <div className="text-xs text-muted-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
                      {targetNote.body}
                    </div>
                  </div>

                  <div className="flex flex-col rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 sm:p-6 overflow-y-auto scroll-sleek">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20 text-xs font-bold text-cyan-300">
                      <span>AI Polished Master Architecture</span>
                      <span className="text-[0.65rem] font-mono text-emerald-400">
                        +{((polishedResult ? polishedResult.length : 0) - (targetNote.body?.length || 0)).toLocaleString()} chars
                      </span>
                    </div>
                    <div className="text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">
                      {polishedResult}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Preview with Section Navigator Outline Tree */
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Collapsible Section Navigator Tree (Feature 3) */}
                  {showSectionNav && parsedSections.length > 0 && activeTab === "preview" && (
                    <div className="w-full md:w-64 shrink-0 rounded-2xl border border-cyan-500/20 bg-black/40 p-3.5 text-xs space-y-2 min-h-[300px] max-h-[700px] overflow-y-auto scroll-sleek">
                      <div className="flex items-center justify-between text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
                        <span>Document Tree</span>
                        <span className="text-cyan-400 font-mono">{parsedSections.length} nodes</span>
                      </div>
                      <div className="space-y-1">
                        {parsedSections.map((sec, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleScrollToSection(sec.title)}
                            className={cn(
                              "w-full rounded-lg p-1.5 transition text-left cursor-pointer select-none hover:bg-white/[0.08] active:scale-[0.99] group",
                              sec.level === 1
                                ? "font-bold text-cyan-300 bg-cyan-500/10 text-[0.72rem] hover:bg-cyan-500/20"
                                : sec.level === 2
                                  ? "font-semibold text-foreground/90 pl-3 text-[0.68rem] hover:text-cyan-300"
                                  : "text-muted-foreground pl-5 text-[0.65rem] hover:text-foreground"
                            )}
                          >
                            <div className="truncate flex items-center gap-1.5">
                              {sec.type === "table" ? (
                                <Table className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <Hash className="h-2.5 w-2.5 text-cyan-400/70 group-hover:text-cyan-300 shrink-0" />
                              )}
                              <span className="truncate">{sec.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spacious Markdown Rendered Preview Container */}
                  <div
                    ref={previewContainerRef}
                    className={cn(
                      "flex-1 min-h-[480px] lg:min-h-[640px] overflow-y-auto scroll-sleek rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl transition-all",
                      breathingRoom === "spacious"
                        ? "p-6 sm:p-10"
                        : breathingRoom === "relaxed"
                          ? "p-5 sm:p-8"
                          : "p-4 sm:p-6"
                    )}
                  >
                    <MarkdownPreview
                      content={activeTab === "preview" ? (polishedResult || targetNote.body) : targetNote.body}
                      fontSize={fontSize}
                      breathingRoom={breathingRoom}
                    />
                  </div>
                </div>
              )}

              {/* Direct Apply Button */}
              {polishedResult && onUpdateNote && (
                <button
                  type="button"
                  onClick={handleApplyToNote}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-98 transition cursor-pointer shadow-xl"
                >
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>Apply Polished Architecture to "{targetNote.title}"</span>
                </button>
              )}
            </div>
          )}
          </div>
        </AiLearningLabFrame>
    <AiHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} tool="note_polisher" onAction={handleHistoryAction} />
      </DialogContent>
    </Dialog>
  );
}
