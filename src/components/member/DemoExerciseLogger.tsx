import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, Check } from "lucide-react";
import type { DemoExercise } from "@/hooks/use-demo";

interface PreviousPerformance {
  weight: number;
  reps: number;
  rpe: number;
  notes: string | null;
}

interface SetLog {
  set_number: number;
  weight: string;
  reps: string;
  rpe: string;
  notes: string;
  pain_flag: boolean;
  pain_area: string;
  showNotes: boolean;
  saved: boolean;
}

const PAIN_AREAS = ["wrist", "shoulder", "back", "knee", "ankle", "other"];

export function DemoExerciseLogger({
  exercise,
  previous,
  onBack,
  onSaveSets,
}: {
  exercise: DemoExercise;
  previous: PreviousPerformance | null;
  onBack: () => void;
  onSaveSets: (count: number) => void;
}) {
  const [sets, setSets] = useState<SetLog[]>(() =>
    Array.from({ length: exercise.prescribed_sets }, (_, i) => ({
      set_number: i + 1,
      weight: previous ? previous.weight.toString() : "",
      reps: previous ? previous.reps.toString() : "",
      rpe: previous ? previous.rpe.toString() : "",
      notes: "",
      pain_flag: false,
      pain_area: "",
      showNotes: false,
      saved: false,
    }))
  );

  const updateSet = (setNum: number, field: keyof SetLog, value: string | boolean) => {
    setSets((prev) => {
      const updated = prev.map((s) =>
        s.set_number === setNum ? { ...s, [field]: value, saved: false } : s
      );
      // Auto-save + auto-fill next set
      const setLog = updated.find((s) => s.set_number === setNum);
      if (setLog && (setLog.weight || setLog.reps)) {
        setTimeout(() => {
          setSets((p) => {
            const withSaved = p.map((s) => (s.set_number === setNum ? { ...s, saved: true } : s));
            // Auto-fill next empty set
            const current = withSaved.find((s) => s.set_number === setNum);
            if (current) {
              const nextSet = withSaved.find((s) => s.set_number === setNum + 1 && !s.weight && !s.reps);
              if (nextSet) {
                return withSaved.map((s) =>
                  s.set_number === nextSet.set_number
                    ? { ...s, weight: current.weight, reps: current.reps, rpe: current.rpe }
                    : s
                );
              }
            }
            return withSaved;
          });
          onSaveSets(updated.filter((s) => s.weight || s.reps).length);
        }, 300);
      }
      return updated;
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1 text-muted-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">{exercise.exercise_name}</h2>
          <p className="text-sm text-muted-foreground">
            {exercise.prescribed_sets} × {exercise.prescribed_reps}
          </p>
        </div>
      </div>

      {previous && (
        <div className="rounded-lg bg-primary/10 p-3">
          <p className="text-xs font-medium text-primary mb-1">Last time</p>
          <p className="text-sm font-semibold text-foreground">
            {previous.weight}kg × {previous.reps} reps · RPE {previous.rpe}
          </p>
          {previous.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{previous.notes}</p>
          )}
        </div>
      )}

      {exercise.notes && (
        <div className="rounded-lg bg-secondary p-3">
          <p className="text-sm text-muted-foreground">{exercise.notes}</p>
        </div>
      )}

      <div className="space-y-3">
        {sets.map((set) => (
          <div key={set.set_number} className="rounded-xl bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Set {set.set_number}</span>
              {set.saved && <Check className="h-4 w-4 text-primary" />}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Weight (kg)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(e) => updateSet(set.set_number, "weight", e.target.value)}
                  className="h-14 bg-secondary text-center text-xl font-bold"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Reps</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={set.reps}
                  onChange={(e) => updateSet(set.set_number, "reps", e.target.value)}
                  className="h-14 bg-secondary text-center text-xl font-bold"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">RPE</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  value={set.rpe}
                  onChange={(e) => updateSet(set.set_number, "rpe", e.target.value)}
                  className="h-14 bg-secondary text-center text-xl font-bold"
                  placeholder="—"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!set.showNotes ? (
                <button
                  onClick={() => setSets((p) => p.map((s) => s.set_number === set.set_number ? { ...s, showNotes: true } : s))}
                  className="text-xs text-muted-foreground underline"
                >
                  + Notes
                </button>
              ) : null}
              <button
                onClick={() => updateSet(set.set_number, "pain_flag", !set.pain_flag)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  set.pain_flag
                    ? "bg-destructive/20 text-destructive"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Pain
              </button>
            </div>
            {set.pain_flag && (
              <div className="flex flex-wrap gap-1">
                {PAIN_AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => updateSet(set.set_number, "pain_area", area)}
                    className={`rounded-md px-2 py-1 text-xs capitalize transition-colors ${
                      set.pain_area === area
                        ? "bg-destructive/20 text-destructive"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            )}
            {set.showNotes && (
              <Textarea
                value={set.notes}
                onChange={(e) => updateSet(set.set_number, "notes", e.target.value)}
                className="bg-secondary text-sm"
                placeholder="How did it feel?"
                rows={1}
                autoFocus
              />
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={onBack} className="h-12 w-full text-base">
        ← Back to Workout
      </Button>
    </div>
  );
}