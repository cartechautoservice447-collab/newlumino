import { useEffect, useState } from "react";
import { Sparkles, Plus, Check, Folder } from "lucide-react";
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

export function MobileQuickDraftSheet({
  open,
  onOpenChange,
  collections,
  activeCourseId,
  onSaveNote,
}: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedCol, setSelectedCol] = useState<string | null>(activeCourseId);

  useEffect(() => {
    if (open) setSelectedCol(activeCourseId);
  }, [open, activeCourseId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    haptic("success");
    onSaveNote(title.trim() || "Quick Note", body, selectedCol);
    setTitle("");
    setBody("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        haptic(val ? "medium" : "light");
        onOpenChange(val);
      }}
    >
      <DialogContent className="glass-panel fixed bottom-0 top-auto left-0 right-0 max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-t border-white/15 bg-black/90 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-3xl md:hidden overflow-y-auto scroll-sleek z-50">
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
          />

          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write Markdown thoughts, snippets, or bullet points..."
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none scroll-sleek"
          />

          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={selectedCol ?? ""}
              onChange={(e) => {
                haptic("light");
                setSelectedCol(e.target.value || null);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-muted-foreground focus:border-white/20 focus:outline-none"
            >
              <option value="">No Collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                haptic("light");
                onOpenChange(false);
              }}
              className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-2 text-xs font-medium text-muted-foreground touch-manipulation cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() && !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-50 transition-all touch-manipulation cursor-pointer"
            >
              <Check className="h-4 w-4" />
              Save Note
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
