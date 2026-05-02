import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DemoProvider, useDemo } from "@/hooks/use-demo";
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
    <DemoProvider>
      <DemoHistoryInner />
    </DemoProvider>
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