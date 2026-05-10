import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({ spa: { enabled: true } }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],

  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,

    allowedHosts: true,
  },

  resolve: {
    alias: {
      "@": "/src",
    },
  },
});