package app.sdoc.commons.featureflags;

/**
 * Constantes de feature flags usadas en toda la plataforma.
 * Matches con los toggles configurados en Unleash (http://localhost:4242).
 */
public final class FeatureFlags {

    private FeatureFlags() {}

    /** Habilita exportación a PDF para cuentas FREE. */
    public static final String PDF_EXPORT_FREE = "sdoc.export.pdf.free";

    /** Activa el límite estricto de documentos por plan. */
    public static final String STRICT_PLAN_LIMITS = "sdoc.plan.limits.strict";

    /** Habilita la sincronización CRDT en tiempo real. */
    public static final String REALTIME_SYNC = "sdoc.sync.realtime";

    /** Activa cifrado AES-256 en documentos nuevos. */
    public static final String DOCUMENT_ENCRYPTION = "sdoc.document.encryption";

    /** Habilita importación de archivos .docx. */
    public static final String DOCX_IMPORT = "sdoc.import.docx";

    /** Killswitch: deshabilita todo el servicio de render. */
    public static final String RENDER_SERVICE_KILLSWITCH = "sdoc.render.killswitch";

    /** Activa notificaciones de colaboración por email. */
    public static final String COLLABORATION_NOTIFICATIONS = "sdoc.notifications.collaboration";
}
