-- Snapshots inmutables de versiones de documentos
CREATE TABLE IF NOT EXISTS document_versions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id       UUID        NOT NULL,
    owner_id          UUID        NOT NULL,
    version_number    INT         NOT NULL CHECK (version_number > 0),
    title             TEXT        NOT NULL,
    storage_key       TEXT        NOT NULL,
    bucket            VARCHAR(63) NOT NULL DEFAULT 'sdoc-versions',
    size_bytes        BIGINT,
    changed_by_user_id UUID,
    change_summary    VARCHAR(500),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_document_version UNIQUE (document_id, version_number)
);

CREATE INDEX idx_dv_document_id ON document_versions (document_id);
