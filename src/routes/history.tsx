import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { DemoProviderWithRole, DemoProviderAuto, useDemo } from "@/hooks/use-demo";
import { DemoWorkoutHistory } from "@/components/member/DemoWorkoutHistory";
import { WorkoutHistory } from "@/components/member/WorkoutHistory";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Workout History — GymLog" },
      { name: "description", content: "View your past workout sessions and performance." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user, role, loading, signOut } = useAuth();

  if (!loading && user && role) {
    return (
      <DemoProviderWithRole forceDemo={false} initialRole={role}>
        <AppShell role={role} onSignOut={signOut}>
          <WorkoutHistory user={user} />
        </AppShell>
      </DemoProviderWithRole>
    );
  }

  return (
    <DemoProviderAuto>
      <DemoHistoryInner />
    </DemoProviderAuto>
  );
}

function DemoHistoryInner() {
  const demo = useDemo();
  return (
    <AppShell role={demo.role} onSignOut={() => {}}>
      <DemoWorkoutHistory />
    </AppShell>
  );
}