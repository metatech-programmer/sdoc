-- Esquema de activos (imágenes, ficheros adjuntos, etc.)
CREATE TABLE IF NOT EXISTS assets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID        NOT NULL,
    owner_id     UUID        NOT NULL,
    file_name    TEXT        NOT NULL,
    content_type VARCHAR(127) NOT NULL,
    size_bytes   BIGINT      NOT NULL CHECK (size_bytes >= 0),
    storage_key  TEXT        NOT NULL UNIQUE,
    bucket       VARCHAR(63) NOT NULL DEFAULT 'sdoc-assets',
    checksum     VARCHAR(64),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_assets_document_id ON assets (document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_owner_id    ON assets (owner_id)    WHERE deleted_at IS NULL;
