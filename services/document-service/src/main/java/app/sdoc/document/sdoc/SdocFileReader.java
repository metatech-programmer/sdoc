package app.sdoc.document.sdoc;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Parsea un archivo `.sdoc` (ZIP+JSON) entrante y devuelve sus piezas
 * principales (manifest + document). Reverso de {@link SdocFileBuilder}.
 *
 * Verifica:
 *   1. Es un ZIP válido y contiene `manifest.json` + `content/document.json`.
 *   2. `manifest.formatVersion` está soportado (major.minor coincide).
 *   3. `manifest.security.contentChecksum` coincide con el SHA-256 del
 *      document.json canonicalizado.
 *   4. `manifest.security.manifestChecksum` coincide con el SHA-256 del
 *      manifest sin los campos `manifestChecksum` / `signatureRef`.
 *
 * Si el archivo está cifrado (`security.encryptedContent = true`), lanza
 * — esta v1 no descifra en backend; se delega al cliente.
 *
 * NO verifica firma Ed25519 — eso requiere conocer la clave pública
 * esperada o aceptar la del propio archivo. Se delega a `@sdoc/format`
 * (cliente) o a un servicio dedicado más adelante.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SdocFileReader {

    public static final String SUPPORTED_FORMAT_MAJOR_MINOR = "1.0";

    private static final String PATH_MANIFEST = "manifest.json";
    private static final String PATH_DOCUMENT = "content/document.json";
    private static final int MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

    private final ObjectMapper jackson = new ObjectMapper();

    /**
     * Parsea bytes de un `.sdoc` y devuelve el manifest + document.
     *
     * @throws SdocReadException si el archivo está corrupto, mal estructurado,
     *         con checksums inválidos, cifrado, o usa una versión de formato
     *         no soportada.
     */
    public SdocReadResult read(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new SdocReadException("Archivo .sdoc vacío", "empty");
        }
        if (bytes.length > MAX_FILE_SIZE_BYTES) {
            throw new SdocReadException(
                "Archivo .sdoc demasiado grande (max " + MAX_FILE_SIZE_BYTES + " bytes)",
                "too_large"
            );
        }

        // 1. Extraer entradas del ZIP
        Map<String, byte[]> entries = unzip(bytes);
        byte[] manifestBytes = entries.get(PATH_MANIFEST);
        byte[] documentBytes = entries.get(PATH_DOCUMENT);
        if (manifestBytes == null) {
            throw new SdocReadException("Falta manifest.json. Archivo .sdoc inválido.", "missing_required");
        }
        if (documentBytes == null) {
            throw new SdocReadException("Falta content/document.json. Archivo .sdoc inválido.", "missing_required");
        }

        // 2. Parsear como JSON
        Map<String, Object> manifest = parseJson(manifestBytes, PATH_MANIFEST);
        Map<String, Object> document = parseJson(documentBytes, PATH_DOCUMENT);

        // 3. Validar versión
        String formatVersion = String.valueOf(manifest.get("formatVersion"));
        if (formatVersion == null || formatVersion.isBlank()) {
            throw new SdocReadException("manifest.formatVersion ausente", "format_unsupported");
        }
        if (!isMajorMinorCompatible(formatVersion, SUPPORTED_FORMAT_MAJOR_MINOR)) {
            throw new SdocReadException(
                "Versión de formato no soportada: " + formatVersion
                    + " (esperado " + SUPPORTED_FORMAT_MAJOR_MINOR + ".x)",
                "format_unsupported"
            );
        }

        // 4. Rechazar archivos cifrados (esta v1 no descifra en backend)
        if (manifest.get("security") instanceof Map<?, ?> sec
            && Boolean.TRUE.equals(sec.get("encryptedContent"))) {
            throw new SdocReadException(
                ".sdoc cifrado no soportado por este endpoint (impórtalo desde el editor cliente)",
                "encrypted_unsupported"
            );
        }

        // 5. Validar checksums
        verifyContentChecksum(manifest, document);
        verifyManifestChecksum(manifest);

        log.debug("Successfully read .sdoc (id={}, title={})", manifest.get("id"), manifest.get("title"));
        return new SdocReadResult(manifest, document, formatVersion);
    }

    // ============================================================
    // Verificaciones de integridad
    // ============================================================

    private void verifyContentChecksum(Map<String, Object> manifest, Map<String, Object> document) {
        String declared = extractContentChecksum(manifest);
        try {
            byte[] canonical = canonicalize(document);
            String computed = "sha256:" + hex(sha256(canonical));
            if (!computed.equals(declared)) {
                throw new SdocReadException(
                    "contentChecksum mismatch: manifest declara " + declared
                        + " pero el document canónico produce " + computed,
                    "checksum_mismatch"
                );
            }
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new SdocReadException("No se pudo calcular contentChecksum", "internal", e);
        }
    }

    private void verifyManifestChecksum(Map<String, Object> manifest) {
        String declared = extractManifestChecksum(manifest);
        try {
            Map<String, Object> stripped = stripChecksumAndSignatureRef(manifest);
            byte[] canonical = canonicalize(stripped);
            String computed = "sha256:" + hex(sha256(canonical));
            if (!computed.equals(declared)) {
                throw new SdocReadException(
                    "manifestChecksum mismatch: manifest declara " + declared
                        + " pero el cálculo canónico produce " + computed,
                    "checksum_mismatch"
                );
            }
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new SdocReadException("No se pudo calcular manifestChecksum", "internal", e);
        }
    }

    private String extractContentChecksum(Map<String, Object> manifest) {
        if (manifest.get("security") instanceof Map<?, ?> sec
            && sec.get("contentChecksum") instanceof String s) {
            return s;
        }
        throw new SdocReadException("manifest.security.contentChecksum ausente", "missing_required");
    }

    private String extractManifestChecksum(Map<String, Object> manifest) {
        if (manifest.get("security") instanceof Map<?, ?> sec
            && sec.get("manifestChecksum") instanceof String s) {
            return s;
        }
        throw new SdocReadException("manifest.security.manifestChecksum ausente", "missing_required");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> stripChecksumAndSignatureRef(Map<String, Object> manifest) {
        Map<String, Object> copy = new LinkedHashMap<>(manifest);
        if (copy.get("security") instanceof Map<?, ?> sec) {
            Map<String, Object> secCopy = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : sec.entrySet()) {
                String k = String.valueOf(e.getKey());
                if ("manifestChecksum".equals(k) || "signatureRef".equals(k)) continue;
                secCopy.put(k, e.getValue());
            }
            copy.put("security", secCopy);
        }
        return copy;
    }

    // ============================================================
    // ZIP / JSON helpers (idénticos a SdocFileBuilder en lo relevante)
    // ============================================================

    private Map<String, byte[]> unzip(byte[] bytes) {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;
                byte[] data = zip.readAllBytes();
                entries.put(entry.getName(), data);
            }
        } catch (IOException e) {
            throw new SdocReadException("El archivo no es un ZIP válido", "structural", e);
        }
        return entries;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(byte[] bytes, String path) {
        try {
            return jackson.readValue(new String(bytes, StandardCharsets.UTF_8), Map.class);
        } catch (JsonProcessingException e) {
            throw new SdocReadException("JSON inválido en " + path, "structural", e);
        }
    }

    /**
     * Canonicaliza un valor JSON: claves de objeto ordenadas alfabéticamente,
     * sin espacios, omite nulls. MISMA implementación que `SdocFileBuilder`.
     */
    @SuppressWarnings("unchecked")
    byte[] canonicalize(Object value) throws JsonProcessingException {
        return jackson.writeValueAsBytes(sortRecursively(value));
    }

    private Object sortRecursively(Object value) {
        if (value instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> e : map.entrySet()) {
                Object v = e.getValue();
                if (v == null) continue;
                sorted.put(String.valueOf(e.getKey()), sortRecursively(v));
            }
            return sorted;
        }
        if (value instanceof List<?> list) {
            List<Object> copy = new java.util.ArrayList<>(list.size());
            for (Object v : list) copy.add(sortRecursively(v));
            return copy;
        }
        return value;
    }

    private static byte[] sha256(byte[] data) throws NoSuchAlgorithmException {
        return MessageDigest.getInstance("SHA-256").digest(data);
    }

    private static String hex(byte[] bytes) {
        return HexFormat.of().formatHex(bytes);
    }

    private static boolean isMajorMinorCompatible(String version, String supportedMajorMinor) {
        String[] v = version.split("\\.");
        String[] s = supportedMajorMinor.split("\\.");
        if (v.length < 2 || s.length < 2) return false;
        return v[0].equals(s[0]) && v[1].equals(s[1]);
    }

    // ============================================================
    // Tipos públicos
    // ============================================================

    /**
     * Resultado de un `read()` exitoso.
     * Los Map son LinkedHashMap con la estructura cruda parseada.
     */
    public record SdocReadResult(
        Map<String, Object> manifest,
        Map<String, Object> document,
        String formatVersion
    ) {
        public String title() {
            return manifest.get("title") instanceof String s ? s : "Sin título";
        }

        public String description() {
            return manifest.get("description") instanceof String s ? s : null;
        }

        public String language() {
            if (manifest.get("meta") instanceof Map<?, ?> meta
                && meta.get("language") instanceof String lang) {
                return lang;
            }
            return "es";
        }
    }

    public static class SdocReadException extends RuntimeException {
        public final String code;
        public SdocReadException(String message, String code) {
            super(message);
            this.code = code;
        }
        public SdocReadException(String message, String code, Throwable cause) {
            super(message, cause);
            this.code = code;
        }
    }
}
