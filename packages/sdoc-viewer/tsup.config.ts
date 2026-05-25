import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  loader: { ".css": "text" },
  // Después del build, copiamos style.css al dist/ para que el export
  // `./style.css` del package.json funcione (consumidor: `import "@sdoc/viewer/style.css"`).
  async onSuccess() {
    copyFileSync(
      resolve(__dirname, "src/style.css"),
      resolve(__dirname, "dist/style.css")
    );
    console.log("  Copiado src/style.css → dist/style.css");
  },
});
