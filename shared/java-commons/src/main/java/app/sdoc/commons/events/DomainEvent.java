package app.sdoc.commons.events;

import java.time.Instant;

public interface DomainEvent {
    String getEventId();
    String getEventType();
    String getAggregateId();
    String getAggregateType();
    Instant getOccurredAt();
}
