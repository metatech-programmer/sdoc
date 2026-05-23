package app.sdoc.auth.controller;

import app.sdoc.auth.domain.dto.LoginRequest;
import app.sdoc.auth.domain.dto.RegisterRequest;
import app.sdoc.auth.domain.dto.TokenResponse;
import app.sdoc.auth.gdpr.GdprService;
import app.sdoc.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "Registro, login y gestión de tokens")
public class AuthController {

    private final AuthService authService;
    private final GdprService gdprService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registrar nuevo usuario")
    public ResponseEntity<TokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar token de acceso")
    public ResponseEntity<TokenResponse> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(authService.refresh(refreshToken));
    }

    @GetMapping("/me")
    @Operation(summary = "Obtener usuario autenticado")
    public ResponseEntity<Map<String, String>> me(
        @RequestHeader("X-User-Id") String userId,
        @RequestHeader("X-User-Email") String email,
        @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        return ResponseEntity.ok(Map.of(
            "userId", userId,
            "email", email,
            "roles", roles != null ? roles : ""
        ));
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar cuenta (GDPR Art. 17 — Derecho al olvido)")
    public ResponseEntity<Void> deleteAccount(
        @RequestHeader("X-User-Id") String userId
    ) {
        gdprService.deleteUserData(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/export")
    @Operation(summary = "Exportar datos personales (GDPR Art. 20 — Portabilidad)")
    public ResponseEntity<Map<String, Object>> exportData(
        @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(gdprService.exportUserData(userId));
    }
}
