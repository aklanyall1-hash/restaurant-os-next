-- ============================================
-- DIAGNOSTIC: Check trigger and table state
-- ============================================

-- 1. Check if the trigger exists and is enabled
SELECT tgname, tgenabled, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 2. Check the function definition
SELECT proname, prosecdef, proowner::regrole
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Check profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles';

-- 4. Check existing RLS policies on profiles
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
