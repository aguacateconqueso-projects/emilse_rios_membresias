import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Sitio dedicado de la membresía "Estudiemos Juntos" → www.emilseriosacademy.com
// Astro 5: el modo 'static' prerenderiza por defecto y permite endpoints bajo
// demanda marcando `export const prerender = false` (lo usaremos para los
// endpoints de Stripe: checkout + webhook).
//
// `site` es el host CANÓNICO y debe llevar `www`: en Vercel el ápice pelado
// (emilseriosacademy.com) responde 308 redirigiendo a www. De aquí salen la
// etiqueta <link rel="canonical">, los hreflang y el sitemap.xml, así que si
// esto apunta a otro dominio, Google indexa el dominio equivocado.
export default defineConfig({
  site: 'https://www.emilseriosacademy.com',
  output: 'static',
  adapter: vercel(),
});
