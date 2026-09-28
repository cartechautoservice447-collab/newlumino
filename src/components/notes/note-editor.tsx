import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, type Collection, type Note } from "@/lib/notes";
import { MarkdownPreview } from "./markdown-preview";

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
};

type Wrap = { before: string; after: string; placeholder: string };

const actions: { label: string; icon: React.ReactNode; wrap: Wrap }[] = [
  { label: "Bold", icon: <Bold className="h-3.5 w-3.5" />, wrap: { before: "**", after: "**", placeholder: "bold text" } },
  { label: "Italic", icon: <Italic className="h-3.5 w-3.5" />, wrap: { before: "_", after: "_", placeholder: "italic text" } },
  { label: "Code", icon: <Code className="h-3.5 w-3.5" />, wrap: { before: "`", after: "`", placeholder: "code" } },
  { label: "Link", icon: <Link2 className="h-3.5 w-3.5" />, wrap: { before: "[", after: "](https://)", placeholder: "label" } },
];

export function NoteEditor({
  note,
  collections,
  onChange,
  onDelete,
  onToggleFavorite,
  onCreateNote,
  onBack,
  focusMode,
  onToggleFocus,
}: Props) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [body, setBody] = useState(note?.body ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteId = note?.id ?? null;

  useEffect(() => {
    setBody(note?.body ?? "");
    setTitle(note?.title ?? "");
  }, [noteId, note?.body, note?.title]);

  useEffect(() => {
    if (!note) return;
    if (body === note.body && title === note.title) return;
    const t = setTimeout(() => onChange({ body, title }), 350);
    return () => clearTimeout(t);
  }, [body, title, note, onChange]);

  if (!note) {
    return (
      <section className="glass-panel animate-panel-in flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl">
        <p className="text-sm text-muted-foreground">No note selected</p>
        <button
          type="button"
          onClick={onCreateNote}
          className="rounded-lg border border-white/10 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          Create a note
        </button>
      </section>
    );
  }

  const applyWrap = ({ before, after, placeholder }: Wrap) => {
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

  return (
    <section className="glass-panel animate-panel-in flex h-full w-full flex-col rounded-2xl">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/5 px-6 py-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to notes"
            className="rounded-lg border border-white/5 bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled note"
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <select
            value={note.collectionId ?? ""}
            onChange={(e) => onChange({ collectionId: e.target.value || null })}
            className="rounded-lg border border-white/5 bg-white/[0.04] px-2.5 py-1.5 text-xs text-muted-foreground focus:border-white/15 focus:outline-none"
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Favorite"
            onClick={onToggleFavorite}
            className="rounded-lg border border-white/5 bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Star className={cn("h-3.5 w-3.5", note.favorite && "fill-current text-code-variable")} />
          </button>
          <button
            type="button"
            aria-label="Delete note"
            onClick={onDelete}
            className="rounded-lg border border-white/5 bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-6 py-2.5">
        <div className="flex items-center gap-1">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              aria-label={a.label}
              onClick={() => applyWrap(a.wrap)}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              {a.icon}
            </button>
          ))}
          <button
            type="button"
            aria-label="Insert code block"
            onClick={insertCodeBlock}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <SquareCode className="h-3.5 w-3.5" />
          </button>
          <span className="ml-2 hidden text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground/60 sm:inline">
            saved {formatDate(note.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={focusMode ? "Exit focus mode" : "Focus mode"}
          onClick={onToggleFocus}
          className="rounded-lg border border-white/5 bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] p-0.5">
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs capitalize transition-colors",
                mode === m
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "write" ? <PenLine className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {m}
            </button>
          ))}
        </div>
        </div>
      </div>


      <div key={`${note.id}-${mode}`} className="animate-fade-swap scroll-sleek min-h-0 flex-1 editor-text overflow-y-auto bg-code-bg/70 p-6">
        {mode === "write" ? (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write in Markdown. Fenced code blocks use GitHub Dark colors."
            className="h-full min-h-[420px] w-full resize-none bg-transparent editor-text font-mono text-code-fg placeholder:text-code-comment focus:outline-none"
            spellCheck={false}
          />
        ) : (
          <MarkdownPreview content={body} />
        )}
      </div>
    </section>
  );
}
