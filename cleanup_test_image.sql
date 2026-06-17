-- 1) شوف الصورة المرفوعة على "حواوشي صغير"
SELECT id, name_ar, image_url FROM products WHERE name_ar LIKE '%حواوشي صغير%';

-- 2) بعد ما تتأكد، نظف الـ image_url (شغله بعد ما تتأكد من النتيجة فوق)
-- UPDATE products SET image_url = NULL WHERE name_ar LIKE '%حواوشي صغير%';
