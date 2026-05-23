"""
Consumidor Kafka para el render-service.
Escucha sdoc.exports.requested y despacha tareas Celery de exportación.
Se ejecuta como hilo de fondo cuando arranca el worker Celery.
Implementa DLQ manual con 3 reintentos antes de publicar al topic .dlq.
"""
import json
import logging
import threading
import uuid
from datetime import datetime, timezone

from confluent_kafka import Consumer, KafkaError, Producer

from app.config import get_settings
from app.tasks.export_task import export_document

logger = logging.getLogger(__name__)
settings = get_settings()

TOPIC = "sdoc.exports.requested"
DLQ_TOPIC = "sdoc.exports.requested.dlq"
MAX_RETRIES = 3


def _build_consumer() -> Consumer:
    return Consumer(
        {
            "bootstrap.servers": settings.kafka_bootstrap_servers,
            "group.id": settings.kafka_group_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )


def _build_producer() -> Producer:
    return Producer({"bootstrap.servers": settings.kafka_bootstrap_servers})


def _publish_to_dlq(producer: Producer, original_value: bytes, error: str) -> None:
    dlq_payload = {
        "originalTopic": TOPIC,
        "originalValue": original_value.decode("utf-8", errors="replace"),
        "error": error,
        "failedAt": datetime.now(timezone.utc).isoformat(),
    }
    producer.produce(DLQ_TOPIC, value=json.dumps(dlq_payload).encode())
    producer.flush(timeout=5)
    logger.error("Mensaje enviado al DLQ %s: %s", DLQ_TOPIC, error)


def _process_message(event: dict, retry: int = 0) -> None:
    """Intenta procesar el mensaje. Lanza excepción si falla."""
    export_document.apply_async(
        kwargs={
            "export_id": event.get("exportId", str(uuid.uuid4())),
            "document_id": event["documentId"],
            "document_title": event.get("documentTitle", "Documento"),
            "content_json": event["contentJson"],
            "format": event.get("format", "PDF"),
            "language": event.get("language", "es"),
            "owner_id": event.get("ownerId", ""),
            "owner_email": event.get("ownerEmail", ""),
        },
        queue="exports",
    )


def consume_loop() -> None:
    consumer = _build_consumer()
    producer = _build_producer()
    consumer.subscribe([TOPIC])
    logger.info("Kafka consumer escuchando %s", TOPIC)

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    logger.error("Kafka error: %s", msg.error())
                continue

            raw_value = msg.value()
            last_exc: Exception | None = None

            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    event = json.loads(raw_value.decode("utf-8"))
                    _process_message(event)
                    consumer.commit(msg)
                    logger.info(
                        "Export encolado para documento %s (intento %d)",
                        event.get("documentId"), attempt,
                    )
                    last_exc = None
                    break
                except Exception as exc:
                    last_exc = exc
                    logger.warning(
                        "Intento %d/%d fallido para mensaje: %s", attempt, MAX_RETRIES, exc
                    )

            if last_exc is not None:
                # Todos los reintentos agotados — publicar al DLQ y hacer commit
                _publish_to_dlq(producer, raw_value, str(last_exc))
                consumer.commit(msg)

    finally:
        consumer.close()
        producer.flush()


def start_consumer_thread() -> threading.Thread:
    """Inicia el loop de consumo en un hilo daemon."""
    thread = threading.Thread(
        target=consume_loop, daemon=True, name="kafka-export-consumer"
    )
    thread.start()
    return thread
