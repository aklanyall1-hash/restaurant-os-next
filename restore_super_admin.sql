UPDATE profiles
SET role = 'super_admin'
WHERE id = '94df9e0d-ad63-447d-9a43-4ab4f7c1a74d';

SELECT id, full_name, role, restaurant_id FROM profiles WHERE id = '94df9e0d-ad63-447d-9a43-4ab4f7c1a74d';
