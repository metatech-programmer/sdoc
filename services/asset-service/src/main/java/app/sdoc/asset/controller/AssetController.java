package app.sdoc.asset.controller;

import app.sdoc.asset.domain.dto.AssetResponse;
import app.sdoc.asset.service.AssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Assets", description = "Gestión de archivos y recursos de documentos")
public class AssetController {

    private final AssetService assetService;

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Subir un archivo adjunto a un documento")
    public ResponseEntity<AssetResponse> upload(
        @RequestParam("file") MultipartFile file,
        @RequestParam("documentId") String documentId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(assetService.upload(documentId, file));
    }

    @GetMapping("/document/{documentId}")
    @Operation(summary = "Listar todos los assets de un documento")
    public ResponseEntity<List<AssetResponse>> getByDocument(@PathVariable String documentId) {
        return ResponseEntity.ok(assetService.findByDocument(documentId));
    }

    @DeleteMapping("/{assetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar un asset por ID")
    public ResponseEntity<Void> delete(@PathVariable String assetId) {
        assetService.delete(assetId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/document/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar todos los assets de un documento")
    public ResponseEntity<Void> deleteByDocument(@PathVariable String documentId) {
        assetService.deleteByDocument(documentId);
        return ResponseEntity.noContent().build();
    }
}
