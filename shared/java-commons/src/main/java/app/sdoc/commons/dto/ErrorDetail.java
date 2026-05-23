package app.sdoc.commons.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ErrorDetail {
    private String code;
    private String message;
    private List<String> details;
    private String field;
}
