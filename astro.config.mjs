import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'
import tailwind from '@astrojs/tailwind'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import image from '@astrojs/image'
import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
  site: 'https://resuland.github.io',
  integrations: [
    tailwind(),
    UnoCSS(),
    mdx(),
    sitemap(),
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
