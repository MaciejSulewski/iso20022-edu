import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://maciejsulewski.github.io",
  base: "/iso20022-edu/",
  output: "static",
  integrations: [preact()],
  vite: { plugins: [tailwindcss()] },
});
