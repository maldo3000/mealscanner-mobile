-- Weekly nutrition reports for once-per-7-day report generation + history

CREATE TABLE IF NOT EXISTS weekly_nutrition_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  window_start_local DATE NOT NULL,
  window_end_local DATE NOT NULL,
  timezone TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  next_available_at TIMESTAMPTZ NOT NULL,
  logged_days INTEGER NOT NULL DEFAULT 0 CHECK (logged_days >= 0 AND logged_days <= 7),
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_line TEXT NOT NULL DEFAULT '',
  is_insufficient_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT weekly_nutrition_reports_window_check CHECK (window_start_local <= window_end_local)
);

CREATE INDEX IF NOT EXISTS idx_weekly_nutrition_reports_user_generated
  ON weekly_nutrition_reports(user_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_nutrition_reports_user_next_available
  ON weekly_nutrition_reports(user_id, next_available_at DESC);

-- Optional duplicate-window guard per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_nutrition_reports_user_window
  ON weekly_nutrition_reports(user_id, window_start_local, window_end_local);

ALTER TABLE weekly_nutrition_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own weekly nutrition reports" ON weekly_nutrition_reports;
CREATE POLICY "Users can view their own weekly nutrition reports"
  ON weekly_nutrition_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own weekly nutrition reports" ON weekly_nutrition_reports;
CREATE POLICY "Users can insert their own weekly nutrition reports"
  ON weekly_nutrition_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own weekly nutrition reports" ON weekly_nutrition_reports;
CREATE POLICY "Users can update their own weekly nutrition reports"
  ON weekly_nutrition_reports FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all weekly nutrition reports" ON weekly_nutrition_reports;
CREATE POLICY "Service role can manage all weekly nutrition reports"
  ON weekly_nutrition_reports FOR ALL
  USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_weekly_nutrition_reports_updated_at ON weekly_nutrition_reports;
CREATE TRIGGER update_weekly_nutrition_reports_updated_at
  BEFORE UPDATE ON weekly_nutrition_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
