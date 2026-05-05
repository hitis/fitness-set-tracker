import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────
export type UserRole = "member" | "trainer";

export interface AppUser {
  id: string;
  name: string;
  mobile: string;
  roles: UserRole[];
  created_at: string;
  last_active_at: string;
}

// ─── Seeded Users ────────────────────────────────────────────
const SEEDED_USERS: AppUser[] = [
  {
    id: "user-shubham",
    name: "Shubham",
    mobile: "9999999999",
    roles: ["member", "trainer"],
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: new Date().toISOString(),
  },
  {
    id: "user-tester1",
    name: "Tester One",
    mobile: "9000000001",
    roles: ["member"],
    created_at: "2025-02-01T00:00:00Z",
    last_active_at: new Date().toISOString(),
  },
  {
    id: "user-tester2",
    name: "Tester Two",
    mobile: "9000000002",
    roles: ["member"],
    created_at: "2025-02-15T00:00:00Z",
    last_active_at: new Date().toISOString(),
  },
  {
    id: "user-trainer-demo",
    name: "Trainer Demo",
    mobile: "9000000003",
    roles: ["trainer", "member"],
    created_at: "2025-03-01T00:00:00Z",
    last_active_at: new Date().toISOString(),
  },
];

// ─── User store (mutable, in-memory) ────────────────────────
const _users: Map<string, AppUser> = new Map();
SEEDED_USERS.forEach((u) => _users.set(u.mobile, u));

function findUserByMobile(mobile: string): AppUser | null {
  return _users.get(mobile) ?? null;
}

function getPasscode(mobile: string): string {
  return mobile.slice(-4);
}

function createNewUser(name: string, mobile: string): AppUser {
  const user: AppUser = {
    id: `user-${Date.now()}`,
    name,
    mobile,
    roles: ["member"],
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  };
  _users.set(mobile, user);
  return user;
}

// ─── Persist to sessionStorage ──────────────────────────────
const SESSION_KEY = "gymlog-session";
const ROLE_KEY = "gymlog-active-role";

function getPersistedSession(): { userId: string; role: UserRole } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistSession(userId: string, role: UserRole) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, role }));
}

function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

// ─── Context ─────────────────────────────────────────────────
interface AppAuthContextValue {
  user: AppUser | null;
  activeRole: UserRole | null;
  isLoggedIn: boolean;
  login: (mobile: string, passcode: string) => { success: boolean; error?: string; needsRoleSelect?: boolean };
  register: (name: string, mobile: string) => { success: boolean; error?: string };
  logout: () => void;
  selectRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  /** True when user has multiple roles and hasn't selected one yet */
  needsRoleSelect: boolean;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    const session = getPersistedSession();
    if (!session) return null;
    // Find user by id across all stored users
    for (const u of _users.values()) {
      if (u.id === session.userId) return u;
    }
    return null;
  });

  const [activeRole, setActiveRole] = useState<UserRole | null>(() => {
    const session = getPersistedSession();
    return session?.role ?? null;
  });

  const [needsRoleSelect, setNeedsRoleSelect] = useState(false);

  const login = useCallback((mobile: string, passcode: string) => {
    const trimmed = mobile.replace(/\D/g, "");
    const existing = findUserByMobile(trimmed);
    if (!existing) {
      return { success: false, error: "No account found. Please register first." };
    }
    const expected = getPasscode(trimmed);
    if (passcode !== expected) {
      return { success: false, error: "Incorrect passcode." };
    }
    existing.last_active_at = new Date().toISOString();
    setUser(existing);

    if (existing.roles.length > 1) {
      setNeedsRoleSelect(true);
      return { success: true, needsRoleSelect: true };
    }

    const role = existing.roles[0];
    setActiveRole(role);
    setNeedsRoleSelect(false);
    persistSession(existing.id, role);
    return { success: true };
  }, []);

  const register = useCallback((name: string, mobile: string) => {
    const trimmed = mobile.replace(/\D/g, "");
    if (trimmed.length < 10) {
      return { success: false, error: "Enter a valid 10-digit mobile number." };
    }
    if (!name.trim()) {
      return { success: false, error: "Name is required." };
    }
    if (findUserByMobile(trimmed)) {
      return { success: false, error: "An account with this number already exists. Please login." };
    }
    const newUser = createNewUser(name.trim(), trimmed);
    setUser(newUser);
    setActiveRole("member");
    setNeedsRoleSelect(false);
    persistSession(newUser.id, "member");
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setActiveRole(null);
    setNeedsRoleSelect(false);
    clearSession();
  }, []);

  const selectRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    setNeedsRoleSelect(false);
    if (user) persistSession(user.id, role);
  }, [user]);

  const switchRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    if (user) persistSession(user.id, role);
  }, [user]);

  return (
    <AppAuthContext.Provider
      value={{
        user,
        activeRole,
        isLoggedIn: !!user && !!activeRole,
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