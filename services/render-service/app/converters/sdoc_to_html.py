"""
Convierte el contenido JSON de un documento .sdoc a HTML limpio.
El campo `content` es un documento Tiptap/ProseMirror serializado como JSON.
"""
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


def node_to_html(node: dict[str, Any]) -> str:
    """Convierte un nodo ProseMirror a HTML recursivamente."""
    node_type = node.get("type", "")
    content = node.get("content", [])
    attrs = node.get("attrs", {})
    marks = node.get("marks", [])

    text = node.get("text", "")
    if node_type == "text":
        html = _escape(text)
        for mark in marks:
            html = _apply_mark(html, mark)
        return html

    inner = "".join(node_to_html(child) for child in content)

    match node_type:
        case "doc":
            return inner
        case "paragraph":
            align = attrs.get("textAlign", "left")
            return f'<p style="text-align:{align}">{inner}</p>\n'
        case "heading":
            level = attrs.get("level", 1)
            align = attrs.get("textAlign", "left")
            return f'<h{level} style="text-align:{align}">{inner}</h{level}>\n'
        case "bulletList":
            return f"<ul>\n{inner}</ul>\n"
        case "orderedList":
            start = attrs.get("start", 1)
            return f'<ol start="{start}">\n{inner}</ol>\n'
        case "listItem":
            return f"<li>{inner}</li>\n"
        case "blockquote":
            return f"<blockquote>{inner}</blockquote>\n"
        case "codeBlock":
            lang = attrs.get("language", "")
            return f'<pre><code class="language-{lang}">{_escape(node.get("text", inner))}</code></pre>\n'
        case "horizontalRule":
            return "<hr/>\n"
        case "hardBreak":
            return "<br/>"
        case "image":
            src = _escape(attrs.get("src", ""))
            alt = _escape(attrs.get("alt", ""))
            title = _escape(attrs.get("title", ""))
            return f'<img src="{src}" alt="{alt}" title="{title}"/>'
        case "table":
            return f"<table>\n{inner}</table>\n"
        case "tableRow":
            return f"<tr>\n{inner}</tr>\n"
        case "tableHeader":
            colspan = attrs.get("colspan", 1)
            rowspan = attrs.get("rowspan", 1)
            return f'<th colspan="{colspan}" rowspan="{rowspan}">{inner}</th>\n'
        case "tableCell":
            colspan = attrs.get("colspan", 1)
            rowspan = attrs.get("rowspan", 1)
            return f'<td colspan="{colspan}" rowspan="{rowspan}">{inner}</td>\n'
        case _:
            logger.debug("Nodo desconocido: %s", node_type)
            return inner


def _apply_mark(html: str, mark: dict[str, Any]) -> str:
    mark_type = mark.get("type", "")
    attrs = mark.get("attrs", {})
    match mark_type:
        case "bold":
            return f"<strong>{html}</strong>"
        case "italic":
            return f"<em>{html}</em>"
        case "underline":
            return f"<u>{html}</u>"
        case "strike":
            return f"<s>{html}</s>"
        case "code":
            return f"<code>{html}</code>"
        case "link":
            href = _escape(attrs.get("href", "#"))
            target = attrs.get("target", "_blank")
            return f'<a href="{href}" target="{target}">{html}</a>'
        case "textStyle":
            color = attrs.get("color", "")
            size = attrs.get("fontSize", "")
            styles = ""
            if color:
                styles += f"color:{color};"
            if size:
                styles += f"font-size:{size};"
            return f'<span style="{styles}">{html}</span>' if styles else html
        case "highlight":
            color = attrs.get("color", "yellow")
            return f'<mark style="background-color:{color}">{html}</mark>'
        case _:
            return html


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
    )


DOCUMENT_TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
  <style>
    body {{
      font-family: 'Liberation Serif', Georgia, serif;
      font-size: 12pt;
      line-height: 1.6;
      max-width: 210mm;
      margin: 20mm auto;
      color: #1a1a1a;
    }}
    h1, h2, h3, h4, h5, h6 {{
      font-family: 'Liberation Sans', Arial, sans-serif;
      margin-top: 1.5em;
    }}
    pre, code {{
      font-family: 'Liberation Mono', monospace;
      background: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
    }}
    pre code {{
      padding: 0;
      background: transparent;
    }}
    pre {{
      padding: 1em;
      overflow-x: auto;
    }}
    blockquote {{
      border-left: 4px solid #ccc;
      margin-left: 0;
      padding-left: 1em;
      color: #555;
    }}
    table {{
      border-collapse: collapse;
      width: 100%;
    }}
    th, td {{
      border: 1px solid #ccc;
      padding: 0.5em;
    }}
    img {{
      max-width: 100%;
    }}
  </style>
</head>
<body>
{body}
</body>
</html>"""


def convert(content_json: Any, title: str = "Documento", lang: str = "es") -> str:
    """Punto de entrada: recibe el objeto JSON del content y devuelve HTML completo."""
    if isinstance(content_json, str):
        content_json = json.loads(content_json)

    body = node_to_html(content_json)
    return DOCUMENT_TEMPLATE.format(title=_escape(title), lang=lang, body=body)
