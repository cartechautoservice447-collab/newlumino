import React, { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  Sparkles,
  Zap,
  Brain,
  Coffee,
  Target,
  GraduationCap,
  Terminal,
  Volume2,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useNotifications } from "@/context/notification-context";
import {
  generateAiNotification,
  loadAiNotificationSettings,
  saveAiNotificationSettings,
  loadNotificationHistory,
  clearNotificationHistory,
  type AiNotificationPersona,
  type AiNotificationCategory,
  type AiNotificationSettings,
  type AiNotificationResult,
} from "@/lib/ai-notification";

const PERSONAS: { id: AiNotificationPersona; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "coach", label: "Coach", desc: "High energy & focus drive", icon: Zap },
  { id: "professor", label: "Professor", desc: "Socratic inquiry & depth", icon: GraduationCap },
  { id: "mentor", label: "Mentor", desc: "Mindful pacing & clarity", icon: Coffee },
  { id: "hacker", label: "Tech Lead", desc: "Edge cases & logic probe", icon: Terminal },
];

const CATEGORIES: { id: AiNotificationCategory; label: string; icon: React.ElementType }[] = [
  { id: "study_nudge", label: "Study Nudge", icon: Brain },
  { id: "daily_goal", label: "Goal Boost", icon: Target },
  { id: "break_reminder", label: "Mindful Break", icon: Coffee },
  { id: "retention_quiz", label: "Mini Quiz", icon: Sparkles },
];

export function AiNotificationSection({
  noteTitle = "General Study",
  activeCourseName = "Current Course",
  focusMinutes = 25,
  dailyGoalHours = 2,
}: {
  noteTitle?: string;
  activeCourseName?: string;
  focusMinutes?: number;
  dailyGoalHours?: number;
}) {
  const { showNotification } = useNotifications();
  const [config, setConfig] = useState<AiNotificationSettings>(loadAiNotificationSettings);
  const [selectedCategory, setSelectedCategory] = useState<AiNotificationCategory>("study_nudge");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<AiNotificationResult[]>(loadNotificationHistory);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    saveAiNotificationSettings(config);
  }, [config]);

  const handleUpdate = (patch: Partial<AiNotificationSettings>) => {
    haptic("light");
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleGenerateAlert = async () => {
    haptic("medium");
    setIsGenerating(true);

    try {
      const result = await generateAiNotification({
        persona: config.persona,
        category: selectedCategory,
        context: {
          noteTitle,
          activeCourseName,
          focusMinutes,
          dailyGoalHours,
        },
      });

      // Fire into the global notification banner
      showNotification({
        message: result.title,
        description: result.message,
        type: result.type,
        duration: 5000,
      });

      // Update local history list
      setHistory(loadNotificationHistory());
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendStandardTest = () => {
    haptic("light");
    showNotification({
      message: "🔔 System Notification Active",
      description: "Audio & visual banners are running with low-latency liquid styling.",
      type: "info",
      duration: 3500,
    });
  };

  const handleClearHistory = () => {
    haptic("warning");
    clearNotificationHistory();
    setHistory([]);
  };

  return (
    <section className="space-y-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/20 text-primary">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground/80 font-bold">
              AI-Integrated Notification System
            </h3>
            <p className="text-[0.68rem] text-muted-foreground/70">
              Contextual Gemini study micro-nudges, goal reminders &amp; milestone celebrations
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendStandardTest}
          title="Send test notification toast"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.65rem] font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground active:scale-95 transition cursor-pointer"
        >
          Test Toast
        </button>
      </div>

      {/* Main Switches */}
      <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">AI Smart Nudges (Gemini)</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Intelligent study prompts and memory retention reminders
            </p>
          </div>
          <Switch
            checked={config.studyNudges}
            onCheckedChange={(val) => handleUpdate({ studyNudges: val })}
          />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div>
            <p className="text-xs font-semibold text-foreground">Milestones &amp; Celebrations</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Celebratory alerts on focus completion and daily goals
            </p>
          </div>
          <Switch
            checked={config.milestones}
            onCheckedChange={(val) => handleUpdate({ milestones: val })}
          />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div>
            <p className="text-xs font-semibold text-foreground">Tactile &amp; Sound Haptics</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Harmonic feedback pulses when notifications fire
            </p>
          </div>
          <Switch
            checked={config.soundHaptics}
            onCheckedChange={(val) => handleUpdate({ soundHaptics: val })}
          />
        </div>
      </div>

      {/* AI Persona Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">
            AI Notification Persona
          </span>
          <span className="text-[0.62rem] text-primary font-semibold font-mono">
            {PERSONAS.find((p) => p.id === config.persona)?.desc}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const isSelected = config.persona === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleUpdate({ persona: p.id })}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-all cursor-pointer active:scale-95",
                  isSelected
                    ? "border-primary/50 bg-primary/20 text-foreground font-bold shadow-sm ring-1 ring-primary/40"
                    : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Live Generator */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Generate Live AI Smart Alert</span>
          </div>
          <span className="text-[0.62rem] rounded-md bg-primary/20 px-1.5 py-0.5 text-primary font-mono font-bold">
            Gemini 3.8
          </span>
        </div>

        {/* Category Selector */}
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  haptic("light");
                  setSelectedCategory(cat.id);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-1 px-2 text-[0.68rem] font-medium transition cursor-pointer active:scale-95",
                  isSelected
                    ? "bg-white/[0.12] text-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerateAlert}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-2.5 px-4 text-xs font-bold text-primary-foreground shadow-lg hover:opacity-95 active:scale-98 transition disabled:opacity-50 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Synthesizing Contextual Alert...</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Send AI Smart Notification</span>
            </>
          )}
        </button>
      </div>

      {/* Notification Activity Log / Inbox */}
      <div className="space-y-1.5 pt-1 border-t border-white/5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setShowHistory(!showHistory);
            }}
            className="flex items-center gap-1.5 text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition cursor-pointer"
          >
            <Clock className="h-3 w-3" />
            <span>Alert History ({history.length})</span>
            <span className="text-[0.6rem] text-primary">{showHistory ? "▲ Hide" : "▼ Show"}</span>
          </button>

          {history.length > 0 && showHistory && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex items-center gap-1 text-[0.65rem] text-rose-400 hover:text-rose-300 transition cursor-pointer"
            >
              <Trash2 className="h-2.5 w-2.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {showHistory && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto scroll-sleek">
            {history.length === 0 ? (
              <p className="text-center py-3 text-xs text-muted-foreground/60 italic">
                No recent notifications recorded yet.
              </p>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-2 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                      <span className="text-[0.6rem] rounded bg-white/10 px-1 py-0.2 text-muted-foreground shrink-0">
                        {item.categoryBadge}
                      </span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                  {item.timestamp && (
                    <span className="text-[0.58rem] text-muted-foreground/50 shrink-0 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
