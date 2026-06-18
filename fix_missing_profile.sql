INSERT INTO profiles (id, full_name, role)
VALUES ('baaebce1-5d0a-46f5-8769-d3f6fe4cbbf6', 'Kitchen 1', 'staff')
ON CONFLICT (id) DO NOTHING;

SELECT id, full_name, role, restaurant_id FROM profiles ORDER BY created_at DESC;
