import { memo } from "react";
import { PanelLeftClose, Plus, Search, Star, Layers, Sparkles } from "lucide-react";
import { NoteCard } from "./note-card";
import { useCustomization } from "@/context/customization-context";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Collection, Note } from "@/lib/notes";

type Props = {
  title: string;
  notes: Note[];
  collections: Collection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCollapse: () => void;
  onCreateNote?: () => void;
  onOpenMobileNoteMenu?: (note: Note) => void;
  totalNotesCount?: number;
};

function NoteListComponent({
  title,
  notes,
  collections,
  selectedId,
  onSelect,
  onToggleFavorite,
  onCollapse,
  onCreateNote,
  onOpenMobileNoteMenu,
}: Props) {
  const { settings } = useCustomization();
  const isFluidGlass = settings.websiteTheme === "fluid-glass";
  const isMobile = useIsMobile();

  const showFluidDesktopHeader = isFluidGlass && !isMobile;

  return (
    <section className="glass-panel animate-panel-in flex h-full w-full flex-col rounded-3xl shadow-xl backdrop-blur-2xl">
      <header className={`items-center justify-between gap-2 border-b border-white/5 px-5 py-3.5 ${showFluidDesktopHeader ? "flex" : "hidden md:flex"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[0.68rem] tabular-nums font-mono text-muted-foreground">
            {notes.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {onCreateNote && (!isFluidGlass || isMobile) ? (
            <button
              type="button"
              aria-label="Create note"
              onClick={onCreateNote}
              className="md:hidden flex items-center gap-1 rounded-lg bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 text-xs font-semibold hover:bg-primary/30 active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          ) : null}

          <button
            type="button"
            aria-label="Collapse note list"
            onClick={onCollapse}
            className="rounded-xl border border-white/5 bg-white/[0.04] p-1.5 text-muted-foreground transition-colors hover:text-foreground active:scale-95 hidden lg:inline-flex"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className={`min-h-0 flex-1 space-y-2.5 vertical-scroll-only overscroll-contain p-3 ${isMobile ? "pb-[calc(7rem+env(safe-area-inset-bottom,0px))]" : ""}`}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground/60 mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground/80">No notes found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
              Tap &ldquo;New Note&rdquo; to start jotting down thoughts with instant Markdown.
            </p>
            {onCreateNote ? (
              <button
                type="button"
                onClick={onCreateNote}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-lg active:scale-95 transition-transform"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Note
              </button>
            ) : null}
          </div>
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
              onOpenMobileMenu={onOpenMobileNoteMenu ? () => onOpenMobileNoteMenu(note) : undefined}
            />
          ))
        )}
      </div>
    </section>
  );
}

export const NoteList = memo(NoteListComponent);
