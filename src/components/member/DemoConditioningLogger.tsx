import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, AlertTriangle, X } from "lucide-react";
import type { DemoExercise, BlockType, PreviousEntry, ConditioningLogEntry } from "@/hooks/use-demo";
import {
  sanitizeDecimal,
  sanitizeInteger,
  validateConditioningEntry,
  checkWeightDeviation,
} from "@/lib/workout-validation";

const PAIN_AREAS = ["wrist", "shoulder", "lower back", "hip", "knee", "ankle", "other"];

export function DemoConditioningLogger({
  exercise,
  blockType,
  previous,
  initialData,
  onBack,
  onSaveData,
}: {
  exercise: DemoExercise;
  blockType: BlockType;
  previous: PreviousEntry | null;
  initialData: ConditioningLogEntry | null;
  onBack: () => void;
  onSaveData: (data: ConditioningLogEntry) => void;
}) {
  const [saved, setSaved] = useState(!!initialData?.completed);
  const [rounds, setRounds] = useState(initialData?.rounds?.toString() ?? "");
  const [weight, setWeight] = useState(initialData?.weight?.toString() ?? "");
  const [rpe, setRpe] = useState(initialData?.rpe?.toString() ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!initialData?.notes);
  const [completed, setCompleted] = useState(initialData?.completed ?? true);
  const [painAreas, setPainAreas] = useState<string[]>(initialData?.pain_areas ?? []);
  const [showPain, setShowPain] = useState((initialData?.pain_areas?.length ?? 0) > 0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [deviationWarnings, setDeviationWarnings] = useState<string[]>([]);
  const [deviationDismissed, setDeviationDismissed] = useState(false);

  const showRounds = blockType === "amrap" || blockType === "emom";

  const handleSave = () => {
    const validationErrors = validateConditioningEntry(weight, rpe, rounds);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setDeviationWarnings([]);
      return;
    }
    setErrors([]);

    // Check weight deviation against previous
    if (weight && !deviationDismissed && previous) {
      const refs: { label: string; value: number }[] = [];
      if (previous.sets.length > 0 && previous.sets[0].weight > 0) {
        refs.push({ label: "last time", value: previous.sets[0].weight });
      }
      const warnings = checkWeightDeviation(weight, refs);
      if (warnings.length > 0) {
        setDeviationWarnings(warnings.map(w => w.message));
        return;
      }
    }
    setDeviationWarnings([]);

    const entry: ConditioningLogEntry = {
      exercise_id: exercise.exercise_id,
      completed,
      weight: weight ? parseFloat(weight) : null,
      rounds: rounds ? parseInt(rounds) : null,
      rpe: rpe ? parseInt(rpe) : null,
      notes: notes || null,
      pain_areas: painAreas,
    };
    onSaveData(entry);
    setSaved(true);
    setDirty(false);
  };

  const handleBack = () => {
    if (dirty) {
      setShowUnsavedWarning(true);
    } else {
      onBack();
    }
  };

  const handleSaveAndExit = () => {
    const validationErrors = validateConditioningEntry(weight, rpe, rounds);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setShowUnsavedWarning(false);
      return;
    }
    handleSave();
    setShowUnsavedWarning(false);
    setTimeout(() => onBack(), 50);
  };

  const markDirty = () => { setDirty(true); setErrors([]); };

  const confirmDeviation = () => {
    setDeviationDismissed(true);
    setDeviationWarnings([]);
    // Re-trigger save
    setTimeout(() => handleSave(), 50);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Unsaved Warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Unsaved Changes</h3>
            <p className="text-sm text-muted-foreground">You have unsaved changes. Save before leaving?</p>
            <div className="space-y-2">
              <Button onClick={handleSaveAndExit} className="h-12 w-full text-base font-bold">Save & Exit</Button>
              <Button variant="destructive" onClick={() => { setShowUnsavedWarning(false); onBack(); }} className="h-12 w-full text-base">Discard</Button>
              <Button variant="secondary" onClick={() => setShowUnsavedWarning(false)} className="h-12 w-full text-base">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted-foreground active:scale-95 transition-transform">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">{exercise.exercise_name}</h2>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {blockType.replace("_", " ")}
          </p>
        </div>
      </div>

      {exercise.notes && (
        <div className="rounded-lg bg-secondary p-3">
          <p className="text-sm text-muted-foreground">{exercise.notes}</p>
        </div>
      )}

      {previous && (
        <div className="rounded-lg bg-primary/10 p-3">
          <p className="text-xs font-medium text-primary mb-1">Last time</p>
          <p className="text-sm text-foreground">
            {previous.sets.length > 0 && (
              <>
                {previous.sets[0].weight > 0 && `${previous.sets[0].weight}kg · `}
                {previous.sets[0].reps} reps · RPE {previous.sets[0].rpe}
              </>
            )}
          </p>
        </div>
      )}

      <div className="rounded-xl bg-card p-4 space-y-4">
        {/* Completed toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setCompleted(true); markDirty(); }}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${completed ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >Yes</button>
            <button
              onClick={() => { setCompleted(false); markDirty(); }}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${!completed ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}
            >No</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {showRounds && (
            <div>
              <label className="text-xs text-muted-foreground">Rounds</label>
              <Input
                type="text" inputMode="numeric"
                value={rounds}
                onChange={(e) => { setRounds(sanitizeInteger(e.target.value)); markDirty(); }}
                className="h-14 bg-secondary text-center text-xl font-bold"
                placeholder="—"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Weight (kg, optional)</label>
            <Input
              type="text" inputMode="decimal"
              value={weight}
              onChange={(e) => { setWeight(sanitizeDecimal(e.target.value)); markDirty(); }}
              className="h-14 bg-secondary text-center text-xl font-bold"
              placeholder="—"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">RPE (1-10)</label>
            <Input
              type="text" inputMode="numeric"
              value={rpe}
              onChange={(e) => { setRpe(sanitizeInteger(e.target.value)); markDirty(); }}
              className="h-14 bg-secondary text-center text-xl font-bold"
              placeholder="—"
            />
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
            {errors.map((err, i) => (
              <p key={i} className="flex items-start gap-2 text-xs text-destructive">
                <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />{err}
              </p>
            ))}
          </div>
        )}

        {/* Pain */}
        <button
          onClick={() => { setShowPain(!showPain); markDirty(); }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors active:scale-95 ${
            showPain ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Pain / Discomfort
        </button>
        {showPain && (
          <div className="space-y-2">
            <p className="text-xs text-destructive font-medium">Where do you feel pain/discomfort?</p>
            <div className="flex flex-wrap gap-1">
              {PAIN_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => {
                    setPainAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
                    markDirty();
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                    painAreas.includes(area) ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"
                  }`}
                >{area}</button>
              ))}
            </div>
            {painAreas.length > 0 && <p className="text-[10px] text-destructive">Selected: {painAreas.join(", ")}</p>}
          </div>
        )}

        {!showNotes ? (
          <button onClick={() => { setShowNotes(true); }} className="text-xs text-muted-foreground underline">+ Add notes</button>
        ) : (
          <Textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); markDirty(); }}
            className="bg-secondary text-sm"
            placeholder="How did it feel?"
            rows={2}
          />
        )}
      </div>

      {/* Deviation Warnings */}
      {deviationWarnings.length > 0 && (
        <div className="rounded-lg bg-amber-900/20 border border-amber-500/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-400">Weight deviation detected</p>
          {deviationWarnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-400/80">{w}</p>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmDeviation}>Confirm & Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setDeviationWarnings([])}>Edit</Button>
          </div>
        </div>
      )}

      {!saved || dirty ? (
        <Button onClick={handleSave} className="h-14 w-full text-base font-bold" size="lg">
          Save Block
        </Button>
      ) : (
        <div className="rounded-xl bg-primary/10 p-4 text-center flex items-center justify-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <p className="font-semibold text-primary">Saved</p>
        </div>
      )}

      <Button variant="secondary" onClick={handleBack} className="h-12 w-full text-base">
        ← Back to Workout
      </Button>
    </div>
  );
}
