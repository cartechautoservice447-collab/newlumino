import confetti from "canvas-confetti";
import { Sparkles, Coffee, X, Clock, Flame } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Note } from "@/lib/notes";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeNote: Note | null;
  completedSessions: number;
  onStartBreak: () => void;
}

export function PomodoroSessionCompleteDialog({
  open,
  onOpenChange,
  activeNote,
  completedSessions,
  onStartBreak,
}: Props) {
  const [loading, setLoading] = useState(false);



  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        haptic(val ? "medium" : "light");
        onOpenChange(val);
      }}
    >
      <DialogContent className="glass-panel max-h-[90vh] overflow-hidden rounded-3xl border border-white/20 bg-black/90 p-6 shadow-2xl backdrop-blur-3xl sm:max-w-[460px] select-none">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

        <div className="relative text-center space-y-4 pt-2">
          {/* Badge & Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/20 text-primary shadow-[0_0_30px_-4px_hsl(var(--primary)/0.7)] animate-bounce">
            <Flame className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Sprint #{completedSessions} Completed</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Focus Session Hit!
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
              Great work. Take a short break before continuing.
            </p>
          </div>

          {/* Active Note Preview Card */}
          {activeNote && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                Session Note
              </p>
              <p className="mt-0.5 text-xs font-bold text-foreground truncate">
                {activeNote.title || "Untitled Note"}
              </p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground/80 line-clamp-2">
                {activeNote.body.slice(0, 120) || "No content written yet."}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">


            <button
              type="button"
              onClick={() => {
                haptic("medium");
                onStartBreak();
                onOpenChange(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-xs font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-white/[0.08] touch-manipulation cursor-pointer"
            >
              <Coffee className="h-4 w-4 text-amber-400" />
              <span>Start 5m Rest Break</span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptic("light");
                onOpenChange(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground pt-1 transition-colors touch-manipulation cursor-pointer"
            >
              Skip &amp; Continue Writing
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
