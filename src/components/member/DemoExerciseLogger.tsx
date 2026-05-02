import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, Check, Copy, ChevronDown, ChevronUp, Info } from "lucide-react";
import { format } from "date-fns";
import type { DemoExercise, PreviousEntry } from "@/hooks/use-demo";

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
  warnings: string[];
}

const PAIN_AREAS = ["wrist", "shoulder", "back", "knee", "ankle", "other"];

function getLastSessionAvgWeight(history: PreviousEntry[]): number | null {
  if (!history.length || !history[0].sets.length) return null;
  const sets = history[0].sets;
  return sets.reduce((sum, s) => sum + s.weight, 0) / sets.length;
}

export function DemoExerciseLogger({
  exercise,
  previousHistory,
  onBack,
  onSaveSets,
  onViewExerciseHistory,
}: {
  exercise: DemoExercise;
  previousHistory: PreviousEntry[];
  onBack: () => void;
  onSaveSets: (count: number) => void;
  onViewExerciseHistory?: () => void;
}) {
  const [sets, setSets] = useState<SetLog[]>(() =>
    Array.from({ length: exercise.prescribed_sets }, (_, i) => ({
      set_number: i + 1,
      weight: "",
      reps: "",
      rpe: "",
      notes: "",
      pain_flag: false,
      pain_area: "",
      showNotes: false,
      saved: false,
      warnings: [],
    }))
  );
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<number>>(new Set());

  const lastSessionAvg = getLastSessionAvgWeight(previousHistory);

  const updateSet = (setNum: number, field: keyof SetLog, value: string | boolean) => {
    setSets((prev) =>
      prev.map((s) =>
        s.set_number === setNum ? { ...s, [field]: value, saved: false, warnings: [] } : s
      )
    );
  };

  const saveSet = (setNum: number) => {
    setSets((prev) => {
      const current = prev.find((s) => s.set_number === setNum);
      if (!current) return prev;

      // Validate RPE
      const rpeNum = current.rpe ? parseInt(current.rpe) : null;
      if (rpeNum !== null && (rpeNum < 1 || rpeNum > 10)) {
        return prev.map((s) =>
          s.set_number === setNum ? { ...s, warnings: ["RPE must be between 1 and 10"] } : s
        );
      }

      // Weight deviation warnings
      const w = current.weight ? parseFloat(current.weight) : null;
      const warnings: string[] = [];
      if (w !== null && w > 0 && !dismissedWarnings.has(setNum)) {
        const prevSet = prev.find((s) => s.set_number === setNum - 1 && s.saved);
        if (prevSet?.weight) {
          const pv = parseFloat(prevSet.weight);
          if (pv > 0 && Math.abs(w - pv) / pv > 0.3) {
            warnings.push(`Large weight change vs previous set (${pv}kg → ${w}kg)`);
          }
        }
        if (lastSessionAvg !== null && lastSessionAvg > 0 && Math.abs(w - lastSessionAvg) / lastSessionAvg > 0.3) {
          warnings.push(`Weight is ${w > lastSessionAvg ? "significantly higher" : "significantly lower"} than last session avg (${Math.round(lastSessionAvg)}kg)`);
        }
      }

      if (warnings.length > 0) {
        return prev.map((s) => (s.set_number === setNum ? { ...s, warnings } : s));
      }

      const updated = prev.map((s) =>
        s.set_number === setNum ? { ...s, saved: true, warnings: [] } : s
      );
      onSaveSets(updated.filter((s) => s.saved).length);
      return updated;
    });
  };

  const confirmAndSave = (setNum: number) => {
    setDismissedWarnings((prev) => new Set(prev).add(setNum));
    setSets((prev) => {
      const updated = prev.map((s) =>
        s.set_number === setNum ? { ...s, saved: true, warnings: [] } : s
      );
      onSaveSets(updated.filter((s) => s.saved).length);
      return updated;
    });
  };

  const copyLastSet = (setNum: number) => {
    setSets((prev) => {
      const prevSet = prev.find((s) => s.set_number === setNum - 1);
      if (!prevSet) return prev;
      return prev.map((s) =>
        s.set_number === setNum
          ? { ...s, weight: prevSet.weight, reps: prevSet.reps, rpe: prevSet.rpe, saved: false, warnings: [] }
          : s
      );
    });
  };

  const historyToShow = showFullHistory ? previousHistory : previousHistory.slice(0, 2);

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{exercise.exercise_name}</h2>
          <div className="flex gap-3 text-sm font-medium text-muted-foreground">
            <span>Sets: {exercise.prescribed_sets}</span>
            <span>Reps: {exercise.prescribed_reps}</span>
          </div>
        </div>
      </div>

      {exercise.notes && (
        <div className="rounded-xl border border-border bg-card/50 p-3">
          <p className="text-sm text-muted-foreground">{exercise.notes}</p>
        </div>
      )}

      {/* Previous History - Set-wise */}
      {previousHistory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Previous History</h3>
          <div className="space-y-3">
            {historyToShow.map((entry, i) => (
              <div key={i} className="rounded-lg bg-secondary/50 px-3 py-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {format(new Date(entry.date + "T00:00:00"), "MMM d")}
                </p>
                <div className="space-y-0.5">
                  {entry.sets.map((s) => (
                    <div key={s.set_number} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-xs text-muted-foreground">S{s.set_number}</span>
                      <span className="font-semibold text-foreground">
                        {s.weight > 0 ? `${s.weight}kg` : "BW"} × {s.reps}
                      </span>
                      <span className="text-xs text-muted-foreground">RPE {s.rpe}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            {previousHistory.length > 2 && (
              <button
                onClick={() => setShowFullHistory(!showFullHistory)}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                {showFullHistory ? (
                  <><ChevronUp className="h-3 w-3" /> Show less</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> View full history</>
                )}
              </button>
            )}
            {onViewExerciseHistory && (
              <button onClick={onViewExerciseHistory} className="text-xs font-medium text-primary underline">
                All sessions →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Set Logging */}
      <div className="space-y-3">
        {sets.map((set) => (
          <div key={set.set_number} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Set {set.set_number}</span>
              <div className="flex items-center gap-2">
                {set.set_number > 1 && (
                  <button
                    onClick={() => copyLastSet(set.set_number)}
                    className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                    Copy last
                  </button>
                )}
                {set.saved && (
                  <div className="flex items-center gap-1 text-primary">
                    <Check className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Saved</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Weight</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(e) => updateSet(set.set_number, "weight", e.target.value)}
                  className="h-14 bg-secondary border-0 text-center text-xl font-bold"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reps</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={set.reps}
                  onChange={(e) => updateSet(set.set_number, "reps", e.target.value)}
                  className="h-14 bg-secondary border-0 text-center text-xl font-bold"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">RPE (1-10)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  value={set.rpe}
                  onChange={(e) => updateSet(set.set_number, "rpe", e.target.value)}
                  className="h-14 bg-secondary border-0 text-center text-xl font-bold"
                  placeholder="—"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!set.showNotes && (
                <button
                  onClick={() => setSets((p) => p.map((s) => s.set_number === set.set_number ? { ...s, showNotes: true } : s))}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Notes
                </button>
              )}
              <button
                onClick={() => updateSet(set.set_number, "pain_flag", !set.pain_flag)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  set.pain_flag
                    ? "bg-destructive/20 text-destructive"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Pain / Discomfort
              </button>
              {!set.saved && (set.weight || set.reps) && set.warnings.length === 0 && (
                <button
                  onClick={() => saveSet(set.set_number)}
                  className="ml-auto rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors"
                >
                  Save
                </button>
              )}
            </div>

            {/* Warnings */}
            {set.warnings.length > 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-2">
                {set.warnings.map((w, wi) => (
                  <div key={wi} className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{w}</p>
                  </div>
                ))}
                {!set.warnings.some((w) => w.startsWith("RPE")) ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => confirmAndSave(set.set_number)}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                    >
                      Confirm & Save
                    </button>
                    <button
                      onClick={() => setSets((p) => p.map((s) => s.set_number === set.set_number ? { ...s, warnings: [] } : s))}
                      className="rounded-md bg-secondary px-3 py-1 text-xs text-muted-foreground"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSets((p) => p.map((s) => s.set_number === set.set_number ? { ...s, warnings: [] } : s))}
                    className="rounded-md bg-secondary px-3 py-1 text-xs text-muted-foreground"
                  >
                    Fix value
                  </button>
                )}
              </div>
            )}

            {set.pain_flag && (
              <div className="space-y-2">
                <p className="text-xs text-destructive font-medium">Where do you feel pain/discomfort?</p>
                <div className="flex flex-wrap gap-1">
                  {PAIN_AREAS.map((area) => (
                    <button
                      key={area}
                      onClick={() => updateSet(set.set_number, "pain_area", area)}
                      className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                        set.pain_area === area
                          ? "bg-destructive/20 text-destructive"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {set.showNotes && (
              <Textarea
                value={set.notes}
                onChange={(e) => updateSet(set.set_number, "notes", e.target.value)}
                className="bg-secondary border-0 text-sm"
                placeholder="How did it feel?"
                rows={1}
                autoFocus
              />
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={onBack} className="h-12 w-full text-base font-semibold">
        ← Back to Workout
      </Button>
    </div>
  );
}