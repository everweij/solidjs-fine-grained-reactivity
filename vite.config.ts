import { defineConfig } from "vitest/config";
import fluid from "./vite-plugin-fluid";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      transform(_, id) {
        if (/\.(css|sass|scss)$/.test(id)) return { code: "" };
      },
    },
    fluid() as any,
  ],
  test: {
    environment: "jsdom",
  },
});
