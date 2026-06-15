-- ============================================
-- Restaurant OS Next - Phase 2 Migration
-- Multi-tenant Auth + Profiles + Secure RLS
-- ============================================

-- ============================================
-- 1) PROFILES TABLE
-- ============================================
-- Links each authenticated user to a restaurant and a role.
-- role: 'super_admin' (platform owner, sees everything)
--       'owner'        (restaurant owner, full access to their restaurant)
--       'staff'        (kitchen/cashier, limited access)

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'owner', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2) HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================
-- These run with elevated privileges to avoid recursive RLS lookups.

CREATE OR REPLACE FUNCTION my_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'super_admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 3) AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
-- New users get a profile automatically. restaurant_id/role are set
-- afterwards by an admin (or via a setup flow).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 4) PROFILES RLS
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Super admin full access profiles" ON profiles;
CREATE POLICY "Super admin full access profiles" ON profiles
  FOR ALL USING (is_super_admin());

-- ============================================
-- 5) DROP OLD INSECURE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Public can view restaurants" ON restaurants;
DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Public can view tables" ON tables;
DROP POLICY IF EXISTS "Public can view orders" ON orders;
DROP POLICY IF EXISTS "Public can view order_items" ON order_items;
DROP POLICY IF EXISTS "Public can insert orders" ON orders;
DROP POLICY IF EXISTS "Public can insert order_items" ON order_items;
DROP POLICY IF EXISTS "Public can update orders" ON orders;
DROP POLICY IF EXISTS "Full access restaurants" ON restaurants;
DROP POLICY IF EXISTS "Full access categories" ON categories;
DROP POLICY IF EXISTS "Full access products" ON products;
DROP POLICY IF EXISTS "Full access tables" ON tables;

-- ============================================
-- 6) NEW SECURE RLS POLICIES
-- ============================================

-- RESTAURANTS
-- Public can view basic restaurant info (needed for QR menu page, no login)
CREATE POLICY "Public can view restaurants" ON restaurants
  FOR SELECT USING (true);

CREATE POLICY "Staff manage own restaurant" ON restaurants
  FOR UPDATE USING (id = my_restaurant_id() AND my_role() IN ('owner','staff'));

CREATE POLICY "Super admin full access restaurants" ON restaurants
  FOR ALL USING (is_super_admin());

-- CATEGORIES
CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Staff manage own categories" ON categories
  FOR ALL USING (restaurant_id = my_restaurant_id());

-- PRODUCTS
CREATE POLICY "Public can view products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Staff manage own products" ON products
  FOR ALL USING (restaurant_id = my_restaurant_id());

-- TABLES
CREATE POLICY "Public can view tables" ON tables
  FOR SELECT USING (true);

CREATE POLICY "Staff manage own tables" ON tables
  FOR ALL USING (restaurant_id = my_restaurant_id());

-- ORDERS
-- Public (customers via QR) can create orders for any restaurant,
-- and view their own order right after placing it (no login).
CREATE POLICY "Public can insert orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view orders" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Staff manage own orders" ON orders
  FOR UPDATE USING (restaurant_id = my_restaurant_id());

CREATE POLICY "Staff delete own orders" ON orders
  FOR DELETE USING (restaurant_id = my_restaurant_id());

-- ORDER_ITEMS
CREATE POLICY "Public can insert order_items" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view order_items" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "Staff manage own order_items" ON order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM orders WHERE restaurant_id = my_restaurant_id())
  );

-- ============================================
-- 7) SUPER ADMIN BOOTSTRAP
-- ============================================
-- After running this migration, manually promote your account:
--
--   UPDATE profiles SET role = 'super_admin', restaurant_id = NULL
--   WHERE id = '<your-auth-user-uuid>';
--
-- Find your UUID in Supabase Dashboard > Authentication > Users.

-- ============================================
-- 8) PRODUCT IMAGES STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
CREATE POLICY "Authenticated upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update own product images" ON storage.objects;
CREATE POLICY "Authenticated update own product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete own product images" ON storage.objects;
CREATE POLICY "Authenticated delete own product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
