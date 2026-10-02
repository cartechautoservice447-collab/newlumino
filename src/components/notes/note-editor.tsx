import { memo, useEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  Italic,
  Link2,
  Star,
  Trash2,
  Eye,
  PenLine,
  ChevronLeft,
  Maximize2,
  Minimize2,
  SquareCode,
  MoreHorizontal,
  Copy,
  Check,
  Brain,
  Type,
  ListTodo,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, type Collection, type Note } from "@/lib/notes";
import { MarkdownPreview } from "./markdown-preview";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";

type Props = {
  note: Note | null;
  collections: Collection[];
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCreateNote: () => void;
  onBack?: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenMobileSheet?: (note: Note) => void;
  onOpenFlashcards?: (note: Note) => void;
  externalMode?: "write" | "preview";
  onModeChange?: (mode: "write" | "preview") => void;
};

type Wrap = { before: string; after: string; placeholder: string };

const actions: { label: string; icon: React.ReactNode; wrap: Wrap }[] = [
  { label: "Bold", icon: <Bold className="h-3.5 w-3.5" />, wrap: { before: "**", after: "**", placeholder: "bold text" } },
  { label: "Italic", icon: <Italic className="h-3.5 w-3.5" />, wrap: { before: "_", after: "_", placeholder: "italic text" } },
  { label: "Code", icon: <Code className="h-3.5 w-3.5" />, wrap: { before: "`", after: "`", placeholder: "code" } },
  { label: "Link", icon: <Link2 className="h-3.5 w-3.5" />, wrap: { before: "[", after: "](https://)", placeholder: "label" } },
];

export const NoteEditor = memo(function NoteEditor({
  note,
  collections,
  onChange,
  onDelete,
  onToggleFavorite,
  onCreateNote,
  onBack,
  focusMode,
  onToggleFocus,
  onOpenMobileSheet,
  onOpenFlashcards,
  externalMode,
  onModeChange,
}: Props) {
  const { showNotification } = useNotifications();
  const [internalMode, setInternalMode] = useState<"write" | "preview">("write");
  const mode = externalMode ?? internalMode;

  const setMode = (m: "write" | "preview") => {
    haptic("light");
    setInternalMode(m);
    if (onModeChange) onModeChange(m);
  };

  const [body, setBody] = useState(note?.body ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [statType, setStatType] = useState<"readTime" | "words" | "chars">("readTime");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteId = note?.id ?? null;

  useEffect(() => {
    setBody(note?.body ?? "");
    setTitle(note?.title ?? "");
  }, [noteId, note?.body, note?.title]);

  useEffect(() => {
    if (!note) return;
    if (body === note.body && title === note.title) return;
    setIsSaving(true);
    const t = setTimeout(() => {
      onChange({ body, title });
      setIsSaving(false);
    }, 300);
    return () => clearTimeout(t);
  }, [body, title, note, onChange]);

  if (!note) {
    return (
      <section className="glass-panel animate-panel-in flex h-full w-full flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center shadow-xl backdrop-blur-2xl">
        <p className="text-sm text-muted-foreground">No note selected</p>
        <button
          type="button"
          onClick={() => {
            haptic("heavy");
            onCreateNote();
          }}
          className="rounded-xl border border-white/10 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation cursor-pointer"
        >
          Create a note
        </button>
      </section>
    );
  }

  const applyWrap = ({ before, after, placeholder }: Wrap) => {
    haptic("light");
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end) || placeholder;
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertCodeBlock = () => {
    haptic("medium");
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end) || "print(\"hello world\")";
    const prefix = start > 0 && body[start - 1] !== "\n" ? "\n" : "";
    const snippet = `${prefix}\`\`\`python\n${selected}\n\`\`\`\n`;
    setBody(`${body.slice(0, start)}${snippet}${body.slice(end)}`);
    const codeStart = start + prefix.length + "```python\n".length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(codeStart, codeStart + selected.length);
    });
  };

  const insertTask = () => {
    haptic("light");
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const prefix = start > 0 && body[start - 1] !== "\n" ? "\n" : "";
    const snippet = `${prefix}- [ ] `;
    setBody(`${body.slice(0, start)}${snippet}${body.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const insertDate = () => {
    haptic("light");
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setBody(`${body.slice(0, start)}**${dateStr}** ${body.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
    });
  };

  const toggleTaskCheckbox = (taskIndex: number) => {
    haptic("medium");
    let count = 0;
    const next = body.replace(/(- \[(?: |x|X)\])/g, (match) => {
      if (count === taskIndex) {
        count++;
        return match.includes("x") || match.includes("X") ? "- [ ]" : "- [x]";
      }
      count++;
      return match;
    });
    setBody(next);
    onChange({ body: next });
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      showNotification({
        message: "Copied to Clipboard",
        description: "Markdown content is ready to paste.",
        type: "info",
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const toggleFontSize = () => {
    setFontSize((cur) => (cur === "sm" ? "md" : cur === "md" ? "lg" : "sm"));
  };

  const toggleStatType = () => {
    setStatType((cur) => (cur === "readTime" ? "words" : cur === "words" ? "chars" : "readTime"));
  };

  return (
    <section className="glass-panel animate-panel-in flex h-full w-full flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
      {/* Streamlined High-Room Header */}
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-5 sm:py-3 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to notes list"
              className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-muted-foreground transition-all hover:text-foreground active:scale-90 lg:hidden shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled note"
            className="min-w-0 flex-1 bg-transparent text-sm sm:text-base font-bold tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none truncate"
          />

          {/* Subtle Live Save Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-1 text-[0.65rem] text-muted-foreground/70 shrink-0">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isSaving ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              )}
            />
            <span>{isSaving ? "Saving..." : "Saved"}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Interactive Mode Switcher Pill */}
          <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.05] p-0.5">
            <button
              type="button"
              onClick={() => setMode("write")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-[0.68rem] sm:text-[0.7rem] font-semibold transition-all duration-200",
                mode === "write"
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <PenLine className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-[0.68rem] sm:text-[0.7rem] font-semibold transition-all duration-200",
                mode === "preview"
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Eye className="h-3 w-3" />
              <span>Read</span>
            </button>
          </div>

          {/* Interactive Font Size Scale Button (Aa) - visible on tablet/desktop */}
          <button
            type="button"
            onClick={() => {
              haptic("light");
              toggleFontSize();
            }}
            title={`Font Size: ${fontSize.toUpperCase()} (Click to toggle)`}
            className="hidden sm:flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] font-bold text-muted-foreground hover:text-foreground transition-all active:scale-90 touch-manipulation cursor-pointer"
          >
            <span className="font-mono">A{fontSize === "sm" ? "↓" : fontSize === "lg" ? "↑" : ""}</span>
          </button>

          {/* Interactive Active Recall Flashcard Trigger */}
          {onOpenFlashcards && (
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onOpenFlashcards(note);
              }}
              title="Practice this note with Flashcards"
              className="hidden sm:flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-all active:scale-90 touch-manipulation cursor-pointer"
            >
              <Brain className="h-3.5 w-3.5" />
              <span>Study</span>
            </button>
          )}

          {/* Star Note */}
          <button
            type="button"
            aria-label="Favorite"
            onClick={() => {
              haptic("light");
              onToggleFavorite();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-muted-foreground transition-all hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
          >
            <Star
              className={cn(
                "h-4 w-4 transition-transform",
                note.favorite && "fill-yellow-400 text-yellow-400 scale-110",
              )}
            />
          </button>

          {/* Mobile bottom sheet trigger for note actions */}
          {onOpenMobileSheet ? (
            <button
              type="button"
              aria-label="More note options"
              onClick={() => {
                haptic("medium");
                onOpenMobileSheet(note);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-muted-foreground hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      {/* Desktop/Tablet Formatting & Quick Actions Bar (Cleanly hidden on mobile in favor of bottom accessory bar) */}
      {mode === "write" && (
        <div className="hidden md:flex items-center justify-between gap-2 border-b border-white/5 px-5 py-2 overflow-x-auto scroll-sleek shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-1">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                aria-label={a.label}
                onClick={() => applyWrap(a.wrap)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground active:scale-90"
              >
                {a.icon}
              </button>
            ))}
            <button
              type="button"
              aria-label="Insert task checkbox"
              onClick={insertTask}
              title="Insert Task Checkbox"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground active:scale-90"
            >
              <ListTodo className="h-3.5 w-3.5 text-emerald-400" />
            </button>
            <button
              type="button"
              aria-label="Insert code block"
              onClick={insertCodeBlock}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground active:scale-90"
            >
              <SquareCode className="h-3.5 w-3.5 text-accent" />
            </button>
            <button
              type="button"
              aria-label="Insert date"
              onClick={insertDate}
              title="Insert Date Stamp"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground active:scale-90"
            >
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Interactive Stat badge */}
            <button
              type="button"
              onClick={toggleStatType}
              title="Click to switch between Reading Time, Words, and Chars"
              className="rounded-lg px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground/80 font-mono hover:text-foreground hover:bg-white/[0.05] transition-colors"
            >
              {statType === "readTime"
                ? `${readTimeMin} min read`
                : statType === "words"
                  ? `${wordCount} words`
                  : `${charCount} chars`}
            </button>

            <button
              type="button"
              aria-label="Copy note content"
              onClick={copyContent}
              className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5 text-muted-foreground transition-colors hover:text-foreground active:scale-90"
              title="Copy Markdown"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Body Canvas - Expansive, Edge-to-Edge & High Room */}
      <div
        key={`${note.id}-${mode}`}
        className="animate-fade-swap scroll-sleek min-h-0 flex-1 overflow-y-auto bg-code-bg/75 p-3 sm:p-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      >
        {mode === "write" ? (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note in Markdown... Fenced code blocks automatically format with GitHub syntax."
            className={cn(
              "h-full min-h-[calc(100vh-180px)] w-full resize-none bg-transparent editor-text font-mono text-code-fg placeholder:text-code-comment/50 focus:outline-none selection:bg-primary/30 leading-relaxed",
              fontSize === "sm" ? "text-xs sm:text-sm" : fontSize === "lg" ? "text-base sm:text-lg" : "text-sm sm:text-base"
            )}
            spellCheck={false}
          />
        ) : (
          <div className="min-h-[calc(100vh-180px)] w-full max-w-4xl mx-auto py-2">
            <MarkdownPreview
              content={body}
              fontSize={fontSize}
              onToggleTask={toggleTaskCheckbox}
            />
          </div>
        )}
      </div>
    </section>
  );
}, areNoteEditorPropsEqual);

function areNoteEditorPropsEqual(prev: Props, next: Props) {
  return (
    prev.note === next.note &&
    prev.collections === next.collections &&
    prev.focusMode === next.focusMode &&
    prev.externalMode === next.externalMode
  );
}

