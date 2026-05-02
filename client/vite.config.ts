import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // During dev, forward /api calls to the Express server on :3001
      "/api": "http://localhost:3001",
    },
  },
  optimizeDeps: {
    // react-pdf uses pdfjs-dist which needs special handling
    include: ["react-pdf"],
  },
});
