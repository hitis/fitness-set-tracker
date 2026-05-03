import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight, AlertTriangle, Check, Search, X, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_MEMBER_HISTORY, DEMO_HISTORY_DETAILS, onHistoryUpdate, type HistoryWorkoutDetail, type HistoryExerciseDetail, type HistorySetLog } from "@/hooks/use-demo";
import { useNavigate } from "@tanstack/react-router";

function HistoryDetail({ detail, onBack }: { detail: HistoryWorkoutDetail; onBack: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<HistoryWorkoutDetail>(detail);
  const [expandedPain, setExpandedPain] = useState<string | null>(null);

  const updateSetField = (exIdx: number, setIdx: number, field: keyof HistorySetLog, value: number | string | boolean | null) => {
    setEditData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value })
      })
    }));
  };

  const saveEdits = () => {
    // Update the global demo data
    const historyId = Object.entries(DEMO_HISTORY_DETAILS).find(([, d]) => d === detail)?.[0];
    if (historyId) {
      DEMO_HISTORY_DETAILS[historyId] = editData;
      // Update summary RPE
      const entry = DEMO_MEMBER_HISTORY.find(h => h.id === historyId);
      if (entry) entry.session_rpe = editData.session_rpe;
    }
    Object.assign(detail, editData);
    setIsEditing(false);
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => { setIsEditing(false); onBack(); }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
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
              value={editData.session_rpe ?? ""}
              onChange={(e) => setEditData(prev => ({ ...prev, session_rpe: e.target.value ? parseInt(e.target.value) : null }))}
              className="h-10 bg-secondary border-0 text-center text-lg font-bold"
              placeholder="—"
            />
          ) : (
            <p className="text-lg font-bold text-foreground">{editData.session_rpe ?? "—"}</p>
          )}
          <p className="text-[10px] text-muted-foreground uppercase">RPE</p>
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
          value={editData.notes ?? ""}
          onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value || null }))}
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
        {editData.exercises.map((ex, exIdx) => (
          <div key={exIdx} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="font-semibold text-foreground">{ex.exercise_name}</p>
              <p className="text-xs text-muted-foreground">{ex.prescribed_sets} × {ex.prescribed_reps}</p>
            </div>
            <div className="divide-y divide-border">
              {ex.sets.map((set, setIdx) => (
                <div key={set.set_number} className="px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-muted-foreground">Set {set.set_number}</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase">Weight</label>
                          <Input
                            type="number" inputMode="decimal"
                            value={set.weight || ""}
                            onChange={(e) => updateSetField(exIdx, setIdx, "weight", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                            className="h-10 bg-secondary border-0 text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase">Reps</label>
                          <Input
                            type="number" inputMode="numeric"
                            value={set.reps || ""}
                            onChange={(e) => updateSetField(exIdx, setIdx, "reps", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                            className="h-10 bg-secondary border-0 text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase">RPE</label>
                          <Input
                            type="number" inputMode="numeric"
                            value={set.rpe || ""}
                            onChange={(e) => updateSetField(exIdx, setIdx, "rpe", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                            className="h-10 bg-secondary border-0 text-center font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="w-8 text-xs font-bold text-muted-foreground">S{set.set_number}</span>
                      <span className="text-sm font-semibold text-foreground min-w-[60px]">
                        {set.weight > 0 ? `${set.weight}kg` : "—"}
                      </span>
                      <span className="text-sm text-foreground">× {set.reps}</span>
                      <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                      {set.pain_flag && (
                        <button
                          onClick={() => setExpandedPain(expandedPain === `${exIdx}-${setIdx}` ? null : `${exIdx}-${setIdx}`)}
                          className="flex items-center gap-1 ml-auto text-destructive"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium capitalize">{set.pain_area || "Pain"}</span>
                        </button>
                      )}
                    </div>
                    {expandedPain === `${exIdx}-${setIdx}` && set.pain_flag && (
                      <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2 space-y-1">
                        <p className="text-xs text-destructive font-medium">Pain: {set.pain_area || "Not specified"}</p>
                        {set.notes && <p className="text-xs text-muted-foreground italic">{set.notes}</p>}
                      </div>
                    )}
                    {!set.pain_flag && set.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">{set.notes}</p>
                    )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="space-y-2">
          <Button onClick={saveEdits} className="h-12 w-full text-base font-bold">
            Save Changes
          </Button>
          <Button variant="secondary" onClick={() => { setEditData(detail); setIsEditing(false); }} className="h-12 w-full text-base">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function DemoWorkoutHistory({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [exerciseView, setExerciseView] = useState<{ name: string } | null>(null);

  useEffect(() => {
    return onHistoryUpdate(() => forceUpdate((n) => n + 1));
  }, []);

  // All unique exercise names for suggestions
  const allExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const detail of Object.values(DEMO_HISTORY_DETAILS)) {
      for (const ex of detail.exercises) names.add(ex.exercise_name);
    }
    return Array.from(names).sort();
  }, []);

  // Filtered suggestions based on search
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allExerciseNames.filter((n) =>
      n.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [searchQuery, allExerciseNames]);

  // Exercise history drill-down — grouped by exercise
  if (exerciseView) {
    const sessions: { date: string; detail: HistoryWorkoutDetail; exercise: HistoryExerciseDetail; historyId: string }[] = [];
    for (const h of DEMO_MEMBER_HISTORY) {
      const detail = DEMO_HISTORY_DETAILS[h.id];
      if (!detail) continue;
      for (const ex of detail.exercises) {
        if (ex.exercise_name === exerciseView.name) {
          sessions.push({ date: h.workout_date, detail, exercise: ex, historyId: h.id });
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
                    onClick={() => { setExerciseView(null); setSelectedId(s.historyId); }}
                    className="text-xs font-medium text-primary px-3 py-2 rounded-lg bg-primary/10 active:scale-95"
                  >
                    View workout
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {s.exercise.sets.map((set) => (
                    <div key={set.set_number} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-8 text-xs font-bold text-muted-foreground">S{set.set_number}</span>
                      <span className="text-sm font-semibold text-foreground min-w-[60px]">
                        {set.weight > 0 ? `${set.weight}kg` : "—"}
                      </span>
                      <span className="text-sm text-foreground">× {set.reps}</span>
                      <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                      {set.pain_flag && (
                        <span className="flex items-center gap-0.5 text-destructive ml-auto">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="text-[10px] capitalize">{set.pain_area || "Pain"}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Search results — grouped by exercise name
  if (searchQuery.trim() && suggestions.length === 0) {
    // Build exercise-grouped results
    const exerciseGroups: Record<string, { date: string; sets: HistoryExerciseDetail["sets"]; historyId: string; detail: HistoryWorkoutDetail }[]> = {};
    for (const h of DEMO_MEMBER_HISTORY) {
      const detail = DEMO_HISTORY_DETAILS[h.id];
      if (!detail) continue;
      for (const ex of detail.exercises) {
        if (ex.exercise_name.toLowerCase().includes(searchQuery.toLowerCase())) {
          if (!exerciseGroups[ex.exercise_name]) exerciseGroups[ex.exercise_name] = [];
          exerciseGroups[ex.exercise_name].push({ date: h.workout_date, sets: ex.sets, historyId: h.id, detail });
        }
      }
    }
    const groupNames = Object.keys(exerciseGroups).sort();

    if (groupNames.length > 0) {
      return (
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Workout History</h2>
          {/* Search bar */}
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
                        <div key={set.set_number} className="flex items-center gap-2 text-sm">
                          <span className="w-8 text-xs text-muted-foreground">S{set.set_number}</span>
                          <span className="font-semibold text-foreground">
                            {set.weight > 0 ? `${set.weight}kg` : "—"} × {set.reps}
                          </span>
                          <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                          {set.pain_flag && (
                            <span className="flex items-center gap-0.5 text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-[10px] capitalize">{set.pain_area || "Pain"}</span>
                            </span>
                          )}
                        </div>
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

  if (selectedId) {
    const detail = DEMO_HISTORY_DETAILS[selectedId];
    if (detail) {
      return <HistoryDetail detail={detail} onBack={() => setSelectedId(null)} />;
    }
  }

  const filteredHistory = DEMO_MEMBER_HISTORY;

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

      {/* Search */}
      {DEMO_MEMBER_HISTORY.length > 0 && (
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
          {/* Suggestions dropdown */}
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
              key={h.id}
              onClick={() => setSelectedId(h.id)}
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
                  {h.exercise_count} sets logged
                  {h.session_rpe != null && (
                    <span className="inline-flex items-center gap-0.5 ml-1">
                      · <Star className="h-3 w-3 inline text-primary" /> {h.session_rpe}/10
                    </span>
                  )}
                  {(() => {
                    const detail = DEMO_HISTORY_DETAILS[h.id];
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