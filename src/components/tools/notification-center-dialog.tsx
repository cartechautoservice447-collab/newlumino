import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNotifications, type NotificationType } from "@/context/notification-context";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Trash2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string }
> = {
  success: { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-400" },
  error: { icon: <AlertCircle className="h-4 w-4" />, color: "text-rose-400" },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-400" },
  info: { icon: <Info className="h-4 w-4" />, color: "text-sky-400" },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationCenterDialog({ open, onOpenChange }: Props) {
  const { history, clearHistory } = useNotifications();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[80vh] overflow-y-auto rounded-3xl border border-white/15 bg-black/90 p-5 shadow-2xl backdrop-blur-3xl scroll-sleek sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Bell className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              Recent Activity
            </DialogTitle>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                haptic("warning");
                clearHistory();
              }}
              className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </DialogHeader>

        <div className="mt-4 space-y-2">
          {history.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground italic">No recent notifications</p>
            </div>
          ) : (
            history.map((n) => {
              const config = TYPE_CONFIG[n.type];
              const time = new Date(n.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]"
                >
                  <div className={cn("mt-0.5 shrink-0", config.color)}>{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[0.75rem] font-bold text-foreground leading-none">
                        {n.message}
                      </h4>
                      <span className="text-[0.6rem] font-mono text-muted-foreground tabular-nums">
                        {time}
                      </span>
                    </div>
                    {n.description && (
                      <p className="mt-1 text-[0.68rem] text-muted-foreground/80 leading-relaxed">
                        {n.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
