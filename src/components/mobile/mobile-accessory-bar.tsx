import { useState } from "react";
import {
  Bold,
  Italic,
  Code,
  SquareCode,
  List,
  CheckSquare,
  Quote,
  Link,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type Props = {
  onInsertMarkdown: (before: string, after: string, placeholder?: string) => void;
  onInsertCodeBlock: () => void;
  editorMode: "write" | "preview";
};

export function MobileAccessoryBar({
  onInsertMarkdown,
  onInsertCodeBlock,
  editorMode,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // If in Preview / Reader mode, do not render formatting toolbar
  if (editorMode === "preview") return null;

  const handleWrap = (before: string, after: string, placeholder?: string) => {
    haptic("light");
    onInsertMarkdown(before, after, placeholder);
  };

  const handleCodeBlock = () => {
    haptic("medium");
    onInsertCodeBlock();
  };

  return (
    <div className="md:hidden fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] inset-x-2.5 z-30 select-none transition-all duration-300">
      {collapsed ? (
        <div className="flex justify-end pr-2">
          <button
            type="button"
            aria-label="Expand formatting bar"
            onClick={() => {
              haptic("light");
              setCollapsed(false);
            }}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/80 px-3 py-1.5 text-[0.65rem] font-bold text-muted-foreground backdrop-blur-xl shadow-lg active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Format Tools</span>
            <ChevronUp className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="glass-panel flex items-center justify-between gap-1 rounded-2xl border border-white/15 bg-black/80 p-1.5 shadow-2xl backdrop-blur-3xl">
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-sleek px-1 py-0.5">
            {/* H1 */}
            <button
              type="button"
              aria-label="Heading 1"
              onClick={() => handleWrap("# ", "", "Heading")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 text-xs font-bold font-mono shrink-0 touch-manipulation cursor-pointer"
            >
              H1
            </button>

            {/* H2 */}
            <button
              type="button"
              aria-label="Heading 2"
              onClick={() => handleWrap("## ", "", "Subheading")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 text-xs font-bold font-mono shrink-0 touch-manipulation cursor-pointer"
            >
              H2
            </button>

            {/* Bold */}
            <button
              type="button"
              aria-label="Bold"
              onClick={() => handleWrap("**", "**", "bold text")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <Bold className="h-4 w-4" />
            </button>

            {/* Italic */}
            <button
              type="button"
              aria-label="Italic"
              onClick={() => handleWrap("_", "_", "italic text")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <Italic className="h-4 w-4" />
            </button>

            {/* Code */}
            <button
              type="button"
              aria-label="Inline Code"
              onClick={() => handleWrap("`", "`", "code")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <Code className="h-4 w-4" />
            </button>

            {/* Code Block */}
            <button
              type="button"
              aria-label="Code Block"
              onClick={handleCodeBlock}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <SquareCode className="h-4 w-4" />
            </button>

            {/* Bullet list */}
            <button
              type="button"
              aria-label="Bullet list"
              onClick={() => handleWrap("- ", "", "Item")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <List className="h-4 w-4" />
            </button>

            {/* Task check */}
            <button
              type="button"
              aria-label="Task check"
              onClick={() => handleWrap("- [ ] ", "", "Task")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <CheckSquare className="h-4 w-4 text-emerald-400" />
            </button>

            {/* Quote */}
            <button
              type="button"
              aria-label="Quote"
              onClick={() => handleWrap("> ", "", "Quote")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <Quote className="h-4 w-4" />
            </button>

            {/* Link */}
            <button
              type="button"
              aria-label="Link"
              onClick={() => handleWrap("[", "](https://)", "link text")}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer"
            >
              <Link className="h-4 w-4" />
            </button>
          </div>

          {/* Minimize button */}
          <button
            type="button"
            aria-label="Hide toolbar"
            onClick={() => {
              haptic("light");
              setCollapsed(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:scale-90 shrink-0 ml-1 touch-manipulation cursor-pointer"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
