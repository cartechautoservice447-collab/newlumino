import { useEffect, useState } from "react";

export function useLivePomodoroTime(
  endAt: number | null,
  isRunning: boolean,
  fallbackSeconds: number,
) {
  const [secondsLeft, setSecondsLeft] = useState(fallbackSeconds);

  useEffect(() => {
    if (!isRunning || !endAt) {
      setSecondsLeft(fallbackSeconds);
      return;
    }

    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endAt, isRunning, fallbackSeconds]);

  return secondsLeft;
}
