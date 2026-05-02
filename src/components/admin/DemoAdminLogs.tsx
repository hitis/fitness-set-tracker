import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DEMO_ADMIN_LOGS } from "@/hooks/use-demo";

export function DemoAdminLogs() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Member Logs</h2>
      <div className="space-y-2">
        {DEMO_ADMIN_LOGS.map((log) => (
          <div key={log.id} className="rounded-xl bg-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{log.profile_name}</span>
              {log.completed && (
                <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                  Completed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(log.workout_date + "T00:00:00"), "MMM d")} ·{" "}
              {log.training_type.replace("_", " ")}
            </p>
            {log.session_rpe && (
              <p className="text-sm text-muted-foreground">Session RPE: {log.session_rpe}/10</p>
            )}
            {log.notes && <p className="text-sm text-muted-foreground italic">{log.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}