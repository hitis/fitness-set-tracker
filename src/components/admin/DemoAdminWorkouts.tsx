import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { DEMO_TODAY_WORKOUT, DEMO_RECENT_WORKOUTS } from "@/hooks/use-demo";

export function DemoAdminWorkouts() {
  const allWorkouts = [DEMO_TODAY_WORKOUT, ...DEMO_RECENT_WORKOUTS];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Workouts</h2>
        <Button size="lg" className="gap-2">
          <Plus className="h-4 w-4" /> New Workout
        </Button>
      </div>

      <div className="space-y-2">
        {allWorkouts.map((w) => (
          <button
            key={w.id}
            className="flex w-full items-center justify-between rounded-xl bg-card p-4 text-left"
          >
            <div>
              <p className="font-semibold text-foreground">
                {format(new Date(w.workout_date + "T00:00:00"), "EEE, MMM d")}
              </p>
              <div className="mt-1 flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {w.training_type.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {w.phase}
                </Badge>
                {"blocks" in w && (
                  <Badge variant="outline" className="text-xs">
                    {w.blocks.length} blocks
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {w.published && (
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                  Live
                </span>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}