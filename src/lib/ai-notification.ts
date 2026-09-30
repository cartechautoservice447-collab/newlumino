export type AiNotificationPersona = "coach" | "professor" | "zen" | "hacker";

export type AiNotificationCategory =
  | "study_nudge"
  | "milestone"
  | "retention_quiz"
  | "break_reminder"
  | "daily_goal";

export interface AiNotificationResult {
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  categoryBadge: string;
  actionLabel?: string;
  timestamp?: number;
}

export interface AiNotificationSettings {
  enabled: boolean;
  persona: AiNotificationPersona;
  studyNudges: boolean;
  milestones: boolean;
  soundHaptics: boolean;
}

const SETTINGS_KEY = "newlumino_ai_notification_settings";
const HISTORY_KEY = "newlumino_ai_notification_history";

export const DEFAULT_AI_NOTIFICATION_SETTINGS: AiNotificationSettings = {
  enabled: true,
  persona: "coach",
  studyNudges: true,
  milestones: true,
  soundHaptics: true,
};

export function loadAiNotificationSettings(): AiNotificationSettings {
  if (typeof window === "undefined") return DEFAULT_AI_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_AI_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_NOTIFICATION_SETTINGS;
  }
}

export function saveAiNotificationSettings(settings: AiNotificationSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function loadNotificationHistory(): AiNotificationResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordNotificationHistory(notif: AiNotificationResult) {
  if (typeof window === "undefined") return;
  try {
    const current = loadNotificationHistory();
    const updated = [{ ...notif, timestamp: Date.now() }, ...current].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearNotificationHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}

/**
 * Calls the server-side Gemini AI notification synthesizer.
 */
export async function generateAiNotification(options: {
  persona?: AiNotificationPersona;
  category?: AiNotificationCategory;
  context?: {
    noteTitle?: string;
    activeCourseName?: string;
    focusMinutes?: number;
    dailyGoalHours?: number;
    coursesCount?: number;
    notesCount?: number;
  };
}): Promise<AiNotificationResult> {
  const { persona = "coach", category = "study_nudge", context = {} } = options;

  try {
    const res = await fetch("/api/ai/notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona, category, context }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.notification) {
      recordNotificationHistory(data.notification);
      return data.notification;
    }
  } catch (err) {
    console.warn("AI notification request failed, using local synthesizer:", err);
  }

  // Graceful local fallback
  const localFallback: AiNotificationResult = {
    title: persona === "zen" ? "🧘 Mindful Breath" : "⚡ Active Recall Prompt",
    message: "Test your recall: explain one core mechanism aloud before reading your notes!",
    type: "info",
    categoryBadge: "Active Recall",
    timestamp: Date.now(),
  };

  recordNotificationHistory(localFallback);
  return localFallback;
}
