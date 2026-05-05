import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Dumbbell, History, LogOut, LayoutDashboard } from "lucide-react";
import { useAppAuth, type UserRole } from "@/hooks/use-app-auth";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole, logout, switchRole } = useAppAuth();

  const isTrainerOrOwner = activeRole === "trainer";

  const adminNav = [
    { to: "/" as const, icon: LayoutDashboard, label: "Dashboard" },
  ];

  const memberNav = [
    { to: "/" as const, icon: Dumbbell, label: "Today" },
    { to: "/history" as const, icon: History, label: "History" },
  ];

  const navItems = isTrainerOrOwner ? adminNav : memberNav;

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const roleLabels: Record<UserRole, string> = {
    member: "Member",
    trainer: "Trainer",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Dumbbell className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">GymLog</span>
            {isTrainerOrOwner && (
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Trainer
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {user && user.roles.length > 1 && (
              <div className="flex gap-1 mr-1">
                {user.roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => switchRole(r)}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                      activeRole === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {user && (
          <div className="border-t border-border px-4 py-1.5 flex items-center justify-between bg-card">
            <span className="text-[11px] text-muted-foreground">
              Logged in as <span className="font-semibold text-foreground">{user.name}</span>
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 rounded-xl px-5 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}