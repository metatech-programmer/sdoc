plugins {
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dependency.management)
    id("java")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:${libs.versions.springCloud.get()}")
    }
}

dependencies {
    // Gateway es WebFlux PURO — sin spring-boot-starter-web
    implementation(libs.spring.cloud.starter.gateway)
    implementation(libs.spring.boot.starter.data.redis.reactive)
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation(libs.spring.cloud.starter.eureka.client)
    implementation(libs.spring.cloud.starter.config)
    implementation(libs.spring.cloud.starter.circuitbreaker.reactor.resilience4j)
    implementation(libs.micrometer.prometheus)
    implementation(libs.logstash.logback)

    compileOnly(libs.lombok)
    annotationProcessor(libs.lombok)
}
