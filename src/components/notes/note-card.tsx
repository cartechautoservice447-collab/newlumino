import { Star, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, snippet, type Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";

type Props = {
  note: Note;
  active: boolean;
  index: number;
  collectionName?: string | undefined;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onOpenMobileMenu?: (e: React.MouseEvent) => void;
};

export function NoteCard({
  note,
  active,
  index,
  collectionName,
  onSelect,
  onToggleFavorite,
  onOpenMobileMenu,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        haptic("light");
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          haptic("light");
          onSelect();
        }
      }}
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      className={cn(
        "group liquid-surface animate-card-in relative w-full cursor-pointer rounded-2xl border p-4 text-left transition-all duration-300 select-none",
        "border-white/5 bg-white/[0.03] hover:-translate-y-0.5 hover:scale-[1.015] hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.985]",
        active &&
          "border-primary/40 bg-white/[0.08] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <h3 className="line-clamp-1 flex-1 text-sm font-semibold tracking-tight text-foreground">
          {note.title || "Untitled note"}
        </h3>
        
        <div className="flex items-center gap-1 -mr-1.5 -mt-1.5">
          <button
            type="button"
            aria-label={note.favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={(e) => {
              e.stopPropagation();
              haptic("light");
              onToggleFavorite();
            }}
            className="flex h-9 w-9 items-center justify-center shrink-0 rounded-xl text-muted-foreground transition-all hover:text-foreground hover:bg-white/[0.08] active:scale-90 touch-manipulation cursor-pointer"
          >
            <Star
              className={cn(
                "h-4 w-4 transition-transform",
                note.favorite && "fill-yellow-400 text-yellow-400 scale-110",
              )}
            />
          </button>

          {/* Mobile-only quick context menu trigger */}
          {onOpenMobileMenu ? (
            <button
              type="button"
              aria-label="Note options"
              onClick={(e) => {
                e.stopPropagation();
                haptic("medium");
                onOpenMobileMenu(e);
              }}
              className="md:hidden flex h-9 w-9 items-center justify-center shrink-0 rounded-xl text-muted-foreground hover:bg-white/[0.08] hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {snippet(note.body) || "Empty note"}
      </p>

      <div className="mt-3.5 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground/70">
        <div className="flex items-center gap-2">
          <span>{formatDate(note.updatedAt)}</span>
          {collectionName ? (
            <>
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="truncate max-w-[120px] font-medium text-foreground/80">{collectionName}</span>
            </>
          ) : null}
        </div>

        {note.body && (
          <span className="text-[0.65rem] tracking-normal font-mono opacity-60">
            {note.body.split(/\s+/).filter(Boolean).length}w
          </span>
        )}
      </div>
    </div>
  );
}
