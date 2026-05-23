package app.sdoc.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Servicio de email usando Resend API (https://resend.com).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final RestTemplate restTemplate;

    @Value("${sdoc.email.resend-api-key}")
    private String resendApiKey;

    @Value("${sdoc.email.from-address:noreply@sdoc.app}")
    private String fromAddress;

    @Value("${sdoc.email.from-name:SDOC Platform}")
    private String fromName;

    @Value("${sdoc.email.resend-api-url:https://api.resend.com/emails}")
    private String resendApiUrl;

    public void sendWelcomeEmail(String toEmail, String fullName) {
        send(toEmail, "Bienvenido a SDOC Platform", buildWelcomeHtml(fullName));
    }

    public void sendExportReadyEmail(String toEmail, String documentTitle, String downloadUrl) {
        send(toEmail, "Tu exportación está lista: " + documentTitle,
            buildExportReadyHtml(documentTitle, downloadUrl));
    }

    public void sendCollaborationInviteEmail(String toEmail, String documentTitle,
                                             String inviterName) {
        send(toEmail, inviterName + " te invitó a colaborar en \"" + documentTitle + "\"",
            buildInviteHtml(documentTitle, inviterName));
    }

    private void send(String toEmail, String subject, String html) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(resendApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
            "from", fromName + " <" + fromAddress + ">",
            "to", new String[]{toEmail},
            "subject", subject,
            "html", html
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                resendApiUrl, HttpMethod.POST, entity, Map.class
            );
            log.info("Email enviado a {}: {} (id: {})", toEmail, subject,
                response.getBody() != null ? response.getBody().get("id") : "N/A");
        } catch (Exception e) {
            log.error("Error al enviar email a {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildWelcomeHtml(String fullName) {
        return """
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a2e;">¡Bienvenido a SDOC Platform, %s!</h1>
              <p>Tu cuenta ha sido creada exitosamente.</p>
              <p>Comienza a crear documentos colaborativos con sincronización en tiempo real.</p>
              <a href="https://app.sdoc.app" style="background:#4f46e5;color:white;
                padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
                Ir a SDOC Platform
              </a>
            </div>
            """.formatted(fullName);
    }

    private String buildExportReadyHtml(String title, String downloadUrl) {
        return """
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a2e;">Tu exportación está lista</h1>
              <p>El documento <strong>%s</strong> ha sido exportado exitosamente.</p>
              <a href="%s" style="background:#4f46e5;color:white;padding:12px 24px;
                text-decoration:none;border-radius:6px;display:inline-block">
                Descargar documento
              </a>
              <p style="color:#666;font-size:14px;">El enlace expira en 24 horas.</p>
            </div>
            """.formatted(title, downloadUrl);
    }

    private String buildInviteHtml(String title, String inviterName) {
        return """
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a2e;">Invitación a colaborar</h1>
              <p><strong>%s</strong> te ha invitado a colaborar en <em>"%s"</em>.</p>
              <a href="https://app.sdoc.app" style="background:#4f46e5;color:white;
                padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
                Ver documento
              </a>
            </div>
            """.formatted(inviterName, title);
    }
}
