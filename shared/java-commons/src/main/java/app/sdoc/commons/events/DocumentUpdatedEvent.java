package app.sdoc.commons.events;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@SuperBuilder
@NoArgsConstructor
public class DocumentUpdatedEvent extends AbstractDomainEvent {

    private String documentId;
    private String title;
    private String ownerId;
    private String updatedById;
    private Integer newVersion;

    public DocumentUpdatedEvent(String documentId, String title, String ownerId,
                                String updatedById, Integer newVersion) {
        super(documentId);
        this.documentId = documentId;
        this.title = title;
        this.ownerId = ownerId;
        this.updatedById = updatedById;
        this.newVersion = newVersion;
    }

    @Override public String getEventType()     { return "DOCUMENT_UPDATED"; }
    @Override public String getAggregateType() { return "Document"; }
}
