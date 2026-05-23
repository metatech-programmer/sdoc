package app.sdoc.auth.service;

import app.sdoc.auth.domain.dto.LoginRequest;
import app.sdoc.auth.domain.dto.RegisterRequest;
import app.sdoc.auth.domain.dto.TokenResponse;
import app.sdoc.auth.domain.entity.User;
import app.sdoc.auth.repository.UserRepository;
import app.sdoc.commons.outbox.OutboxPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private KeycloakAdminClient keycloakAdminClient;
    @Mock private OutboxPublisher outboxPublisher;

    @InjectMocks private AuthService authService;

    @Test
    void register_guardaUsuarioYPublicaEvento() {
        User savedUser = User.builder()
            .id(UUID.randomUUID())
            .email("test@sdoc.app")
            .fullName("Test User")
            .plan(User.Plan.FREE)
            .build();

        when(userRepository.existsByEmail("test@sdoc.app")).thenReturn(false);
        when(keycloakAdminClient.createUser(any(), any(), any())).thenReturn("kc-id-123");
        when(userRepository.save(any())).thenReturn(savedUser);
        when(keycloakAdminClient.loginUser(any(), any())).thenReturn(Map.of(
            "access_token", "tok", "refresh_token", "ref", "expires_in", 3600
        ));
        when(userRepository.findByEmail("test@sdoc.app")).thenReturn(Optional.of(savedUser));
        doNothing().when(outboxPublisher).publish(any(), any());

        TokenResponse response = authService.register(
            new RegisterRequest("Test User", "test@sdoc.app", "Test1234!")
        );

        assertThat(response.accessToken()).isEqualTo("tok");
        verify(userRepository).save(any(User.class));
        verify(outboxPublisher).publish(any(), eq("sdoc.users.registered"));
    }

    @Test
    void register_emailDuplicado_lanzaExcepcion() {
        when(userRepository.existsByEmail("test@sdoc.app")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
            new RegisterRequest("Test", "test@sdoc.app", "Test1234!")
        )).isInstanceOf(RuntimeException.class)
          .hasMessageContaining("Ya existe una cuenta");
    }

    @Test
    void login_usuarioExiste_retornaTokens() {
        User user = User.builder()
            .id(UUID.randomUUID())
            .email("test@sdoc.app")
            .fullName("Test User")
            .plan(User.Plan.FREE)
            .build();

        when(keycloakAdminClient.loginUser("test@sdoc.app", "pass")).thenReturn(Map.of(
            "access_token", "access", "refresh_token", "refresh", "expires_in", 3600
        ));
        when(userRepository.findByEmail("test@sdoc.app")).thenReturn(Optional.of(user));

        TokenResponse response = authService.login(new LoginRequest("test@sdoc.app", "pass"));

        assertThat(response.accessToken()).isEqualTo("access");
        assertThat(response.refreshToken()).isEqualTo("refresh");
    }
}
