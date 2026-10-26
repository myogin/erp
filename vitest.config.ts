import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // Tests share one real database, so files run one at a time.
    fileParallelism: false,
  },
});
