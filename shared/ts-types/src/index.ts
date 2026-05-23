// Tipos del dominio SDOC compartidos entre frontend y futuros servicios TS

export type Plan = "FREE" | "PRO" | "ENTERPRISE";

export type DocumentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DELETED";

export type ExportFormat = "PDF" | "DOCX" | "HTML";

export interface User {
  id: string;
  email: string;
  fullName: string;
  plan: Plan;
  organizationId?: string;
  roles?: string[];
  avatarUrl?: string;
  storageUsedBytes?: number;
  storageLimitBytes?: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  ownerId: string;
  memberCount: number;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  status: DocumentStatus;
  language: string;
  wordCount: number;
  pageCount: number;
  sizeBytes: number;
  version: number;
  isPublic: boolean;
  thumbnailUrl?: string;
  tags: string[];
  content: unknown;
  ownerId: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPermission {
  documentId: string;
  userId: string;
  userEmail: string;
  permission: "VIEW" | "COMMENT" | "EDIT" | "ADMIN";
  grantedAt: string;
  expiresAt?: string;
}

export interface Asset {
  id: string;
  documentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
}

export interface ExportJob {
  exportId: string;
  taskId: string;
  documentId: string;
  format: ExportFormat;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  downloadUrl?: string;
  error?: string;
  createdAt: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  timestamp: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Tipos de eventos de colaboración en tiempo real
export interface AwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
  };
  cursor?: {
    anchor: unknown;
    head: unknown;
  };
}

// Respuesta de login
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}
