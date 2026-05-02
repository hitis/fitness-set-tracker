
-- Create block_type enum
CREATE TYPE public.block_type AS ENUM (
  'main_lift', 'accessory', 'superset', 'emom', 'amrap', 'tabata', 'finisher', 'conditioning', 'core', 'mobility'
);

-- Create workout_blocks table
CREATE TABLE public.workout_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL,
  name TEXT NOT NULL,
  block_type public.block_type NOT NULL DEFAULT 'accessory',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can read workout blocks"
  ON public.workout_blocks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can insert workout blocks"
  ON public.workout_blocks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update workout blocks"
  ON public.workout_blocks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete workout blocks"
  ON public.workout_blocks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add block_id to workout_exercises (nullable for backward compat)
ALTER TABLE public.workout_exercises
  ADD COLUMN block_id UUID;
