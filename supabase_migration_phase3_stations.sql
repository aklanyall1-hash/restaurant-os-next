-- ============================================
-- Restaurant OS Next - Phase 3 Migration
-- Multi-station system (multiple kitchens/cashiers per restaurant)
-- ============================================

-- ============================================
-- 1) STATIONS TABLE
-- ============================================
-- A station is a physical/logical work point: a kitchen line, a dessert
-- station, a cashier counter, etc. Each restaurant can have many.

CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'kitchen' CHECK (type IN ('kitchen', 'cashier')),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view stations" ON stations FOR SELECT USING (true);
CREATE POLICY "Staff manage own stations" ON stations FOR ALL USING (restaurant_id = my_restaurant_id());

-- ============================================
-- 2) LINK PRODUCTS TO A STATION
-- ============================================
-- Each product is prepared at exactly one kitchen station.
-- Nullable: existing products keep working without a station (shown to all kitchens)
-- until an owner assigns one explicitly.

ALTER TABLE products ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;

-- ============================================
-- 3) LINK STAFF PROFILES TO A STATION
-- ============================================
-- staff role users are assigned to ONE station they work at.
-- owner / super_admin are not tied to a single station (they see everything).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id) ON DELETE SET NULL;

-- ============================================
-- 4) ORDER ITEMS NEED TO KNOW THEIR STATION
-- ============================================
-- Denormalized for fast filtering: which station should see/prepare this line.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id) ON DELETE SET NULL;

-- ============================================
-- 5) PER-ITEM STATUS (so each kitchen station marks its own items ready)
-- ============================================
-- An order can span multiple kitchen stations. The order-level status stays
-- as the overall summary; item-level status lets each station track its
-- own prep independently.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS status order_status DEFAULT 'pending';

-- ============================================
-- 6) SEED: default stations for the existing demo restaurant
-- ============================================
INSERT INTO stations (restaurant_id, name, type, sort_order)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001', 'المطبخ الرئيسي', 'kitchen', 1
WHERE NOT EXISTS (
  SELECT 1 FROM stations WHERE restaurant_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND type = 'kitchen'
);

INSERT INTO stations (restaurant_id, name, type, sort_order)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001', 'الكاشير', 'cashier', 1
WHERE NOT EXISTS (
  SELECT 1 FROM stations WHERE restaurant_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND type = 'cashier'
);

-- Assign all existing products to the default kitchen station
UPDATE products
SET station_id = (SELECT id FROM stations WHERE restaurant_id = products.restaurant_id AND type = 'kitchen' LIMIT 1)
WHERE station_id IS NULL AND restaurant_id = 'a1b2c3d4-0000-0000-0000-000000000001';
