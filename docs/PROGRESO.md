# Progreso — Membresía "Estudiemos Juntos"

> Bitácora para retomar el proyecto en cualquier sesión/chat. Es la fuente de
> verdad del estado. Si retomas en un chat nuevo, lee esto primero + `docs/ARQUITECTURA.md`.

## Qué es
Membresía de pago recurrente para contrabajistas de Emilse Rios, **separada** del
WordPress + Tutor LMS actual (eso no se toca). App propia. Bilingüe ES/EN.
En producción vivirá en `membresias.emilserios.com`.

## Stack y decisiones clave
- **Frontend:** Astro (este repo). Páginas con Supabase del lado del navegador; la
  seguridad la imponen las reglas **RLS** de la base de datos.
- **BD / Auth / Storage:** Supabase (proyecto `zjcdnhylhmyntwmvsskm`).
- **Pagos:** Stripe (pendiente).
- **Video:** Vimeo (embeds).
- **Correo:** Resend como SMTP en Supabase. En pruebas, remitente `onboarding@resend.dev`
  (solo entrega a tu propio correo de Resend). Producción: verificar dominio (DNS en Hostinger).
- **Login:** enlace mágico (passwordless).
- **Modelo de contenido:** UN ejercicio vigente a la vez, global, rota cada **jueves**
  (00:00 baja / 00:01 sube, hora Madrid). Sin biblioteca histórica. El cobro es mensual
  por miembro, en un reloj aparte.
- **Precio:** fundador **$57/mes** (1–10 jul) · estándar **$77/mes** (desde 11 jul).
- **Niveles:** Iniciando / Avanzando. **Foro separado por idioma** (sin traducción automática).

## Rutas
- `/membresias` y `/en` — landing de ventas
- `/aula` (+ `/en`) — área de miembros (datos reales)
- `/panel` — panel de Emi (admin, auth real)
- `/entrar` — login · `/salir` — logout

## Estado

### Hecho ✅
- [x] Documento de arquitectura (`docs/ARQUITECTURA.md`)
- [x] Landing bilingüe ES/EN (diseño implementado)
- [x] Aula — prototipo visual
- [x] Panel de Emi — prototipo visual
- [x] Esquema de BD + RLS (`supabase/migrations/0001_init.sql`)
- [x] Login real por enlace mágico + Resend funcionando
- [x] Panel protegido con auth real (solo `role = admin`)
- [x] Logout real
- [x] **Aula con datos reales**: lee el ejercicio vigente (título, semana, descripción,
      video Vimeo con selector ES/EN, PDF, nivel) y "marcar completado" persiste en BD
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
      - **Miembros**: lista real con estado de suscripción y selector para asignar/cambiar
        nivel (escribe en `profiles`, se refleja al instante en el aula).
      - **Foro**: muestra preguntas sin responder de los ejercicios en vivo y permite
        responder (escribe en `answers`).
      - El formulario sube el PDF al bucket `pdfs` (requiere crear ese bucket, ver abajo).

- [x] **Preparado para Vercel**: adaptador `@astrojs/vercel` en modo híbrido
      (páginas estáticas + servidor listo para los endpoints de Stripe). Guía de despliegue
      en `docs/DEPLOY_VERCEL.md`. Falta hacer el deploy en el dashboard (pasos en esa guía).

### Pendiente ⬜
- [ ] **Deploy en Vercel** (importar repo + variables de entorno + redirect URLs de Supabase),
      según `docs/DEPLOY_VERCEL.md`. Luego dominio `membresias.emilserios.com` (CNAME Hostinger).
- [ ] **Storage de PDFs**: crear el bucket **público** `pdfs` en Supabase. El panel ya sube
      ahí y el aula ya lee de ahí; solo falta crearlo (+ política de subida para admins).
- [ ] **Stripe**: checkout $57/$77 + webhook (función de Vercel) + portal de cliente
- [ ] Atar el gating de suscripción a Stripe real (hoy se simula con una fila en `subscriptions`)
- [ ] **Deploy a Vercel** + dominio `membresias.emilserios.com` (CNAME en Hostinger)
- [ ] Verificar dominio en **Resend** (DNS Hostinger) para enviar a cualquier correo
- [ ] Anti-reentrada fina por email (después)
- [ ] Onboarding tipo Figma (después)
- [ ] Favoritos (después)

## Cómo retomar (setup local)
1. `git pull` && `npm install`
2. Crear `.env` en la raíz (NO se sube al repo; pedir las llaves):
   ```
   PUBLIC_SUPABASE_URL=https://zjcdnhylhmyntwmvsskm.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=<anon key del dashboard de Supabase>
   ```
3. `npm run dev` → http://localhost:4321/
4. **Aplicar `supabase/migrations/0002_forum.sql`** en el SQL Editor (el proyecto ya
   tenía 0001). Luego datos de prueba: correr `supabase/seed.sql` + dar **nivel** y
   **suscripción activa** a tu usuario (SQL al final de `seed.sql`).
5. Para entrar al panel: `update public.profiles set role='admin' where email='TU-EMAIL';`

## Decisiones abiertas (preguntar a Emi)
- Foro: ¿los miembros se responden entre ellos o solo responde Emi?
- Onboarding/tutorial la primera vez.
- Ajustes visuales y de copy finales con Emi.

## Rama de trabajo
`claude/vibrant-mendel-d8dxtd`
