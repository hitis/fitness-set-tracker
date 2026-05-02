import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AppRole } from "@/hooks/use-auth";

// ─── Types ───────────────────────────────────────────────────
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

// ─── Mock Data ───────────────────────────────────────────────
const DEMO_USER_ID = "demo-user-001";
const DEMO_WORKOUT_ID = "demo-workout-001";

const DEMO_BLOCKS: DemoBlock[] = [
  {
    id: "block-1",
    name: "Main Lift",
    block_type: "main_lift",
    notes: null,
    sort_order: 0,
    exercises: [
      { id: "ex-1", exercise_id: "exd-1", exercise_name: "Back Squat", prescribed_sets: 4, prescribed_reps: "6-8", notes: "Focus on depth, pause at bottom", sort_order: 0 },
    ],
  },
  {
    id: "block-2",
    name: "Accessory",
    block_type: "accessory",
    notes: null,
    sort_order: 1,
    exercises: [
      { id: "ex-2", exercise_id: "exd-2", exercise_name: "Romanian Deadlift", prescribed_sets: 3, prescribed_reps: "8-10", notes: "Slow eccentric, feel hamstrings", sort_order: 0 },
      { id: "ex-3", exercise_id: "exd-3", exercise_name: "Bulgarian Split Squat", prescribed_sets: 3, prescribed_reps: "10 each", notes: null, sort_order: 1 },
      { id: "ex-4", exercise_id: "exd-4", exercise_name: "Leg Press", prescribed_sets: 4, prescribed_reps: "10-12", notes: "Feet high and wide", sort_order: 2 },
    ],
  },
  {
    id: "block-3",
    name: "Finisher",
    block_type: "finisher",
    notes: "Push through, keep rest under 60s",
    sort_order: 2,
    exercises: [
      { id: "ex-5", exercise_id: "exd-5", exercise_name: "Seated Calf Raise", prescribed_sets: 3, prescribed_reps: "15-20", notes: "Full stretch at bottom", sort_order: 0 },
    ],
  },
];

export const DEMO_TODAY_WORKOUT = {
  id: DEMO_WORKOUT_ID,
  workout_date: new Date().toISOString().slice(0, 10),
  training_type: "lower_body",
  phase: "strength",
  notes: "Week 3 — push intensity. Track RPE carefully.",
  published: true,
  blocks: DEMO_BLOCKS,
};

export const DEMO_PREVIOUS_PERFORMANCE: Record<string, { weight: number; reps: number; rpe: number; notes: string | null }> = {
  "exd-1": { weight: 100, reps: 8, rpe: 8, notes: "Felt good, could go heavier" },
  "exd-2": { weight: 80, reps: 10, rpe: 7, notes: null },
  "exd-3": { weight: 24, reps: 10, rpe: 8, notes: "Left side weaker" },
  "exd-4": { weight: 180, reps: 12, rpe: 7, notes: null },
  "exd-5": { weight: 40, reps: 18, rpe: 6, notes: null },
};

export const DEMO_RECENT_WORKOUTS = [
  { id: "w-1", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })(), training_type: "upper_body", phase: "strength", published: true, notes: null },
  { id: "w-2", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 4); return d.toISOString().slice(0, 10); })(), training_type: "lower_body", phase: "hypertrophy", published: true, notes: null },
  { id: "w-3", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })(), training_type: "full_body", phase: "strength", published: true, notes: null },
];

export const DEMO_MEMBER_HISTORY = [
  { id: "s-1", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })(), training_type: "upper_body", phase: "strength", session_rpe: 8, completed: true, exercise_count: 15 },
  { id: "s-2", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 4); return d.toISOString().slice(0, 10); })(), training_type: "lower_body", phase: "hypertrophy", session_rpe: 7, completed: true, exercise_count: 18 },
  { id: "s-3", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })(), training_type: "full_body", phase: "strength", session_rpe: 9, completed: true, exercise_count: 20 },
];

export const DEMO_ADMIN_LOGS = [
  { id: "al-1", completed: true, session_rpe: 8, notes: "Great session, hit all targets", created_at: new Date().toISOString(), profile_name: "Alex Rivera", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })(), training_type: "lower_body" },
  { id: "al-2", completed: true, session_rpe: 7, notes: null, created_at: new Date().toISOString(), profile_name: "Jordan Lee", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })(), training_type: "lower_body" },
  { id: "al-3", completed: true, session_rpe: 9, notes: "Shoulder felt tight on last set", created_at: new Date().toISOString(), profile_name: "Sam Chen", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })(), training_type: "upper_body" },
  { id: "al-4", completed: false, session_rpe: null, notes: null, created_at: new Date().toISOString(), profile_name: "Morgan Blake", workout_date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })(), training_type: "upper_body" },
];

// ─── Context ─────────────────────────────────────────────────
interface DemoContextValue {
  isDemoMode: boolean;
  role: AppRole;
  setRole: (r: AppRole) => void;
  userId: string;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children, forceDemo }: { children: ReactNode; forceDemo?: boolean }) {
  const [isDemoMode] = useState(forceDemo ?? true);
  const [role, setRole] = useState<AppRole>("member");

  return (
    <DemoContext.Provider value={{ isDemoMode, role, setRole, userId: DEMO_USER_ID }}>
      {children}
    </DemoContext.Provider>
  );
}

export function DemoProviderWithRole({ children, forceDemo, initialRole }: { children: ReactNode; forceDemo?: boolean; initialRole: AppRole }) {
  const [isDemoMode] = useState(forceDemo ?? true);
  const [role, setRole] = useState<AppRole>(initialRole);

  return (
    <DemoContext.Provider value={{ isDemoMode, role, setRole, userId: DEMO_USER_ID }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be inside DemoProvider");
  return ctx;
}