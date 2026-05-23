package app.sdoc.document.multitenancy;

import app.sdoc.commons.multitenancy.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * DataSource que enruta conexiones al schema PostgreSQL del tenant activo.
 * Planes FREE/PRO usan el schema "public"; ENTERPRISE usan "tenant_{orgId}".
 * Configurado como bean primario en DocumentConfig para reemplazar al DataSource por defecto.
 */
@Slf4j
public class TenantAwareDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        String tenant = TenantContext.getCurrentTenant();
        if (log.isTraceEnabled()) {
            log.trace("Resolviendo DataSource para tenant: {}", tenant);
        }
        return tenant;
    }
}
