/**
 * Cliente axios con interceptores JWT.
 * Refresca el token automáticamente si la respuesta es 401.
 * Fallback a modo demo si el backend no responde (VITE_DEMO_MODE o detección automática).
 */
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { useAuthStore } from "../stores/authStore";
import { DEMO_USER, DEMO_DOCS, isDemoMode, setDemoMode } from "./demo";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Inyecta el JWT en cada petición
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresca el token en 401 y reintenta una vez
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (isDemoMode()) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error("Sin refresh token");

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// Demo mode helpers — devuelven datos seed cuando no hay backend.
// ============================================================
const DEMO_DELAY = 220;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let demoDocsState = [...DEMO_DOCS];

async function withFallback<T>(real: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (isDemoMode()) return fallback();
  try {
    return await real();
  } catch (err: any) {
    // Si el backend no responde o devuelve 5xx/404, activamos demo permanente.
    if (
      !err?.response ||
      err.response.status >= 500 ||
      err.response.status === 404 ||
      err.code === "ECONNABORTED" ||
      err.code === "ERR_NETWORK"
    ) {
      setDemoMode(true);
      return fallback();
    }
    throw err;
  }
}

// Helpers tipados
export const authApi = {
  login: (email: string, _password: string) =>
    withFallback(
      () => api.post("/auth/login", { email, password: _password }).then((r) => r.data),
      async () => {
        await sleep(DEMO_DELAY);
        return {
          accessToken: "demo." + btoa(email).slice(0, 30) + ".token",
          refreshToken: "demo-refresh-token",
          expiresIn: 3600,
        };
      }
    ),
  register: (payload: { email: string; password: string; fullName: string }) =>
    withFallback(
      () => api.post("/auth/register", payload).then((r) => r.data),
      async () => {
        await sleep(DEMO_DELAY);
        DEMO_USER.email = payload.email;
        DEMO_USER.fullName = payload.fullName;
        return { id: DEMO_USER.id, email: payload.email };
      }
    ),
  me: () =>
    withFallback(
      () => api.get("/auth/me").then((r) => r.data),
      async () => {
        await sleep(120);
        return DEMO_USER;
      }
    ),
  logout: () =>
    api.post("/auth/logout").then((r) => r.data).catch(() => null),
};

export const documentsApi = {
  list: (page = 0, size = 20) =>
    withFallback(
      () => api.get("/documents", { params: { page, size } }).then((r) => r.data),
      async () => {
        await sleep(DEMO_DELAY);
        return {
          content: demoDocsState,
          totalElements: demoDocsState.length,
          totalPages: 1,
          number: page,
          size,
        };
      }
    ),
  get: (id: string) =>
    withFallback(
      () => api.get(`/documents/${id}`).then((r) => r.data),
      async () => {
        await sleep(120);
        return demoDocsState.find((d) => d.id === id) ?? demoDocsState[0];
      }
    ),
  create: (payload: { title: string; language?: string; description?: string }) =>
    withFallback(
      () => api.post("/documents", payload).then((r) => r.data),
      async () => {
        await sleep(DEMO_DELAY);
        const doc: any = {
          id: "doc-" + Date.now(),
          title: payload.title,
          description: payload.description ?? "",
          ownerId: DEMO_USER.id,
          status: "DRAFT",
          content: {},
          language: payload.language ?? "es",
          wordCount: 0,
          pageCount: 0,
          sizeBytes: 0,
          version: 1,
          isPublic: false,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        demoDocsState = [doc, ...demoDocsState];
        return doc;
      }
    ),
  update: (id: string, content: unknown) =>
    withFallback(
      () => api.put(`/documents/${id}`, content).then((r) => r.data),
      async () => {
        await sleep(80);
        demoDocsState = demoDocsState.map((d) =>
          d.id === id ? ({ ...d, ...(content as object), updatedAt: new Date().toISOString() } as any) : d
        );
        return demoDocsState.find((d) => d.id === id);
      }
    ),
  delete: (id: string) =>
    withFallback(
      () => api.delete(`/documents/${id}`),
      async () => {
        await sleep(120);
        demoDocsState = demoDocsState.filter((d) => d.id !== id);
        return { deleted: true } as any;
      }
    ),
  search: (query: string, page = 0) =>
    withFallback(
      () => api.get("/documents/search", { params: { q: query, page } }).then((r) => r.data),
      async () => {
        const q = query.toLowerCase();
        return {
          content: demoDocsState.filter((d) => d.title.toLowerCase().includes(q)),
          totalElements: 0,
          totalPages: 1,
          number: page,
        };
      }
    ),

  /**
   * Descarga el documento como bytes binarios del archivo `.sdoc` real
   * generado por el backend (`GET /documents/{id}/download.sdoc`).
   * En demo mode, devuelve null para que el caller use la construcción
   * client-side con `@sdoc/format`.
   */
  downloadSdocBlob: async (id: string): Promise<ArrayBuffer | null> => {
    if (isDemoMode()) return null;
    try {
      const res = await api.get(`/documents/${id}/download.sdoc`, {
        responseType: "arraybuffer",
        headers: { Accept: "application/vnd.sdoc+zip" },
      });
      return res.data as ArrayBuffer;
    } catch {
      return null;
    }
  },
};

export const exportApi = {
  request: (documentId: string, format: "PDF" | "DOCX" | "HTML") =>
    api
      .post("/render/export", { documentId, format })
      .then((r) => r.data),
  status: (taskId: string) =>
    api.get(`/render/export/${taskId}/status`).then((r) => r.data),
};

export const assetsApi = {
  upload: (documentId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("documentId", documentId);
    return api
      .post("/assets/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  listByDocument: (documentId: string) =>
    api.get(`/assets/document/${documentId}`).then((r) => r.data),
};
