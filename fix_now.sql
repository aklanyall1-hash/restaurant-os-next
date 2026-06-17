UPDATE products SET image_url = NULL WHERE name_ar LIKE '%حواوشي صغير%';
SELECT name_ar, image_url FROM products WHERE name_ar LIKE '%حواوشي صغير%';
