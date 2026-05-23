package app.sdoc.commons.exception;

import org.springframework.http.HttpStatus;

public class DocumentNotFoundException extends SdocException {

    public DocumentNotFoundException(String documentId) {
        super("Documento no encontrado: " + documentId, "DOCUMENT_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
}
