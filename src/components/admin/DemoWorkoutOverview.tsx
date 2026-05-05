import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { AdminWorkoutSummary, AdminMemberSummary } from "@/hooks/use-demo";
import { DEMO_TODAY_WORKOUT } from "@/hooks/use-demo";

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
                    {set.pain_flag && (
                      <span className="flex items-center gap-1 text-xs text-destructive ml-auto">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {set.pain_area || "Pain"}
                      </span>
                    )}
                    {!set.pain_flag && set.notes && (
                      <span className="text-xs text-muted-foreground italic ml-auto truncate max-w-[100px]">{set.notes}</span>
                    )}
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

export function DemoWorkoutOverview({ summary, onBack }: { summary: AdminWorkoutSummary; onBack: () => void }) {
  const [selectedMember, setSelectedMember] = useState<AdminMemberSummary | null>(null);

  if (selectedMember) {
    return <MemberDetail member={selectedMember} onBack={() => setSelectedMember(null)} />;
  }

  // Try to find blocks for this workout from today's workout data
  const blocks = summary.workout_id === DEMO_TODAY_WORKOUT.id ? DEMO_TODAY_WORKOUT.blocks : null;

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

      {/* Blocks/Exercises */}
      {blocks && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Exercises</h3>
          {blocks.map((block) => (
            <div key={block.id} className="rounded-xl border border-border bg-card p-3 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{block.name}</p>
                {block.name.toLowerCase().replace(/\s+/g, "_") !== block.block_type && (
                  <Badge variant="outline" className="text-[10px] capitalize border-border">
                    {block.block_type.replace("_", " ")}
                  </Badge>
                )}
              </div>
              {block.exercises.map((ex) => (
                <p key={ex.id} className="text-xs text-muted-foreground pl-2">
                  {ex.exercise_name} — {ex.prescribed_sets} × {ex.prescribed_reps}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

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