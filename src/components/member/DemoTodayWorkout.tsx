import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { DEMO_TODAY_WORKOUT, DEMO_PREVIOUS_PERFORMANCE } from "@/hooks/use-demo";
import { DemoExerciseLogger } from "./DemoExerciseLogger";

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  notes: string | null;
  sort_order: number;
}

export function DemoTodayWorkout() {
  const workout = DEMO_TODAY_WORKOUT;
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loggedSets, setLoggedSets] = useState<Record<string, number>>({});

  if (selectedExercise) {
    return (
      <DemoExerciseLogger
        exercise={selectedExercise}
        previous={DEMO_PREVIOUS_PERFORMANCE[selectedExercise.exercise_id] || null}
        onBack={() => setSelectedExercise(null)}
        onSaveSets={(count) => {
          setLoggedSets((prev) => ({ ...prev, [selectedExercise.exercise_id]: count }));
        }}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {format(new Date(workout.workout_date + "T00:00:00"), "EEEE, MMMM d")}
        </p>
        <h2 className="text-xl font-bold text-foreground">Today's Workout</h2>
        <div className="flex gap-2">
          <Badge className="bg-primary/20 text-primary border-0">
            {workout.training_type.replace("_", " ")}
          </Badge>
          <Badge variant="outline">{workout.phase}</Badge>
        </div>
        {workout.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">{workout.notes}</p>
        )}
      </div>

      <div className="space-y-2">
        {workout.exercises.map((ex, i) => {
          const logged = loggedSets[ex.exercise_id] || 0;
          const progress = ex.prescribed_sets > 0 ? logged / ex.prescribed_sets : 0;
          return (
            <button
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left transition-colors active:bg-accent"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                style={{
                  backgroundColor: progress >= 1 ? "var(--primary)" : "var(--secondary)",
                  color: progress >= 1 ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{ex.exercise_name}</p>
                <p className="text-sm text-muted-foreground">
                  {ex.prescribed_sets} × {ex.prescribed_reps}
                  {ex.notes && ` · ${ex.notes}`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-muted-foreground">
                  {logged}/{ex.prescribed_sets}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!completed ? (
        <Button
          onClick={() => setCompleted(true)}
          className="h-14 w-full text-base font-bold"
          size="lg"
        >
          Finish Workout
        </Button>
      ) : (
        <div className="rounded-xl bg-primary/10 p-4 text-center">
          <p className="font-semibold text-primary">✓ Workout Complete</p>
        </div>
      )}
    </div>
  );
}