import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import type {
  DemoBlock,
  DemoExercise,
  BlockType,
  PreviousEntry,
  WorkoutLog,
  WorkoutLogSet,
  ConditioningLogEntry,
} from "@/lib/workout-types";
import {
  loadPublishedWorkoutForDate,
  upsertMultipleSetLogs,
  upsertSession,
  loadSetLogs,
  loadSession,
  loadExerciseHistory,
  type DbWorkout,
  type DbSetLog,
} from "@/lib/supabase-data";
import { DemoExerciseLogger } from "./DemoExerciseLogger";
import { DemoConditioningLogger } from "./DemoConditioningLogger";
import { ChevronRight, Check, Trophy, AlertTriangle, ArrowLeft, Pencil, Eye, TrendingUp, Dumbbell } from "lucide-react";
import { Link } from "@tanstack/react-router";

const CONDITIONING_TYPES: BlockType[] = ["emom", "amrap", "tabata", "finisher", "conditioning"];

export function DemoTodayWorkout({ onBack, userId }: { onBack?: () => void; userId?: string }) {
  const activeUserId = userId || "demo-user-001";
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Load published workout from Supabase
  const [workout, setWorkout] = useState<DbWorkout | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoadingWorkout(true);
    setWorkout(null);
    async function load() {
      try {
        const w = await loadPublishedWorkoutForDate(selectedDate);
        if (mounted) setWorkout(w);
      } catch (e) {
        console.error("Failed to load workout", e);
      }
      if (mounted) setLoadingWorkout(false);
    }
    load();
    return () => { mounted = false; };
  }, [selectedDate]);

  if (loadingWorkout) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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

  // Convert DbWorkout blocks to DemoBlock/DemoExercise for logger compatibility
  const demoWorkout = useMemo(() => {
    if (!workout) return null;
    return {
      id: workout.id,
      workout_date: workout.workout_date,
      training_type: workout.training_type,
      phase: workout.phase,
      notes: workout.notes,
      blocks: workout.blocks.map((b): DemoBlock => ({
        id: b.id,
        name: b.name,
        block_type: b.block_type as BlockType,
        notes: b.notes,
        sort_order: b.sort_order,
        exercises: b.exercises.map((e): DemoExercise => ({
          id: e.id,
          exercise_id: e.exercise_id,
          exercise_name: e.exercise_name,
          prescribed_sets: e.prescribed_sets,
          prescribed_reps: e.prescribed_reps,
          notes: e.notes,
          sort_order: e.sort_order,
        })),
      })),
    };
  }, [workout]);

  // Central log — in-memory during session, synced to Supabase on save
  const [log, setLog] = useState<WorkoutLog>({
    user_id: activeUserId,
    workout_id: workout?.id ?? "",
    workout_date: selectedDate,
    status: "not_started",
    session_rpe: null,
    session_notes: null,
    strength_logs: {},
    conditioning_logs: {},
    updated_at: new Date().toISOString(),
  });
  const [logLoaded, setLogLoaded] = useState(false);

  // Load existing set logs and session from Supabase
  useEffect(() => {
    if (!workout) return;
    let mounted = true;
    async function loadExisting() {
      try {
        const [existingLogs, existingSession] = await Promise.all([
          loadSetLogs(activeUserId, workout!.id),
          loadSession(activeUserId, workout!.id),
        ]);
        if (!mounted) return;
        // Convert DB set logs to WorkoutLogSet format
        const strengthLogs: Record<string, WorkoutLogSet[]> = {};
        for (const [exerciseId, sets] of Object.entries(existingLogs)) {
          strengthLogs[exerciseId] = sets.map(s => ({
            set_number: s.set_number,
            weight: s.weight ?? 0,
            reps: s.reps ?? 0,
            rpe: s.rpe ?? 0,
            notes: s.notes,
            pain_flag: s.pain_flag,
            pain_areas: s.pain_area ? [s.pain_area] : [],
          }));
        }
        setLog(prev => ({
          ...prev,
          workout_id: workout!.id,
          strength_logs: strengthLogs,
          status: existingSession?.completed ? "completed" : Object.keys(strengthLogs).length > 0 ? "in_progress" : "not_started",
          session_rpe: existingSession?.session_rpe ?? null,
          session_notes: existingSession?.notes ?? null,
        }));
      } catch (e) {
        console.error("Failed to load existing logs", e);
      }
      if (mounted) setLogLoaded(true);
    }
    loadExisting();
    return () => { mounted = false; };
  }, [workout, activeUserId]);

  const syncLog = useCallback((updatedLog: WorkoutLog) => {
    setLog(updatedLog);
  }, []);

  const [selectedExercise, setSelectedExercise] = useState<{ exercise: DemoExercise; block: DemoBlock } | null>(null);
  const [exerciseHistoryView, setExerciseHistoryView] = useState<{ exercise: DemoExercise; history: PreviousEntry[] } | null>(null);
  const [exerciseHistoryCache, setExerciseHistoryCache] = useState<Record<string, PreviousEntry[]>>({});
  const [showFinish, setShowFinish] = useState(false);
  const [showSavedSummary, setShowSavedSummary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [rpeError, setRpeError] = useState("");
  // Local edit buffers for session RPE/notes (synced on submit)
  const [sessionRpe, setSessionRpe] = useState(log.session_rpe?.toString() ?? "");
  const [sessionNotes, setSessionNotes] = useState(log.session_notes ?? "");

  if (!demoWorkout) return null;

  const completed = log.status === "completed";

  // Compute stats from central log
  const allExercises = demoWorkout.blocks.flatMap((b) => b.exercises);

  const totalPrescribedSets = useMemo(() => {
    let total = 0;
    for (const block of demoWorkout.blocks) {
      for (const ex of block.exercises) {
        const isCond = CONDITIONING_TYPES.includes(block.block_type);
        total += isCond ? 1 : ex.prescribed_sets; // conditioning counts as 1 required item
      }
    }
    return total;
  }, [demoWorkout]);

  const totalLoggedSets = useMemo(() => {
    let count = 0;
    for (const block of demoWorkout.blocks) {
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
  }, [log, demoWorkout]);

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
  const handleStrengthSave = async (exerciseId: string, sets: WorkoutLogSet[]) => {
    const updated: WorkoutLog = {
      ...log,
      status: log.status === "not_started" ? "in_progress" : log.status,
      strength_logs: { ...log.strength_logs, [exerciseId]: sets },
    };
    syncLog(updated);
    // Persist to Supabase
    try {
      const dbSets: DbSetLog[] = sets.map(s => ({
        set_number: s.set_number,
        weight: s.weight > 0 ? s.weight : null,
        reps: s.reps > 0 ? s.reps : null,
        rpe: s.rpe > 0 ? s.rpe : null,
        notes: s.notes,
        pain_flag: s.pain_flag,
        pain_area: s.pain_areas.length > 0 ? s.pain_areas[0] as DbSetLog["pain_area"] : null,
      }));
      await upsertMultipleSetLogs(activeUserId, demoWorkout.id, exerciseId, dbSets);
    } catch (e) {
      console.error("Failed to save set logs", e);
    }
  };

  const handleConditioningSave = async (data: ConditioningLogEntry) => {
    const updated: WorkoutLog = {
      ...log,
      status: log.status === "not_started" ? "in_progress" : log.status,
      conditioning_logs: { ...log.conditioning_logs, [data.exercise_id]: data },
    };
    syncLog(updated);
    // Persist conditioning as a single set log
    if (data.completed) {
      try {
        const dbSet: DbSetLog = {
          set_number: 1,
          weight: data.weight,
          reps: data.rounds,
          rpe: data.rpe,
          notes: data.notes,
          pain_flag: data.pain_areas.length > 0,
          pain_area: data.pain_areas.length > 0 ? data.pain_areas[0] as DbSetLog["pain_area"] : null,
        };
        // Find exercise_id for this conditioning exercise
        const exercise = demoWorkout.blocks.flatMap(b => b.exercises).find(e => e.exercise_id === data.exercise_id);
        if (exercise) {
          await upsertMultipleSetLogs(activeUserId, demoWorkout.id, exercise.exercise_id, [dbSet]);
        }
      } catch (e) {
        console.error("Failed to save conditioning log", e);
      }
    }
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

  // Load exercise history when an exercise is selected
  useEffect(() => {
    if (!selectedExercise || !workout) return;
    const exId = selectedExercise.exercise.exercise_id;
    if (exerciseHistoryCache[exId]) return; // already loaded
    let mounted = true;
    loadExerciseHistory(activeUserId, exId, workout.id).then((perfs) => {
      if (!mounted) return;
      const mapped: PreviousEntry[] = perfs.map(p => ({
        date: p.date,
        sets: p.sets,
        notes: p.notes,
      }));
      setExerciseHistoryCache(prev => ({ ...prev, [exId]: mapped }));
    }).catch(e => console.error("Failed to load exercise history", e));
    return () => { mounted = false; };
  }, [selectedExercise, activeUserId, workout]);

  // Selected exercise → logger
  if (selectedExercise) {
    const isCond = CONDITIONING_TYPES.includes(selectedExercise.block.block_type);
    const history: PreviousEntry[] = exerciseHistoryCache[selectedExercise.exercise.exercise_id] || [];
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
          {demoWorkout.blocks.map((block) => block.exercises.map((ex) => {
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
          <Button variant="secondary" onClick={() => setIsEditing(false)} className="h-12 w-full text-base">
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
                {format(new Date(demoWorkout.workout_date + "T00:00:00"), "EEEE, MMMM d")}
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
              const block = demoWorkout.blocks.find(b => b.exercises.some(e => e.id === ex.id))!;
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
              {demoWorkout.training_type.replace("_", " ")} · {demoWorkout.phase}
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
      const block = demoWorkout.blocks.find(b => b.exercises.some(e => e.id === ex.id))!;
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

      // Persist session to Supabase
      upsertSession(activeUserId, demoWorkout.id, true, rpeNum, sessionNotes || null)
        .catch(e => console.error("Failed to save session", e));
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
          {format(new Date(demoWorkout.workout_date + "T00:00:00"), "EEEE, MMMM d")}
        </p>
        <h2 className="text-xl font-bold text-foreground capitalize">
          {demoWorkout.training_type.replace("_", " ")}
        </h2>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-0 text-xs font-semibold">
            {demoWorkout.phase}
          </Badge>
        </div>
        {demoWorkout.notes && (
          <p className="text-sm text-muted-foreground italic">{demoWorkout.notes}</p>
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
        {demoWorkout.blocks.map((block) => {
          const isCond = CONDITIONING_TYPES.includes(block.block_type);
          return (
            <div key={block.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {block.name}
                </h3>
                {block.name.toLowerCase().replace(/\s+/g, "_") !== block.block_type && (
                  <Badge variant="outline" className="text-[10px] capitalize border-border">
                    {block.block_type.replace("_", " ")}
                  </Badge>
                )}
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
