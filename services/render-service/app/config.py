from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Servicio
    service_name: str = "render-service"
    service_port: int = 8086
    environment: str = "development"

    # Redis / Celery
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "sdoc-minio"
    minio_secret_key: str = "sdoc-minio-secret"
    minio_secure: bool = False
    minio_bucket_exports: str = "sdoc-exports"
    minio_bucket_documents: str = "sdoc-documents"

    # Kafka
    kafka_bootstrap_servers: str = "kafka:9092"
    kafka_group_id: str = "render-service"

    # Eureka
    eureka_server_url: str = "http://eureka:8761/eureka"
    eureka_instance_hostname: str = "render-service"

    # Observabilidad
    otlp_endpoint: str = "http://jaeger:4317"

    # API Gateway (para callbacks)
    api_gateway_url: str = "http://api-gateway:8080"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
