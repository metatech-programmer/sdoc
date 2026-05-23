-- Flyway — document-service
-- Las tablas se crean en init.sql. Aquí solo verificamos.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        RAISE EXCEPTION 'La tabla documents no existe. Verificar init.sql.';
    END IF;
END$$;
