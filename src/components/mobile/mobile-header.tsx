import { Sparkles, Menu, ArrowLeft, Settings, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type Props = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showSearch?: boolean;
  onToggleSearch?: () => void;
  children?: ReactNode;
};

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  onOpenSidebar,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  showSearch = false,
  onToggleSearch,
  children,
}: Props) {
  return (
    <header className="w-full px-2.5 py-1.5 bg-transparent select-none transition-all">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          {showBack && onBack ? (
            <button
              type="button"
              onClick={() => {
                haptic("light");
                onBack();
              }}
              aria-label="Go back"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-foreground transition-transform active:scale-90 shrink-0 touch-manipulation cursor-pointer backdrop-blur-xl hover:bg-white/[0.12]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : onOpenSidebar ? (
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onOpenSidebar();
              }}
              aria-label="Open menu"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-foreground transition-transform active:scale-90 shrink-0 touch-manipulation cursor-pointer backdrop-blur-xl hover:bg-white/[0.12]"
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex-1 min-w-0 flex items-center px-1">
          {children ? (
            children
          ) : title ? (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
                {title}
              </h2>
              {subtitle ? (
                <p className="text-[0.68rem] text-muted-foreground truncate leading-tight mt-0.5 font-medium">
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleSearch ? (
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                haptic("light");
                onToggleSearch();
              }}
              className={cn(
                "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 transition-transform active:scale-90 touch-manipulation cursor-pointer backdrop-blur-xl",
                showSearch ? "bg-primary text-primary-foreground shadow-md" : "bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.12]",
              )}
            >
              <Search className="h-4 w-4" />
            </button>
          ) : null}

          {onOpenSettings ? (
            <button
              type="button"
              aria-label="Settings"
              onClick={() => {
                haptic("medium");
                onOpenSettings();
              }}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.12] transition-transform active:scale-90 touch-manipulation cursor-pointer backdrop-blur-xl"
            >
              <Settings className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {showSearch && onSearchChange ? (
        <div className="mt-2 relative animate-fade-swap px-0.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes and courses..."
            className="w-full rounded-xl border border-white/15 bg-black/50 backdrop-blur-xl py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 shadow-lg"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                haptic("light");
                onSearchChange("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
