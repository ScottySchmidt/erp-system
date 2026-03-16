import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["worker-configuration.d.ts", "routeTree.gen.ts"],
  printWidth: 100,
  sortTailwindcss: {},
  sortImports: {},
});
