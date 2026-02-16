CREATE OR REPLACE FUNCTION get_inventory_health_by_category()
RETURNS TABLE(category TEXT, total_stock BIGINT, total_threshold BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        inv.category,
        SUM(inv.stock_quantity) AS total_stock,
        SUM(inv.stock_threshold) AS total_threshold
    FROM
        public.inventory_items AS inv
    GROUP BY
        inv.category;
END;
$$ LANGUAGE plpgsql;