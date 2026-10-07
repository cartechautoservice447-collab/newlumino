import { useState, useEffect, useRef, useCallback } from "react";
import type { NoteTimeEntry, PomodoroSessionRecord, PomodoroPlanResult } from "@/lib/pomodoro-ai";

export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

const STORAGE_KEY = "glass-notes:pomodoro:v1";
const ANALYTICS_STORAGE_KEY = "glass-notes:pomodoro:analytics:v1";
const DAILY_GOAL_KEY = "glass-notes:daily-goal:hours:v1";
const TODAY_SECONDS_KEY = "glass-notes:daily-goal:today:v1";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function usePomodoroTimer(activeContext?: {
  activeNoteId?: string | null;
  activeNoteTitle?: string;
  activeCourseName?: string;
}) {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    const fallback: PomodoroSettings = { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved) as Partial<PomodoroSettings> | null;
      if (!parsed || typeof parsed !== "object") return fallback;

      const normalizeMinutes = (value: unknown, defaultValue: number) => {
        const minutes = Number(value);
        return Number.isFinite(minutes)
          ? Math.max(1, Math.min(180, Math.round(minutes)))
          : defaultValue;
      };

      return {
        focusMinutes: normalizeMinutes(parsed.focusMinutes, fallback.focusMinutes),
        shortBreakMinutes: normalizeMinutes(parsed.shortBreakMinutes, fallback.shortBreakMinutes),
        longBreakMinutes: normalizeMinutes(parsed.longBreakMinutes, fallback.longBreakMinutes),
      };
    } catch {
      return fallback;
    }
  });

  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [timeLeft, setTimeLeft] = useState<number>(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [sessionCompletedSignal, setSessionCompletedSignal] = useState<{ id: number; timestamp: number } | null>(null);
  const [miniPillDismissed, setMiniPillDismissed] = useState<boolean>(false);

  // Daily Study Goal in Hours
  const [dailyGoalHours, setDailyGoalHoursState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(DAILY_GOAL_KEY);
      if (saved) return Number(saved) || 2.0;
    } catch {
      // ignore
    }
    return 2.0;
  });

  // Track today's focus seconds
  const [todayFocusSeconds, setTodayFocusSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(TODAY_SECONDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === getTodayKey()) {
          return Number(parsed.seconds) || 0;
        }
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const setDailyGoalHours = useCallback((hrs: number) => {
    const val = Math.max(0.5, Math.min(12, hrs));
    setDailyGoalHoursState(val);
    try {
      localStorage.setItem(DAILY_GOAL_KEY, String(val));
    } catch {
      // ignore
    }
  }, []);

  const activeContextRef = useRef(activeContext);
  activeContextRef.current = activeContext;

  // Throttled persistence helper for today's focus seconds
  const lastSavedSecondsRef = useRef(todayFocusSeconds);
  const saveTodaySeconds = useCallback((seconds: number) => {
    try {
      localStorage.setItem(
        TODAY_SECONDS_KEY,
        JSON.stringify({ date: getTodayKey(), seconds })
      );
      lastSavedSecondsRef.current = seconds;
    } catch {
      // ignore
    }
  }, []);

  // Flush today seconds on unmount or pause
  useEffect(() => {
    if (!isRunning && todayFocusSeconds !== lastSavedSecondsRef.current) {
      saveTodaySeconds(todayFocusSeconds);
    }
  }, [isRunning, todayFocusSeconds, saveTodaySeconds]);

  // Active AI Plan (if scheduled)
  const [activePlan, setActivePlan] = useState<PomodoroPlanResult | null>(null);
  const activePlanRef = useRef(activePlan);
  activePlanRef.current = activePlan;

  // Note-by-note and Overall App Time Tracking
  const [noteTimeSpent, setNoteTimeSpent] = useState<Record<string, NoteTimeEntry>>(() => {
    try {
      const saved = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.notes || {};
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [sessionHistory, setSessionHistory] = useState<PomodoroSessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.history || [];
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Throttled save for analytics
  const saveAnalytics = useCallback((notes: Record<string, NoteTimeEntry>, history: PomodoroSessionRecord[]) => {
    try {
      localStorage.setItem(
        ANALYTICS_STORAGE_KEY,
        JSON.stringify({ notes, history })
      );
    } catch {
      // ignore
    }
  }, []);

  // Accumulator for note seconds to avoid state churn every 1s
  const noteAccumulatorRef = useRef<{ id: string; title: string; course: string; seconds: number } | null>(null);

  const flushNoteAccumulator = useCallback(() => {
    const acc = noteAccumulatorRef.current;
    if (!acc || acc.seconds <= 0) return;
    const { id, title, course, seconds } = acc;
    acc.seconds = 0;
    setNoteTimeSpent((prev) => {
      const current = prev[id] || {
        noteId: id,
        noteTitle: title,
        courseName: course,
        seconds: 0,
        lastStudied: Date.now(),
      };
      const updated = {
        ...prev,
        [id]: {
          ...current,
          noteTitle: title,
          courseName: course,
          seconds: current.seconds + seconds,
          lastStudied: Date.now(),
        },
      };
      saveAnalytics(updated, sessionHistory);
      return updated;
    });
  }, [saveAnalytics, sessionHistory]);

  // Flush when pausing or switching modes
  useEffect(() => {
    if (!isRunning) {
      flushNoteAccumulator();
    }
  }, [isRunning, flushNoteAccumulator]);

  // Sync timeLeft when duration settings change if timer is not active
  useEffect(() => {
    if (!isRunning) {
      const mins =
        mode === "focus"
          ? settings.focusMinutes
          : mode === "shortBreak"
          ? settings.shortBreakMinutes
          : settings.longBreakMinutes;
      setTimeLeft(mins * 60);
    }
  }, [settings, mode, isRunning]);

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Timer Tick & Live Note + Daily Goal Monitoring
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let ticks = 0;

    if (isRunning) {
      timer = setInterval(() => {
        ticks++;
        // Track time on active note and daily goal during focus
        if (mode === "focus") {
          setTodayFocusSeconds((s) => {
            const next = s + 1;
            if (ticks % 10 === 0) {
              saveTodaySeconds(next);
            }
            return next;
          });

          const currentCtx = activeContextRef.current;
          if (currentCtx?.activeNoteId) {
            const nId = currentCtx.activeNoteId;
            const nTitle = currentCtx.activeNoteTitle || "Untitled Note";
            const cName = currentCtx.activeCourseName || "General Study";

            if (!noteAccumulatorRef.current || noteAccumulatorRef.current.id !== nId) {
              flushNoteAccumulator();
              noteAccumulatorRef.current = { id: nId, title: nTitle, course: cName, seconds: 1 };
            } else {
              noteAccumulatorRef.current.seconds += 1;
            }

            if (ticks % 10 === 0) {
              flushNoteAccumulator();
            }
          }
        }

        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer Finished
            flushNoteAccumulator();

            if (mode === "focus") {
              setCompletedSessions((c) => {
                const nextSessionCount = c + 1;
                const currentCtx = activeContextRef.current;
                const currentPlan = activePlanRef.current;

                // Record Session History
                const record: PomodoroSessionRecord = {
                  id: `sess-${Date.now()}`,
                  timestamp: Date.now(),
                  courseName: currentCtx?.activeCourseName || "General Study",
                  noteTitle: currentCtx?.activeNoteTitle || "Workspace Study",
                  durationMinutes: settings.focusMinutes,
                  efficiencyScore: currentPlan ? currentPlan.efficiencyScore : 95,
                  intervalsCompleted: nextSessionCount,
                };
                setSessionHistory((prevHistory) => {
                  const updatedHistory = [record, ...prevHistory.slice(0, 49)];
                  saveAnalytics(noteTimeSpent, updatedHistory);
                  return updatedHistory;
                });

                return nextSessionCount;
              });

              setSessionCompletedSignal({ id: Date.now(), timestamp: Date.now() });
              setMode("shortBreak");
              return settings.shortBreakMinutes * 60;
            } else {
              setMode("focus");
              return settings.focusMinutes * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, mode, settings, saveTodaySeconds, flushNoteAccumulator, saveAnalytics, noteTimeSpent]);

  const togglePlay = useCallback(() => {
    setIsRunning((r) => {
      const next = !r;
      if (next) setMiniPillDismissed(false);
      return next;
    });
  }, []);

  const addTime = useCallback((seconds = 300) => {
    const maxDuration =
      (mode === "focus"
        ? settings.focusMinutes
        : mode === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes) * 60;
    setTimeLeft((prev) => Math.min(maxDuration, prev + Math.max(0, seconds)));
  }, [mode, settings]);

  const skipTime = useCallback((seconds = 300) => {
    setTimeLeft((prev) => Math.max(0, prev - Math.max(0, seconds)));
  }, []);

  const completeSession = useCallback(() => {
    if (mode === "focus") {
      const durationMinutes =
        settings.focusMinutes;
      setIsRunning(false);
      setCompletedSessions((count) => count + 1);
      setSessionCompletedSignal({ id: Date.now(), timestamp: Date.now() });

      const record: PomodoroSessionRecord = {
        id: "sess-" + Date.now(),
        timestamp: Date.now(),
        courseName: activeContext?.activeCourseName || "General Study",
        noteTitle: activeContext?.activeNoteTitle || "Workspace Study",
        durationMinutes,
        efficiencyScore: activePlan ? activePlan.efficiencyScore : 95,
        intervalsCompleted: completedSessions + 1,
      };

      setSessionHistory((prev) => [record, ...prev.slice(0, 49)]);
      setMode("shortBreak");
      setTimeLeft(settings.shortBreakMinutes * 60);
      return;
    }

    setIsRunning(false);
    setMode("focus");
    setTimeLeft(settings.focusMinutes * 60);
  }, [
    activeContext,
    activePlan,
    completedSessions,
    mode,
    settings.focusMinutes,
    settings.shortBreakMinutes,
  ]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    const mins =
      mode === "focus"
        ? settings.focusMinutes
        : mode === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
    setTimeLeft(mins * 60);
  }, [mode, settings]);

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
      setMode(newMode);
      const mins =
        newMode === "focus"
          ? settings.focusMinutes
          : newMode === "shortBreak"
          ? settings.shortBreakMinutes
          : settings.longBreakMinutes;
      setTimeLeft(mins * 60);
    },
    [settings]
  );

  const setPreset = useCallback((focus: number, sBreak: number) => {
    setSettings((prev) => ({
      ...prev,
      focusMinutes: focus,
      shortBreakMinutes: sBreak,
    }));
    setIsRunning(false);
    setMode("focus");
    setTimeLeft(focus * 60);
  }, []);

  const applyAIPlan = useCallback((plan: PomodoroPlanResult) => {
    setActivePlan(plan);
    setSettings((prev) => ({
      ...prev,
      focusMinutes: plan.recommendedFocusMinutes,
      shortBreakMinutes: plan.recommendedBreakMinutes,
    }));
    setMode("focus");
    setTimeLeft(plan.recommendedFocusMinutes * 60);
    setIsRunning(true);
    setMiniPillDismissed(false);
  }, []);

  const totalDuration =
    (mode === "focus"
      ? settings.focusMinutes
      : mode === "shortBreak"
      ? settings.shortBreakMinutes
      : settings.longBreakMinutes) * 60;

  // Calculate total tracked study minutes across all notes
  const totalTrackedSeconds = Object.values(noteTimeSpent).reduce((acc, curr) => acc + curr.seconds, 0);

  return {
    mode,
    timeLeft,
    totalDuration,
    isRunning,
    settings,
    completedSessions,
    sessionCompletedSignal,
    clearSessionCompletedSignal: () => setSessionCompletedSignal(null),
    miniPillDismissed,
    setMiniPillDismissed,
    togglePlay,
    addTime,
    skipTime,
    completeSession,
    resetTimer,
    switchMode,
    setPreset,
    activePlan,
    applyAIPlan,
    noteTimeSpent,
    sessionHistory,
    totalTrackedSeconds,
    dailyGoalHours,
    setDailyGoalHours,
    todayFocusSeconds,
    clearAnalytics: () => {
      setNoteTimeSpent({});
      setSessionHistory([]);
      try {
        localStorage.removeItem(ANALYTICS_STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  };
}

export type PomodoroState = ReturnType<typeof usePomodoroTimer>;
