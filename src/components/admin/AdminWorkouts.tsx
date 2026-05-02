import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronRight, GripVertical } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Workout = Tables<"workouts">;
type Exercise = Tables<"exercises">;

const TRAINING_TYPES = [
  { value: "lower_body", label: "Lower Body" },
  { value: "upper_body", label: "Upper Body" },
  { value: "full_body", label: "Full Body" },
  { value: "mobility", label: "Mobility" },
  { value: "conditioning", label: "Conditioning" },
];

const PHASES = [
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "hypertrophy", label: "Hypertrophy" },
  { value: "power", label: "Power" },
  { value: "testing", label: "Testing" },
  { value: "deload", label: "Deload" },
];

interface WorkoutExerciseRow {
  id: string;
  exercise_id: string;
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  sort_order: number;
  notes: string;
}

export function AdminWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    const { data } = await supabase
      .from("workouts")
      .select("*")
      .order("workout_date", { ascending: false });
    if (data) setWorkouts(data);
  };

  if (creating || editing) {
    return (
      <WorkoutEditor
        workoutId={editing}
        onDone={() => {
          setCreating(false);
          setEditing(null);
          loadWorkouts();
        }}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Workouts</h2>
        <Button onClick={() => setCreating(true)} size="lg" className="gap-2">
          <Plus className="h-4 w-4" /> New Workout
        </Button>
      </div>

      <div className="space-y-2">
        {workouts.map((w) => (
          <button
            key={w.id}
            onClick={() => setEditing(w.id)}
            className="flex w-full items-center justify-between rounded-xl bg-card p-4 text-left"
          >
            <div>
              <p className="font-semibold text-foreground">
                {format(new Date(w.workout_date + "T00:00:00"), "EEE, MMM d")}
              </p>
              <div className="mt-1 flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {w.training_type.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {w.phase}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {w.published && (
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                  Live
                </span>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>
        ))}
        {workouts.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No workouts yet</p>
        )}
      </div>
    </div>
  );
}

function WorkoutEditor({ workoutId, onDone }: { workoutId: string | null; onDone: () => void }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [trainingType, setTrainingType] = useState("full_body");
  const [phase, setPhase] = useState("strength");
  const [notes, setNotes] = useState("");
  const [published, setPublished] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExerciseRow[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExercises();
    if (workoutId) loadWorkout();
  }, [workoutId]);

  const loadExercises = async () => {
    const { data } = await supabase.from("exercises").select("*").order("name");
    if (data) setAllExercises(data);
  };

  const loadWorkout = async () => {
    if (!workoutId) return;
    const { data: w } = await supabase.from("workouts").select("*").eq("id", workoutId).single();
    if (w) {
      setDate(w.workout_date);
      setTrainingType(w.training_type);
      setPhase(w.phase);
      setNotes(w.notes || "");
      setPublished(w.published);
    }
    const { data: we } = await supabase
      .from("workout_exercises")
      .select("*, exercises(name)")
      .eq("workout_id", workoutId)
      .order("sort_order");
    if (we) {
      setExercises(
        we.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          exercise_id: e.exercise_id as string,
          exercise_name: (e.exercises as { name: string })?.name || "",
          prescribed_sets: e.prescribed_sets as number,
          prescribed_reps: e.prescribed_reps as string,
          sort_order: e.sort_order as number,
          notes: (e.notes as string) || "",
        }))
      );
    }
  };

  const addExercise = (exerciseId: string, name: string) => {
    setExercises([
      ...exercises,
      {
        id: crypto.randomUUID(),
        exercise_id: exerciseId,
        exercise_name: name,
        prescribed_sets: 3,
        prescribed_reps: "10",
        sort_order: exercises.length,
        notes: "",
      },
    ]);
  };

  const createNewExercise = async () => {
    if (!newExerciseName.trim()) return;
    const { data } = await supabase
      .from("exercises")
      .insert({ name: newExerciseName.trim() })
      .select()
      .single();
    if (data) {
      setAllExercises([...allExercises, data]);
      addExercise(data.id, data.name);
      setNewExerciseName("");
    }
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const updateExercise = (id: string, field: string, value: string | number) => {
    setExercises(exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const save = async (publish: boolean) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const workoutData = {
        workout_date: date,
        training_type: trainingType as Workout["training_type"],
        phase: phase as Workout["phase"],
        notes: notes || null,
        published: publish,
        created_by: user?.id,
      };

      let wId = workoutId;
      if (workoutId) {
        await supabase.from("workouts").update(workoutData).eq("id", workoutId);
      } else {
        const { data } = await supabase.from("workouts").insert(workoutData).select().single();
        if (data) wId = data.id;
      }

      if (wId) {
        // Delete existing exercises and re-insert
        await supabase.from("workout_exercises").delete().eq("workout_id", wId);
        if (exercises.length > 0) {
          await supabase.from("workout_exercises").insert(
            exercises.map((e, i) => ({
              workout_id: wId!,
              exercise_id: e.exercise_id,
              prescribed_sets: e.prescribed_sets,
              prescribed_reps: e.prescribed_reps,
              sort_order: i,
              notes: e.notes || null,
            }))
          );
        }
      }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const unusedExercises = allExercises.filter(
    (e) => !exercises.some((we) => we.exercise_id === e.id)
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          {workoutId ? "Edit Workout" : "New Workout"}
        </h2>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 bg-secondary text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Training Type</label>
            <Select value={trainingType} onValueChange={setTrainingType}>
              <SelectTrigger className="h-12 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Phase</label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger className="h-12 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Notes (optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-secondary text-base"
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Exercises</h3>

        {exercises.map((ex, i) => (
          <div key={ex.id} className="rounded-xl bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {i + 1}. {ex.exercise_name}
                </span>
              </div>
              <button onClick={() => removeExercise(ex.id)} className="p-1 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Sets</label>
                <Input
                  type="number"
                  value={ex.prescribed_sets}
                  onChange={(e) =>
                    updateExercise(ex.id, "prescribed_sets", parseInt(e.target.value) || 0)
                  }
                  className="h-10 bg-secondary"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Reps</label>
                <Input
                  value={ex.prescribed_reps}
                  onChange={(e) => updateExercise(ex.id, "prescribed_reps", e.target.value)}
                  className="h-10 bg-secondary"
                  placeholder="e.g. 8-12"
                />
              </div>
            </div>
            <Input
              value={ex.notes}
              onChange={(e) => updateExercise(ex.id, "notes", e.target.value)}
              className="h-10 bg-secondary text-sm"
              placeholder="Instructions (optional)"
            />
          </div>
        ))}

        <div className="space-y-2">
          {unusedExercises.length > 0 && (
            <Select onValueChange={(v) => {
              const ex = allExercises.find((e) => e.id === v);
              if (ex) addExercise(ex.id, ex.name);
            }}>
              <SelectTrigger className="h-12 bg-secondary">
                <SelectValue placeholder="Add existing exercise..." />
              </SelectTrigger>
              <SelectContent>
                {unusedExercises.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2">
            <Input
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              className="h-12 bg-secondary text-base"
              placeholder="New exercise name..."
              onKeyDown={(e) => e.key === "Enter" && createNewExercise()}
            />
            <Button onClick={createNewExercise} className="h-12 shrink-0" disabled={!newExerciseName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pb-8">
        <Button
          variant="secondary"
          className="h-12 flex-1 text-base"
          onClick={() => save(false)}
          disabled={saving}
        >
          Save Draft
        </Button>
        <Button
          className="h-12 flex-1 text-base font-semibold"
          onClick={() => save(true)}
          disabled={saving}
        >
          {published ? "Update" : "Publish"}
        </Button>
      </div>
    </div>
  );
}