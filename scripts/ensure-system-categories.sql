-- Categorías calculadas Nuevos y Ofertas, con los mismos valores que el seed.
-- Solo agrega las que falten: nunca modifica una existente (su visibilidad la
-- decide el panel) ni toca productos. Repetirlo no cambia nada.
INSERT INTO categories (name, slug, parent_id, position, active, highlighted)
VALUES ('Nuevos', 'nuevos', NULL, -2, true, true),
       ('Ofertas', 'ofertas', NULL, -1, true, true)
ON CONFLICT (slug) DO NOTHING;
