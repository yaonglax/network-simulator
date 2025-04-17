import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "./",
  server: {
    port: 3000,
    strictPort: true,
  },
  assetsInclude: ["**/*.woff2"],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
