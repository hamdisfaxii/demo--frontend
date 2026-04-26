import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: [".js", ".jsx"],
  },
  server: {
    historyApiFallback: true, // Ajout pour gérer les routes SPA
  },
});
