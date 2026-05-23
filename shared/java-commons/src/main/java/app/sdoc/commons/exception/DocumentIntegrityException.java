package app.sdoc.commons.exception;

import org.springframework.http.HttpStatus;

/**
 * Excepción lanzada cuando falla la verificación de integridad de un documento.
 * Por ejemplo, cuando el checksum del contenido descifrado no coincide con el esperado.
 */
public class DocumentIntegrityException extends SdocException {

    public DocumentIntegrityException(String message) {
        super("DOCUMENT_INTEGRITY_ERROR", message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
