package app.sdoc.commons.logging;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Filtro que enriquece el MDC (Mapped Diagnostic Context) de SLF4J con datos del request.
 * Garantiza que TODOS los logs del request incluyan userId, requestId y tenantId.
 * Crítico para correlacionar logs en Loki/Grafana y depurar incidencias en producción.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class MdcEnrichmentFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            HttpServletRequest httpRequest = (HttpServletRequest) request;

            // Enriquecer MDC con datos del request inyectados por el gateway
            String userId = httpRequest.getHeader("X-User-Id");
            String requestId = httpRequest.getHeader("X-Request-Id");
            String tenantId = httpRequest.getHeader("X-Org-Id");
            String correlationId = httpRequest.getHeader("X-Correlation-Id");

            if (userId != null) MDC.put("userId", userId);
            if (requestId != null) MDC.put("requestId", requestId);
            if (tenantId != null) MDC.put("tenantId", tenantId);
            if (correlationId != null) MDC.put("correlationId", correlationId);

            MDC.put("path", httpRequest.getRequestURI());
            MDC.put("method", httpRequest.getMethod());

            chain.doFilter(request, response);

        } finally {
            // OBLIGATORIO: limpiar MDC para evitar leaks entre requests en el mismo thread
            MDC.clear();
        }
    }
}
