import { Layers, Star, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import type { Collection } from "@/lib/notes";
import type { Filter } from "@/hooks/use-notes";

type Props = {
  collections: Collection[];
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: { all: number; favorites: number; byCollection: Record<string, number> };
};

export function MobileCategoryChips({
  collections,
  filter,
  onFilterChange,
  counts,
}: Props) {
  return (
    <div className="md:hidden flex items-center gap-1.5 overflow-x-auto px-2.5 pb-2 pt-1 scroll-sleek select-none border-t border-white/5 mt-0.5">
      {/* Chip 1: All Notes */}
      <button
        type="button"
        onClick={() => {
          haptic("light");
          onFilterChange({ kind: "all" });
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer",
          filter.kind === "all"
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]",
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>All</span>
        <span className="opacity-75 font-mono text-[0.65rem]">{counts.all}</span>
      </button>

      {/* Chip 2: Favorites */}
      <button
        type="button"
        onClick={() => {
          haptic("light");
          onFilterChange({ kind: "favorites" });
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer",
          filter.kind === "favorites"
            ? "bg-yellow-400 text-black shadow-md font-bold shadow-yellow-400/20"
            : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]",
        )}
      >
        <Star className={cn("h-3.5 w-3.5", filter.kind === "favorites" ? "fill-black" : "text-yellow-400")} />
        <span>Starred</span>
        <span className="opacity-75 font-mono text-[0.65rem]">{counts.favorites}</span>
      </button>

      {/* Dynamic Sub-collections */}
      {collections.map((c) => {
        const active = filter.kind === "collection" && filter.id === c.id;
        const count = counts.byCollection[c.id] ?? 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              haptic("light");
              onFilterChange({ kind: "collection", id: c.id });
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shrink-0 transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer",
              active
                ? "bg-white/[0.18] text-foreground border border-white/20 shadow-md font-semibold"
                : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]",
            )}
          >
            <Folder className="h-3.5 w-3.5 opacity-70" />
            <span className="truncate max-w-[120px]">{c.name}</span>
            {count > 0 ? (
              <span className="opacity-75 font-mono text-[0.65rem]">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
