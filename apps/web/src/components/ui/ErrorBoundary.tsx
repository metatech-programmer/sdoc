/**
 * Error Boundary — captura errores de React y muestra fallback editorial.
 * En prod debe reportar a Sentry/Logflare; aquí solo log a console.
 */
import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[Folio ErrorBoundary]", error, info);
    }
    // TODO: enviar a observability (Sentry/Logflare)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--color-text-muted)",
              marginBottom: "1rem",
            }}
          >
            Algo salió mal
          </p>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "2.25rem",
              fontWeight: 600,
              lineHeight: 1.15,
              marginBottom: "1rem",
            }}
          >
            Tu trabajo está a salvo.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--color-text-soft)",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            Encontramos un problema al renderizar esta vista. Tus documentos se guardan
            automáticamente, así que no perdiste nada.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <Button variant="primary" onClick={this.reload}>
              Recargar Folio
            </Button>
            <Button variant="ghost" onClick={this.reset}>
              Reintentar
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                marginTop: "2rem",
                padding: "1rem",
                background: "var(--color-bg-subtle)",
                borderRadius: "var(--radius)",
                fontSize: "0.75rem",
                textAlign: "left",
                overflow: "auto",
                maxHeight: 200,
                fontFamily: "var(--font-mono)",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
