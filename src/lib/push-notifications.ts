/**
 * Native Push & Local System Notifications Service for NewLumino
 * Supports Web Notifications API, Service Worker Background Notifications,
 * Vibrations, Actions, and Scheduled Active-Recall & Pomodoro Pushes.
 */

export type PushPermissionStatus = "granted" | "denied" | "default" | "unsupported";

export interface ScheduledPushAlert {
  id: string;
  title: string;
  body: string;
  scheduledTime: number; // timestamp
  category: "pomodoro" | "spaced_repetition" | "daily_streak" | "exam_prep";
  actionUrl?: string;
  tag?: string;
}

const SCHEDULED_PUSHES_KEY = "newlumino_scheduled_pushes";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

export function getPushPermission(): PushPermissionStatus {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermissionStatus;
}

/**
 * Request native system notification permissions
 */
export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    return permission as PushPermissionStatus;
  } catch (err) {
    console.warn("[Push] Error requesting notification permission:", err);
    return Notification.permission as PushPermissionStatus;
  }
}

/**
 * Dispatch a native system push notification.
 * Uses ServiceWorkerRegistration.showNotification when active (allows persistent, system-level native tray alerts),
 * and falls back to standard new Notification().
 */
export async function sendNativeNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    vibrate?: number[];
    silent?: boolean;
    actions?: Array<{ action: string; title: string; icon?: string }>;
  }
): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn("[Push] Notifications are not supported in this browser/environment.");
    return false;
  }

  if (Notification.permission !== "granted") {
    const perm = await requestPushPermission();
    if (perm !== "granted") {
      console.warn("[Push] User denied or dismissed notification permissions.");
      return false;
    }
  }

  const notificationOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || "/pwa-192x192.png",
    badge: options.badge || "/pwa-192x192.png",
    tag: options.tag || "newlumino-" + Date.now(),
    data: options.data || { url: window.location.origin },
    silent: options.silent ?? false,
    ...((options.vibrate && "vibrate" in Notification.prototype) ? { vibrate: options.vibrate } : {}),
    ...((options.actions && "actions" in Notification.prototype) ? { actions: options.actions } : {}),
  };

  try {
    // Attempt ServiceWorkerRegistration.showNotification first for true native OS integration
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === "function") {
          await registration.showNotification(title, notificationOptions);
          return true;
        }
      } catch (swErr) {
        console.warn("[Push] SW showNotification failed, using fallback:", swErr);
      }
    }

    // Direct Notification constructor fallback
    const nativeNotif = new Notification(title, notificationOptions);
    nativeNotif.onclick = () => {
      window.focus();
      nativeNotif.close();
    };

    return true;
  } catch (error) {
    console.error("[Push] Failed to show native notification:", error);
    return false;
  }
}

/**
 * Trigger an instant test push notification to verify OS-level alerting
 */
export async function triggerTestPushNotification(): Promise<boolean> {
  return sendNativeNotification("🔔 NewLumino Native Push Connected", {
    body: "Liquid Glass Study Studio native notifications are configured and active on this device!",
    icon: "/pwa-192x192.png",
    tag: "test-push",
    vibrate: [100, 50, 100],
  });
}

/**
 * Dispatch Pomodoro session alert to device system tray
 */
export async function notifyPomodoroPhaseChange(
  phase: "work" | "shortBreak" | "longBreak",
  nextMinutes: number
): Promise<boolean> {
  const titles = {
    work: "🧠 Deep Focus Session Started",
    shortBreak: "☕ Time for a Quick Break!",
    longBreak: "🧘 Restorative Long Break",
  };

  const bodies = {
    work: `Stay in the flow for ${nextMinutes} minutes. Distractions locked out.`,
    shortBreak: `Great session! Step away from the screen for ${nextMinutes} minutes.`,
    longBreak: `Incredible momentum! Recharge your mind for ${nextMinutes} minutes.`,
  };

  return sendNativeNotification(titles[phase] || "Pomodoro Alert", {
    body: bodies[phase] || "Focus timer update",
    tag: "pomodoro-phase",
    vibrate: [200, 100, 200],
  });
}

/**
 * Schedule or simulate an active recall spaced-repetition alert
 */
export function scheduleActiveRecallAlert(
  noteTitle: string,
  delaySeconds: number = 30
): ScheduledPushAlert {
  const alert: ScheduledPushAlert = {
    id: "ar-" + Date.now(),
    title: `⚡ Spaced Repetition: "${noteTitle}"`,
    body: "Your retention interval has peaked. Take 60 seconds to review your flashcards!",
    scheduledTime: Date.now() + delaySeconds * 1000,
    category: "spaced_repetition",
    tag: "spaced-rep-" + noteTitle.slice(0, 10),
  };

  // Save to stored schedules
  const existing = loadScheduledPushes();
  saveScheduledPushes([...existing, alert]);

  // Set in-browser timeout if window stays open
  if (typeof window !== "undefined") {
    setTimeout(() => {
      sendNativeNotification(alert.title, {
        body: alert.body,
        tag: alert.tag,
        vibrate: [150, 80, 150],
      });
      // Remove from schedule
      removeScheduledPush(alert.id);
    }, delaySeconds * 1000);
  }

  return alert;
}

export function loadScheduledPushes(): ScheduledPushAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCHEDULED_PUSHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScheduledPushes(alerts: ScheduledPushAlert[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SCHEDULED_PUSHES_KEY, JSON.stringify(alerts));
  } catch {}
}

export function removeScheduledPush(id: string): void {
  const list = loadScheduledPushes();
  saveScheduledPushes(list.filter((item) => item.id !== id));
}
