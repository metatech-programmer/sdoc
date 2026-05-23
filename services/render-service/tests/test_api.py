"""
Tests de integración para los endpoints FastAPI del render-service.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

SIMPLE_CONTENT = {
    "type": "doc",
    "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "Hola mundo"}]}
    ]
}


@pytest.fixture
def client():
    # Evitar el registro en Eureka durante tests
    with patch("app.eureka_client.register_with_eureka"):
        with patch("app.eureka_client.heartbeat_loop"):
            from app.main import app
            return TestClient(app, raise_server_exceptions=True)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "UP"


def test_preview_html(client):
    response = client.post("/api/v1/render/preview", json={
        "documentTitle": "Test",
        "contentJson": SIMPLE_CONTENT,
        "language": "es"
    })
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Hola mundo" in response.text


def test_export_request_returns_202(client):
    with patch("app.tasks.export_task.export_document.apply_async") as mock_task:
        mock_result = MagicMock()
        mock_result.id = "test-task-id"
        mock_task.return_value = mock_result

        response = client.post("/api/v1/render/export", json={
            "documentId": "doc-123",
            "documentTitle": "Test PDF",
            "contentJson": SIMPLE_CONTENT,
            "format": "PDF"
        })

    assert response.status_code == 202
    data = response.json()
    assert "exportId" in data
    assert data["taskId"] == "test-task-id"
    assert data["status"] == "QUEUED"
