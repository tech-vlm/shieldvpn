import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/shieldvpn/", // GitHub Pages sub-path
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8081", // shieldvpn API server
        changeOrigin: true,
      },
    },
  },
});
