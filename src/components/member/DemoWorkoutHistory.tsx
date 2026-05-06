import { useState, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight, AlertTriangle, Check, Search, X, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { HistorySetLog, WorkoutLogSet } from "@/lib/workout-types";
import {
  loadUserHistory,
  loadHistoryDetail,
  upsertSession,
  type HistoryEntry,
  type HistoryDetailData,
} from "@/lib/supabase-data";
import { DemoExerciseLogger } from "./DemoExerciseLogger";
import { useNavigate } from "@tanstack/react-router";

interface HistoryExerciseDetail {
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  sets: HistorySetLog[];
}

interface HistoryWorkoutDetail {
  workout_date: string;
  training_type: string;
  phase: string;
  session_rpe: number | null;
  notes: string | null;
  completed: boolean;
  exercises: HistoryExerciseDetail[];
}

function dbDetailToLocal(d: HistoryDetailData): HistoryWorkoutDetail {
  return {
    workout_date: d.workout_date,
    training_type: d.training_type,
    phase: d.phase,
    session_rpe: d.session_rpe,
    notes: d.notes,
    completed: d.completed,
    exercises: d.exercises.map(ex => ({
      exercise_name: ex.exercise_name,
      prescribed_sets: ex.prescribed_sets,
      prescribed_reps: ex.prescribed_reps,
      sets: ex.sets.map(s => ({
        set_number: s.set_number,
        weight: s.weight ?? 0,
        reps: s.reps ?? 0,
        rpe: s.rpe ?? 0,
        notes: s.notes,
        pain_flag: s.pain_flag,
        pain_area: s.pain_area as string | null,
      })),
    })),
  };
}

// ─── Conversion helpers ────────────────────────────────────
function toFakeExercise(ex: HistoryExerciseDetail, idx: number) {
  return {
    id: `hist-ex-${idx}`,
    exercise_id: `hist-exd-${idx}`,
    exercise_name: ex.exercise_name,
    prescribed_sets: ex.prescribed_sets,
    prescribed_reps: ex.prescribed_reps,
    notes: null as string | null,
    sort_order: idx,
  };
}

function toWorkoutLogSets(sets: HistorySetLog[]): WorkoutLogSet[] {
  return sets.map((s) => ({
    set_number: s.set_number,
    weight: s.weight,
    reps: s.reps,
    rpe: s.rpe,
    notes: s.notes,
    pain_flag: s.pain_flag,
    pain_areas: s.pain_area ? s.pain_area.split(", ").filter(Boolean) : [],
  }));
}

function fromWorkoutLogSets(sets: WorkoutLogSet[]): HistorySetLog[] {
  return sets.map((s) => ({
    set_number: s.set_number,
    weight: s.weight,
    reps: s.reps,
    rpe: s.rpe,
    notes: s.notes,
    pain_flag: s.pain_flag,
    pain_area: s.pain_areas.length > 0 ? s.pain_areas.join(", ") : null,
  }));
}

// ─── Set Row Display ───────────────────────────────────────
function SetRowDisplay({ set }: { set: HistorySetLog }) {
  return (
    <div className="px-4 py-3 space-y-1">
      <div className="flex items-center gap-3">
        <span className="w-8 text-xs font-bold text-muted-foreground shrink-0">S{set.set_number}</span>
        <span className="text-sm font-semibold text-foreground min-w-[60px]">{set.weight > 0 ? `${set.weight}kg` : "—"}</span>
        <span className="text-sm text-foreground">× {set.reps}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">RPE {set.rpe}</span>
      </div>
      {set.pain_flag && set.pain_area && (
        <div className="flex items-center gap-1.5 pl-8 text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="text-xs capitalize">Pain: {set.pain_area}</span>
        </div>
      )}
      {set.notes && (
        <p className="text-xs text-muted-foreground italic pl-8">Note: {set.notes}</p>
      )}
    </div>
  );
}

// ─── History Detail ────────────────────────────────────────
function HistoryDetail({ detail, workoutId, userId, onBack, onUpdated }: {
  detail: HistoryWorkoutDetail;
  workoutId: string;
  userId: string;
  onBack: () => void;
  onUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<HistoryWorkoutDetail>(() => JSON.parse(JSON.stringify(detail)));
  const [selectedExIdx, setSelectedExIdx] = useState<number | null>(null);
  const [sessionRpeError, setSessionRpeError] = useState("");
  const [editSessionRpe, setEditSessionRpe] = useState(editData.session_rpe?.toString() ?? "");
  const [editSessionNotes, setEditSessionNotes] = useState(editData.notes ?? "");

  const saveEdits = () => {
    if (editSessionRpe) {
      const rpe = parseInt(editSessionRpe);
      if (isNaN(rpe) || rpe < 1 || rpe > 10) {
        setSessionRpeError("RPE must be 1–10");
        return;
      }
    }
    setSessionRpeError("");

    const finalData: HistoryWorkoutDetail = {
      ...editData,
      session_rpe: editSessionRpe ? parseInt(editSessionRpe) : null,
      notes: editSessionNotes || null,
    };

    setEditData(finalData);
    setIsEditing(false);
    upsertSession(userId, workoutId, finalData.completed, finalData.session_rpe, finalData.notes)
      .catch(e => console.error("Failed to save session edit", e));
    onUpdated();
  };

  const handleStrengthSave = useCallback((exIdx: number, sets: WorkoutLogSet[]) => {
    setEditData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex,
        sets: fromWorkoutLogSets(sets),
      }),
    }));
  }, []);

  // Exercise selected for editing → open full logger
  if (selectedExIdx !== null) {
    const ex = editData.exercises[selectedExIdx];
    if (ex) {
      const fakeExercise = toFakeExercise(ex, selectedExIdx);
      const existingSets = toWorkoutLogSets(ex.sets);
      const capturedIdx = selectedExIdx;
      return (
        <DemoExerciseLogger
          exercise={fakeExercise}
          previousHistory={[]}
          onBack={() => setSelectedExIdx(null)}
          onSaveSets={() => {}}
          onSetDataChange={(sets) => {
            handleStrengthSave(capturedIdx, sets);
            setSelectedExIdx(null);
          }}
          initialSetData={existingSets}
        />
      );
    }
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground capitalize flex-1">
            {editData.training_type.replace("_", " ")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {format(new Date(editData.workout_date + "T00:00:00"), "EEEE, MMMM d")} · {editData.phase}
          </p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="ml-auto flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground active:scale-95">
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{editData.exercises.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Exercises</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          {isEditing ? (
            <Input
              type="number" inputMode="numeric" min="1" max="10"
              value={editSessionRpe}
              onChange={(e) => { setEditSessionRpe(e.target.value); setSessionRpeError(""); }}
              className={`h-10 bg-secondary border-0 text-center text-lg font-bold ${sessionRpeError ? "border-2 border-destructive" : ""}`}
              placeholder="—"
            />
          ) : (
            <p className="text-lg font-bold text-foreground">{editData.session_rpe ?? "—"}</p>
          )}
          <p className="text-[10px] text-muted-foreground uppercase">RPE</p>
          {sessionRpeError && <p className="text-[9px] text-destructive mt-0.5">{sessionRpeError}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-primary">
            {(() => {
              const totalSets = editData.exercises.reduce((sum, ex) => sum + ex.prescribed_sets, 0);
              const loggedSets = editData.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
              return totalSets > 0 ? Math.round((loggedSets / totalSets) * 100) + "%" : "—";
            })()}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Complete</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">
            {editData.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Sets</p>
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={editSessionNotes}
          onChange={(e) => setEditSessionNotes(e.target.value)}
          className="bg-secondary border-0 text-sm"
          placeholder="Session notes..."
          rows={2}
        />
      ) : (
        editData.notes && (
          <p className="text-sm text-muted-foreground italic rounded-xl bg-card/50 border border-border p-3">{editData.notes}</p>
        )
      )}

      {/* Exercises + Sets */}
      <div className="space-y-4">
        {isEditing ? (
          <>
            <p className="text-sm text-muted-foreground">Tap an exercise to edit sets, notes, and pain areas.</p>
            <div className="space-y-2">
              {editData.exercises.map((ex, exIdx) => {
                const loggedCount = ex.sets.length;
                const status = loggedCount >= ex.prescribed_sets ? "completed" : loggedCount > 0 ? "partial" : "not_started";
                return (
                  <button
                    key={exIdx}
                    onClick={() => setSelectedExIdx(exIdx)}
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
                      <p className="text-xs text-muted-foreground">{loggedCount}/{ex.prescribed_sets} sets</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          editData.exercises.map((ex, exIdx) => (
            <div key={exIdx} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="font-semibold text-foreground">{ex.exercise_name}</p>
                <p className="text-xs text-muted-foreground">{ex.prescribed_sets} × {ex.prescribed_reps}</p>
              </div>
              <div className="divide-y divide-border">
                {ex.sets.map((set) => (
                  <SetRowDisplay key={set.set_number} set={set} />
                ))}
                {ex.sets.length === 0 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground italic">No sets logged</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isEditing && (
        <div className="space-y-2">
          <Button onClick={saveEdits} className="h-12 w-full text-base font-bold">Save Changes</Button>
          <Button variant="secondary" onClick={() => {
            setEditData(JSON.parse(JSON.stringify(detail)));
            setEditSessionRpe(detail.session_rpe?.toString() ?? "");
            setEditSessionNotes(detail.notes ?? "");
            setIsEditing(false);
          }} className="h-12 w-full text-base">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main History Component ────────────────────────────────
export function DemoWorkoutHistory({ onBack, userId }: { onBack?: () => void; userId?: string }) {
  const navigate = useNavigate();
  const activeUserId = userId || "demo-user-001";
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [exerciseView, setExerciseView] = useState<{ name: string } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [details, setDetails] = useState<Record<string, HistoryWorkoutDetail>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const entries = await loadUserHistory(activeUserId);
        if (!mounted) return;
        setHistory(entries);
        const detailMap: Record<string, HistoryWorkoutDetail> = {};
        for (const entry of entries) {
          const d = await loadHistoryDetail(activeUserId, entry.workout_id);
          if (d && mounted) detailMap[entry.workout_id] = dbDetailToLocal(d);
        }
        if (mounted) setDetails(detailMap);
      } catch (e) {
        console.error("Failed to load history", e);
      }
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [activeUserId]);

  const allExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const detail of Object.values(details)) {
      for (const ex of detail.exercises) names.add(ex.exercise_name);
    }
    return Array.from(names).sort();
  }, [details]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allExerciseNames.filter((n) =>
      n.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [searchQuery, allExerciseNames]);

  // Exercise history drill-down
  if (exerciseView) {
    const sessions: { date: string; detail: HistoryWorkoutDetail; exercise: HistoryExerciseDetail; historyId: string }[] = [];
    for (const h of history) {
      const detail = details[h.workout_id];
      if (!detail) continue;
      for (const ex of detail.exercises) {
        if (ex.exercise_name === exerciseView.name) {
          sessions.push({ date: h.workout_date, detail, exercise: ex, historyId: h.workout_id });
        }
      }
    }

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setExerciseView(null)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted-foreground active:scale-95 transition-transform">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-foreground">{exerciseView.name}</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No history for this exercise.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {format(new Date(s.date + "T00:00:00"), "EEE, MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{s.detail.training_type.replace("_", " ")} · {s.detail.phase}</p>
                  </div>
                  <button
                    onClick={() => { setExerciseView(null); setSelectedWorkoutId(s.historyId); }}
                    className="text-xs font-medium text-primary px-3 py-2 rounded-lg bg-primary/10 active:scale-95"
                  >
                    View workout
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {s.exercise.sets.map((set) => (
                    <SetRowDisplay key={set.set_number} set={set} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Search results
  if (searchQuery.trim() && suggestions.length === 0) {
    const exerciseGroups: Record<string, { date: string; sets: HistoryExerciseDetail["sets"]; historyId: string; detail: HistoryWorkoutDetail }[]> = {};
    for (const h of history) {
      const detail = details[h.workout_id];
      if (!detail) continue;
      for (const ex of detail.exercises) {
        if (ex.exercise_name.toLowerCase().includes(searchQuery.toLowerCase())) {
          if (!exerciseGroups[ex.exercise_name]) exerciseGroups[ex.exercise_name] = [];
          exerciseGroups[ex.exercise_name].push({ date: h.workout_date, sets: ex.sets, historyId: h.workout_id, detail });
        }
      }
    }
    const groupNames = Object.keys(exerciseGroups).sort();

    if (groupNames.length > 0) {
      return (
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Workout History</h2>
          <div className="relative" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises (e.g. squat, press)"
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{groupNames.length} exercise{groupNames.length !== 1 ? "s" : ""} found</p>
          <div className="space-y-5">
            {groupNames.map((name) => (
              <div key={name} className="space-y-2">
                <button
                  onClick={() => { setSearchQuery(""); setExerciseView({ name }); }}
                  className="text-sm font-bold text-primary underline"
                >
                  {name}
                </button>
                <div className="space-y-1 pl-1">
                  {exerciseGroups[name].map((entry, i) => (
                    <div key={i} className="rounded-lg bg-card border border-border p-3 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {format(new Date(entry.date + "T00:00:00"), "MMM d")}
                      </p>
                      {entry.sets.map((set) => (
                        <SetRowDisplay key={set.set_number} set={set} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  if (selectedWorkoutId) {
    const detail = details[selectedWorkoutId];
    if (detail) {
      return <HistoryDetail detail={detail} workoutId={selectedWorkoutId} userId={activeUserId} onBack={() => setSelectedWorkoutId(null)} onUpdated={() => forceUpdate(n => n + 1)} />;
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filteredHistory = history;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onBack ? onBack() : navigate({ to: "/" })}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground">Workout History</h2>
      </div>

      {history.length > 0 && (
        <div className="relative" role="search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises (e.g. squat, press)"
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {searchQuery.trim() && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              {suggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => { setSearchQuery(""); setExerciseView({ name }); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors active:bg-secondary/80"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filteredHistory.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {searchQuery ? "No workouts found matching your search." : "No workout history yet. Complete a workout to see it here."}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredHistory.map((h) => (
            <button
              key={h.workout_id}
              onClick={() => setSelectedWorkoutId(h.workout_id)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98] min-h-[72px]"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">
                    {format(new Date(h.workout_date + "T00:00:00"), "EEE, MMM d")}
                  </p>
                  {h.completed ? (
                    <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
                      <Check className="h-3 w-3 mr-0.5" />
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">In progress</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {h.training_type.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {h.phase}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {h.set_count} sets logged
                  {h.session_rpe != null && (
                    <span className="inline-flex items-center gap-0.5 ml-1">
                      · <Star className="h-3 w-3 inline text-primary" /> {h.session_rpe}/10
                    </span>
                  )}
                  {(() => {
                    const detail = details[h.workout_id];
                    if (!detail) return null;
                    const totalSets = detail.exercises.reduce((sum, ex) => sum + ex.prescribed_sets, 0);
                    const loggedSets = detail.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                    const pct = totalSets > 0 ? Math.round((loggedSets / totalSets) * 100) : 0;
                    return <span className="ml-1 text-primary font-semibold">· {pct}%</span>;
                  })()}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
