package app.sdoc.document.service;

import app.sdoc.commons.security.UserContext;
import app.sdoc.document.domain.dto.DocumentResponse;
import app.sdoc.document.domain.entity.Document;
import app.sdoc.document.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Servicio de lectura (Query side del patrón CQRS).
 * Lee de la vista materializada document_read_model para queries de alta frecuencia
 * sin afectar el rendimiento de las escrituras transaccionales.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentQueryService {

    private final DocumentRepository documentRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public Page<DocumentResponse> search(String query, Pageable pageable) {
        UserContext user = UserContext.fromRequest();

        String sql = """
            SELECT id, title, description, status, language, word_count,
                   page_count, size_bytes, version, is_public, thumbnail_url,
                   tags, owner_id, organization_id, created_at, updated_at,
                   ts_rank(search_vector, plainto_tsquery('sdoc_spanish', ?)) AS rank
            FROM document_read_model
            WHERE owner_id = ?::uuid
              AND search_vector @@ plainto_tsquery('sdoc_spanish', ?)
            ORDER BY rank DESC
            LIMIT ? OFFSET ?
            """;

        String countSql = """
            SELECT COUNT(*) FROM document_read_model
            WHERE owner_id = ?::uuid
              AND search_vector @@ plainto_tsquery('sdoc_spanish', ?)
            """;

        List<DocumentResponse> results = jdbcTemplate.query(
            sql,
            ps -> {
                ps.setString(1, query);
                ps.setString(2, user.getUserId());
                ps.setString(3, query);
                ps.setInt(4, pageable.getPageSize());
                ps.setLong(5, pageable.getOffset());
            },
            (rs, rowNum) -> DocumentResponse.builder()
                .id(rs.getString("id"))
                .title(rs.getString("title"))
                .description(rs.getString("description"))
                .status(rs.getString("status"))
                .language(rs.getString("language"))
                .wordCount(rs.getInt("word_count"))
                .pageCount(rs.getInt("page_count"))
                .sizeBytes(rs.getLong("size_bytes"))
                .version(rs.getInt("version"))
                .isPublic(rs.getBoolean("is_public"))
                .thumbnailUrl(rs.getString("thumbnail_url"))
                .ownerId(rs.getString("owner_id"))
                .organizationId(rs.getString("organization_id"))
                .createdAt(rs.getObject("created_at", Instant.class))
                .updatedAt(rs.getObject("updated_at", Instant.class))
                .build()
        );

        Long total = jdbcTemplate.queryForObject(
            countSql,
            Long.class,
            user.getUserId(), query
        );

        return new PageImpl<>(results, pageable, total != null ? total : 0);
    }

    @Transactional(readOnly = true)
    public Page<DocumentResponse> findPublicDocuments(Pageable pageable) {
        String sql = """
            SELECT id, title, description, status, language, word_count,
                   page_count, size_bytes, version, is_public, thumbnail_url,
                   tags, owner_id, organization_id, created_at, updated_at
            FROM document_read_model
            WHERE is_public = true
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
            """;

        List<DocumentResponse> results = jdbcTemplate.query(
            sql,
            ps -> {
                ps.setInt(1, pageable.getPageSize());
                ps.setLong(2, pageable.getOffset());
            },
            (rs, rowNum) -> DocumentResponse.builder()
                .id(rs.getString("id"))
                .title(rs.getString("title"))
                .description(rs.getString("description"))
                .status(rs.getString("status"))
                .language(rs.getString("language"))
                .wordCount(rs.getInt("word_count"))
                .isPublic(rs.getBoolean("is_public"))
                .ownerId(rs.getString("owner_id"))
                .createdAt(rs.getObject("created_at", Instant.class))
                .updatedAt(rs.getObject("updated_at", Instant.class))
                .build()
        );

        Long total = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM document_read_model WHERE is_public = true",
            Long.class
        );

        return new PageImpl<>(results, pageable, total != null ? total : 0);
    }
}
