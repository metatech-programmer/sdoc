-- Flyway migration — auth-service
-- Las tablas principales se crean en init.sql
-- Este script solo valida que existen (Flyway baseline)
-- y agrega índices específicos del servicio si es necesario

-- Verificar que la tabla users existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'La tabla users no existe. Verificar que init.sql se ejecutó correctamente.';
    END IF;
END$$;
