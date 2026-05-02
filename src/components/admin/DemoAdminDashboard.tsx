import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, AlertTriangle, Users, Check, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import {
  DEMO_TODAY_WORKOUT,
  DEMO_RECENT_WORKOUTS,
  DEMO_ADMIN_WORKOUT_DETAILS,
  type AdminWorkoutSummary,
  type AdminMemberSummary,
} from "@/hooks/use-demo";
import { DemoWorkoutEditor } from "./DemoWorkoutEditor";
import { DemoWorkoutOverview } from "./DemoWorkoutOverview";

export function DemoAdminDashboard() {
  const [view, setView] = useState<"dashboard" | "create" | "edit">("dashboard");
  const [selectedWorkout, setSelectedWorkout] = useState<AdminWorkoutSummary | null>(null);
  const [editWorkoutId, setEditWorkoutId] = useState<string | null>(null);

  const allWorkouts = [DEMO_TODAY_WORKOUT, ...DEMO_RECENT_WORKOUTS];
  const todayWorkout = DEMO_ADMIN_WORKOUT_DETAILS.find(
    (d) => d.workout_date === new Date().toISOString().slice(0, 10)
  );

  // Aggregate stats
  const totalPainFlags = DEMO_ADMIN_WORKOUT_DETAILS.reduce((a, d) => a + d.pain_flag_count, 0);
  const totalCompleted = DEMO_ADMIN_WORKOUT_DETAILS.reduce((a, d) => a + d.completed_count, 0);
  const totalMembers = DEMO_ADMIN_WORKOUT_DETAILS.reduce((a, d) => a + d.total_members, 0);
  const completionRate = totalMembers > 0 ? Math.round((totalCompleted / totalMembers) * 100) : 0;

  if (view === "create" || view === "edit") {
    return (
      <DemoWorkoutEditor
        workoutId={view === "edit" ? editWorkoutId : null}
        onDone={() => setView("dashboard")}
      />
    );
  }

  if (selectedWorkout) {
    return <DemoWorkoutOverview summary={selectedWorkout} onBack={() => setSelectedWorkout(null)} />;
  }

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
        <Button onClick={() => setView("create")} size="sm" className="gap-1.5 font-semibold">
          <Plus className="h-4 w-4" /> Create Workout
        </Button>
      </div>

      {/* Phase & Stats */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Phase</p>
            <p className="text-xl font-bold text-foreground capitalize">{DEMO_TODAY_WORKOUT.phase}</p>
          </div>
          <Badge className="bg-primary/20 text-primary border-0 text-xs font-semibold">
            <TrendingUp className="h-3 w-3 mr-1" /> Active
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">4</p>
          <p className="text-[10px] text-muted-foreground uppercase">Members</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-primary">{completionRate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase">Completion</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-destructive">{totalPainFlags}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Pain Flags</p>
        </div>
      </div>

      {/* Today's Workout */}
      {todayWorkout && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Today's Workout</h3>
          <button
            onClick={() => setSelectedWorkout(todayWorkout)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-left transition-all active:scale-[0.98]"
          >
            <div className="space-y-1">
              <p className="font-semibold text-foreground capitalize">
                {todayWorkout.training_type.replace("_", " ")}
              </p>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {todayWorkout.completed_count}/{todayWorkout.total_members} completed
                </span>
                {todayWorkout.pain_flag_count > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" /> {todayWorkout.pain_flag_count}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Recent Workouts */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Recent Workouts</h3>
        {allWorkouts.map((w) => {
          const detail = DEMO_ADMIN_WORKOUT_DETAILS.find((d) => d.workout_id === w.id);
          return (
            <button
              key={w.id}
              onClick={() => detail && setSelectedWorkout(detail)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98]"
            >
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {format(new Date(w.workout_date + "T00:00:00"), "EEE, MMM d")}
                </p>
                <div className="flex gap-1.5">
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {w.training_type.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-border">
                    {w.phase}
                  </Badge>
                </div>
                {detail && (
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {detail.completed_count}/{detail.total_members} done
                    </span>
                    {detail.pain_flag_count > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                        <AlertTriangle className="h-3 w-3" /> {detail.pain_flag_count}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {w.published && (
                  <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Live
                  </span>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}