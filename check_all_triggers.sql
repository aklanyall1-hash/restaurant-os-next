-- 1. List ALL triggers on auth.users (not just ours)
SELECT tgname, tgenabled, tgtype,
       pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgisinternal = false;

-- 2. List ALL functions that might run on user creation
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name ILIKE '%user%';
