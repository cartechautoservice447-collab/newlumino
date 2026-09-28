import { useState } from "react";
import {
  FolderClosed,
  Plus,
  Search,
  Star,
  Layers,
  X,
  Check,
  PanelLeftClose,
  ArrowLeft,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import type { Collection } from "@/lib/notes";
import type { Filter } from "@/hooks/use-notes";

type Props = {
  collections: Collection[];
  counts: { all: number; favorites: number; byCollection: Record<string, number> };
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onCreateNote: () => void;
  onAddCollection: (name: string, category?: string) => void;
  onDeleteCollection: (id: string) => void;
  onCollapse: () => void;
  onOpenSettings: () => void;
  onBackToCourses: () => void;
};


function NavRow({
  icon,
  label,
  count,
  active,
  onClick,
  onDelete,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition-all duration-200",
        active
          ? "border-white/10 bg-white/[0.08] text-foreground"
          : "text-muted-foreground hover:border-white/5 hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <button type="button" onClick={onClick} className="flex flex-1 items-center gap-2.5 text-left">
        <span className="opacity-80">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
      {typeof count === "number" ? (
        <span className="text-[0.7rem] tabular-nums text-muted-foreground/70">{count}</span>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          aria-label={`Delete ${label}`}
          onClick={onDelete}
          className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function SidebarPanel({
  collections,
  counts,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  onCreateNote,
  onAddCollection,
  onDeleteCollection,
  onCollapse,
  onOpenSettings,
  onBackToCourses,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    if (draft.trim()) onAddCollection(draft.trim());
    setDraft("");
    setAdding(false);
  };

  return (
    <aside className="glass-panel animate-panel-in flex h-full w-full flex-col gap-5 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 px-1 pt-1">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.3em] text-muted-foreground/70">
            Glass
          </p>
          <h1 className="text-lg font-semibold tracking-tight">Notes</h1>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onCollapse}
          className="rounded-lg border border-white/5 bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onBackToCourses}
        className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-white/15 hover:bg-white/[0.07] hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Courses
      </button>

      <button
        type="button"
        onClick={onCreateNote}
        className="animate-pulse-glow flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" />
        New Note
      </button>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search notes"
          className="w-full rounded-lg border border-white/5 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-white/15 focus:outline-none"
        />
      </div>

      <nav className="space-y-1">
        <NavRow
          icon={<Layers className="h-4 w-4" />}
          label="All Notes"
          count={counts.all}
          active={filter.kind === "all"}
          onClick={() => onFilterChange({ kind: "all" })}
        />
        <NavRow
          icon={<Star className="h-4 w-4" />}
          label="Favorites"
          count={counts.favorites}
          active={filter.kind === "favorites"}
          onClick={() => onFilterChange({ kind: "favorites" })}
        />
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground/70">
            Collections
          </span>
          <button
            type="button"
            aria-label="New collection"
            onClick={() => setAdding(true)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="scroll-sleek min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {collections.map((c) => (
            <NavRow
              key={c.id}
              icon={<FolderClosed className="h-4 w-4" />}
              label={c.name}
              count={counts.byCollection[c.id] ?? 0}
              active={filter.kind === "collection" && filter.id === c.id}
              onClick={() => onFilterChange({ kind: "collection", id: c.id })}
              onDelete={() => onDeleteCollection(c.id)}
            />
          ))}

          {adding ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
                placeholder="Collection name"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <button type="button" onClick={commit} aria-label="Save collection">
                <Check className="h-3.5 w-3.5 text-primary" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>

      <UserBadge />
    </aside>
  );
}

function UserBadge() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const meta = user.user_metadata as { username?: string; full_name?: string } | null;
  const name = meta?.username || meta?.full_name || user.email || "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-xs font-medium">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{name}</p>
        {user.email && user.email !== name ? (
          <p className="truncate text-[0.68rem] text-muted-foreground/70">{user.email}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Log out"
        title="Log out"
        onClick={() => void signOut()}
        className="rounded-lg border border-white/5 bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:text-destructive"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
