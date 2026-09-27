import path from "node:path";
import os from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(os.tmpdir(), "cmp600-vite-client"),
  server: {
    port: 5174,
    watch: { usePolling: true },
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
