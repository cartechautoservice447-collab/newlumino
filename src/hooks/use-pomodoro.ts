import { useState, useEffect, useRef, useCallback } from "react";
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

export function usePomodoroTimer(
  activeContext?: {
    activeNoteId?: string | null;
    activeNoteTitle?: string;
    activeCourseName?: string;
  },
  options?: { mobileOptimized?: boolean },
) {
  const mobileOptimized = options?.mobileOptimized === true;
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
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const timerEndAtRef = useRef<number | null>(null);
  const updateTimerEndAt = useCallback(
    (endAt: number | null) => {
      if (!mobileOptimized) return;
      timerEndAtRef.current = endAt;
      setTimerEndAt(endAt);
    },
    [mobileOptimized],
  );

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

  // Save today's seconds
  useEffect(() => {
    try {
      localStorage.setItem(
        TODAY_SECONDS_KEY,
        JSON.stringify({ date: getTodayKey(), seconds: todayFocusSeconds })
      );
    } catch {
      // ignore
    }
  }, [todayFocusSeconds]);

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

  // Persist analytics
  useEffect(() => {
    try {
      localStorage.setItem(
        ANALYTICS_STORAGE_KEY,
        JSON.stringify({ notes: noteTimeSpent, history: sessionHistory })
      );
    } catch {
      // ignore
    }
  }, [noteTimeSpent, sessionHistory]);

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
      if (mobileOptimized) {
        updateTimerEndAt(null);
      }
    }
  }, [settings, mode, isRunning, mobileOptimized, updateTimerEndAt]);

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

  // Timer Tick & Live Note + Daily Goal Monitoring
  useEffect(() => {
    if (!isRunning) return;

    if (mobileOptimized) {
      let timer: NodeJS.Timeout | null = null;
      let analyticsLastAt = Date.now();

      const flushAnalytics = (now: number, force = false) => {
        if (mode !== "focus") {
          analyticsLastAt = now;
          return;
        }

        const elapsedSeconds = Math.max(0, Math.floor((now - analyticsLastAt) / 1000));
        if (!force && elapsedSeconds < 5) return;
        if (elapsedSeconds <= 0) return;

        analyticsLastAt += elapsedSeconds * 1000;
        setTodayFocusSeconds((value) => value + elapsedSeconds);

        if (activeContext?.activeNoteId) {
          const nId = activeContext.activeNoteId;
          const nTitle = activeContext.activeNoteTitle || "Untitled Note";
          const cName = activeContext.activeCourseName || "General Study";

          setNoteTimeSpent((prev) => {
            const current = prev[nId] || {
              noteId: nId,
              noteTitle: nTitle,
              courseName: cName,
              seconds: 0,
              lastStudied: now,
            };
            return {
              ...prev,
              [nId]: {
                ...current,
                noteTitle: nTitle,
                courseName: cName,
                seconds: current.seconds + elapsedSeconds,
                lastStudied: now,
              },
            };
          });
        }
      };

      timer = setInterval(() => {
        const endAt = timerEndAtRef.current;
        if (!endAt) return;

        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
        flushAnalytics(now);

        if (remaining > 0) return;

        flushAnalytics(now, true);
        soundscapeEngine.stop();
        soundscapeEngine.playChime();

        if (mode === "focus") {
          setCompletedSessions((count) => count + 1);
          setSessionCompletedSignal({ id: Date.now(), timestamp: Date.now() });

          const record: PomodoroSessionRecord = {
            id: "sess-" + Date.now(),
            timestamp: Date.now(),
            courseName: activeContext?.activeCourseName || "General Study",
            noteTitle: activeContext?.activeNoteTitle || "Workspace Study",
            durationMinutes: settings.focusMinutes,
            efficiencyScore: activePlan ? activePlan.efficiencyScore : 95,
            intervalsCompleted: completedSessions + 1,
          };
          setSessionHistory((prev) => [record, ...prev.slice(0, 49)]);

          const nextEndAt = Date.now() + settings.shortBreakMinutes * 60 * 1000;
          updateTimerEndAt(nextEndAt);
          setMode("shortBreak");
          setTimeLeft(settings.shortBreakMinutes * 60);
        } else {
          const nextEndAt = Date.now() + settings.focusMinutes * 60 * 1000;
          updateTimerEndAt(nextEndAt);
          setMode("focus");
          setTimeLeft(settings.focusMinutes * 60);
        }
      }, 500);

      return () => {
        if (timer) clearInterval(timer);
      };
    }

    const timer: NodeJS.Timeout = setInterval(() => {
      if (mode === "focus") {
        setTodayFocusSeconds((value) => value + 1);

        if (activeContext?.activeNoteId) {
          const nId = activeContext.activeNoteId;
          const nTitle = activeContext.activeNoteTitle || "Untitled Note";
          const cName = activeContext.activeCourseName || "General Study";

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

          if (mode === "focus") {
            setCompletedSessions((count) => count + 1);
            setSessionCompletedSignal({ id: Date.now(), timestamp: Date.now() });

            const record: PomodoroSessionRecord = {
              id: "sess-" + Date.now(),
              timestamp: Date.now(),
              courseName: activeContext?.activeCourseName || "General Study",
              noteTitle: activeContext?.activeNoteTitle || "Workspace Study",
              durationMinutes: settings.focusMinutes,
              efficiencyScore: activePlan ? activePlan.efficiencyScore : 95,
              intervalsCompleted: completedSessions + 1,
            };
            setSessionHistory((prev) => [record, ...prev.slice(0, 49)]);

            const nextEndAt = Date.now() + settings.shortBreakMinutes * 60 * 1000;
            updateTimerEndAt(nextEndAt);
            setMode("shortBreak");
            return settings.shortBreakMinutes * 60;
          }

          const nextEndAt = Date.now() + settings.focusMinutes * 60 * 1000;
          updateTimerEndAt(nextEndAt);
          setMode("focus");
          return settings.focusMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, mode, settings, activeContext, completedSessions, activePlan, mobileOptimized, updateTimerEndAt]);

  const togglePlay = useCallback(() => {
    const next = !isRunning;
    setIsRunning(next);

    if (next) {
      setMiniPillDismissed(false);
      if (mobileOptimized) {
        const endAt = Date.now() + Math.max(0, timeLeft) * 1000;
        updateTimerEndAt(endAt);
      }
      return;
    }

    if (mobileOptimized) {
      const remaining = timerEndAtRef.current
        ? Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000))
        : timeLeft;
      setTimeLeft(remaining);
      updateTimerEndAt(null);
    }
  }, [isRunning, mobileOptimized, timeLeft, updateTimerEndAt]);

  const addTime = useCallback((seconds = 300) => {
    const maxDuration =
      (mode === "focus"
        ? settings.focusMinutes
        : mode === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes) * 60;
    const extra = Math.max(0, seconds);

    if (mobileOptimized && isRunning && timerEndAtRef.current) {
      const current = Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000));
      const next = Math.min(maxDuration, current + extra);
      const endAt = Date.now() + next * 1000;
      updateTimerEndAt(endAt);
      setTimeLeft(next);
      return;
    }

    setTimeLeft((prev) => Math.min(maxDuration, prev + extra));
  }, [isRunning, mobileOptimized, mode, settings, updateTimerEndAt]);

  const skipTime = useCallback((seconds = 300) => {
    const amount = Math.max(0, seconds);

    if (mobileOptimized && isRunning && timerEndAtRef.current) {
      const current = Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000));
      const next = Math.max(0, current - amount);
      const endAt = Date.now() + next * 1000;
      updateTimerEndAt(endAt);
      setTimeLeft(next);
      return;
    }

    setTimeLeft((prev) => Math.max(0, prev - amount));
  }, [isRunning, mobileOptimized, updateTimerEndAt]);

  const completeSession = useCallback(() => {
    updateTimerEndAt(null);
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
    updateTimerEndAt,
  ]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    updateTimerEndAt(null);
    soundscapeEngine.stop();
    const mins =
      mode === "focus"
        ? settings.focusMinutes
        : mode === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
    setTimeLeft(mins * 60);
  }, [mode, settings, updateTimerEndAt]);

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
      updateTimerEndAt(null);
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
    [settings, updateTimerEndAt]
  );

  const setPreset = useCallback((focus: number, sBreak: number) => {
    updateTimerEndAt(null);
    setSettings((prev) => ({
      ...prev,
      focusMinutes: focus,
      shortBreakMinutes: sBreak,
    }));
    setIsRunning(false);
    soundscapeEngine.stop();
    setMode("focus");
    setTimeLeft(focus * 60);
  }, [updateTimerEndAt]);

  const applyAIPlan = useCallback((plan: PomodoroPlanResult) => {
    const endAt = Date.now() + plan.recommendedFocusMinutes * 60 * 1000;
    updateTimerEndAt(endAt);
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
  }, [updateTimerEndAt]);

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
    soundscape,
    soundVolume,
    completedSessions,
    sessionCompletedSignal,
    clearSessionCompletedSignal: () => setSessionCompletedSignal(null),
    miniPillDismissed,
    setMiniPillDismissed,
    timerEndAt,
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
