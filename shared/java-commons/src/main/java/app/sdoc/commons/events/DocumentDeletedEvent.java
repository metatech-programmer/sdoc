package app.sdoc.commons.events;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@SuperBuilder
@NoArgsConstructor
public class DocumentDeletedEvent extends AbstractDomainEvent {

    private String documentId;
    private String ownerId;
    private String deletedById;

    public DocumentDeletedEvent(String documentId, String ownerId, String deletedById) {
        super(documentId);
        this.documentId = documentId;
        this.ownerId = ownerId;
        this.deletedById = deletedById;
    }

    @Override public String getEventType()     { return "DOCUMENT_DELETED"; }
    @Override public String getAggregateType() { return "Document"; }
}
