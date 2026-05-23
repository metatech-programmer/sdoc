package app.sdoc.commons.events;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@SuperBuilder
@NoArgsConstructor
public class ExportCompletedEvent extends AbstractDomainEvent {

    private String exportId;
    private String documentId;
    private String documentTitle;
    private String requestedById;
    private String ownerEmail;
    private String format;
    private String downloadUrl;
    private Long fileSizeBytes;

    public ExportCompletedEvent(String exportId, String documentId, String documentTitle,
                                String requestedById, String ownerEmail,
                                String format, String downloadUrl, Long fileSizeBytes) {
        super(exportId);
        this.exportId = exportId;
        this.documentId = documentId;
        this.documentTitle = documentTitle;
        this.requestedById = requestedById;
        this.ownerEmail = ownerEmail;
        this.format = format;
        this.downloadUrl = downloadUrl;
        this.fileSizeBytes = fileSizeBytes;
    }

    @Override public String getEventType()     { return "EXPORT_COMPLETED"; }
    @Override public String getAggregateType() { return "Export"; }
}
