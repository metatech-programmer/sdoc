package app.sdoc.document.controller;

import app.sdoc.document.domain.dto.CreateDocumentRequest;
import app.sdoc.document.domain.dto.DocumentResponse;
import app.sdoc.document.service.DocumentQueryService;
import app.sdoc.document.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Tag(name = "Documentos", description = "Gestión de documentos .sdoc")
public class DocumentControllerV1 {

    private final DocumentService documentService;
    private final DocumentQueryService documentQueryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear documento")
    public ResponseEntity<DocumentResponse> create(@Valid @RequestBody CreateDocumentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.create(request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener documento por ID")
    public ResponseEntity<DocumentResponse> findById(@PathVariable String id) {
        return ResponseEntity.ok(documentService.findById(id));
    }

    @GetMapping
    @Operation(summary = "Listar documentos del usuario autenticado")
    public ResponseEntity<Page<DocumentResponse>> findAll(
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(documentService.findByOwner(pageable));
    }

    @GetMapping("/search")
    @Operation(summary = "Buscar documentos por texto completo (PostgreSQL FTS)")
    public ResponseEntity<Page<DocumentResponse>> search(
        @RequestParam("q") String query,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(documentQueryService.search(query, pageable));
    }

    @GetMapping("/public")
    @Operation(summary = "Listar documentos públicos")
    public ResponseEntity<Page<DocumentResponse>> findPublic(
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(documentQueryService.findPublicDocuments(pageable));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar contenido del documento")
    public ResponseEntity<DocumentResponse> update(
        @PathVariable String id,
        @RequestBody Object content
    ) {
        return ResponseEntity.ok(documentService.update(id, content));
    }

    @PatchMapping("/{id}/content")
    @Operation(summary = "Actualizar contenido del documento (patch)")
    public ResponseEntity<DocumentResponse> updateContent(
        @PathVariable String id,
        @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(documentService.update(id, body.get("content")));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar documento (soft delete)")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
