-- Private developer access + durable bug report intake.

CREATE TABLE IF NOT EXISTS public.internal_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dev_mode_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  app_version text,
  platform text,
  source text NOT NULL DEFAULT 'in_app_dev_mode',
  metadata jsonb,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON public.bug_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON public.bug_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_sync_status ON public.bug_reports (sync_status);

ALTER TABLE public.internal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own internal access" ON public.internal_access;
CREATE POLICY "Users can view own internal access"
  ON public.internal_access
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own internal access" ON public.internal_access;
CREATE POLICY "Users can update own internal access"
  ON public.internal_access
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;
CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage internal access" ON public.internal_access;
CREATE POLICY "Service role can manage internal access"
  ON public.internal_access
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage bug reports" ON public.bug_reports;
CREATE POLICY "Service role can manage bug reports"
  ON public.bug_reports
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.update_internal_access_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_internal_access_updated_at ON public.internal_access;
CREATE TRIGGER update_internal_access_updated_at
  BEFORE UPDATE ON public.internal_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_internal_access_updated_at();
