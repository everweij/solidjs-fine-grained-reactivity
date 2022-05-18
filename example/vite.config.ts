import { defineConfig } from "vite";
import fluid from "../vite-plugin-fluid";

export default defineConfig({
  plugins: [fluid()],
});
