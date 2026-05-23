-- Índices adicionales para optimización de consultas frecuentes
-- (V003 ya fue creado por el read_model_views; V004 reservado para extensiones futuras)

-- Búsqueda de texto completo
CREATE INDEX IF NOT EXISTS idx_documents_search_vector
    ON documents USING GIN (search_vector)
    WHERE deleted_at IS NULL;

-- Listado paginado por propietario (el caso de uso más común)
CREATE INDEX IF NOT EXISTS idx_documents_owner_updated
    ON documents (owner_id, updated_at DESC)
    WHERE deleted_at IS NULL;

-- Filtrado por estado
CREATE INDEX IF NOT EXISTS idx_documents_status
    ON documents (status)
    WHERE deleted_at IS NULL;

-- Documentos públicos (para discovery)
CREATE INDEX IF NOT EXISTS idx_documents_public
    ON documents (created_at DESC)
    WHERE is_public = true AND deleted_at IS NULL;

-- Tags usando GIN (array containment)
CREATE INDEX IF NOT EXISTS idx_documents_tags
    ON documents USING GIN (tags)
    WHERE deleted_at IS NULL;
