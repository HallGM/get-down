import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/enquiry": "http://localhost:3000",
      "/enquiries": "http://localhost:3000",
    },
  },
});
