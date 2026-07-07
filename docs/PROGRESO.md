# Progreso — Membresía "Estudiemos Juntos"

> Bitácora para retomar el proyecto en cualquier sesión/chat. Es la fuente de
> verdad del estado. Si retomas en un chat nuevo, lee esto primero + `docs/ARQUITECTURA.md`.

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
- **Login:** enlace mágico (passwordless).
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
- `/entrar` — login · `/salir` — logout

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
- [~] **Ajustes de fluidez sobre la carta** (rama `claude/sales-page-redesign-67469k`, PR #12, EN CURSO):
      Emi pide que "respire" y se sienta fluida/seductora. **Paso 1 hecho — píldora EN/ES**: se
      añadió una **píldora fija en la esquina superior derecha** (vidrio esmerilado, `backdrop-filter`,
      solo EN/ES) que **cambia de idioma sin volver al inicio**: guarda el bloque + offset donde está
      el scroll, hace **fade-out** del `.page`, navega a la otra página SSR y **restaura la misma
      posición** con **fade-in**. Anclaje por hijo directo de `.page` con `getBoundingClientRect`;
      `history.scrollRestoration='manual'` + pre-oculta el contenido (`html.lang-enter`) hasta
      reposicionar; respeta `prefers-reduced-motion`. Verificado headless: al togglear a media página
      el scroll se conserva (delta ~60px por el largo distinto del texto) y queda en la misma sección.
      El toggle del footer comparte el mismo comportamiento (`[data-lang-switch]`). **Pendiente**:
      seguir con respiros/espaciado y ritmo de lectura del resto de la carta.
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

### Pendiente ⬜
- [ ] **Recorrido completo end-to-end**: Emi crea ejercicio (sin nivel)
      → `mdza.exp` lo ve, completa y pregunta → Emi responde → alumno ve la respuesta.
- [ ] **Stripe**: checkout $57/$77 + webhook (función de Vercel) + portal de cliente.
- [ ] Atar el gating de suscripción a Stripe real (hoy se simula con una fila en `subscriptions`).
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
Rama actual: **`claude/sales-page-redesign-67469k`** (rediseño "carta editorial", PR #12),
rebasada sobre `main` tras mergearse el **#11** (bitácora nav/lang).
Últimas mergeadas a `main`: **#7** copy de ventas, **#8** píldora, **#9** menú desplegable,
**#10** cambio de idioma, **#11** actualización de bitácora.

## ⚠️ Flujo de trabajo con Adrián (IMPORTANTE)
Adrián pide **una rama nueva desde `main` + un PR nuevo por cada cambio**. Motivo: su flujo
**despliega a producción al mergear el PR a `main`**; una vez mergeado, el PR queda cerrado y
los commits que se empujen después a esa misma rama **no llegan a ningún lado** ("no funciona").
Regla práctica:
1. Antes de cada cambio: `git fetch origin main` y crear rama desde `origin/main`.
2. Un solo cambio por rama → PR nuevo (crear con la herramienta de GitHub).
3. Cuando Adrián mergea, avisa; el siguiente cambio arranca del `main` ya actualizado.
No apilar cambios nuevos sobre una rama cuyo PR ya se mergeó (reiniciar desde `main`).
