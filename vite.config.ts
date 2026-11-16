import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [preact()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  build: {
    sourcemap: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
