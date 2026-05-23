rootProject.name = "sdoc-platform"

// Activar Version Catalogs
enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

// Gestión de plugins centralizada
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
    versionCatalogs {
        create("libs") {
            from(files("gradle/libs.versions.toml"))
        }
    }
}

// Infraestructura Spring Cloud
include(":services:config-server")
include(":services:eureka-server")
include(":services:api-gateway")

// Microservicios de negocio
include(":services:auth-service")
include(":services:document-service")
include(":services:asset-service")
include(":services:version-service")
include(":services:sync-service")
include(":services:notification-service")

// Librería compartida Java
include(":shared:java-commons")
