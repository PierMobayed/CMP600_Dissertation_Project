import path from "node:path";
import os from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite prebundle cache in %TEMP% — avoids EPERM on .vite under OneDrive
export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(os.tmpdir(), "cmp600-vite-driver"),
  server: {
    port: 5175,
    watch: { usePolling: true },
  },
});
