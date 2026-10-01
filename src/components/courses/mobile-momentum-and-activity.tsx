import { useMemo } from "react";
import {
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react";
import type { Note } from "@/lib/notes";

type Props = {
  notes: Note[];
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function MobileMomentumAndActivity({
  notes,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
}: Props) {
  const todayStart = startOfToday();
  const todayFocusMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.max(1, Math.round(dailyGoalHours * 60));
  const focusProgress = Math.min(100, Math.round((todayFocusMinutes / goalMinutes) * 100));

  const todayNotes = useMemo(
    () => notes.filter((note) => note.updatedAt >= todayStart).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes, todayStart],
  );


  const momentumMessage =
    focusProgress >= 100
      ? "Daily focus goal reached. Protect the momentum and finish strong."
      : todayFocusMinutes > 0 && todayNotes.length > 0
        ? `You logged ${todayFocusMinutes}m of focus and updated ${todayNotes.length} ${todayNotes.length === 1 ? "note" : "notes"} today.`
        : todayFocusMinutes > 0
          ? `You already have ${todayFocusMinutes}m in the bank. One more focused block keeps the streak moving.`
          : todayNotes.length > 0
            ? `Your library is active: ${todayNotes.length} ${todayNotes.length === 1 ? "note was" : "notes were"} updated today.`
            : "Your next focused block is the easiest way to create momentum today.";

  const momentumLabel =
    focusProgress >= 100 ? "Goal complete" : focusProgress >= 60 ? "Strong momentum" : focusProgress > 0 ? "Building momentum" : "Ready to begin";

  return (
    <>
      <section className="sm:hidden relative mt-2 mb-2 overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(26,34,51,.72),rgba(10,15,24,.9))] p-6 shadow-[0_16px_42px_-16px_rgba(0,0,0,.7)] backdrop-blur-[28px] mobile-momentum-breathe">
        <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/[0.09] to-transparent mobile-momentum-sheen" />
        <div className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-emerald-300/15 blur-3xl mobile-momentum-orb" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-300">
                <TrendingUp className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white">Today’s Momentum</h2>
                  <Waves className="h-3.5 w-3.5 text-cyan-300/80" />
                </div>
                <p className="text-[10px] text-slate-400">{momentumLabel}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
              {focusProgress}%
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-end gap-1.5">
                <span className="text-[30px] font-black leading-none text-white">{todayFocusMinutes}</span>
                <span className="pb-0.5 text-[11px] font-semibold text-slate-400">focus min</span>
              </div>
              <p className="mt-2 max-w-[250px] text-[11px] leading-relaxed text-slate-400">{momentumMessage}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/5">
                {focusProgress >= 100 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                ) : (
                  <Sparkles className="h-5 w-5 text-cyan-300 mobile-momentum-icon" />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-[width] duration-700 ease-out mobile-momentum-progress"
              style={{ width: `${focusProgress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <span>Today</span>
            <span>{todayFocusMinutes} / {goalMinutes} min</span>
          </div>
        </div>
      </section>

  );
}
