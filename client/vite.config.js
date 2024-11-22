import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This allows docker to forward the port
    port: 5173, // Matches the port in docker-compose
    watch: {
      usePolling: true,
    },
  },
});
