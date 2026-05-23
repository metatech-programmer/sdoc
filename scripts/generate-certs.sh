#!/usr/bin/env bash
# Genera certificados mTLS para desarrollo local de la plataforma SDOC.
# Crea una CA raíz autofirmada y certificados de cliente/servidor para cada servicio.
# NO usar en producción — usar Let's Encrypt o Vault PKI para entornos reales.
set -euo pipefail

CERTS_DIR="$(cd "$(dirname "$0")/.." && pwd)/infrastructure/docker/certs"
CA_SUBJECT="/C=ES/ST=Madrid/L=Madrid/O=SDOC Platform/OU=Development/CN=sdoc-dev-ca"
VALIDITY_DAYS=365
KEY_BITS=4096

SERVICES=(
  "api-gateway"
  "auth-service"
  "document-service"
  "asset-service"
  "version-service"
  "sync-service"
  "notification-service"
  "render-service"
  "config-server"
  "eureka-server"
)

echo "=== SDOC Platform — Generador de certificados mTLS para desarrollo ==="
echo "Directorio de salida: $CERTS_DIR"
echo ""

command -v openssl >/dev/null 2>&1 || { echo "ERROR: openssl no está instalado."; exit 1; }

mkdir -p "$CERTS_DIR/ca"
mkdir -p "$CERTS_DIR/server"
mkdir -p "$CERTS_DIR/client"

# ─── CA Raíz ──────────────────────────────────────────────────────────────────
echo "[1/3] Generando CA raíz de desarrollo..."
if [[ ! -f "$CERTS_DIR/ca/ca.key" ]]; then
  openssl genrsa -out "$CERTS_DIR/ca/ca.key" $KEY_BITS 2>/dev/null
  echo "  CA key generado."
else
  echo "  CA key ya existe, reutilizando."
fi

if [[ ! -f "$CERTS_DIR/ca/ca.crt" ]]; then
  openssl req -new -x509 \
    -key "$CERTS_DIR/ca/ca.key" \
    -out "$CERTS_DIR/ca/ca.crt" \
    -days $VALIDITY_DAYS \
    -subj "$CA_SUBJECT" \
    -extensions v3_ca \
    2>/dev/null
  echo "  CA certificado generado (válido $VALIDITY_DAYS días)."
else
  echo "  CA certificado ya existe, reutilizando."
fi

# ─── Certificados de servidor por servicio ────────────────────────────────────
echo ""
echo "[2/3] Generando certificados de servidor para cada microservicio..."

for SERVICE in "${SERVICES[@]}"; do
  CERT_DIR="$CERTS_DIR/server/$SERVICE"
  mkdir -p "$CERT_DIR"

  if [[ -f "$CERT_DIR/server.crt" ]]; then
    echo "  $SERVICE: certificado ya existe, omitiendo."
    continue
  fi

  # Extensiones SAN para que el certificado sea válido en Docker y en localhost
  SAN_CONFIG=$(cat <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $SERVICE
DNS.2 = localhost
DNS.3 = 127.0.0.1
IP.1  = 127.0.0.1
EOF
)

  # Clave privada del servidor
  openssl genrsa -out "$CERT_DIR/server.key" 2048 2>/dev/null

  # CSR
  openssl req -new \
    -key "$CERT_DIR/server.key" \
    -out "$CERT_DIR/server.csr" \
    -subj "/C=ES/ST=Madrid/O=SDOC Platform/OU=Services/CN=$SERVICE" \
    -config <(echo "$SAN_CONFIG") \
    2>/dev/null

  # Firma con CA de desarrollo
  openssl x509 -req \
    -in "$CERT_DIR/server.csr" \
    -CA "$CERTS_DIR/ca/ca.crt" \
    -CAkey "$CERTS_DIR/ca/ca.key" \
    -CAcreateserial \
    -out "$CERT_DIR/server.crt" \
    -days $VALIDITY_DAYS \
    -extensions v3_req \
    -extfile <(echo "$SAN_CONFIG") \
    2>/dev/null

  # PKCS12 para consumidores Java (Spring Boot usa keystores JKS o PKCS12)
  openssl pkcs12 -export \
    -in "$CERT_DIR/server.crt" \
    -inkey "$CERT_DIR/server.key" \
    -out "$CERT_DIR/server.p12" \
    -name "$SERVICE" \
    -passout pass:sdoc-dev-keystore \
    2>/dev/null

  rm -f "$CERT_DIR/server.csr"
  echo "  $SERVICE: certificado generado OK."
done

# ─── Certificados de cliente (para mTLS entre servicios) ──────────────────────
echo ""
echo "[3/3] Generando certificados de cliente para mTLS inter-servicios..."

CLIENT_NAMES=("gateway-client" "internal-client")
for CLIENT in "${CLIENT_NAMES[@]}"; do
  CERT_DIR="$CERTS_DIR/client/$CLIENT"
  mkdir -p "$CERT_DIR"

  if [[ -f "$CERT_DIR/client.crt" ]]; then
    echo "  $CLIENT: certificado ya existe, omitiendo."
    continue
  fi

  openssl genrsa -out "$CERT_DIR/client.key" 2048 2>/dev/null

  openssl req -new \
    -key "$CERT_DIR/client.key" \
    -out "$CERT_DIR/client.csr" \
    -subj "/C=ES/ST=Madrid/O=SDOC Platform/OU=Clients/CN=$CLIENT" \
    2>/dev/null

  openssl x509 -req \
    -in "$CERT_DIR/client.csr" \
    -CA "$CERTS_DIR/ca/ca.crt" \
    -CAkey "$CERTS_DIR/ca/ca.key" \
    -CAcreateserial \
    -out "$CERT_DIR/client.crt" \
    -days $VALIDITY_DAYS \
    2>/dev/null

  openssl pkcs12 -export \
    -in "$CERT_DIR/client.crt" \
    -inkey "$CERT_DIR/client.key" \
    -out "$CERT_DIR/client.p12" \
    -name "$CLIENT" \
    -passout pass:sdoc-dev-truststore \
    2>/dev/null

  rm -f "$CERT_DIR/client.csr"
  echo "  $CLIENT: certificado generado OK."
done

# ─── Truststore JKS con la CA ─────────────────────────────────────────────────
if command -v keytool >/dev/null 2>&1; then
  TRUSTSTORE="$CERTS_DIR/ca/sdoc-truststore.jks"
  if [[ ! -f "$TRUSTSTORE" ]]; then
    keytool -import -noprompt \
      -alias sdoc-dev-ca \
      -file "$CERTS_DIR/ca/ca.crt" \
      -keystore "$TRUSTSTORE" \
      -storepass sdoc-dev-truststore \
      2>/dev/null
    echo ""
    echo "  Truststore JKS generado: $TRUSTSTORE"
    echo "  Contraseña: sdoc-dev-truststore"
  fi
fi

echo ""
echo "=== Certificados generados correctamente ==="
echo ""
echo "Configuración en application.yml de cada servicio:"
echo "  server.ssl.key-store: classpath:server.p12"
echo "  server.ssl.key-store-password: sdoc-dev-keystore"
echo "  server.ssl.key-store-type: PKCS12"
echo "  server.ssl.trust-store: classpath:sdoc-truststore.jks"
echo "  server.ssl.trust-store-password: sdoc-dev-truststore"
echo "  server.ssl.client-auth: need  # para mTLS estricto"
echo ""
echo "ADVERTENCIA: Estos certificados son SOLO para desarrollo local."
echo "En producción usar Vault PKI o Let's Encrypt."
