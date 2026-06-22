import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// Sitio dedicado de la membresía "Estudiemos Juntos" → membresias.emilserios.com
// Modo híbrido: páginas estáticas + servidor disponible para los endpoints de
// Stripe (checkout + webhook), que se marcarán con `export const prerender = false`.
export default defineConfig({
  site: 'https://membresias.emilserios.com',
  output: 'hybrid',
  adapter: vercel(),
});
