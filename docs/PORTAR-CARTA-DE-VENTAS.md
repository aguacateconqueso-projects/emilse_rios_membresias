# Cómo reproducir EXACTAMENTE la carta de ventas en otro proyecto

> **Qué es este archivo.** Un kit de trasplante. Se copia tal cual al repositorio
> de destino (`docs/PORTAR-CARTA-DE-VENTAS.md`) y se le dice a Claude allá:
> *«lee `docs/PORTAR-CARTA-DE-VENTAS.md` y reproduce la carta de ventas siguiendo
> la Ruta A (o la B)»*.
>
> **Origen:** repo `aguacateconqueso-projects/emilse_rios_membresias`, rama `main`.
> La carta es `src/components/membresia/Landing.astro` (~1400 líneas) y vive en
> `/` (español) y `/en/` (inglés).

---

## 0. Por qué «copiar el git» no alcanzó

La carta **no es un archivo**. Es un archivo *más* una capa de recursos servidos
desde la raíz del sitio *más* un módulo de lógica *más* tres variables de entorno.
Si se copia solo el componente, el navegador pide seis archivos que no existen,
falla en silencio (los `404` de CSS e imágenes no rompen nada, solo dejan de
pintar) y el resultado es una página con el mismo texto y ningún diseño.

Y hay un fallo peor, el que probablemente estás viendo: **si el JavaScript no
corre, la mitad de la carta queda invisible**. Todo bloque con `class="reveal"`
arranca en `opacity: 0` y solo se enciende cuando el script lo revela. Sin script,
se ve el logo y nada más. No es que se copiara mal: es que falta el script.

Por eso la regla de este documento es una sola:

> ### 🔒 REGLA DE ORO
> **No reescribir la carta. Trasplantarla.** Copiar los archivos **byte a byte**
> y después adaptar solo los enlaces. Cualquier intento de «rehacerla parecida»
> pierde las animaciones, que es justo lo que se quiere conservar.

---

## 1. Inventario: los 8 archivos que hay que traer

| # | Archivo en el repo origen | Va en destino | Qué aporta | ¿Obligatorio? |
|---|---|---|---|---|
| 1 | `src/components/membresia/Landing.astro` | el componente/página | **Todo**: copy bilingüe, markup, CSS (400 líneas) y 5 scripts | ✅ sí |
| 2 | `public/colors_and_type.css` | raíz del sitio → `/colors_and_type.css` | tipografías (Hanken Grotesk / Space Grotesk vía Google Fonts) y tokens base | ✅ sí |
| 3 | `public/img/foto.jpg` | `/img/foto.jpg` | retrato de Emi del hero (también es la imagen de `og:image`) | ✅ sí |
| 4 | `public/img/logo_emi_alpha.png` | `/img/logo_emi_alpha.png` | logo caligráfico del hero | ✅ sí |
| 5 | `public/img/clef-cursor.svg` | `/img/clef-cursor.svg` | cursor de clave de fa (versión oscura) | ✅ sí |
| 6 | `public/img/clef-cursor-light.svg` | `/img/clef-cursor-light.svg` | cursor de clave de fa (versión clara, fondos oscuros) | ✅ sí |
| 7 | `public/emi-city.jpg` | `/emi-city.jpg` | respaldo del `onerror` de la foto | ⚠️ opcional |
| 8 | `src/lib/membership.ts` | `src/lib/membership.ts` | fechas de apertura/cierre + URL del newsletter | ⚠️ solo Ruta A |

**No** hace falta traer: `src/components/Analitica.astro` (analítica y banner de
cookies — es del sitio de la membresía, no de la web nueva), nada de
`src/pages/api/`, nada de `supabase/`, ni `stripe`.

### Cómo sacar los archivos si ya tienes el git copiado

Los objetos ya están en tu clon. No hace falta descargar nada:

```bash
# Ver qué referencia tiene la carta
git log --oneline -1 -- src/components/membresia/Landing.astro

# Extraer cada archivo a su sitio nuevo (ajusta las rutas de destino)
git show main:src/components/membresia/Landing.astro > src/pages/carta.astro
git show main:public/colors_and_type.css              > public/colors_and_type.css
git show main:public/img/clef-cursor.svg              > public/img/clef-cursor.svg
git show main:public/img/clef-cursor-light.svg        > public/img/clef-cursor-light.svg
git show main:public/img/foto.jpg                     > public/img/foto.jpg
git show main:public/img/logo_emi_alpha.png           > public/img/logo_emi_alpha.png
git show main:public/emi-city.jpg                     > public/emi-city.jpg
```

Si el git **no** está copiado, agrega el origen como remoto y repite lo mismo
contra `carta/main`:

```bash
git remote add carta https://github.com/aguacateconqueso-projects/emilse_rios_membresias.git
git fetch carta main
git show carta/main:src/components/membresia/Landing.astro > src/pages/carta.astro
```

> ⚠️ **Comprueba los binarios.** `git show` sobre un `.jpg`/`.png` funciona, pero
> verifica los tamaños después: `foto.jpg` ≈ 628 KB, `logo_emi_alpha.png` ≈ 152 KB,
> `emi-city.jpg` ≈ 272 KB. Si salen de 0 bytes o de unos pocos KB, el archivo se
> corrompió y hay que copiarlo con `cp` desde el otro clon.

---

## 2. Ruta A — el proyecto de destino **también es Astro**

Es el caso fácil. La carta entra casi sin tocar nada.

1. **Copia los 8 archivos** con los comandos de arriba, respetando las rutas de
   `public/` (en Astro todo lo de `public/` se sirve desde la raíz, así que
   `public/img/foto.jpg` se pide como `/img/foto.jpg`).

2. **Monta la página.** Igual que en el origen, con un envoltorio de 4 líneas:

   ```astro
   ---
   // src/pages/index.astro  (o donde vaya la carta)
   import Landing from '../components/membresia/Landing.astro';
   ---
   <Landing lang="es" />
   ```

   Y para la versión en inglés, `src/pages/en/index.astro` con `lang="en"`.

   > `Landing.astro` **imprime el documento completo** (`<!DOCTYPE html>`, `<head>`,
   > `<body>`). No lo metas dentro de un `Layout.astro` que ya imprima `<html>`:
   > saldrían dos documentos anidados. Si el proyecto nuevo tiene layout propio,
   > hay que decidir: o la carta va suelta (recomendado, es una landing) o hay que
   > partirla, y entonces el `<style>` y los `<script>` tienen que subir al layout.

3. **Quita lo que no aplica** dentro de `Landing.astro`:
   - `import Analitica from '../Analitica.astro'` y la línea `<Analitica lang={lang} />`
     del final del `<body>` — salvo que quieras traer también ese componente.
   - El import de `../../lib/membership` si no traes ese módulo. En ese caso
     define las constantes a mano arriba del archivo (ver punto 5).

4. **Ajusta `site` en `astro.config.mjs`.** De ahí salen el `<link rel="canonical">`,
   los `hreflang` y la URL de la imagen para compartir. Si apunta al dominio
   equivocado, Google indexa el dominio equivocado.

5. **Revisa los enlaces salientes.** Están todos en el bloque de copy (`const t = ...`):
   `payHref: '/api/checkout?lang=es'` (y `en`), el enlace «Entrar» de la píldora
   (`/entrar/`), y `NEWSLETTER_URL`. Si en el proyecto nuevo no existe
   `/api/checkout`, apunta los botones a donde corresponda (ver punto 5).

---

## 3. Ruta B — el proyecto de destino **NO es Astro**

(HTML plano, WordPress, Next, Webflow, lo que sea.) La carta se puede portar
igual, porque el 95% de lo que la hace verse así es CSS y JS sin dependencias.
Hay que traducir tres cosas de Astro a HTML normal:

| Cosa de Astro | Qué es | Cómo se traduce |
|---|---|---|
| `<style is:inline>` | un `<style>` que Astro deja **intacto** | un `<style>` normal en el `<head>`, o un `.css` enlazado |
| `<script is:inline>` | un `<script>` que Astro **no empaqueta** | un `<script>` normal antes de `</body>` |
| `{t.algo}` y `{lista.map(...)}` | plantillas | escribir el HTML resultante a mano, o el equivalente en tu motor |

**El orden importa y es este:**

```html
<head>
  <link rel="stylesheet" href="/colors_and_type.css">   <!-- primero: fuentes y tokens -->
  <style> /* … las 400 líneas del bloque <style is:inline> de Landing.astro … */ </style>
</head>
<body>
  <!-- markup -->
  <script> /* … los scripts, tal cual … */ </script>
</body>
```

> ⚠️ **`is:inline` no es decorativo.** Sin él Astro *scopea* el CSS: le añade un
> atributo `data-astro-cid-…` a cada selector y a cada elemento del componente.
> Eso rompe tres cosas de golpe: las reglas sobre `:root` y `body` (que no son del
> componente), las reglas sobre `.note-pop` (las notas musicales se crean con JS y
> se cuelgan de `document.body`, fuera del componente) y `@keyframes`. Resultado:
> fondo blanco en vez de crema, sin cursor de clave, y notas invisibles. Si el
> destino es Astro y decides quitar `is:inline`, **no lo hagas**.

**Extra para Ruta B:** el `<script is:inline define:vars={{…}}>` pasa variables
del servidor al navegador. Al traducirlo, reemplaza esas variables por sus
valores literales al principio del script (`var closesAt = "2026-09-02T23:59:59+02:00";`).

---

## 4. Inventario de animaciones — qué tiene que verse

Esta es la lista contra la que se verifica. Si falta una, está identificado el
archivo culpable.

### 4.1 · Botón de tinta que crece desde el cursor ⭐ (la principal)

El gesto de la carta. Al pasar el cursor, un círculo de tinta crece **desde el
punto exacto donde entró el cursor**, el texto se invierte a crema y la flecha se
desliza 6 px a la derecha. Además el botón es levemente **magnético**: se
desplaza hasta 8 px siguiendo al cursor.

**Markup obligatorio** (los tres `<span>` no son opcionales):

```html
<a class="btn btn--pay" href="…">
  <span class="btn__fill" aria-hidden="true"></span>
  <span class="btn__label">EMPEZAR AHORA</span>
  <span class="btn__ar" aria-hidden="true">→</span>
</a>
```

**CSS** (de `Landing.astro`, verbatim):

```css
.btn { --fill: var(--ink); --fg: var(--ink); --fg-hover: var(--paper); --mx: 50%; --my: 50%;
       position: relative; isolation: isolate; overflow: hidden;
       display: inline-flex; align-items: center; justify-content: center; gap: 12px;
       background: transparent; color: var(--fg);
       text-decoration: none; font-family: var(--font-body), system-ui, sans-serif; font-weight: 600;
       font-size: 0.92rem; letter-spacing: 0.16em; text-transform: uppercase;
       padding: 20px 46px; border: 1.5px solid currentColor; border-radius: 0; cursor: inherit;
       transition: color 360ms cubic-bezier(.22,1,.36,1), border-color 360ms ease,
                   transform 420ms cubic-bezier(.22,1,.36,1); will-change: transform; }
.btn__fill { position: absolute; top: var(--my); left: var(--mx); width: 260%; aspect-ratio: 1; z-index: -1;
             background: var(--fill); border-radius: 50%; transform: translate(-50%, -50%) scale(0);
             transition: transform 560ms cubic-bezier(.22,1,.36,1); }
.btn__label, .btn__ar { position: relative; z-index: 1; }
.btn__ar { transition: transform 360ms cubic-bezier(.22,1,.36,1); }
.btn, .btn:hover { text-decoration: none; }
.btn:hover { color: var(--fg-hover); }
.btn:hover .btn__fill { transform: translate(-50%, -50%) scale(1); }
.btn:hover .btn__ar { transform: translateX(6px); }
.btn:active { transform: translateY(1px) scale(0.99); }
.cta:not(.cta--inbox) .btn { min-width: min(420px, 80%); }
```

**JS** — lo único que hace es escribir `--mx` / `--my` con la posición del cursor:

```js
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine   = window.matchMedia('(pointer: fine)').matches;
document.querySelectorAll('.btn').forEach(function (btn) {
  btn.addEventListener('pointermove', function (e) {
    var r = btn.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    btn.style.setProperty('--mx', x + 'px');
    btn.style.setProperty('--my', y + 'px');
    if (fine && !reduce) {                                  // magnético
      var dx = (x - r.width / 2) / r.width, dy = (y - r.height / 2) / r.height;
      btn.style.transform = 'translate(' + (dx * 8).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
    }
  });
  btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
});
```

**Tres detalles que la gente rompe al copiar:**
- `isolation: isolate` en `.btn` **+** `z-index: -1` en `.btn__fill`. Es lo que
  mantiene el círculo *detrás del texto pero dentro del botón*. Sin `isolation`,
  el círculo se va detrás del fondo de la página y no se ve.
- `overflow: hidden` en `.btn`. Sin eso, el círculo (que mide 260% del ancho) se
  desborda y tapa media pantalla.
- `.btn__label` y `.btn__ar` necesitan `position: relative; z-index: 1` o el
  relleno los tapa.

### 4.2 · Notas musicales de colores 🎵

Mientras el cursor está encima de un botón, salen 2–3 notas (`♪ ♫ ♩ ♬`) en
colores, cada 460 ms, que flotan hacia arriba y se desvanecen.

```css
.note-pop { position: fixed; z-index: 60; pointer-events: none; font-weight: 700;
            will-change: transform, opacity; animation: notefloat 1s ease-out forwards; }
@keyframes notefloat {
  0%   { opacity: 0; transform: translate(0, 0) scale(0.6) rotate(0deg); }
  18%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx, 0), -66px) scale(1.15) rotate(var(--rot, 0deg)); }
}
```

```js
if (!reduce && fine) {
  var GLYPHS = ['♪', '♫', '♩', '♬'];
  var COLORS = ['#a94f2b', '#6b3f2a', '#c9a24a', '#7a8b5a', '#4a6d8c', '#b5504a'];
  function pop(btn) {
    var r = btn.getBoundingClientRect();
    var count = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.className = 'note-pop';
      s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      s.style.left = (r.left + 12 + Math.random() * (r.width - 24)) + 'px';
      s.style.top  = (r.top + r.height * 0.3) + 'px';
      s.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      s.style.fontSize = (15 + Math.random() * 13) + 'px';
      s.style.setProperty('--dx',  ((Math.random() * 2 - 1) * 46).toFixed(0) + 'px');
      s.style.setProperty('--rot', ((Math.random() * 2 - 1) * 40).toFixed(0) + 'deg');
      document.body.appendChild(s);
      s.addEventListener('animationend', function () { this.remove(); });
    }
  }
  document.querySelectorAll('.btn').forEach(function (btn) {
    var timer = null;
    btn.addEventListener('pointerenter', function () {
      pop(btn); timer = setInterval(function () { pop(btn); }, 460);
    });
    btn.addEventListener('pointerleave', function () { if (timer) { clearInterval(timer); timer = null; } });
  });
}
```

> Las notas se cuelgan de `document.body` con `position: fixed`. Por eso el CSS de
> `.note-pop` **no puede estar scopeado** (ver el aviso de `is:inline`), y por eso
> el `z-index: 60` tiene que ganarle a lo que haya en el sitio nuevo.

### 4.3 · Fundido al hacer scroll (`.reveal`) ⚠️ el que rompe la página

Cada bloque de la carta entra desde 20 px abajo, desvaneciéndose hacia visible,
cuando llega al viewport.

```css
.reveal { opacity: 0; transform: translateY(20px);
          transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1); }
.reveal.is-visible { opacity: 1; transform: none; }
```

```js
var revs = document.querySelectorAll('.reveal');
if (reduce || !('IntersectionObserver' in window)) {
  revs.forEach(function (el) { el.classList.add('is-visible'); });
} else {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  revs.forEach(function (el) { io.observe(el); });
}
```

> 🚨 **Si este script no corre, la carta entera se queda invisible.** Es el fallo
> número uno al portar. Recomendación fuerte para el proyecto nuevo: añade la red
> de seguridad que ya usa `public/membresia-ui.js` en el sitio origen —
> `setTimeout(function(){ document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('is-visible'); }); }, 1400);`
> Así, pase lo que pase, a 1,4 s el contenido aparece.

### 4.4 · Cursor de clave de fa

Todo el sitio usa un cursor SVG con forma de clave de fa (la del contrabajo), y
sobre fondo oscuro cambia a su versión clara.

```css
body { cursor: url('/img/clef-cursor.svg') 11 13, auto; }
.pricecard:hover, .pricecard:hover * { cursor: url('/img/clef-cursor-light.svg') 11 13, auto; }
.btn:hover { cursor: url('/img/clef-cursor-light.svg') 11 13, auto; }
.pricecard:hover .btn:hover { cursor: url('/img/clef-cursor.svg') 11 13, auto; }  /* excepción */
```

- `11 13` es el **hotspot** (la punta activa). Sin esos números el clic se siente
  descuadrado.
- El `, auto` final **no es opcional**: Chrome descarta la regla entera si falta
  el valor de respaldo.
- Los SVG están en `public/img/`. Son 8 líneas; si hiciera falta rehacerlos, este
  es el oscuro (`#1a1712`); el claro es idéntico con `#faf7f1`:

  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
    <path d="M11 15 C11 10 18 9 22 13 C26 17 23 25 14 30 C11 31.6 8 32 5.5 32"
          fill="none" stroke="#1a1712" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="12" cy="13.5" r="3.7" fill="#1a1712"/>
    <circle cx="27" cy="12" r="1.9" fill="#1a1712"/>
    <circle cx="27" cy="19" r="1.9" fill="#1a1712"/>
  </svg>
  ```

### 4.5 · La foto: blanco y negro → color al pasar el cursor

Sube 4 px, gana color y la sombra se agranda. **Solo en escritorio**: en táctil se
ve siempre a color, porque sin hover se quedaría en gris para siempre.

```css
.photo { margin: 0 auto clamp(46px, 8vw, 66px); width: clamp(190px, 48vw, 250px); }
.photo img { width: 100%; height: auto; border-radius: 0;
             box-shadow: 0 26px 56px -12px rgba(23, 20, 15, 0.34), 0 10px 20px -8px rgba(23, 20, 15, 0.22);
             transition: filter 0.7s ease, box-shadow 0.5s ease, transform 0.5s ease; }
@media (hover: hover) {
  .photo img { filter: grayscale(1) contrast(1.02); }
  .photo img:hover { filter: grayscale(0);
                     box-shadow: 0 34px 70px -14px rgba(23, 20, 15, 0.4), 0 12px 24px -8px rgba(23, 20, 15, 0.24);
                     transform: translateY(-4px); }
}
```

```html
<figure class="photo reveal">
  <img src="/img/foto.jpg" alt="Emilse Rios" onerror="this.onerror=null;this.src='/emi-city.jpg';" />
</figure>
```

### 4.6 · Tarjeta de precio que se invierte a negro

Al pasar el cursor por encima, la tarjeta entera pasa de blanco/tinta a
tinta/crema en 450 ms — y **todo lo que hay dentro se invierte con ella**: los
bordes internos, el eco en cursiva del nombre, la letra pequeña, el contador, y
el botón (que cambia su relleno a crema para seguir viéndose).

```css
.pricecard { width: min(940px, 96vw);
             margin-left: calc((100% - min(940px, 96vw)) / 2);
             margin-right: calc((100% - min(940px, 96vw)) / 2);
             border: 1.5px solid var(--ink); border-radius: 0; overflow: hidden;
             background: #fff; color: #17140f;
             display: grid; grid-template-columns: 1.05fr 0.95fr;
             transition: background 0.45s ease, color 0.45s ease; }
.pricecard:hover { background: var(--ink); color: var(--paper); }
.pricecard:hover .pricecard__left { border-right-color: rgba(250, 247, 241, 0.18); }
.pricecard:hover .pricecard__name .echo { color: rgba(250, 247, 241, 0.7); }
.pricecard:hover .pricecard__fine { color: rgba(250, 247, 241, 0.6); }
.pricecard:hover .pricecard__foot { border-top-color: rgba(250, 247, 241, 0.18); }
/* el botón adentro usa la paleta contraria */
.pricecard:hover .btn { --fill: var(--paper); --fg: var(--paper); --fg-hover: var(--ink); }
@media (max-width: 620px) {
  .pricecard { grid-template-columns: 1fr; }
  .pricecard__left { border-right: 0; border-bottom: 1px solid rgba(23, 20, 15, 0.14); }
  .pricecard:hover .pricecard__left { border-bottom-color: rgba(250, 247, 241, 0.18); }
}
```

> Detalle fácil de perder: `.pricecard__foot` lleva `max-width: none`. Hace falta
> porque `colors_and_type.css` pone `p { max-width: var(--measure) }` a todos los
> párrafos del sitio, y sin anularlo la fila de abajo no se centra de verdad.

### 4.7 · Hovers en marrón de instrumento

Es el **único** acento de color de texto de la carta: `--wood: #6b3f2a`. Lo usan
la frase de apertura (`.lede`), el rótulo del video (`.videolead`),
`«¿Necesitas ayuda…?»` (`.needhelp`), el título puente (`.whyh`), el mensaje
final (`.finalmsg`), las preguntas de la FAQ (`.qa summary:hover`) y el enlace del
newsletter del contador (`.timer__news`). Todos con `transition: color 0.4s ease`.

### 4.8 · FAQ desplegable

`<details class="qa">` nativo, con el marcador del navegador oculto y un `+` que
pasa a `–` al abrirse; la respuesta entra con un fundido corto.

```css
.qa summary { list-style: none; padding: clamp(15px,3vw,19px) 2em clamp(15px,3vw,19px) 0;
              position: relative; font-weight: 600; line-height: 1.4; }
.qa summary::-webkit-details-marker { display: none; }
.qa summary::after { content: "+"; position: absolute; right: 0; top: 50%; transform: translateY(-50%);
                     font-size: 1.4em; line-height: 1; color: var(--ink); transition: transform 0.25s ease; }
.qa[open] summary::after { content: "–"; }
.qa__a { margin: 0; padding: 0 0 clamp(15px,3vw,19px); color: var(--ink); animation: faqin 0.32s ease; }
@keyframes faqin { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
```

### 4.9 · Cambio de idioma sin volver al inicio

La píldora ES/EN de arriba a la derecha no es un enlace normal. Al pulsarla:
guarda en `sessionStorage` **en qué bloque** estás y a cuántos píxeles de su
inicio, hace fade-out de la página (300 ms), navega, y en la otra página restaura
la posición equivalente y hace fade-in. Se ancla al bloque y no al `scrollY`
porque el texto mide distinto en cada idioma.

Necesita las tres piezas: el `<script is:inline>` del `<head>` (que pre-oculta
con `html.lang-enter` para que no parpadee), el CSS (`.page.is-leaving { opacity: 0 }`
y `html.lang-enter .page { opacity: 0 }`) y el script final del `<body>` con los
`[data-lang-switch]`. **Si el sitio nuevo tiene una sola página o un idioma solo,
esto sobra entero** — bórralo, es la parte más segura de quitar.

### 4.10 · Contador y estado de puertas

Bajo cada botón de pago hay un contador (`d h m s`) que se apaga solo. El estado
lo manda el atributo `data-doors` en `<main>`, con tres valores: `soon`
(falta para el cierre → botones vivos + contador), `closed` (botones muertos, sin
`href`, y salida al newsletter) y `open` (no hay cierre a la vista → el bloque
desaparece).

**Si la web nueva no vende con puertas, esto no aplica.** Ver punto 5.

### 4.11 · Píldora de idioma flotante

Fija arriba a la derecha, con `backdrop-filter: blur(14px) saturate(1.4)` sobre
crema translúcido. Incluye el separador y el enlace «Entrar» para miembros que
vuelven.

### 4.12 · Cosas menores pero que se notan

- `::selection { background: var(--ink); color: var(--paper); }` — seleccionar
  texto lo pinta en negativo.
- `.month__beauty` — «her mo so» centrado, en marrón, con `letter-spacing: 0.22em`
  y `word-spacing: 0.5em`, para que se lea tan lento como se dice.
- `text-wrap: balance` en titulares y `text-wrap: pretty` en párrafos.
- **Todo el bloque `@media (prefers-reduced-motion: reduce)`**: quien tenga las
  animaciones desactivadas en su sistema ve la carta quieta y completa. No lo
  borres al copiar.

---

## 5. La paleta y las variables (por si hay que reconstruir algo)

```css
:root {
  --ink:    #17140f;   /* casi negro, cálido — texto y rellenos */
  --paper:  #faf7f1;   /* crema muy suave — el lienzo */
  --soft:   #6f6a61;   /* gris de notas menores y footer */
  --accent: #a94f2b;   /* terracota — acento puntual */
  --accent-strong: #8f4222;
  --wood:   #6b3f2a;   /* marrón del instrumento — hovers de texto */
  --measure: 680px;    /* ancho de la columna de lectura */
  --edge: clamp(22px, 6vw, 40px);
}
body {
  font-family: var(--font-body), system-ui, sans-serif;   /* Hanken Grotesk */
  font-size: clamp(17px, 0.4vw + 16px, 19px);
  line-height: 1.66;
}
```

**`--font-body` viene de `colors_and_type.css`**, que a su vez importa la fuente
de Google Fonts en su primera línea:

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
```

Si `colors_and_type.css` no carga, `--font-body` queda sin definir, cae a
`system-ui` y **la carta se ve completamente distinta aunque todo lo demás esté
bien**. Es el segundo fallo más común.

Anchos, de menor a mayor: columna de lectura `680px` → video `min(780px, 94vw)`
→ cuadro comparativo `min(880px, 94vw)` → tarjeta de precio `min(940px, 96vw)`.
Los tres últimos rompen la columna con el truco
`margin-left: calc((100% - ANCHO) / 2)` a ambos lados.

---

## 6. Lo que hay que desconectar en el proyecto nuevo

La carta original está cableada al sitio de la membresía. En otro proyecto, estos
son los cinco cables sueltos y qué hacer con cada uno:

| Cable | Dónde | Qué hacer si no existe en el destino |
|---|---|---|
| `payHref: '/api/checkout?lang=es'` | en el bloque `const t = {…}`, dos veces (es/en) | apuntar al checkout real, a un `mailto:` o a un formulario |
| `NEWSLETTER_URL` | `src/lib/membership.ts` | dejar la URL de Klaviyo tal cual (sigue siendo válida) o cambiarla |
| `CLOSES_AT` / `REOPENS_AT` | `src/lib/membership.ts` + `<main data-doors>` | poner `data-doors="open"` fijo y borrar los `<p class="timer">` |
| `STRIPE_FOUNDER_UNTIL` | variable de entorno, con el script del flip de precio | escribir el precio a mano en el markup y borrar ese `<script is:inline define:vars>` |
| `/entrar/` en la píldora | markup de `.langpill` | borrar el `<a class="langpill__enter">` y el `<span class="langpill__sep">` |

Variables de entorno que la carta lee (todas opcionales — hay valores por defecto):
`STRIPE_FOUNDER_UNTIL`, `MEMBERSHIP_CLOSES_AT`, `MEMBERSHIP_REOPENS_AT`,
`GOOGLE_SITE_VERIFICATION`, `PUBLIC_GA_MEASUREMENT_ID` (esta última solo si traes
`Analitica.astro`).

---

## 7. Diagnóstico por síntoma

| Lo que ves | Causa casi segura |
|---|---|
| **La página está casi vacía**, solo se ve el logo | el script del `.reveal` no corre. Mira la consola: seguro hay un error *antes*. O el `<script>` quedó empaquetado y falló el import. |
| Tipografía genérica, fondo blanco | `colors_and_type.css` da 404, o el `<link>` no está antes del `<style>` |
| Los botones no se rellenan | falta el `<span class="btn__fill">` dentro del `<a class="btn">`, o falta `isolation: isolate` / `z-index: -1` |
| El relleno se desborda por toda la pantalla | falta `overflow: hidden` en `.btn` |
| El relleno tapa el texto del botón | falta `position: relative; z-index: 1` en `.btn__label` y `.btn__ar` |
| El relleno siempre nace del centro | el JS no está escribiendo `--mx` / `--my` |
| No salen las notas musicales | CSS scopeado (falta `is:inline`), o `pointer: fine` es falso (estás en táctil), o `prefers-reduced-motion` activo |
| Cursor normal en vez de clave de fa | los SVG dan 404, o falta el `, auto` de respaldo, o falta el hotspot `11 13` |
| La foto sale a color siempre | estás en un dispositivo táctil — es a propósito (`@media (hover: hover)`) |
| La foto no carga | `foto.jpg` corrupto por `git show` sobre binario; el `onerror` cayó a `/emi-city.jpg` |
| La tarjeta de precio no se invierte | `.pricecard:hover` presente pero sin `transition`, o algo tapa el hover |
| Fila inferior de la tarjeta descentrada | falta `max-width: none` en `.pricecard__foot` |
| Sale un `0 d` permanente en el contador | falta la regla `.timer__u[hidden] { display: none; }` |
| Doble `<html>` anidado | metiste `Landing.astro` dentro de un layout que ya imprime el documento |

---

## 8. Checklist de verificación (hacer al terminar)

Escritorio, ventana ~1280×900:

- [ ] El fondo es crema `#faf7f1`, no blanco.
- [ ] La tipografía es Hanken Grotesk (redondeada), no la del sistema.
- [ ] El cursor es una clave de fa en toda la página.
- [ ] Logo y foto cargan; la foto está en blanco y negro.
- [ ] Al pasar el cursor por la foto: gana color, sube un poco, la sombra crece.
- [ ] Al bajar, **cada bloque entra con fundido** desde abajo (no aparecen todos de golpe ni faltan).
- [ ] Al pasar el cursor por un botón: la tinta crece **desde donde entró el cursor**, no desde el centro.
- [ ] Salen notas musicales de colores mientras el cursor sigue encima.
- [ ] La flecha `→` se desliza a la derecha.
- [ ] El botón se mueve un poquito siguiendo al cursor (magnético).
- [ ] Al pasar el cursor por la tarjeta de precio: se invierte a negro **entera**, incluido el botón de adentro.
- [ ] La FAQ abre y cierra, y el `+` pasa a `–`.
- [ ] Seleccionar texto lo pinta en negativo.
- [ ] Hover sobre la frase de apertura, el mensaje final y las preguntas: pasan a marrón.

Móvil (≤ 560 px):

- [ ] El cuadro comparativo pasa a una columna.
- [ ] La tarjeta de precio pasa a una columna, con el borde interno abajo en vez de a la derecha.
- [ ] Los botones ocupan el ancho (`display: block`).
- [ ] La foto se ve a color (correcto: no hay hover).

Accesibilidad:

- [ ] Con «reducir movimiento» activado en el sistema: **se ve todo el contenido**, sin fundidos, sin notas, sin magnetismo.
- [ ] Con JavaScript desactivado: se ve todo el contenido (si añadiste la red de seguridad del punto 4.3, el `<noscript>` que revele `.reveal`, o al menos comprobaste que no queda en blanco).

---

## 9. Si aun así no queda igual

La comparación honesta es lado a lado. Abre la carta original
(`https://www.emilseriosacademy.com/`) y la nueva en dos ventanas del mismo
tamaño y compara sección por sección con la lista del punto 4. Cuando algo no
cuadre, **vuelve al archivo original y copia ese bloque otra vez** en vez de
ajustarlo a ojo: cada número de este diseño (los `cubic-bezier`, los `560ms`, el
`260%`, el `-66px`) está elegido, y aproximarlo se nota.
