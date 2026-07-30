# Google — registro e indexación del sitio

Hasta ahora la web **nunca se dio de alta en Google**: no había `robots.txt`, ni
sitemap, ni canonical, ni propiedad en Search Console. Google podía llegar por su
cuenta, pero sin saber cuál es el dominio bueno, cuál es la versión en español y
cuál en inglés, ni qué páginas son privadas.

Este documento tiene dos partes: **lo que ya hace el código** (mergeado, no hay
que tocarlo) y **lo que Adrián tiene que hacer a mano una vez** en Google Search
Console — eso último no se puede automatizar desde el repo, porque exige una
cuenta de Google y acceso al DNS.

---

## El dominio canónico

Todo apunta a **`https://www.emilseriosacademy.com`**, **con `www`**.

En Vercel el ápice pelado (`emilseriosacademy.com`) responde **308** redirigiendo
a `www`. Si Google indexa el ápice, indexa una redirección. Y ya nos costó una vez:
el webhook de Stripe apuntaba al ápice y **todas** las entregas fallaban con 308
(ver la entrada del 18 jul en `PROGRESO.md`).

`astro.config.mjs` tenía todavía `site: 'https://membresias.emilserios.com'`, el
dominio que se abandonó. De ahí salen el canonical y el sitemap, así que estaba
listo para decirle a Google que se indexara un dominio que no existe. Ya está
corregido.

---

## Lo que ya hace el código

| Pieza | Dónde | Qué resuelve |
|---|---|---|
| `site` canónico | `astro.config.mjs` | Origen de canonical, hreflang y sitemap. |
| `robots.txt` | `public/robots.txt` | Abre `/` y `/en/`, cierra el aula, `/panel`, `/entrar`, `/gracias`, `/nueva-clave`, `/salir` y `/api`. Declara el sitemap. |
| `sitemap.xml` | `src/pages/sitemap.xml.ts` | Lista las dos URLs públicas con sus `hreflang`. Se hornea en el build. |
| `canonical` + `hreflang` | `Landing.astro` | Dice cuál es la URL buena y que `/` y `/en/` son la misma carta en dos idiomas (no contenido duplicado). |
| `robots: index, follow` | `Landing.astro` | Explícito en la carta. Las páginas privadas ya llevaban `noindex`. |
| Open Graph + Twitter | `Landing.astro` | Tarjeta con foto y texto al compartir el enlace por WhatsApp, X, etc. |
| JSON-LD | `Landing.astro` | `WebSite` + `Person` (Emilse) + `FAQPage` con las preguntas frecuentes ya visibles. |
| `GOOGLE_SITE_VERIFICATION` | `.env.example` → Vercel | Pinta el meta de verificación de propiedad, si se elige esa vía. |

### Por qué el precio NO va en los datos estructurados

Se marcó `FAQPage` pero **no** `Product`/`Offer`. La carta cambia el precio sola
en el navegador cuando vence la ventana de fundador (sin redeploy), así que un
precio horneado en el HTML en el build quedaría desfasado — y datos estructurados
con un precio distinto al visible es exactamente lo que Google descarta (y puede
costar la elegibilidad de todos los resultados enriquecidos del sitio). Si algún
día el precio deja de ser dinámico, se puede añadir.

---

## Lo que hay que hacer a mano (una vez)

### 1. Crear la propiedad en Search Console

Entra a <https://search.google.com/search-console> con la cuenta de Google del
proyecto y pulsa **Añadir propiedad**. Ofrece dos tipos:

- **Dominio** (`emilseriosacademy.com`) — **recomendado**. Cubre `www` y el ápice,
  `http` y `https`, y todos los subdominios de una vez. Se verifica **solo por DNS**.
- **Prefijo de URL** (`https://www.emilseriosacademy.com`) — cubre solo ese host
  exacto. Acepta más métodos de verificación, entre ellos la etiqueta meta.

Como el dominio se compró aparte justamente para tener el control del DNS (no
depende del tercero que maneja `emilserios.com`), la opción **Dominio** es la
buena.

### 2. Verificar la propiedad

**Vía A — DNS TXT (recomendada, no toca el código):**
1. Google te da un registro `TXT` tipo `google-site-verification=AbC123...`.
2. En el panel de DNS del dominio, añade un registro **TXT** en la raíz (`@`) con
   ese valor. Si el DNS lo lleva Vercel: proyecto → **Settings → Domains** →
   el dominio → **DNS Records**.
3. Vuelve a Search Console y pulsa **Verificar**. Puede tardar unos minutos en
   propagar; si falla, espera y reintenta — no borres el registro.

**Vía B — etiqueta meta (solo para propiedad de tipo "Prefijo de URL"):**
1. Google te da `<meta name="google-site-verification" content="AbC123..." />`.
2. En Vercel → **Settings → Environment Variables** añade
   `GOOGLE_SITE_VERIFICATION` con **solo** el valor del `content` (`AbC123...`),
   sin la etiqueta.
3. **Redeploy** (la variable se hornea en el build; sin redeploy no aparece).
4. Comprueba que salió: abre <https://www.emilseriosacademy.com>, ver código
   fuente, busca `google-site-verification`. Entonces pulsa **Verificar**.

> No borres la verificación después. Google la revisa cada tanto y si desaparece
> pierdes el acceso a la propiedad.

### 3. Enviar el sitemap

> **Antes de nada: esto solo funciona con el PR ya mergeado y desplegado.** El
> `sitemap.xml` se genera en el build, así que hasta que Vercel despliegue la
> rama esa URL responde **404** y Search Console contesta *"No se ha podido
> obtener el sitemap"*. Comprueba primero en el navegador que
> <https://www.emilseriosacademy.com/sitemap.xml> muestra el XML con las 2 URLs.

Search Console → **Sitemaps** → **Añadir un sitemap**. Qué escribir depende del
tipo de propiedad, y es fácil equivocarse:

| Tipo de propiedad | Qué muestra el campo | Qué escribir |
|---|---|---|
| **Dominio** (la recomendada) | Solo "Introduce la URL del sitemap", sin prefijo | La URL **completa**: `https://www.emilseriosacademy.com/sitemap.xml` |
| **Prefijo de URL** | El dominio en gris a la izquierda | Solo `sitemap.xml` |

Si el campo no lleva el dominio en gris delante, hay que poner la URL entera con
`https://` y con `www` — escribir solo `sitemap.xml` ahí da error.

Debe quedar en "Correcto" con **2 URLs descubiertas**. Si dice *"No se ha podido
obtener"*, abre la URL en el navegador: si carga bien, suele bastar con esperar y
pulsar de nuevo; si da 404, es que aún no está desplegada.

### 4. Pedir la indexación de las dos páginas

No hace falta esperar a que Google pase solo. También requiere el deploy hecho
(si la página no carga, Google no la indexa). En la barra superior de Search
Console (**Inspección de URLs**), pega cada una y pulsa **Solicitar indexación**:

- `https://www.emilseriosacademy.com/`
- `https://www.emilseriosacademy.com/en/`

Suele tardar entre unas horas y unos días. No hay forma de acelerarlo más, y
repetir la solicitud no ayuda.

### 5. Comprobar a la semana

- **Páginas** → deben aparecer las 2 como "Indexadas". Es normal (y correcto) que
  el aula, `/entrar`, `/panel` y compañía salgan como "Excluidas por noindex" o
  "Bloqueadas por robots.txt": son privadas a propósito.
- **Resultados enriquecidos** → debería detectar las **Preguntas frecuentes**.
- Busca `site:emilseriosacademy.com` en Google para ver qué tiene indexado.

---

## Verificaciones rápidas tras cada deploy

```
curl -s https://www.emilseriosacademy.com/robots.txt
curl -s https://www.emilseriosacademy.com/sitemap.xml
curl -s https://www.emilseriosacademy.com/ | grep -i "canonical\|hreflang\|og:"
```

Y para la tarjeta al compartir y los datos estructurados:

- <https://search.google.com/test/rich-results> — valida el JSON-LD.
- <https://developers.facebook.com/tools/debug/> — refresca la vista previa del
  enlace (WhatsApp y Facebook cachean; hay que forzar el scrape tras un cambio).

---

## Fuera de alcance (decisiones de Emi, no de código)

- **Google Analytics / Tag Manager**: no se instaló nada. Meter analítica
  implica consentimiento de cookies (RGPD) y ese es otro trabajo. Search Console
  ya da datos de búsqueda sin cookies ni banner.
- **Google Business Profile**: es para negocios locales con dirección; una
  membresía online no aplica.
- **Anuncios**: nada que ver con esto; el registro en Search Console es gratis y
  no cambia el posicionamiento por sí solo — solo permite que Google entienda e
  indexe bien el sitio.
