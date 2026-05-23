"""
Tareas Celery para exportación de documentos.
La saga: document-service → Kafka sdoc.exports.requested → render-service
         render-service → Kafka sdoc.exports.completed|failed
"""
import json
import logging
import uuid
from datetime import datetime, timezone

from celery import Task
from confluent_kafka import Producer

from app.worker import celery_app
from app.config import get_settings
from app.converters import sdoc_to_html, html_to_pdf, sdoc_to_docx
from app.storage.minio_storage import upload_export

logger = logging.getLogger(__name__)
settings = get_settings()


def _kafka_producer() -> Producer:
    return Producer({"bootstrap.servers": settings.kafka_bootstrap_servers})


def _publish_event(topic: str, payload: dict) -> None:
    producer = _kafka_producer()
    producer.produce(topic, value=json.dumps(payload).encode())
    producer.flush(timeout=5)


class ExportTask(Task):
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        export_id = kwargs.get("export_id") or (args[0] if args else "unknown")
        logger.error("Export %s falló: %s", export_id, exc)
        _publish_event(
            "sdoc.exports.failed",
            {
                "exportId": export_id,
                "error": str(exc),
                "occurredAt": datetime.now(timezone.utc).isoformat(),
            },
        )


@celery_app.task(
    base=ExportTask,
    bind=True,
    name="app.tasks.export_task.export_document",
    max_retries=3,
    default_retry_delay=30,
    queue="exports",
)
def export_document(
    self: Task,
    export_id: str,
    document_id: str,
    document_title: str,
    content_json: dict,
    format: str,
    language: str = "es",
    owner_id: str = "",
    owner_email: str = "",
) -> dict:
    """
    Exporta un documento al formato solicitado (PDF o DOCX).
    Publica sdoc.exports.completed cuando termina.
    """
    logger.info("Iniciando export %s (formato: %s)", export_id, format)

    try:
        fmt = format.upper()

        if fmt == "PDF":
            html = sdoc_to_html.convert(content_json, title=document_title, lang=language)
            file_bytes = html_to_pdf.convert(html)
            content_type = "application/pdf"
            extension = "pdf"

        elif fmt == "DOCX":
            file_bytes = sdoc_to_docx.convert(content_json, title=document_title)
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            extension = "docx"

        elif fmt == "HTML":
            html = sdoc_to_html.convert(content_json, title=document_title, lang=language)
            file_bytes = html.encode("utf-8")
            content_type = "text/html"
            extension = "html"

        else:
            raise ValueError(f"Formato no soportado: {format}")

        safe_title = "".join(c if c.isalnum() or c in "-_ " else "_" for c in document_title)
        object_name = f"exports/{export_id}/{safe_title}.{extension}"
        download_url = upload_export(object_name, file_bytes, content_type)

        _publish_event(
            "sdoc.exports.completed",
            {
                "exportId": export_id,
                "documentId": document_id,
                "format": fmt,
                "downloadUrl": download_url,
                "fileSizeBytes": len(file_bytes),
                "ownerId": owner_id,
                "ownerEmail": owner_email,
                "occurredAt": datetime.now(timezone.utc).isoformat(),
            },
        )

        logger.info("Export %s completado: %s bytes", export_id, len(file_bytes))
        return {"exportId": export_id, "downloadUrl": download_url}

    except Exception as exc:
        logger.error("Error en export %s: %s", export_id, exc, exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="app.tasks.export_task.generate_preview",
    max_retries=2,
    default_retry_delay=10,
    queue="previews",
)
def generate_preview(
    self: Task,
    document_id: str,
    content_json: dict,
    document_title: str = "Preview",
    language: str = "es",
) -> str:
    """Genera HTML de previsualización (sin subir a MinIO)."""
    try:
        return sdoc_to_html.convert(content_json, title=document_title, lang=language)
    except Exception as exc:
        raise self.retry(exc=exc)
