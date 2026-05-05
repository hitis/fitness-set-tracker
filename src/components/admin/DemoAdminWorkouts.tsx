import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ArrowLeft, AlertTriangle, Users, Check } from "lucide-react";
import { format } from "date-fns";
import {
  DEMO_TODAY_WORKOUT,
  DEMO_RECENT_WORKOUTS,
  DEMO_ADMIN_WORKOUT_DETAILS,
  type AdminWorkoutSummary,
  type AdminMemberSummary,
  type HistoryExerciseDetail,
} from "@/hooks/use-demo";

function MemberDetail({ member, onBack }: { member: AdminMemberSummary; onBack: () => void }) {
  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">{member.name}</h2>
          <p className="text-xs text-muted-foreground capitalize">{member.status.replace("_", " ")}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{member.sets_logged}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Sets</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-foreground">{member.session_rpe ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground uppercase">RPE</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-destructive">{member.pain_flags}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Pain</p>
        </div>
      </div>

      {member.exercises.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No exercise logs available</p>
      ) : (
        <div className="space-y-4">
          {member.exercises.map((ex, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="font-semibold text-foreground">{ex.exercise_name}</p>
                <p className="text-xs text-muted-foreground">{ex.prescribed_sets} × {ex.prescribed_reps}</p>
              </div>
              <div className="divide-y divide-border">
                {ex.sets.map((set) => (
                  <div key={set.set_number} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-8 text-xs font-bold text-muted-foreground">S{set.set_number}</span>
                    <span className="text-sm font-semibold text-foreground min-w-[60px]">
                      {set.weight > 0 ? `${set.weight}kg` : "BW"}
                    </span>
                    <span className="text-sm text-foreground">× {set.reps}</span>
                    <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                    {set.pain_flag && <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto" />}
                    {set.notes && <span className="text-xs text-muted-foreground italic ml-auto truncate max-w-[80px]">{set.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutOverview({ summary, onBack }: { summary: AdminWorkoutSummary; onBack: () => void }) {
  const [selectedMember, setSelectedMember] = useState<AdminMemberSummary | null>(null);

  if (selectedMember) {
    return <MemberDetail member={selectedMember} onBack={() => setSelectedMember(null)} />;
  }

  const statusColor = (s: string) => {
    if (s === "completed") return "text-primary";
    if (s === "in_progress") return "text-yellow-500";
    return "text-muted-foreground";
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground capitalize">
            {summary.training_type.replace("_", " ")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {format(new Date(summary.workout_date + "T00:00:00"), "EEEE, MMMM d")} · {summary.phase}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{summary.completed_count}/{summary.total_members}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{summary.avg_session_rpe ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Avg RPE</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{summary.not_started_count}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Not Started</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{summary.pain_flag_count}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Pain Flags</p>
        </div>
      </div>

      {/* Members */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Members</h3>
        {summary.members.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMember(m)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
              {m.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{m.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-medium capitalize ${statusColor(m.status)}`}>
                  {m.status.replace("_", " ")}
                </span>
                {m.session_rpe != null && (
                  <span className="text-xs text-muted-foreground">RPE {m.session_rpe}</span>
                )}
                {m.pain_flags > 0 && (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">{m.sets_logged} sets</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function DemoAdminWorkouts() {
  const [selectedWorkout, setSelectedWorkout] = useState<AdminWorkoutSummary | null>(null);
  const allWorkouts = [DEMO_TODAY_WORKOUT, ...DEMO_RECENT_WORKOUTS];

  if (selectedWorkout) {
    return <WorkoutOverview summary={selectedWorkout} onBack={() => setSelectedWorkout(null)} />;
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Workouts</h2>
        <Button size="sm" className="gap-1.5 font-semibold">
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{allWorkouts.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Workouts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">4</p>
          <p className="text-[10px] text-muted-foreground uppercase">Members</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-primary">75%</p>
          <p className="text-[10px] text-muted-foreground uppercase">Completion</p>
        </div>
      </div>

      <div className="space-y-2">
        {allWorkouts.map((w) => {
          const detail = DEMO_ADMIN_WORKOUT_DETAILS.find((d) => d.workout_id === w.id);
          return (
            <button
              key={w.id}
              onClick={() => detail && setSelectedWorkout(detail)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98]"
            >
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {format(new Date(w.workout_date + "T00:00:00"), "EEE, MMM d")}
                </p>
                <div className="flex gap-1.5">
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {w.training_type.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-border">
                    {w.phase}
                  </Badge>
                </div>
                {detail && (
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {detail.completed_count}/{detail.total_members} done
                    </span>
                    {detail.pain_flag_count > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                        <AlertTriangle className="h-3 w-3" /> {detail.pain_flag_count}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {w.status === "published" && (
                  <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Live
                  </span>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}