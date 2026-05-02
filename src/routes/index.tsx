import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { AdminWorkouts } from "@/components/admin/AdminWorkouts";
import { TodayWorkout } from "@/components/member/TodayWorkout";
import { DemoProvider, useDemo } from "@/hooks/use-demo";
import { DemoAdminWorkouts } from "@/components/admin/DemoAdminWorkouts";
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

  // If authenticated, show live app
  if (!loading && user && role) {
    return (
      <DemoProvider forceDemo={false}>
        <AppShell role={role} onSignOut={signOut}>
          {role === "admin" ? <AdminWorkouts /> : <TodayWorkout user={user} />}
        </AppShell>
      </DemoProvider>
    );
  }

  // Demo mode
  if (mode === "demo") {
    return (
      <DemoProvider forceDemo={true}>
        <DemoIndexInner initialRole={demoRole} onExit={() => setMode("landing")} />
      </DemoProvider>
    );
  }

  // Login screen
  if (mode === "login") {
    return <AuthForm onBack={() => setMode("landing")} />;
  }

  // Landing screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
            <Dumbbell className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-foreground tracking-tight">GymLog</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track your lifts. Know what you did last time.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => { setDemoRole("member"); setMode("demo"); }}
            className="h-14 w-full text-base font-bold"
            size="lg"
          >
            Try Demo as Member
          </Button>
          <Button
            onClick={() => { setDemoRole("admin"); setMode("demo"); }}
            variant="secondary"
            className="h-14 w-full text-base font-bold"
            size="lg"
          >
            Try Demo as Admin
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
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

function DemoIndexInner({ initialRole, onExit }: { initialRole: AppRole; onExit: () => void }) {
  const demo = useDemo();
  // Set initial role on mount
  if (demo.role !== initialRole && !demo._roleSet) {
    demo.setRole(initialRole);
  }
  return (
    <AppShell role={demo.role} onSignOut={onExit}>
      {demo.role === "admin" ? <DemoAdminWorkouts /> : <DemoTodayWorkout />}
    </AppShell>
  );
}
