
-- Create a helper function using text comparison to avoid enum literal issue
CREATE OR REPLACE FUNCTION public.has_trainer_or_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'trainer')
  )
$$;

-- Update handle_new_user to not duplicate if profile/role already exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trainer can insert exercises
DROP POLICY IF EXISTS "Trainer can insert exercises" ON public.exercises;
CREATE POLICY "Trainer can insert exercises"
ON public.exercises FOR INSERT TO authenticated
WITH CHECK (public.has_trainer_or_admin_role(auth.uid()));

-- Trainer can manage workouts
DROP POLICY IF EXISTS "Trainer can insert workouts" ON public.workouts;
CREATE POLICY "Trainer can insert workouts"
ON public.workouts FOR INSERT TO authenticated
WITH CHECK (public.has_trainer_or_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Trainer can update workouts" ON public.workouts;
CREATE POLICY "Trainer can update workouts"
ON public.workouts FOR UPDATE TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Trainer can delete workouts" ON public.workouts;
CREATE POLICY "Trainer can delete workouts"
ON public.workouts FOR DELETE TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

-- Trainer can manage workout_blocks
DROP POLICY IF EXISTS "Trainer can insert workout blocks" ON public.workout_blocks;
CREATE POLICY "Trainer can insert workout blocks"
ON public.workout_blocks FOR INSERT TO authenticated
WITH CHECK (public.has_trainer_or_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Trainer can update workout blocks" ON public.workout_blocks;
CREATE POLICY "Trainer can update workout blocks"
ON public.workout_blocks FOR UPDATE TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Trainer can delete workout blocks" ON public.workout_blocks;
CREATE POLICY "Trainer can delete workout blocks"
ON public.workout_blocks FOR DELETE TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

-- Trainer can manage workout_exercises
DROP POLICY IF EXISTS "Trainer can insert workout exercises" ON public.workout_exercises;
CREATE POLICY "Trainer can insert workout exercises"
ON public.workout_exercises FOR INSERT TO authenticated
WITH CHECK (public.has_trainer_or_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Trainer can update workout exercises" ON public.workout_exercises;
CREATE POLICY "Trainer can update workout exercises"
ON public.workout_exercises FOR UPDATE TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Trainer can delete workout exercises" ON public.workout_exercises;
CREATE POLICY "Trainer can delete workout exercises"
ON public.workout_exercises FOR DELETE TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

-- Trainers can read all set logs and sessions
DROP POLICY IF EXISTS "Trainers can read all set logs" ON public.user_set_logs;
CREATE POLICY "Trainers can read all set logs"
ON public.user_set_logs FOR SELECT TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Trainers can read all sessions" ON public.user_workout_sessions;
CREATE POLICY "Trainers can read all sessions"
ON public.user_workout_sessions FOR SELECT TO authenticated
USING (public.has_trainer_or_admin_role(auth.uid()));

-- Update workout read policy
DROP POLICY IF EXISTS "Authenticated can read published workouts" ON public.workouts;
DROP POLICY IF EXISTS "Authenticated can read workouts" ON public.workouts;
CREATE POLICY "Authenticated can read workouts"
ON public.workouts FOR SELECT TO authenticated
USING (published = true OR public.has_trainer_or_admin_role(auth.uid()));

-- Allow profiles to be inserted
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);
