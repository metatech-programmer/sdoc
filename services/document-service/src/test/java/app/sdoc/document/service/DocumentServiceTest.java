package app.sdoc.document.service;

import app.sdoc.commons.outbox.OutboxPublisher;
import app.sdoc.document.domain.dto.CreateDocumentRequest;
import app.sdoc.document.domain.dto.DocumentResponse;
import app.sdoc.document.domain.entity.Document;
import app.sdoc.document.repository.DocumentRepository;
import app.sdoc.document.security.OpaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private OutboxPublisher outboxPublisher;
    @Mock private OpaClient opaClient;

    @InjectMocks private DocumentService documentService;

    @BeforeEach
    void setup() {
        // Simula headers HTTP que UserContext.fromRequest() espera
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Id", UUID.randomUUID().toString());
        request.addHeader("X-User-Email", "test@sdoc.app");
        request.addHeader("X-User-Roles", "USER");
        request.addHeader("X-User-Plan", "FREE");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @Test
    void crearDocumento_guardaYPublicaEvento() {
        Document savedDoc = Document.builder()
            .id(UUID.randomUUID())
            .title("Test Doc")
            .language("es")
            .tags(List.of())
            .content("{}")
            .ownerId(UUID.randomUUID())
            .build();

        when(documentRepository.save(any(Document.class))).thenReturn(savedDoc);

        CreateDocumentRequest request = new CreateDocumentRequest(
            "Test Doc", null, "es", List.of(), null
        );

        DocumentResponse response = documentService.create(request);

        assertThat(response.title()).isEqualTo("Test Doc");
        verify(documentRepository).save(any(Document.class));
        verify(outboxPublisher).publish(any(), eq("sdoc.documents.created"));
    }

    @Test
    void buscarPorId_documentoNoExiste_lanzaExcepcion() {
        when(documentRepository.findById(any(UUID.class))).thenReturn(Optional.empty());
        doNothing().when(opaClient).checkPermission(any(), any(), any());

        org.junit.jupiter.api.Assertions.assertThrows(
            app.sdoc.commons.exception.DocumentNotFoundException.class,
            () -> documentService.findById(UUID.randomUUID().toString())
        );
    }
}
