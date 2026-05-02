import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "member";

interface AuthState {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  const fetchRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    return (data?.role as AppRole) ?? "member";
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await fetchRole(session.user.id);
        setState({ user: session.user, role, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchRole(session.user.id);
        setState({ user: session.user, role, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}