import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@eazque/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
