package app.sdoc.document.controller;

import app.sdoc.document.domain.dto.CreateDocumentRequest;
import app.sdoc.document.domain.dto.DocumentResponse;
import app.sdoc.document.domain.entity.Document;
import app.sdoc.document.sdoc.SdocFileBuilder;
import app.sdoc.document.sdoc.SdocFileReader;
import app.sdoc.document.sdoc.SdocImportService;
import app.sdoc.document.service.DocumentQueryService;
import app.sdoc.document.service.DocumentService;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Tag(name = "Documentos", description = "Gestión de documentos .sdoc")
public class DocumentControllerV1 {

    private final DocumentService documentService;
    private final DocumentQueryService documentQueryService;
    private final SdocFileBuilder sdocFileBuilder;
    private final SdocImportService sdocImportService;

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

    /**
     * Descarga el documento empaquetado como archivo `.sdoc` real (ZIP+JSON).
     * Cumple SPEC.md §6. El navegador recibe `Content-Disposition: attachment`
     * con un nombre derivado del título, listo para guardar en disco.
     */
    @GetMapping("/{id}/download.sdoc")
    @Operation(summary = "Descargar documento como archivo .sdoc")
    public ResponseEntity<byte[]> downloadSdoc(@PathVariable String id) {
        Document doc = documentService.findEntityById(id);
        byte[] bytes = sdocFileBuilder.build(doc);

        String safeName = sanitizeFilename(doc.getTitle() != null ? doc.getTitle() : "documento");
        ContentDisposition disposition = ContentDisposition.attachment()
            .filename(safeName + ".sdoc", StandardCharsets.UTF_8)
            .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(disposition);
        headers.setContentType(MediaType.parseMediaType("application/vnd.sdoc+zip"));
        headers.setContentLength(bytes.length);
        headers.setCacheControl("no-store");

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    /**
     * Importa un archivo `.sdoc` subido por el usuario y crea un documento
     * nuevo. El owner es siempre el usuario autenticado (no el declarado
     * en el manifest, para prevenir impersonación).
     *
     * Espera `multipart/form-data` con un campo `file` que contenga el .sdoc.
     */
    @PostMapping(value = "/import.sdoc", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Importar un archivo .sdoc y crear un documento nuevo")
    public ResponseEntity<DocumentResponse> importSdoc(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new SdocFileReader.SdocReadException("Archivo .sdoc vacío o no enviado", "empty");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (java.io.IOException e) {
            throw new SdocFileReader.SdocReadException("No se pudieron leer los bytes del archivo", "internal", e);
        }
        DocumentResponse created = sdocImportService.importBytes(bytes);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Manejador de errores específico para problemas al leer .sdoc.
     * Devuelve 400 con el código de error para que el frontend pueda
     * mostrar un mensaje útil al usuario.
     */
    @ExceptionHandler(SdocFileReader.SdocReadException.class)
    public ResponseEntity<Map<String, Object>> handleSdocReadError(SdocFileReader.SdocReadException ex) {
        return ResponseEntity.badRequest().body(Map.of(
            "error", "sdoc_read_failed",
            "code", ex.code,
            "message", ex.getMessage()
        ));
    }

    /** Quita caracteres inválidos para nombres de archivo en Windows/Linux/Mac. */
    private static String sanitizeFilename(String name) {
        String trimmed = name.trim().replaceAll("[\\\\/:*?\"<>|]", "_");
        if (trimmed.isEmpty()) return "documento";
        if (trimmed.length() > 100) trimmed = trimmed.substring(0, 100);
        return trimmed;
    }
}
