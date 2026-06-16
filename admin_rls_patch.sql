-- Allow super_admin to view ALL profiles (needed for Admin page)
DROP POLICY IF EXISTS "Super admin view all profiles" ON profiles;
CREATE POLICY "Super admin view all profiles" ON profiles
  FOR SELECT USING (is_super_admin());

-- Allow super_admin to create restaurants
DROP POLICY IF EXISTS "Super admin insert restaurants" ON restaurants;
CREATE POLICY "Super admin insert restaurants" ON restaurants
  FOR INSERT WITH CHECK (is_super_admin());
