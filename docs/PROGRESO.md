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

### ⚠️ ACCIÓN INMEDIATA (retomar aquí)
- [x] **Primer ejercicio subido** por Emi (tras el redeploy limpio). El guardado ya funciona.
- [ ] **VIDEO NO REPRODUCE EN EL AULA (jul 6)**: al alumno le salía el botón de play pero no
      pasaba nada. Causa de código: el botón de play es solo decorativo (CSS); el `<iframe>` de
      Vimeo solo se pinta si `vimeoEmbed(url)` interpreta la URL, y el regex viejo fallaba con
      formatos comunes (URL del panel `vimeo.com/manage/videos/ID`, hash en query `?h=`, ID
      pelado, código `<iframe>` pegado). **Corregido** en `src/components/membresia/Aula.astro`:
      parser robusto + mensaje visible si aún no se puede cargar (ya no queda un botón muerto).
      Además el **campo de video del panel** era `type="url"` y rechazaba el código de inserción;
      ahora es texto libre y **normaliza al guardar** (acepta URL, enlace del panel, ID pelado o
      el `<iframe>` completo → guarda la URL limpia del player). Si el video es "solo por
      inserción", el código `<iframe>` de Vimeo puede venir SIN hash: en ese modo Vimeo autoriza
      por **dominio**, no por hash, así que basta con el dominio permitido correcto.
      ⚠️ Si el iframe SÍ aparece pero Vimeo dice que no se puede reproducir aquí, es la
      **privacidad del video en Vimeo**: en el video → Privacy → "Where can this be embedded"
      debe permitir el dominio (`emilseriosacademy.com`) o estar en "Anywhere"; y si el video
      es "oculto/unlisted", el enlace debe incluir su hash. Eso NO se arregla por código.
- [ ] **REDESPLEGAR PRODUCCIÓN + REFRESCAR (incidente "schema cache", jul 6)**: al subir un
      ejercicio con Emi salía *"could not find the 'level' column of 'exercises' in the schema
      cache"* (PGRST204). **No es bug de código:** `main` ya está limpio (no manda `level`) y la
      BD ya no tiene la columna. El error lo lanza PostgREST cuando la petición trae `level`,
      así que lo estaba mandando un **build VIEJO de Vercel** (anterior al PR #3) todavía vivo
      en el navegador/edge de Emi. Para cerrarlo:
      1. Forzar un **redeploy de `main`** en Vercel (cualquier push a `main` re-despliega; esta
         rama al mergearse ya lo dispara). Confirmar en Vercel que el último deploy de producción
         apunta al commit del PR #3 o posterior.
      2. Emi hace **refresco fuerte** (Ctrl/Cmd+Shift+R) o prueba en incógnito para tirar la
         página cacheada.
      3. Red de seguridad: correr `supabase/migrations/0005_reload_schema_cache.sql`
         (`notify pgrst, 'reload schema';`) en el SQL Editor por si la cache de esquema de
         Supabase quedó desincronizada tras el DROP de 0004.

### Pendiente ⬜
- [ ] **Recorrido completo end-to-end** (con el redeploy servido): Emi crea ejercicio (sin nivel)
      → `mdza.exp` lo ve, completa y pregunta → Emi responde → alumno ve la respuesta.
- [ ] **Stripe**: checkout $57/$77 + webhook (función de Vercel) + portal de cliente.
- [ ] Atar el gating de suscripción a Stripe real (hoy se simula con una fila en `subscriptions`).
- [ ] (Opcional, limpieza) Servir el **favicon** desde el dominio propio en vez del WordPress
      viejo (`emilserios.com`) — quita un aviso de CORS y otra dependencia del tercero.
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
`claude/exercises-level-column-error-4eis82`
