import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
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
    <AppShell>
      <DemoAdminLogs />
    </AppShell>
  );
}