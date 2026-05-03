import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, Check, Copy, ChevronDown, ChevronUp, Info, X, Pencil } from "lucide-react";
import { format } from "date-fns";
import type { DemoExercise, PreviousEntry } from "@/hooks/use-demo";

export interface SetLog {
  set_number: number;
  weight: string;
  reps: string;
  rpe: string;
  notes: string;
  pain_flag: boolean;
  pain_areas: string[];
  showNotes: boolean;
  saved: boolean;
  errors: string[];
  deviationWarnings: string[];
  dirty: boolean;
}

interface FieldErrors {
  weight?: string;
  reps?: string;
  rpe?: string;
}

function validateField(field: "weight" | "reps" | "rpe", value: string): string | undefined {
  if (!value) return undefined;
  if (field === "weight") {
    const n = parseFloat(value);
    if (isNaN(n) || n <= 0) return "Must be > 0";
  }
  if (field === "reps") {
    const n = parseInt(value);
    if (isNaN(n) || n <= 0) return "Must be > 0";
  }
  if (field === "rpe") {
    const n = parseInt(value);
    if (isNaN(n) || n < 1 || n > 10) return "1–10";
  }
  return undefined;
}

const PAIN_AREAS = ["wrist", "hand", "shoulder", "elbow", "lower back", "hip", "knee", "ankle", "other"];

function sanitizeDecimal(val: string): string {
  let result = "";
  let hasDot = false;
  for (const ch of val) {
    if (ch >= "0" && ch <= "9") result += ch;
    else if (ch === "." && !hasDot) { result += ch; hasDot = true; }
  }
  return result;
}

function sanitizeInteger(val: string): string {
  return val.replace(/[^0-9]/g, "");
}

function NumInput({ value, onChange, placeholder, mode, error, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; mode: "decimal" | "integer"; error?: string; disabled?: boolean;
}) {
  return (
    <div>
      <input
        type="text"
        inputMode={mode === "decimal" ? "decimal" : "numeric"}
        value={value}
        onChange={(e) => onChange(mode === "decimal" ? sanitizeDecimal(e.target.value) : sanitizeInteger(e.target.value))}
        disabled={disabled}
        className={`flex h-14 w-full rounded-md px-3 py-1 text-center text-xl font-bold shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors ${
          disabled ? "bg-secondary/50 text-muted-foreground cursor-not-allowed" :
          error ? "bg-secondary border-2 border-destructive text-foreground" : "bg-secondary border-0 text-foreground"
        }`}
        placeholder={placeholder}
      />
      {error && <p className="text-[10px] text-destructive mt-1 font-medium">{error}</p>}
    </div>
  );
}

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
  onSetDataChange,
  initialSetData,
}: {
  exercise: DemoExercise;
  previousHistory: PreviousEntry[];
  onBack: () => void;
  onSaveSets: (count: number) => void;
  onViewExerciseHistory?: () => void;
  onSetDataChange?: (sets: Array<{ set_number: number; weight: number; reps: number; rpe: number; notes: string | null; pain_flag: boolean; pain_areas: string[] }>) => void;
  initialSetData?: Array<{ set_number: number; weight: number; reps: number; rpe: number; notes: string | null; pain_flag: boolean; pain_areas: string[] }>;
}) {
  const [sets, setSets] = useState<SetLog[]>(() => {
    return Array.from({ length: exercise.prescribed_sets }, (_, i) => {
      const existing = initialSetData?.find(s => s.set_number === i + 1);
      if (existing) {
        return {
          set_number: i + 1,
          weight: existing.weight > 0 ? String(existing.weight) : "",
          reps: existing.reps > 0 ? String(existing.reps) : "",
          rpe: existing.rpe > 0 ? String(existing.rpe) : "",
          notes: existing.notes || "",
          pain_flag: existing.pain_flag,
          pain_areas: existing.pain_areas || [],
          showNotes: !!(existing.notes),
          saved: true,
          errors: [],
          deviationWarnings: [],
          dirty: false,
        };
      }
      return {
        set_number: i + 1,
        weight: "",
        reps: "",
        rpe: "",
        notes: "",
        pain_flag: false,
        pain_areas: [],
        showNotes: false,
        saved: false,
        errors: [],
        deviationWarnings: [],
        dirty: false,
      };
    });
  });
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<number>>(new Set());
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const lastSessionAvg = getLastSessionAvgWeight(previousHistory);

  // Notify parent of set data changes
  const notifySetDataChange = useCallback((updatedSets: SetLog[]) => {
    if (onSetDataChange) {
      const saved = updatedSets.filter(s => s.saved);
      onSetDataChange(saved.map(s => ({
        set_number: s.set_number,
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        rpe: parseInt(s.rpe) || 0,
        notes: s.notes || null,
        pain_flag: s.pain_flag,
        pain_areas: s.pain_areas,
      })));
    }
  }, [onSetDataChange]);

  // Real-time field-level validation
  const fieldErrors = useMemo(() => {
    const map: Record<number, FieldErrors> = {};
    for (const s of sets) {
      const errs: FieldErrors = {};
      errs.weight = validateField("weight", s.weight);
      errs.reps = validateField("reps", s.reps);
      errs.rpe = validateField("rpe", s.rpe);
      if (errs.weight || errs.reps || errs.rpe) map[s.set_number] = errs;
    }
    return map;
  }, [sets]);

  const hasDirtyData = sets.some(s => s.dirty);

  const handleBack = () => {
    if (hasDirtyData) {
      setShowUnsavedWarning(true);
    } else {
      onBack();
    }
  };

  const handleSaveAndExit = () => {
    // Save all valid unsaved sets, then exit
    setSets((prev) => {
      const updated = prev.map((s) => {
        if (s.saved && !s.dirty) return s;
        if (!s.weight && !s.reps) return s;
        const w = s.weight ? parseFloat(s.weight) : null;
        const r = s.reps ? parseInt(s.reps) : null;
        const rpe = s.rpe ? parseInt(s.rpe) : null;
        const errors: string[] = [];
        if (s.weight && (w === null || w <= 0)) errors.push("Weight must be > 0");
        if (s.reps && (r === null || r <= 0)) errors.push("Reps must be > 0");
        if (rpe !== null && (rpe < 1 || rpe > 10)) errors.push("RPE must be 1-10");
        if (errors.length > 0) return { ...s, errors, deviationWarnings: [] };
        return { ...s, saved: true, dirty: false, errors: [], deviationWarnings: [] };
      });
      onSaveSets(updated.filter((s) => s.saved).length);
      notifySetDataChange(updated);
      return updated;
    });
    setShowUnsavedWarning(false);
    setTimeout(() => onBack(), 50);
  };

  const updateSet = (setNum: number, field: keyof SetLog, value: string | boolean | string[]) => {
    setSets((prev) =>
      prev.map((s) =>
        s.set_number === setNum ? { ...s, [field]: value, dirty: true, errors: [], deviationWarnings: [] } : s
      )
    );
  };

  const togglePainArea = (setNum: number, area: string) => {
    setSets((prev) =>
      prev.map((s) => {
        if (s.set_number !== setNum) return s;
        const has = s.pain_areas.includes(area);
        return { ...s, pain_areas: has ? s.pain_areas.filter(a => a !== area) : [...s.pain_areas, area] };
      })
    );
  };

  const saveSet = (setNum: number) => {
    setSets((prev) => {
      const current = prev.find((s) => s.set_number === setNum);
      if (!current) return prev;

      // Full validation
      const errors: string[] = [];
      const w = current.weight ? parseFloat(current.weight) : null;
      const r = current.reps ? parseInt(current.reps) : null;
      const rpe = current.rpe ? parseInt(current.rpe) : null;

      if (!current.weight && !current.reps) errors.push("Enter weight and reps to save");
      if (current.weight && (w === null || w <= 0)) errors.push("Weight must be a positive number");
      if (current.reps && (r === null || r <= 0)) errors.push("Reps must be greater than 0");
      if (rpe !== null && (rpe < 1 || rpe > 10)) errors.push("RPE must be between 1 and 10");

      if (errors.length > 0) {
        return prev.map((s) => s.set_number === setNum ? { ...s, errors, deviationWarnings: [] } : s);
      }

      // Deviation warnings
      const deviationWarnings: string[] = [];
      if (w && w > 0 && !dismissedWarnings.has(setNum)) {
        const prevSet = prev.find((s) => s.set_number === setNum - 1 && s.saved);
        if (prevSet?.weight) {
          const pv = parseFloat(prevSet.weight);
          if (pv > 0 && Math.abs(w - pv) / pv > 0.3) {
            deviationWarnings.push(`Large weight change vs previous set (${pv}kg → ${w}kg)`);
          }
        }
        if (lastSessionAvg !== null && lastSessionAvg > 0 && Math.abs(w - lastSessionAvg) / lastSessionAvg > 0.3) {
          deviationWarnings.push(`Weight is ${w > lastSessionAvg ? "significantly higher" : "significantly lower"} than last session avg (${Math.round(lastSessionAvg)}kg)`);
        }
        if (deviationWarnings.length > 0) {
          return prev.map((s) => s.set_number === setNum ? { ...s, errors: [], deviationWarnings } : s);
        }
      }

      const updated = prev.map((s) =>
        s.set_number === setNum ? { ...s, saved: true, dirty: false, errors: [], deviationWarnings: [] } : s
      );
      onSaveSets(updated.filter((s) => s.saved).length);
      notifySetDataChange(updated);
      return updated;
    });
  };

  const confirmAndSave = (setNum: number) => {
    setDismissedWarnings((prev) => new Set(prev).add(setNum));
    setSets((prev) => {
      const updated = prev.map((s) =>
        s.set_number === setNum ? { ...s, saved: true, dirty: false, errors: [], deviationWarnings: [] } : s
      );
      onSaveSets(updated.filter((s) => s.saved).length);
      notifySetDataChange(updated);
      return updated;
    });
  };

  const copyLastSet = (setNum: number) => {
    setSets((prev) => {
      const prevSet = prev.find((s) => s.set_number === setNum - 1);
      if (!prevSet) return prev;
      return prev.map((s) =>
        s.set_number === setNum
          ? { ...s, weight: prevSet.weight, reps: prevSet.reps, rpe: prevSet.rpe, dirty: true, errors: [], deviationWarnings: [] }
          : s
      );
    });
  };

  const historyToShow = showFullHistory ? previousHistory : previousHistory.slice(0, 3);

  const hasFieldError = (setNum: number) => {
    const e = fieldErrors[setNum];
    return !!(e?.weight || e?.reps || e?.rpe);
  };

  return (
    <div className="p-4 space-y-5">
      {/* Unsaved Changes Warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Unsaved Changes</h3>
            <p className="text-sm text-muted-foreground">You have unsaved changes. Save before leaving?</p>
            <div className="space-y-2">
              <Button onClick={handleSaveAndExit} className="h-12 w-full text-base font-bold">
                Save & Exit
              </Button>
              <Button variant="destructive" onClick={() => { setShowUnsavedWarning(false); onBack(); }} className="h-12 w-full text-base">
                Discard
              </Button>
              <Button variant="secondary" onClick={() => setShowUnsavedWarning(false)} className="h-12 w-full text-base">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted-foreground active:scale-95 transition-transform">
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
            {previousHistory.length > 3 && (
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
          <div key={set.set_number} className={`rounded-xl border bg-card p-4 space-y-3 transition-colors ${
            set.saved && !set.dirty ? "border-primary/30" : "border-border"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Set {set.set_number}</span>
              <div className="flex items-center gap-2">
                {set.set_number > 1 && (
                  <button
                    onClick={() => copyLastSet(set.set_number)}
                    className="flex items-center gap-1 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                  >
                    <Copy className="h-3 w-3" />
                    Copy last
                  </button>
                )}
                {set.saved && !set.dirty && (
                  <div className="flex items-center gap-1 text-primary">
                    <Check className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Saved</span>
                  </div>
                )}
              </div>
            </div>

            {/* Always editable inputs */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Weight</label>
                  <NumInput
                    value={set.weight}
                    onChange={(v) => updateSet(set.set_number, "weight", v)}
                    placeholder="—"
                    mode="decimal"
                    error={fieldErrors[set.set_number]?.weight}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reps</label>
                  <NumInput
                    value={set.reps}
                    onChange={(v) => updateSet(set.set_number, "reps", v)}
                    placeholder="—"
                    mode="integer"
                    error={fieldErrors[set.set_number]?.reps}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">RPE (1-10)</label>
                  <NumInput
                    value={set.rpe}
                    onChange={(v) => updateSet(set.set_number, "rpe", v)}
                    placeholder="—"
                    mode="integer"
                    error={fieldErrors[set.set_number]?.rpe}
                  />
                </div>
              </div>

            {/* Actions row */}
            <div className="flex items-center gap-2 flex-wrap">
              {!set.showNotes && (
                <button
                  onClick={() => setSets((p) => p.map((s) => s.set_number === set.set_number ? { ...s, showNotes: true } : s))}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-1"
                >
                  + Notes
                </button>
              )}
              <button
                onClick={() => updateSet(set.set_number, "pain_flag", !set.pain_flag)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors active:scale-95 ${
                  set.pain_flag
                    ? "bg-destructive/20 text-destructive"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Pain / Discomfort
              </button>
              {set.dirty && (set.weight || set.reps) && set.errors.length === 0 && set.deviationWarnings.length === 0 && !hasFieldError(set.set_number) && (
                <button
                  onClick={() => saveSet(set.set_number)}
                  className="ml-auto rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-colors active:scale-95"
                >
                  Save
                </button>
              )}
            </div>

            {/* Validation Errors */}
            {set.errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                {set.errors.map((err, ei) => (
                  <p key={ei} className="flex items-start gap-2 text-xs text-destructive">
                    <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            {/* Deviation Warnings */}
            {set.deviationWarnings.length > 0 && (
              <div className="rounded-lg bg-amber-900/20 border border-amber-500/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                    <Info className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-sm font-semibold text-amber-400">Weight deviation detected</p>
                </div>
                <div className="space-y-1 pl-10">
                  {set.deviationWarnings.map((w, wi) => (
                    <p key={wi} className="text-xs text-amber-400/80">{w}</p>
                  ))}
                </div>
                <div className="flex gap-2 pt-1 pl-10">
                  <button
                    onClick={() => confirmAndSave(set.set_number)}
                    className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:scale-95"
                  >
                    Confirm & Save
                  </button>
                  <button
                    onClick={() => setSets((p) => p.map((s) => s.set_number === set.set_number ? { ...s, deviationWarnings: [] } : s))}
                    className="rounded-md bg-secondary px-4 py-2 text-xs text-muted-foreground active:scale-95"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {set.pain_flag && (
              <div className="space-y-2">
                <p className="text-xs text-destructive font-medium">Where do you feel pain/discomfort?</p>
                <div className="flex flex-wrap gap-1">
                  {PAIN_AREAS.map((area) => (
                    <button
                      key={area}
                      onClick={() => togglePainArea(set.set_number, area)}
                      className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                        set.pain_areas.includes(area)
                          ? "bg-destructive/20 text-destructive"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
                {set.pain_areas.length > 0 && (
                  <p className="text-[10px] text-destructive">Selected: {set.pain_areas.join(", ")}</p>
                )}
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

      {/* Save All Sets */}
      {sets.some(s => s.dirty && (s.weight || s.reps)) && (
        <Button
          onClick={() => {
            setSets((prev) => {
              const updated = prev.map((s) => {
                if (s.saved && !s.dirty) return s;
                if (!s.weight && !s.reps) return s;
                const w = s.weight ? parseFloat(s.weight) : null;
                const r = s.reps ? parseInt(s.reps) : null;
                const rpe = s.rpe ? parseInt(s.rpe) : null;
                const errors: string[] = [];
                if (s.weight && (w === null || w <= 0)) errors.push("Weight must be > 0");
                if (s.reps && (r === null || r <= 0)) errors.push("Reps must be > 0");
                if (rpe !== null && (rpe < 1 || rpe > 10)) errors.push("RPE must be 1-10");
                if (errors.length > 0) return { ...s, errors, deviationWarnings: [] };
                return { ...s, saved: true, dirty: false, errors: [], deviationWarnings: [] };
              });
              onSaveSets(updated.filter((s) => s.saved).length);
              notifySetDataChange(updated);
              return updated;
            });
          }}
          className="h-14 w-full text-base font-bold"
          size="lg"
        >
          Save All Sets
        </Button>
      )}

      <Button variant="secondary" onClick={handleBack} className="h-14 w-full text-base font-semibold active:scale-[0.98]">
        ← Back to Workout
      </Button>
    </div>
  );
}