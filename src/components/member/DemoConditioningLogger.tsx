import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check } from "lucide-react";
import type { DemoExercise, BlockType } from "@/hooks/use-demo";

import type { PreviousEntry } from "@/hooks/use-demo";

export function DemoConditioningLogger({
  exercise,
  blockType,
  previous,
  onBack,
  onComplete,
}: {
  exercise: DemoExercise;
  blockType: BlockType;
  previous: PreviousEntry | null;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [done, setDone] = useState(false);
  const [rounds, setRounds] = useState("");
  const [weight, setWeight] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [completed, setCompleted] = useState(true);
  const [rpeError, setRpeError] = useState("");

  const handleSave = () => {
    const rpeNum = rpe ? parseInt(rpe) : null;
    if (rpeNum !== null && (rpeNum < 1 || rpeNum > 10)) {
      setRpeError("RPE must be between 1 and 10");
      return;
    }
    setRpeError("");
    setDone(true);
    setTimeout(() => onComplete(), 400);
  };

  const showRounds = blockType === "amrap" || blockType === "emom";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1 text-muted-foreground">
          <ArrowLeft className="h-6 w-6" />
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
              onClick={() => setCompleted(true)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${completed ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              Yes
            </button>
            <button
              onClick={() => setCompleted(false)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${!completed ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}
            >
              No
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {showRounds && (
            <div>
              <label className="text-xs text-muted-foreground">Rounds</label>
              <Input
                type="number"
                inputMode="numeric"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                className="h-14 bg-secondary text-center text-xl font-bold"
                placeholder="—"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Weight (kg, optional)</label>
            <Input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-14 bg-secondary text-center text-xl font-bold"
              placeholder="—"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">RPE (1-10)</label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="10"
              value={rpe}
              onChange={(e) => { setRpe(e.target.value); setRpeError(""); }}
              className="h-14 bg-secondary text-center text-xl font-bold"
              placeholder="—"
            />
          </div>
        </div>

        {rpeError && (
          <p className="text-xs text-destructive font-medium">{rpeError}</p>
        )}

        {!showNotes ? (
          <button
            onClick={() => setShowNotes(true)}
            className="text-xs text-muted-foreground underline"
          >
            + Add notes
          </button>
        ) : (
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-secondary text-sm"
            placeholder="How did it feel?"
            rows={2}
          />
        )}
      </div>

      {!done ? (
        <Button onClick={handleSave} className="h-14 w-full text-base font-bold" size="lg">
          Complete
        </Button>
      ) : (
        <div className="rounded-xl bg-primary/10 p-4 text-center flex items-center justify-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <p className="font-semibold text-primary">Saved</p>
        </div>
      )}

      <Button variant="secondary" onClick={onBack} className="h-12 w-full text-base">
        ← Back to Workout
      </Button>
    </div>
  );
}