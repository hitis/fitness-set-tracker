
-- Enums
CREATE TYPE public.training_type AS ENUM ('lower_body', 'upper_body', 'full_body', 'mobility', 'conditioning');
CREATE TYPE public.workout_phase AS ENUM ('strength', 'endurance', 'hypertrophy', 'power', 'testing', 'deload');
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.pain_area AS ENUM ('wrist', 'shoulder', 'back', 'knee', 'ankle', 'other');

-- Roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Exercises library
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Workouts
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_date DATE NOT NULL UNIQUE,
  training_type training_type NOT NULL,
  phase workout_phase NOT NULL,
  notes TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Workout exercises (prescribed)
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  prescribed_sets INT NOT NULL DEFAULT 3,
  prescribed_reps TEXT NOT NULL DEFAULT '10',
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT
);
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- User workout sessions
CREATE TABLE public.user_workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  session_rpe INT CHECK (session_rpe BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, workout_id)
);
ALTER TABLE public.user_workout_sessions ENABLE ROW LEVEL SECURITY;

-- User set logs
CREATE TABLE public.user_set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  set_number INT NOT NULL,
  weight NUMERIC,
  reps INT,
  rpe INT CHECK (rpe BETWEEN 1 AND 10),
  notes TEXT,
  pain_flag BOOLEAN NOT NULL DEFAULT false,
  pain_area pain_area,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, workout_id, exercise_id, set_number)
);
ALTER TABLE public.user_set_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile + member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- user_roles: users can read own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles: users can read/update own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- exercises: all authenticated can read, admin can insert
CREATE POLICY "Authenticated can read exercises" ON public.exercises
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert exercises" ON public.exercises
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- workouts: all authenticated can read published, admin can all
CREATE POLICY "Authenticated can read published workouts" ON public.workouts
  FOR SELECT TO authenticated USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert workouts" ON public.workouts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update workouts" ON public.workouts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete workouts" ON public.workouts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- workout_exercises: same as workouts
CREATE POLICY "Authenticated can read workout exercises" ON public.workout_exercises
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert workout exercises" ON public.workout_exercises
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update workout exercises" ON public.workout_exercises
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete workout exercises" ON public.workout_exercises
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_workout_sessions: users own, admin can read all
CREATE POLICY "Users can read own sessions" ON public.user_workout_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own sessions" ON public.user_workout_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_workout_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_set_logs: users own, admin can read all
CREATE POLICY "Users can read own set logs" ON public.user_set_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own set logs" ON public.user_set_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own set logs" ON public.user_set_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
