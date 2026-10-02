import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
import { haptic } from "@/lib/haptics";

type Props = {
  onInsertMarkdown: (before: string, after: string, placeholder?: string) => void;
  onInsertCodeBlock: () => void;
  editorMode: "write" | "preview";
};

/* ------------------------------------------------------------------ */
/* Static toolbar definition (order is the on-screen order)            */
/* ------------------------------------------------------------------ */

type ToolItem = {
  label: string;
  /** Text shown instead of an icon (H1/H2). */
  text?: string;
  Icon?: LucideIcon;
  iconClass: string;
  action:
    | { kind: "wrap"; before: string; after: string; placeholder?: string }
    | { kind: "codeBlock" };
};

const ICON = "h-4 w-4";

const TOOLS: readonly ToolItem[] = [
  { label: "Heading 1", text: "H1", iconClass: ICON, action: { kind: "wrap", before: "# ", after: "", placeholder: "Heading" } },
  { label: "Heading 2", text: "H2", iconClass: ICON, action: { kind: "wrap", before: "## ", after: "", placeholder: "Subheading" } },
  { label: "Bold", Icon: Bold, iconClass: ICON, action: { kind: "wrap", before: "**", after: "**", placeholder: "bold text" } },
  { label: "Italic", Icon: Italic, iconClass: ICON, action: { kind: "wrap", before: "_", after: "_", placeholder: "italic text" } },
  { label: "Inline Code", Icon: Code, iconClass: ICON, action: { kind: "wrap", before: "`", after: "`", placeholder: "code" } },
  { label: "Code Block", Icon: SquareCode, iconClass: ICON, action: { kind: "codeBlock" } },
  { label: "Bullet list", Icon: List, iconClass: ICON, action: { kind: "wrap", before: "- ", after: "", placeholder: "Item" } },
  { label: "Task check", Icon: CheckSquare, iconClass: `${ICON} text-emerald-400`, action: { kind: "wrap", before: "- [ ] ", after: "", placeholder: "Task" } },
  { label: "Quote", Icon: Quote, iconClass: ICON, action: { kind: "wrap", before: "> ", after: "", placeholder: "Quote" } },
  { label: "Link", Icon: Link, iconClass: ICON, action: { kind: "wrap", before: "[", after: "](https://)", placeholder: "link text" } },
];

// No transition on purpose: presses are instant, exactly as before.
const TOOL_BTN =
  "flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:bg-white/[0.15] active:scale-90 shrink-0 touch-manipulation cursor-pointer";
const TOOL_BTN_TEXT = `${TOOL_BTN} text-xs font-bold font-mono`;

const ROOT_CLASS =
  "md:hidden fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] inset-x-2.5 z-30 select-none transition-[bottom,left,right] duration-300";

/* ------------------------------------------------------------------ */
/* Button strip: rendered once, never re-renders from editor updates   */
/* ------------------------------------------------------------------ */

type ActionHandler = (item: ToolItem) => void;

function ToolButton({ item, onAction }: { item: ToolItem; onAction: ActionHandler }) {
  const { Icon, text, label, iconClass } = item;
  const handleClick = useCallback(() => onAction(item), [onAction, item]);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={handleClick}
      className={text ? TOOL_BTN_TEXT : TOOL_BTN}
    >
      {Icon ? <Icon className={iconClass} /> : text}
    </button>
  );
}

const ToolStrip = memo(function ToolStrip({ onAction }: { onAction: ActionHandler }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scroll-sleek px-1 py-0.5">
      {TOOLS.map((item) => (
        <ToolButton key={item.label} item={item} onAction={onAction} />
      ))}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Bar                                                                 */
/* ------------------------------------------------------------------ */

export const MobileAccessoryBar = memo(function MobileAccessoryBar({
  onInsertMarkdown,
  onInsertCodeBlock,
  editorMode,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Always call the parent's latest callbacks without making our own handlers change
  // identity every time the editor state (and thus the parent's callbacks) changes.
  const latest = useRef({ onInsertMarkdown, onInsertCodeBlock });
  useEffect(() => {
    latest.current = { onInsertMarkdown, onInsertCodeBlock };
  }, [onInsertMarkdown, onInsertCodeBlock]);

  const handleAction = useCallback<ActionHandler>((item) => {
    const { action } = item;
    if (action.kind === "codeBlock") {
      haptic("medium");
      latest.current.onInsertCodeBlock();
    } else {
      haptic("light");
      latest.current.onInsertMarkdown(action.before, action.after, action.placeholder);
    }
  }, []);

  const handleCollapse = useCallback(() => {
    haptic("light");
    setCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    haptic("light");
    setCollapsed(false);
  }, []);

  // If in Preview / Reader mode, do not render formatting toolbar
  if (editorMode === "preview") return null;

  return (
    <div className={ROOT_CLASS}>
      {collapsed ? (
        <div className="flex justify-end pr-2">
          <button
            type="button"
            aria-label="Expand formatting bar"
            onClick={handleExpand}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/80 px-3 py-1.5 text-[0.65rem] font-bold text-muted-foreground backdrop-blur-xl shadow-lg active:scale-95 transition-transform touch-manipulation cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Format Tools</span>
            <ChevronUp className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="glass-panel flex items-center justify-between gap-1 rounded-2xl border border-white/15 bg-black/80 p-1.5 shadow-2xl backdrop-blur-3xl">
          <ToolStrip onAction={handleAction} />

          {/* Minimize button */}
          <button
            type="button"
            aria-label="Hide toolbar"
            onClick={handleCollapse}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground hover:text-foreground active:scale-90 shrink-0 ml-1 touch-manipulation cursor-pointer"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
});
