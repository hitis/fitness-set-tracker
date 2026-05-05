import { createFileRoute } from "@tanstack/react-router";
import { useAppAuth } from "@/hooks/use-app-auth";
import { MobileLogin } from "@/components/MobileLogin";
import { AppShell } from "@/components/AppShell";
import { DemoAdminDashboard } from "@/components/admin/DemoAdminDashboard";
import { DemoTodayWorkout } from "@/components/member/DemoTodayWorkout";

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
  const { user, activeRole, isLoggedIn, loading } = useAppAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn || !user || !activeRole) {
    return <MobileLogin />;
  }

  // Map roles to views
  const isTrainerOrOwner = activeRole === "trainer";

  return (
    <AppShell>
      {isTrainerOrOwner ? <DemoAdminDashboard /> : <DemoTodayWorkout userId={user.id} />}
    </AppShell>
  );
}
