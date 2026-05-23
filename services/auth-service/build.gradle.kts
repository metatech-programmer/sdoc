plugins {
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dependency.management)
    id("java")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:${libs.versions.springCloud.get()}")
        mavenBom("org.testcontainers:testcontainers-bom:${libs.versions.testcontainers.get()}")
    }
}

dependencies {
    implementation(project(":shared:java-commons"))

    implementation(libs.bundles.spring.boot.common)
    implementation(libs.bundles.spring.cloud.service)
    implementation(libs.bundles.database)
    implementation(libs.bundles.observability)
    implementation(libs.spring.boot.starter.oauth2.resource.server)
    implementation(libs.spring.kafka)
    implementation(libs.kafka.avro.serializer)
    implementation(libs.kafka.schema.registry.client)
    implementation(libs.springdoc.openapi.starter)

    compileOnly(libs.lombok)
    annotationProcessor(libs.lombok)
    annotationProcessor(libs.mapstruct.processor)
    implementation(libs.mapstruct)

    testImplementation(libs.bundles.testing.base)
    testImplementation(libs.testcontainers.kafka)
    testImplementation(libs.spring.kafka.test)
}
