-- Verificar que la vista materializada existe (creada en init.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_matviews WHERE matviewname = 'document_read_model'
    ) THEN
        RAISE EXCEPTION 'La vista materializada document_read_model no existe. Verificar init.sql.';
    END IF;
END$$;
