package app.sdoc.commons.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class ErrorResponse {
    private boolean success;
    private ErrorDetail error;
    private Instant timestamp;
}
