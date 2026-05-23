package app.sdoc.document.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateDocumentRequest(
    @NotBlank(message = "El título es obligatorio")
    @Size(max = 500)
    String title,

    String description,

    @Size(max = 10)
    String language,

    List<String> tags,

    Object content
) {}
