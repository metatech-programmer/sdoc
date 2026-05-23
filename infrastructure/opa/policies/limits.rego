package sdoc.limits

import rego.v1

# ============================================================
# POLÍTICA DE LÍMITES POR PLAN
# ============================================================

# Límites por plan
plan_limits := {
    "FREE": {
        "max_documents": 10,
        "max_storage_bytes": 524288000,     # 500MB
        "max_collaborators": 2,
        "max_exports_per_day": 5,
        "max_file_size_bytes": 10485760,    # 10MB
        "can_use_custom_domain": false,
        "can_use_api": false,
        "versioning_days": 7
    },
    "PRO": {
        "max_documents": 500,
        "max_storage_bytes": 10737418240,   # 10GB
        "max_collaborators": 20,
        "max_exports_per_day": 100,
        "max_file_size_bytes": 104857600,   # 100MB
        "can_use_custom_domain": true,
        "can_use_api": true,
        "versioning_days": 90
    },
    "ENTERPRISE": {
        "max_documents": -1,               # ilimitado
        "max_storage_bytes": -1,
        "max_collaborators": -1,
        "max_exports_per_day": -1,
        "max_file_size_bytes": 1073741824, # 1GB
        "can_use_custom_domain": true,
        "can_use_api": true,
        "versioning_days": 365
    }
}

default can_create_document := false
default can_upload_asset := false
default can_export := false
default can_add_collaborator := false
default can_use_api := false

# ---- Crear documento ----
can_create_document if {
    limits := plan_limits[input.user.plan]
    limits.max_documents == -1
}

can_create_document if {
    limits := plan_limits[input.user.plan]
    limits.max_documents > input.user.current_document_count
}

# ---- Subir asset ----
can_upload_asset if {
    limits := plan_limits[input.user.plan]
    limits.max_storage_bytes == -1
}

can_upload_asset if {
    limits := plan_limits[input.user.plan]
    limits.max_file_size_bytes >= input.file.size_bytes
    limits.max_storage_bytes > (input.user.storage_used_bytes + input.file.size_bytes)
}

# ---- Exportar ----
can_export if {
    limits := plan_limits[input.user.plan]
    limits.max_exports_per_day == -1
}

can_export if {
    limits := plan_limits[input.user.plan]
    limits.max_exports_per_day > input.user.exports_today
}

# ---- Agregar colaborador ----
can_add_collaborator if {
    limits := plan_limits[input.user.plan]
    limits.max_collaborators == -1
}

can_add_collaborator if {
    limits := plan_limits[input.user.plan]
    limits.max_collaborators > input.document.collaborator_count
}

# ---- Usar API ----
can_use_api if {
    limits := plan_limits[input.user.plan]
    limits.can_use_api == true
}

# Límites del plan actual
current_limits := plan_limits[input.user.plan]
