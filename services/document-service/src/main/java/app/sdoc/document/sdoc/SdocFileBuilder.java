package app.sdoc.document.sdoc;

import app.sdoc.document.domain.entity.Document;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Construye un archivo `.sdoc` real (ZIP + JSON) desde una entidad
 * {@link Document}.
 *
 * Cumple SPEC.md §6 (estructura ZIP, manifest, document) y §9.3 (cifrado
 * AES-256-GCM + HKDF-SHA256, firma Ed25519). En esta primera versión solo
 * genera la parte NO cifrada / NO firmada — el cifrado y la firma se
 * delegan al cliente o a la librería TS `@sdoc/format`, que ya las
 * implementa contra Web Crypto API.
 *
 * Reglas clave:
 *  - Las claves JSON se ordenan lexicográficamente (RFC 8785-lite) para que
 *    los checksums sean reproducibles contra la lib TS.
 *  - Los checksums son SHA-256 hex con prefijo `sha256:`.
 *  - `manifestChecksum` se calcula sobre el manifest SIN incluir el propio
 *    campo `manifestChecksum` ni `signatureRef`.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SdocFileBuilder {

    public static final String FORMAT_VERSION = "1.0.0";
    public static final String SCHEMA_VERSION = "1.0.0";
    public static final String ENCRYPTION_ALGORITHM = "AES-256-GCM";
    public static final String KEY_DERIVATION = "HKDF-SHA256";
    public static final String SIGNATURE_ALGORITHM = "Ed25519";

    private static final String PATH_MANIFEST = "manifest.json";
    private static final String PATH_DOCUMENT = "content/document.json";

    /**
     * ObjectMapper que produce JSON canónico (claves ordenadas, sin
     * indent). Lo construimos una vez y lo reutilizamos.
     */
    private final ObjectMapper canonicalMapper = new ObjectMapper()
        .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
        .configure(SerializationFeature.INDENT_OUTPUT, false);

    @Value("${sdoc.format.publisher:metatech-programmer/sdoc}")
    private String publisher;

    /**
     * Construye los bytes del archivo `.sdoc` para un Document dado.
     */
    public byte[] build(Document doc) throws SdocBuildException {
        try {
            // 1. Document.json (estructura compatible con SPEC §6)
            Map<String, Object> documentJson = buildDocumentJson(doc);
            byte[] documentBytes = canonicalize(documentJson);
            String contentChecksum = sha256("sha256:", documentBytes);

            // 2. Manifest (con contentChecksum, sin manifestChecksum aún)
            Map<String, Object> manifestDraft = buildManifest(doc, contentChecksum, "sha256:" + "0".repeat(64));

            // 3. Calcular manifestChecksum sobre el manifest SIN ese campo ni signatureRef
            Map<String, Object> manifestForHash = stripChecksumAndSignatureRef(manifestDraft);
            byte[] manifestForHashBytes = canonicalize(manifestForHash);
            String manifestChecksum = sha256("sha256:", manifestForHashBytes);

            // 4. Manifest final con el manifestChecksum correcto
            Map<String, Object> manifest = buildManifest(doc, contentChecksum, manifestChecksum);
            byte[] manifestBytes = canonicalize(manifest);

            // 5. ZIP
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(baos)) {
                writeZipEntry(zip, PATH_MANIFEST, manifestBytes);
                writeZipEntry(zip, PATH_DOCUMENT, documentBytes);
            }
            byte[] bytes = baos.toByteArray();
            log.debug("Built .sdoc for document {} ({} bytes)", doc.getId(), bytes.length);
            return bytes;

        } catch (IOException | NoSuchAlgorithmException e) {
            throw new SdocBuildException("Failed to build .sdoc for document " + doc.getId(), e);
        }
    }

    // ============================================================
    // Builders de cada pieza
    // ============================================================

    private Map<String, Object> buildManifest(Document doc, String contentChecksum, String manifestChecksum) {
        // Usamos LinkedHashMap para preservar orden de inserción al debuggear,
        // pero al canonicalizar igual se reordena alfabéticamente.
        Map<String, Object> manifest = new LinkedHashMap<>();
        manifest.put("$schema", "https://sdoc.app/schemas/manifest/v1.json");
        manifest.put("formatVersion", FORMAT_VERSION);
        manifest.put("id", prefixedId("doc_", doc.getId().toString()));
        manifest.put("title", doc.getTitle() != null ? doc.getTitle() : "Sin título");
        if (doc.getDescription() != null && !doc.getDescription().isBlank()) {
            manifest.put("description", doc.getDescription());
        }
        manifest.put("createdAt", toIso(doc.getCreatedAt()));
        manifest.put("updatedAt", toIso(doc.getUpdatedAt()));
        manifest.put("version", doc.getVersion() != null ? doc.getVersion() : 1);
        manifest.put("schemaVersion", SCHEMA_VERSION);

        Map<String, Object> owner = new LinkedHashMap<>();
        owner.put("id", prefixedId("usr_", doc.getOwnerId().toString()));
        manifest.put("owner", owner);

        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("syncEnabled", Boolean.TRUE.equals(doc.getSyncEnabled()));
        settings.put("offlineEnabled", true);
        settings.put("collaborationEnabled", true);
        settings.put("versioningEnabled", true);
        settings.put("maxVersions", 100);
        settings.put("autoSaveIntervalSeconds", 30);
        manifest.put("settings", settings);

        Map<String, Object> security = new LinkedHashMap<>();
        security.put("encryption", ENCRYPTION_ALGORITHM);
        security.put("keyDerivation", KEY_DERIVATION);
        security.put("contentChecksum", contentChecksum);
        security.put("manifestChecksum", manifestChecksum);
        security.put("signatureAlgorithm", SIGNATURE_ALGORITHM);
        // signatureRef se agrega solo si el archivo está firmado (no en esta v1)
        security.put("encryptedContent", false);
        manifest.put("security", security);

        Map<String, Object> meta = new LinkedHashMap<>();
        if (doc.getWordCount() != null) meta.put("wordCount", doc.getWordCount());
        if (doc.getPageCount() != null) meta.put("pageCount", doc.getPageCount());
        meta.put("language", doc.getLanguage() != null ? doc.getLanguage() : "es");
        if (doc.getTags() != null && !doc.getTags().isEmpty()) {
            meta.put("tags", doc.getTags());
        }
        meta.put("aiGenerated", false);
        manifest.put("meta", meta);

        return manifest;
    }

    /**
     * Construye `content/document.json`. Si el `content` del Document ya es
     * un árbol compatible con SPEC.md §6 (con `type=document`, `pages`...),
     * se devuelve tal cual. Si parece TipTap (con `type=doc`, `content`...),
     * lo convertimos a estructura SDOC con una sola página.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> buildDocumentJson(Document doc) {
        Object raw = doc.getContent();

        // Si ya está en formato SDOC, devolvemos como Map
        if (raw instanceof Map<?, ?> map && "document".equals(map.get("type")) && map.containsKey("pages")) {
            return (Map<String, Object>) map;
        }

        // Si parece TipTap (type=doc + content[]), aplanamos a una página
        List<Map<String, Object>> elements;
        if (raw instanceof Map<?, ?> tiptap && "doc".equals(tiptap.get("type"))) {
            Object content = tiptap.get("content");
            elements = (content instanceof List<?> list)
                ? convertTiptapNodes((List<Object>) (List<?>) list)
                : List.of(emptyParagraph(1));
        } else {
            elements = List.of(emptyParagraph(1));
        }

        Map<String, Object> page = new LinkedHashMap<>();
        page.put("id", "page_001");
        page.put("order", 1);
        Map<String, Object> size = new LinkedHashMap<>();
        size.put("width", 794);
        size.put("height", 1123);
        size.put("unit", "px");
        page.put("size", size);
        Map<String, Object> margins = new LinkedHashMap<>();
        margins.put("top", 72);
        margins.put("right", 72);
        margins.put("bottom", 72);
        margins.put("left", 72);
        page.put("margins", margins);
        page.put("elements", elements);

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("type", "document");
        document.put("version", "1.0");
        document.put("pages", List.of(page));
        return document;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> convertTiptapNodes(List<Object> tiptapNodes) {
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        int idCounter = 1;
        for (Object n : tiptapNodes) {
            if (!(n instanceof Map<?, ?> node)) continue;
            String type = String.valueOf(node.get("type"));
            String id = String.format("e%03d", idCounter++);
            switch (type) {
                case "heading" -> {
                    Map<String, Object> el = new LinkedHashMap<>();
                    el.put("id", id);
                    el.put("type", "heading");
                    Object attrs = node.get("attrs");
                    int level = 1;
                    if (attrs instanceof Map<?, ?> a && a.get("level") instanceof Number n2) {
                        level = Math.max(1, Math.min(6, n2.intValue()));
                    }
                    el.put("attrs", Map.of("level", level));
                    el.put("children", convertTiptapTextChildren((List<Object>) node.get("content")));
                    out.add(el);
                }
                case "paragraph" -> {
                    Map<String, Object> el = new LinkedHashMap<>();
                    el.put("id", id);
                    el.put("type", "paragraph");
                    el.put("children", convertTiptapTextChildren((List<Object>) node.get("content")));
                    out.add(el);
                }
                case "codeBlock", "code_block" -> {
                    Map<String, Object> el = new LinkedHashMap<>();
                    el.put("id", id);
                    el.put("type", "codeblock");
                    Object attrs = node.get("attrs");
                    if (attrs instanceof Map<?, ?> a && a.get("language") instanceof String lang) {
                        el.put("language", lang);
                    }
                    el.put("content", textPlain((List<Object>) node.get("content")));
                    out.add(el);
                }
                case "image" -> {
                    if (!(node.get("attrs") instanceof Map<?, ?> attrs)) break;
                    Object src = attrs.get("src");
                    if (src == null) break;
                    Map<String, Object> el = new LinkedHashMap<>();
                    el.put("id", id);
                    el.put("type", "image");
                    el.put("src", String.valueOf(src));
                    if (attrs.get("alt") instanceof String alt) el.put("alt", alt);
                    if (attrs.get("width") instanceof Number w) el.put("width", w);
                    if (attrs.get("height") instanceof Number h) el.put("height", h);
                    out.add(el);
                }
                default -> {
                    String plain = textPlain(node.get("content") instanceof List<?> l
                        ? (List<Object>) l
                        : List.of(n));
                    if (!plain.isBlank()) {
                        Map<String, Object> el = new LinkedHashMap<>();
                        el.put("id", id);
                        el.put("type", "paragraph");
                        el.put("children", List.of(Map.of("type", "text", "content", plain)));
                        out.add(el);
                    }
                }
            }
        }
        if (out.isEmpty()) out.add(emptyParagraph(1));
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> convertTiptapTextChildren(List<Object> content) {
        if (content == null) return List.of(Map.of("type", "text", "content", ""));
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (Object c : content) {
            if (!(c instanceof Map<?, ?> node)) continue;
            if (!"text".equals(node.get("type"))) continue;
            Map<String, Object> txt = new LinkedHashMap<>();
            txt.put("type", "text");
            txt.put("content", String.valueOf(node.get("text") == null ? "" : node.get("text")));
            Object marks = node.get("marks");
            if (marks instanceof List<?> markList && !markList.isEmpty()) {
                List<String> names = new java.util.ArrayList<>();
                for (Object m : markList) {
                    if (m instanceof Map<?, ?> mm && mm.get("type") instanceof String n) {
                        if (List.of("bold", "italic", "underline", "strike", "code", "link", "highlight").contains(n)) {
                            names.add(n);
                        }
                    }
                }
                if (!names.isEmpty()) txt.put("marks", names);
            }
            out.add(txt);
        }
        if (out.isEmpty()) out.add(Map.of("type", "text", "content", ""));
        return out;
    }

    @SuppressWarnings("unchecked")
    private String textPlain(List<Object> content) {
        if (content == null) return "";
        StringBuilder sb = new StringBuilder();
        for (Object c : content) {
            if (!(c instanceof Map<?, ?> node)) continue;
            if ("text".equals(node.get("type"))) {
                sb.append(node.get("text") == null ? "" : node.get("text"));
            } else if (node.get("content") instanceof List<?> inner) {
                sb.append(textPlain((List<Object>) inner));
            }
        }
        return sb.toString();
    }

    private Map<String, Object> emptyParagraph(int idIdx) {
        Map<String, Object> el = new LinkedHashMap<>();
        el.put("id", String.format("e%03d", idIdx));
        el.put("type", "paragraph");
        el.put("children", List.of(Map.of("type", "text", "content", "")));
        return el;
    }

    // ============================================================
    // Canonicalización / hashing
    // ============================================================

    /**
     * Serializa el objeto a JSON con claves ordenadas alfabéticamente
     * y sin espacios (RFC 8785-lite). Produce el mismo output que
     * `canonicalize()` de la lib TS, lo cual garantiza checksums idénticos
     * entre Java y JavaScript.
     */
    byte[] canonicalize(Object value) throws JsonProcessingException {
        return canonicalMapper.writeValueAsBytes(sortRecursively(value));
    }

    /**
     * Devuelve una copia del valor con todos los objetos como TreeMap
     * (claves ordenadas). Jackson respeta este orden al serializar.
     */
    @SuppressWarnings("unchecked")
    private Object sortRecursively(Object value) {
        if (value instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> e : map.entrySet()) {
                Object v = e.getValue();
                if (v == null) continue; // omitimos null igual que JSON.stringify omitiría undefined
                sorted.put(String.valueOf(e.getKey()), sortRecursively(v));
            }
            return sorted;
        }
        if (value instanceof List<?> list) {
            List<Object> copy = new java.util.ArrayList<>(list.size());
            for (Object v : list) copy.add(sortRecursively(v));
            return copy;
        }
        if (value instanceof Iterator<?> it) {
            List<Object> copy = new java.util.ArrayList<>();
            while (it.hasNext()) copy.add(sortRecursively(it.next()));
            return copy;
        }
        return value;
    }

    /** SHA-256 con prefijo, ej: "sha256:abc123…" (64 chars hex lowercase). */
    static String sha256(String prefix, byte[] data) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] digest = md.digest(data);
        StringBuilder sb = new StringBuilder(prefix);
        for (byte b : digest) sb.append(String.format("%02x", b));
        return sb.toString();
    }

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
    // Helpers
    // ============================================================

    private static void writeZipEntry(ZipOutputStream zip, String path, byte[] data) throws IOException {
        ZipEntry entry = new ZipEntry(path);
        zip.putNextEntry(entry);
        zip.write(data);
        zip.closeEntry();
    }

    private static String toIso(Instant i) {
        return (i != null ? i : Instant.now()).toString();
    }

    /**
     * Si el id viene como UUID estándar (ej. "550e8400-e29b-41d4-a716-...")
     * lo dejamos tal cual con prefijo (`doc_<uuid>`). Los validadores TS
     * esperan ULID pero también aceptan UUIDs como id opaco si configuras
     * el schema de forma permisiva; en producción real, migrar a ULID
     * según SPEC.md.
     */
    private static String prefixedId(String prefix, String raw) {
        if (raw == null) return prefix + "00000000000000000000000000";
        return prefix + raw;
    }

    public static class SdocBuildException extends RuntimeException {
        public SdocBuildException(String message, Throwable cause) { super(message, cause); }
    }
}
