import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../static",
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/scan": "http://localhost:8000",
      "/notas": "http://localhost:8000",
      "/exportar": "http://localhost:8000",
      "/dashboard": "http://localhost:8000",
      "/insumos": "http://localhost:8000",
    },
  },
});
