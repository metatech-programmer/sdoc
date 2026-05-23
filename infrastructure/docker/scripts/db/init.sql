-- ============================================================
-- SDOC Platform — Inicialización PostgreSQL
-- Se ejecuta UNA VEZ al crear el contenedor por primera vez
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema para Keycloak (aislado del schema de negocio)
CREATE SCHEMA IF NOT EXISTS keycloak;

-- Configuración de búsqueda full-text en español
-- (Las tablas usan esta configuración para los índices FTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'sdoc_spanish') THEN
        CREATE TEXT SEARCH CONFIGURATION sdoc_spanish (COPY = pg_catalog.spanish);
        ALTER TEXT SEARCH CONFIGURATION sdoc_spanish
            ALTER MAPPING FOR hword, hword_part, word WITH unaccent, spanish_stem;
    END IF;
END$$;

-- Tipo ENUM para estado de documentos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM (
            'DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED'
        );
    END IF;
END$$;

-- Tipo ENUM para planes de suscripción
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE subscription_plan AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
    END IF;
END$$;

-- Tipo ENUM para permisos de documento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_level') THEN
        CREATE TYPE permission_level AS ENUM ('READ', 'COMMENT', 'EDIT', 'MANAGE', 'OWNER');
    END IF;
END$$;

-- Tipo ENUM para estado de exportaciones
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status') THEN
        CREATE TYPE export_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
    END IF;
END$$;

-- Tipo ENUM para estado de eventos outbox
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_status') THEN
        CREATE TYPE outbox_status AS ENUM ('PENDING', 'SENT', 'FAILED');
    END IF;
END$$;

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keycloak_id     VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(320) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    plan            subscription_plan NOT NULL DEFAULT 'FREE',
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB plan FREE
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ  -- GDPR soft delete
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_keycloak_id ON users(keycloak_id);

-- ============================================================
-- TABLA: organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    plan            subscription_plan NOT NULL DEFAULT 'PRO',
    owner_id        UUID NOT NULL REFERENCES users(id),
    max_members     INT NOT NULL DEFAULT 10,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLA: organization_members
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- ============================================================
-- TABLA: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    status          document_status NOT NULL DEFAULT 'DRAFT',
    content         JSONB NOT NULL DEFAULT '{}',
    language        VARCHAR(10) NOT NULL DEFAULT 'es',
    word_count      INT NOT NULL DEFAULT 0,
    page_count      INT NOT NULL DEFAULT 0,
    size_bytes      BIGINT NOT NULL DEFAULT 0,
    version         INT NOT NULL DEFAULT 1,
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    share_token     VARCHAR(64) UNIQUE,
    thumbnail_url   TEXT,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    -- Full-text search
    search_vector   TSVECTOR,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ  -- GDPR soft delete
);

-- Índices para búsqueda y filtrado
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_content ON documents USING GIN(content jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON documents(share_token) WHERE share_token IS NOT NULL;

-- Trigger para actualizar search_vector automáticamente
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('sdoc_spanish', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('sdoc_spanish', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('sdoc_spanish', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_documents_search_vector
    BEFORE INSERT OR UPDATE OF title, description, tags ON documents
    FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLA: document_permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS document_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    level           permission_level NOT NULL DEFAULT 'READ',
    granted_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    CONSTRAINT chk_permission_target CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_doc_permissions_doc ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_permissions_user ON document_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_permissions_org ON document_permissions(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================
-- TABLA: assets
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    owner_id        UUID NOT NULL REFERENCES users(id),
    filename        VARCHAR(500) NOT NULL,
    original_name   VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(127) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    storage_key     TEXT NOT NULL,  -- Clave en MinIO
    storage_bucket  VARCHAR(63) NOT NULL DEFAULT 'sdoc-assets',
    url             TEXT,
    thumbnail_url   TEXT,
    is_processed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_document ON assets(document_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);

-- ============================================================
-- TABLA: document_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS document_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    title           VARCHAR(500) NOT NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    storage_key     TEXT NOT NULL,  -- Snapshot completo en MinIO
    patch_key       TEXT,           -- Diff respecto a versión anterior
    size_bytes      BIGINT NOT NULL DEFAULT 0,
    change_summary  TEXT,
    is_auto         BOOLEAN NOT NULL DEFAULT FALSE,  -- Guardado automático
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_by ON document_versions(created_by);

-- ============================================================
-- TABLA: collaboration_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    session_id      VARCHAR(128) NOT NULL,
    connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    user_color      VARCHAR(7) NOT NULL DEFAULT '#000000',  -- Color cursor colaborativo
    UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_sessions_doc ON collaboration_sessions(document_id)
    WHERE disconnected_at IS NULL;

-- ============================================================
-- TABLA: document_exports
-- ============================================================
CREATE TABLE IF NOT EXISTS document_exports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id),
    requested_by    UUID NOT NULL REFERENCES users(id),
    format          VARCHAR(10) NOT NULL,  -- PDF, DOCX, HTML, EPUB
    status          export_status NOT NULL DEFAULT 'PENDING',
    storage_key     TEXT,
    download_url    TEXT,
    file_size_bytes BIGINT,
    error_message   TEXT,
    celery_task_id  VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,  -- Previene exports duplicados
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exports_document ON document_exports(document_id);
CREATE INDEX IF NOT EXISTS idx_exports_user ON document_exports(requested_by);
CREATE INDEX IF NOT EXISTS idx_exports_status ON document_exports(status) WHERE status IN ('PENDING', 'PROCESSING');

-- ============================================================
-- TABLA: audit_log (inmutable — sin UPDATE/DELETE)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       VARCHAR(255) NOT NULL,
    user_id         UUID REFERENCES users(id),
    user_email      VARCHAR(320),
    organization_id UUID,
    ip_address      INET,
    user_agent      TEXT,
    old_value       JSONB,
    new_value       JSONB,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- Prevenir modificaciones al audit_log
CREATE OR REPLACE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- ============================================================
-- TABLA: subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    plan            subscription_plan NOT NULL,
    stripe_customer_id      VARCHAR(255),
    stripe_subscription_id  VARCHAR(255) UNIQUE,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================
-- TABLA: outbox_events (patrón Outbox — compartida)
-- ============================================================
CREATE TABLE IF NOT EXISTS outbox_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type  VARCHAR(100) NOT NULL,
    aggregate_id    VARCHAR(255) NOT NULL,
    event_type      VARCHAR(255) NOT NULL,
    payload         JSONB NOT NULL,
    status          outbox_status NOT NULL DEFAULT 'PENDING',
    kafka_topic     VARCHAR(255) NOT NULL,
    retry_count     INT NOT NULL DEFAULT 0,
    max_retries     INT NOT NULL DEFAULT 3,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(status, created_at)
    WHERE status IN ('PENDING', 'FAILED');

-- ============================================================
-- VISTA MATERIALIZADA: document_read_model (CQRS)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS document_read_model AS
SELECT
    d.id,
    d.title,
    d.description,
    d.status,
    d.language,
    d.word_count,
    d.page_count,
    d.size_bytes,
    d.version,
    d.is_public,
    d.tags,
    d.thumbnail_url,
    d.created_at,
    d.updated_at,
    d.owner_id,
    u.full_name AS owner_name,
    u.email AS owner_email,
    u.avatar_url AS owner_avatar,
    d.organization_id,
    o.name AS organization_name,
    COUNT(DISTINCT dp.user_id) AS collaborator_count,
    COUNT(DISTINCT dv.id) AS version_count
FROM documents d
JOIN users u ON d.owner_id = u.id
LEFT JOIN organizations o ON d.organization_id = o.id
LEFT JOIN document_permissions dp ON d.id = dp.document_id
LEFT JOIN document_versions dv ON d.id = dv.document_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, u.id, o.id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_read_model_id ON document_read_model(id);
CREATE INDEX IF NOT EXISTS idx_read_model_owner ON document_read_model(owner_id);
CREATE INDEX IF NOT EXISTS idx_read_model_org ON document_read_model(organization_id);

-- Refrescar la vista materializada inicialmente
REFRESH MATERIALIZED VIEW document_read_model;

-- Trigger para refrescar la vista cuando se modifica un documento
-- (En producción usar pg_cron o refresh programado)
CREATE OR REPLACE FUNCTION refresh_document_read_model()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY document_read_model;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Se instala el trigger manualmente si se quiere refresh automático
-- Para desarrollo es suficiente; en producción usar pg_cron

-- ============================================================
-- TRIGGERS: auto-actualizar updated_at en tablas restantes
-- ============================================================
CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
