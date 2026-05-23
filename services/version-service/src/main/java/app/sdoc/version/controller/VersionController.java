package app.sdoc.version.controller;

import app.sdoc.version.domain.dto.VersionResponse;
import app.sdoc.version.service.VersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/documents/{documentId}/versions")
@Tag(name = "Versiones", description = "Historial de versiones de documentos")
@RequiredArgsConstructor
public class VersionController {

    private final VersionService versionService;

    @GetMapping
    @Operation(summary = "Listar versiones de un documento")
    public ResponseEntity<List<VersionResponse>> list(@PathVariable String documentId) {
        return ResponseEntity.ok(versionService.listVersions(documentId));
    }

    @GetMapping("/{versionNumber}")
    @Operation(summary = "Obtener versión específica")
    public ResponseEntity<VersionResponse> get(
        @PathVariable String documentId,
        @PathVariable Integer versionNumber
    ) {
        return ResponseEntity.ok(versionService.getVersion(documentId, versionNumber));
    }

    @PostMapping("/{versionNumber}/restore")
    @Operation(summary = "Restaurar a una versión anterior")
    public ResponseEntity<Map<String, Object>> restore(
        @PathVariable String documentId,
        @PathVariable Integer versionNumber,
        @RequestHeader(value = "X-User-Id", required = false) String userId
    ) {
        Map<String, Object> result = versionService.restoreVersion(documentId, versionNumber, userId);
        return ResponseEntity.ok(result);
    }
}
