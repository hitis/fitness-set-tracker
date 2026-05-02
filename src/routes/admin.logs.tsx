import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DemoProvider, useDemo } from "@/hooks/use-demo";
import { DemoAdminLogs } from "@/components/admin/DemoAdminLogs";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({
    meta: [
      { title: "Member Logs — GymLog Admin" },
      { name: "description", content: "View member workout logs and performance data." },
    ],
  }),
  component: AdminLogsPage,
});

function AdminLogsPage() {
  return (
    <DemoProvider>
      <DemoAdminLogsInner />
    </DemoProvider>
  );
}

function DemoAdminLogsInner() {
  const demo = useDemo();
  return (
    <AppShell role={demo.role} onSignOut={() => {}}>
      <DemoAdminLogs />
    </AppShell>
  );
}