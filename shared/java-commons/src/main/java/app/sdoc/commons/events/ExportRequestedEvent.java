package app.sdoc.commons.events;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@SuperBuilder
@NoArgsConstructor
public class ExportRequestedEvent extends AbstractDomainEvent {

    private String exportId;
    private String documentId;
    private String requestedById;
    private String format;  // PDF, DOCX, HTML, EPUB

    public ExportRequestedEvent(String exportId, String documentId,
                                String requestedById, String format) {
        super(exportId);
        this.exportId = exportId;
        this.documentId = documentId;
        this.requestedById = requestedById;
        this.format = format;
    }

    @Override public String getEventType()     { return "EXPORT_REQUESTED"; }
    @Override public String getAggregateType() { return "Export"; }
}
