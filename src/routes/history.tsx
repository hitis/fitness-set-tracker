import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/AuthForm";
import { AppShell } from "@/components/AppShell";
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !role) return <AuthForm />;

  return (
    <AppShell role={role} onSignOut={signOut}>
      <WorkoutHistory user={user} />
    </AppShell>
  );
}