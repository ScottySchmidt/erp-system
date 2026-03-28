import QueryPlugin from "@tanstack/eslint-plugin-query";
import RouterPlugin from "@tanstack/eslint-plugin-router";
import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: ["@tanstack/eslint-plugin-query", "@tanstack/eslint-plugin-router"],
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    ...QueryPlugin.configs.recommended.rules,
    ...RouterPlugin.configs.recommended.rules,
  },
});
