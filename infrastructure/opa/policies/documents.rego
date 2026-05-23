package sdoc.documents

import rego.v1

# ============================================================
# POLÍTICA DE AUTORIZACIÓN — DOCUMENTOS
# Determina si un usuario puede realizar una acción
# sobre un documento específico
# ============================================================

# Deniega por defecto (whitelist approach)
default allow := false

# ---- LECTURA ----
allow if {
    input.action == "read"
    is_owner
}

allow if {
    input.action == "read"
    input.document.is_public == true
}

allow if {
    input.action == "read"
    has_permission({"READ", "COMMENT", "EDIT", "MANAGE"})
}

allow if {
    input.action == "read"
    is_same_org
    org_permission_allows("READ")
}

# ---- COMENTAR ----
allow if {
    input.action == "comment"
    is_owner
}

allow if {
    input.action == "comment"
    has_permission({"COMMENT", "EDIT", "MANAGE"})
}

# ---- EDICIÓN ----
allow if {
    input.action == "edit"
    is_owner
}

allow if {
    input.action == "edit"
    has_permission({"EDIT", "MANAGE"})
}

# ---- EXPORTAR ----
allow if {
    input.action == "export"
    is_owner
}

allow if {
    input.action == "export"
    has_permission({"READ", "COMMENT", "EDIT", "MANAGE"})
}

# ---- COMPARTIR ----
allow if {
    input.action == "share"
    is_owner
}

allow if {
    input.action == "share"
    has_permission({"MANAGE"})
}

# ---- ELIMINAR ----
allow if {
    input.action == "delete"
    is_owner
}

allow if {
    input.action == "delete"
    is_admin
}

# ---- GESTIÓN DE PERMISOS ----
allow if {
    input.action == "manage_permissions"
    is_owner
}

allow if {
    input.action == "manage_permissions"
    has_permission({"MANAGE"})
}

# ---- ADMINISTRACIÓN ----
allow if {
    is_admin
}

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

is_owner if {
    input.user.id == input.document.owner_id
}

is_admin if {
    "ADMIN" in input.user.roles
}

is_same_org if {
    input.document.organization_id != null
    input.user.organization_id == input.document.organization_id
}

has_permission(allowed_levels) if {
    some perm in input.document.permissions
    perm.user_id == input.user.id
    perm.level in allowed_levels
    not permission_expired(perm)
}

permission_expired(perm) if {
    perm.expires_at != null
    perm.expires_at < time.now_ns() / 1000000
}

org_permission_allows(level) if {
    some perm in input.document.permissions
    perm.organization_id == input.user.organization_id
    perm.level == level
    not permission_expired(perm)
}

# ============================================================
# MOTIVO DEL RECHAZO (para debugging)
# ============================================================
deny_reason := reason if {
    not is_owner
    not is_admin
    not input.document.is_public
    reason := "Usuario no tiene permisos suficientes"
}
