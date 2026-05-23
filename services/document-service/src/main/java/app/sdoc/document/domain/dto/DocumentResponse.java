package app.sdoc.document.domain.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class DocumentResponse {
    private String id;
    private String title;
    private String description;
    private String status;
    private String language;
    private Integer wordCount;
    private Integer pageCount;
    private Long sizeBytes;
    private Integer version;
    private Boolean isPublic;
    private String thumbnailUrl;
    private List<String> tags;
    private Object content;
    private String ownerId;
    private String organizationId;
    private Instant createdAt;
    private Instant updatedAt;
}
