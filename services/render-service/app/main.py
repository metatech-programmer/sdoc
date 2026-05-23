import asyncio
import logging
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.config import get_settings
from app.eureka_client import register_with_eureka, heartbeat_loop, deregister_from_eureka
from app.routers import export, preview, imports

settings = get_settings()

# Logging estructurado JSON
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logging.basicConfig(level=logging.INFO)


def setup_telemetry(app: FastAPI) -> None:
    provider = TracerProvider()
    exporter = OTLPSpanExporter(endpoint=settings.otlp_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await register_with_eureka()
    heartbeat_task = asyncio.create_task(heartbeat_loop())
    yield
    # Shutdown
    heartbeat_task.cancel()
    await deregister_from_eureka()


app = FastAPI(
    title="Render Service",
    description="Servicio de exportación y previsualización de documentos SDOC",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
)

setup_telemetry(app)
Instrumentator().instrument(app).expose(app, endpoint="/actuator/prometheus")

app.include_router(export.router, prefix="/api/v1/render", tags=["export"])
app.include_router(preview.router, prefix="/api/v1/render", tags=["preview"])
app.include_router(imports.router, prefix="/api/v1/render/imports", tags=["imports"])


@app.get("/health")
async def health() -> dict:
    return {"status": "UP", "service": settings.service_name}


@app.get("/info")
async def info() -> dict:
    return {"service": settings.service_name, "version": "1.0.0"}
