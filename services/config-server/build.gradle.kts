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
    implementation(libs.spring.cloud.config.server)
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation(libs.spring.cloud.starter.eureka.client)
    implementation(libs.spring.cloud.starter.vault.config)
    implementation(libs.micrometer.prometheus)
    implementation(libs.logstash.logback)

    compileOnly(libs.lombok)
    annotationProcessor(libs.lombok)
}
