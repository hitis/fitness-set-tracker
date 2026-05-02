import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertTriangle, Check } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface ExerciseInfo {
  exercise_id: string;
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
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
  saved: boolean;
}

interface PreviousPerformance {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
}

const PAIN_AREAS = ["wrist", "shoulder", "back", "knee", "ankle", "other"];

export function ExerciseLogger({
  user,
  workoutId,
  exercise,
  onBack,
}: {
  user: User;
  workoutId: string;
  exercise: ExerciseInfo;
  onBack: () => void;
}) {
  const [sets, setSets] = useState<SetLog[]>([]);
  const [previous, setPrevious] = useState<PreviousPerformance | null>(null);

  // Load existing logs and previous performance
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load existing set logs for this exercise in this workout
    const { data: existing } = await supabase
      .from("user_set_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("workout_id", workoutId)
      .eq("exercise_id", exercise.exercise_id)
      .order("set_number");

    // Load previous performance (most recent log for this exercise, different workout)
    const { data: prev } = await supabase
      .from("user_set_logs")
      .select("weight, reps, rpe, notes")
      .eq("user_id", user.id)
      .eq("exercise_id", exercise.exercise_id)
      .neq("workout_id", workoutId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (prev) setPrevious(prev);

    // Initialize sets
    const initialSets: SetLog[] = [];
    for (let i = 1; i <= exercise.prescribed_sets; i++) {
      const ex = existing?.find((e) => e.set_number === i);
      initialSets.push({
        set_number: i,
        weight: ex?.weight?.toString() || "",
        reps: ex?.reps?.toString() || "",
        rpe: ex?.rpe?.toString() || "",
        notes: ex?.notes || "",
        pain_flag: ex?.pain_flag || false,
        pain_area: ex?.pain_area || "",
        saved: !!ex,
      });
    }
    setSets(initialSets);
  };

  const autoSave = useCallback(
    async (setLog: SetLog) => {
      if (!setLog.weight && !setLog.reps) return;

      const payload = {
        user_id: user.id,
        workout_id: workoutId,
        exercise_id: exercise.exercise_id,
        set_number: setLog.set_number,
        weight: setLog.weight ? parseFloat(setLog.weight) : null,
        reps: setLog.reps ? parseInt(setLog.reps) : null,
        rpe: setLog.rpe ? parseInt(setLog.rpe) : null,
        notes: setLog.notes || null,
        pain_flag: setLog.pain_flag,
        pain_area: setLog.pain_flag && setLog.pain_area ? (setLog.pain_area as "wrist" | "shoulder" | "back" | "knee" | "ankle" | "other") : null,
      };

      await supabase.from("user_set_logs").upsert(payload, {
        onConflict: "user_id,workout_id,exercise_id,set_number",
      });

      setSets((prev) =>
        prev.map((s) => (s.set_number === setLog.set_number ? { ...s, saved: true } : s))
      );
    },
    [user.id, workoutId, exercise.exercise_id]
  );

  const updateSet = (setNum: number, field: keyof SetLog, value: string | boolean) => {
    setSets((prev) => {
      const updated = prev.map((s) =>
        s.set_number === setNum ? { ...s, [field]: value, saved: false } : s
      );
      // Auto-save after update with debounce
      const setLog = updated.find((s) => s.set_number === setNum);
      if (setLog) {
        setTimeout(() => autoSave(setLog), 500);
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

      {exercise.notes && (
        <div className="rounded-lg bg-secondary p-3">
          <p className="text-sm text-muted-foreground">{exercise.notes}</p>
        </div>
      )}

      {previous && (
        <div className="rounded-lg bg-primary/10 p-3">
          <p className="text-xs font-medium text-primary mb-1">Last Performance</p>
          <p className="text-sm text-foreground">
            {previous.weight && `${previous.weight} kg`}
            {previous.reps && ` × ${previous.reps} reps`}
            {previous.rpe && ` · RPE ${previous.rpe}`}
          </p>
          {previous.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{previous.notes}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {sets.map((set) => (
          <div key={set.set_number} className="rounded-xl bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Set {set.set_number}</span>
              {set.saved && <Check className="h-4 w-4 text-primary" />}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Weight (kg)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(e) => updateSet(set.set_number, "weight", e.target.value)}
                  className="h-12 bg-secondary text-center text-lg font-semibold"
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
                  className="h-12 bg-secondary text-center text-lg font-semibold"
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
                  className="h-12 bg-secondary text-center text-lg font-semibold"
                  placeholder="—"
                />
              </div>
            </div>

            <Textarea
              value={set.notes}
              onChange={(e) => updateSet(set.set_number, "notes", e.target.value)}
              className="bg-secondary text-sm"
              placeholder="How did it feel?"
              rows={1}
            />

            <div className="flex items-center gap-3">
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
            </div>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={onBack} className="h-12 w-full text-base">
        ← Back to Workout
      </Button>
    </div>
  );
}