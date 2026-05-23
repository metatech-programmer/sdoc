"""
Convierte HTML a PDF usando WeasyPrint.
WeasyPrint soporta CSS Paged Media, por lo que el template HTML
puede controlar márgenes, encabezados y pies de página.
"""
import logging
from io import BytesIO

from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

logger = logging.getLogger(__name__)

# CSS adicional para control de página en PDF
PAGE_CSS = CSS(string="""
    @page {
        size: A4;
        margin: 20mm 15mm 20mm 20mm;
        @bottom-right {
            content: counter(page) " / " counter(pages);
            font-size: 9pt;
            color: #888;
        }
    }
    @media print {
        pre { page-break-inside: avoid; }
        h1, h2, h3 { page-break-after: avoid; }
        table { page-break-inside: avoid; }
    }
""")


def convert(html_content: str, base_url: str | None = None) -> bytes:
    """
    Convierte HTML a PDF y retorna los bytes del PDF.
    base_url se usa para resolver imágenes relativas (p.ej. URLs de MinIO).
    """
    font_config = FontConfiguration()
    try:
        document = HTML(
            string=html_content,
            base_url=base_url,
        ).render(
            stylesheets=[PAGE_CSS],
            font_config=font_config,
        )
        buffer = BytesIO()
        document.write_pdf(buffer)
        return buffer.getvalue()
    except Exception as exc:
        logger.error("Error convirtiendo HTML a PDF: %s", exc, exc_info=True)
        raise
