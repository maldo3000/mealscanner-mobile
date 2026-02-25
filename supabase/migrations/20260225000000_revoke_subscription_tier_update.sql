-- Revoke column-level UPDATE privilege on subscription_tier from authenticated users.
-- This adds defense-in-depth on top of the existing trigger
-- (trg_prevent_client_subscription_tier_change) so that the DB engine rejects
-- the write at the privilege check stage before any trigger fires.
--
-- The service_role used by sync-subscription-tier is unaffected.

REVOKE UPDATE (subscription_tier) ON public.profiles FROM authenticated;
