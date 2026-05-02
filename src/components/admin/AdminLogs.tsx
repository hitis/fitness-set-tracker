import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface SessionLog {
  id: string;
  completed: boolean;
  session_rpe: number | null;
  notes: string | null;
  created_at: string;
  profile_name: string;
  workout_date: string;
  training_type: string;
}

export function AdminLogs() {
  const [logs, setLogs] = useState<SessionLog[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("user_workout_sessions")
      .select("*, workouts(workout_date, training_type), profiles:user_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setLogs(
        data.map((d: Record<string, unknown>) => ({
          id: d.id as string,
          completed: d.completed as boolean,
          session_rpe: d.session_rpe as number | null,
          notes: d.notes as string | null,
          created_at: d.created_at as string,
          profile_name: (d.profiles as { full_name: string } | null)?.full_name || "Unknown",
          workout_date: (d.workouts as { workout_date: string } | null)?.workout_date || "",
          training_type: (d.workouts as { training_type: string } | null)?.training_type || "",
        }))
      );
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Member Logs</h2>

      <div className="space-y-2">
        {logs.map((log) => (
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
              {log.workout_date && format(new Date(log.workout_date + "T00:00:00"), "MMM d")} ·{" "}
              {log.training_type.replace("_", " ")}
            </p>
            {log.session_rpe && (
              <p className="text-sm text-muted-foreground">Session RPE: {log.session_rpe}/10</p>
            )}
            {log.notes && <p className="text-sm text-muted-foreground italic">{log.notes}</p>}
          </div>
        ))}
        {logs.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No member logs yet</p>
        )}
      </div>
    </div>
  );
}