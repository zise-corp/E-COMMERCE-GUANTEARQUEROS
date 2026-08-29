UPDATE "categories"
SET "image_path" = CASE "slug"
  WHEN 'guantes' THEN '/demo-products/guantes.png'
  WHEN 'poleras' THEN '/demo-products/poleras.png'
  WHEN 'botas' THEN '/demo-products/botas.png'
  WHEN 'pelotas' THEN '/demo-products/pelotas.png'
  WHEN 'canilleras' THEN '/demo-products/canilleras.png'
  ELSE "image_path"
END
WHERE "image_path" IS NULL
  AND "slug" IN ('guantes', 'poleras', 'botas', 'pelotas', 'canilleras');
