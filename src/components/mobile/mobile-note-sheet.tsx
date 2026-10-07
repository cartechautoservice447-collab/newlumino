import { useState } from "react";
import {
  Star,
  Copy,
  Share2,
  Download,
  Trash2,
  FolderOpen,
  Files,
  Check,
  X,
  FileText,
  Brain,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, type Collection, type Note } from "@/lib/notes";
import { cn } from "@/lib/utils";
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
  onOpenFlashcards?: (note: Note) => void;
};

export function MobileNoteSheet({
  note,
  open,
  onOpenChange,
  collections,
  onToggleFavorite,
  onDuplicate,
  onMoveCollection,
  onDelete,
  onOpenInEditor,
  onOpenFlashcards,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!note) return null;

  const wordCount = note.body.trim() ? note.body.trim().split(/\s+/).length : 0;
  const charCount = note.body.length;
  const currentCollection = collections.find((c) => c.id === note.collectionId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`# ${note.title}\n\n${note.body}`);
      haptic("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
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
  };

  const handleExport = () => {
    haptic("medium");
    const blob = new Blob([`# ${note.title || "Untitled"}\n\n${note.body}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(note.title || "note").toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        haptic(val ? "medium" : "light");
        onOpenChange(val);
      }}
    >
      <DialogContent className="glass-panel fixed bottom-0 top-auto left-0 right-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-white/15 bg-black/90 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-3xl md:hidden overflow-y-auto scroll-sleek z-50">
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
          <p className="text-xs text-muted-foreground font-mono">
            {wordCount} words · {charCount} characters · Updated {formatDate(note.updatedAt)}
          </p>
        </DialogHeader>

        {confirmDelete ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-semibold text-destructive-foreground">Delete this note?</p>
            <p className="text-xs text-muted-foreground">This note will be permanently removed.</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setConfirmDelete(false);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-foreground touch-manipulation cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("warning");
                  onDelete(note.id);
                  onOpenChange(false);
                  setConfirmDelete(false);
                }}
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
                onClick={() => {
                  haptic("light");
                  setMoving(false);
                }}
                className="text-xs text-primary font-medium"
              >
                Done
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 scroll-sleek pr-1">
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onMoveCollection(note.id, null);
                  setMoving(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-left transition-all touch-manipulation cursor-pointer",
                  !note.collectionId
                    ? "bg-primary/20 text-primary font-bold border border-primary/30"
                    : "bg-white/[0.04] text-foreground hover:bg-white/[0.08]",
                )}
              >
                <span>No Collection</span>
                {!note.collectionId && <Check className="h-4 w-4" />}
              </button>

              {collections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    onMoveCollection(note.id, c.id);
                    setMoving(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-left transition-all touch-manipulation cursor-pointer",
                    note.collectionId === c.id
                      ? "bg-primary/20 text-primary font-bold border border-primary/30"
                      : "bg-white/[0.04] text-foreground hover:bg-white/[0.08]",
                  )}
                >
                  <span className="truncate">{c.name}</span>
                  {note.collectionId === c.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* Action 1: Star */}
            <button
              type="button"
              onClick={() => {
                haptic("light");
                onToggleFavorite(note.id);
              }}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-medium text-foreground transition-transform active:scale-95 touch-manipulation cursor-pointer"
            >
              <Star className={cn("h-4 w-4", note.favorite && "fill-yellow-400 text-yellow-400")} />
              <span>{note.favorite ? "Unstar Note" : "Star Note"}</span>
            </button>

            {/* Action 2: Move collection */}
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setMoving(true);
              }}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-medium text-foreground transition-transform active:scale-95 truncate touch-manipulation cursor-pointer"
            >
              <FolderOpen className="h-4 w-4 text-accent" />
              <span className="truncate">{currentCollection ? currentCollection.name : "Collection"}</span>
            </button>

            {/* Action 3: Duplicate */}
            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onDuplicate(note.id);
                onOpenChange(false);
              }}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-medium text-foreground transition-transform active:scale-95 touch-manipulation cursor-pointer"
            >
              <Files className="h-4 w-4 text-primary" />
              <span>Duplicate</span>
            </button>

            {/* Action 4: Copy Markdown */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-medium text-foreground transition-transform active:scale-95 touch-manipulation cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied!" : "Copy MD"}</span>
            </button>

            {/* Action 5: Share */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-medium text-foreground transition-transform active:scale-95 touch-manipulation cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-cyan-400" />
              <span>Share</span>
            </button>

            {/* Action 6: Export */}
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-medium text-foreground transition-transform active:scale-95 touch-manipulation cursor-pointer"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Export .md</span>
            </button>

            {/* Action 7: Study with Flashcards */}
            {onOpenFlashcards && (
              <button
                type="button"
                onClick={() => {
                  haptic("medium");
                  onOpenChange(false);
                  onOpenFlashcards(note);
                }}
                className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs font-bold text-purple-300 transition-transform active:scale-95 hover:bg-purple-500/20 touch-manipulation cursor-pointer"
              >
                <Brain className="h-4 w-4" />
                <span>Study with Flashcards</span>
              </button>
            )}

            {/* Action 8: Delete (Full width) */}
            <button
              type="button"
              onClick={() => {
                haptic("warning");
                setConfirmDelete(true);
              }}
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
}
