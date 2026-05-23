{{/*
Nombre de la release
*/}}
{{- define "sdoc.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Labels comunes a todos los recursos
*/}}
{{- define "sdoc.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: sdoc
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{/*
Labels de selector para un servicio dado
*/}}
{{- define "sdoc.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .release }}
{{- end }}

{{/*
URL de imagen para un servicio
*/}}
{{- define "sdoc.image" -}}
{{ .Values.global.registry }}-{{ .service }}:{{ .Values.global.imageTag }}
{{- end }}
