-- ============================================
-- Bootstrap super_admin profile for aklanyall1@gmail.com
-- ============================================

-- Insert or update profile: super_admin, linked to "أبو حسني" restaurant
INSERT INTO profiles (id, full_name, role, restaurant_id)
VALUES (
  '94df9e0d-ad63-447d-9a43-4ab4f7c1a74d',
  'Admin - أبو حسني',
  'super_admin',
  'a1b2c3d4-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin',
    restaurant_id = 'a1b2c3d4-0000-0000-0000-000000000001',
    full_name = 'Admin - أبو حسني';

-- Verify
SELECT id, full_name, role, restaurant_id FROM profiles WHERE id = '94df9e0d-ad63-447d-9a43-4ab4f7c1a74d';
