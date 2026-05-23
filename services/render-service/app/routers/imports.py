"""
Router de importación de documentos externos al formato .sdoc.
POST /imports/docx     → importa DOCX a contenido ProseMirror JSON
POST /imports/html     → importa HTML a contenido ProseMirror JSON
POST /imports/markdown → importa Markdown a contenido ProseMirror JSON
"""
import io
import logging
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Header

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Tamaño máximo de archivo: 50 MB ──────────────────────────────────────────
MAX_UPLOAD_BYTES = 50 * 1024 * 1024


# ─── Helpers de conversión a ProseMirror ──────────────────────────────────────

def _text_node(text: str) -> dict[str, Any]:
    return {"type": "text", "text": text}


def _paragraph(children: list[dict]) -> dict[str, Any]:
    return {"type": "paragraph", "content": children}


def _heading(level: int, children: list[dict]) -> dict[str, Any]:
    return {"type": "heading", "attrs": {"level": level}, "content": children}


def _bullet_list(items: list[list[dict]]) -> dict[str, Any]:
    return {
        "type": "bulletList",
        "content": [{"type": "listItem", "content": [_paragraph(c)]} for c in items],
    }


def _ordered_list(items: list[list[dict]], start: int = 1) -> dict[str, Any]:
    return {
        "type": "orderedList",
        "attrs": {"start": start},
        "content": [{"type": "listItem", "content": [_paragraph(c)]} for c in items],
    }


def _doc(content: list[dict]) -> dict[str, Any]:
    return {"type": "doc", "content": content or [_paragraph([_text_node("")])]}


# ─── Importar DOCX ────────────────────────────────────────────────────────────

def _import_docx(data: bytes) -> tuple[str, dict[str, Any]]:
    """Convierte DOCX a documento ProseMirror. Requiere python-docx."""
    try:
        from docx import Document  # type: ignore
        from docx.oxml.ns import qn  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="python-docx no está instalado en el servidor.",
        )

    try:
        doc = Document(io.BytesIO(data))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"DOCX inválido o corrupto: {exc}")

    # Extraer título del primer párrafo de estilo Heading 1 o del core_properties
    title: str = doc.core_properties.title or "Documento importado"

    nodes: list[dict[str, Any]] = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style_name = para.style.name if para.style else ""

        if style_name.startswith("Heading"):
            try:
                level = int(style_name.split()[-1])
            except (ValueError, IndexError):
                level = 1
            level = max(1, min(level, 6))
            nodes.append(_heading(level, [_text_node(text)]))
            if not title or title == "Documento importado":
                title = text
        else:
            # Preservar formato de texto (bold, italic) por runs
            children: list[dict[str, Any]] = []
            for run in para.runs:
                if not run.text:
                    continue
                node: dict[str, Any] = {"type": "text", "text": run.text}
                marks: list[dict] = []
                if run.bold:
                    marks.append({"type": "bold"})
                if run.italic:
                    marks.append({"type": "italic"})
                if run.underline:
                    marks.append({"type": "underline"})
                if marks:
                    node["marks"] = marks
                children.append(node)

            if children:
                nodes.append(_paragraph(children))

    return title, _doc(nodes)


# ─── Importar HTML ────────────────────────────────────────────────────────────

def _import_html(data: bytes, encoding: str = "utf-8") -> tuple[str, dict[str, Any]]:
    """Convierte HTML a documento ProseMirror. Requiere beautifulsoup4 + lxml."""
    try:
        from bs4 import BeautifulSoup, NavigableString, Tag  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="beautifulsoup4 no está instalado en el servidor.",
        )

    try:
        html_text = data.decode(encoding, errors="replace")
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"HTML inválido: {exc}")

    # Título desde <title> o primer <h1>
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else "Documento importado"

    body = soup.find("body") or soup

    def parse_inline(element: Any) -> list[dict[str, Any]]:
        nodes_out: list[dict[str, Any]] = []
        for child in element.children:
            if isinstance(child, NavigableString):
                text = str(child)
                if text.strip():
                    nodes_out.append(_text_node(text))
            elif isinstance(child, Tag):
                inner = parse_inline(child)
                tag = child.name.lower() if child.name else ""
                if tag in ("strong", "b"):
                    for n in inner:
                        if n.get("type") == "text":
                            n.setdefault("marks", []).append({"type": "bold"})
                    nodes_out.extend(inner)
                elif tag in ("em", "i"):
                    for n in inner:
                        if n.get("type") == "text":
                            n.setdefault("marks", []).append({"type": "italic"})
                    nodes_out.extend(inner)
                elif tag == "u":
                    for n in inner:
                        if n.get("type") == "text":
                            n.setdefault("marks", []).append({"type": "underline"})
                    nodes_out.extend(inner)
                elif tag == "a":
                    href = child.get("href", "#")
                    for n in inner:
                        if n.get("type") == "text":
                            n.setdefault("marks", []).append(
                                {"type": "link", "attrs": {"href": href, "target": "_blank"}}
                            )
                    nodes_out.extend(inner)
                elif tag in ("code",):
                    nodes_out.extend(inner)
                else:
                    nodes_out.extend(inner)
        return nodes_out

    doc_nodes: list[dict[str, Any]] = []

    def parse_block(element: Any) -> None:
        if isinstance(element, NavigableString):
            return
        if not isinstance(element, Tag):
            return

        tag = element.name.lower() if element.name else ""

        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = int(tag[1])
            text = element.get_text(strip=True)
            doc_nodes.append(_heading(level, [_text_node(text)]))
            if level == 1 and title == "Documento importado":
                title_var = text  # noqa: F841

        elif tag == "p":
            inline = parse_inline(element)
            if inline:
                doc_nodes.append(_paragraph(inline))

        elif tag == "ul":
            items = []
            for li in element.find_all("li", recursive=False):
                items.append(parse_inline(li))
            if items:
                doc_nodes.append(_bullet_list(items))

        elif tag == "ol":
            items = []
            start = int(element.get("start", 1))
            for li in element.find_all("li", recursive=False):
                items.append(parse_inline(li))
            if items:
                doc_nodes.append(_ordered_list(items, start))

        elif tag == "blockquote":
            text = element.get_text(strip=True)
            if text:
                doc_nodes.append(
                    {"type": "blockquote", "content": [_paragraph([_text_node(text)])]}
                )

        elif tag in ("pre", "code"):
            code_text = element.get_text()
            doc_nodes.append(
                {
                    "type": "codeBlock",
                    "attrs": {"language": ""},
                    "content": [_text_node(code_text)],
                }
            )

        elif tag == "hr":
            doc_nodes.append({"type": "horizontalRule"})

        else:
            for child in element.children:
                parse_block(child)

    for child in body.children:
        parse_block(child)

    return title, _doc(doc_nodes)


# ─── Importar Markdown ────────────────────────────────────────────────────────

def _import_markdown(data: bytes, encoding: str = "utf-8") -> tuple[str, dict[str, Any]]:
    """Convierte Markdown a documento ProseMirror vía conversión Markdown→HTML→ProseMirror."""
    try:
        import markdown2  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="markdown2 no está instalado en el servidor.",
        )

    try:
        md_text = data.decode(encoding, errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"No se pudo decodificar el archivo: {exc}")

    # Extraer título del primer encabezado # del markdown
    title = "Documento importado"
    for line in md_text.splitlines():
        line = line.strip()
        if line.startswith("# "):
            title = line[2:].strip()
            break

    html_content = markdown2.markdown(
        md_text,
        extras=["fenced-code-blocks", "tables", "strike", "task_list"],
    )

    # Reusar el importador HTML con el contenido convertido
    _, prosemirror_doc = _import_html(
        f"<body>{html_content}</body>".encode("utf-8"),
    )
    return title, prosemirror_doc


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/docx", status_code=200)
async def import_docx(
    file: UploadFile = File(..., description="Archivo DOCX a importar"),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict:
    """
    Importa un archivo DOCX y devuelve el contenido en formato ProseMirror JSON.
    El cliente es responsable de crear el documento en document-service.
    """
    if file.content_type not in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no soportado: {file.content_type}. Se esperaba DOCX.",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 50 MB.")

    title, content = _import_docx(data)
    document_id = str(uuid.uuid4())

    logger.info(
        "DOCX importado por usuario %s — título: %r, documento_id: %s",
        x_user_id, title, document_id,
    )

    return {
        "documentId": document_id,
        "title": title,
        "status": "imported",
        "format": "DOCX",
        "content": content,
    }


@router.post("/html", status_code=200)
async def import_html(
    file: UploadFile = File(..., description="Archivo HTML a importar"),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict:
    """
    Importa un archivo HTML y devuelve el contenido en formato ProseMirror JSON.
    """
    if file.content_type not in ("text/html", "application/xhtml+xml", "application/octet-stream"):
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no soportado: {file.content_type}. Se esperaba HTML.",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 50 MB.")

    title, content = _import_html(data)
    document_id = str(uuid.uuid4())

    logger.info(
        "HTML importado por usuario %s — título: %r, documento_id: %s",
        x_user_id, title, document_id,
    )

    return {
        "documentId": document_id,
        "title": title,
        "status": "imported",
        "format": "HTML",
        "content": content,
    }


@router.post("/markdown", status_code=200)
async def import_markdown(
    file: UploadFile = File(..., description="Archivo Markdown (.md) a importar"),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict:
    """
    Importa un archivo Markdown y devuelve el contenido en formato ProseMirror JSON.
    """
    filename = file.filename or ""
    is_markdown = (
        file.content_type in ("text/markdown", "text/x-markdown", "text/plain", "application/octet-stream")
        or filename.lower().endswith((".md", ".markdown"))
    )
    if not is_markdown:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no soportado: {file.content_type}. Se esperaba Markdown.",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 50 MB.")

    title, content = _import_markdown(data)
    document_id = str(uuid.uuid4())

    logger.info(
        "Markdown importado por usuario %s — título: %r, documento_id: %s",
        x_user_id, title, document_id,
    )

    return {
        "documentId": document_id,
        "title": title,
        "status": "imported",
        "format": "MARKDOWN",
        "content": content,
    }
