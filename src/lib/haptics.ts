/**
 * Haptic feedback utility leveraging the Web Vibration API (navigator.vibrate).
 * Safely falls back to no-op on unsupported browsers and non-touch environments.
 */

export type HapticType = "selection" | "light" | "medium" | "heavy" | "success" | "warning" | "error";

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  selection: 8,
  light: 12,
  medium: 20,
  heavy: 32,
  success: [12, 40, 18],
  warning: [20, 50, 20],
  error: [30, 40, 30, 40, 40],
};

export function haptic(type: HapticType = "light"): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (typeof navigator.vibrate !== "function") {
    return false;
  }

  try {
    const pattern = HAPTIC_PATTERNS[type] ?? 12;
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Convenience helper for inline event handlers:
 * e.g. onClick={() => { triggerHaptic("light"); doSomething(); }}
 */
export const triggerHaptic = haptic;
