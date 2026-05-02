import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DEMO_MEMBER_HISTORY } from "@/hooks/use-demo";

export function DemoWorkoutHistory() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Workout History</h2>
      <div className="space-y-2">
        {DEMO_MEMBER_HISTORY.map((h) => (
          <div key={h.id} className="rounded-xl bg-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">
                {format(new Date(h.workout_date + "T00:00:00"), "EEE, MMM d")}
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
      </div>
    </div>
  );
}