import { useState, useRef, useCallback } from "react";
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
import { ArrowLeft, Plus, Trash2, GripVertical, Check, AlertTriangle } from "lucide-react";
import type { BlockType, TrainerWorkout } from "@/hooks/use-demo";
import { getTrainerWorkout, saveTrainerWorkout } from "@/hooks/use-demo";

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

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "main_lift", label: "Main Lift" },
  { value: "accessory", label: "Accessory" },
  { value: "superset", label: "Superset" },
  { value: "emom", label: "EMOM" },
  { value: "amrap", label: "AMRAP" },
  { value: "tabata", label: "TABATA" },
  { value: "finisher", label: "Finisher" },
  { value: "conditioning", label: "Conditioning" },
  { value: "core", label: "Core" },
  { value: "mobility", label: "Mobility" },
];

interface EditorExercise {
  id: string;
  name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  notes: string;
}

interface EditorBlock {
  id: string;
  name: string;
  block_type: BlockType;
  notes: string;
  exercises: EditorExercise[];
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DemoWorkoutEditor({
  workoutId,
  onDone,
}: {
  workoutId: string | null;
  onDone: () => void;
}) {
  const existing = workoutId ? getTrainerWorkout(workoutId) : null;
  const [date, setDate] = useState(existing?.workout_date ?? formatDate(new Date()));
  const [trainingType, setTrainingType] = useState(existing?.training_type ?? "full_body");
  const [phase, setPhase] = useState(existing?.phase ?? "strength");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
    existing?.blocks.map(b => ({
      id: b.id,
      name: b.name,
      block_type: b.block_type,
      notes: b.notes ?? "",
      exercises: b.exercises.map(e => ({
        id: e.id,
        name: e.exercise_name,
        prescribed_sets: e.prescribed_sets,
        prescribed_reps: e.prescribed_reps,
        notes: e.notes ?? "",
      })),
    })) ?? []
  );
  const [saved, setSaved] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const dirtyRef = useRef(false);

  const buildWorkout = (status: "draft" | "published"): TrainerWorkout => ({
    id: existing?.id ?? crypto.randomUUID(),
    workout_date: date,
    training_type: trainingType,
    phase,
    notes: notes || null,
    status,
    blocks: blocks.map((b, bi) => ({
      id: b.id,
      name: b.name || `Block ${bi + 1}`,
      block_type: b.block_type,
      notes: b.notes || null,
      sort_order: bi,
      exercises: b.exercises.map((e, ei) => ({
        id: e.id,
        exercise_id: e.id,
        exercise_name: e.name || `Exercise ${ei + 1}`,
        prescribed_sets: e.prescribed_sets,
        prescribed_reps: e.prescribed_reps,
        notes: e.notes || null,
        sort_order: ei,
      })),
    })),
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const handleBack = () => {
    if (dirtyRef.current) {
      setShowUnsavedWarning(true);
    } else {
      onDone();
    }
  };

  const addBlock = () => {
    dirtyRef.current = true;
    setBlocks([
      ...blocks,
      {
        id: crypto.randomUUID(),
        name: "",
        block_type: "accessory",
        notes: "",
        exercises: [],
      },
    ]);
  };

  const removeBlock = (id: string) => {
    dirtyRef.current = true;
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const updateBlock = (id: string, field: string, value: string) => {
    dirtyRef.current = true;
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const addExercise = (blockId: string) => {
    dirtyRef.current = true;
    setBlocks(
      blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              exercises: [
                ...b.exercises,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  prescribed_sets: 3,
                  prescribed_reps: "10",
                  notes: "",
                },
              ],
            }
          : b
      )
    );
  };

  const removeExercise = (blockId: string, exId: string) => {
    dirtyRef.current = true;
    setBlocks(
      blocks.map((b) =>
        b.id === blockId
          ? { ...b, exercises: b.exercises.filter((e) => e.id !== exId) }
          : b
      )
    );
  };

  const updateExercise = (blockId: string, exId: string, field: string, value: string | number) => {
    dirtyRef.current = true;
    setBlocks(
      blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              exercises: b.exercises.map((e) =>
                e.id === exId ? { ...e, [field]: value } : e
              ),
            }
          : b
      )
    );
  };

  const handleSave = (publish: boolean) => {
    const w = buildWorkout(publish ? "published" : "draft");
    saveTrainerWorkout(w);
    dirtyRef.current = false;
    setSaved(true);
  };

  if (showUnsavedWarning) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6 min-h-[60vh]">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-foreground text-center">You have unsaved changes</h2>
        <p className="text-sm text-muted-foreground text-center">Save draft before leaving?</p>
        <div className="w-full max-w-xs space-y-3">
          <Button className="h-12 w-full text-base" onClick={() => { handleSave(false); onDone(); }}>
            Save Draft
          </Button>
          <Button variant="destructive" className="h-12 w-full text-base" onClick={onDone}>
            Discard
          </Button>
          <Button variant="secondary" className="h-12 w-full text-base" onClick={() => setShowUnsavedWarning(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6 min-h-[60vh]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
          <Check className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Workout Saved</h2>
          <p className="text-sm text-muted-foreground">
            Your workout has been saved. In the live app, this will be stored in the database.
          </p>
        </div>
        <Button variant="secondary" className="h-12 w-full max-w-xs" onClick={onDone}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground">
          {workoutId ? "Edit Workout" : "Create Workout"}
        </h2>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 bg-secondary border-0 text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Training Type</label>
            <Select value={trainingType} onValueChange={setTrainingType}>
              <SelectTrigger className="h-12 bg-secondary border-0">
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
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Phase</label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger className="h-12 bg-secondary border-0">
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
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-secondary border-0 text-base"
            rows={2}
            placeholder="Coach notes for this workout..."
          />
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Blocks</h3>
          <Button onClick={addBlock} variant="secondary" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Block
          </Button>
        </div>

        {blocks.length === 0 && (
          <p className="py-8 text-center text-muted-foreground text-sm">
            No blocks yet. Add a block to start building the workout.
          </p>
        )}

        {blocks.map((block, bi) => (
          <div key={block.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={block.name}
                  onChange={(e) => updateBlock(block.id, "name", e.target.value)}
                  className="h-10 bg-secondary border-0 text-sm font-semibold"
                  placeholder={`Block ${bi + 1} name`}
                />
                <button onClick={() => removeBlock(block.id)} className="p-2 text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Select
                value={block.block_type}
                onValueChange={(v) => updateBlock(block.id, "block_type", v)}
              >
                <SelectTrigger className="h-10 bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>
                      {bt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exercises in block */}
            <div className="divide-y divide-border">
              {block.exercises.map((ex, ei) => (
                <div key={ex.id} className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">{ei + 1}.</span>
                    <Input
                      value={ex.name}
                      onChange={(e) => updateExercise(block.id, ex.id, "name", e.target.value)}
                      className="h-10 bg-secondary border-0 text-sm"
                      placeholder="Exercise name"
                    />
                    <button onClick={() => removeExercise(block.id, ex.id)} className="p-1.5 text-destructive shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-5">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Sets</label>
                      <Input
                        type="number"
                        value={ex.prescribed_sets}
                        onChange={(e) =>
                          updateExercise(block.id, ex.id, "prescribed_sets", parseInt(e.target.value) || 0)
                        }
                        className="h-10 bg-secondary border-0"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Reps</label>
                      <Input
                        value={ex.prescribed_reps}
                        onChange={(e) => updateExercise(block.id, ex.id, "prescribed_reps", e.target.value)}
                        className="h-10 bg-secondary border-0"
                        placeholder="e.g. 8-12"
                      />
                    </div>
                  </div>
                  <div className="pl-5">
                    <Input
                      value={ex.notes}
                      onChange={(e) => updateExercise(block.id, ex.id, "notes", e.target.value)}
                      className="h-10 bg-secondary border-0 text-xs"
                      placeholder="Instructions (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-border">
              <Button
                onClick={() => addExercise(block.id)}
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Exercise
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button
          variant="secondary"
          className="h-12 flex-1 text-base"
          onClick={() => handleSave(false)}
        >
          Save Draft
        </Button>
        <Button
          className="h-12 flex-1 text-base font-semibold"
          onClick={() => handleSave(true)}
        >
          Publish
        </Button>
      </div>
    </div>
  );
}