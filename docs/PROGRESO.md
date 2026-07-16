# Progreso — Membresía "Estudiemos Juntos"

> Bitácora para retomar el proyecto en cualquier sesión/chat. Es la fuente de
> verdad del estado. Si retomas en un chat nuevo, lee esto primero + `docs/ARQUITECTURA.md`.

## 🗓️ Trabajo de hoy (16 jul 2026) — checklist en curso
> Un cambio por rama/PR desde `main`, según el flujo con Adrián. La marca del checklist
> viaja en el mismo PR de cada punto.
> **Hechos y MERGEADOS hoy:** punto **2** (saludo sin nombre, PR #27), puntos **3 + 4 + 12
> (pestañas)** (PR #28), punto **5** (identidad visual de la carta, PR #30), punto **7**
> (ingreso con **correo + contraseña**, fuera el enlace mágico, casilla "mantener sesión",
> `/nueva-clave/`, PR #31), punto **8** (el webhook envía el correo de bienvenida al pagar,
> PR #32), **8b** (correo de bienvenida **bilingüe ES/EN** por Resend + `/nueva-clave/en/`,
> PR #33) y punto **9** (página de agradecimiento bilingüe `/gracias/` + `/gracias/en/`, el
> `success_url` del checkout ya apunta ahí en vez de a `/entrar/?pago=ok`, PR #34).
> Pendientes el resto (ver abajo). **Próxima sesión:** lo natural es el **punto 11** (selector de
> destino del video en `/panel`) para que Concepto Base y Bonus Material muestren contenido real.

- [ ] **1. Corregir el copy de la página de ventas.** No se copió textual: la *estructura*
      está bien, pero hay frases que quedaron distintas al texto que pasó Adrián. Adrián
      pasará el texto correcto más tarde para reemplazar frase por frase (sin tocar la
      estructura).
- [x] **2. Quitar la personalización del nombre en `/aula`.** ✅ Hecho. El saludo ya no dice
      "Hola, {nombre} ·"; ahora es solo "Tu ejercicio de esta semana" / "Your exercise this week".
      Se quitó el nombre del `eyebrow` estático (ES/EN) y del `greeting` de JS en `Aula.astro`
      (ya no interpola `full_name`/email). Verificado en el build.
- [x] **3. Nuevo modelo de contenido: "Concepto Base" mensual.** ✅ Diseño hecho (maqueta). El
      Concepto Base es ahora una **pestaña propia** en el aula (ver punto 12). Muestra video
      (ES/EN) + descripción + "de qué va", con la idea de que los ejercicios semanales se apoyan
      en él. ⬜ Falta conectarlo a la BD (junto al punto 11).
- [x] **4. Apartado "Bonus Material" en el aula.** ✅ Diseño hecho (maqueta). Es una **pestaña**
      con grilla de tarjetas (media + título + descripción + ES·EN). La primera tarjeta es el
      **video de bienvenida** de Emi. ⬜ Falta conectarlo a la BD (junto al punto 11).
- [x] **5. Unificar el diseño de la página de ventas con aula y panel** (estilo de botones, etc.).
      ✅ Hecho. Se creó una **capa de diseño compartida** (`public/membresia-ui.css` +
      `public/membresia-ui.js`) con la identidad de la CARTA de ventas y se aplicó a **aula,
      panel y `/entrar`**: lienzo **crema** (`#faf7f1`) + tinta cálida (`#17140f`) en vez de
      blanco/negro puro; **una sola tipografía** (Hanken Grotesk — los `.display`/`h1..h5` que
      usaban Space Grotesk ahora apuntan a Hanken como la carta); **logo caligráfico**
      (`logo_emi_alpha.png`) reemplaza el «Emilse Rios» en texto de las barras/gate (con
      fallback a texto si el PNG no carga); **botones editoriales cuadrados** con relleno de
      tinta que crece **desde la posición del cursor** + notas musicales de colores al hover +
      magnético (los mismos de la carta); **cursor de clave de fa** (con versión clara sobre
      fondos oscuros: reproductor, respuestas de Emi, botón sólido); barras superiores en vidrio
      esmerilado crema; y **fundido al entrar** (reveal) en los encabezados/tarjetas del aula.
      El JS compartido "mejora" también los botones **creados dinámicamente** (tabla del panel,
      foro) y re-inyecta el relleno cuando un botón cambia su texto en caliente
      (`btn.textContent`), vía un MutationObserver. Verificado con `npm run build` y capturas
      headless de `/entrar` y el gate del panel. Las páginas ya no definen su propia paleta ni
      sus botones: los toman de la capa compartida para no volver a desalinearse.
- [ ] **6. Poder borrar ejercicios pasados desde `/panel`.** Hoy solo se les puede poner fecha
      de fin, no borrarlos; hay 3 de prueba ocupando espacio. Agregar borrado real.
- [x] **7. Cambiar la dinámica de ingreso al aula: usuario y contraseña.** ✅ Hecho (CÓDIGO).
      Se **eliminó el enlace mágico**: `/entrar` ahora es **correo + contraseña**
      (`signInWithPassword`) con casilla **"Mantener la sesión iniciada"**. La casilla controla
      DÓNDE se guarda la sesión (adaptador de almacenamiento en `src/lib/supabase.ts`):
      **localStorage** si se recuerda (sobrevive al cerrar el navegador) o **sessionStorage** si
      no (se borra al cerrar). La preferencia se escribe en `erm_remember` ANTES de iniciar
      sesión para que el token quede en el almacén correcto. **Primera clave / recuperación:**
      como el pago es anónimo (la cuenta se crea sin contraseña), se añadió el flujo elegido
      **"correo → crear clave"**: desde `/entrar` el enlace **«Crea o restablece tu contraseña»**
      envía un correo (`resetPasswordForEmail`) con un enlace de un solo uso a la **nueva página
      `/nueva-clave/`**, que fija la contraseña (`updateUser`) y entra. Sirve igual para la
      primera vez y para **«Olvidé mi contraseña»**. Se actualizó la red de seguridad de la
      landing (enlaces `type=recovery` → `/nueva-clave/`), el aviso de `?pago=ok` en `/entrar`, y
      `src/lib/auth.ts` (fuera `sendMagicLink`, entran `signIn` + `sendPasswordSetup`).
      ⚠️ **Config pendiente en Supabase** (no es código): en **Authentication → URL Configuration**
      agregar `https://emilseriosacademy.com/nueva-clave/` (o un comodín del dominio) a **Redirect
      URLs**, o el enlace del correo será rechazado. El **envío automático** del correo al pagar es
      el **punto 8** (por ahora el miembro nuevo lo pide él mismo desde `/entrar`); ahí también se
      puede afinar la plantilla del correo de recuperación para que diga "crea tu contraseña".
- [x] **8. Mail de bienvenida con link para entrar al aula.** ✅ Hecho (CÓDIGO). Ahora, cuando
      un pago crea una cuenta **NUEVA**, el webhook (`src/pages/api/stripe-webhook.ts`) **envía
      automáticamente** el correo de bienvenida con el enlace de un solo uso para **crear la
      contraseña** (→ `/nueva-clave/`, el mismo flujo del punto 7). Detalles: `findOrCreateUser`
      ahora devuelve `{ userId, created }` y el correo se dispara **solo en el alta real**
      (`created === true`), no en cada evento posterior; usa el helper
      `sendPasswordSetupEmail()` (flujo público anon → `resetPasswordForEmail`) de
      `supabase-admin.ts`, con `redirectTo = <origin>/nueva-clave/` (el origin sale de
      `siteOrigin(request)`). No es fatal si falla (se loguea). Así el comprador ya no tiene que
      pedir el enlace a mano desde `/entrar`; le llega al pagar.
      - **8b. Correo de bienvenida BILINGÜE (ES/EN) según el idioma en que se pagó** (extra que
        sumó Emi): el checkout guarda el idioma en la metadata de la suscripción (`lang`); el
        webhook lo lee y envía el correo en ES o EN, con el enlace al destino correcto
        (**`/nueva-clave/`** o **`/nueva-clave/en/`** — la página de crear contraseña ahora es
        **bilingüe**, componente `NuevaClave.astro`). El correo se manda **por Resend** (API
        directa, `src/lib/email.ts`) con el **copy DEFINITIVO de Emi** (asunto, texto previo,
        cuerpo, PD/PS con sus dos posdatas — carta personal, sin botón corporativo): se genera el
        enlace de un solo uso sin enviar (`generatePasswordSetupLink` →
        `admin.generateLink({type:'recovery'})`) y se envía con la plantilla del idioma. **Si
        falta `RESEND_API_KEY`, cae al correo estándar de Supabase** (plantilla única, sin el copy
        de Emi) con el enlace igual en el idioma correcto.
        - **Enlace del correo:** el texto visible es literalmente el que pidió Emi
          (`emilseriosacademy.com/entrar/`), pero el `href` real apunta al enlace seguro de un
          solo uso que lleva a `/nueva-clave/` — que es "donde creas tu usuario y contraseña", lo
          que dice el propio copy. Un `/entrar/` pelado no serviría: sin contraseña puesta,
          `/entrar/` no puede loguear a nadie (haría falta un SEGUNDO correo pidiendo el enlace de
          «Crea o restablece tu contraseña»). Visualmente es igual a lo que pidió Emi;
          funcionalmente hace lo que promete el texto.
        - **Remitente vs. reply-to:** el remitente técnico sigue siendo `info@emilseriosacademy.com`
          (el único dominio **verificado en Resend**; `info@emilserios.com` NO lo está y Resend
          rechazaría el envío con ese remitente). `info@emilserios.com` va como **reply-to**: si
          alguien responde el correo, le llega directo al buzón real de Emi — cumple la intención
          del PD/PS sin romper el envío.
        ⚠️ **Config nueva:** agregar `RESEND_API_KEY` (y opcional `RESEND_FROM`) en Vercel para que
        salga el correo bilingüe con el copy de Emi; y agregar **`/nueva-clave/en/`** además de
        `/nueva-clave/` a los Redirect URLs de Supabase. Con Resend configurado ya NO hace falta
        tocar la plantilla de Supabase.
- [x] **9. Rediseñar la página de agradecimiento del pago.** ✅ Hecho (CÓDIGO). Nueva **página
      dedicada y bilingüe** (componente `Gracias.astro`, rutas `/gracias/` y `/gracias/en/`) con el
      copy DEFINITIVO de Emi: eyebrow "No cierres esta pestaña", título "Gracias por unirte. Ya casi
      estamos dentro.", un campo de correo + botón **"Enviarme mi acceso"** (mismo flujo que «Crea o
      restablece tu contraseña» de `/entrar`: `resetPasswordForEmail` → `/nueva-clave/` o
      `/nueva-clave/en/`), el aviso de revisar **spam/promociones** con el asunto exacto del correo
      («Tu acceso a la membresía»), **el link a `/entrar`** como acceso directo, y el cierre pidiendo
      no cerrar la pestaña + contacto a `info@emilserios.com`. `success_url` del checkout
      (`src/pages/api/checkout.ts`) ahora apunta aquí (antes `/entrar/?pago=ok`) según el idioma en
      que se pagó. Se quitó el banner viejo de `?pago=ok` en `/entrar/index.astro` (superado por esta
      página). Verificado con `npm run build` + capturas headless de ambos idiomas.
- [ ] **10. Botón "Publicar ahora" además de "Programar" el ejercicio de la semana.** Hoy solo
      se programa; agregar publicación inmediata en `/panel`.
- [ ] **11. Selector de destino del video en `/panel`.** Al publicar, elegir a dónde va el video:
      **Ejercicio de la semana**, **Bonus Material** o **Ejercicio/Concepto Base**. Requiere
      **diseñar las dos subpáginas** (Bonus Material y Concepto Base) — se conecta con los
      puntos 3 y 4.
- [~] **12. Sistema de pestañas del aula + tour paso a paso.** ✅ **Pestañas hechas** (`Aula.astro`):
      **Ejercicio de la semana** (con datos reales + el **foro adentro**, no es pestaña aparte),
      **Concepto Base** y **Bonus Material** (maquetas). Subrayado editorial en la pestaña activa,
      navegación por teclado (flechas), deep-link por hash (`#base`/`#bonus`). El gate de pago
      oculta pestañas + paneles. Verificado headless (switching + sin errores). ⬜ Falta el
      **tour/onboarding guiado** paso a paso (queda pendiente para su propio PR).


## Qué es
Membresía de pago recurrente para contrabajistas de Emilse Rios, **separada** del
WordPress + Tutor LMS actual (eso no se toca). App propia. Bilingüe ES/EN.
En producción vive en **`emilseriosacademy.com`** (dominio propio, con `www` como
canónico en Vercel). Se abandonó el plan de `membresias.emilserios.com` porque el
DNS de `emilserios.com` lo maneja un tercero externo (el que hizo la web original,
"aparece una vez a la cuaresma"); se compró un dominio independiente para tener el
control de DNS y no depender de él.

## Stack y decisiones clave
- **Frontend:** Astro (este repo). Páginas con Supabase del lado del navegador; la
  seguridad la imponen las reglas **RLS** de la base de datos.
- **BD / Auth / Storage:** Supabase (proyecto `zjcdnhylhmyntwmvsskm`).
- **Pagos:** Stripe (pendiente).
- **Video:** Vimeo (embeds).
- **Correo:** Resend como SMTP en Supabase. Dominio `emilseriosacademy.com`
  **verificado en Resend**; remitente `info@emilseriosacademy.com`. ⚠️ Ojo: el buzón
  real de Emi `info@emilserios.com` NO sirve como remitente — ese dominio no está
  verificado en Resend (y verificarlo exigiría tocar el DNS del tercero).
- **Login:** **correo + contraseña** (se eliminó el enlace mágico en el punto 7). Casilla
  "mantener sesión iniciada" (localStorage vs sessionStorage). La primera contraseña se crea
  con un enlace de un solo uso por correo (`/nueva-clave/`), que también sirve de recuperación.
- **Modelo de contenido:** UN ejercicio vigente a la vez, global, rota cada **jueves**
  (00:00 baja / 00:01 sube, hora Madrid). Sin biblioteca histórica. El cobro es mensual
  por miembro, en un reloj aparte.
- **Precio:** fundador **$57/mes** (1–10 jul) · estándar **$77/mes** (desde 11 jul).
- **Sin niveles:** un solo ejercicio para todos; Emi guía inicial y avanzado dentro del
  mismo video. **Foro separado por idioma** (sin traducción automática).

## Rutas
- `/` y `/en` — landing de ventas (bilingüe)
- `/aula` (+ `/aula/en`) — área de miembros (datos reales)
- `/panel` — panel de Emi (admin, auth real)
- `/entrar` — login (correo + contraseña) · `/nueva-clave` (+ `/nueva-clave/en/`) — crear/restablecer contraseña (bilingüe) · `/salir` — logout

## Estado

### Hecho ✅
- [x] Documento de arquitectura (`docs/ARQUITECTURA.md`)
- [x] Landing bilingüe ES/EN (diseño implementado)
- [x] **Copy de ventas real "Estudiemos Juntos"** (rama `claude/sales-page-study-story-wbgbb6`):
      se reemplazó el copy mockup de la landing por la página de ventas definitiva de Emi.
      Nuevas secciones sobre el mismo sistema de diseño editorial: **Historia** (`#historia`:
      Mahler 2012 → emigración 2016 → la azotea en Buenos Aires → los 2 descubrimientos →
      el consejo de la meta), **Cómo funciona** (concepto/mes · ejercicio/semana · jueves
      desaparece), **Qué incluye** (reescrito), **Focus oscuro** ("yo borro el contenido · por
      qué"), **Para quién es / no es** (dos listas), **Comunidad + 24/7**, **Plan** (precio de
      fundador **$57** 1–10 jul, congelado, luego **$77**), **P.D.** firmada, y **FAQ de 8
      preguntas**. Todo bilingüe ES/EN (EN traducido de la voz de Emi). El precio del mockup
      (19 €) quedó reemplazado por $57. El botón "Acá te unes / Join here" sigue siendo
      placeholder hasta conectar Stripe.
- [x] **Barra flotante tipo "pill"** (PR #8, `claude/floating-nav-pill`): la barra superior
      pasó de `mix-blend` transparente a una **píldora esmerilada** (fondo translúcido con
      `backdrop-filter: blur`), siempre visible al hacer scroll. Layout en 3 zonas: **EN/ES**
      izquierda · **Emilse Rios** centro · **Menú** derecha. Se quitó el tag "Nuevo cada jueves"
      del hero (se perdía sobre la foto). ⚠️ **Reemplazado por el rediseño "carta editorial"**
      (ver más abajo): la carta no lleva menú ni barra.
- [x] **Menú desplegable minimalista tipo Analogue** (PR #9, `claude/nav-menu-expand`): la
      píldora es **angosta** (`min(94vw, 460px)`, centrada) y **se despliega en su mismo lugar**
      al pulsar "Menú" (morph de `border-radius` + alto animado con `grid-template-rows`), en vez
      del overlay oscuro a pantalla completa. Panel: grilla 2 columnas de enlaces (La historia ·
      Cómo funciona · Qué incluye · El plan · Cursos · Videos) + bloques **Contacto / En la red /
      Dónde**. El botón alterna Menú↔Cerrar (☰→✕); cierra al elegir enlace, clic fuera o Escape.
      En móvil se oculta la palabra "Menú" dejando el ícono. ⚠️ **Reemplazado por el rediseño
      "carta editorial"** (ver más abajo): sin menú.
- [x] **Cambio de idioma EN/ES sin volver al inicio** (PR #10, `claude/lang-switch-in-place`):
      el toggle ya no recarga saltando arriba. Guarda la **sección + offset** donde está el
      visitante, hace **fade-out**, navega al otro idioma y **restaura la misma posición** con
      **fade-in** (las secciones re-animan con el `reveal` existente). Ancla por sección (no por
      píxel absoluto) para aguantar que el texto mida distinto entre idiomas. Usa
      `history.scrollRestoration='manual'` + pre-oculta el contenido hasta reposicionar (evita el
      parpadeo); red de seguridad revela igual a los 1.5s. Respeta `prefers-reduced-motion`. Se
      mantiene la arquitectura de **dos páginas SSR** (`/` y `/en/`): URLs por idioma, SEO y meta
      intactos. Verificado headless en ambos sentidos (queda al pixel en la misma sección).
      ⚠️ **En el rediseño "carta editorial" se rehízo esta coreografía** sobre la nueva
      estructura (ver más abajo, sección "Ajustes de fluidez"): la píldora EN/ES fija arriba a
      la derecha (y el toggle del footer) guardan el bloque + offset, hacen fade-out, navegan y
      restauran la posición con fade-in. El anclaje ahora es por **hijo directo de `.page`**
      (antes eran las `<section>` del `<main>`).
- [x] **Rediseño "carta editorial" de la página de ventas** (rama `claude/sales-page-redesign-67469k`,
      brief de Emi jul 2026): giro de 180° en el CONTENEDOR VISUAL (el copy no cambia de fondo).
      Principio rector: *nada puede distraer de la lectura*; se lee como una carta, no como una
      landing. Se **eliminó** todo el andamiaje de marketing de `Landing.astro`: menú flotante,
      marquesina, tarjeta de pricing, sección oscura "focus", grids de "cómo funciona/qué incluye",
      bloque comunidad, acordeón FAQ, animaciones (reveal/marquee/magnético), iconos y checkmarks.
      Queda una **sola columna** (~680px) sobre **un solo lienzo crema** (`#faf7f1`), tipografía
      uniforme (Hanken Grotesk, 17–19px, interlineado 1.66, sin negritas/cursivas en el cuerpo),
      y el orden fijo del brief: firma "Emilse Rios" (no clicable) · foto pequeña (~230px) · titular
      "Estudiemos juntos / La membresía" + apertura ("El problema no es que te falte tiempo…") ·
      historia corrida · listas es/no es (viñetas de guion) · precio como prosa · **botón 1** ·
      P.D. · **8 FAQ visibles sin acordeón** (numeradas) · **botón 2** · línea de referidos ·
      único enlace externo (newsletter, gris, subrayado) · footer legal mínimo con toggle ES/EN.
      Los **dos botones idénticos "Acá te unes"** son el único elemento con acento (terracota
      `#a94f2b`) → destacan solo la foto y los dos botones al hacer scroll. Líneas nuevas creadas
      en la voz de Emi (apertura, referidos, cierre "¡Estudiemos juntos!") porque no estaban en el
      copy previo. Botones y newsletter siguen en **placeholder** (`href="#"`) hasta conectar Stripe
      y el alta al newsletter "Contrabajo en la Ciudad".
- [x] **Píldora EN/ES con cambio de idioma in-situ** (PR #13, MERGEADO a `main`): primer paso de
      los "ajustes de fluidez" que pidió Emi. **Píldora fija en la esquina superior derecha** (vidrio
      esmerilado, `backdrop-filter`, solo EN/ES) que **cambia de idioma sin volver al inicio**: guarda
      el bloque + offset donde está el scroll, hace **fade-out** del `.page`, navega a la otra página
      SSR y **restaura la misma posición** con **fade-in**. Anclaje por hijo directo de `.page` con
      `getBoundingClientRect`; `history.scrollRestoration='manual'` + pre-oculta el contenido
      (`html.lang-enter`) hasta reposicionar; respeta `prefers-reduced-motion`. Verificado headless: al
      togglear a media página el scroll se conserva (delta ~60px por el largo distinto del texto) y
      queda en la misma sección. El toggle del footer comparte el mismo comportamiento
      (`[data-lang-switch]`). ⚙️ Nota de entorno: `astro preview` no es alcanzable aquí (el proxy
      intercepta `localhost`); para verificar en navegador, servir el build estático
      (`.vercel/output/static`, las páginas `/` y `/en/` están prerenderizadas) con
      `python3 -m http.server` y `NO_PROXY='*'`.
- [x] **Rediseño "fluido y pro" de la carta (mergeado a `main`, PRs #16/#17/#18, rama
      `claude/sales-page-updates-cpmkk1`, jul 8)**: Emi dijo del rediseño inicial *"no me gusta nada"*
      y luego que los botones se veían *"como cualquier AI chimbo"*. Se rehízo TODO el contenedor visual
      de `Landing.astro` (el copy sigue cerrado) hasta dejarlo editorial, monocromático y seductor:
      - **Logo e imagen reales**: hero con el wordmark caligráfico **`public/img/logo_emi_alpha.png`**
        (transparente) y foto nueva del contrabajo **`public/img/foto.jpg`** (`THL_7767`). Los archivos
        se subieron a `main` desde la web; en el código se referencian con nombres limpios. Quedó sin uso
        `public/img/logo.png` (el de los arcos "EMILSE RIOS ACADEMY"); se dejó por si sirve para favicon.
      - **Jerarquía de lectura**: apertura grande en bold+italic — **primera oración en una línea, el
        resto en dos** (misma estructura ES/EN) — más pequeña que el título para no competir; título un
        poco mayor. "Descubrí dos cosas" con protagonismo (lead grande, excusas en bold+italic).
        "¿Necesitas ayuda para llegar?" centrada. Cuadro comparativo "para ti / no es para ti" en dos
        columnas más anchas (rompe la columna de 680px). P.D. en cursiva pequeña. **FAQ desplegable**
        (`<details>`). Mensaje final grande. Fundidos al hacer scroll (IntersectionObserver).
      - **Tarjeta de precio** (formato de una referencia que pasó Emi): dos columnas — izquierda nombre
        "Estudiemos juntos / *Let's study together*" (echo del otro idioma en cursiva) + **$57** + nota;
        derecha "qué incluye" con flechas → + botón + reassurance. La **info de facturación** (día de cobro
        / $77) va DENTRO del cuadro, fila a todo el ancho (ojo: hubo que anular el `max-width` global de
        `<p>` = `var(--measure)`), centrada y en **negrita**. La tarjeta **se invierte de color** (crema↔tinta)
        al pasar el cursor.
      - **Botones**: cuadrados y monocromáticos (se quitó el terracota y los brillos). Animación que sí
        le gustó a Emi (de un HTML de referencia): **relleno de tinta que crece desde la posición del
        cursor** + flecha que se desliza + magnético sutil. Corregido dos veces el subrayado heredado del
        `a:hover` global de `colors_and_type.css`. **Notas musicales de colores** flotan al hover.
      - **Cursor personalizado de clave de fa** (`public/img/clef-cursor.svg`), con **versión clara**
        (`clef-cursor-light.svg`) que entra cuando el fondo se pone oscuro (tarjeta invertida y botones
        rellenos de tinta) para que no se pierda. Se mantiene sobre enlaces/botones (no vuelve a la manito).
      - Newsletter apunta al **alta real** (Klaviyo/kmail:
        `https://manage.kmail-lists.com/subscriptions/subscribe?a=TPxGBg&g=RxE3BW`). Los botones de PAGO
        siguen en **placeholder** (`href="#"`) hasta conectar Stripe. Verificado headless en ES y EN.
      - **Ajuste posterior del hero** (misma rama): la foto quedó **equidistante** del logo y del título
        (se anuló el interlineado del `<p>` del logo y se midió su aire interno con un scan de alpha para
        cuadrar los gaps ~64/67px), recuperada la animación **B&W → color al hover** (con `@media (hover:hover)`
        para que en táctil se vea siempre a color) y un **drop shadow marcado** para que no se vea plana.
- [x] Aula — prototipo visual
- [x] Panel de Emi — prototipo visual
- [x] Esquema de BD + RLS (`supabase/migrations/0001_init.sql`)
- [x] Login real por enlace mágico
- [x] Panel protegido con auth real (solo `role = admin`)
- [x] Logout real
- [x] **Aula con datos reales**: lee el ejercicio vigente (título, semana, descripción,
      video Vimeo con selector ES/EN, PDF) y "marcar completado" persiste en BD
- [x] **Foro real en el aula** (`supabase/migrations/0002_forum.sql`): los miembros leen
      y publican preguntas del ejercicio vigente; las respuestas de Emi se muestran bajo
      cada pregunta. Privacidad resuelta con columna desnormalizada `author_name`
      ("Nombre Inicial.", p. ej. "Lucía F.") porque un miembro no puede leer el `profiles`
      de otro. RLS de `questions` relajada: se quitó `lang = my_lang()` para que cada
      miembro entre a los **dos foros** (es/en) con el toggle; el idioma se filtra en la
      consulta según la página. Decisión vigente: **solo Emi responde** (los miembros solo
      preguntan) — sigue abierta para confirmar con Emi.
- [x] **Panel de Emi con datos reales** (`/panel`):
      - **Ejercicios**: tabla real con estado (En vivo/Programado/Cerrado calculado en vivo);
        crear/editar/programar escribe en `exercises`; campos bilingües + etiqueta de semana
        + fechas (por defecto próximo jueves 00:01 / jueves siguiente 00:00, hora local).
      - **Miembros**: lista real con estado de suscripción.
      - **Foro**: muestra preguntas sin responder de los ejercicios en vivo y permite
        responder (escribe en `answers`).
      - El formulario sube el PDF al bucket `pdfs`.
- [x] **Deploy en Vercel funcionando**: repo importado + variables de entorno OK.
      Adaptador `@astrojs/vercel` en modo híbrido. Guía en `docs/DEPLOY_VERCEL.md`.
- [x] **Dominio propio en producción**: `emilseriosacademy.com` comprado y conectado
      en Vercel (DNS bajo nuestro control).
- [x] **Correo transaccional real (Resend)**: dominio verificado; el enlace mágico se
      envía desde `info@emilseriosacademy.com` a cualquier correo (ya no solo al de la
      cuenta de Resend). Corrección clave: el remitente debe ser `@emilseriosacademy.com`.
- [x] **Enlace mágico de punta a punta en producción**: se envía, llega, y al abrirlo
      enruta bien. Requirió en Supabase → Authentication → URL Configuration: **Site URL**
      con esquema `https://` (sin él, Supabase lo pega como ruta a su propio dominio y
      da `{"error":"requested path is invalid"}`) + **Redirect URLs** con el dominio propio.
- [x] **Login de alumno probado en producción** (entra al aula).
- [x] **Admins configurados**: `emilserios.bass@gmail.com` (Emi) y
      `adrianmendozam@gmail.com` (Adrián, para apoyar a Emi) con `role='admin'`; ambos ven
      el panel. ⚠️ Aprendizaje: `set_admin.sql` aborta si el perfil de un admin aún no
      existe, así que debe correrse DESPUÉS de su primer login por `/entrar/` (por eso al
      inicio no ascendía a Emi). El rol se lee en vivo, no hace falta reloguear.
- [x] Red de seguridad en la landing: si un enlace mágico cae en `/` con el token en el
      hash (fallback al Site URL), se reenvía a `/entrar/` para completar el login.
- [x] **Login: error real** (en `main` desde PR #1/#2): `/entrar/` muestra el error real de
      Supabase — antes salía `{}` porque el texto vive en `.message`, propiedad no enumerable
      que `JSON.stringify` perdía — y avisa cuando un enlace caducó o ya se usó (`otp_expired`).
- [x] **Storage de PDFs** (`0003`) aplicado y **suscripción de prueba** de `mdza.exp` creada.
- [x] **Niveles eliminados — CÓDIGO** (rama `claude/cool-newton-fzwqfo`, PR #3): un solo
      ejercicio global; Emi guía inicial y avanzado dentro del mismo video. Cambios en aula,
      panel, landing (copy ES/EN), seed, `set_admin.sql` y migración `0004_remove_levels.sql`.
- [x] **Niveles eliminados — BD**: se aplicó `0004_remove_levels.sql` en el SQL Editor
      (columnas `level` y enum `user_level` borrados).
- [x] **PR #3 MERGEADO** (`claude/cool-newton-fzwqfo` → `main`, commit `26c60af`): el código
      sin niveles ya está en `main`. El panel ya NO envía `level` al crear/editar ejercicios
      ni al listar miembros. Código y BD realineados.

- [x] **Guardar ejercicio arreglado** (incidente "schema cache", jul 6, PR #4): al subir un
      ejercicio salía *"could not find the 'level' column of 'exercises' in the schema cache"*
      (PGRST204). No era bug de código: `main` ya no manda `level` y la BD ya no tiene la columna;
      el error lo lanzaba un **build VIEJO de Vercel** todavía vivo en el navegador/edge. Se cerró
      con el redeploy de `main` + refresco fuerte. Red de seguridad disponible:
      `supabase/migrations/0005_reload_schema_cache.sql` (`notify pgrst, 'reload schema';`).
      **Primer ejercicio subido por Emi ✅.**
- [x] **VIDEO REPRODUCE EN EL AULA ✅** (jul 6, PR #5). Tres capas de arreglo, todas en `main`:
      1. El botón de play es decorativo (CSS); el `<iframe>` solo se pinta si `vimeoEmbed(url)`
         interpreta la URL. El regex viejo fallaba con formatos comunes → parser robusto en
         `src/components/membresia/Aula.astro` (acepta URL normal, `vimeo.com/manage/videos/ID`,
         ID pelado, código `<iframe>` pegado, hash en ruta o `?h=`) + mensaje visible si no se
         puede cargar (ya no queda botón muerto).
      2. El **campo de video del panel** era `type="url"` y rechazaba el código de inserción;
         ahora es texto libre y `normalizeVimeo()` guarda la URL limpia del player desde cualquier
         formato, conservando la query de Vimeo (`app_id`, etc.) y decodificando `&amp;`.
      3. **La que faltaba (causa real):** para un video restringido por dominio, Vimeo valida el
         **origen (referrer)** de quien incrusta. El iframe no mandaba `referrerpolicy`, así que
         Vimeo bloqueaba pese al dominio permitido. Ahora el iframe lleva
         `referrerpolicy="strict-origin-when-cross-origin"` + el `allow` completo del embed oficial.
      ⚠️ Aprendizaje (otra vez): el PR #4 se mergeó en un commit ANTERIOR a los arreglos 2 y 3, así
      que producción no reproducía aún. El PR #5 llevó los commits faltantes. **Al mergear,
      verificar SIEMPRE que el PR incluye el ÚLTIMO commit de la rama** (ya van dos incidentes por
      esto: niveles y ahora Vimeo).
- [x] **STRIPE — CÓDIGO COMPLETO** (esta rama): integración de la suscripción mensual.
      Decisiones: **1b** (los dos Prices $57/$77 ya creados; se leen por env) + **2a** (pago
      **anónimo** en la carta pública; el webhook **enlaza por email** creando el usuario
      passwordless, así al pagar la cuenta ya existe y solo falta el enlace mágico). Piezas:
      - `src/lib/stripe.ts` — cliente Stripe (solo servidor) + elección de tier por fecha
        (fundador hasta `STRIPE_FOUNDER_UNTIL`, si no estándar) + mapeo Price↔tier.
      - `src/lib/supabase-admin.ts` — cliente `service_role` (webhook) + validador del token
        del navegador (portal).
      - `GET /api/checkout?lang=es|en` — crea la sesión de Checkout y redirige; los botones de
        la carta son un `<a href>` directo (funciona sin JS). El idioma de la página de pago se
        fija con `locale` (**no hacen falta 4 precios**, solo 2). `success_url=/entrar/?pago=ok`.
      - `POST /api/stripe-webhook` — verifica la firma (cuerpo crudo) y espeja Stripe en
        `subscriptions`; crea/enlaza el usuario por el correo del pago. Robusto al orden de
        eventos (resuelve el user por metadata → fila previa → email del customer) e idempotente
        (UPSERT por `stripe_subscription_id`).
      - `POST /api/portal` — portal de cliente (tarjeta/baja) para el miembro autenticado.
      - `Landing.astro` — `payHref` de ambos idiomas ya apunta al checkout real (se acabó el
        placeholder `#`).
      - `entrar/` — banner "¡Pago recibido!" al volver de Stripe (`?pago=ok`).
      - `aula/` — el gating quedó atado a Stripe real: se distingue "sin suscripción" (muestra
        puerta de pago `#subGate`) de "sin ejercicio en ventana", y los miembros activos ven el
        enlace **Suscripción** (portal). Al volver de pagar reintenta leer la fila unos segundos
        (el webhook tarda 1-3 s). Migración `0006_stripe_subscription_link.sql` (índice único).
      Verificado con `npm run build` (endpoints empaquetados como función serverless). Falta SOLO
      la config de dashboard/env (ver Pendiente ⬜ y `docs/STRIPE.md`); sin esas variables los
      endpoints responden 500 controlado.
- [x] **Bucle de pago arreglado + red de seguridad contra el webhook** (PR #24 MERGEADO a
      `main`, rama `claude/payment-verification-loop-790vpb`): un miembro que pagó (caso real
      `hello@arcmediahouse.com`) entraba con su enlace mágico y el aula le pedía **pagar de
      nuevo**. Causa: el acceso depende 100% de que el **webhook** haya escrito la fila de
      `subscriptions`; si no llegó/falló/tardó, el que ya pagó queda encerrado en la puerta de
      pago, y el reintento existente (5×2s) solo corría al volver de Stripe con `?pago=ok` —
      nunca al llegar por el enlace del correo. Arreglo:
      - **`POST /api/verify-subscription`** (nuevo): para el miembro autenticado, le pregunta a
        Stripe por su **correo** si tiene una suscripción vigente (`active`/`trialing`); si sí,
        **espeja la fila** en `subscriptions` (service_role) y enlaza el customer. Red de
        seguridad definitiva independiente del webhook.
      - **`src/lib/stripe-sync.ts`** (nuevo): `writeSubscriptionRow()` + `subGrantsAccess()`,
        compartidos por el webhook y el nuevo endpoint (misma fila, sin desincronizarse). El
        webhook (`stripe-webhook.ts`) ahora usa este helper en vez de construir la fila inline.
      - **`Aula.astro`**: si un miembro (no admin) no ve suscripción activa, ahora **reconcilia
        con Stripe** y vuelve a leer — tanto viniendo de pagar (`?pago=ok`, con un par de
        reintentos por si el webhook tarda) como llegando por el enlace mágico del correo.
      - **`/entrar/`**: aviso de **spam** — el mensaje de "enlace enviado" y el de "¡Pago
        recibido!" ahora aclaran que el enlace suele caer en spam/promociones (lo pidió Adrián).
      Verificado con `npm run build` (endpoint empaquetado como función serverless). Nota:
      requiere que `STRIPE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` estén en Vercel (ya lo
      están, dado que el checkout cobra); el webhook sigue siendo el camino normal, esto es solo
      la red de seguridad.

### Pendiente ⬜
- [ ] **STRIPE — CONFIG DE DASHBOARD/VERCEL (el CÓDIGO ya está, ver "Hecho")**. Lo que falta
      NO es código, es configuración que hace Adrián (guía completa en `docs/STRIPE.md`):
      1. **Webhook** en Stripe apuntando a `https://emilseriosacademy.com/api/stripe-webhook`
         (eventos: `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
         `invoice.paid`, `invoice.payment_failed`) → copiar el `whsec_...`.
      2. **Variables de entorno** en Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
         `STRIPE_PRICE_FOUNDER`, `STRIPE_PRICE_STANDARD`, `SUPABASE_SERVICE_ROLE_KEY`
         (y opcional `STRIPE_FOUNDER_UNTIL`). Redeploy.
      3. Correr la migración `supabase/migrations/0006_stripe_subscription_link.sql`.
      4. Probar con tarjeta `4242 4242 4242 4242` (modo test) → pasar a LIVE.
      Flujo elegido con Adrián: **2a pago anónimo + enlace por email** y **1b precios ya creados**.
- [ ] **Recorrido completo end-to-end**: Emi crea ejercicio (sin nivel)
      → `mdza.exp` lo ve, completa y pregunta → Emi responde → alumno ve la respuesta.
- [ ] (Opcional, limpieza) Servir el **favicon** desde el dominio propio en vez del WordPress
      viejo (`emilserios.com`) — quita un aviso de CORS y otra dependencia del tercero.
      ⚠️ Reapareció al probar el cambio de idioma: el `<link rel="icon">` apunta a
      `https://emilserios.com/...`; en entornos con proxy lento puede colgar la carga. En
      producción carga bien, pero conviene autoalojarlo. (Adrián lo dejó para un PR aparte.)
- [ ] Anti-reentrada fina por email (después).
- [ ] Onboarding tipo Figma (después).
- [ ] Favoritos (después).

## Incidente (merge desalineado de niveles) — para no repetirlo
Al eliminar los niveles, el PR #2 ya se había mergeado a `main` en un commit **anterior**
a los commits de niveles (`2ee6798`, `70ba9e4`). Resultado: la migración `0004` se aplicó a
la BD, pero el **código de `main` seguía usando `level`** → panel roto para crear ejercicios
y listar miembros. Se corrige mergeando el **PR #3** (que sí lleva el código sin niveles).
Aprendizaje: al mergear, verificar que el PR incluye el ÚLTIMO commit de la rama antes de
correr migraciones destructivas; y aplicar la migración **después** de confirmar el deploy.

## Cómo retomar (setup local)
1. `git pull` && `npm install`
2. Crear `.env` en la raíz (NO se sube al repo; pedir las llaves):
   ```
   PUBLIC_SUPABASE_URL=https://zjcdnhylhmyntwmvsskm.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=<anon key del dashboard de Supabase>
   ```
3. `npm run dev` → http://localhost:4321/
4. Migraciones en el SQL Editor (el proyecto ya tenía 0001): `0002_forum.sql` (foro),
   `0003_storage_pdfs.sql` (bucket de PDFs), `0004_remove_levels.sql` (quita niveles) y
   `0005_reload_schema_cache.sql` (recarga la cache de esquema de PostgREST).
   Luego datos de prueba: `supabase/seed.sql` + dar **suscripción activa** a tu usuario
   (SQL al final de `seed.sql`).
5. Para entrar al panel: `update public.profiles set role='admin' where email='TU-EMAIL';`
   ⚠️ La BD es la MISMA de producción. Los admins definidos (Emi + Adrián) y el alumno de
   prueba se fijan re-ejecutando `supabase/set_admin.sql` (edita la lista de admins ahí).

## Decisiones abiertas (preguntar a Emi)
- Foro: ¿los miembros se responden entre ellos o solo responde Emi?
- Onboarding/tutorial la primera vez.
- Ajustes visuales y de copy finales con Emi.

## Rama de trabajo
**Todo mergeado a `main`.** No hay trabajo en vuelo. El siguiente cambio arranca de `main`
fresco (`git fetch origin main` → rama nueva).

Sesión **16 jul 2026** (checklist de arriba): **#27** checklist del día + punto **2** (saludo del
aula sin nombre), **#28** puntos **3+4+12**: **sistema de pestañas** del aula (Ejercicio de la
semana con el foro adentro · Concepto Base · Bonus Material; las dos últimas son maquetas de
diseño con contenido de muestra, pendientes de conectar a la BD junto al punto 11), **#30** identidad
visual de la carta en aula/panel/entrar (punto 5), **#31** ingreso con correo + contraseña
(punto 7, `/nueva-clave/`), **#32** correo de bienvenida automático al pagar (punto 8), **#33**
correo de bienvenida bilingüe por Resend (punto 8b), **#34** página de agradecimiento del pago
(punto 9, `/gracias/` + `/gracias/en/`).

Últimas mergeadas a `main`: **#7** copy de ventas, **#8** píldora nav, **#9** menú desplegable,
**#10** cambio de idioma, **#11** bitácora, **#12** rediseño "carta editorial", **#13** píldora EN/ES,
**#16/#17/#18** rediseño fluido/pro de la carta (logo+foto reales, tarjeta de precio, botones con
relleno desde el cursor, cursor de clave de fa, notas musicales), **#19** bitácora + handoff de Stripe,
**#20** ajuste del hero (foto equidistante, B&W→color al hover, drop shadow), **#21/#22** Stripe
(checkout + webhook + portal, pago anónimo + enlace por email; URLs de retorno desde el dominio real),
**#23** enlace "Entrar" en la carta para miembros que vuelven, **#24** bucle de pago arreglado +
red de seguridad contra el webhook (`/api/verify-subscription` + aviso de spam en `/entrar`),
**#27** checklist 16 jul + saludo del aula sin nombre, **#28** pestañas del aula (semana+foro /
Concepto Base / Bonus Material, maquetas), **#30** identidad visual compartida, **#31** login
correo+contraseña, **#32** correo de bienvenida al pagar, **#33** correo de bienvenida bilingüe,
**#34** página de agradecimiento del pago.

### ⚠️ Lo más urgente para la próxima sesión
El **webhook de Stripe probablemente no está escribiendo** la fila de `subscriptions` (por eso el
caso `hello@arcmediahouse.com` cayó en el bucle de pago). El PR #24 puso una **red de seguridad**
(verificación directa con Stripe por correo), así que los usuarios ya NO quedan bloqueados, pero el
webhook es el camino normal y conviene dejarlo sano. Revisar en Stripe → Developers → Webhooks si el
endpoint `https://emilseriosacademy.com/api/stripe-webhook` existe, está apuntando bien y sus entregas
salen 200 (no 400 "firma inválida" ni 500). Verificar también que `STRIPE_WEBHOOK_SECRET` y
`SUPABASE_SERVICE_ROLE_KEY` estén en Vercel. Guía en `docs/STRIPE.md` (ver Pendiente ⬜).

## ⚠️ Flujo de trabajo con Adrián (IMPORTANTE)
Adrián pide **una rama nueva desde `main` + un PR nuevo por cada cambio**. Motivo: su flujo
**despliega a producción al mergear el PR a `main`**; una vez mergeado, el PR queda cerrado y
los commits que se empujen después a esa misma rama **no llegan a ningún lado** ("no funciona").
Regla práctica:
1. Antes de cada cambio: `git fetch origin main` y crear rama desde `origin/main`.
2. Un solo cambio por rama → PR nuevo (crear con la herramienta de GitHub).
3. Cuando Adrián mergea, avisa; el siguiente cambio arranca del `main` ya actualizado.
No apilar cambios nuevos sobre una rama cuyo PR ya se mergeó (reiniciar desde `main`).
