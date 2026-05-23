package app.sdoc.auth.gdpr;

import app.sdoc.auth.domain.entity.User;
import app.sdoc.auth.repository.UserRepository;
import app.sdoc.auth.service.KeycloakAdminClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Servicio de cumplimiento GDPR — Artículos 17 (derecho al olvido) y 20 (portabilidad de datos).
 * Permite a los usuarios solicitar el borrado completo de su cuenta y la exportación de sus datos.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GdprService {

    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;
    private final ObjectMapper objectMapper;

    /**
     * Elimina permanentemente la cuenta del usuario (GDPR Art. 17 — Derecho al olvido).
     * Borra el usuario de Keycloak y anonimiza el registro local de BD.
     */
    @Transactional
    public void deleteUserData(String userId) {
        UUID uid = UUID.fromString(userId);
        User user = userRepository.findById(uid)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        log.info("Iniciando borrado GDPR para usuario {}", userId);

        // Evitar doble borrado
        if ("DELETED".equals(user.getKeycloakId())) {
            log.warn("Usuario {} ya fue eliminado previamente", userId);
            return;
        }

        // 1. Eliminar de Keycloak (revoca todos los tokens activos)
        try {
            keycloakAdminClient.deleteUser(user.getKeycloakId());
            log.info("Usuario {} eliminado de Keycloak", userId);
        } catch (Exception e) {
            log.warn("No se pudo eliminar usuario {} de Keycloak: {}", userId, e.getMessage());
        }

        // 2. Anonimizar datos personales en BD local (preserva el registro para integridad referencial)
        user.setEmail("deleted-" + uid + "@gdpr.invalid");
        user.setFullName("Usuario eliminado");
        user.setKeycloakId("DELETED");
        user.setDeletedAt(Instant.now());
        userRepository.save(user);

        log.info("Datos GDPR borrados para usuario {}", userId);
    }

    /**
     * Exporta todos los datos del usuario en formato JSON (GDPR Art. 20 — Portabilidad de datos).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> exportUserData(String userId) {
        UUID uid = UUID.fromString(userId);
        User user = userRepository.findByIdIncludingDeleted(uid)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + userId));

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("exportedAt", Instant.now().toString());
        export.put("userId", userId);

        // Datos de perfil
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("email", user.getEmail());
        profile.put("fullName", user.getFullName());
        profile.put("plan", user.getPlan() != null ? user.getPlan().name() : "FREE");
        profile.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        export.put("profile", profile);

        log.info("Exportación GDPR generada para usuario {}", userId);
        return export;
    }
}
