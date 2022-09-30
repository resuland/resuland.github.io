import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import image from '@astrojs/image'
import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
  site: 'https://resuland.github.io',
  integrations: [
    mdx(),
    sitemap(),
    tailwind(),
    image({
      serviceEntryPoint: '@astrojs/image/sharp',
    }),
    react(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'min-dark',
    },
  },
})
