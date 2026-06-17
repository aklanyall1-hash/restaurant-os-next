SELECT
  o.order_number,
  o.status as order_status,
  o.created_at,
  oi.product_name_ar,
  oi.status as item_status
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.order_number = '260617-003'
ORDER BY oi.created_at;
