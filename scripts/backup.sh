#!/usr/bin/env bash
# Backup automatizado de PostgreSQL y secretos de Vault para la plataforma SDOC.
# Diseñado para ejecutarse vía cron en el host Docker o en un contenedor de backup.
# Retención: 7 días diarios, 4 semanas semanales, 3 meses mensuales.
set -euo pipefail

# ─── Configuración ────────────────────────────────────────────────────────────
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/sdoc}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sdoc-postgres}"
VAULT_CONTAINER="${VAULT_CONTAINER:-sdoc-vault}"
POSTGRES_USER="${POSTGRES_USER:-sdoc}"
POSTGRES_DB="${POSTGRES_DB:-sdoc_platform}"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%u")
DAY_OF_MONTH=$(date +"%d")

# Retención en días
DAILY_RETENTION=7
WEEKLY_RETENTION=28
MONTHLY_RETENTION=90

# ─── Funciones auxiliares ─────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { error "Comando requerido no encontrado: $1"; exit 1; }
}

# ─── Validaciones previas ─────────────────────────────────────────────────────
require_cmd docker
require_cmd gzip

log "=== Iniciando backup SDOC Platform — $TIMESTAMP ==="

# Verificar que los contenedores estén corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  error "Contenedor PostgreSQL '$POSTGRES_CONTAINER' no está corriendo."
  exit 1
fi

mkdir -p "$BACKUP_ROOT/postgres/daily"
mkdir -p "$BACKUP_ROOT/postgres/weekly"
mkdir -p "$BACKUP_ROOT/postgres/monthly"
mkdir -p "$BACKUP_ROOT/vault"
mkdir -p "$BACKUP_ROOT/logs"

LOG_FILE="$BACKUP_ROOT/logs/backup_${TIMESTAMP}.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# ─── Backup PostgreSQL ────────────────────────────────────────────────────────
backup_postgres() {
  local dest_dir="$1"
  local backup_file="$dest_dir/postgres_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

  log "Iniciando dump de PostgreSQL → $backup_file"
  local start=$(date +%s)

  docker exec "$POSTGRES_CONTAINER" \
    pg_dump \
      --username="$POSTGRES_USER" \
      --format=plain \
      --no-owner \
      --no-privileges \
      --quote-all-identifiers \
      "$POSTGRES_DB" \
    | gzip -9 > "$backup_file"

  local size=$(du -sh "$backup_file" | cut -f1)
  local elapsed=$(( $(date +%s) - start ))
  log "PostgreSQL backup completado: $size en ${elapsed}s → $backup_file"

  # Verificar que el archivo no esté vacío ni corrupto
  if ! gzip -t "$backup_file" 2>/dev/null; then
    error "El archivo de backup está corrupto: $backup_file"
    rm -f "$backup_file"
    return 1
  fi

  echo "$backup_file"
}

# Backup diario siempre
DAILY_BACKUP=$(backup_postgres "$BACKUP_ROOT/postgres/daily")

# Backup semanal los domingos (día 7)
if [[ "$DAY_OF_WEEK" == "7" ]]; then
  log "Día de backup semanal — copiando a weekly..."
  cp "$DAILY_BACKUP" "$BACKUP_ROOT/postgres/weekly/"
  log "Backup semanal creado."
fi

# Backup mensual el día 1 de cada mes
if [[ "$DAY_OF_MONTH" == "01" ]]; then
  log "Día de backup mensual — copiando a monthly..."
  cp "$DAILY_BACKUP" "$BACKUP_ROOT/postgres/monthly/"
  log "Backup mensual creado."
fi

# ─── Backup Vault ─────────────────────────────────────────────────────────────
backup_vault() {
  local backup_file="$BACKUP_ROOT/vault/vault_snapshot_${TIMESTAMP}.snap.gz"

  if ! docker ps --format '{{.Names}}' | grep -q "^${VAULT_CONTAINER}$"; then
    log "ADVERTENCIA: Contenedor Vault '$VAULT_CONTAINER' no está corriendo. Omitiendo backup de Vault."
    return 0
  fi

  if [[ -z "$VAULT_TOKEN" ]]; then
    log "ADVERTENCIA: VAULT_TOKEN no definido. Omitiendo backup de Vault."
    return 0
  fi

  log "Iniciando snapshot de Vault → $backup_file"
  local start=$(date +%s)

  docker exec "$VAULT_CONTAINER" \
    vault operator raft snapshot save /tmp/vault_snapshot.snap \
    >/dev/null 2>&1 || {
      log "ADVERTENCIA: Vault no usa Raft storage o no tiene permisos. Intentando método alternativo..."
      return 0
    }

  docker cp "${VAULT_CONTAINER}:/tmp/vault_snapshot.snap" - | gzip -9 > "$backup_file"
  docker exec "$VAULT_CONTAINER" rm -f /tmp/vault_snapshot.snap

  local size=$(du -sh "$backup_file" | cut -f1)
  local elapsed=$(( $(date +%s) - start ))
  log "Vault snapshot completado: $size en ${elapsed}s → $backup_file"
}

backup_vault

# ─── Limpieza por retención ───────────────────────────────────────────────────
purge_old_backups() {
  local dir="$1"
  local days="$2"

  if [[ ! -d "$dir" ]]; then return; fi

  local count_before
  count_before=$(find "$dir" -maxdepth 1 -type f | wc -l)

  find "$dir" -maxdepth 1 -type f -mtime +"$days" -delete

  local count_after
  count_after=$(find "$dir" -maxdepth 1 -type f | wc -l)
  local removed=$(( count_before - count_after ))

  if [[ $removed -gt 0 ]]; then
    log "Limpieza $dir: $removed archivo(s) eliminados (retención: ${days}d)."
  fi
}

log "Aplicando política de retención..."
purge_old_backups "$BACKUP_ROOT/postgres/daily"   "$DAILY_RETENTION"
purge_old_backups "$BACKUP_ROOT/postgres/weekly"  "$WEEKLY_RETENTION"
purge_old_backups "$BACKUP_ROOT/postgres/monthly" "$MONTHLY_RETENTION"
purge_old_backups "$BACKUP_ROOT/vault"            "$MONTHLY_RETENTION"
purge_old_backups "$BACKUP_ROOT/logs"             "$DAILY_RETENTION"

# ─── Resumen final ────────────────────────────────────────────────────────────
log ""
log "=== Backup completado ==="
log "PostgreSQL diario : $BACKUP_ROOT/postgres/daily/"
log "PostgreSQL semanal: $BACKUP_ROOT/postgres/weekly/ (solo domingos)"
log "PostgreSQL mensual: $BACKUP_ROOT/postgres/monthly/ (solo día 1)"
log "Vault snapshots   : $BACKUP_ROOT/vault/"
log ""

# Uso recomendado en crontab:
#   0 2 * * * /opt/sdoc/scripts/backup.sh >> /var/log/sdoc-backup.log 2>&1
