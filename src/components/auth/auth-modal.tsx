import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
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

export function AuthModal() {
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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    const result = { error, redirected: Boolean(data?.url) };
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
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
    setBusy(false);
  };

  return (
    <div className="app-backdrop relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <div className="grain-overlay pointer-events-none absolute inset-0" />
      <div className="glass-panel animate-panel-in relative w-full max-w-[380px] rounded-2xl border border-white/10 p-6">
        <div className="text-center">
          <p className="text-[0.68rem] uppercase tracking-[0.3em] text-muted-foreground/70">Glass</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">Notes</h1>
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.1] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2H12Z" />
            <path fill="#34A853" d="M6.6 14.3 5.9 15l-2.5 2A9 9 0 0 0 12 21c2.4 0 4.5-.8 6-2.3l-3.2-2.5c-.8.6-1.9.9-2.8.9-2.3 0-4.3-1.5-5-3.6Z" />
            <path fill="#4A90E2" d="M3.4 7A9 9 0 0 0 3 12c0 1.8.4 3.5 1.2 5l3.4-2.7A5.4 5.4 0 0 1 7 12c0-.8.1-1.5.4-2.2L3.4 7Z" />
            <path fill="#FBBC05" d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 3.4 7l3.9 3c.8-2.1 2.7-3.4 4.7-3.4Z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 grid grid-cols-2 gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] p-1">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs transition-colors",
                tab === t ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:text-foreground",
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
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-xs text-destructive-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <span className="text-red-300">{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.01] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tab === "signup" ? "Create account" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}