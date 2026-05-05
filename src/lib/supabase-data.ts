import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────
export type BlockType = "main_lift" | "accessory" | "superset" | "emom" | "amrap" | "tabata" | "finisher" | "conditioning" | "core" | "mobility";
export type TrainingType = "lower_body" | "upper_body" | "full_body" | "mobility" | "conditioning";
export type WorkoutPhase = "strength" | "endurance" | "hypertrophy" | "power" | "testing" | "deload";
export type PainArea = "wrist" | "shoulder" | "back" | "knee" | "ankle" | "other";

export interface DbExercise {
  id: string;
  name: string;
}

export interface DbWorkoutExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  notes: string | null;
  sort_order: number;
}

export interface DbBlock {
  id: string;
  name: string;
  block_type: BlockType;
  notes: string | null;
  sort_order: number;
  exercises: DbWorkoutExercise[];
}

export interface DbWorkout {
  id: string;
  workout_date: string;
  training_type: TrainingType;
  phase: WorkoutPhase;
  notes: string | null;
  published: boolean;
  created_by: string | null;
  created_at: string;
  blocks: DbBlock[];
}

export interface DbSetLog {
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
  pain_flag: boolean;
  pain_area: PainArea | null;
}

export interface DbSession {
  id: string;
  user_id: string;
  workout_id: string;
  completed: boolean;
  session_rpe: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Exercise lookup / creation ──────────────────────────────
const exerciseCache: Map<string, string> = new Map();

export async function findOrCreateExercise(name: string): Promise<string> {
  const normalized = name.trim();
  if (!normalized) throw new Error("Exercise name cannot be empty");
  
  const cached = exerciseCache.get(normalized.toLowerCase());
  if (cached) return cached;

  // Try to find existing
  const { data: existing } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", normalized)
    .limit(1)
    .single();

  if (existing) {
    exerciseCache.set(normalized.toLowerCase(), existing.id);
    return existing.id;
  }

  // Create new
  const { data: created, error } = await supabase
    .from("exercises")
    .insert({ name: normalized })
    .select("id")
    .single();

  if (error) throw error;
  exerciseCache.set(normalized.toLowerCase(), created.id);
  return created.id;
}

// ─── Trainer: Load workouts ────────────────────────────────
export async function loadAllWorkouts(): Promise<DbWorkout[]> {
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("*")
    .order("workout_date", { ascending: false });

  if (error) throw error;
  if (!workouts || workouts.length === 0) return [];

  const workoutIds = workouts.map((w) => w.id);

  // Load blocks
  const { data: blocks } = await supabase
    .from("workout_blocks")
    .select("*")
    .in("workout_id", workoutIds)
    .order("sort_order");

  // Load exercises
  const blockIds = (blocks || []).map((b) => b.id);
  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("*, exercises(name)")
    .in("block_id", blockIds.length > 0 ? blockIds : ["__none__"])
    .order("sort_order");

  // Assemble
  return workouts.map((w) => {
    const wBlocks = (blocks || []).filter((b) => b.workout_id === w.id);
    return {
      id: w.id,
      workout_date: w.workout_date,
      training_type: w.training_type as TrainingType,
      phase: w.phase as WorkoutPhase,
      notes: w.notes,
      published: w.published,
      created_by: w.created_by,
      created_at: w.created_at,
      blocks: wBlocks.map((b) => {
        const bExercises = (workoutExercises || []).filter((e) => e.block_id === b.id);
        return {
          id: b.id,
          name: b.name,
          block_type: b.block_type as BlockType,
          notes: b.notes,
          sort_order: b.sort_order,
          exercises: bExercises.map((e) => ({
            id: e.id,
            exercise_id: e.exercise_id,
            exercise_name: (e.exercises as unknown as { name: string })?.name || "",
            prescribed_sets: e.prescribed_sets,
            prescribed_reps: e.prescribed_reps,
            notes: e.notes,
            sort_order: e.sort_order,
          })),
        };
      }),
    };
  });
}

export async function loadWorkoutById(id: string): Promise<DbWorkout | null> {
  const all = await loadAllWorkouts();
  return all.find((w) => w.id === id) ?? null;
}

export async function loadPublishedWorkoutForDate(date: string): Promise<DbWorkout | null> {
  const { data: w } = await supabase
    .from("workouts")
    .select("*")
    .eq("workout_date", date)
    .eq("published", true)
    .limit(1)
    .single();

  if (!w) return null;

  // Load blocks
  const { data: blocks } = await supabase
    .from("workout_blocks")
    .select("*")
    .eq("workout_id", w.id)
    .order("sort_order");

  const blockIds = (blocks || []).map((b) => b.id);
  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("*, exercises(name)")
    .in("block_id", blockIds.length > 0 ? blockIds : ["__none__"])
    .order("sort_order");

  return {
    id: w.id,
    workout_date: w.workout_date,
    training_type: w.training_type as TrainingType,
    phase: w.phase as WorkoutPhase,
    notes: w.notes,
    published: w.published,
    created_by: w.created_by,
    created_at: w.created_at,
    blocks: (blocks || []).map((b) => {
      const bExercises = (workoutExercises || []).filter((e) => e.block_id === b.id);
      return {
        id: b.id,
        name: b.name,
        block_type: b.block_type as BlockType,
        notes: b.notes,
        sort_order: b.sort_order,
        exercises: bExercises.map((e) => ({
          id: e.id,
          exercise_id: e.exercise_id,
          exercise_name: (e.exercises as unknown as { name: string })?.name || "",
          prescribed_sets: e.prescribed_sets,
          prescribed_reps: e.prescribed_reps,
          notes: e.notes,
          sort_order: e.sort_order,
        })),
      };
    }),
  };
}

// ─── Trainer: Save workout ────────────────────────────────
export interface SaveWorkoutInput {
  id?: string;
  workout_date: string;
  training_type: TrainingType;
  phase: WorkoutPhase;
  notes: string | null;
  published: boolean;
  created_by: string;
  blocks: {
    id?: string;
    name: string;
    block_type: BlockType;
    notes: string | null;
    sort_order: number;
    exercises: {
      name: string;
      prescribed_sets: number;
      prescribed_reps: string;
      notes: string | null;
      sort_order: number;
    }[];
  }[];
}

export async function saveWorkoutToDb(input: SaveWorkoutInput): Promise<string> {
  const workoutId = input.id || crypto.randomUUID();

  // Upsert workout
  const { error: wErr } = await supabase.from("workouts").upsert({
    id: workoutId,
    workout_date: input.workout_date,
    training_type: input.training_type,
    phase: input.phase,
    notes: input.notes,
    published: input.published,
    created_by: input.created_by,
  });
  if (wErr) throw wErr;

  // Delete old blocks & exercises for this workout
  const { data: oldBlocks } = await supabase
    .from("workout_blocks")
    .select("id")
    .eq("workout_id", workoutId);

  if (oldBlocks && oldBlocks.length > 0) {
    const oldBlockIds = oldBlocks.map((b) => b.id);
    await supabase.from("workout_exercises").delete().in("block_id", oldBlockIds);
    await supabase.from("workout_blocks").delete().eq("workout_id", workoutId);
  }

  // Insert blocks and exercises
  for (const block of input.blocks) {
    const blockId = crypto.randomUUID();
    const { error: bErr } = await supabase.from("workout_blocks").insert({
      id: blockId,
      workout_id: workoutId,
      name: block.name,
      block_type: block.block_type,
      notes: block.notes,
      sort_order: block.sort_order,
    });
    if (bErr) throw bErr;

    for (const ex of block.exercises) {
      const exerciseId = await findOrCreateExercise(ex.name);
      const { error: eErr } = await supabase.from("workout_exercises").insert({
        id: crypto.randomUUID(),
        workout_id: workoutId,
        block_id: blockId,
        exercise_id: exerciseId,
        prescribed_sets: ex.prescribed_sets,
        prescribed_reps: ex.prescribed_reps,
        notes: ex.notes,
        sort_order: ex.sort_order,
      });
      if (eErr) throw eErr;
    }
  }

  return workoutId;
}

// ─── Member: Load set logs ────────────────────────────────
export async function loadSetLogs(
  userId: string,
  workoutId: string
): Promise<Record<string, DbSetLog[]>> {
  const { data, error } = await supabase
    .from("user_set_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .order("set_number");

  if (error) throw error;
  const result: Record<string, DbSetLog[]> = {};
  for (const row of data || []) {
    if (!result[row.exercise_id]) result[row.exercise_id] = [];
    result[row.exercise_id].push({
      set_number: row.set_number,
      weight: row.weight != null ? Number(row.weight) : null,
      reps: row.reps,
      rpe: row.rpe,
      notes: row.notes,
      pain_flag: row.pain_flag,
      pain_area: row.pain_area as PainArea | null,
    });
  }
  return result;
}

export async function upsertSetLog(
  userId: string,
  workoutId: string,
  exerciseId: string,
  setLog: DbSetLog
): Promise<void> {
  const { error } = await supabase.from("user_set_logs").upsert(
    {
      user_id: userId,
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_number: setLog.set_number,
      weight: setLog.weight,
      reps: setLog.reps,
      rpe: setLog.rpe,
      notes: setLog.notes,
      pain_flag: setLog.pain_flag,
      pain_area: setLog.pain_area,
    },
    { onConflict: "user_id,workout_id,exercise_id,set_number" }
  );
  if (error) throw error;
}

export async function upsertMultipleSetLogs(
  userId: string,
  workoutId: string,
  exerciseId: string,
  sets: DbSetLog[]
): Promise<void> {
  for (const s of sets) {
    await upsertSetLog(userId, workoutId, exerciseId, s);
  }
}

// ─── Member: Session management ──────────────────────────
export async function loadSession(
  userId: string,
  workoutId: string
): Promise<DbSession | null> {
  const { data } = await supabase
    .from("user_workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .single();
  return data as DbSession | null;
}

export async function upsertSession(
  userId: string,
  workoutId: string,
  completed: boolean,
  sessionRpe: number | null,
  notes: string | null
): Promise<void> {
  const { error } = await supabase.from("user_workout_sessions").upsert(
    {
      user_id: userId,
      workout_id: workoutId,
      completed,
      session_rpe: sessionRpe,
      notes,
    },
    { onConflict: "user_id,workout_id" }
  );
  if (error) throw error;
}

// ─── Member: History ─────────────────────────────────────
export interface HistoryEntry {
  workout_id: string;
  workout_date: string;
  training_type: string;
  phase: string;
  session_rpe: number | null;
  completed: boolean;
  set_count: number;
}

export async function loadUserHistory(userId: string): Promise<HistoryEntry[]> {
  const { data: sessions, error } = await supabase
    .from("user_workout_sessions")
    .select("*, workouts(workout_date, training_type, phase)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!sessions || sessions.length === 0) return [];

  // Count sets per workout
  const workoutIds = sessions.map((s) => s.workout_id);
  const { data: setLogs } = await supabase
    .from("user_set_logs")
    .select("workout_id")
    .eq("user_id", userId)
    .in("workout_id", workoutIds);

  const setCounts: Record<string, number> = {};
  for (const s of setLogs || []) {
    setCounts[s.workout_id] = (setCounts[s.workout_id] || 0) + 1;
  }

  return sessions.map((s) => {
    const w = s.workouts as unknown as { workout_date: string; training_type: string; phase: string } | null;
    return {
      workout_id: s.workout_id,
      workout_date: w?.workout_date || "",
      training_type: w?.training_type || "",
      phase: w?.phase || "",
      session_rpe: s.session_rpe,
      completed: s.completed,
      set_count: setCounts[s.workout_id] || 0,
    };
  });
}

export interface HistoryDetailData {
  workout_date: string;
  training_type: string;
  phase: string;
  session_rpe: number | null;
  notes: string | null;
  completed: boolean;
  exercises: {
    exercise_name: string;
    prescribed_sets: number;
    prescribed_reps: string;
    sets: DbSetLog[];
  }[];
}

export async function loadHistoryDetail(
  userId: string,
  workoutId: string
): Promise<HistoryDetailData | null> {
  // Load session
  const session = await loadSession(userId, workoutId);
  if (!session) return null;

  // Load workout info
  const workout = await loadWorkoutById(workoutId);
  if (!workout) return null;

  // Load set logs
  const setLogs = await loadSetLogs(userId, workoutId);

  // Build exercise list from workout structure
  const exercises = workout.blocks.flatMap((b) =>
    b.exercises.map((ex) => ({
      exercise_name: ex.exercise_name,
      prescribed_sets: ex.prescribed_sets,
      prescribed_reps: ex.prescribed_reps,
      sets: setLogs[ex.exercise_id] || [],
    }))
  );

  return {
    workout_date: workout.workout_date,
    training_type: workout.training_type,
    phase: workout.phase,
    session_rpe: session.session_rpe,
    notes: session.notes,
    completed: session.completed,
    exercises,
  };
}

// ─── Member: Previous performance ────────────────────────
export interface PrevPerformance {
  date: string;
  sets: { set_number: number; weight: number; reps: number; rpe: number }[];
  notes: string | null;
}

export async function loadExerciseHistory(
  userId: string,
  exerciseId: string,
  excludeWorkoutId?: string
): Promise<PrevPerformance[]> {
  let query = supabase
    .from("user_set_logs")
    .select("*, workouts(workout_date)")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (excludeWorkoutId) {
    query = query.neq("workout_id", excludeWorkoutId);
  }

  const { data } = await query;
  if (!data || data.length === 0) return [];

  // Group by workout_id
  const grouped: Record<string, { date: string; sets: { set_number: number; weight: number; reps: number; rpe: number }[] }> = {};
  for (const row of data) {
    const wDate = (row.workouts as unknown as { workout_date: string })?.workout_date || "";
    if (!grouped[row.workout_id]) {
      grouped[row.workout_id] = { date: wDate, sets: [] };
    }
    grouped[row.workout_id].sets.push({
      set_number: row.set_number,
      weight: row.weight != null ? Number(row.weight) : 0,
      reps: row.reps ?? 0,
      rpe: row.rpe ?? 0,
    });
  }

  return Object.values(grouped)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((g) => ({
      ...g,
      sets: g.sets.sort((a, b) => a.set_number - b.set_number),
      notes: null,
    }));
}