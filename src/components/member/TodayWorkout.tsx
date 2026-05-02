import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ExerciseLogger } from "./ExerciseLogger";
import { FinishWorkout } from "./FinishWorkout";
import type { User } from "@supabase/supabase-js";

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  notes: string | null;
  sort_order: number;
}

interface TodayWorkoutData {
  id: string;
  workout_date: string;
  training_type: string;
  phase: string;
  notes: string | null;
  exercises: WorkoutExercise[];
}

export function TodayWorkout({ user }: { user: User }) {
  const [workout, setWorkout] = useState<TodayWorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [sessionExists, setSessionExists] = useState(false);

  const loadToday = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: w } = await supabase
      .from("workouts")
      .select("*")
      .eq("workout_date", today)
      .eq("published", true)
      .single();

    if (!w) {
      setLoading(false);
      return;
    }

    const { data: we } = await supabase
      .from("workout_exercises")
      .select("*, exercises(name)")
      .eq("workout_id", w.id)
      .order("sort_order");

    setWorkout({
      id: w.id,
      workout_date: w.workout_date,
      training_type: w.training_type,
      phase: w.phase,
      notes: w.notes,
      exercises: (we || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        exercise_id: e.exercise_id as string,
        exercise_name: (e.exercises as { name: string })?.name || "",
        prescribed_sets: e.prescribed_sets as number,
        prescribed_reps: e.prescribed_reps as string,
        notes: e.notes as string | null,
        sort_order: e.sort_order as number,
      })),
    });

    // Check if session exists
    const { data: session } = await supabase
      .from("user_workout_sessions")
      .select("id, completed")
      .eq("user_id", user.id)
      .eq("workout_id", w.id)
      .single();

    setSessionExists(!!session?.completed);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-lg font-semibold text-foreground">No workout today</p>
        <p className="text-sm text-muted-foreground">Check back later or browse your history</p>
      </div>
    );
  }

  if (selectedExercise) {
    return (
      <ExerciseLogger
        user={user}
        workoutId={workout.id}
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  if (showFinish) {
    return (
      <FinishWorkout
        user={user}
        workoutId={workout.id}
        onBack={() => setShowFinish(false)}
        onDone={() => {
          setShowFinish(false);
          setSessionExists(true);
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
        {workout.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            index={i + 1}
            exercise={ex}
            userId={user.id}
            workoutId={workout.id}
            onClick={() => setSelectedExercise(ex)}
          />
        ))}
      </div>

      {!sessionExists && (
        <Button
          onClick={() => setShowFinish(true)}
          className="h-14 w-full text-base font-bold"
          size="lg"
        >
          Finish Workout
        </Button>
      )}
      {sessionExists && (
        <div className="rounded-xl bg-primary/10 p-4 text-center">
          <p className="font-semibold text-primary">✓ Workout Complete</p>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  index,
  exercise,
  userId,
  workoutId,
  onClick,
}: {
  index: number;
  exercise: WorkoutExercise;
  userId: string;
  workoutId: string;
  onClick: () => void;
}) {
  const [loggedSets, setLoggedSets] = useState(0);

  useEffect(() => {
    supabase
      .from("user_set_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("workout_id", workoutId)
      .eq("exercise_id", exercise.exercise_id)
      .then(({ data }) => setLoggedSets(data?.length || 0));
  }, [userId, workoutId, exercise.exercise_id]);

  const progress = exercise.prescribed_sets > 0 ? loggedSets / exercise.prescribed_sets : 0;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left transition-colors active:bg-accent"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          backgroundColor: progress >= 1 ? "var(--primary)" : "var(--secondary)",
          color: progress >= 1 ? "var(--primary-foreground)" : "var(--foreground)",
        }}
      >
        {index}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{exercise.exercise_name}</p>
        <p className="text-sm text-muted-foreground">
          {exercise.prescribed_sets} × {exercise.prescribed_reps}
          {exercise.notes && ` · ${exercise.notes}`}
        </p>
      </div>
      <div className="text-right">
        <span className="text-sm font-medium text-muted-foreground">
          {loggedSets}/{exercise.prescribed_sets}
        </span>
      </div>
    </button>
  );
}