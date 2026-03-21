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
      "/auth": "http://localhost:3000",
      "/gigs": "http://localhost:3000",
      "/enquir": "http://localhost:3000",
      "/services": "http://localhost:3000",
      "/people": "http://localhost:3000",
      "/songs": "http://localhost:3000",
      "/rehearsals": "http://localhost:3000",
      "/todos": "http://localhost:3000",
      "/expenses": "http://localhost:3000",
      "/payments": "http://localhost:3000",
      "/invoices": "http://localhost:3000",
      "/attributions": "http://localhost:3000",
      "/showcases": "http://localhost:3000",
      "/assigned-roles": "http://localhost:3000",
      "/calendar": "http://localhost:3000",
      "/fee-allocations": "http://localhost:3000",
    },
  },
});
