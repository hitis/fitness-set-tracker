// Shared workout types — replaces type imports from use-demo.tsx

export type BlockType = "main_lift" | "accessory" | "superset" | "emom" | "amrap" | "tabata" | "finisher" | "conditioning" | "core" | "mobility";

export interface DemoBlock {
  id: string;
  name: string;
  block_type: BlockType;
  notes: string | null;
  sort_order: number;
  exercises: DemoExercise[];
}

export interface DemoExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  notes: string | null;
  sort_order: number;
}

export interface PreviousSetEntry {
  set_number: number;
  weight: number;
  reps: number;
  rpe: number;
}

export interface PreviousEntry {
  date: string;
  sets: PreviousSetEntry[];
  notes: string | null;
}

export interface WorkoutLogSet {
  set_number: number;
  weight: number;
  reps: number;
  rpe: number;
  notes: string | null;
  pain_flag: boolean;
  pain_areas: string[];
}

export interface ConditioningLogEntry {
  exercise_id: string;
  completed: boolean;
  weight: number | null;
  rounds: number | null;
  rpe: number | null;
  notes: string | null;
  pain_areas: string[];
}

export interface WorkoutLog {
  user_id: string;
  workout_id: string;
  workout_date: string;
  status: "not_started" | "in_progress" | "completed";
  session_rpe: number | null;
  session_notes: string | null;
  strength_logs: Record<string, WorkoutLogSet[]>;
  conditioning_logs: Record<string, ConditioningLogEntry>;
  updated_at: string;
}

export interface HistorySetLog {
  set_number: number;
  weight: number;
  reps: number;
  rpe: number;
  notes: string | null;
  pain_flag: boolean;
  pain_area: string | null;
}