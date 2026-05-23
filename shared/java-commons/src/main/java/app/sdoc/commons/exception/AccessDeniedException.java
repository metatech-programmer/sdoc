package app.sdoc.commons.exception;

import org.springframework.http.HttpStatus;

public class AccessDeniedException extends SdocException {

    public AccessDeniedException(String action, String resourceId) {
        super(
            "Acceso denegado para la acción '" + action + "' en el recurso: " + resourceId,
            "ACCESS_DENIED",
            HttpStatus.FORBIDDEN
        );
    }
}
