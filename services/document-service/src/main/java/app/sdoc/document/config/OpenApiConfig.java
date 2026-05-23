package app.sdoc.document.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuración OpenAPI/Swagger para el document-service.
 * Expone documentación interactiva en /swagger-ui.html (solo en entornos no productivos).
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI documentServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SDOC Document Service API")
                        .description("API de gestión de documentos SDOC — CRUD, búsqueda FTS y exportación")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("SDOC Platform")
                                .email("api@sdoc.app"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://sdoc.app/terms")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT token emitido por Keycloak")));
    }
}
