import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { DEMO_TODAY_WORKOUT, DEMO_EXERCISE_HISTORY, addDemoHistoryEntry, type DemoBlock, type DemoExercise, type BlockType, type PreviousEntry } from "@/hooks/use-demo";
import { DEMO_MEMBER_HISTORY } from "@/hooks/use-demo";
import { DemoExerciseLogger } from "./DemoExerciseLogger";
import { DemoConditioningLogger } from "./DemoConditioningLogger";
import { ChevronRight, Check, Trophy, AlertTriangle, ArrowLeft, Pencil, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";

const CONDITIONING_TYPES: BlockType[] = ["emom", "amrap", "tabata", "finisher", "conditioning"];

export function DemoTodayWorkout() {
  const workout = DEMO_TODAY_WORKOUT;
  const [selectedExercise, setSelectedExercise] = useState<{ exercise: DemoExercise; block: DemoBlock } | null>(null);
  const [exerciseHistoryView, setExerciseHistoryView] = useState<{ exercise: DemoExercise; history: PreviousEntry[] } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [sessionRpe, setSessionRpe] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [loggedSets, setLoggedSets] = useState<Record<string, number>>({});
  const [completedCondExercises, setCompletedCondExercises] = useState<Set<string>>(new Set());
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [rpeError, setRpeError] = useState("");
  const [savedSetData, setSavedSetData] = useState<Record<string, Array<{ set_number: number; weight: number; reps: number; rpe: number; notes: string | null; pain_flag: boolean; pain_areas: string[] }>>>({});
  const [showSavedSummary, setShowSavedSummary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Exercise-wise full history view
  if (exerciseHistoryView) {
    const { exercise, history } = exerciseHistoryView;
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setExerciseHistoryView(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-foreground">{exercise.exercise_name} — History</h2>
        </div>
        {history.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No history yet for this exercise.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(entry.date + "T00:00:00"), "EEEE, MMM d")}
                </p>
                <div className="space-y-1">
                  {entry.sets.map((s) => (
                    <div key={s.set_number} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-xs font-bold text-muted-foreground">S{s.set_number}</span>
                      <span className="font-semibold text-foreground">{s.weight > 0 ? `${s.weight}kg` : "BW"} × {s.reps}</span>
                      <span className="text-xs text-muted-foreground">RPE {s.rpe}</span>
                    </div>
                  ))}
                </div>
                {entry.notes && <p className="text-xs text-muted-foreground italic">{entry.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (selectedExercise) {
    const isConditioning = CONDITIONING_TYPES.includes(selectedExercise.block.block_type);
    const history = DEMO_EXERCISE_HISTORY[selectedExercise.exercise.exercise_id] || [];
    if (isConditioning) {
      return (
        <DemoConditioningLogger
          exercise={selectedExercise.exercise}
          blockType={selectedExercise.block.block_type}
          previous={history.length > 0 ? history[0] : null}
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
        onSetDataChange={(sets) => {
          setSavedSetData((prev) => ({ ...prev, [selectedExercise.exercise.exercise_id]: sets }));
        }}
        onViewExerciseHistory={() => {
          setSelectedExercise(null);
          setExerciseHistoryView({ exercise: selectedExercise.exercise, history });
        }}
      />
    );
  }

  if (completed) {
    if (isEditing) {
      return (
        <div className="p-4 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsEditing(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-foreground">Edit Workout</h2>
          </div>
          <p className="text-sm text-muted-foreground">Tap an exercise to edit your logged sets.</p>
          <div className="space-y-2">
            {workout.blocks.flatMap((b) => b.exercises).map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExercise({ exercise: ex, block: workout.blocks.find(b => b.exercises.some(e => e.id === ex.id))! })}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{ex.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {savedSetData[ex.exercise_id]?.length || loggedSets[ex.exercise_id] || 0} sets logged
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setIsEditing(false)} className="h-12 w-full text-base">
            Done Editing
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-5 min-h-[60vh]">
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
          <p className="text-xs text-muted-foreground">
            {Object.values(loggedSets).reduce((a, b) => a + b, 0) + completedCondExercises.size} sets logged
          </p>
        </div>
        <Button
          onClick={() => setShowSavedSummary(true)}
          className="h-12 w-full max-w-xs"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Saved Workout
        </Button>
        <Button
          onClick={() => setIsEditing(true)}
          className="h-12 w-full max-w-xs"
          variant="outline"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit Workout
        </Button>
        <Link to="/history">
          <Button variant="ghost" className="h-12 w-full max-w-xs text-primary">
            View History
          </Button>
        </Link>
        <Button variant="secondary" className="h-12 w-full max-w-xs" onClick={() => { setCompleted(false); setShowFinish(false); setShowSavedSummary(false); }}>
          Back to Today
        </Button>
      </div>
    );
  }

  // If workout already completed and user is on Today screen, show saved state
  if (showSavedSummary) {
    const allExercises = workout.blocks.flatMap((b) => b.exercises);
    return (
      <div className="p-4 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSavedSummary(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Saved Workout</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(workout.workout_date + "T00:00:00"), "EEEE, MMMM d")}
            </p>
          </div>
        </div>
        {sessionRpe && (
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase">Session RPE</p>
            <p className="text-xl font-bold text-foreground">{sessionRpe}/10</p>
          </div>
        )}
        <div className="space-y-3">
          {allExercises.map((ex) => {
            const setData = savedSetData[ex.exercise_id];
            return (
              <div key={ex.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <p className="font-semibold text-foreground">{ex.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">{ex.prescribed_sets} × {ex.prescribed_reps}</p>
                </div>
                {setData && setData.length > 0 ? (
                  <div className="divide-y divide-border">
                    {setData.map((s) => (
                      <div key={s.set_number} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-8 text-xs font-bold text-muted-foreground">S{s.set_number}</span>
                        <span className="text-sm font-semibold text-foreground min-w-[60px]">
                          {s.weight > 0 ? `${s.weight}kg` : "BW"}
                        </span>
                        <span className="text-sm text-foreground">× {s.reps}</span>
                        <span className="text-xs text-muted-foreground">RPE {s.rpe}</span>
                        {s.pain_flag && <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-muted-foreground italic">No sets logged</div>
                )}
              </div>
            );
          })}
        </div>
        <Button variant="outline" onClick={() => { setShowSavedSummary(false); setIsEditing(true); }} className="h-12 w-full text-base">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Workout
        </Button>
        <Button variant="secondary" onClick={() => setShowSavedSummary(false)} className="h-12 w-full text-base">
          ← Back
        </Button>
      </div>
    );
  }

  if (showFinish) {
    // Check completeness
    const allExercises = workout.blocks.flatMap((b) => b.exercises);
    const incompleteExercises = allExercises.filter((ex) => {
      const isConditioning = CONDITIONING_TYPES.includes(
        workout.blocks.find((b) => b.exercises.some((e) => e.id === ex.id))?.block_type || "accessory"
      );
      if (isConditioning) return !completedCondExercises.has(ex.exercise_id);
      return (loggedSets[ex.exercise_id] || 0) === 0;
    });

    const handleSubmit = () => {
      const rpeNum = sessionRpe ? parseInt(sessionRpe) : null;
      if (rpeNum !== null && (rpeNum < 1 || rpeNum > 10)) {
        setRpeError("RPE must be between 1 and 10");
        return;
      }
      setRpeError("");

      if (incompleteExercises.length > 0 && !showIncompleteWarning) {
        setShowIncompleteWarning(true);
        return;
      }

      // Add to history immediately
      const totalSets = Object.values(loggedSets).reduce((a, b) => a + b, 0) + completedCondExercises.size;
      const entryId = `s-new-${Date.now()}`;
      addDemoHistoryEntry(
        {
          id: entryId,
          workout_date: workout.workout_date,
          training_type: workout.training_type,
          phase: workout.phase,
          session_rpe: rpeNum,
          completed: true,
          exercise_count: totalSets,
        },
        {
          workout_date: workout.workout_date,
          training_type: workout.training_type,
          phase: workout.phase,
          session_rpe: rpeNum,
          notes: sessionNotes || null,
          completed: true,
          exercises: allExercises.map((ex) => {
            const setData = savedSetData[ex.exercise_id];
            return {
              exercise_name: ex.exercise_name,
              prescribed_sets: ex.prescribed_sets,
              prescribed_reps: ex.prescribed_reps,
              sets: setData
                ? setData.map(s => ({
                    set_number: s.set_number,
                    weight: s.weight,
                    reps: s.reps,
                    rpe: s.rpe,
                    notes: s.notes,
                    pain_flag: s.pain_flag,
                    pain_area: s.pain_areas.length > 0 ? s.pain_areas.join(", ") : null,
                  }))
                : Array.from({ length: loggedSets[ex.exercise_id] || 0 }, (_, i) => ({
                    set_number: i + 1,
                    weight: 0,
                    reps: 0,
                    rpe: 0,
                    notes: null,
                    pain_flag: false,
                    pain_area: null,
                  })),
            };
          }),
        }
      );

      setCompleted(true);
    };

    return (
      <div className="p-4 space-y-6">
        <h2 className="text-xl font-bold text-foreground">Finish Workout</h2>

        {incompleteExercises.length > 0 && showIncompleteWarning && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Some exercises are incomplete</p>
            </div>
            <ul className="space-y-1 pl-6">
              {incompleteExercises.map((ex) => (
                <li key={ex.id} className="text-xs text-destructive list-disc">{ex.exercise_name}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Tap "Save & Complete" again to submit anyway.</p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Session RPE (1-10)</label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="10"
              value={sessionRpe}
              onChange={(e) => { setSessionRpe(e.target.value); setRpeError(""); }}
              className="mt-1 h-14 bg-secondary border-0 text-center text-2xl font-bold"
              placeholder="—"
            />
            {rpeError && <p className="text-xs text-destructive mt-1">{rpeError}</p>}
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
        <Button onClick={handleSubmit} className="h-14 w-full text-base font-bold" size="lg">
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
      <div className={`rounded-xl border bg-gradient-to-br from-card to-card/80 p-4 space-y-2 ${completed ? "border-primary/30" : "border-primary/20"}`}>
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
          {completed && (
            <Badge className="bg-primary/20 text-primary border-0 text-xs font-semibold">
              <Check className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
        {workout.notes && (
          <p className="text-sm text-muted-foreground italic">{workout.notes}</p>
        )}
      </div>

      {/* Already completed state */}
      {completed && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Today's workout saved</p>
              <p className="text-xs text-muted-foreground">
                {Object.values(loggedSets).reduce((a, b) => a + b, 0) + completedCondExercises.size} sets logged
                {sessionRpe && ` · RPE ${sessionRpe}/10`}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Button onClick={() => setShowSavedSummary(true)} className="h-12 w-full text-base">
              <Eye className="h-4 w-4 mr-2" />
              View Saved Workout
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(true)} className="h-12 w-full text-base">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Workout
            </Button>
            <Link to="/history" className="block">
              <Button variant="secondary" className="h-12 w-full text-base">
                View History
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Blocks */}
      {!completed && <div className="space-y-6">
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
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>Sets: {ex.prescribed_sets}</span>
                          <span>Reps: {ex.prescribed_reps}</span>
                        </div>
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