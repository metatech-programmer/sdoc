-- Verificar que la tabla outbox_events existe (creada en init.sql)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outbox_events') THEN
        RAISE EXCEPTION 'La tabla outbox_events no existe. Verificar que init.sql se ejecutó correctamente.';
    END IF;
END$$;
