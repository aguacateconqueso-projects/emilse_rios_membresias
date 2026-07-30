// Sitemap del sitio → /sitemap.xml
//
// Se escribe a mano (en vez de usar @astrojs/sitemap) por dos razones:
//   1. El sitio público son DOS URLs, la carta en ES y en EN. Todo lo demás es
//      zona privada con `noindex`, y un sitemap automático las metería a menos
//      que se filtren una por una.
//   2. Así podemos declarar los `xhtml:link rel="alternate" hreflang"` de cada
//      URL: le decimos a Google que / y /en/ son la MISMA página en dos idiomas,
//      no contenido duplicado, y que sirva cada una a su público.
//
// El host sale de `site` en astro.config.mjs (el canónico con `www`). Es un
// endpoint estático: con `output: 'static'` Astro lo hornea en el build y Vercel
// sirve un archivo, sin función serverless.
import type { APIRoute } from 'astro';

export const prerender = true;

// Las dos únicas páginas públicas, con su código de idioma.
const PAGES = [
  { path: '/', lang: 'es' },
  { path: '/en/', lang: 'en' },
];

export const GET: APIRoute = ({ site }) => {
  // `site` viene de astro.config.mjs; el fallback es el mismo canónico por si
  // alguien borra la clave sin querer (mejor una URL correcta que "undefined/").
  const origin = (site?.origin ?? 'https://www.emilseriosacademy.com').replace(/\/$/, '');
  const url = (path: string) => `${origin}${path}`;

  // Mismo bloque de alternates para las dos URLs (así lo pide Google: cada URL
  // del grupo debe listar a TODAS, incluida ella misma). x-default → la ES.
  const alternates = [
    ...PAGES.map((p) => `    <xhtml:link rel="alternate" hreflang="${p.lang}" href="${url(p.path)}" />`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${url('/')}" />`,
  ].join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.map((p) => `  <url>
    <loc>${url(p.path)}</loc>
${alternates}
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
