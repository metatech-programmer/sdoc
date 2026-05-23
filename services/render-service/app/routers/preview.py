"""
Router de previsualización en tiempo real.
POST /api/v1/render/preview → HTML síncrono (sin Celery, respuesta inmediata).
"""
import logging

from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.converters import sdoc_to_html

logger = logging.getLogger(__name__)
router = APIRouter()


class PreviewRequest(BaseModel):
    documentTitle: str = "Preview"
    contentJson: dict
    language: str = "es"


@router.post("/preview")
async def generate_preview(body: PreviewRequest) -> Response:
    """
    Genera una previsualización HTML del documento de forma síncrona.
    Destinado al editor web para mostrar cómo quedará el documento exportado.
    """
    html = sdoc_to_html.convert(
        body.contentJson,
        title=body.documentTitle,
        lang=body.language,
    )
    return Response(content=html, media_type="text/html; charset=utf-8")
