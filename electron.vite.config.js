import { defineConfig } from "electron-vite";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    entry: "src/main/main.js",
    build: {
      outDir: "out/main",
      emptyOutDir: true,
    },
  },
  preload: {
    input: {
      preload: path.join(__dirname, "src/preload/preload.js"),
    },
    build: {
      outDir: "out/preload",
      emptyOutDir: true,
    },
  },
  renderer: {
    root: "src",
    publicDir: path.join(__dirname, "public"),
    resolve: {
      alias: {
        "@": path.join(__dirname, "src/renderer"),
        "@features": path.join(__dirname, "src/renderer/features"), // Новый алиас
      },
    },
    build: {
      outDir: "out/renderer", // Выходная директория для renderer
      emptyOutDir: true,
      sourcemap: false,
      minify: "terser",
      terserOptions: {
        compress: {
          keep_fnames: true,
          keep_classnames: true,
          unused: false,
        },
        mangle: {
          keep_fnames: true,
        },
      },
      rollupOptions: {
        input: path.join(__dirname, "src/index.html"),
        // output: {
        //   manualChunks(id) {
        //     if (id.includes("node_modules")) {
        //       if (id.includes("@mui")) return "vendor-mui";
        //       if (id.includes("react")) return "vendor-react";
        //       return "vendor";
        //     }
        //   },
        // },
      },
      chunkSizeWarningLimit: 1500,
    },
    plugins: [
      react({
        jsxImportSource: "@emotion/react",
        babel: {
          plugins: [],
        },
      }),
    ],
    server: {
      cors: true,
    },
    optimizeDeps: {
      include: [
        "@emotion/react",
        "@emotion/styled",
        "@mui/material",
        "react",
        "react-dom",
      ],
    },
  },
});
