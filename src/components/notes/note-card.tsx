import { memo, useMemo } from "react";
import { Star, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, snippet, type Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";
import { useCustomization } from "@/context/customization-context";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  note: Note;
  active: boolean;
  index: number;
  collectionName?: string | undefined;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenMobileMenu?: (note: Note) => void;
};

function oldRelativeDate(timestamp: number) {
  const delta = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

export const NoteCard = memo(function NoteCard({
  note,
  active,
  index,
  collectionName,
  onSelect,
  onToggleFavorite,
  onOpenMobileMenu,
}: Props) {
  const { settings } = useCustomization();
  const isFluidGlass = settings.websiteTheme === "fluid-glass";
  const isMobile = useIsMobile();
  const useFluidStudioCard = isFluidGlass && !isMobile;
  const wordCount = useMemo(
    () => (note.body.trim() ? note.body.trim().split(/\s+/).length : 0),
    [note.body],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        haptic("light");
        onSelect(note.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          haptic("light");
          onSelect(note.id);
        }
      }}
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      className={cn(
        "group liquid-surface animate-card-in relative w-full cursor-pointer rounded-2xl border p-4 text-left transition-all duration-300 select-none overflow-hidden",
        useFluidStudioCard
          ? cn(
              "cursor-pointer !p-4 transition-all will-change-transform",
              active && "ring-2 ring-emerald-400/70",
            )
          : cn(
              "border-white/5 bg-white/[0.03] hover:-translate-y-0.5 hover:scale-[1.015] hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.985]",
              active &&
                "border-primary/40 bg-white/[0.08] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] ring-1 ring-primary/30"
            )
      )}
    >
      {useFluidStudioCard && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.02) 55%, rgba(255, 255, 255, 0.09) 100%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border border-white/35 mix-blend-screen opacity-25"
            style={{ filter: "url(#liquid-refraction)" }}
          />
          <span aria-hidden className="liquid-veil pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" />
        </>
      )}
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
              onToggleFavorite(note.id);
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
          {onOpenMobileMenu && (!isFluidGlass || isMobile) ? (
            <button
              type="button"
              aria-label="Note options"
              onClick={(e) => {
                e.stopPropagation();
                haptic("medium");
                onOpenMobileMenu(note);
              }}
              className="md:hidden flex h-9 w-9 items-center justify-center shrink-0 rounded-xl text-muted-foreground hover:bg-white/[0.08] hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

<p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {snippet(note.body) || "Empty note"}
      </p>

      <div className={cn(
        "mt-2 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground",
        !useFluidStudioCard && "mt-3.5 flex items-center justify-between"
      )}>
        {useFluidStudioCard ? oldRelativeDate(note.updatedAt) : (
          <div className="flex items-center justify-between w-full">
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
                {wordCount}w
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
