import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { useThemeStore } from "./lib/theme";
import { useLocaleStore } from "./lib/i18n";
import "./index.css";

// === Boot: aplica tema persistido y locale al <html> antes del primer render ===
const theme = useThemeStore.getState().theme;
const root = document.documentElement;
root.classList.remove("light", "dark");
if (theme === "system") {
  root.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} else {
  root.classList.add(theme);
}
root.lang = useLocaleStore.getState().locale;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
