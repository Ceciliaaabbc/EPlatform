CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_categories_parent_id ON categories (parent_id);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_products_category_id ON products (category_id);

CREATE TABLE IF NOT EXISTS product_attributes (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(255) NOT NULL,
    attribute_value VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_product_attributes_product_id ON product_attributes (product_id);

-- Backfill: turn the existing free-text `products.category` strings into
-- real category rows, and link each product to its matching row, so
-- existing demo data keeps working once categories become a real table.
INSERT INTO categories (name)
SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category <> ''
ORDER BY category;

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category = c.name;
