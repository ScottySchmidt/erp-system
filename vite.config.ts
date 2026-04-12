import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const enableDevtools = process.env.TANSTACK_DEVTOOLS !== "false";

export default defineConfig({
  plugins: [
    enableDevtools ? devtools() : undefined,
    cloudflare({ inspectorPort: false, viteEnvironment: { name: "ssr" } }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      importProtection: {
        client: {
          specifiers: [/cloudflare:/],
          files: ["src/lib/server/**"],
        },
      },
    }),
    viteReact(),
  ].filter(Boolean),
});
