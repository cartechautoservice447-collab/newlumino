import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { soundscapeEngine, type SoundscapeType } from "@/lib/soundscapes";
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
  const [soundscape, setSoundscape] = useState<SoundscapeType>("rain");
  const [soundVolume, setSoundVolume] = useState<number>(0.4);
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

  // Active AI Plan (if scheduled)
  const [activePlan, setActivePlan] = useState<PomodoroPlanResult | null>(null);

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

  // Keep frequently-changing timer data in refs so the interval remains stable
  // while React state continues to drive the visible timer UI.
  const settingsRef = useRef(settings);
  const modeRef = useRef(mode);
  const activeContextRef = useRef(activeContext);
  const completedSessionsRef = useRef(completedSessions);
  const activePlanRef = useRef(activePlan);
  const todayFocusRef = useRef(todayFocusSeconds);
  const noteTimeSpentRef = useRef(noteTimeSpent);
  const sessionHistoryRef = useRef(sessionHistory);
  const runtimePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    modeRef.current = mode;
    activeContextRef.current = activeContext;
    completedSessionsRef.current = completedSessions;
    activePlanRef.current = activePlan;
    todayFocusRef.current = todayFocusSeconds;
    noteTimeSpentRef.current = noteTimeSpent;
    sessionHistoryRef.current = sessionHistory;
  }, [settings, mode, activeContext, completedSessions, activePlan, todayFocusSeconds, noteTimeSpent, sessionHistory]);

  const persistRuntimeData = useCallback(() => {
    try {
      localStorage.setItem(
        TODAY_SECONDS_KEY,
        JSON.stringify({ date: getTodayKey(), seconds: todayFocusRef.current }),
      );
      localStorage.setItem(
        ANALYTICS_STORAGE_KEY,
        JSON.stringify({
          notes: noteTimeSpentRef.current,
          history: sessionHistoryRef.current,
        }),
      );
    } catch {
      // ignore
    }
  }, []);

  const scheduleRuntimePersist = useCallback(() => {
    if (runtimePersistTimerRef.current) return;
    runtimePersistTimerRef.current = setTimeout(() => {
      persistRuntimeData();
      runtimePersistTimerRef.current = null;
    }, 2000);
  }, [persistRuntimeData]);

  // Persist continuously changing timer analytics at most once every 2s
  // instead of blocking the main thread on every one-second tick.
  useEffect(() => {
    scheduleRuntimePersist();
  }, [todayFocusSeconds, noteTimeSpent, sessionHistory, scheduleRuntimePersist]);

  useEffect(() => {
    const flush = () => {
      if (runtimePersistTimerRef.current) {
        clearTimeout(runtimePersistTimerRef.current);
        runtimePersistTimerRef.current = null;
      }
      persistRuntimeData();
    };
    window.addEventListener("pagehide", flush);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [persistRuntimeData]);



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

  // Audio engine handling
  useEffect(() => {
    if (isRunning && soundscape !== "none") {
      soundscapeEngine.play(soundscape, soundVolume);
    } else {
      soundscapeEngine.stop();
    }
  }, [isRunning, soundscape]);

  useEffect(() => {
    soundscapeEngine.setVolume(soundVolume);
  }, [soundVolume]);

  // Timer Tick & Live Note + Daily Goal Monitoring.
  // Keep a single interval while running and read changing values from refs;
  // this prevents tearing down/recreating the interval on every render.
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      const currentMode = modeRef.current;
      const currentSettings = settingsRef.current;
      const currentContext = activeContextRef.current;
      const currentPlan = activePlanRef.current;
      const currentCompletedSessions = completedSessionsRef.current;

      if (currentMode === "focus") {
        setTodayFocusSeconds((seconds) => seconds + 1);

        if (currentContext?.activeNoteId) {
          const nId = currentContext.activeNoteId;
          const nTitle = currentContext.activeNoteTitle || "Untitled Note";
          const cName = currentContext.activeCourseName || "General Study";

          setNoteTimeSpent((prev) => {
            const current = prev[nId] || {
              noteId: nId,
              noteTitle: nTitle,
              courseName: cName,
              seconds: 0,
              lastStudied: Date.now(),
            };
            return {
              ...prev,
              [nId]: {
                ...current,
                noteTitle: nTitle,
                courseName: cName,
                seconds: current.seconds + 1,
                lastStudied: Date.now(),
              },
            };
          });
        }
      }

      setTimeLeft((prev) => {
        if (prev <= 1) {
          soundscapeEngine.stop();
          soundscapeEngine.playChime();

          if (currentMode === "focus") {
            const nextCompletedSessions = currentCompletedSessions + 1;
            setCompletedSessions(nextCompletedSessions);
            completedSessionsRef.current = nextCompletedSessions;
            setSessionCompletedSignal({ id: Date.now(), timestamp: Date.now() });


            const record: PomodoroSessionRecord = {
              id: `sess-${Date.now()}`,
              timestamp: Date.now(),
              courseName: currentContext?.activeCourseName || "General Study",
              noteTitle: currentContext?.activeNoteTitle || "Workspace Study",
              durationMinutes: currentSettings.focusMinutes,
              efficiencyScore: currentPlan ? currentPlan.efficiencyScore : 95,
              intervalsCompleted: nextCompletedSessions,
            };
            setSessionHistory((history) => [record, ...history.slice(0, 49)]);

            setMode("shortBreak");
            modeRef.current = "shortBreak";
            return currentSettings.shortBreakMinutes * 60;
          }

          setMode("focus");
          modeRef.current = "focus";
          return currentSettings.focusMinutes * 60;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);


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
    soundscapeEngine.stop();
    soundscapeEngine.playChime();

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
    soundscapeEngine.stop();
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
      soundscapeEngine.stop();
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
    soundscapeEngine.stop();
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

  // Calculate total tracked study minutes only when analytics data changes.
  const totalTrackedSeconds = useMemo(
    () => Object.values(noteTimeSpent).reduce((acc, curr) => acc + curr.seconds, 0),
    [noteTimeSpent],
  );

  return {
    mode,
    timeLeft,
    totalDuration,
    isRunning,
    settings,
    soundscape,
    soundVolume,
    completedSessions,
    sessionCompletedSignal,
    clearSessionCompletedSignal: () => setSessionCompletedSignal(null),
    miniPillDismissed,
    setMiniPillDismissed,
    setSoundscape,
    setSoundVolume,
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
