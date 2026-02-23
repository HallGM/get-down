import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@get-down/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    proxy: {
      "/enquiry": "http://localhost:3000",
      "/enquiries": "http://localhost:3000",
    },
  },
});
