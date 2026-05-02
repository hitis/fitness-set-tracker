import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export function FinishWorkout({
  user,
  workoutId,
  onBack,
  onDone,
}: {
  user: User;
  workoutId: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    await supabase.from("user_workout_sessions").upsert(
      {
        user_id: user.id,
        workout_id: workoutId,
        completed: true,
        session_rpe: rpe,
        notes: notes || null,
      },
      { onConflict: "user_id,workout_id" }
    );
    setSaving(false);
    onDone();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1 text-muted-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-bold text-foreground">Finish Workout</h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Overall Session RPE</label>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
            <button
              key={v}
              onClick={() => setRpe(v)}
              className={`flex h-12 items-center justify-center rounded-lg text-lg font-bold transition-colors ${
                rpe === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Notes (optional)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-secondary text-base"
          placeholder="How was the session?"
          rows={3}
        />
      </div>

      <Button
        onClick={finish}
        disabled={saving}
        className="h-14 w-full text-base font-bold"
        size="lg"
      >
        Complete Workout ✓
      </Button>
    </div>
  );
}