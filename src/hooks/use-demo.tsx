import { createContext, useContext, useState, type ReactNode } from "react";
import type { AppRole } from "@/hooks/use-auth";

// ─── Callback for history updates ────────────────────────────
type HistoryUpdateCallback = () => void;
let historyUpdateListeners: HistoryUpdateCallback[] = [];
export function onHistoryUpdate(cb: HistoryUpdateCallback) {
  historyUpdateListeners.push(cb);
  return () => { historyUpdateListeners = historyUpdateListeners.filter((l) => l !== cb); };
}
function notifyHistoryUpdate() { historyUpdateListeners.forEach((cb) => cb()); }

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

// ─── Helpers ─────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
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

export interface TrainerWorkout {
  id: string;
  workout_date: string;
  training_type: string;
  phase: string;
  notes: string | null;
  status: "draft" | "published";
  blocks: DemoBlock[];
  created_at: string;
  updated_at: string;
}

// ─── Shared Trainer Workout Store ────────────────────────────
const _trainerWorkouts: Map<string, TrainerWorkout> = new Map();
let _workoutStoreListeners: (() => void)[] = [];

export function onWorkoutStoreUpdate(cb: () => void) {
  _workoutStoreListeners.push(cb);
  return () => { _workoutStoreListeners = _workoutStoreListeners.filter(l => l !== cb); };
}
function notifyWorkoutStoreUpdate() { _workoutStoreListeners.forEach(cb => cb()); }

export function saveTrainerWorkout(w: TrainerWorkout): void {
  _trainerWorkouts.set(w.id, { ...w, updated_at: new Date().toISOString() });
  notifyWorkoutStoreUpdate();
}

export function getTrainerWorkout(id: string): TrainerWorkout | null {
  return _trainerWorkouts.get(id) ?? null;
}

export function getAllTrainerWorkouts(): TrainerWorkout[] {
  return Array.from(_trainerWorkouts.values()).sort((a, b) => b.workout_date.localeCompare(a.workout_date));
}

export function getPublishedWorkoutForDate(date: string): TrainerWorkout | null {
  for (const w of _trainerWorkouts.values()) {
    if (w.workout_date === date && w.status === "published") return w;
  }
  return null;
}

// Seed the default workout as published
const _seededWorkout: TrainerWorkout = {
  id: DEMO_WORKOUT_ID,
  workout_date: new Date().toISOString().slice(0, 10),
  training_type: "lower_body",
  phase: "strength",
  notes: "Week 3 — push intensity. Track RPE carefully.",
  status: "published",
  blocks: DEMO_BLOCKS,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: new Date().toISOString(),
};
_trainerWorkouts.set(_seededWorkout.id, _seededWorkout);

// Legacy compat export
export const DEMO_TODAY_WORKOUT = _seededWorkout;

// Previous performance: last 3 entries per exercise
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

export const DEMO_EXERCISE_HISTORY: Record<string, PreviousEntry[]> = {
  "exd-1": [
    { date: daysAgo(2), sets: [
      { set_number: 1, weight: 100, reps: 8, rpe: 8 },
      { set_number: 2, weight: 100, reps: 8, rpe: 8 },
      { set_number: 3, weight: 95, reps: 8, rpe: 9 },
      { set_number: 4, weight: 95, reps: 7, rpe: 9 },
    ], notes: "Felt good, could go heavier" },
    { date: daysAgo(9), sets: [
      { set_number: 1, weight: 95, reps: 8, rpe: 7 },
      { set_number: 2, weight: 95, reps: 8, rpe: 7 },
      { set_number: 3, weight: 90, reps: 8, rpe: 8 },
      { set_number: 4, weight: 90, reps: 8, rpe: 8 },
    ], notes: "Smooth reps" },
    { date: daysAgo(16), sets: [
      { set_number: 1, weight: 90, reps: 8, rpe: 7 },
      { set_number: 2, weight: 90, reps: 8, rpe: 7 },
      { set_number: 3, weight: 85, reps: 8, rpe: 7 },
      { set_number: 4, weight: 85, reps: 8, rpe: 7 },
    ], notes: null },
  ],
  "exd-2": [
    { date: daysAgo(2), sets: [
      { set_number: 1, weight: 80, reps: 10, rpe: 7 },
      { set_number: 2, weight: 80, reps: 10, rpe: 7 },
      { set_number: 3, weight: 80, reps: 9, rpe: 8 },
    ], notes: null },
    { date: daysAgo(9), sets: [
      { set_number: 1, weight: 75, reps: 10, rpe: 7 },
      { set_number: 2, weight: 75, reps: 10, rpe: 7 },
      { set_number: 3, weight: 75, reps: 10, rpe: 7 },
    ], notes: "Good stretch" },
    { date: daysAgo(16), sets: [
      { set_number: 1, weight: 70, reps: 10, rpe: 6 },
      { set_number: 2, weight: 70, reps: 10, rpe: 6 },
      { set_number: 3, weight: 70, reps: 10, rpe: 7 },
    ], notes: null },
  ],
  "exd-3": [
    { date: daysAgo(2), sets: [
      { set_number: 1, weight: 24, reps: 10, rpe: 8 },
      { set_number: 2, weight: 24, reps: 10, rpe: 8 },
      { set_number: 3, weight: 22, reps: 10, rpe: 8 },
    ], notes: "Left side weaker" },
    { date: daysAgo(9), sets: [
      { set_number: 1, weight: 22, reps: 10, rpe: 7 },
      { set_number: 2, weight: 22, reps: 10, rpe: 7 },
      { set_number: 3, weight: 22, reps: 10, rpe: 7 },
    ], notes: null },
    { date: daysAgo(16), sets: [
      { set_number: 1, weight: 20, reps: 10, rpe: 7 },
      { set_number: 2, weight: 20, reps: 10, rpe: 7 },
      { set_number: 3, weight: 20, reps: 10, rpe: 7 },
    ], notes: null },
  ],
  "exd-4": [
    { date: daysAgo(2), sets: [
      { set_number: 1, weight: 180, reps: 12, rpe: 7 },
      { set_number: 2, weight: 180, reps: 12, rpe: 7 },
      { set_number: 3, weight: 180, reps: 11, rpe: 8 },
      { set_number: 4, weight: 175, reps: 12, rpe: 8 },
    ], notes: null },
    { date: daysAgo(9), sets: [
      { set_number: 1, weight: 170, reps: 12, rpe: 7 },
      { set_number: 2, weight: 170, reps: 12, rpe: 7 },
      { set_number: 3, weight: 170, reps: 11, rpe: 7 },
      { set_number: 4, weight: 170, reps: 10, rpe: 8 },
    ], notes: "Bumped weight" },
    { date: daysAgo(16), sets: [
      { set_number: 1, weight: 160, reps: 12, rpe: 6 },
      { set_number: 2, weight: 160, reps: 12, rpe: 6 },
      { set_number: 3, weight: 160, reps: 12, rpe: 7 },
      { set_number: 4, weight: 160, reps: 12, rpe: 7 },
    ], notes: null },
  ],
  "exd-5": [
    { date: daysAgo(2), sets: [
      { set_number: 1, weight: 40, reps: 18, rpe: 6 },
      { set_number: 2, weight: 40, reps: 15, rpe: 7 },
      { set_number: 3, weight: 35, reps: 20, rpe: 6 },
    ], notes: null },
    { date: daysAgo(9), sets: [
      { set_number: 1, weight: 35, reps: 20, rpe: 6 },
      { set_number: 2, weight: 35, reps: 18, rpe: 6 },
      { set_number: 3, weight: 35, reps: 15, rpe: 7 },
    ], notes: null },
    { date: daysAgo(16), sets: [
      { set_number: 1, weight: 35, reps: 15, rpe: 5 },
      { set_number: 2, weight: 30, reps: 18, rpe: 5 },
      { set_number: 3, weight: 30, reps: 15, rpe: 6 },
    ], notes: null },
  ],
};

export const DEMO_RECENT_WORKOUTS: TrainerWorkout[] = [
  { id: "w-1", workout_date: daysAgo(2), training_type: "upper_body", phase: "strength", status: "published", notes: null, blocks: [], created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: "w-2", workout_date: daysAgo(4), training_type: "lower_body", phase: "hypertrophy", status: "published", notes: null, blocks: [], created_at: daysAgo(4), updated_at: daysAgo(4) },
  { id: "w-3", workout_date: daysAgo(6), training_type: "full_body", phase: "strength", status: "published", notes: null, blocks: [], created_at: daysAgo(6), updated_at: daysAgo(6) },
];
// Seed recent workouts into the store
DEMO_RECENT_WORKOUTS.forEach(w => _trainerWorkouts.set(w.id, w));

export interface HistorySetLog {
  set_number: number;
  weight: number;
  reps: number;
  rpe: number;
  notes: string | null;
  pain_flag: boolean;
  pain_area: string | null;
}

export interface HistoryExerciseDetail {
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  sets: HistorySetLog[];
}

export interface HistoryWorkoutDetail {
  workout_date: string;
  training_type: string;
  phase: string;
  session_rpe: number | null;
  notes: string | null;
  completed: boolean;
  exercises: HistoryExerciseDetail[];
}

export const DEMO_MEMBER_HISTORY: Array<{
  id: string;
  workout_date: string;
  training_type: string;
  phase: string;
  session_rpe: number | null;
  completed: boolean;
  exercise_count: number;
}> = [
  { id: "s-1", workout_date: daysAgo(2), training_type: "upper_body", phase: "strength", session_rpe: 8, completed: true, exercise_count: 15 },
  { id: "s-2", workout_date: daysAgo(4), training_type: "lower_body", phase: "hypertrophy", session_rpe: 7, completed: true, exercise_count: 18 },
  { id: "s-3", workout_date: daysAgo(6), training_type: "full_body", phase: "strength", session_rpe: 9, completed: true, exercise_count: 20 },
];

export const DEMO_HISTORY_DETAILS: Record<string, HistoryWorkoutDetail> = {
  "s-1": {
    workout_date: daysAgo(2), training_type: "upper_body", phase: "strength", session_rpe: 8, notes: "Great session overall", completed: true,
    exercises: [
      { exercise_name: "Bench Press", prescribed_sets: 4, prescribed_reps: "6-8", sets: [
        { set_number: 1, weight: 80, reps: 8, rpe: 7, notes: null, pain_flag: false, pain_area: null },
        { set_number: 2, weight: 82.5, reps: 7, rpe: 8, notes: null, pain_flag: false, pain_area: null },
        { set_number: 3, weight: 82.5, reps: 6, rpe: 8, notes: null, pain_flag: false, pain_area: null },
        { set_number: 4, weight: 80, reps: 7, rpe: 9, notes: "Grinder", pain_flag: false, pain_area: null },
      ]},
      { exercise_name: "Barbell Row", prescribed_sets: 3, prescribed_reps: "8-10", sets: [
        { set_number: 1, weight: 70, reps: 10, rpe: 7, notes: null, pain_flag: false, pain_area: null },
        { set_number: 2, weight: 70, reps: 9, rpe: 7, notes: null, pain_flag: false, pain_area: null },
        { set_number: 3, weight: 72.5, reps: 8, rpe: 8, notes: null, pain_flag: false, pain_area: null },
      ]},
      { exercise_name: "Overhead Press", prescribed_sets: 3, prescribed_reps: "8", sets: [
        { set_number: 1, weight: 45, reps: 8, rpe: 7, notes: null, pain_flag: true, pain_area: "shoulder" },
        { set_number: 2, weight: 42.5, reps: 8, rpe: 7, notes: "Dropped weight", pain_flag: false, pain_area: null },
        { set_number: 3, weight: 42.5, reps: 8, rpe: 8, notes: null, pain_flag: false, pain_area: null },
      ]},
    ],
  },
  "s-2": {
    workout_date: daysAgo(4), training_type: "lower_body", phase: "hypertrophy", session_rpe: 7, notes: null, completed: true,
    exercises: [
      { exercise_name: "Back Squat", prescribed_sets: 4, prescribed_reps: "10-12", sets: [
        { set_number: 1, weight: 85, reps: 12, rpe: 7, notes: null, pain_flag: false, pain_area: null },
        { set_number: 2, weight: 85, reps: 11, rpe: 7, notes: null, pain_flag: false, pain_area: null },
        { set_number: 3, weight: 87.5, reps: 10, rpe: 8, notes: null, pain_flag: false, pain_area: null },
        { set_number: 4, weight: 87.5, reps: 10, rpe: 8, notes: null, pain_flag: false, pain_area: null },
      ]},
      { exercise_name: "Leg Curl", prescribed_sets: 3, prescribed_reps: "12", sets: [
        { set_number: 1, weight: 50, reps: 12, rpe: 6, notes: null, pain_flag: false, pain_area: null },
        { set_number: 2, weight: 55, reps: 12, rpe: 7, notes: null, pain_flag: false, pain_area: null },
        { set_number: 3, weight: 55, reps: 11, rpe: 8, notes: null, pain_flag: false, pain_area: null },
      ]},
    ],
  },
  "s-3": {
    workout_date: daysAgo(6), training_type: "full_body", phase: "strength", session_rpe: 9, notes: "Tough one, but finished strong", completed: true,
    exercises: [
      { exercise_name: "Deadlift", prescribed_sets: 3, prescribed_reps: "5", sets: [
        { set_number: 1, weight: 140, reps: 5, rpe: 8, notes: null, pain_flag: false, pain_area: null },
        { set_number: 2, weight: 145, reps: 5, rpe: 9, notes: null, pain_flag: false, pain_area: null },
        { set_number: 3, weight: 150, reps: 4, rpe: 10, notes: "Missed last rep", pain_flag: true, pain_area: "back" },
      ]},
      { exercise_name: "Pull-ups", prescribed_sets: 3, prescribed_reps: "8", sets: [
        { set_number: 1, weight: 0, reps: 8, rpe: 7, notes: "Bodyweight", pain_flag: false, pain_area: null },
        { set_number: 2, weight: 0, reps: 7, rpe: 8, notes: null, pain_flag: false, pain_area: null },
        { set_number: 3, weight: 0, reps: 6, rpe: 9, notes: null, pain_flag: false, pain_area: null },
      ]},
    ],
  },
};

// ─── Admin Data ──────────────────────────────────────────────
export interface AdminMemberSummary {
  id: string;
  name: string;
  status: "completed" | "in_progress" | "not_started";
  session_rpe: number | null;
  pain_flags: number;
  sets_logged: number;
  exercises: HistoryExerciseDetail[];
}

export interface AdminWorkoutSummary {
  workout_id: string;
  workout_date: string;
  training_type: string;
  phase: string;
  total_members: number;
  completed_count: number;
  not_started_count: number;
  avg_session_rpe: number | null;
  pain_flag_count: number;
  members: AdminMemberSummary[];
}

export const DEMO_ADMIN_WORKOUT_DETAILS: AdminWorkoutSummary[] = [
  {
    workout_id: DEMO_WORKOUT_ID,
    workout_date: new Date().toISOString().slice(0, 10),
    training_type: "lower_body", phase: "strength",
    total_members: 4, completed_count: 2, not_started_count: 1, avg_session_rpe: 8, pain_flag_count: 1,
    members: [
      { id: "m-1", name: "Alex Rivera", status: "completed", session_rpe: 8, pain_flags: 0, sets_logged: 14, exercises: [
        { exercise_name: "Back Squat", prescribed_sets: 4, prescribed_reps: "6-8", sets: [
          { set_number: 1, weight: 110, reps: 8, rpe: 7, notes: null, pain_flag: false, pain_area: null },
          { set_number: 2, weight: 115, reps: 7, rpe: 8, notes: null, pain_flag: false, pain_area: null },
          { set_number: 3, weight: 115, reps: 6, rpe: 8, notes: null, pain_flag: false, pain_area: null },
          { set_number: 4, weight: 110, reps: 7, rpe: 9, notes: null, pain_flag: false, pain_area: null },
        ]},
        { exercise_name: "Romanian Deadlift", prescribed_sets: 3, prescribed_reps: "8-10", sets: [
          { set_number: 1, weight: 90, reps: 10, rpe: 7, notes: null, pain_flag: false, pain_area: null },
          { set_number: 2, weight: 90, reps: 9, rpe: 7, notes: null, pain_flag: false, pain_area: null },
          { set_number: 3, weight: 95, reps: 8, rpe: 8, notes: null, pain_flag: false, pain_area: null },
        ]},
      ]},
      { id: "m-2", name: "Jordan Lee", status: "completed", session_rpe: 7, pain_flags: 1, sets_logged: 12, exercises: [
        { exercise_name: "Back Squat", prescribed_sets: 4, prescribed_reps: "6-8", sets: [
          { set_number: 1, weight: 90, reps: 8, rpe: 7, notes: null, pain_flag: false, pain_area: null },
          { set_number: 2, weight: 92.5, reps: 7, rpe: 8, notes: null, pain_flag: false, pain_area: null },
          { set_number: 3, weight: 92.5, reps: 6, rpe: 8, notes: null, pain_flag: true, pain_area: "knee" },
          { set_number: 4, weight: 90, reps: 7, rpe: 8, notes: "Dropped weight due to knee", pain_flag: false, pain_area: null },
        ]},
      ]},
      { id: "m-3", name: "Sam Chen", status: "in_progress", session_rpe: null, pain_flags: 0, sets_logged: 6, exercises: [
        { exercise_name: "Back Squat", prescribed_sets: 4, prescribed_reps: "6-8", sets: [
          { set_number: 1, weight: 80, reps: 8, rpe: 7, notes: null, pain_flag: false, pain_area: null },
          { set_number: 2, weight: 82.5, reps: 7, rpe: 7, notes: null, pain_flag: false, pain_area: null },
        ]},
      ]},
      { id: "m-4", name: "Morgan Blake", status: "not_started", session_rpe: null, pain_flags: 0, sets_logged: 0, exercises: [] },
    ],
  },
  {
    workout_id: "w-1",
    workout_date: daysAgo(2), training_type: "upper_body", phase: "strength",
    total_members: 4, completed_count: 3, not_started_count: 0, avg_session_rpe: 8, pain_flag_count: 1,
    members: [
      { id: "m-1", name: "Alex Rivera", status: "completed", session_rpe: 8, pain_flags: 0, sets_logged: 15, exercises: [] },
      { id: "m-2", name: "Jordan Lee", status: "completed", session_rpe: 7, pain_flags: 0, sets_logged: 14, exercises: [] },
      { id: "m-3", name: "Sam Chen", status: "completed", session_rpe: 9, pain_flags: 1, sets_logged: 15, exercises: [] },
      { id: "m-4", name: "Morgan Blake", status: "in_progress", session_rpe: null, pain_flags: 0, sets_logged: 4, exercises: [] },
    ],
  },
  {
    workout_id: "w-2",
    workout_date: daysAgo(4), training_type: "lower_body", phase: "hypertrophy",
    total_members: 3, completed_count: 3, not_started_count: 0, avg_session_rpe: 7, pain_flag_count: 0,
    members: [
      { id: "m-1", name: "Alex Rivera", status: "completed", session_rpe: 7, pain_flags: 0, sets_logged: 18, exercises: [] },
      { id: "m-2", name: "Jordan Lee", status: "completed", session_rpe: 7, pain_flags: 0, sets_logged: 16, exercises: [] },
      { id: "m-3", name: "Sam Chen", status: "completed", session_rpe: 8, pain_flags: 0, sets_logged: 17, exercises: [] },
    ],
  },
];

export const DEMO_ADMIN_LOGS = [
  { id: "al-1", completed: true, session_rpe: 8, notes: "Great session, hit all targets", created_at: new Date().toISOString(), profile_name: "Alex Rivera", workout_date: daysAgo(1), training_type: "lower_body" },
  { id: "al-2", completed: true, session_rpe: 7, notes: null, created_at: new Date().toISOString(), profile_name: "Jordan Lee", workout_date: daysAgo(1), training_type: "lower_body" },
  { id: "al-3", completed: true, session_rpe: 9, notes: "Shoulder felt tight on last set", created_at: new Date().toISOString(), profile_name: "Sam Chen", workout_date: daysAgo(2), training_type: "upper_body" },
  { id: "al-4", completed: false, session_rpe: null, notes: null, created_at: new Date().toISOString(), profile_name: "Morgan Blake", workout_date: daysAgo(2), training_type: "upper_body" },
];

// ─── Mutable history for demo ────────────────────────────────
export function addDemoHistoryEntry(entry: typeof DEMO_MEMBER_HISTORY[number], detail: HistoryWorkoutDetail) {
  DEMO_MEMBER_HISTORY.unshift(entry);
  DEMO_HISTORY_DETAILS[entry.id] = detail;
  notifyHistoryUpdate();
}

// ─── Central Workout Log Store ─────────────────────────────
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

const _workoutLogs: Record<string, WorkoutLog> = {};

function logKey(userId: string, workoutId: string, date: string) {
  return `${userId}:${workoutId}:${date}`;
}

export function getWorkoutLog(userId: string, workoutId: string, date: string): WorkoutLog | null {
  return _workoutLogs[logKey(userId, workoutId, date)] || null;
}

export function getOrCreateWorkoutLog(userId: string, workoutId: string, date: string): WorkoutLog {
  const key = logKey(userId, workoutId, date);
  if (!_workoutLogs[key]) {
    _workoutLogs[key] = {
      user_id: userId,
      workout_id: workoutId,
      workout_date: date,
      status: "not_started",
      session_rpe: null,
      session_notes: null,
      strength_logs: {},
      conditioning_logs: {},
      updated_at: new Date().toISOString(),
    };
  }
  return _workoutLogs[key];
}

export function updateWorkoutLog(log: WorkoutLog): void {
  const key = logKey(log.user_id, log.workout_id, log.workout_date);
  _workoutLogs[key] = { ...log, updated_at: new Date().toISOString() };
}

// ─── Persisted demo role helpers ─────────────────────────────
const DEMO_ROLE_KEY = "gymlog-demo-role";
const DEMO_MODE_KEY = "gymlog-demo-mode";

function getPersistedRole(): AppRole {
  if (typeof window === "undefined") return "member";
  return (localStorage.getItem(DEMO_ROLE_KEY) as AppRole) || "member";
}

function getPersistedDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

export function clearDemoMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_ROLE_KEY);
  localStorage.removeItem(DEMO_MODE_KEY);
}

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
  const [role, setRoleState] = useState<AppRole>("member");

  const setRole = (r: AppRole) => {
    setRoleState(r);
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, role, setRole, userId: DEMO_USER_ID }}>
      {children}
    </DemoContext.Provider>
  );
}

export function DemoProviderWithRole({ children, forceDemo, initialRole }: { children: ReactNode; forceDemo?: boolean; initialRole: AppRole }) {
  const [isDemoMode] = useState(forceDemo ?? true);
  const [role, setRoleState] = useState<AppRole>(initialRole);

  // Persist role changes to localStorage
  const setRole = (r: AppRole) => {
    setRoleState(r);
    if (isDemoMode) {
      localStorage.setItem(DEMO_ROLE_KEY, r);
    }
  };

  // On mount, sync initial role to localStorage if demo
  useState(() => {
    if (isDemoMode && forceDemo) {
      localStorage.setItem(DEMO_ROLE_KEY, initialRole);
      localStorage.setItem(DEMO_MODE_KEY, "true");
    }
  });

  return (
    <DemoContext.Provider value={{ isDemoMode, role, setRole, userId: DEMO_USER_ID }}>
      {children}
    </DemoContext.Provider>
  );
}

/** Auto-detects demo mode and role from localStorage. For use on sub-routes. */
export function DemoProviderAuto({ children }: { children: ReactNode }) {
  const isDemoMode = getPersistedDemoMode();
  const [role, setRoleState] = useState<AppRole>(getPersistedRole());

  const setRole = (r: AppRole) => {
    setRoleState(r);
    localStorage.setItem(DEMO_ROLE_KEY, r);
  };

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