import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { loadAllWorkouts, type DbWorkout } from "@/lib/supabase-data";
import { DemoWorkoutEditor } from "./DemoWorkoutEditor";

export function DemoAdminDashboard() {
  const [view, setView] = useState<"dashboard" | "create" | "edit">("dashboard");
  const [editWorkoutId, setEditWorkoutId] = useState<string | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<DbWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAllWorkouts();
      setAllWorkouts(data);
    } catch (e) {
      console.error("Failed to load workouts", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const todayDate = new Date().toISOString().slice(0, 10);
  const todayPublished = allWorkouts.find(w => w.workout_date === todayDate && w.published) ?? null;
  const drafts = allWorkouts.filter(w => w.status === "draft");
  const published = allWorkouts.filter(w => w.status === "published");

  if (view === "create" || view === "edit") {
    return (
      <DemoWorkoutEditor
        workoutId={view === "edit" ? editWorkoutId : null}
        onDone={() => { setView("dashboard"); refresh(); }}
      />
    );
  }

  const handleEdit = (id: string) => {
    setEditWorkoutId(id);
    setView("edit");
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Trainer Dashboard</h2>
        <Button onClick={() => setView("create")} size="sm" className="gap-1.5 font-semibold">
          <Plus className="h-4 w-4" /> Create Workout
        </Button>
      </div>

      {/* Today's Published */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Today's Published Workout</h3>
        {loading ? (
          <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : todayPublished ? (
          <WorkoutCard workout={todayPublished} onEdit={handleEdit} highlight />
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No workout published for today.</p>
        )}
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Drafts</h3>
          {drafts.map(w => <WorkoutCard key={w.id} workout={w} onEdit={handleEdit} />)}
        </div>
      )}

      {/* Published */}
      {published.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Published Workouts</h3>
          {published.map(w => <WorkoutCard key={w.id} workout={w} onEdit={handleEdit} />)}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout, onEdit, highlight }: { workout: TrainerWorkout; onEdit: (id: string) => void; highlight?: boolean }) {
  return (
    <div className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
      highlight ? "border-2 border-primary/30 bg-primary/5" : "border-border bg-card"
    }`}>
      <div className="space-y-1 flex-1 min-w-0">
        <p className="font-semibold text-foreground">
          {format(new Date(workout.workout_date + "T00:00:00"), "EEE, MMM d")}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] capitalize">
            {workout.training_type.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-border">
            {workout.phase}
          </Badge>
          <Badge className={`text-[10px] border-0 ${
            workout.status === "published" ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-500"
          }`}>
            {workout.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        {workout.blocks.length > 0 && (
          <p className="text-[10px] text-muted-foreground">{workout.blocks.length} blocks · {workout.blocks.reduce((a, b) => a + b.exercises.length, 0)} exercises</p>
        )}
      </div>
      <button onClick={() => onEdit(workout.id)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors">
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
    </div>
  );
}