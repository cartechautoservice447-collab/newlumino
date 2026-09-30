import { useState } from "react";
import {
  FolderClosed,
  Plus,
  Search,
  Star,
  Target,
  Layers,
  X,
  Check,
  PanelLeftClose,
  ArrowLeft,
  Settings,
  LogOut,
  Sparkles,
  Clock,
  Brain,
  Maximize2,
  FileText,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useCustomization } from "@/context/customization-context";
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
  onOpenPomodoro?: () => void;
  onOpenFlashcards?: () => void;
  onNavigateDailyGoal?: () => void;
  onToggleFocus?: () => void;
  onOpenCheatsheet?: () => void;
  onOpenNotifications?: () => void;
  focusMode?: boolean;
  pomodoroRunning?: boolean;
  pomodoroTimeFormatted?: string;
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
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
        "group flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm transition-all duration-200 select-none",
        active
          ? "border-white/10 bg-white/[0.09] text-foreground font-medium shadow-sm"
          : "text-muted-foreground hover:border-white/5 hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <button type="button" onClick={onClick} className="flex flex-1 items-center gap-2.5 text-left min-w-0">
        <span className={cn("opacity-80 transition-transform group-hover:scale-110", active && "opacity-100 text-primary")}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </button>
      {typeof count === "number" ? (
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[0.68rem] tabular-nums font-mono transition-colors",
          active ? "bg-white/10 text-foreground" : "text-muted-foreground/70"
        )}>
          {count}
        </span>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          aria-label={`Delete ${label}`}
          onClick={onDelete}
          className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 p-1"
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
  onOpenPomodoro,
  onOpenFlashcards,
  onNavigateDailyGoal,
  onToggleFocus,
  onOpenCheatsheet,
  onOpenNotifications,
  focusMode,
  pomodoroRunning,
  pomodoroTimeFormatted,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: Props) {
  const { settings } = useCustomization();
  const isFluidGlass = settings.websiteTheme === "fluid-glass";

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const goalSeconds = Math.max(60, dailyGoalHours * 3600);
  const progressPct = Math.min(100, Math.round((todayFocusSeconds / goalSeconds) * 100));

  const commit = () => {
    if (draft.trim()) onAddCollection(draft.trim());
    setDraft("");
    setAdding(false);
  };

  return (
    <aside className="glass-panel animate-panel-in flex h-full w-full flex-col gap-4 rounded-3xl p-4 shadow-xl backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.6)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground/70 font-semibold">
              {isFluidGlass ? "Liquid Glass" : "NewLumino"}
            </p>
            <h1 className="text-base font-bold tracking-tight text-foreground">Glass Notes</h1>
          </div>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onCollapse}
          className="rounded-xl border border-white/5 bg-white/[0.04] p-2 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onBackToCourses}
        className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-white/15 hover:bg-white/[0.08] hover:text-foreground active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Courses
      </button>

      <button
        type="button"
        onClick={onCreateNote}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
          isFluidGlass
            ? "notes-pulse-glow bg-emerald-500 text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.62),0_10px_28px_rgba(5,150,105,0.42)] ring-1 ring-emerald-300/55 hover:scale-[1.015] hover:bg-emerald-400 py-2.5 px-4"
            : "animate-pulse-glow border border-white/10 bg-primary px-3.5 py-2.5 text-primary-foreground shadow-lg hover:scale-[1.02]"
        )}
      >
        <Plus className="h-4 w-4" />
        New Note
      </button>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-xl border border-white/5 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-white/20 focus:outline-none focus:bg-white/[0.06] transition-all"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
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
          icon={<Target className="h-4 w-4" />}
          label="Daily Goal"
          count={progressPct}
          active={onNavigateDailyGoal === undefined ? false : false} // Placeholder logic
          onClick={onNavigateDailyGoal || (() => {})}
        />
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-white/5">
          <span className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground/70 font-semibold">
            Collections
          </span>
          <button
            type="button"
            aria-label="New collection"
            onClick={() => setAdding(true)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.06]"
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

          {collections.length === 0 && !adding ? (
            <p className="px-3 py-3 text-xs text-muted-foreground/60 italic">
              No sub-collections yet
            </p>
          ) : null}

          {adding ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
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
              <button type="button" onClick={commit} aria-label="Save collection" className="p-1">
                <Check className="h-4 w-4 text-primary" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.04] px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.08]"
      >
        <Settings className="h-4 w-4" />
        Settings &amp; Theme
      </button>

      <UserBadge />
    </aside>
  );
}

function UserBadge() {
  const { user, signOut } = useAuth();
  const meta = user?.user_metadata as { username?: string; full_name?: string } | null;
  const name = meta?.username || meta?.full_name || user?.email?.split("@")[0] || "Guest User";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] p-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-tr from-primary/30 to-white/10 text-xs font-bold text-foreground">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="truncate text-[0.68rem] text-muted-foreground/70">
          {user?.email || "Local Workspace"}
        </p>
      </div>
      {user ? (
        <button
          type="button"
          aria-label="Log out"
          title="Log out"
          onClick={() => void signOut()}
          className="rounded-lg border border-white/5 bg-white/[0.04] p-1.5 text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
