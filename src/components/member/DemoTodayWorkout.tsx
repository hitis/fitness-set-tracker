import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { DEMO_TODAY_WORKOUT, DEMO_EXERCISE_HISTORY, type DemoBlock, type DemoExercise, type BlockType } from "@/hooks/use-demo";
import { DemoExerciseLogger } from "./DemoExerciseLogger";
import { DemoConditioningLogger } from "./DemoConditioningLogger";
import { ChevronRight, Check, Trophy } from "lucide-react";

const CONDITIONING_TYPES: BlockType[] = ["emom", "amrap", "tabata", "finisher", "conditioning"];

export function DemoTodayWorkout() {
  const workout = DEMO_TODAY_WORKOUT;
  const [selectedExercise, setSelectedExercise] = useState<{ exercise: DemoExercise; block: DemoBlock } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [sessionRpe, setSessionRpe] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [loggedSets, setLoggedSets] = useState<Record<string, number>>({});
  const [completedCondExercises, setCompletedCondExercises] = useState<Set<string>>(new Set());

  if (selectedExercise) {
    const isConditioning = CONDITIONING_TYPES.includes(selectedExercise.block.block_type);
    const history = DEMO_EXERCISE_HISTORY[selectedExercise.exercise.exercise_id] || [];
    if (isConditioning) {
      return (
        <DemoConditioningLogger
          exercise={selectedExercise.exercise}
          blockType={selectedExercise.block.block_type}
          previous={history[0] || null}
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
        previousHistory={history}
        onBack={() => setSelectedExercise(null)}
        onSaveSets={(count) => {
          setLoggedSets((prev) => ({ ...prev, [selectedExercise.exercise.exercise_id]: count }));
        }}
      />
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6 min-h-[60vh]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Workout Saved</h2>
          <p className="text-muted-foreground">
            {workout.training_type.replace("_", " ")} · {workout.phase}
          </p>
          {sessionRpe && (
            <p className="text-sm text-muted-foreground">Session RPE: {sessionRpe}/10</p>
          )}
        </div>
        <Button variant="secondary" className="h-12 w-full max-w-xs" onClick={() => { setCompleted(false); setShowFinish(false); }}>
          Back to Workout
        </Button>
      </div>
    );
  }

  if (showFinish) {
    return (
      <div className="p-4 space-y-6">
        <h2 className="text-xl font-bold text-foreground">Finish Workout</h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Session RPE (1-10)</label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="10"
              value={sessionRpe}
              onChange={(e) => setSessionRpe(e.target.value)}
              className="mt-1 h-14 bg-secondary border-0 text-center text-2xl font-bold"
              placeholder="—"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
            <Textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="mt-1 bg-secondary border-0"
              placeholder="How was the session overall?"
              rows={3}
            />
          </div>
        </div>
        <Button onClick={() => setCompleted(true)} className="h-14 w-full text-base font-bold" size="lg">
          Save & Complete
        </Button>
        <Button variant="secondary" onClick={() => setShowFinish(false)} className="h-12 w-full text-base">
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Workout Header */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {format(new Date(workout.workout_date + "T00:00:00"), "EEEE, MMMM d")}
        </p>
        <h2 className="text-xl font-bold text-foreground capitalize">
          {workout.training_type.replace("_", " ")}
        </h2>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-0 text-xs font-semibold">
            {workout.phase}
          </Badge>
        </div>
        {workout.notes && (
          <p className="text-sm text-muted-foreground italic">{workout.notes}</p>
        )}
      </div>

      {/* Blocks */}
      <div className="space-y-6">
        {workout.blocks.map((block) => {
          const isConditioning = CONDITIONING_TYPES.includes(block.block_type);
          return (
            <div key={block.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {block.name}
                </h3>
                <Badge variant="outline" className="text-[10px] capitalize border-border">
                  {block.block_type.replace("_", " ")}
                </Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              {block.notes && (
                <p className="text-xs text-muted-foreground italic px-1">{block.notes}</p>
              )}
              <div className="space-y-2">
                {block.exercises.map((ex) => {
                  const logged = loggedSets[ex.exercise_id] || 0;
                  const condDone = completedCondExercises.has(ex.exercise_id);
                  const isDone = isConditioning ? condDone : logged >= ex.prescribed_sets;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExercise({ exercise: ex, block })}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98] ${
                        isDone ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                          isDone ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{ex.exercise_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.prescribed_sets} × {ex.prescribed_reps}
                        </p>
                      </div>
                      {!isConditioning && logged > 0 && (
                        <span className="text-xs font-bold text-primary">
                          {logged}/{ex.prescribed_sets}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={() => setShowFinish(true)}
        className="h-14 w-full text-base font-bold"
        size="lg"
      >
        Finish Workout
      </Button>
    </div>
  );
}