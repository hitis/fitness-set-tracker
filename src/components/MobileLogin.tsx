import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Phone, Lock, UserPlus, ArrowLeft } from "lucide-react";
import { useAppAuth, type UserRole } from "@/hooks/use-app-auth";

export function MobileLogin() {
  const { login, register, selectRole, user, needsRoleSelect } = useAppAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [mobile, setMobile] = useState("");
  const [passcode, setPasscode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // ─── Role Selector ────────────────────────────────────────
  if (needsRoleSelect && user) {
    const roleLabels: Record<UserRole, string> = {
      member: "Continue as Member",
      trainer: "Continue as Trainer",
    };
    const roleColors: Record<UserRole, string> = {
      member: "bg-primary",
      trainer: "bg-amber-600",
    };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="space-y-3">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Dumbbell className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">Welcome, {user.name}</h1>
            <p className="text-sm text-muted-foreground">Choose your role to continue</p>
          </div>
          <div className="space-y-3">
            {user.roles.map((role) => (
              <Button
                key={role}
                onClick={() => selectRole(role)}
                className={`h-14 w-full text-base font-bold ${roleColors[role]} hover:opacity-90`}
                size="lg"
              >
                {roleLabels[role]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Register Form ────────────────────────────────────────
  if (mode === "register") {
    const handleRegister = (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      const result = register(name, mobile);
      if (!result.success) setError(result.error || "Registration failed.");
    };

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <UserPlus className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground">Enter your details to get started</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-14 bg-secondary border-0 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="h-14 bg-secondary border-0 text-base pl-12"
                  required
                  maxLength={10}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Your passcode will be the last 4 digits of your number.</p>
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button type="submit" className="h-14 w-full text-base font-bold" size="lg">
              Register
            </Button>
          </form>
          <p className="text-center">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ─── Login Form ───────────────────────────────────────────
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = login(mobile, passcode);
    if (!result.success) setError(result.error || "Login failed.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Dumbbell className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">GymLog</h1>
          <p className="text-sm text-muted-foreground">Track your lifts. Know what you did last time.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                inputMode="numeric"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="h-14 bg-secondary border-0 text-base pl-12"
                required
                maxLength={10}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Passcode</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                inputMode="numeric"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4-digit passcode"
                className="h-14 bg-secondary border-0 text-base pl-12 tracking-[0.5em]"
                required
                maxLength={4}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Passcode = last 4 digits of your mobile number</p>
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Button type="submit" className="h-14 w-full text-base font-bold shadow-lg shadow-primary/20" size="lg">
            Login
          </Button>
        </form>

        <div className="pt-4 border-t border-border text-center">
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className="text-sm font-medium text-primary hover:underline"
          >
            New here? Create Account
          </button>
        </div>

        <div className="rounded-xl bg-card border border-border p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Demo Accounts</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p><span className="font-semibold text-foreground">Shubham</span> — 9999999999 / 9999 (All roles)</p>
            <p><span className="font-semibold text-foreground">Tester One</span> — 9000000001 / 0001 (Member)</p>
            <p><span className="font-semibold text-foreground">Tester Two</span> — 9000000002 / 0002 (Member)</p>
            <p><span className="font-semibold text-foreground">Trainer Demo</span> — 9000000003 / 0003 (Trainer)</p>
          </div>
        </div>
      </div>
    </div>
  );
}