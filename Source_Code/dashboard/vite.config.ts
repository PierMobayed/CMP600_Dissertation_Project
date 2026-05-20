import path from "node:path";
import os from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(os.tmpdir(), "cmp600-vite-dashboard"),
  server: {
    port: 5173,
    watch: { usePolling: true },
  },
});
