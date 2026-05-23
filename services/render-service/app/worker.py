from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "render-service",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.export_task"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.export_task.export_document": {"queue": "exports"},
        "app.tasks.export_task.generate_preview": {"queue": "previews"},
    },
    task_time_limit=300,
    task_soft_time_limit=270,
)
