"""
Wrapper de MinIO para el render-service.
Sube PDFs/DOCXs al bucket sdoc-exports y genera URLs presignadas.
"""
import logging
from datetime import timedelta
from io import BytesIO

from minio import Minio
from minio.error import S3Error

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def _ensure_bucket(client: Minio, bucket: str) -> None:
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def upload_export(
    object_name: str,
    data: bytes,
    content_type: str,
) -> str:
    """
    Sube los bytes del export a MinIO y retorna la URL presignada válida 24h.
    object_name: p.ej. 'exports/{exportId}/documento.pdf'
    """
    client = _get_client()
    _ensure_bucket(client, settings.minio_bucket_exports)

    client.put_object(
        settings.minio_bucket_exports,
        object_name,
        BytesIO(data),
        length=len(data),
        content_type=content_type,
    )

    url = client.presigned_get_object(
        settings.minio_bucket_exports,
        object_name,
        expires=timedelta(hours=24),
    )
    logger.info("Export subido: %s", object_name)
    return url


def download_document_content(document_id: str) -> bytes | None:
    """
    Descarga el JSON del documento desde sdoc-documents/{documentId}/content.json
    si existe. Retorna None si no se encuentra.
    """
    client = _get_client()
    object_name = f"{document_id}/content.json"
    try:
        response = client.get_object(settings.minio_bucket_documents, object_name)
        return response.read()
    except S3Error as exc:
        if exc.code == "NoSuchKey":
            return None
        raise
    finally:
        try:
            response.close()  # type: ignore[union-attr]
            response.release_conn()  # type: ignore[union-attr]
        except Exception:
            pass
