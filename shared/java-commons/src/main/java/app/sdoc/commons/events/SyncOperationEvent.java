package app.sdoc.commons.events;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@SuperBuilder
@NoArgsConstructor
public class SyncOperationEvent extends AbstractDomainEvent {

    private String documentId;
    private String sessionId;
    private String userId;
    private byte[] update;  // Yjs binary update
    private String operationType;  // UPDATE, AWARENESS, CURSOR

    public SyncOperationEvent(String documentId, String sessionId,
                              String userId, byte[] update, String operationType) {
        super(documentId);
        this.documentId = documentId;
        this.sessionId = sessionId;
        this.userId = userId;
        this.update = update;
        this.operationType = operationType;
    }

    @Override public String getEventType()     { return "SYNC_OPERATION"; }
    @Override public String getAggregateType() { return "Document"; }
}
