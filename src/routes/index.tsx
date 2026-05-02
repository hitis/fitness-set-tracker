import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { AdminWorkouts } from "@/components/admin/AdminWorkouts";
import { TodayWorkout } from "@/components/member/TodayWorkout";
import { DemoProviderWithRole, useDemo, clearDemoMode } from "@/hooks/use-demo";
import { DemoAdminDashboard } from "@/components/admin/DemoAdminDashboard";
import { DemoTodayWorkout } from "@/components/member/DemoTodayWorkout";
import { AuthForm } from "@/components/AuthForm";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GymLog — Track Your Workouts" },
      { name: "description", content: "Log your gym performance, track progress, and never forget what you lifted last time." },
    ],
  }),
  component: Index,
});

function Index() {
  const [mode, setMode] = useState<"landing" | "demo" | "login">("landing");
  const [demoRole, setDemoRole] = useState<AppRole>("member");
  const { user, role, loading, signOut } = useAuth();

  if (!loading && user && role) {
    return (
      <DemoProviderWithRole forceDemo={false} initialRole={role}>
        <AppShell role={role} onSignOut={signOut}>
          {role === "admin" ? <AdminWorkouts /> : <TodayWorkout user={user} />}
        </AppShell>
      </DemoProviderWithRole>
    );
  }

  if (mode === "demo") {
    return (
      <DemoProviderWithRole forceDemo={true} initialRole={demoRole}>
        <DemoIndexInner onExit={() => { clearDemoMode(); setMode("landing"); }} />
      </DemoProviderWithRole>
    );
  }

  if (mode === "login") {
    return <AuthForm onBack={() => setMode("landing")} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-10 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Dumbbell className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">GymLog</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your lifts. Know what you did last time.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => { setDemoRole("member"); setMode("demo"); }}
            className="h-14 w-full text-base font-bold shadow-lg shadow-primary/20"
            size="lg"
          >
            Try Demo as Member
          </Button>
          <Button
            onClick={() => { setDemoRole("admin"); setMode("demo"); }}
            variant="secondary"
            className="h-14 w-full text-base font-bold border border-border"
            size="lg"
          >
            Try Demo as Admin
          </Button>
        </div>

        <div className="pt-6 border-t border-border">
          <button
            onClick={() => setMode("login")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Login to Live App →
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoIndexInner({ onExit }: { onExit: () => void }) {
  const demo = useDemo();
  return (
    <AppShell role={demo.role} onSignOut={onExit}>
      {demo.role === "admin" ? <DemoAdminDashboard /> : <DemoTodayWorkout />}
    </AppShell>
  );
}
