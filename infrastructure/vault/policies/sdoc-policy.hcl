# Política de Vault para los microservicios SDOC.
# Permite lectura de todos los secretos bajo secret/data/sdoc/*.
# Asignada al rol sdoc-services y al token de servicio en vault-init.sh.

path "secret/data/sdoc/*" {
  capabilities = ["read"]
}

path "secret/metadata/sdoc/*" {
  capabilities = ["list", "read"]
}

# Config Server necesita acceso al token de encriptación para {cipher}
path "transit/decrypt/sdoc-config" {
  capabilities = ["update"]
}

path "transit/encrypt/sdoc-config" {
  capabilities = ["update"]
}
