import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { DEMO_TODAY_WORKOUT, DEMO_PREVIOUS_PERFORMANCE, type DemoBlock, type DemoExercise, type BlockType } from "@/hooks/use-demo";
import { DemoExerciseLogger } from "./DemoExerciseLogger";
import { DemoConditioningLogger } from "./DemoConditioningLogger";
import { ChevronRight, Check } from "lucide-react";

const CONDITIONING_TYPES: BlockType[] = ["emom", "amrap", "tabata", "finisher", "conditioning"];

export function DemoTodayWorkout() {
  const workout = DEMO_TODAY_WORKOUT;
  const [selectedExercise, setSelectedExercise] = useState<{ exercise: DemoExercise; block: DemoBlock } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loggedSets, setLoggedSets] = useState<Record<string, number>>({});
  const [completedCondExercises, setCompletedCondExercises] = useState<Set<string>>(new Set());

  if (selectedExercise) {
    const isConditioning = CONDITIONING_TYPES.includes(selectedExercise.block.block_type);
    if (isConditioning) {
      return (
        <DemoConditioningLogger
          exercise={selectedExercise.exercise}
          blockType={selectedExercise.block.block_type}
          previous={DEMO_PREVIOUS_PERFORMANCE[selectedExercise.exercise.exercise_id] || null}
          onBack={() => setSelectedExercise(null)}
          onComplete={() => {
            setCompletedCondExercises((prev) => new Set(prev).add(selectedExercise.exercise.exercise_id));
            setSelectedExercise(null);
          }}
        />
      );
    }
    return (
      <DemoExerciseLogger
        exercise={selectedExercise.exercise}
        previous={DEMO_PREVIOUS_PERFORMANCE[selectedExercise.exercise.exercise_id] || null}
        onBack={() => setSelectedExercise(null)}
        onSaveSets={(count) => {
          setLoggedSets((prev) => ({ ...prev, [selectedExercise.exercise.exercise_id]: count }));
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
        <h2 className="text-xl font-bold text-foreground">
            {workout.training_type.replace("_", " ")}
        </h2>
        <p className="text-sm font-medium text-primary">Phase: {workout.phase}</p>
        {workout.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">{workout.notes}</p>
        )}
      </div>

      <div className="space-y-5">
        {workout.blocks.map((block) => {
          const isConditioning = CONDITIONING_TYPES.includes(block.block_type);
          return (
            <div key={block.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {block.name}
                </h3>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {block.block_type.replace("_", " ")}
                </Badge>
              </div>
              {block.notes && (
                <p className="text-xs text-muted-foreground italic">{block.notes}</p>
              )}
              {block.exercises.map((ex) => {
                const logged = loggedSets[ex.exercise_id] || 0;
                const progress = ex.prescribed_sets > 0 ? logged / ex.prescribed_sets : 0;
                const condDone = completedCondExercises.has(ex.exercise_id);
                const isDone = isConditioning ? condDone : progress >= 1;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedExercise({ exercise: ex, block })}
                    className="flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left transition-colors active:bg-accent"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                      style={{
                        backgroundColor: isDone ? "var(--primary)" : "var(--secondary)",
                        color: isDone ? "var(--primary-foreground)" : "var(--foreground)",
                      }}
                    >
                      {isDone ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{ex.exercise_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ex.prescribed_sets} × {ex.prescribed_reps}
                      </p>
                    </div>
                    {!isConditioning && (
                      <div className="text-right">
                        <span className="text-sm font-medium text-muted-foreground">
                          {logged}/{ex.prescribed_sets}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
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