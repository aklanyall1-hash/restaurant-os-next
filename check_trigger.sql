-- Check trigger
SELECT tgname, tgenabled, tgrelid::regclass::text AS table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
