package app.sdoc.commons.multitenancy;

/**
 * Almacena el tenant actual en un ThreadLocal.
 * Para planes FREE/PRO: "public" (schema compartido).
 * Para ENTERPRISE: "tenant_{orgId}" (schema dedicado).
 */
public class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();
    public static final String DEFAULT_TENANT = "public";

    public static void setCurrentTenant(String tenant) {
        CURRENT_TENANT.set(tenant);
    }

    public static String getCurrentTenant() {
        String tenant = CURRENT_TENANT.get();
        return tenant != null ? tenant : DEFAULT_TENANT;
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }

    public static boolean isEnterpriseTenant() {
        String tenant = getCurrentTenant();
        return tenant != null && tenant.startsWith("tenant_");
    }
}
