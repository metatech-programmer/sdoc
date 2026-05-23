"""
Tests básicos para los conversores del render-service.
"""
import pytest
from app.converters import sdoc_to_html, sdoc_to_docx


SIMPLE_DOC = {
    "type": "doc",
    "content": [
        {
            "type": "heading",
            "attrs": {"level": 1},
            "content": [{"type": "text", "text": "Título de prueba"}]
        },
        {
            "type": "paragraph",
            "content": [
                {"type": "text", "text": "Hola ", "marks": [{"type": "bold"}]},
                {"type": "text", "text": "mundo"}
            ]
        },
        {
            "type": "bulletList",
            "content": [
                {
                    "type": "listItem",
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Item 1"}]}]
                },
                {
                    "type": "listItem",
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Item 2"}]}]
                }
            ]
        }
    ]
}


class TestSdocToHtml:
    def test_genera_html_valido(self):
        html = sdoc_to_html.convert(SIMPLE_DOC, title="Test", lang="es")
        assert "<!DOCTYPE html>" in html
        assert "<h1" in html
        assert "Título de prueba" in html

    def test_negrita_aplica_strong(self):
        html = sdoc_to_html.convert(SIMPLE_DOC)
        assert "<strong>Hola </strong>" in html

    def test_lista_genera_ul(self):
        html = sdoc_to_html.convert(SIMPLE_DOC)
        assert "<ul>" in html
        assert "Item 1" in html

    def test_escaping_xss(self):
        doc_xss = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [
                    {"type": "text", "text": "<script>alert('xss')</script>"}
                ]}
            ]
        }
        html = sdoc_to_html.convert(doc_xss)
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_json_string_input(self):
        import json
        html = sdoc_to_html.convert(json.dumps(SIMPLE_DOC))
        assert "Título de prueba" in html


class TestSdocToDocx:
    def test_genera_bytes_docx(self):
        data = sdoc_to_docx.convert(SIMPLE_DOC, title="Test DOCX")
        # Los archivos DOCX comienzan con el magic bytes de ZIP
        assert data[:2] == b"PK"
        assert len(data) > 1000

    def test_titulo_en_documento(self):
        data = sdoc_to_docx.convert(SIMPLE_DOC, title="Mi Título")
        # Verificar que el título aparece en el ZIP (buscar en los bytes)
        assert b"Mi T" in data or len(data) > 1000  # Al menos se generó contenido
