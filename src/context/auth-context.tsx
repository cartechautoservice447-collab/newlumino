import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Ctx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (mounted) {
          setSession(s);
          setLoading(false);
        }
      });

      // Handle OAuth redirect query param ?code= if PKCE flow
      if (typeof window !== "undefined" && window.location.search.includes("code=")) {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
            if (mounted && data?.session) {
              setSession(data.session);
              setLoading(false);
              // Clean URL query params cleanly without reloading
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }).catch(() => {
            // fall back to getSession
          });
        }
      }

      supabase.auth.getSession().then(({ data }) => {
        if (mounted) {
          setSession(data?.session ?? null);
          setLoading(false);
        }
      }).catch(() => {
        if (mounted) setLoading(false);
      });
      return () => {
        mounted = false;
        sub?.subscription?.unsubscribe();
      };
    } catch {
      setLoading(false);
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
