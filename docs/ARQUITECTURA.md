# Membresía "Estudiemos Juntos" — Arquitectura

> Documento de planificación. NO es la app todavía: es el plano para revisarlo juntos
> antes de programar. Todo aquí es discutible.

## 1. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Arquitectura | App propia e independiente. WordPress + Tutor LMS **no se tocan**. |
| URL | `membresias.emilserios.com` (subdominio, CNAME hacia Vercel). |
| Frontend | Astro (este repo). |
| Backend / BD / Auth / Archivos | Supabase (Postgres + Auth + Storage). |
| Pagos | Stripe (suscripción recurrente + portal de cliente + webhooks). |
| Video | Vimeo (embeds restringidos por dominio). |
| Hosting | Vercel (deploy automático desde GitHub). |
| Hosting actual de Emi | Hostinger. Solo necesitamos que agreguen **1 registro CNAME**. |

## 2. Modelo de negocio (reglas)

### Precio
- **Fundador: $57 USD/mes** — solo si compran del **1 al 10 de julio**.
- **Estándar: $77 USD/mes** — del **11 de julio** en adelante.
- "Para siempre" = el $57 queda congelado **mientras la suscripción siga activa**.
- El corte por fecha (11 de julio) hace que, de hecho, quien se dé de baja y vuelva
  ya solo encuentre $77. Eso cubre casi toda la "regla anti-reentrada" sin programar
  nada extra para el lanzamiento.

### Cobro
- Recurrente mensual, anclado a la fecha de alta de cada miembro.
- Cancelación a fin de período (mantiene acceso hasta que termina el mes pagado).
- Sin reembolsos parciales. Sin matrícula al inicio (setup fee = 0 por ahora).
- Portal de cliente de Stripe para que el miembro gestione tarjeta y baja.

## 3. Dos relojes independientes (clave del modelo)

**Contenido** y **cobro** son sistemas separados:

- **Contenido = calendario GLOBAL semanal.** Hay **un solo ejercicio vigente a la vez**
  (por nivel), igual para todos. Rota cada semana. Al rotar, el anterior desaparece —
  esto es lo que hace la membresía "exclusiva" y mantiene a los miembros activos.
  - Jueves 00:00 (Europe/Madrid): se oculta el ejercicio vigente **y su panel de Q&A**.
  - Jueves 00:01: aparece el ejercicio nuevo.
  - Quien entra cualquier día ve el único ejercicio vigente esa semana
    (p. ej., quien entra el domingo ve el del jueves anterior).
  - No hay biblioteca histórica.
- **Cobro = por miembro, mensual desde su alta.** No afecta qué contenido se ve.

El acceso al contenido solo evalúa: *(1) suscripción activa* + *(2) ejercicio vigente
ahora, de tu nivel*. La visibilidad se calcula **en vivo** comparando la hora actual
contra las fechas de subida/bajada de cada ejercicio (sin cron frágil).

## 4. Niveles
- Dos niveles: **Iniciando** y **Avanzando**.
- Cada ejercicio semanal tiene **una versión por nivel**; el miembro solo ve la suya.
- Al inscribirse, el miembro indica su nivel (formulario); Emi puede **asignar y cambiar**
  el nivel de cualquier miembro desde el panel admin.

## 4b. Idiomas (EN / ES) — sin traducción automática
- Dos públicos: español e inglés. **Landing y aula son bilingües**; el toggle EN/ES
  arriba cambia toda la experiencia a la versión de ese idioma.
  - Rutas: `/` y `/en/`; `/aula/` y `/aula/en/`.
- **Contenido del ejercicio** (título, descripción, video Vimeo, PDF): Emi lo sube en
  **ambos idiomas** desde el panel. En el aula, el video tiene además un selector ES/EN.
- **Foro: DOS foros separados**, español e inglés. Cada miembro tiene acceso a ambos y
  pasa de uno a otro con el toggle. **Sin traducción automática** (decisión de costo):
  quien quiera leer el otro idioma traduce por su cuenta.
- **Panel (consola):** queda en español; solo se amplió para que Emi cargue el contenido
  en los dos idiomas y vea las preguntas de ambos foros etiquetadas (ES / EN).

## 5. Foro de preguntas
- Asíncrono (no chat en vivo). **Un hilo por ejercicio.**
- Visible para todos los miembros activos; las respuestas de Emi las ve todo el mundo.
- El hilo se oculta cuando el ejercicio rota (baja junto con él).
- A confirmar con Emi: ¿los miembros pueden responderse entre ellos, o solo pregunta el
  miembro y responde Emi?

## 6. Panel de administración (para Emi, sin tocar código)
Pantalla protegida donde Emi puede:
- Crear/editar ejercicios: título, nivel, link de Vimeo, PDF, **fecha-hora de subida y
  de bajada** (con miércoles 00:00/00:01 Madrid como valores por defecto).
- Ver miembros y **asignar/cambiar su nivel**.
- Leer y **responder preguntas** del foro.

## 7. Esquema de base de datos

> Implementado en `supabase/migrations/0001_init.sql` (autoritativo). Resumen:

```
profiles            (extiende auth.users de Supabase)
  id                uuid  PK -> auth.users
  email             text
  full_name         text
  level             enum('iniciando','avanzando')  NULL hasta asignar
  role              enum('member','admin')         default 'member'
  created_at        timestamptz

subscriptions       (espejo del estado de Stripe)
  id                uuid PK
  user_id           uuid -> profiles
  stripe_customer_id        text
  stripe_subscription_id    text
  status            text   (active, past_due, canceled, ...)
  price_tier        enum('founder_57','standard_77')
  current_period_start      timestamptz
  current_period_end        timestamptz
  cancel_at_period_end      bool
  updated_at        timestamptz

exercises
  id                uuid PK
  level             enum('iniciando','avanzando')
  title_es          text
  title_en          text
  desc_es           text
  desc_en           text
  vimeo_url_es      text
  vimeo_url_en      text
  pdf_path_es       text   (Supabase Storage; opcional)
  pdf_path_en       text   (Supabase Storage; opcional)
  publish_at        timestamptz   -- cuándo se hace visible (jue 00:01 Madrid)
  unpublish_at      timestamptz   -- cuándo se oculta (jue 00:00 Madrid)
  week_label        text   (ej. "Semana 2 - Julio")
  created_at        timestamptz
  -- visible si: now() en [publish_at, unpublish_at) y nivel coincide y sub activa

questions           (foro, por ejercicio e idioma)
  id                uuid PK
  exercise_id       uuid -> exercises
  user_id           uuid -> profiles
  lang              enum('es','en')   -- a qué foro pertenece (sin traducción)
  body              text
  created_at        timestamptz

answers
  id                uuid PK
  question_id       uuid -> questions
  user_id           uuid -> profiles  (admin)
  body              text
  created_at        timestamptz

completions         (marcar ejercicio como completado)
  user_id           uuid -> profiles
  exercise_id       uuid -> exercises
  completed_at      timestamptz

-- MÁS ADELANTE --
favorites           (user_id, exercise_id)
churned_emails      (email, churned_at)   -- anti-reentrada fina
```

Reglas de acceso (RLS en Supabase): un miembro solo lee ejercicios de su nivel,
vigentes ahora, y solo si su suscripción está activa. El admin (Emi) lee/escribe todo.
Funciones auxiliares: `is_admin()`, `has_active_sub()`, `my_level()`, `my_lang()`.
Un trigger crea el `profile` automáticamente al registrarse un usuario.

### Cómo crear el proyecto (lo hace Adrián, una vez)
1. supabase.com → **New project** (región **Frankfurt/EU**, cerca de Madrid).
   Guarda la contraseña de la base de datos.
2. **SQL Editor** → pega y ejecuta `supabase/migrations/0001_init.sql`.
3. **Project Settings → API**: copia `Project URL` y la `anon` key al `.env`
   (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`). La `service_role` se guarda
   aparte (solo servidor, para el paso 5).
4. **Authentication → Providers**: deja activado **Email** (login por enlace mágico).
5. Tras registrarte, conviértete en admin:
   `update public.profiles set role = 'admin' where email = 'TU-EMAIL';`

### Auth (decisiones)
- **Login por enlace mágico (passwordless)** para miembros y para Emi: sin contraseñas
  que gestionar, mejor UX. El "gate" del panel se reemplaza por login real de Supabase.
- Frontend **estático + RLS** por ahora (la BD impone la seguridad). El único trozo de
  servidor llega con Stripe (webhook como función de Vercel, paso 5).

## 8. Flujo de Stripe
- Dos *Prices* en Stripe: fundador ($57) y estándar ($77).
- El checkout elige el price según la fecha (≤ 10 jul Madrid → fundador; si no → estándar).
- Webhooks que actualizan `subscriptions`:
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

## 9. Páginas
- **/** (bienvenida/home pública): explicación + link de pago. **La arma Adrián con diseño**;
  Claude conecta el botón a Stripe.
- **/checkout** → Stripe Checkout.
- **/app** (área de miembros): ejercicio de la semana + PDF + marcar completado + foro.
- **/cuenta** → portal de cliente de Stripe.
- **/admin** (solo Emi): ejercicios, miembros/niveles, responder foro.
- **/login**, **/registro**.

## 10. Imprescindible para julio (del brief)
1. Pago recurrente Stripe + cancelación a fin de período.
2. Solo se ve el contenido vigente (sección 3).
3. Dos niveles segmentados.
4. Foro visible para todos.
5. Checkout simple + login/home de miembros.

Para después: anti-reentrada fina por email, favoritos, setup fee, estética fina.

## 11. Pendientes / preguntas abiertas
- [x] Rotación: un solo ejercicio a la vez, rota cada jueves (00:00 baja / 00:01 sube).
- [ ] Foro: ¿miembros se responden entre ellos o solo Emi responde?
- [ ] Claves de Stripe (test primero) y los dos Prices creados.
- [ ] Proyecto Supabase creado (URL + claves).
- [ ] Cuenta de Vimeo: confirmar que permite restricción por dominio.
- [ ] Contacto de quien administra el Hostinger (para el CNAME).
```
