import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useNotifications, type NotificationType } from "@/context/notification-context";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; border: string; bg: string; glow: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    glow: "shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    glow: "shadow-[0_0_20px_-5px_rgba(244,63,94,0.4)]",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    glow: "shadow-[0_0_20px_-5px_rgba(245,158,11,0.4)]",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    glow: "shadow-[0_0_20px_-5px_rgba(14,165,233,0.4)]",
  },
};

export function NotificationBanner() {
  const { notifications, hideNotification } = useNotifications();

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none p-4 gap-3">
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          id={n.id}
          message={n.message}
          description={n.description}
          type={n.type}
          onHide={() => hideNotification(n.id)}
        />
      ))}
    </div>
  );
}

function NotificationItem({
  id,
  message,
  description,
  type,
  onHide,
}: {
  id: string;
  message: string;
  description?: string;
  type: NotificationType;
  onHide: () => void;
}) {
  const [exiting, setExiting] = useState(false);
  const config = TYPE_CONFIG[type];

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onHide, 300);
  };

  return (
    <div
      className={cn(
        "glass-panel pointer-events-auto flex w-full max-w-md items-start gap-4 rounded-2xl border p-4 shadow-2xl backdrop-blur-3xl transition-all duration-300 animate-in fade-in slide-in-from-top-4",
        config.border,
        config.bg,
        config.glow,
        exiting && "opacity-0 scale-95 translate-y-[-10px] duration-200"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", config.color)}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold tracking-tight text-foreground leading-tight">
          {message}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground active:scale-90"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
