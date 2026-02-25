-- Allow generated recipes if recipe generation is re-enabled in the future.

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Drop any existing CHECK constraints on source_type for public.recipes.
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'recipes'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%source_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.recipes DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.recipes
ADD CONSTRAINT recipes_source_type_check
CHECK (source_type IN ('image', 'text', 'generated'));
