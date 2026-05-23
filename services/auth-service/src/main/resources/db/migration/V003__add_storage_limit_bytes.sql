-- Flyway migration V003 — auth-service
-- Agrega storage_limit_bytes a users para enforcement de límites por plan.
-- Plan FREE = 1 GB, PRO = 10 GB, ENTERPRISE = ilimitado (NULL).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824;

-- Ajustar límites existentes por plan
UPDATE users SET storage_limit_bytes = 10737418240 WHERE plan = 'PRO';
UPDATE users SET storage_limit_bytes = 9223372036854775807 WHERE plan = 'ENTERPRISE';

COMMENT ON COLUMN users.storage_limit_bytes IS '1 GB FREE, 10 GB PRO, MAX BIGINT ENTERPRISE';
