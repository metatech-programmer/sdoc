package app.sdoc.commons.multitenancy;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Lee el plan del usuario desde el header X-User-Plan (inyectado por el Gateway)
 * y establece el tenant correspondiente en el contexto.
 */
@Component
@Order(1)
@Slf4j
public class TenantResolutionFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
        throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;

        String plan = httpRequest.getHeader("X-User-Plan");
        String orgId = httpRequest.getHeader("X-Org-Id");

        String tenant;
        if ("ENTERPRISE".equals(plan) && orgId != null && !orgId.isBlank()) {
            tenant = "tenant_" + orgId.replace("-", "_");
        } else {
            tenant = TenantContext.DEFAULT_TENANT;
        }

        TenantContext.setCurrentTenant(tenant);
        log.trace("Tenant establecido: {} para plan: {}", tenant, plan);

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
