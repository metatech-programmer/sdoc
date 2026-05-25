package app.sdoc.document.sdoc;

import app.sdoc.document.domain.entity.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests del SdocFileReader — parsea y valida .sdoc entrante.
 *
 * Verifica:
 *  - Round-trip: build → read recupera title/description/language.
 *  - Rechaza bytes vacíos, ZIP inválido, falta de manifest/document.
 *  - Detecta tampering (checksums alterados).
 *  - Rechaza versiones de formato incompatibles.
 *  - Rechaza archivos cifrados (delegados al cliente).
 */
class SdocFileReaderTest {

    private SdocFileBuilder builder;
    private SdocFileReader reader;

    @BeforeEach
    void setUp() {
        builder = new SdocFileBuilder();
        reader = new SdocFileReader();
    }

    @Test
    @DisplayName("round-trip: lo construido por SdocFileBuilder se lee sin problemas")
    void roundTripBuilderReader() throws Exception {
        Document doc = sampleDocument("Documento de prueba", "Una descripción", "es-CO");
        byte[] bytes = builder.build(doc);

        SdocFileReader.SdocReadResult result = reader.read(bytes);

        assertThat(result.title()).isEqualTo("Documento de prueba");
        assertThat(result.description()).isEqualTo("Una descripción");
        assertThat(result.language()).isEqualTo("es-CO");
        assertThat(result.formatVersion()).isEqualTo("1.0.0");
        assertThat(result.manifest()).containsKey("id");
        assertThat(result.document()).containsEntry("type", "document");
    }

    @Test
    @DisplayName("rechaza bytes vacíos")
    void rejectsEmptyBytes() {
        assertThatThrownBy(() -> reader.read(new byte[0]))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .matches(e -> ((SdocFileReader.SdocReadException) e).code.equals("empty"));
    }

    @Test
    @DisplayName("rechaza null como bytes")
    void rejectsNullBytes() {
        assertThatThrownBy(() -> reader.read(null))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .matches(e -> ((SdocFileReader.SdocReadException) e).code.equals("empty"));
    }

    @Test
    @DisplayName("rechaza algo que no es ZIP")
    void rejectsNonZipBytes() {
        byte[] notAZip = "esto definitivamente no es un ZIP".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> reader.read(notAZip))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .matches(e -> ((SdocFileReader.SdocReadException) e).code.equals("structural"));
    }

    @Test
    @DisplayName("rechaza un ZIP sin manifest.json")
    void rejectsZipWithoutManifest() throws Exception {
        byte[] zipWithoutManifest = makeZip("other.json", "{}".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> reader.read(zipWithoutManifest))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .hasMessageContaining("manifest.json");
    }

    @Test
    @DisplayName("rechaza un ZIP con manifest pero sin content/document.json")
    void rejectsZipWithoutDocument() throws Exception {
        String manifestJson = "{\"formatVersion\":\"1.0.0\"}";
        byte[] zip = makeZip("manifest.json", manifestJson.getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> reader.read(zip))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .hasMessageContaining("document.json");
    }

    @Test
    @DisplayName("rechaza versión de formato incompatible")
    void rejectsIncompatibleFormatVersion() throws Exception {
        // Construimos un .sdoc válido pero manipulamos el manifest para
        // declarar una version futura (2.0.0).
        Document doc = sampleDocument("X", null, "es");
        byte[] bytes = builder.build(doc);

        byte[] tampered = replaceInZip(bytes, "manifest.json", json -> {
            // Reemplazo simple por regex (suficiente para test).
            return json.replace("\"formatVersion\":\"1.0.0\"", "\"formatVersion\":\"2.0.0\"");
        });

        assertThatThrownBy(() -> reader.read(tampered))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .matches(e -> ((SdocFileReader.SdocReadException) e).code.equals("format_unsupported"));
    }

    @Test
    @DisplayName("rechaza archivos cifrados (delega al cliente)")
    void rejectsEncryptedFiles() throws Exception {
        Document doc = sampleDocument("X", null, "es");
        byte[] bytes = builder.build(doc);

        byte[] tampered = replaceInZip(bytes, "manifest.json", json ->
            json.replace("\"encryptedContent\":false", "\"encryptedContent\":true")
        );

        assertThatThrownBy(() -> reader.read(tampered))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .matches(e -> ((SdocFileReader.SdocReadException) e).code.equals("encrypted_unsupported"));
    }

    @Test
    @DisplayName("detecta tampering: documento alterado tras la construcción")
    void detectsTamperedDocument() throws Exception {
        Document doc = sampleDocument("X", null, "es");
        byte[] bytes = builder.build(doc);

        byte[] tampered = replaceInZip(bytes, "content/document.json", json ->
            // Manipulación obvia: añadimos un campo extra al document
            json.replace("\"pages\":[", "\"hackerWasHere\":true,\"pages\":[")
        );

        assertThatThrownBy(() -> reader.read(tampered))
            .isInstanceOf(SdocFileReader.SdocReadException.class)
            .matches(e -> ((SdocFileReader.SdocReadException) e).code.equals("checksum_mismatch"));
    }

    @Test
    @DisplayName("title() / description() / language() devuelven valores sensatos cuando faltan")
    void resultFallbacksAreSane() throws Exception {
        Document doc = sampleDocument("Solo título", null, null);
        byte[] bytes = builder.build(doc);

        SdocFileReader.SdocReadResult result = reader.read(bytes);

        assertThat(result.title()).isEqualTo("Solo título");
        assertThat(result.description()).isNull();
        // Default es "es" según el builder (siempre escribe `meta.language`)
        assertThat(result.language()).isEqualTo("es");
    }

    // ============================================================
    // Helpers
    // ============================================================

    private Document sampleDocument(String title, String description, String language) {
        return Document.builder()
            .id(UUID.fromString("11111111-2222-3333-4444-555555555555"))
            .ownerId(UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"))
            .title(title)
            .description(description)
            .language(language)
            .version(1)
            .syncEnabled(true)
            .wordCount(0)
            .pageCount(1)
            .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
            .updatedAt(Instant.parse("2026-01-02T00:00:00Z"))
            .build();
    }

    private static byte[] makeZip(String name, byte[] content) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(baos)) {
            zip.putNextEntry(new ZipEntry(name));
            zip.write(content);
            zip.closeEntry();
        }
        return baos.toByteArray();
    }

    private static byte[] replaceInZip(byte[] sourceZip, String entryToReplace,
                                       java.util.function.Function<String, String> transform)
        throws Exception {
        java.util.Map<String, byte[]> entries = new java.util.LinkedHashMap<>();
        try (java.util.zip.ZipInputStream zip = new java.util.zip.ZipInputStream(
            new java.io.ByteArrayInputStream(sourceZip))) {
            ZipEntry e;
            while ((e = zip.getNextEntry()) != null) {
                if (e.isDirectory()) continue;
                byte[] data = zip.readAllBytes();
                if (e.getName().equals(entryToReplace)) {
                    String transformed = transform.apply(new String(data, StandardCharsets.UTF_8));
                    data = transformed.getBytes(StandardCharsets.UTF_8);
                }
                entries.put(e.getName(), data);
            }
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream out = new ZipOutputStream(baos)) {
            for (var e : entries.entrySet()) {
                out.putNextEntry(new ZipEntry(e.getKey()));
                out.write(e.getValue());
                out.closeEntry();
            }
        }
        return baos.toByteArray();
    }
}
