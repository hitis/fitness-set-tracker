import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight, AlertTriangle, Check } from "lucide-react";
import { DEMO_MEMBER_HISTORY, DEMO_HISTORY_DETAILS, type HistoryWorkoutDetail } from "@/hooks/use-demo";

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

  if (selectedId) {
    const detail = DEMO_HISTORY_DETAILS[selectedId];
    if (detail) {
      return <HistoryDetail detail={detail} onBack={() => setSelectedId(null)} />;
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Workout History</h2>
      {DEMO_MEMBER_HISTORY.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No workout history yet. Complete a workout to see it here.
        </p>
      ) : (
        <div className="space-y-2">
          {DEMO_MEMBER_HISTORY.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedId(h.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">
                    {format(new Date(h.workout_date + "T00:00:00"), "EEE, MMM d")}
                  </p>
                  {h.completed && (
                    <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Done</Badge>
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
                  {h.session_rpe != null && ` · RPE ${h.session_rpe}/10`}
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