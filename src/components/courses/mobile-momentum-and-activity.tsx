import { useMemo } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react";
import type { Course, Note } from "@/lib/notes";
import { cn } from "@/lib/utils";

type Props = {
  notes: Note[];
  courses: Course[];
  todayFocusSeconds?: number;
  dailyGoalHours?: number;
  onOpenNote?: (noteId: string, courseId?: string) => void;
  onOpenCourse?: (courseId: string) => void;
};

type Activity =
  | {
      id: string;
      kind: "note";
      timestamp: number;
      title: string;
      subtitle: string;
      noteId: string;
      courseId?: string | null;
    }
  | {
      id: string;
      kind: "course";
      timestamp: number;
      title: string;
      subtitle: string;
      courseId: string;
    };

function relativeTime(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function MobileMomentumAndActivity({
  notes,
  courses,
  todayFocusSeconds = 0,
  dailyGoalHours = 2,
  onOpenNote,
  onOpenCourse,
}: Props) {
  const todayStart = startOfToday();
  const todayFocusMinutes = Math.floor(todayFocusSeconds / 60);
  const goalMinutes = Math.max(1, Math.round(dailyGoalHours * 60));
  const focusProgress = Math.min(100, Math.round((todayFocusMinutes / goalMinutes) * 100));

  const todayNotes = useMemo(
    () => notes.filter((note) => note.updatedAt >= todayStart).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes, todayStart],
  );

  const activities = useMemo<Activity[]>(() => {
    const noteActivities: Activity[] = notes.map((note) => ({
      id: `note-${note.id}`,
      kind: "note",
      timestamp: note.updatedAt,
      title: note.title || "Untitled note",
      subtitle:
        (note.courseId ? courses.find((course) => course.id === note.courseId)?.name : null) ||
        "General notes",
      noteId: note.id,
      courseId: note.courseId,
    }));

    const courseActivities: Activity[] = courses.map((course) => ({
      id: `course-${course.id}`,
      kind: "course",
      timestamp: course.updatedAt || course.createdAt,
      title: course.name,
      subtitle: `${notes.filter((note) => note.courseId === course.id).length} saved ${notes.filter((note) => note.courseId === course.id).length === 1 ? "note" : "notes"}`,
      courseId: course.id,
    }));

    return [...noteActivities, ...courseActivities]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [courses, notes]);

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
      <section className="sm:hidden relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(26,34,51,.72),rgba(10,15,24,.9))] p-5 shadow-[0_16px_42px_-16px_rgba(0,0,0,.7)] backdrop-blur-[28px] mobile-momentum-breathe">
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

      {activities.length > 0 && (
        <section className="sm:hidden relative rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 shadow-[0_14px_36px_-18px_rgba(0,0,0,.65)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
                <Clock3 className="h-[17px] w-[17px]" />
              </span>
              <div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white">Recently Active</h2>
                <p className="text-[10px] text-slate-500">Latest saved updates</p>
              </div>
            </div>
            <BookOpen className="h-4 w-4 text-slate-600" />
          </div>

          <div className="mt-5 space-y-0">
            {activities.map((activity, index) => {
              const isNote = activity.kind === "note";
              const action = () => {
                if (isNote) onOpenNote?.(activity.noteId, activity.courseId || undefined);
                else onOpenCourse?.(activity.courseId);
              };

              return (
                <div
                  key={activity.id}
                  className="relative flex gap-3 pb-4 last:pb-0 mobile-activity-in"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  {index < activities.length - 1 && (
                    <span className="absolute left-[11px] top-7 bottom-0 w-px bg-gradient-to-b from-white/15 to-transparent" />
                  )}

                  <span className={cn(
                    "relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    isNote
                      ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-300"
                      : "border-violet-300/25 bg-violet-300/10 text-violet-300",
                  )}>
                    {isNote ? <FilePenLine className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                  </span>

                  <button
                    type="button"
                    onClick={action}
                    className="group min-w-0 flex-1 rounded-2xl border border-white/[0.055] bg-white/[0.025] px-3.5 py-3 text-left transition-all duration-200 hover:border-white/10 active:scale-[0.985]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-white group-active:text-emerald-200">
                          {isNote ? "Edited note" : "Updated course"}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] font-bold text-slate-200">{activity.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.09em] text-slate-500">
                          {activity.subtitle}
                        </p>
                      </div>
                      <span className="shrink-0 pt-0.5 text-[9px] font-mono text-slate-500">{relativeTime(activity.timestamp)}</span>
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300/80">
                      Open <ArrowRight className="h-2.5 w-2.5 transition-transform group-active:translate-x-0.5" />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
