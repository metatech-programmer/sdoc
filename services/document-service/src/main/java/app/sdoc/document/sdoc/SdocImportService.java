package app.sdoc.document.sdoc;

import app.sdoc.document.domain.dto.CreateDocumentRequest;
import app.sdoc.document.domain.dto.DocumentResponse;
import app.sdoc.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Importa un archivo `.sdoc` subido por el usuario y crea un documento
 * nuevo en el sistema con su contenido.
 *
 * Flujo:
 *  1. {@link SdocFileReader} valida estructura + checksums.
 *  2. Convertimos el `content/document.json` (formato SDOC §6) a JSON
 *     compatible con TipTap (`type: "doc"`, `content: [...]`), que es lo
 *     que espera el editor del frontend.
 *  3. Llamamos a {@link DocumentService#create} con el título del manifest
 *     y luego {@link DocumentService#update} con el contenido convertido.
 *
 * Nota: el documento se crea siempre como propiedad del usuario autenticado,
 * NO del owner declarado en el manifest. Esto previene impersonación.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SdocImportService {

    private final SdocFileReader reader;
    private final DocumentService documentService;

    @Transactional
    public DocumentResponse importBytes(byte[] sdocBytes) {
        SdocFileReader.SdocReadResult result = reader.read(sdocBytes);

        Object tiptapContent = convertSdocDocumentToTiptap(result.document());

        CreateDocumentRequest req = new CreateDocumentRequest(
            result.title(),
            result.description(),
            result.language(),
            null,
            tiptapContent
        );

        DocumentResponse created = documentService.create(req);
        log.info("Imported .sdoc as document {} (original id: {})",
            created.id(), result.manifest().get("id"));
        return created;
    }

    // ============================================================
    // SDOC document.json → TipTap JSON
    // (espejo de sdocDocumentToTiptap del frontend en apps/web)
    // ============================================================

    @SuppressWarnings("unchecked")
    private Map<String, Object> convertSdocDocumentToTiptap(Map<String, Object> document) {
        List<Map<String, Object>> tiptapContent = new java.util.ArrayList<>();

        Object pagesRaw = document.get("pages");
        if (pagesRaw instanceof List<?> pages) {
            for (Object pageRaw : pages) {
                if (!(pageRaw instanceof Map<?, ?> page)) continue;
                Object elementsRaw = page.get("elements");
                if (!(elementsRaw instanceof List<?> elements)) continue;

                for (Object elRaw : elements) {
                    if (!(elRaw instanceof Map<?, ?> el)) continue;
                    Map<String, Object> converted = convertElement((Map<String, Object>) el);
                    if (converted != null) tiptapContent.add(converted);
                }
            }
        }

        if (tiptapContent.isEmpty()) {
            tiptapContent.add(Map.of("type", "paragraph"));
        }

        Map<String, Object> root = new java.util.LinkedHashMap<>();
        root.put("type", "doc");
        root.put("content", tiptapContent);
        return root;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> convertElement(Map<String, Object> el) {
        String type = String.valueOf(el.get("type"));
        Map<String, Object> out = new java.util.LinkedHashMap<>();

        switch (type) {
            case "heading" -> {
                out.put("type", "heading");
                int level = 1;
                if (el.get("attrs") instanceof Map<?, ?> a && a.get("level") instanceof Number n) {
                    level = Math.max(1, Math.min(6, n.intValue()));
                }
                out.put("attrs", Map.of("level", level));
                out.put("content", convertTextChildren((List<Object>) el.get("children")));
            }
            case "paragraph" -> {
                out.put("type", "paragraph");
                out.put("content", convertTextChildren((List<Object>) el.get("children")));
            }
            case "image" -> {
                Object src = el.get("src");
                if (src == null) return null;
                out.put("type", "image");
                Map<String, Object> attrs = new java.util.LinkedHashMap<>();
                attrs.put("src", src);
                if (el.get("alt") != null) attrs.put("alt", el.get("alt"));
                if (el.get("width") != null) attrs.put("width", el.get("width"));
                if (el.get("height") != null) attrs.put("height", el.get("height"));
                out.put("attrs", attrs);
            }
            case "codeblock" -> {
                out.put("type", "codeBlock");
                Map<String, Object> attrs = new java.util.LinkedHashMap<>();
                if (el.get("language") != null) attrs.put("language", el.get("language"));
                out.put("attrs", attrs);
                out.put("content", List.of(Map.of(
                    "type", "text",
                    "text", el.get("content") == null ? "" : el.get("content")
                )));
            }
            default -> {
                // Otros tipos (table, embed) no soportados en esta v1 — los degradamos a párrafo vacío.
                out.put("type", "paragraph");
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> convertTextChildren(List<Object> children) {
        if (children == null || children.isEmpty()) {
            return List.of();
        }
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (Object c : children) {
            if (!(c instanceof Map<?, ?> node)) continue;
            if (!"text".equals(node.get("type"))) continue;
            Map<String, Object> txt = new java.util.LinkedHashMap<>();
            txt.put("type", "text");
            txt.put("text", node.get("content") == null ? "" : String.valueOf(node.get("content")));
            if (node.get("marks") instanceof List<?> marks && !marks.isEmpty()) {
                List<Map<String, String>> tiptapMarks = new java.util.ArrayList<>();
                for (Object m : marks) {
                    if (m instanceof String s) {
                        if (List.of("bold", "italic", "underline", "strike", "code", "link", "highlight").contains(s)) {
                            tiptapMarks.add(Map.of("type", s));
                        }
                    }
                }
                if (!tiptapMarks.isEmpty()) txt.put("marks", tiptapMarks);
            }
            out.add(txt);
        }
        return out;
    }
}
