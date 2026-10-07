import React from "react";
import { cn } from "@/lib/utils";

interface RadialGoalChartProps {
  currentSeconds: number;
  goalHours: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showDetails?: boolean;
}

export function RadialGoalChart({
  currentSeconds,
  goalHours,
  size = 180,
  strokeWidth = 14,
  className,
  showDetails = true,
}: RadialGoalChartProps) {
  const goalSeconds = Math.max(60, goalHours * 3600);
  const currentHours = currentSeconds / 3600;
  const progressPct = Math.min(100, Math.round((currentSeconds / goalSeconds) * 100));
  const isGoalReached = currentSeconds >= goalSeconds;

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  // Remaining time calculation
  const remainingSeconds = Math.max(0, goalSeconds - currentSeconds);
  const remHours = Math.floor(remainingSeconds / 3600);
  const remMinutes = Math.floor((remainingSeconds % 3600) / 60);

  const formattedCurrent = currentHours >= 1
    ? `${currentHours.toFixed(1)}h`
    : `${Math.floor(currentSeconds / 60)}m`;

  return (
    <div className={cn("relative flex flex-col items-center justify-center select-none", className)}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90 transform"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="stroke-white/10"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Active Gradient / Glowing Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#goal-gradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />

          <defs>
            <linearGradient id="goal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center px-2">
          <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {progressPct}%
          </span>
          <span className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
            {formattedCurrent} / {goalHours}h
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 text-center">
          {isGoalReached ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 animate-pulse">
              🎉 Daily Study Goal Mastered!
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">
                {remHours > 0 ? `${remHours}h ${remMinutes}m` : `${remMinutes} mins`}
              </span>{" "}
              remaining to hit today's target
            </span>
          )}
        </div>
      )}
    </div>
  );
}
