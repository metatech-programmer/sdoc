package app.sdoc.commons.events;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@SuperBuilder
@NoArgsConstructor
public class DocumentCreatedEvent extends AbstractDomainEvent {

    private String documentId;
    private String title;
    private String ownerId;
    private String ownerEmail;
    private String organizationId;
    private String language;

    public DocumentCreatedEvent(String documentId, String title, String ownerId,
                                String ownerEmail, String organizationId, String language) {
        super(documentId);
        this.documentId = documentId;
        this.title = title;
        this.ownerId = ownerId;
        this.ownerEmail = ownerEmail;
        this.organizationId = organizationId;
        this.language = language;
    }

    @Override public String getEventType()     { return "DOCUMENT_CREATED"; }
    @Override public String getAggregateType() { return "Document"; }
}
