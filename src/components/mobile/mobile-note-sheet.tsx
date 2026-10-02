import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Star,
  Copy,
  Share2,
  Download,
  Trash2,
  FolderOpen,
  Files,
  Check,
  FileText,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, type Collection, type Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";

type Props = {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: Collection[];
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveCollection: (id: string, collectionId: string | null) => void;
  onDelete: (id: string) => void;
  onOpenInEditor?: (id: string) => void;
};

/* ------------------------------------------------------------------ */
/* Static class strings (hoisted: no per-render cn()/twMerge work)     */
/* ------------------------------------------------------------------ */

const SHEET_CLASS =
  "glass-panel fixed bottom-0 top-auto left-0 right-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-white/15 bg-black/90 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-3xl md:hidden overflow-y-auto overscroll-contain scroll-sleek z-50";

// `transition-transform` in Tailwind v4 covers transform, translate, scale and rotate,
// so `active:scale-95` keeps animating.
const ACTION_BTN =
  "flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-medium text-foreground transition-transform active:scale-95 touch-manipulation cursor-pointer";
const MOVE_BTN = `${ACTION_BTN} truncate`;

const ROW_BASE =
  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-left transition-colors touch-manipulation cursor-pointer";
const ROW_ACTIVE = `${ROW_BASE} bg-primary/20 text-primary font-bold border border-primary/30`;
const ROW_INACTIVE = `${ROW_BASE} bg-white/[0.04] text-foreground hover:bg-white/[0.08]`;

const STAR_ICON = "h-4 w-4";
const STAR_ICON_ON = "h-4 w-4 fill-yellow-400 text-yellow-400";

function countWords(body: string): number {
  return body.match(/\S+/g)?.length ?? 0;
}

/* ------------------------------------------------------------------ */
/* Small memoized pieces                                               */
/* ------------------------------------------------------------------ */

// Only mounted while the sheet content is mounted, so closed sheets never count words.
const NoteStats = memo(function NoteStats({
  body,
  updatedAt,
}: {
  body: string;
  updatedAt: Note["updatedAt"];
}) {
  return (
    <p className="text-xs text-muted-foreground font-mono">
      {countWords(body)} words · {body.length} characters · Updated {formatDate(updatedAt)}
    </p>
  );
});

const CollectionRow = memo(function CollectionRow({
  id,
  name,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  selected: boolean;
  onSelect: (collectionId: string) => void;
}) {
  const handleClick = useCallback(() => onSelect(id), [onSelect, id]);
  return (
    <button type="button" onClick={handleClick} className={selected ? ROW_ACTIVE : ROW_INACTIVE}>
      <span className="truncate">{name}</span>
      {selected && <Check className="h-4 w-4" />}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Sheet                                                               */
/* ------------------------------------------------------------------ */

export const MobileNoteSheet = memo(function MobileNoteSheet({
  note,
  open,
  onOpenChange,
  collections,
  onToggleFavorite,
  onDuplicate,
  onMoveCollection,
  onDelete,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear the "Copied!" timer on unmount.
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const noteId = note?.id;

  const handleOpenChange = useCallback(
    (val: boolean) => {
      haptic(val ? "medium" : "light");
      onOpenChange(val);
    },
    [onOpenChange],
  );

  const handleCopy = useCallback(async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(`# ${note.title}\n\n${note.body}`);
      haptic("success");
      setCopied(true);
      clearTimeout(copyTimer.current); // repeated taps don't stack timers
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [note]);

  const handleShare = useCallback(async () => {
    if (!note) return;
    haptic("light");
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title || "Note",
          text: note.body,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  }, [note, handleCopy]);

  const handleExport = useCallback(() => {
    if (!note) return;
    haptic("medium");
    const blob = new Blob([`# ${note.title || "Untitled"}\n\n${note.body}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(note.title || "note").toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    // Revoke after the browser has started the download (immediate revoke can break Safari).
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [note]);

  const handleToggleFavorite = useCallback(() => {
    if (!noteId) return;
    haptic("light");
    onToggleFavorite(noteId);
  }, [noteId, onToggleFavorite]);

  const handleStartMoving = useCallback(() => {
    haptic("light");
    setMoving(true);
  }, []);

  const handleStopMoving = useCallback(() => {
    haptic("light");
    setMoving(false);
  }, []);

  const handleSelectCollection = useCallback(
    (collectionId: string | null) => {
      if (!noteId) return;
      haptic("medium");
      onMoveCollection(noteId, collectionId);
      setMoving(false);
    },
    [noteId, onMoveCollection],
  );

  const handleSelectNone = useCallback(
    () => handleSelectCollection(null),
    [handleSelectCollection],
  );

  const handleDuplicate = useCallback(() => {
    if (!noteId) return;
    haptic("medium");
    onDuplicate(noteId);
    onOpenChange(false);
  }, [noteId, onDuplicate, onOpenChange]);

  const handleAskDelete = useCallback(() => {
    haptic("warning");
    setConfirmDelete(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    haptic("light");
    setConfirmDelete(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!noteId) return;
    haptic("warning");
    onDelete(noteId);
    onOpenChange(false);
    setConfirmDelete(false);
  }, [noteId, onDelete, onOpenChange]);

  if (!note) return null;

  const currentCollection = collections.find((c) => c.id === note.collectionId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={SHEET_CLASS}>
        {/* Pull Indicator Pill */}
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20" />

        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-bold tracking-tight text-foreground truncate">
              {note.title || "Untitled note"}
            </DialogTitle>
          </div>
          <NoteStats body={note.body} updatedAt={note.updatedAt} />
        </DialogHeader>

        {confirmDelete ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive-foreground">Delete this note?</p>
            <p className="text-xs text-muted-foreground">This note will be permanently removed.</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-foreground touch-manipulation cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl border border-destructive/40 bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-lg touch-manipulation cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        ) : moving ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Select Collection</span>
              <button
                type="button"
                onClick={handleStopMoving}
                className="text-xs text-primary font-medium"
              >
                Done
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto overscroll-contain space-y-1.5 scroll-sleek pr-1">
              <button
                type="button"
                onClick={handleSelectNone}
                className={!note.collectionId ? ROW_ACTIVE : ROW_INACTIVE}
              >
                <span>No Collection</span>
                {!note.collectionId && <Check className="h-4 w-4" />}
              </button>

              {collections.map((c) => (
                <CollectionRow
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  selected={note.collectionId === c.id}
                  onSelect={handleSelectCollection}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* Action 1: Star */}
            <button type="button" onClick={handleToggleFavorite} className={ACTION_BTN}>
              <Star className={note.favorite ? STAR_ICON_ON : STAR_ICON} />
              <span>{note.favorite ? "Unstar Note" : "Star Note"}</span>
            </button>

            {/* Action 2: Move collection */}
            <button type="button" onClick={handleStartMoving} className={MOVE_BTN}>
              <FolderOpen className="h-4 w-4 text-accent" />
              <span className="truncate">{currentCollection ? currentCollection.name : "Collection"}</span>
            </button>

            {/* Action 3: Duplicate */}
            <button type="button" onClick={handleDuplicate} className={ACTION_BTN}>
              <Files className="h-4 w-4 text-primary" />
              <span>Duplicate</span>
            </button>

            {/* Action 4: Copy Markdown */}
            <button type="button" onClick={handleCopy} className={ACTION_BTN}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied!" : "Copy MD"}</span>
            </button>

            {/* Action 5: Share */}
            <button type="button" onClick={handleShare} className={ACTION_BTN}>
              <Share2 className="h-4 w-4 text-cyan-400" />
              <span>Share</span>
            </button>

            {/* Action 6: Export */}
            <button type="button" onClick={handleExport} className={ACTION_BTN}>
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Export .md</span>
            </button>

            {/* Action 8: Delete (Full width) */}
            <button
              type="button"
              onClick={handleAskDelete}
              className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive transition-transform active:scale-95 hover:bg-destructive/20 touch-manipulation cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Note</span>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
