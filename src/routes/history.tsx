import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AppAuthProvider, useAppAuth } from "@/hooks/use-app-auth";
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
  return (
    <AppAuthProvider>
      <HistoryInner />
    </AppAuthProvider>
  );
}

function HistoryInner() {
  const { user } = useAppAuth();
  const navigate = useNavigate();
  return (
    <AppShell>
      <DemoWorkoutHistory onBack={() => navigate({ to: "/" })} userId={user?.id} />
    </AppShell>
  );
}