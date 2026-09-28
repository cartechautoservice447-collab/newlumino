import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, snippet, type Note } from "@/lib/notes";

type Props = {
  note: Note;
  active: boolean;
  index: number;
  collectionName?: string | undefined;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

export function NoteCard({
  note,
  active,
  index,
  collectionName,
  onSelect,
  onToggleFavorite,
}: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      className={cn(
        "group liquid-surface animate-card-in w-full rounded-xl border p-4 text-left transition-all duration-300",
        "border-white/5 bg-white/[0.03] hover:-translate-y-0.5 hover:scale-[1.015] hover:border-white/15 hover:bg-white/[0.06]",
        active &&
          "border-accent/40 bg-white/[0.08] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-1 text-sm font-medium tracking-tight text-foreground">
          {note.title || "Untitled note"}
        </h3>
        <span
          role="button"
          tabIndex={0}
          aria-label={note.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }
          }}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              note.favorite && "fill-current text-code-variable",
            )}
          />
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {snippet(note.body) || "Empty note"}
      </p>
      <div className="mt-3 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground/70">
        <span>{formatDate(note.updatedAt)}</span>
        {collectionName ? (
          <>
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="truncate">{collectionName}</span>
          </>
        ) : null}
      </div>
    </button>
  );
}
