#!/bin/sh
# ============================================================
# SDOC Platform — Inicialización de HashiCorp Vault
# Crea todos los secretos necesarios para la plataforma
# ============================================================

export VAULT_ADDR="http://vault:8200"
export VAULT_TOKEN="${VAULT_TOKEN}"

echo "Esperando a que Vault esté disponible..."
sleep 5

# Verificar que Vault está disponible
vault status || exit 1

echo "Habilitando motor KV v2..."
vault secrets enable -path=secret kv-v2 2>/dev/null || true

# ============================================================
# BASE DE DATOS
# ============================================================
echo "Escribiendo secretos de base de datos..."
vault kv put secret/sdoc/database \
    url="jdbc:postgresql://${POSTGRES_HOST:-postgres}:5432/${POSTGRES_DB:-sdoc_db}" \
    username="${POSTGRES_USER:-sdoc}" \
    password="${POSTGRES_PASSWORD:-changeme}"

# ============================================================
# REDIS
# ============================================================
echo "Escribiendo secretos de Redis..."
vault kv put secret/sdoc/redis \
    host="${REDIS_HOST:-redis}" \
    port="6379" \
    password="${REDIS_PASSWORD:-changeme}"

# ============================================================
# KEYCLOAK
# ============================================================
echo "Escribiendo secretos de Keycloak..."
vault kv put secret/sdoc/keycloak \
    url="${KEYCLOAK_URL:-http://keycloak:8080}" \
    realm="sdoc" \
    client_id="${KEYCLOAK_CLIENT_ID:-sdoc-backend}" \
    client_secret="${KEYCLOAK_CLIENT_SECRET:-changeme}" \
    admin_user="${KEYCLOAK_ADMIN_USER:-admin}" \
    admin_password="${KEYCLOAK_ADMIN_PASSWORD:-changeme}"

# ============================================================
# MINIO / OBJECT STORAGE
# ============================================================
echo "Escribiendo secretos de MinIO..."
vault kv put secret/sdoc/storage \
    endpoint="${MINIO_ENDPOINT:-http://minio:9000}" \
    access_key="${MINIO_ROOT_USER:-sdoc-admin}" \
    secret_key="${MINIO_ROOT_PASSWORD:-changeme}" \
    bucket_documents="sdoc-documents" \
    bucket_assets="sdoc-assets" \
    bucket_versions="sdoc-versions" \
    bucket_exports="sdoc-exports"

# ============================================================
# CIFRADO DE DOCUMENTOS
# ============================================================
echo "Escribiendo secretos de cifrado..."
vault kv put secret/sdoc/encryption \
    aes_key="${DOCUMENT_ENCRYPTION_KEY:-0000000000000000000000000000000000000000000000000000000000000000}" \
    ed25519_private_key="${DOCUMENT_SIGNING_PRIVATE_KEY:-changeme_base64_key}" \
    hkdf_salt="sdoc-platform-v1-hkdf-salt"

# ============================================================
# CONFIG SERVER
# ============================================================
echo "Escribiendo secretos del Config Server..."
vault kv put secret/sdoc/config-server \
    username="${CONFIG_SERVER_USER:-config-admin}" \
    password="${CONFIG_SERVER_PASSWORD:-changeme}" \
    encrypt_key="${CONFIG_ENCRYPT_KEY:-changeme_32_char_key_here_pad}"

# ============================================================
# EUREKA
# ============================================================
echo "Escribiendo secretos de Eureka..."
vault kv put secret/sdoc/eureka \
    username="${EUREKA_USER:-eureka-admin}" \
    password="${EUREKA_PASSWORD:-changeme}"

# ============================================================
# EMAIL (Resend)
# ============================================================
echo "Escribiendo secretos de email..."
vault kv put secret/sdoc/email \
    resend_api_key="${RESEND_API_KEY:-re_changeme}" \
    from_address="${EMAIL_FROM:-noreply@sdoc.app}" \
    from_name="${EMAIL_FROM_NAME:-SDOC Platform}"

# ============================================================
# STRIPE
# ============================================================
echo "Escribiendo secretos de Stripe..."
vault kv put secret/sdoc/stripe \
    secret_key="${STRIPE_SECRET_KEY:-sk_test_changeme}" \
    webhook_secret="${STRIPE_WEBHOOK_SECRET:-whsec_changeme}"

# ============================================================
# OBSERVABILIDAD
# ============================================================
echo "Escribiendo secretos de observabilidad..."
vault kv put secret/sdoc/grafana \
    admin_password="${GRAFANA_ADMIN_PASSWORD:-changeme}"

# ============================================================
# FEATURE FLAGS (Unleash)
# ============================================================
vault kv put secret/sdoc/unleash \
    api_url="${UNLEASH_API_URL:-http://unleash:4242/api}" \
    api_token="${UNLEASH_API_TOKEN:-changeme}"

# ============================================================
# POLÍTICAS DE ACCESO
# ============================================================
echo "Creando políticas de Vault..."

vault policy write sdoc-services - <<EOF
path "secret/data/sdoc/*" {
  capabilities = ["read"]
}
path "secret/metadata/sdoc/*" {
  capabilities = ["read", "list"]
}
EOF

echo ""
echo "==================================================="
echo "HashiCorp Vault inicializado correctamente"
echo "Secretos configurados en secret/sdoc/*"
echo "==================================================="
vault kv list secret/sdoc/
