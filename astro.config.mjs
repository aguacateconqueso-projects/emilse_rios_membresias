import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Sitio dedicado de la membresía "Estudiemos Juntos" → membresias.emilserios.com
// Astro 5: el modo 'static' prerenderiza por defecto y permite endpoints bajo
// demanda marcando `export const prerender = false` (lo usaremos para los
// endpoints de Stripe: checkout + webhook).
export default defineConfig({
  site: 'https://membresias.emilserios.com',
  output: 'static',
  adapter: vercel(),
});
