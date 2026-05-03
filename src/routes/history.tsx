import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Navigate } from "@tanstack/react-router";
import { useAppAuth } from "@/hooks/use-app-auth";
import { DemoWorkoutHistory } from "@/components/member/DemoWorkoutHistory";

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
  const { user, isLoggedIn } = useAppAuth();
  const navigate = useNavigate();

  if (!isLoggedIn || !user) {
    return <Navigate to="/" />;
  }

  return (
    <AppShell>
      <DemoWorkoutHistory onBack={() => navigate({ to: "/" })} userId={user?.id} />
    </AppShell>
  );
}