-- Track per-user AI usage for cost visibility and anomaly detection.
-- Written by service_role only; clients have no access.

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id uuid REFERENCES public.meals(id) ON DELETE SET NULL,
  function_name text NOT NULL,
  action text,
  model text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  is_pro boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_usage_logs_user_id ON public.usage_logs (user_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs (created_at);
CREATE INDEX idx_usage_logs_function_name ON public.usage_logs (function_name);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- No RLS policies = no client access. Only service_role can read/write.
