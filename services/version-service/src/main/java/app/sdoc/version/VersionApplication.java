package app.sdoc.version;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication(scanBasePackages = {"app.sdoc.version", "app.sdoc.commons"})
@EnableDiscoveryClient
public class VersionApplication {

    public static void main(String[] args) {
        SpringApplication.run(VersionApplication.class, args);
    }
}
