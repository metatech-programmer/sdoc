package app.sdoc.commons.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Builder;
import lombok.Getter;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.List;

/**
 * Extrae el contexto de usuario desde los headers propagados por el Gateway.
 * El Gateway valida el JWT y proyecta: X-User-Id, X-User-Email, X-User-Roles, X-Org-Id, X-User-Plan.
 */
@Getter
@Builder
public class UserContext {

    private final String userId;
    private final String email;
    private final List<String> roles;
    private final String organizationId;
    private final String plan;

    public static UserContext fromRequest() {
        HttpServletRequest request = currentRequest();

        String rolesHeader = request.getHeader("X-User-Roles");
        List<String> roles = rolesHeader != null && !rolesHeader.isBlank()
            ? Arrays.asList(rolesHeader.split(","))
            : List.of();

        return UserContext.builder()
            .userId(request.getHeader("X-User-Id"))
            .email(request.getHeader("X-User-Email"))
            .roles(roles)
            .organizationId(request.getHeader("X-Org-Id"))
            .plan(request.getHeader("X-User-Plan"))
            .build();
    }

    public boolean isAdmin() {
        return roles != null && roles.contains("ADMIN");
    }

    public boolean hasRole(String role) {
        return roles != null && roles.contains(role);
    }

    private static HttpServletRequest currentRequest() {
        return ((ServletRequestAttributes) RequestContextHolder
            .currentRequestAttributes()).getRequest();
    }
}
