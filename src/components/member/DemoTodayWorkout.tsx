import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  DEMO_EXERCISE_HISTORY,
  addDemoHistoryEntry,
  DEMO_MEMBER_HISTORY,
  DEMO_HISTORY_DETAILS,
  getOrCreateWorkoutLog,
  updateWorkoutLog,
  getPublishedWorkoutForDate,
  onWorkoutStoreUpdate,
  type DemoBlock,
  type DemoExercise,
  type BlockType,
  type PreviousEntry,
  type WorkoutLog,
  type WorkoutLogSet,
  type ConditioningLogEntry,
} from "@/hooks/use-demo";
import { DemoExerciseLogger } from "./DemoExerciseLogger";
import { DemoConditioningLogger } from "./DemoConditioningLogger";
import { ChevronRight, Check, Trophy, AlertTriangle, ArrowLeft, Pencil, Eye, TrendingUp, Dumbbell } from "lucide-react";
import { Link } from "@tanstack/react-router";

const CONDITIONING_TYPES: BlockType[] = ["emom", "amrap", "tabata", "finisher", "conditioning"];

export function DemoTodayWorkout({ onBack, userId }: { onBack?: () => void; userId?: string }) {
  const activeUserId = userId || "demo-user-001";
  const todayDate = new Date().toISOString().slice(0, 10);

  // Listen for workout store changes (e.g. trainer publishes)
  const [, forceUpdate] = useState(0);
  useEffect(() => onWorkoutStoreUpdate(() => forceUpdate(n => n + 1)), []);

  const workout = getPublishedWorkoutForDate(todayDate);

  // No published workout for today
  if (!workout) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        {onBack && (
          <button onClick={onBack} className="self-start flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <Dumbbell className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">No workout published for today</h2>
        <p className="text-sm text-muted-foreground text-center">Your trainer hasn't published a workout for today yet. Check back later!</p>
      </div>
    );
  }

  // Central log — single source of truth
  const [log, setLog] = useState<WorkoutLog>(() =>
    getOrCreateWorkoutLog(activeUserId, workout.id, workout.workout_date)
  );

  // Sync log to module store on every change
  const syncLog = useCallback((updatedLog: WorkoutLog) => {
    setLog(updatedLog);
    updateWorkoutLog(updatedLog);
  }, []);

  const [selectedExercise, setSelectedExercise] = useState<{ exercise: DemoExercise; block: DemoBlock } | null>(null);
  const [exerciseHistoryView, setExerciseHistoryView] = useState<{ exercise: DemoExercise; history: PreviousEntry[] } | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [showSavedSummary, setShowSavedSummary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [rpeError, setRpeError] = useState("");
  // Local edit buffers for session RPE/notes (synced on submit)
  const [sessionRpe, setSessionRpe] = useState(log.session_rpe?.toString() ?? "");
  const [sessionNotes, setSessionNotes] = useState(log.session_notes ?? "");

  const completed = log.status === "completed";

  // Compute stats from central log
  const allExercises = useMemo(() => workout.blocks.flatMap((b) => b.exercises), [workout]);

  const totalPrescribedSets = useMemo(() => {
    let total = 0;
    for (const block of workout.blocks) {
      for (const ex of block.exercises) {
        const isCond = CONDITIONING_TYPES.includes(block.block_type);
        total += isCond ? 1 : ex.prescribed_sets; // conditioning counts as 1 required item
      }
    }
    return total;
  }, [workout]);

  const totalLoggedSets = useMemo(() => {
    let count = 0;
    for (const block of workout.blocks) {
      for (const ex of block.exercises) {
        const isCond = CONDITIONING_TYPES.includes(block.block_type);
        if (isCond) {
          const entry = log.conditioning_logs[ex.exercise_id];
          if (entry?.completed) count += 1;
        } else {
          count += (log.strength_logs[ex.exercise_id]?.length ?? 0);
        }
      }
    }
    return count;
  }, [log, workout]);

  const completionPct = totalPrescribedSets > 0 ? Math.round((totalLoggedSets / totalPrescribedSets) * 100) : 0;

  const getExerciseStatus = (ex: DemoExercise, block: DemoBlock): "completed" | "partial" | "not_started" => {
    const isCond = CONDITIONING_TYPES.includes(block.block_type);
    if (isCond) {
      return log.conditioning_logs[ex.exercise_id]?.completed ? "completed" : "not_started";
    }
    const logged = log.strength_logs[ex.exercise_id]?.length ?? 0;
    if (logged >= ex.prescribed_sets) return "completed";
    if (logged > 0) return "partial";
    return "not_started";
  };

  const getInsight = (): string => {
    if (completionPct >= 100) return "You completed all prescribed sets 💪";
    if (completionPct >= 75) return `You completed ${completionPct}% of your workout — solid effort!`;
    return `${completionPct}% completed — every rep counts!`;
  };

  // ─── Save handlers ─────────────────────────────────────────
  const handleStrengthSave = (exerciseId: string, sets: WorkoutLogSet[]) => {
    const updated: WorkoutLog = {
      ...log,
      status: log.status === "not_started" ? "in_progress" : log.status,
      strength_logs: { ...log.strength_logs, [exerciseId]: sets },
    };
    syncLog(updated);
  };

  const handleConditioningSave = (data: ConditioningLogEntry) => {
    const updated: WorkoutLog = {
      ...log,
      status: log.status === "not_started" ? "in_progress" : log.status,
      conditioning_logs: { ...log.conditioning_logs, [data.exercise_id]: data },
    };
    syncLog(updated);
  };

  // ─── Sub-views ─────────────────────────────────────────────

  // Exercise history view
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
                      <span className="font-semibold text-foreground">{s.weight > 0 ? `${s.weight}kg` : "—"} × {s.reps}</span>
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

  // Selected exercise → logger
  if (selectedExercise) {
    const isCond = CONDITIONING_TYPES.includes(selectedExercise.block.block_type);
    const history = DEMO_EXERCISE_HISTORY[selectedExercise.exercise.exercise_id] || [];
    if (isCond) {
      return (
        <DemoConditioningLogger
          exercise={selectedExercise.exercise}
          blockType={selectedExercise.block.block_type}
          previous={history.length > 0 ? history[0] : null}
          initialData={log.conditioning_logs[selectedExercise.exercise.exercise_id] ?? null}
          onBack={() => setSelectedExercise(null)}
          onSaveData={(data) => {
            handleConditioningSave(data);
            setSelectedExercise(null);
          }}
        />
      );
    }
    const existingSets = log.strength_logs[selectedExercise.exercise.exercise_id];
    return (
      <DemoExerciseLogger
        exercise={selectedExercise.exercise}
        previousHistory={history}
        onBack={() => setSelectedExercise(null)}
        onSaveSets={(count) => {
          // count is handled internally, we use onSetDataChange for actual data
        }}
        onSetDataChange={(sets) => {
          handleStrengthSave(selectedExercise.exercise.exercise_id, sets);
        }}
        onViewExerciseHistory={() => {
          setSelectedExercise(null);
          setExerciseHistoryView({ exercise: selectedExercise.exercise, history });
        }}
        initialSetData={existingSets}
      />
    );
  }

  // ─── Completed state (post-submit) ─────────────────────────
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
            {workout.blocks.map((block) => block.exercises.map((ex) => {
              const status = getExerciseStatus(ex, block);
              const isCond = CONDITIONING_TYPES.includes(block.block_type);
              const loggedCount = isCond
                ? (log.conditioning_logs[ex.exercise_id]?.completed ? 1 : 0)
                : (log.strength_logs[ex.exercise_id]?.length ?? 0);
              return (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExercise({ exercise: ex, block })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98] ${
                    status === "completed" ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    status === "completed" ? "bg-primary text-primary-foreground" : status === "partial" ? "bg-amber-500/20 text-amber-400" : "bg-secondary text-muted-foreground"
                  }`}>
                    {status === "completed" ? <Check className="h-4 w-4" /> : status === "partial" ? "…" : "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{ex.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loggedCount}/{isCond ? 1 : ex.prescribed_sets} {isCond ? "block" : "sets"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            }))}
          </div>
          <Button variant="secondary" onClick={() => {
            // After editing, re-sync history
            syncHistoryFromLog(log);
            setIsEditing(false);
          }} className="h-12 w-full text-base">
            Done Editing
          </Button>
        </div>
      );
    }

    // Saved summary detail
    if (showSavedSummary) {
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
          {log.session_rpe && (
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">Session RPE</p>
              <p className="text-xl font-bold text-foreground">{log.session_rpe}/10</p>
            </div>
          )}
          <div className="space-y-3">
            {allExercises.map((ex) => {
              const block = workout.blocks.find(b => b.exercises.some(e => e.id === ex.id))!;
              const isCond = CONDITIONING_TYPES.includes(block.block_type);
              const setData = log.strength_logs[ex.exercise_id];
              const condData = log.conditioning_logs[ex.exercise_id];
              return (
                <div key={ex.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <p className="font-semibold text-foreground">{ex.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isCond ? block.block_type.replace("_", " ") : `${ex.prescribed_sets} × ${ex.prescribed_reps}`}
                    </p>
                  </div>
                  {isCond ? (
                    condData ? (
                      <div className="px-4 py-3 space-y-1">
                        <p className="text-sm text-foreground">{condData.completed ? "✓ Completed" : "✗ Not completed"}</p>
                        {condData.weight != null && <p className="text-xs text-muted-foreground">Weight: {condData.weight}kg</p>}
                        {condData.rounds != null && <p className="text-xs text-muted-foreground">Rounds: {condData.rounds}</p>}
                        {condData.rpe != null && <p className="text-xs text-muted-foreground">RPE: {condData.rpe}/10</p>}
                        {condData.notes && <p className="text-xs text-muted-foreground italic">{condData.notes}</p>}
                        {condData.pain_areas.length > 0 && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {condData.pain_areas.join(", ")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-muted-foreground italic">Not logged</div>
                    )
                  ) : setData && setData.length > 0 ? (
                    <div className="divide-y divide-border">
                      {setData.map((s) => (
                        <div key={s.set_number} className="px-4 py-3 space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="w-8 text-xs font-bold text-muted-foreground shrink-0">S{s.set_number}</span>
                            <span className="text-sm font-semibold text-foreground min-w-[60px]">
                              {s.weight > 0 ? `${s.weight}kg` : "—"}
                            </span>
                            <span className="text-sm text-foreground">× {s.reps}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">RPE {s.rpe}</span>
                          </div>
                          {s.pain_flag && s.pain_areas && s.pain_areas.length > 0 && (
                            <div className="flex items-center gap-1.5 pl-8 text-destructive">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span className="text-xs capitalize">Pain: {s.pain_areas.join(", ")}</span>
                            </div>
                          )}
                          {s.notes && (
                            <p className="text-xs text-muted-foreground italic pl-8">Note: {s.notes}</p>
                          )}
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

    // Completed landing
    return (
      <div className="p-4 space-y-5">
        {onBack && (
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Workout Completed</h2>
            <p className="text-muted-foreground capitalize">
              {workout.training_type.replace("_", " ")} · {workout.phase}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{totalLoggedSets}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Sets</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{log.session_rpe ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase">RPE</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-primary">{completionPct}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Complete</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">{getInsight()}</p>
        </div>

        <div className="space-y-2">
          <Button onClick={() => setShowSavedSummary(true)} className="h-12 w-full text-base">
            <Eye className="h-4 w-4 mr-2" />
            View Workout Details
          </Button>
          <Button onClick={() => setIsEditing(true)} className="h-12 w-full text-base" variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Workout
          </Button>
          <Link to="/history" className="block">
            <Button variant="secondary" className="h-12 w-full text-base">
              Go to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Finish Workout screen ─────────────────────────────────
  if (showFinish) {
    const incompleteExercises = allExercises.filter((ex) => {
      const block = workout.blocks.find(b => b.exercises.some(e => e.id === ex.id))!;
      const isCond = CONDITIONING_TYPES.includes(block.block_type);
      if (isCond) return !log.conditioning_logs[ex.exercise_id]?.completed;
      return (log.strength_logs[ex.exercise_id]?.length ?? 0) === 0;
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

      // Update central log
      const updatedLog: WorkoutLog = {
        ...log,
        status: "completed",
        session_rpe: rpeNum,
        session_notes: sessionNotes || null,
      };
      syncLog(updatedLog);

      // Sync to history
      syncHistoryFromLog(updatedLog);
    };

    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowFinish(false); setShowIncompleteWarning(false); }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Finish Workout</h2>
        </div>

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
              type="number" inputMode="numeric" min="1" max="10"
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
      </div>
    );
  }

  // ─── Main workout logging view ─────────────────────────────
  return (
    <div className="p-4 space-y-5">
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      {/* Workout Header */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-card/80 p-4 space-y-2 border-primary/20">
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

      {/* Progress bar */}
      {totalLoggedSets > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-bold text-primary">{completionPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(completionPct, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-6">
        {workout.blocks.map((block) => {
          const isCond = CONDITIONING_TYPES.includes(block.block_type);
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
                  const status = getExerciseStatus(ex, block);
                  const loggedCount = isCond
                    ? (log.conditioning_logs[ex.exercise_id]?.completed ? 1 : 0)
                    : (log.strength_logs[ex.exercise_id]?.length ?? 0);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExercise({ exercise: ex, block })}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98] ${
                        status === "completed" ? "border-primary/30 bg-primary/5" : status === "partial" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                        status === "completed" ? "bg-primary text-primary-foreground" : status === "partial" ? "bg-amber-500/20 text-amber-400" : "bg-secondary text-muted-foreground"
                      }`}>
                        {status === "completed" ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{ex.exercise_name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {isCond ? (
                            <span>{block.block_type.replace("_", " ")}</span>
                          ) : (
                            <>
                              <span>Sets: {ex.prescribed_sets}</span>
                              <span>Reps: {ex.prescribed_reps}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {loggedCount > 0 && (
                        <span className={`text-xs font-bold ${status === "completed" ? "text-primary" : "text-amber-400"}`}>
                          {loggedCount}/{isCond ? 1 : ex.prescribed_sets}
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

// ─── Helper: sync current log to history ─────────────────────
function syncHistoryFromLog(log: WorkoutLog, workout: { blocks: DemoBlock[]; training_type: string; phase: string }) {
  const todayDate = log.workout_date;
  const allExercises = workout.blocks.flatMap((b: DemoBlock) => b.exercises);

  // Calculate total logged
  let totalLogged = 0;
  for (const block of workout.blocks) {
    for (const ex of block.exercises) {
      const isCond = CONDITIONING_TYPES.includes(block.block_type);
      if (isCond) {
        if (log.conditioning_logs[ex.exercise_id]?.completed) totalLogged++;
      } else {
        totalLogged += (log.strength_logs[ex.exercise_id]?.length ?? 0);
      }
    }
  }

  const existingIdx = DEMO_MEMBER_HISTORY.findIndex(h => h.workout_date === todayDate);
  const entryId = existingIdx >= 0 ? DEMO_MEMBER_HISTORY[existingIdx].id : `s-new-${Date.now()}`;

  const detailExercises = allExercises.map((ex: DemoExercise) => {
    const block = workout.blocks.find((b: DemoBlock) => b.exercises.some((e: DemoExercise) => e.id === ex.id))!;
    const isCond = CONDITIONING_TYPES.includes(block.block_type);
    const setData = log.strength_logs[ex.exercise_id];
    const condData = log.conditioning_logs[ex.exercise_id];
    return {
      exercise_name: ex.exercise_name,
      prescribed_sets: isCond ? 1 : ex.prescribed_sets,
      prescribed_reps: ex.prescribed_reps,
      sets: isCond
        ? (condData?.completed
          ? [{ set_number: 1, weight: condData.weight ?? 0, reps: condData.rounds ?? 1, rpe: condData.rpe ?? 0, notes: condData.notes, pain_flag: condData.pain_areas.length > 0, pain_area: condData.pain_areas.join(", ") || null }]
          : [])
        : (setData ?? []).map(s => ({
            set_number: s.set_number,
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe,
            notes: s.notes,
            pain_flag: s.pain_flag,
            pain_area: s.pain_areas.length > 0 ? s.pain_areas.join(", ") : null,
          })),
    };
  });

  const detail = {
    workout_date: todayDate,
    training_type: workout.training_type,
    phase: workout.phase,
    session_rpe: log.session_rpe,
    notes: log.session_notes,
    completed: log.status === "completed",
    exercises: detailExercises,
  };

  if (existingIdx >= 0) {
    DEMO_MEMBER_HISTORY[existingIdx] = {
      ...DEMO_MEMBER_HISTORY[existingIdx],
      session_rpe: log.session_rpe,
      completed: log.status === "completed",
      exercise_count: totalLogged,
    };
    DEMO_HISTORY_DETAILS[entryId] = detail;
  } else {
    addDemoHistoryEntry(
      {
        id: entryId,
        workout_date: todayDate,
        training_type: workout.training_type,
        phase: workout.phase,
        session_rpe: log.session_rpe,
        completed: log.status === "completed",
        exercise_count: totalLogged,
      },
      detail,
    );
  }
}
