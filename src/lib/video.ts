// Enlaces de video del aula — traduce lo que Emi pega en el panel a la URL que
// va dentro del <iframe>.
//
// ⚠️ CAMBIO DE PLATAFORMA (3 sep 2026): los videos se suben a **Bunny Stream**,
// que es lo que ya usa la carta desde el 1 sep. Vimeo se sigue entendiendo
// porque hay contenido viejo guardado con enlaces de Vimeo, pero no se sube
// nada nuevo allí.
//
// Este módulo es la ÚNICA fuente de verdad del formato de los enlaces y lo leen
// los DOS lados, que es lo que impide que se desalineen:
//   - el panel (`src/pages/panel/index.astro`), al GUARDAR, con normalizeVideoUrl
//   - el aula (`src/components/membresia/Aula.astro`), al PINTAR, con videoEmbed
//
// Las columnas de la base de datos siguen llamándose `vimeo_url_es` /
// `vimeo_url_en`: es solo el nombre histórico, ahí dentro va el enlace de Bunny.
// Renombrarlas obligaría a una migración y a tocar panel, aula y seed a la vez,
// y no arregla nada que se vea.

// Biblioteca de Bunny Stream. Se usa SOLO cuando el texto pegado trae el GUID
// del video pero no la biblioteca (p. ej. el enlace del CDN
// `vz-….b-cdn.net/GUID/playlist.m3u8`, o el GUID pelado). Por defecto, la misma
// biblioteca de los videos de la carta.
export const BUNNY_LIBRARY_ID = String(
  import.meta.env.PUBLIC_BUNNY_LIBRARY_ID || '741634',
).trim();

// Host del reproductor cuando hay que construir la URL desde cero. Es el que
// documenta Bunny y el que sale de su botón «Embed». (La carta usa el viejo
// `player.mediadelivery.net`, que también responde; si un enlace llega con ese
// host se respeta tal cual, no se reescribe.)
const BUNNY_HOST = 'iframe.mediadelivery.net';

// Parámetros del reproductor de Bunny para el aula.
//   FORZADOS: el código que da Bunny viene con `autoplay=true` y a veces
//   `muted=true`. En el aula las dos cosas están mal: el video no debe arrancar
//   solo al abrir la pestaña, y un ejercicio de violín en silencio no sirve.
//   POR DEFECTO: se ponen solo si el enlace pegado no los traía.
// Cualquier otro parámetro que venga pegado (tokens de biblioteca protegida,
// `t=` para empezar en un minuto concreto…) se conserva intacto.
const BUNNY_FORCED: Record<string, string> = { autoplay: 'false', muted: 'false' };
const BUNNY_DEFAULTS: Record<string, string> = { loop: 'false', preload: 'true', responsive: 'true' };

// El `allow` que trae el embed oficial de cada plataforma. Sin esto se pierden
// pantalla completa y picture-in-picture.
const ALLOW_BUNNY = 'accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen;';
const ALLOW_VIMEO = 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share';

const GUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export type VideoProvider = 'bunny' | 'vimeo';

export type VideoEmbed =
  | { ok: true; provider: VideoProvider; src: string; allow: string }
  // 'empty'      no hay nada guardado para ese idioma (no es un error)
  // 'bunny-lost' se guardó un enlace de Bunny cuando el panel solo entendía
  //              Vimeo y se perdió el GUID: hay que volver a pegarlo
  // 'unknown'    hay texto, pero no se reconoce ninguna plataforma
  | { ok: false; reason: 'empty' | 'bunny-lost' | 'unknown' };

// Saca la URL utilizable de lo que sea que se haya pegado: el código
// `<iframe … src="…">` entero, o la URL a secas. Decodifica los `&amp;` que
// llegan cuando se pega HTML.
function unwrap(input: unknown): string {
  let s = String(input ?? '').trim();
  const src = s.match(/src=["']([^"']+)["']/i);
  if (src) s = src[1];
  return s.replace(/&amp;/g, '&').trim();
}

function buildBunny(s: string): string | null {
  const guid = s.match(GUID_RE);
  if (!guid) return null;
  // La biblioteca son los dígitos que van justo antes del GUID en la ruta
  // (`/embed/741634/GUID`, `/play/741634/GUID`). Si no están, la de siempre.
  const lib = s.match(new RegExp('/(\\d{3,12})/' + guid[0], 'i'));
  // Si el enlace ya venía de mediadelivery, se respeta su host.
  const host = s.match(/https?:\/\/([a-z0-9.-]*mediadelivery\.net)/i);

  const qi = s.indexOf('?');
  const params = new URLSearchParams(qi === -1 ? '' : s.slice(qi + 1));
  for (const [k, v] of Object.entries(BUNNY_FORCED)) params.set(k, v);
  for (const [k, v] of Object.entries(BUNNY_DEFAULTS)) if (!params.has(k)) params.set(k, v);

  const library = lib ? lib[1] : BUNNY_LIBRARY_ID;
  return `https://${host ? host[1].toLowerCase() : BUNNY_HOST}/embed/${library}/${guid[0].toLowerCase()}?${params}`;
}

function buildVimeo(s: string): string | null {
  // ID del video: primera secuencia larga de dígitos (los de Vimeo son 6-11).
  const id = s.match(/\d{6,}/);
  if (!id) return null;
  const base = 'https://player.vimeo.com/video/' + id[0];
  // Conserva la query tal cual la da Vimeo (?h=, app_id…) para que el embed se
  // comporte igual que su código oficial. Si no hay query pero el hash del video
  // oculto viene en la ruta (/ID/HASH), pásalo como ?h=.
  const qi = s.indexOf('?');
  if (qi !== -1) return base + s.slice(qi);
  const ph = s.match(new RegExp('/' + id[0] + '/([A-Za-z0-9]+)'));
  return base + (ph ? '?h=' + ph[1] : '');
}

// Enlaces rotos por el panel viejo: hasta el 3 sep 2026 el panel buscaba «la
// primera ristra de 6+ dígitos» y la daba por un ID de Vimeo. Con un embed de
// Bunny eso pilla el número de la BIBLIOTECA y tira el GUID del video, y queda
// guardado un `player.vimeo.com/video/741634?…&responsive=true` que no existe.
// No hay nada que recuperar (el GUID ya no está); se detecta para poder decir
// «vuelve a pegar el enlace» en vez de enseñar un reproductor de Vimeo en error.
function isLostBunny(s: string): boolean {
  if (!/player\.vimeo\.com\/video\//i.test(s)) return false;
  return s.includes('responsive=') || s.includes('/video/' + BUNNY_LIBRARY_ID);
}

// Lo que el aula necesita para pintar el <iframe>. Bunny primero: un embed suyo
// también trae dígitos largos y si se mira Vimeo antes se lo lleva por delante.
export function videoEmbed(input: unknown): VideoEmbed {
  const s = unwrap(input);
  if (!s) return { ok: false, reason: 'empty' };

  const bunny = buildBunny(s);
  if (bunny) return { ok: true, provider: 'bunny', src: bunny, allow: ALLOW_BUNNY };

  if (isLostBunny(s)) return { ok: false, reason: 'bunny-lost' };

  const vimeo = buildVimeo(s);
  if (vimeo) return { ok: true, provider: 'vimeo', src: vimeo, allow: ALLOW_VIMEO };

  return { ok: false, reason: 'unknown' };
}

// Lo que el panel guarda en la BD: la URL limpia del reproductor. Si no
// reconoce ninguna plataforma guarda el texto tal cual, para no perder lo que
// Emi pegó — el aula lo vuelve a intentar al pintar y, si tampoco puede, avisa.
export function normalizeVideoUrl(input: unknown): string | null {
  const s = unwrap(input);
  if (!s) return null;
  return buildBunny(s) || buildVimeo(s) || String(input ?? '').trim();
}
