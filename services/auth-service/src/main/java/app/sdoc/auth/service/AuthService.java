package app.sdoc.auth.service;

import app.sdoc.auth.domain.dto.LoginRequest;
import app.sdoc.auth.domain.dto.RegisterRequest;
import app.sdoc.auth.domain.dto.TokenResponse;
import app.sdoc.auth.domain.entity.User;
import app.sdoc.auth.repository.UserRepository;
import app.sdoc.commons.events.UserRegisteredEvent;
import app.sdoc.commons.outbox.OutboxPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final String TOPIC_USERS_REGISTERED = "sdoc.users.registered";

    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;
    private final OutboxPublisher outboxPublisher;

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new RuntimeException("Ya existe una cuenta con ese email");
        }

        // 1. Crear usuario en Keycloak
        String keycloakId = keycloakAdminClient.createUser(
            request.email(), request.password(), request.fullName()
        );

        // 2. Persistir en nuestra DB
        User user = User.builder()
            .keycloakId(keycloakId)
            .email(request.email())
            .fullName(request.fullName())
            .plan(User.Plan.FREE)
            .build();

        userRepository.save(user);

        // 3. Publicar evento en Outbox (dentro de la misma transacción)
        outboxPublisher.publish(
            new UserRegisteredEvent(
                user.getId().toString(),
                user.getEmail(),
                user.getFullName(),
                user.getPlan().name()
            ),
            TOPIC_USERS_REGISTERED
        );

        log.info("Usuario registrado: {} (id: {})", user.getEmail(), user.getId());

        // 4. Login automático tras registro
        return login(new LoginRequest(request.email(), request.password()));
    }

    public TokenResponse login(LoginRequest request) {
        Map<String, Object> keycloakResponse = keycloakAdminClient.loginUser(
            request.email(), request.password()
        );

        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        return TokenResponse.builder()
            .accessToken((String) keycloakResponse.get("access_token"))
            .refreshToken((String) keycloakResponse.get("refresh_token"))
            .expiresIn(((Number) keycloakResponse.get("expires_in")).longValue())
            .tokenType("Bearer")
            .user(TokenResponse.UserInfo.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .plan(user.getPlan().name())
                .build())
            .build();
    }

    public TokenResponse refresh(String refreshToken) {
        Map<String, Object> keycloakResponse = keycloakAdminClient.refreshToken(refreshToken);

        return TokenResponse.builder()
            .accessToken((String) keycloakResponse.get("access_token"))
            .refreshToken((String) keycloakResponse.get("refresh_token"))
            .expiresIn(((Number) keycloakResponse.get("expires_in")).longValue())
            .tokenType("Bearer")
            .build();
    }
}
