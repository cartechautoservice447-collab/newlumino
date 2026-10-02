import { memo, useCallback, type ReactNode } from "react";
import { ArrowLeft, Menu, Search, Settings, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type HapticKind = Parameters<typeof haptic>[0];

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

/* Class strings are static so Tailwind can see every token. */
const BTN_BASE =
  "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 transition-transform active:scale-90 touch-manipulation cursor-pointer backdrop-blur-xl";
const BTN_SOLID =
  "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-foreground transition-transform active:scale-90 shrink-0 touch-manipulation cursor-pointer backdrop-blur-xl hover:bg-white/[0.12]";
const BTN_MUTED =
  "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.12] transition-transform active:scale-90 touch-manipulation cursor-pointer backdrop-blur-xl";

const ICON_CLASS = "h-4 w-4";

/** Icon button: haptic first, then the action (instant feedback). */
const HeaderButton = memo(function HeaderButton({
  label,
  className,
  haptics,
  Icon,
  onPress,
}: {
  label: string;
  className: string;
  haptics: HapticKind;
  Icon: LucideIcon;
  onPress: () => void;
}) {
  const handleClick = useCallback(() => {
    haptic(haptics);
    onPress();
  }, [haptics, onPress]);

  return (
    <button type="button" onClick={handleClick} aria-label={label} className={className}>
      <Icon className={ICON_CLASS} />
    </button>
  );
});

const SearchBar = memo(function SearchBar({
  query,
  onChange,
}: {
  query: string;
  onChange: (q: string) => void;
}) {
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );
  const handleClear = useCallback(() => {
    haptic("light");
    onChange("");
  }, [onChange]);

  return (
    <div className="mt-2 relative animate-fade-swap px-0.5">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        autoFocus
        value={query}
        onChange={handleInput}
        placeholder="Search notes and courses..."
        className="w-full rounded-xl border border-white/15 bg-black/50 backdrop-blur-xl py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 shadow-lg"
      />
      {query ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
});

export const MobileHeader = memo(function MobileHeader({
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
            <HeaderButton label="Go back" className={BTN_SOLID} haptics="light" Icon={ArrowLeft} onPress={onBack} />
          ) : onOpenSidebar ? (
            <HeaderButton label="Open menu" className={BTN_SOLID} haptics="medium" Icon={Menu} onPress={onOpenSidebar} />
          ) : null}
        </div>

        <div className="flex-1 min-w-0 flex items-center px-1">
          {children ? (
            children
          ) : title ? (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold tracking-tight text-foreground truncate">{title}</h2>
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
            <HeaderButton
              label="Search"
              className={cn(
                BTN_BASE,
                showSearch
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.12]",
              )}
              haptics="light"
              Icon={Search}
              onPress={onToggleSearch}
            />
          ) : null}

          {onOpenSettings ? (
            <HeaderButton
              label="Settings"
              className={BTN_MUTED}
              haptics="medium"
              Icon={Settings}
              onPress={onOpenSettings}
            />
          ) : null}
        </div>
      </div>

      {showSearch && onSearchChange ? <SearchBar query={searchQuery ?? ""} onChange={onSearchChange} /> : null}
    </header>
  );
});
