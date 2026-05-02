import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/AuthForm";
import { AppShell } from "@/components/AppShell";
import { AdminWorkouts } from "@/components/admin/AdminWorkouts";
import { TodayWorkout } from "@/components/member/TodayWorkout";

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
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !role) {
    return <AuthForm />;
  }

  return (
    <AppShell role={role} onSignOut={signOut}>
      {role === "admin" ? <AdminWorkouts /> : <TodayWorkout user={user} />}
    </AppShell>
  );
}
