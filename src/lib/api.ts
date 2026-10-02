const PRODUCTION_API_BASE = "https://newlumino.vercel.app";

function isNativeAppWebView(): boolean {
  if (typeof window === "undefined") return false;
  const protocol = window.location.protocol;
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return protocol === "capacitor:" || protocol === "ionic:" || /Capacitor/i.test(userAgent);
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (isNativeAppWebView()) {
    return `${PRODUCTION_API_BASE}${normalized}`;
  }
  return normalized;
}

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
