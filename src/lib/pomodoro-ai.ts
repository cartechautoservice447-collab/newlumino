export type PomodoroDifficulty = "high_code" | "conceptual" | "revision" | "problem_solving";
export type PomodoroRhythm = "ai_adaptive" | "deep_50_10" | "classic_25_5" | "ultradian_90_20" | "sprint_15_3";
export type PomodoroBreakPref = "adaptive" | "short_5m" | "standard_10m" | "long_15m";

export interface PomodoroPlanRequest {
  targetHours: number;
  courseName: string;
  breakPreference: PomodoroBreakPref;
  difficulty: PomodoroDifficulty;
  sessionGoal: string;
  rhythm: PomodoroRhythm;
  noteTitle?: string;
  noteSnippet?: string;
}

export interface PomodoroPlanResult {
  success: boolean;
  planSummary: string;
  recommendedFocusMinutes: number;
  recommendedBreakMinutes: number;
  cyclesCount: number;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  milestones: string[];
  cognitivePacingAdvice: string;
  efficiencyScore: number;
  fallback?: boolean;
}

export interface NoteTimeEntry {
  noteId: string;
  noteTitle: string;
  courseName: string;
  seconds: number;
  lastStudied: number;
}

export interface PomodoroSessionRecord {
  id: string;
  timestamp: number;
  courseName: string;
  noteTitle: string;
  durationMinutes: number;
  efficiencyScore: number;
  intervalsCompleted: number;
}

import { fetchApi } from "@/lib/api";

export async function requestAIPomodoroPlan(
  req: PomodoroPlanRequest
): Promise<PomodoroPlanResult> {
  try {
    const res = await fetchApi("/api/ai/pomodoro-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return data as PomodoroPlanResult;
      }
    }
  } catch (_err) {
    // Graceful client fallback below
  }

  // Client-side fallback generator for instant resilience
  const totalTargetMinutes = Math.round(Math.max(0.25, Math.min(Number(req.targetHours) || 2, 8)) * 60);
  let focusMin = 25;
  let breakMin = 5;

  if (req.rhythm === "deep_50_10" || (req.rhythm === "ai_adaptive" && req.difficulty === "high_code")) {
    focusMin = 50;
    breakMin = 10;
  } else if (req.rhythm === "ultradian_90_20") {
    focusMin = 90;
    breakMin = 20;
  } else if (req.rhythm === "sprint_15_3") {
    focusMin = 15;
    breakMin = 3;
  } else {
    focusMin = 25;
    breakMin = req.breakPreference === "long_15m" ? 15 : req.breakPreference === "standard_10m" ? 10 : 5;
  }

  const cycleLength = focusMin + breakMin;
  const cyclesCount = Math.max(1, Math.round(totalTargetMinutes / cycleLength));
  const calculatedTotalWork = cyclesCount * focusMin;
  const calculatedTotalBreak = Math.max(0, cyclesCount - 1) * breakMin;

  const milestones: string[] = [];
  for (let i = 1; i <= cyclesCount; i++) {
    if (i === 1) {
      milestones.push(`Cycle 1: Core reading, syntax breakdown & note outlining for ${req.courseName}`);
    } else if (i === cyclesCount) {
      milestones.push(`Cycle ${i}: Final review, consolidation & summary`);
    } else if (i === 2) {
      milestones.push(`Cycle 2: Deep problem solving, practice implementation & edge cases`);
    } else {
      milestones.push(`Cycle ${i}: Concept refinement and targeted code verification`);
    }
  }

  return {
    success: true,
    planSummary: `Optimized ${cyclesCount}-cycle (${focusMin}m focus / ${breakMin}m break) plan for ${req.courseName} across ${req.targetHours}h.`,
    recommendedFocusMinutes: focusMin,
    recommendedBreakMinutes: breakMin,
    cyclesCount,
    totalWorkMinutes: calculatedTotalWork,
    totalBreakMinutes: calculatedTotalBreak,
    milestones,
    cognitivePacingAdvice: `Keep hydration near, take screen-off breaks during the ${breakMin}m intervals, and consolidate key takeaways before continuing.`,
    efficiencyScore: 94,
    fallback: true,
  };
}
