#!/bin/bash
# ============================================================
# SDOC Platform — Creación de Topics Kafka
# Se ejecuta una vez al inicio (kafka-init container)
# ============================================================

KAFKA_BROKER="kafka:9092"
REPLICATION_FACTOR=1  # En producción: 3

echo "Esperando a que Kafka esté disponible..."
sleep 10

create_topic() {
    local TOPIC=$1
    local PARTITIONS=$2
    local RETENTION_MS=${3:-604800000}  # 7 días por defecto

    kafka-topics --create \
        --bootstrap-server "$KAFKA_BROKER" \
        --topic "$TOPIC" \
        --partitions "$PARTITIONS" \
        --replication-factor "$REPLICATION_FACTOR" \
        --config retention.ms="$RETENTION_MS" \
        --config cleanup.policy=delete \
        --if-not-exists

    echo "Topic creado: $TOPIC (particiones: $PARTITIONS)"
}

# ============================================================
# TOPICS DE NEGOCIO
# ============================================================

# Usuarios
create_topic "sdoc.users.registered"  3
create_topic "sdoc.users.deleted"     3

# Documentos
create_topic "sdoc.documents.created" 6
create_topic "sdoc.documents.updated" 6
create_topic "sdoc.documents.deleted" 3

# Assets
create_topic "sdoc.assets.uploaded"   3

# Exportaciones (Saga pattern)
create_topic "sdoc.exports.requested" 3 86400000  # 24h TTL
create_topic "sdoc.exports.completed" 3 86400000
create_topic "sdoc.exports.failed"    3 86400000

# Notificaciones
create_topic "sdoc.notifications.send" 3

# Sincronización (mayor throughput)
create_topic "sdoc.sync.operations"   12 3600000  # 1h TTL

# Versiones
create_topic "sdoc.versions.created"  3

# Facturación
create_topic "sdoc.billing.events"    3

# ============================================================
# DEAD LETTER QUEUES
# ============================================================
create_topic "sdoc.documents.created.dlq" 1 2592000000  # 30 días
create_topic "sdoc.exports.requested.dlq" 1 2592000000
create_topic "sdoc.notifications.send.dlq" 1 2592000000

echo ""
echo "==================================================="
echo "Todos los topics Kafka creados correctamente"
echo "==================================================="
kafka-topics --list --bootstrap-server "$KAFKA_BROKER"
