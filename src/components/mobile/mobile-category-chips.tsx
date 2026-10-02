import React, { useCallback } from "react";
import { Layers, Star, Folder } from "lucide-react";
import { haptic } from "@/lib/haptics";
import type { Collection } from "@/lib/notes";
import type { Filter } from "@/hooks/use-notes";

type Props = {
  collections: Collection[];
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: { all: number; favorites: number; byCollection: Record<string, number> };
};

const T = "transition-[transform,translate,scale,background-color,border-color,color,box-shadow,opacity]";
const INACTIVE =
  "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]";

const BASE_SEMI = `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 ${T} duration-200 active:scale-95 touch-manipulation cursor-pointer`;
const BASE_MEDIUM = `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shrink-0 ${T} duration-200 active:scale-95 touch-manipulation cursor-pointer`;

const ALL_ACTIVE = `${BASE_SEMI} bg-primary text-primary-foreground shadow-md shadow-primary/20`;
const ALL_INACTIVE = `${BASE_SEMI} ${INACTIVE}`;
const FAV_ACTIVE = `${BASE_SEMI} bg-yellow-400 text-black shadow-md font-bold shadow-yellow-400/20`;
const FAV_INACTIVE = `${BASE_SEMI} ${INACTIVE}`;
const COL_ACTIVE = `${BASE_MEDIUM} bg-white/[0.18] text-foreground border border-white/20 shadow-md font-semibold`;
const COL_INACTIVE = `${BASE_MEDIUM} ${INACTIVE}`;

const CollectionChip = React.memo(function CollectionChip({
  id,
  name,
  active,
  count,
}: {
  id: string;
  name: string;
  active: boolean;
  count: number;
}) {
  return (
    <button
      type="button"
      data-kind="collection"
      data-id={id}
      className={active ? COL_ACTIVE : COL_INACTIVE}
    >
      <Folder className="h-3.5 w-3.5 opacity-70" />
      <span className="truncate max-w-[120px]">{name}</span>
      {count > 0 ? (
        <span className="opacity-75 font-mono text-[0.65rem]">{count}</span>
      ) : null}
    </button>
  );
});

const filterId = (f: Filter) => (f.kind === "collection" ? f.id : null);

function propsAreEqual(p: Props, n: Props) {
  return (
    p.collections === n.collections &&
    p.onFilterChange === n.onFilterChange &&
    p.filter.kind === n.filter.kind &&
    filterId(p.filter) === filterId(n.filter) &&
    p.counts.all === n.counts.all &&
    p.counts.favorites === n.counts.favorites &&
    p.counts.byCollection === n.counts.byCollection
  );
}

export const MobileCategoryChips = React.memo(function MobileCategoryChips({
  collections,
  filter,
  onFilterChange,
  counts,
}: Props) {
  // One delegated handler instead of one closure per chip
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-kind]");
      if (!btn) return;
      haptic("light");
      const kind = btn.dataset.kind;
      if (kind === "all") onFilterChange({ kind: "all" });
      else if (kind === "favorites") onFilterChange({ kind: "favorites" });
      else if (kind === "collection" && btn.dataset.id !== undefined) {
        onFilterChange({ kind: "collection", id: btn.dataset.id });
      }
    },
    [onFilterChange]
  );

  const activeCollectionId = filterId(filter);
  const byCollection = counts.byCollection;

  return (
    <div
      onClick={handleClick}
      className="md:hidden flex items-center gap-1.5 overflow-x-auto px-2.5 pb-2 pt-1 scroll-sleek select-none border-t border-white/5 mt-0.5"
    >
      {/* Chip 1: All Notes */}
      <button
        type="button"
        data-kind="all"
        className={filter.kind === "all" ? ALL_ACTIVE : ALL_INACTIVE}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>All</span>
        <span className="opacity-75 font-mono text-[0.65rem]">{counts.all}</span>
      </button>

      {/* Chip 2: Favorites */}
      <button
        type="button"
        data-kind="favorites"
        className={filter.kind === "favorites" ? FAV_ACTIVE : FAV_INACTIVE}
      >
        <Star
          className={
            filter.kind === "favorites" ? "h-3.5 w-3.5 fill-black" : "h-3.5 w-3.5 text-yellow-400"
          }
        />
        <span>Starred</span>
        <span className="opacity-75 font-mono text-[0.65rem]">{counts.favorites}</span>
      </button>

      {/* Dynamic Sub-collections */}
      {collections.map((c) => (
        <CollectionChip
          key={c.id}
          id={c.id}
          name={c.name}
          active={activeCollectionId === c.id}
          count={byCollection[c.id] ?? 0}
        />
      ))}
    </div>
  );
}, propsAreEqual);