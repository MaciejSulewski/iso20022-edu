import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://maciejsulewski.github.io",
  base: "/iso20022-edu/",
  output: "static",
  i18n: { defaultLocale: "en", locales: ["en"] },
  integrations: [
    preact(),
    sitemap({ filter: (page) => !page.includes("/dev/") }),
  ],
  vite: { plugins: [tailwindcss()] },
});
