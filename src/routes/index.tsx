import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { AdminWorkouts } from "@/components/admin/AdminWorkouts";
import { TodayWorkout } from "@/components/member/TodayWorkout";
import { DemoProvider, useDemo } from "@/hooks/use-demo";
import { DemoAdminWorkouts } from "@/components/admin/DemoAdminWorkouts";
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
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <DemoProvider>
        <DemoIndex />
      </DemoProvider>
    );
  }

  if (!user || !role) {
    return (
      <DemoProvider>
        <DemoIndex />
      </DemoProvider>
    );
  }

  return (
    <DemoProvider forceDemo={false}>
      <AppShell role={role} onSignOut={signOut}>
        {role === "admin" ? <AdminWorkouts /> : <TodayWorkout user={user} />}
      </AppShell>
    </DemoProvider>
  );
}

function DemoIndex() {
  const demo = useDemo();
  return (
    <AppShell role={demo.role} onSignOut={() => {}}>
      {demo.role === "admin" ? <DemoAdminWorkouts /> : <DemoTodayWorkout />}
    </AppShell>
  );
}
