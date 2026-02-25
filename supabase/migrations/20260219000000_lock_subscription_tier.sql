-- Lock down subscription tier writes to server-only paths.
-- Clients should never be able to promote themselves to Pro/Premium directly.

CREATE OR REPLACE FUNCTION public.prevent_client_subscription_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'subscription_tier can only be updated by server-side workflows';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_subscription_tier_change ON public.profiles;
CREATE TRIGGER trg_prevent_client_subscription_tier_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_subscription_tier_change();
