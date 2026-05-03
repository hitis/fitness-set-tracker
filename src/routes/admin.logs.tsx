import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AppAuthProvider } from "@/hooks/use-app-auth";
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
    <AppAuthProvider>
      <AppShell>
        <DemoAdminLogs />
      </AppShell>
    </AppAuthProvider>
  );
}