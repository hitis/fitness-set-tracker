import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────
export type UserRole = "member" | "trainer";

export interface AppUser {
  id: string;
  name: string;
  roles: UserRole[];
}

// Helper: mobile → synthetic email
function mobileToEmail(mobile: string): string {
  return `m${mobile}@gymlog.app`;
}

// Derive a Supabase-compatible password from 4-digit pin
// Supabase requires min 6 chars, so we pad deterministically
function pinToPassword(pin: string): string {
  return `gym${pin}!`;
}

// ─── Context ─────────────────────────────────────────────────
interface AppAuthContextValue {
  user: AppUser | null;
  activeRole: UserRole | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (mobile: string, passcode: string) => Promise<{ success: boolean; error?: string; needsRoleSelect?: boolean }>;
  register: (name: string, mobile: string, isTrainer?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  selectRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  needsRoleSelect: boolean;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

async function fetchRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    console.error("[GymLog] Failed to load user roles:", error.message);
    return [];
  }
  if (!data || data.length === 0) return [];
  return data.map((r) => r.role as unknown as string).filter((r) => r === "member" || r === "trainer") as UserRole[];
}

async function fetchProfile(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("[GymLog] Failed to load user profile:", error.message);
    return null;
  }
  return data?.full_name || "User";
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [needsRoleSelect, setNeedsRoleSelect] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hydrate from existing Supabase session
  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mounted) {
        await hydrateUser(session.user);
      }
      if (mounted) setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        await hydrateUser(session.user);
      } else {
        setUser(null);
        setActiveRole(null);
        setNeedsRoleSelect(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function hydrateUser(authUser: User) {
    const [roles, name] = await Promise.all([
      fetchRoles(authUser.id),
      fetchProfile(authUser.id),
    ]);
    if (!name || roles.length === 0) {
      console.error("[GymLog] Signed-in user has no profile or roles. Signing out to recover stale/deleted session.", {
        userId: authUser.id,
        hasProfile: !!name,
        roles,
      });
      if (typeof window !== "undefined") sessionStorage.removeItem("gymlog-active-role");
      await supabase.auth.signOut();
      setUser(null);
      setActiveRole(null);
      setNeedsRoleSelect(false);
      return;
    }
    const appUser: AppUser = { id: authUser.id, name, roles };
    setUser(appUser);

    // Restore persisted role
    const savedRole = typeof window !== "undefined" ? sessionStorage.getItem("gymlog-active-role") : null;
    if (savedRole && roles.includes(savedRole as UserRole)) {
      setActiveRole(savedRole as UserRole);
      setNeedsRoleSelect(false);
    } else if (roles.length === 1) {
      setActiveRole(roles[0]);
      setNeedsRoleSelect(false);
    } else if (roles.length > 1) {
      setNeedsRoleSelect(true);
    }
  }

  const login = useCallback(async (mobile: string, passcode: string) => {
    const trimmed = mobile.replace(/\D/g, "");
    const email = mobileToEmail(trimmed);
    // Password is the last 4 digits of mobile number
    const pin = passcode.replace(/\D/g, "").slice(-4);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pinToPassword(pin) });
    if (error) {
      if (error.message === "Invalid login credentials") {
        return { success: false, error: "Invalid mobile number or passcode." };
      }
      if (error.message === "Email not confirmed" || error.message.includes("email_not_confirmed")) {
        return { success: false, error: "Account not yet active. Please try again in a moment." };
      }
      return { success: false, error: error.message };
    }
    // hydrateUser will be called by onAuthStateChange
    // Check roles to decide if role select needed
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const roles = await fetchRoles(authUser.id);
      if (roles.length > 1) {
        return { success: true, needsRoleSelect: true };
      }
    }
    return { success: true };
  }, []);

  const register = useCallback(async (name: string, mobile: string, isTrainer?: boolean) => {
    const trimmed = mobile.replace(/\D/g, "");
    if (trimmed.length < 10) {
      return { success: false, error: "Enter a valid 10-digit mobile number." };
    }
    if (!name.trim()) {
      return { success: false, error: "Name is required." };
    }
    const email = mobileToEmail(trimmed);
    const requestedRole = isTrainer ? "trainer" : "member";
    console.info("[GymLog] Register signup metadata:", { app_role: requestedRole, isTrainer: !!isTrainer });
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password: pinToPassword(trimmed.slice(-4)),
      options: {
        data: {
          full_name: name.trim(),
          app_role: requestedRole,
        },
      },
    });
    if (error) {
      if (error.message.includes("already registered")) {
        return { success: false, error: "An account with this number already exists. Please login." };
      }
      if (error.message.includes("over_email_send_rate_limit") || error.message.includes("rate limit")) {
        return { success: false, error: "Too many attempts. Please wait a moment and try again." };
      }
      return { success: false, error: error.message };
    }
    // Supabase returns a fake user with no identities if email already exists
    if (signUpData?.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
      return { success: false, error: "This mobile number is already registered. Please login." };
    }
    if (isTrainer && signUpData?.user?.user_metadata?.app_role !== "trainer") {
      console.error("[GymLog] Trainer toggle did not reach signup metadata.", {
        expected: "trainer",
        received: signUpData?.user?.user_metadata?.app_role,
        userId: signUpData?.user?.id,
      });
      return { success: false, error: "Trainer signup metadata was missing. Please try registering again." };
    }
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") sessionStorage.removeItem("gymlog-active-role");
    await supabase.auth.signOut();
    setUser(null);
    setActiveRole(null);
    setNeedsRoleSelect(false);
  }, []);

  const selectRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    setNeedsRoleSelect(false);
    if (typeof window !== "undefined") sessionStorage.setItem("gymlog-active-role", role);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    if (typeof window !== "undefined") sessionStorage.setItem("gymlog-active-role", role);
  }, []);

  return (
    <AppAuthContext.Provider
      value={{
        user,
        activeRole,
        isLoggedIn: !!user && !!activeRole,
        loading,
        login,
        register,
        logout,
        selectRole,
        switchRole,
        needsRoleSelect,
      }}
    >
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error("useAppAuth must be inside AppAuthProvider");
  return ctx;
}