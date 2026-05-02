import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";

interface HistoryItem {
  id: string;
  workout_date: string;
  training_type: string;
  phase: string;
  session_rpe: number | null;
  completed: boolean;
  exercise_count: number;
}

export function WorkoutHistory({ user }: { user: User }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data: sessions } = await supabase
      .from("user_workout_sessions")
      .select("*, workouts(workout_date, training_type, phase)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (sessions) {
      // Get set log counts for each workout
      const items: HistoryItem[] = [];
      for (const s of sessions) {
        const w = s.workouts as { workout_date: string; training_type: string; phase: string } | null;
        const { count } = await supabase
          .from("user_set_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("workout_id", s.workout_id);

        items.push({
          id: s.id,
          workout_date: w?.workout_date || "",
          training_type: w?.training_type || "",
          phase: w?.phase || "",
          session_rpe: s.session_rpe,
          completed: s.completed,
          exercise_count: count || 0,
        });
      }
      setHistory(items);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Workout History</h2>

      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="rounded-xl bg-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">
                {h.workout_date && format(new Date(h.workout_date + "T00:00:00"), "EEE, MMM d")}
              </p>
              {h.completed && (
                <span className="text-xs font-medium text-primary">✓ Done</span>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {h.training_type.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {h.phase}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {h.exercise_count} sets logged
              {h.session_rpe && ` · RPE ${h.session_rpe}/10`}
            </p>
          </div>
        ))}
        {history.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No workout history yet</p>
        )}
      </div>
    </div>
  );
}