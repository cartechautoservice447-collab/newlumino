import {
  memo,
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Sparkles, Check, Folder } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Collection } from "@/lib/notes";
import { haptic } from "@/lib/haptics";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: Collection[];
  activeCourseId: string | null;
  onSaveNote: (title: string, body: string, collectionId: string | null) => void;
};

const SHEET_CLASS =
  "glass-panel fixed bottom-0 top-auto left-0 right-0 max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-white/15 bg-black/90 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-3xl md:hidden overflow-y-auto overscroll-contain scroll-sleek z-50";

// Same as `trim() !== ""` but without allocating a copy of the string on every keystroke.
const HAS_CONTENT = /\S/;

// Re-renders only when the collection list changes, not on every selection/keystroke.
const CollectionOptions = memo(function CollectionOptions({
  collections,
}: {
  collections: Collection[];
}) {
  return (
    <>
      <option value="">No Collection</option>
      {collections.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </>
  );
});

export const MobileQuickDraftSheet = memo(function MobileQuickDraftSheet({
  open,
  onOpenChange,
  collections,
  activeCourseId,
  onSaveNote,
}: Props) {
  // Draft text lives in refs (it survives closing the sheet, like before) so typing
  // never re-renders the sheet. Only the "can save" flag is React state, and React
  // bails out when it doesn't change.
  const titleDraft = useRef("");
  const bodyDraft = useRef("");
  const titleEl = useRef<HTMLInputElement | null>(null);
  const bodyEl = useRef<HTMLTextAreaElement | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [selectedCol, setSelectedCol] = useState<string | null>(activeCourseId);

  // Stable callback refs: seed the fields from the saved draft when the sheet content mounts.
  const setTitleEl = useCallback((el: HTMLInputElement | null) => {
    titleEl.current = el;
    if (el) el.value = titleDraft.current;
  }, []);
  const setBodyEl = useCallback((el: HTMLTextAreaElement | null) => {
    bodyEl.current = el;
    if (el) el.value = bodyDraft.current;
  }, []);

  const syncCanSubmit = useCallback(() => {
    setCanSubmit(HAS_CONTENT.test(titleDraft.current) || HAS_CONTENT.test(bodyDraft.current));
  }, []);

  const handleTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      titleDraft.current = e.target.value;
      syncCanSubmit();
    },
    [syncCanSubmit],
  );

  const handleBodyChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      bodyDraft.current = e.target.value;
      syncCanSubmit();
    },
    [syncCanSubmit],
  );

  const handleCollectionChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    haptic("light");
    setSelectedCol(e.target.value || null);
  }, []);

  const handleOpenChange = useCallback(
    (val: boolean) => {
      haptic(val ? "medium" : "light");
      onOpenChange(val);
    },
    [onOpenChange],
  );

  const handleCancel = useCallback(() => {
    haptic("light");
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const title = titleDraft.current.trim();
      const body = bodyDraft.current;
      if (!title && !body.trim()) return;
      haptic("success");
      onSaveNote(title || "Quick Note", body, selectedCol);
      titleDraft.current = "";
      bodyDraft.current = "";
      // Clear the visible fields too, so they are empty during the close animation.
      if (titleEl.current) titleEl.current.value = "";
      if (bodyEl.current) bodyEl.current.value = "";
      setCanSubmit(false);
      onOpenChange(false);
    },
    [onSaveNote, onOpenChange, selectedCol],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={SHEET_CLASS}>
        {/* Pull handle */}
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20" />

        <DialogHeader className="text-left space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              Quick Note Capture
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">Instantly draft ideas into your glass workspace</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            autoFocus
            ref={setTitleEl}
            onChange={handleTitleChange}
            placeholder="Note title..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
          />

          <textarea
            rows={4}
            ref={setBodyEl}
            onChange={handleBodyChange}
            placeholder="Write Markdown thoughts, snippets, or bullet points..."
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none scroll-sleek"
          />

          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={selectedCol ?? ""}
              onChange={handleCollectionChange}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-muted-foreground focus:border-white/20 focus:outline-none"
            >
              <CollectionOptions collections={collections} />
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-2 text-xs font-medium text-muted-foreground touch-manipulation cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-50 transition-[opacity,transform,translate,scale,rotate] touch-manipulation cursor-pointer"
            >
              <Check className="h-4 w-4" />
              Save Note
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
