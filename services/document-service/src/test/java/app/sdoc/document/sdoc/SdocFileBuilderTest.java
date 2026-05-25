package app.sdoc.document.sdoc;

import app.sdoc.document.domain.entity.Document;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests del SdocFileBuilder — empaquetado de un Document como archivo .sdoc real.
 *
 * Verifica:
 *  - Estructura ZIP mínima (manifest.json + content/document.json).
 *  - Canonicalización JSON (claves ordenadas, sin nulls, sin espacios).
 *  - contentChecksum = SHA-256 hex del document canónico.
 *  - manifestChecksum = SHA-256 hex del manifest sin manifestChecksum/signatureRef.
 *  - Conversión TipTap → SDOC §6.
 */
class SdocFileBuilderTest {

    private SdocFileBuilder builder;
    private final ObjectMapper jackson = new ObjectMapper();

    @BeforeEach
    void setUp() {
        builder = new SdocFileBuilder();
    }

    @Test
    @DisplayName("genera un ZIP válido con manifest.json y content/document.json")
    void buildGeneratesValidZip() throws Exception {
        Document doc = sampleDocument();

        byte[] bytes = builder.build(doc);

        assertThat(bytes).isNotEmpty();
        // Magic number ZIP: "PK\x03\x04"
        assertThat(bytes[0]).isEqualTo((byte) 0x50);
        assertThat(bytes[1]).isEqualTo((byte) 0x4B);

        Map<String, byte[]> entries = unzip(bytes);
        assertThat(entries).containsKeys("manifest.json", "content/document.json");
    }

    @Test
    @DisplayName("manifest.json tiene los campos mínimos requeridos por la spec")
    @SuppressWarnings("unchecked")
    void manifestHasRequiredFields() throws Exception {
        Document doc = sampleDocument();
        byte[] bytes = builder.build(doc);
        Map<String, byte[]> entries = unzip(bytes);

        Map<String, Object> manifest = jackson.readValue(entries.get("manifest.json"), Map.class);

        assertThat(manifest).containsKeys(
            "$schema", "formatVersion", "id", "title", "createdAt", "updatedAt",
            "version", "schemaVersion", "owner", "settings", "security", "meta"
        );
        assertThat(manifest.get("formatVersion")).isEqualTo("1.0.0");
        assertThat(manifest.get("title")).isEqualTo("Mi documento de prueba");

        Map<String, Object> security = (Map<String, Object>) manifest.get("security");
        assertThat(security.get("encryption")).isEqualTo("AES-256-GCM");
        assertThat(security.get("keyDerivation")).isEqualTo("HKDF-SHA256");
        assertThat(security.get("signatureAlgorithm")).isEqualTo("Ed25519");
        assertThat(security.get("encryptedContent")).isEqualTo(false);
    }

    @Test
    @DisplayName("contentChecksum coincide con SHA-256 hex del document canónico")
    @SuppressWarnings("unchecked")
    void contentChecksumMatchesCanonicalDocument() throws Exception {
        Document doc = sampleDocument();
        byte[] bytes = builder.build(doc);
        Map<String, byte[]> entries = unzip(bytes);

        Map<String, Object> manifest = jackson.readValue(entries.get("manifest.json"), Map.class);
        String declared = ((Map<String, String>) manifest.get("security")).get("contentChecksum");

        // El document.json del ZIP ya está canonicalizado por el builder,
        // así que su SHA-256 directo debe coincidir.
        byte[] docBytes = entries.get("content/document.json");
        String computed = "sha256:" + sha256Hex(docBytes);

        assertThat(declared).isEqualTo(computed);
    }

    @Test
    @DisplayName("manifestChecksum coincide con el SHA-256 del manifest sin sus autoreferences")
    @SuppressWarnings("unchecked")
    void manifestChecksumExcludesSelfReferenceFields() throws Exception {
        Document doc = sampleDocument();
        byte[] bytes = builder.build(doc);
        Map<String, byte[]> entries = unzip(bytes);

        Map<String, Object> manifest = jackson.readValue(entries.get("manifest.json"), Map.class);
        Map<String, Object> security = (Map<String, Object>) manifest.get("security");
        String declared = (String) security.get("manifestChecksum");

        // Strip y recalculo siguiendo la misma lógica del builder.
        Map<String, Object> stripped = new LinkedHashMap<>(manifest);
        Map<String, Object> secCopy = new LinkedHashMap<>(security);
        secCopy.remove("manifestChecksum");
        secCopy.remove("signatureRef");
        stripped.put("security", secCopy);

        String computed = "sha256:" + sha256Hex(builder.canonicalize(stripped));
        assertThat(declared).isEqualTo(computed);
    }

    @Test
    @DisplayName("canonicaliza JSON: claves ordenadas alfabéticamente")
    void canonicalizeOrdersKeysAlphabetically() throws Exception {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("zebra", 1);
        input.put("alpha", 2);
        input.put("mango", 3);

        String result = new String(builder.canonicalize(input), StandardCharsets.UTF_8);

        assertThat(result).isEqualTo("{\"alpha\":2,\"mango\":3,\"zebra\":1}");
    }

    @Test
    @DisplayName("canonicaliza JSON: omite nulls (igual que JSON.stringify omite undefined)")
    void canonicalizeOmitsNulls() throws Exception {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("a", 1);
        input.put("b", null);
        input.put("c", 3);

        String result = new String(builder.canonicalize(input), StandardCharsets.UTF_8);

        assertThat(result).isEqualTo("{\"a\":1,\"c\":3}");
    }

    @Test
    @DisplayName("convierte contenido TipTap (type=doc) a estructura SDOC §6 con una página")
    @SuppressWarnings("unchecked")
    void convertsTiptapToSdocStructure() throws Exception {
        // TipTap: {type:"doc", content:[{type:"heading", attrs:{level:1}, content:[...]}, ...]}
        Map<String, Object> tiptap = Map.of(
            "type", "doc",
            "content", List.of(
                Map.of(
                    "type", "heading",
                    "attrs", Map.of("level", 1),
                    "content", List.of(Map.of("type", "text", "text", "Título"))
                ),
                Map.of(
                    "type", "paragraph",
                    "content", List.of(Map.of("type", "text", "text", "Hola mundo"))
                )
            )
        );

        Document doc = sampleDocument();
        doc.setContent(tiptap);

        byte[] bytes = builder.build(doc);
        Map<String, byte[]> entries = unzip(bytes);
        Map<String, Object> document = jackson.readValue(entries.get("content/document.json"), Map.class);

        assertThat(document.get("type")).isEqualTo("document");
        assertThat(document.get("version")).isEqualTo("1.0");

        List<Map<String, Object>> pages = (List<Map<String, Object>>) document.get("pages");
        assertThat(pages).hasSize(1);

        List<Map<String, Object>> elements = (List<Map<String, Object>>) pages.get(0).get("elements");
        assertThat(elements).hasSize(2);
        assertThat(elements.get(0).get("type")).isEqualTo("heading");
        assertThat(elements.get(1).get("type")).isEqualTo("paragraph");
    }

    @Test
    @DisplayName("si el content ya es estructura SDOC, no lo convierte de nuevo")
    @SuppressWarnings("unchecked")
    void preservesAlreadySdocContent() throws Exception {
        Map<String, Object> sdocContent = Map.of(
            "type", "document",
            "version", "1.0",
            "pages", List.of(Map.of(
                "id", "page_001",
                "order", 1,
                "elements", List.of(Map.of(
                    "id", "e001",
                    "type", "paragraph",
                    "children", List.of(Map.of("type", "text", "content", "ya en SDOC"))
                ))
            ))
        );

        Document doc = sampleDocument();
        doc.setContent(sdocContent);

        byte[] bytes = builder.build(doc);
        Map<String, byte[]> entries = unzip(bytes);
        Map<String, Object> document = jackson.readValue(entries.get("content/document.json"), Map.class);

        List<Map<String, Object>> elements =
            (List<Map<String, Object>>) ((List<Map<String, Object>>) document.get("pages")).get(0).get("elements");
        assertThat(elements.get(0).get("type")).isEqualTo("paragraph");
        assertThat(((List<Map<String, Object>>) elements.get(0).get("children")).get(0).get("content"))
            .isEqualTo("ya en SDOC");
    }

    @Test
    @DisplayName("rechaza Document con id null al intentar construir")
    void rejectsNullDocumentId() {
        Document doc = Document.builder()
            .id(null)
            .ownerId(UUID.randomUUID())
            .title("x")
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        assertThatThrownBy(() -> builder.build(doc))
            .isInstanceOf(Exception.class);
    }

    // ============================================================
    // Helpers
    // ============================================================

    private Document sampleDocument() {
        return Document.builder()
            .id(UUID.fromString("11111111-2222-3333-4444-555555555555"))
            .ownerId(UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"))
            .title("Mi documento de prueba")
            .description("Descripción de ejemplo")
            .language("es-CO")
            .version(1)
            .syncEnabled(true)
            .wordCount(10)
            .pageCount(1)
            .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
            .updatedAt(Instant.parse("2026-01-02T00:00:00Z"))
            .build();
    }

    private static Map<String, byte[]> unzip(byte[] bytes) throws Exception {
        Map<String, byte[]> out = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry e;
            while ((e = zip.getNextEntry()) != null) {
                if (!e.isDirectory()) {
                    out.put(e.getName(), zip.readAllBytes());
                }
            }
        }
        return out;
    }

    private static String sha256Hex(byte[] data) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
    }
}
