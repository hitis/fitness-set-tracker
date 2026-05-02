import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/AuthForm";
import { AppShell } from "@/components/AppShell";
import { AdminLogs } from "@/components/admin/AdminLogs";

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
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !role) return <AuthForm />;
  if (role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <AppShell role={role} onSignOut={signOut}>
      <AdminLogs />
    </AppShell>
  );
}