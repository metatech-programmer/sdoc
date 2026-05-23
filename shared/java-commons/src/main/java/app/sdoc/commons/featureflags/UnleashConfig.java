package app.sdoc.commons.featureflags;

import io.getunleash.DefaultUnleash;
import io.getunleash.Unleash;
import io.getunleash.util.UnleashConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configura el cliente Unleash para feature flags.
 * Se activa cuando sdoc.unleash.enabled=true (por defecto en producción).
 * En desarrollo local puede desactivarse con sdoc.unleash.enabled=false.
 */
@Configuration
@ConditionalOnProperty(name = "sdoc.unleash.enabled", havingValue = "true", matchIfMissing = false)
public class UnleashConfiguration {

    @Value("${sdoc.unleash.url:http://unleash:4242/api}")
    private String unleashUrl;

    @Value("${sdoc.unleash.client-key:*:development.unleash-insecure-api-token}")
    private String clientKey;

    @Value("${spring.application.name:sdoc-service}")
    private String appName;

    @Bean
    public Unleash unleash() {
        UnleashConfig config = UnleashConfig.newBuilder()
            .appName(appName)
            .instanceId(appName + "-" + System.getenv().getOrDefault("HOSTNAME", "local"))
            .unleashAPI(unleashUrl)
            .apiKey(clientKey)
            .synchronousFetchOnInitialisation(false)
            .build();
        return new DefaultUnleash(config);
    }
}
