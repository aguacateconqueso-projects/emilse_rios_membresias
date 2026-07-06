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

### ⚠️ ACCIÓN INMEDIATA (retomar aquí)
- [ ] **MERGEAR PR #3** (`claude/cool-newton-fzwqfo` → `main`). **Importante:** el PR #2 se
      mergeó por error en un commit ANTERIOR a la eliminación de niveles, así que `main` (y
      por tanto producción en Vercel) **todavía tiene el código con `level`**, pero la BD ya
      NO tiene esa columna (0004 aplicada). Mientras no se mergee el PR #3, el panel falla al
      **crear ejercicios** y al **listar miembros** (consultan la columna borrada). Mergear
      el PR #3 realinea el código con la BD y lo deja sano. (Ver "Incidente" abajo.)

### Pendiente ⬜
- [ ] **Recorrido completo end-to-end** (tras mergear PR #3): Emi crea ejercicio (sin nivel)
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
   `0003_storage_pdfs.sql` (bucket de PDFs) y `0004_remove_levels.sql` (quita niveles).
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
`claude/cool-newton-fzwqfo`
