import { Link, useLocation } from "@tanstack/react-router";
import { Dumbbell, ClipboardList, History, LogOut, Settings } from "lucide-react";
import type { AppRole } from "@/hooks/use-auth";

interface AppShellProps {
  children: React.ReactNode;
  role: AppRole;
  onSignOut: () => void;
}

export function AppShell({ children, role, onSignOut }: AppShellProps) {
  const location = useLocation();
  const isAdmin = role === "admin";

  const navItems = isAdmin
    ? [
        { to: "/", icon: ClipboardList, label: "Workouts" },
        { to: "/admin/logs", icon: History, label: "Logs" },
      ]
    : [
        { to: "/", icon: Dumbbell, label: "Today" },
        { to: "/history", icon: History, label: "History" },
      ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">GymLog</span>
            {isAdmin && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                ADMIN
              </span>
            )}
          </div>
          <button onClick={onSignOut} className="p-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}