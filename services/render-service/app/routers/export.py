"""
Router de exportación de documentos.
POST /api/v1/render/export → encola tarea Celery y retorna exportId.
GET  /api/v1/render/export/{exportId}/status → estado de la tarea.
"""
import uuid
import logging
from typing import Literal

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.tasks.export_task import export_document

logger = logging.getLogger(__name__)
router = APIRouter()


class ExportRequest(BaseModel):
    documentId: str
    documentTitle: str = "Documento"
    contentJson: dict
    format: Literal["PDF", "DOCX", "HTML"] = "PDF"
    language: str = "es"
    ownerEmail: str = ""


class ExportResponse(BaseModel):
    exportId: str
    taskId: str
    status: str


@router.post("/export", response_model=ExportResponse, status_code=202)
async def request_export(
    body: ExportRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> ExportResponse:
    """
    Inicia una exportación asíncrona. Retorna el exportId para seguimiento.
    El resultado final llega vía Kafka sdoc.exports.completed.
    """
    export_id = str(uuid.uuid4())

    task = export_document.apply_async(
        kwargs={
            "export_id": export_id,
            "document_id": body.documentId,
            "document_title": body.documentTitle,
            "content_json": body.contentJson,
            "format": body.format,
            "language": body.language,
            "owner_id": x_user_id or "",
            "owner_email": body.ownerEmail,
        },
        queue="exports",
    )

    logger.info(
        "Export %s encolado (tarea: %s, formato: %s)",
        export_id, task.id, body.format,
    )
    return ExportResponse(exportId=export_id, taskId=task.id, status="QUEUED")


@router.get("/export/{task_id}/status")
async def get_export_status(task_id: str) -> dict:
    """Consulta el estado de una tarea Celery por su taskId."""
    result = AsyncResult(task_id)
    response: dict = {"taskId": task_id, "state": result.state}

    if result.state == "SUCCESS":
        response["result"] = result.result
    elif result.state == "FAILURE":
        response["error"] = str(result.info)
    elif result.state == "PROGRESS":
        response["progress"] = result.info

    return response
