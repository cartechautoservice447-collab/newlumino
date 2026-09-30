import { useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Tab = "login" | "signup";

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground/80">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-white/20 focus:outline-none"
      />
    </label>
  );
}

export function AuthModal({ onGuestAccess }: { onGuestAccess?: () => void }) {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      // In embedded iframe or web preview environments, signInWithOAuth redirect might be blocked
      // Use standard redirectTo with current origin and query parameters
      const redirectTo = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setError(error.message ?? "Google sign-in failed.");
        setBusy(false);
        return;
      }

      if (data?.url) {
        // Check if inside an iframe
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
          // Open in a new top-level tab/window or navigate top
          try {
            window.top!.location.href = data.url;
          } catch {
            window.open(data.url, "_blank");
          }
        } else {
          window.location.href = data.url;
        }
        return;
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in encountered an error. Please try guest mode or email login.");
    }
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (tab === "signup") {
      if (!username.trim()) {
        setError("Please choose a username.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      const res =
        tab === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { username: username.trim() },
                emailRedirectTo: window.location.origin,
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (res.error) {
        setError(res.error.message);
        setBusy(false);
        return;
      }
    } catch (err: any) {
      setError(err?.message || "Authentication service unavailable. You can continue as guest.");
    }
    setBusy(false);
  };

  return (
    <div className="app-backdrop relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <div className="grain-overlay pointer-events-none absolute inset-0" />
      <div className="glass-panel animate-panel-in relative w-full max-w-[390px] rounded-3xl border border-white/10 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-[0.68rem] uppercase tracking-[0.25em] text-primary font-medium">
            <Sparkles className="h-3 w-3" />
            Glass Workspace
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">NewLumino</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Liquid Glass notes &amp; course workspace synchronized with Fluid Glass Studio
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center">
          <p className="text-[0.72rem] text-emerald-300 font-medium leading-snug">
            Connected to shared Supabase backend: any course created here is visible in Fluid Glass Studio in real time.
          </p>
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-white/[0.1] active:scale-[0.99] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2H12Z" />
            <path fill="#34A853" d="M6.6 14.3 5.9 15l-2.5 2A9 9 0 0 0 12 21c2.4 0 4.5-.8 6-2.3l-3.2-2.5c-.8.6-1.9.9-2.8.9-2.3 0-4.3-1.5-5-3.6Z" />
            <path fill="#4A90E2" d="M3.4 7A9 9 0 0 0 3 12c0 1.8.4 3.5 1.2 5l3.4-2.7A5.4 5.4 0 0 1 7 12c0-.8.1-1.5.4-2.2L3.4 7Z" />
            <path fill="#FBBC05" d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 3.4 7l3.9 3c.8-2.1 2.7-3.4 4.7-3.4Z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-4 grid grid-cols-2 gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] p-1">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                tab === t ? "bg-white/[0.12] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === "signup" ? (
            <Field label="Username" type="text" value={username} onChange={setUsername} placeholder="glassuser" autoComplete="username" />
          ) : null}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
          />
          {tab === "signup" ? (
            <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/15 px-3 py-2 text-xs text-destructive-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <span className="text-red-300">{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tab === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        {onGuestAccess ? (
          <div className="mt-4 pt-3 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={onGuestAccess}
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Continue as Guest (Local Workspace)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
