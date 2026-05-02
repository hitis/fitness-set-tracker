import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight, AlertTriangle, Check, Search, X, Star } from "lucide-react";
import { DEMO_MEMBER_HISTORY, DEMO_HISTORY_DETAILS, onHistoryUpdate, type HistoryWorkoutDetail, type HistoryExerciseDetail } from "@/hooks/use-demo";

function HistoryDetail({ detail, onBack }: { detail: HistoryWorkoutDetail; onBack: () => void }) {
  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground capitalize">
            {detail.training_type.replace("_", " ")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {format(new Date(detail.workout_date + "T00:00:00"), "EEEE, MMMM d")} · {detail.phase}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{detail.exercises.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Exercises</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{detail.session_rpe ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground uppercase">RPE</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-primary">
            {detail.completed ? <Check className="h-5 w-5 mx-auto" /> : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Status</p>
        </div>
      </div>

      {detail.notes && (
        <p className="text-sm text-muted-foreground italic rounded-xl bg-card/50 border border-border p-3">{detail.notes}</p>
      )}

      {/* Exercises + Sets */}
      <div className="space-y-4">
        {detail.exercises.map((ex, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="font-semibold text-foreground">{ex.exercise_name}</p>
              <p className="text-xs text-muted-foreground">{ex.prescribed_sets} × {ex.prescribed_reps}</p>
            </div>
            <div className="divide-y divide-border">
              {ex.sets.map((set) => (
                <div key={set.set_number} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-8 text-xs font-bold text-muted-foreground">S{set.set_number}</span>
                  <span className="text-sm font-semibold text-foreground min-w-[60px]">
                    {set.weight > 0 ? `${set.weight}kg` : "BW"}
                  </span>
                  <span className="text-sm text-foreground">× {set.reps}</span>
                  <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                  {set.pain_flag && (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto" />
                  )}
                  {set.notes && (
                    <span className="text-xs text-muted-foreground italic ml-auto truncate max-w-[80px]">{set.notes}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoWorkoutHistory() {
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

  // Exercise history drill-down
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
                        {set.weight > 0 ? `${set.weight}kg` : "BW"}
                      </span>
                      <span className="text-sm text-foreground">× {set.reps}</span>
                      <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                      {set.pain_flag && <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto" />}
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

  if (selectedId) {
    const detail = DEMO_HISTORY_DETAILS[selectedId];
    if (detail) {
      return <HistoryDetail detail={detail} onBack={() => setSelectedId(null)} />;
    }
  }

  // Filter history by exercise name search
  const filteredHistory = searchQuery.trim()
    ? DEMO_MEMBER_HISTORY.filter((h) => {
        const detail = DEMO_HISTORY_DETAILS[h.id];
        if (!detail) return false;
        return detail.exercises.some((ex) =>
          ex.exercise_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : DEMO_MEMBER_HISTORY;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Workout History</h2>

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