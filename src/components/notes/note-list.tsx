import { PanelLeftClose } from "lucide-react";
import { NoteCard } from "./note-card";
import type { Collection, Note } from "@/lib/notes";

type Props = {
  title: string;
  notes: Note[];
  collections: Collection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCollapse: () => void;
};

export function NoteList({
  title,
  notes,
  collections,
  selectedId,
  onSelect,
  onToggleFavorite,
  onCollapse,
}: Props) {
  return (
    <section className="glass-panel animate-panel-in flex h-full w-full flex-col rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-white/5 px-5 py-3.5">
        <h2 className="text-sm font-medium tracking-[0.06em] text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-[0.7rem] tabular-nums text-muted-foreground/70">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
          <button
            type="button"
            aria-label="Collapse note list"
            onClick={onCollapse}
            className="rounded-lg border border-white/5 bg-white/[0.04] p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="scroll-sleek min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {notes.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        ) : (
          notes.map((note, i) => (
            <NoteCard
              key={note.id}
              note={note}
              index={i}
              active={note.id === selectedId}
              collectionName={
                collections.find((c) => c.id === note.collectionId)?.name
              }
              onSelect={() => onSelect(note.id)}
              onToggleFavorite={() => onToggleFavorite(note.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
