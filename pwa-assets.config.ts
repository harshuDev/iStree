import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Regenerate icons with `npm run icons` after editing public/logo.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#b5577a' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#b5577a' } },
  },
  images: ['public/logo.svg'],
});
