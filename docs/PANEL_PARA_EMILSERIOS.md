# El panel de la membresía — dossier de traspaso

> **Para qué es este documento.** Se está haciendo el revamp de **emilserios.com** en otro
> repo/sesión, y la idea es que la academia (esta membresía) deje de ser un sitio aparte y pase a
> ser **un solo panel de usuario** dentro de emilserios.com, junto con los cursos que Emi ya vende.
> Esto es la radiografía completa de lo que existe HOY en `emilserios_membresias`: qué hace, cómo
> está construido, qué reglas de negocio no se pueden romper, y dónde están los puntos de fricción
> reales para fusionarlo.
>
> Todo lo de aquí sale de leer el código, no de memoria. Cuando algo es maqueta y no funcionalidad
> real, está dicho explícitamente.

---

## 1. Resumen en 10 líneas

- Producto: **"Estudiemos Juntos"**, membresía de pago recurrente para contrabajistas de Emilse Ríos.
- Vive en **`www.emilseriosacademy.com`** (dominio propio, `www` canónico; el ápice hace 308 a www).
- Es **independiente** de emilserios.com y del WordPress + Tutor LMS actual (nunca se tocó).
- Stack: **Astro 5 (static + endpoints) en Vercel · Supabase (Postgres+Auth+Storage) · Stripe · Vimeo · Resend**.
- Hay **dos "paneles"**: `/aula/` (el del miembro) y `/panel/` (la consola de Emi, solo `role='admin'`).
- Todo es **bilingüe ES/EN** con rutas espejo (`/aula/` ↔ `/aula/en/`), incluido el contenido y el foro.
- El frontend es **estático y habla directo con Supabase desde el navegador**; la seguridad real la
  imponen las **políticas RLS de Postgres**, no el frontend.
- Regla central del negocio: **un solo contenido vigente a la vez**, rota los jueves y **desaparece**.
  No hay biblioteca histórica. Eso es deliberado, es el gancho de retención.
- El acceso se decide con una sola pregunta en la BD: *¿tiene este usuario una fila de suscripción activa?*
- Precio actual: **€65/mes** (histórico: $57 fundador → $77 → $80 → €65 en ago 2026).

---

## 2. Stack y dónde vive cada cosa

| Pieza | Tecnología | Notas para la integración |
|---|---|---|
| Frontend | Astro 5 (`output: 'static'` + `@astrojs/vercel`) | Páginas prerenderizadas; los endpoints marcan `export const prerender = false` |
| Hosting | Vercel, proyecto propio, production branch `main` | Cada PR genera Preview con URL propia |
| BD / Auth / Storage | Supabase (proyecto `zjcdnhylhmyntwmvsskm`, región EU) | **Esta es la pieza reutilizable clave** |
| Pagos | Stripe (suscripción + Customer Portal + webhooks) | Prices inmutables; el precio se congela por miembro |
| Video | Vimeo (embeds, restricción por dominio) | ⚠️ La lista de dominios permitidos hay que actualizarla si cambia el host |
| Correo | Resend (dominio `emilseriosacademy.com` verificado) | Remitente `info@emilseriosacademy.com`, reply-to `info@emilserios.com` |
| Analítica | Vercel Analytics (sin cookies, siempre) + GA4 (solo con consentimiento) | Solo en la superficie pública, no en aula/panel |

**Detalle importante sobre el correo:** el buzón real de Emi es `info@emilserios.com`, pero **ese
dominio NO está verificado en Resend** (verificarlo exige tocar el DNS de emilserios.com, que lo
maneja un tercero externo poco disponible). Por eso el remitente técnico es
`info@emilseriosacademy.com` y el `reply_to` apunta al buzón real. Si la web nueva unifica dominios,
esto se puede (y conviene) arreglar de verdad.

**Por qué existe emilseriosacademy.com:** no se usó `membresias.emilserios.com` porque el DNS de
`emilserios.com` lo controla el tercero que hizo la web original. Se compró un dominio aparte para
tener control. Si el revamp recupera el control del DNS, esa restricción desaparece.

---

## 3. Mapa de rutas

### Públicas (indexables)
- `/` y `/en/` — la **carta de ventas** (`Landing.astro`, 990 líneas). Copy definitivo de Emi:
  historia, cómo funciona, qué incluye, para quién es / no es, precio, P.D. firmada, FAQ de 8
  preguntas. El precio de la carta es **dinámico**: cambia solo en el momento del corte fundador→estándar.
- `/gracias/` y `/gracias/en/` — página post-pago.
- `/sitemap.xml`, `/robots.txt` — solo las dos URLs públicas; **todo lo demás es `noindex`**.

### Privadas
- `/entrar/` y `/entrar/en/` — login (correo + contraseña).
- `/nueva-clave/` y `/nueva-clave/en/` — crear o restablecer contraseña (destino del enlace del correo).
- `/aula/` y `/aula/en/` — **el panel del miembro**.
- `/panel/` — **la consola de Emi** (solo español, solo `role='admin'`).
- `/salir/` — logout.

### API (serverless, `prerender = false`)
| Endpoint | Qué hace |
|---|---|
| `GET /api/checkout?lang=es\|en` | Crea la sesión de Stripe Checkout y redirige (303). Es GET a propósito: los botones de la carta son `<a href>` sin JS |
| `POST /api/stripe-webhook` | Espeja Stripe → tabla `subscriptions`; crea la cuenta del comprador |
| `POST /api/portal` | Abre el Customer Portal de Stripe (requiere sesión) |
| `POST /api/verify-subscription` | **Red de seguridad**: pregunta a Stripe por el correo del usuario y espeja lo que falte |
| `POST /api/claim-account` | "Contraseña al pagar": canjea el `session_id` de Stripe por cuenta + contraseña, sin correo |
| `POST /api/send-access-email` | Manda el correo con el enlace de acceso (Resend, bilingüe) |
| `POST /api/send-access-code` | Manda un **código** de 8 dígitos para el flujo "es mi primera vez" |
| `POST /api/admin/add-member` | Alta manual de miembro (solo admin) |
| `POST /api/admin/remove-member` | Quita el acceso manual (solo admin) |

---

## 4. El panel del MIEMBRO — `/aula/`

Archivo: `src/components/membresia/Aula.astro` (1307 líneas, recibe `lang: 'es'|'en'` como prop).
Es **una sola página** con barra superior, tres pestañas y un modal de video.

### Barra superior
Logo · toggle ES/EN · `← Volver al panel` (**solo si eres admin**) · `Suscripción` (**solo si tienes
suscripción activa** → abre el portal de Stripe) · engranaje ⚙ · `Salir`.

El menú del engranaje tiene: **Soporte** (`mailto:info@emilserios.com`), **Ver tutorial** (relanza el
tour) y **Darse de baja** (⚠️ un enlace **hardcodeado** al portal de Stripe:
`https://billing.stripe.com/p/login/bJeaEX6V7dRDaUP8Zb73G00`).

### Pestaña 1 — "Ejercicio de la semana" (`kind='semana'`)
El corazón del producto. Muestra **el único ejercicio vigente ahora mismo**:
- Título + etiqueta de semana + descripción (párrafos).
- **Video de Vimeo** con selector propio ES/EN encima (independiente del idioma de la página).
- Botón de **PDF** de apoyo. Si no hay PDF, el botón no se oculta: se queda gris y dice
  "Sin PDF para este ejercicio" (decisión de UX deliberada).
- **Foro** de esa semana (ver abajo).
- Franja de nota: *"Sin biblioteca. El jueves a las 00:00 este ejercicio se cierra y entra el nuevo."*

### Pestaña 2 — "Concepto Base" (`kind='base'`)
La idea guía del mes, sobre la que se apoyan los cuatro ejercicios semanales. Mismo mecanismo de
ventana que la semanal, pero con rango mensual. Datos reales. **No tiene foro.**

### Pestaña 3 — "Bonus Material" (`kind='bonus'`)
Grilla de tarjetas que **se acumulan y no expiran** una vez publicadas. El video se carga recién al
hacer clic (abre un **lightbox** con la X y cierre por Escape) — no se pintan N iframes de golpe.
Orden: la más antigua primero (para que el video de bienvenida quede arriba).

### El foro
- **Un hilo por ejercicio semanal**, y **dos foros separados por idioma** (`lang='es'|'en'`) sin
  traducción automática. Cada miembro puede entrar a los dos con el toggle.
- **Solo Emi responde.** Decisión cerrada con Adrián el 16 jul: los alumnos no interactúan entre
  ellos. Todos leen todas las preguntas y todas las respuestas.
- El nombre que se muestra es **`author_name` desnormalizado** ("Lucía F."), porque la RLS impide
  que un miembro lea el `profile` de otro. Nunca se expone el correo.
- El hilo **desaparece con el ejercicio** cuando rota.

### Puertas y estados
1. **Sin sesión** → redirect a `/entrar/`.
2. **Sesión pero sin suscripción activa** → se ocultan pestañas y paneles, y aparece la
   **puerta de pago** (`#subGate`, "Completa tu suscripción").
3. **Con acceso pero sin contenido en ventana** → la pestaña semanal avisa, pero Base y Bonus
   siguen accesibles.
4. **Admin** → ve todo aunque no tenga suscripción (su política RLS es total).

### Anti-"bucle de pago" (importante, no borrar al migrar)
Alguien que **ya pagó** podía quedar encerrado en la puerta de pago si el webhook de Stripe fallaba,
tardaba o no llegaba. La solución tiene tres capas y está en el arranque del script del aula:
1. Si viene de pagar (`?pago=ok`), reintenta leer la fila 3 veces con 2 s de espera.
2. Si sigue sin nada, llama a `POST /api/verify-subscription`, que le **pregunta a Stripe
   directamente** por el correo del usuario autenticado y espeja la fila que falte.
3. `/gracias` + `/api/claim-account` permiten entrar sin depender del webhook en absoluto.

Este bloque nació de un incidente real en producción (18 jul 2026, primer suscriptor). Cualquier
panel nuevo que herede este modelo necesita una red equivalente.

### Tour de onboarding
6 pasos estilo Figma (oscurece la pantalla, ilumina la sección de turno, "X de 6" con mensaje de Emi).
Se dispara **la primera vez** por flag en `localStorage` y se repite desde el engranaje.
Es UI pura, sin BD.

---

## 5. La consola de EMI — `/panel/`

Archivo: `src/pages/panel/index.astro` (1068 líneas). **Solo en español** (decisión: la consola no
necesita ser bilingüe, solo la usa Emi). Protegida por un *gate*: lee la sesión, lee
`profiles.role`, y si no es `admin` muestra "No autorizado" sin pintar nada.

Todas las llamadas de red tienen **timeout de 10 s** con mensaje claro, para que nunca se quede
colgada en "Verificando acceso…" si Supabase está pausado o faltan las variables de entorno.

### Pestaña "Ejercicios"
- **Franja superior** con dos tarjetas: el ejercicio **En vivo** ahora y el **Próximo** programado.
- **Filtro por destino**: Ejercicio de la semana / Concepto Base / Bonus Material.
- **Tabla** con título, estado (`Programado` / `En vivo` / `Cerrado`, calculado en vivo contra las
  fechas), rango de fechas, y botones **Editar** / **Borrar**.
  - Borrar avisa explícitamente de que **se lleva por delante las preguntas y respuestas del foro**
    (`on delete cascade`).
- **Formulario** de crear/editar, con un selector de destino que **cambia los labels y las fechas
  por defecto** según el tipo:
  - `semana` → se publica el **próximo jueves 00:01**, se cierra el jueves siguiente **00:00**.
  - `base` → se publica **ahora**, se cierra **dentro de un mes**.
  - `bonus` → se publica ahora y **no expira** (fecha de cierre a +100 años; los campos de fecha
    se ocultan porque Emi no los controla).
  - Campos: etiqueta, y **todo duplicado ES/EN**: título, descripción, URL de Vimeo, PDF.
  - Botones: **Guardar y programar** · **Publicar ahora** (salta la espera al jueves) · Cancelar.
- **Normalizador de Vimeo**: Emi puede pegar lo que sea —URL normal, enlace de
  `vimeo.com/manage/videos/ID`, el ID pelado, o el `<iframe>` completo— y se convierte a la URL
  limpia del player conservando el hash de privacidad. Si no reconoce un ID, guarda el texto tal
  cual para no perder nada. **Esta tolerancia es una funcionalidad, no un detalle**: nació de que
  Emi pegaba cosas distintas cada vez.
- **PDFs** → bucket público `pdfs` de Supabase Storage, ruta `exercises/<timestamp>_<azar>.pdf`.

### Pestaña "Miembros"
- Contador de "X con suscripción activa".
- Tabla: nombre + correo, estado (`Activa`/`Inactiva`) con etiqueta extra `Admin` o `Manual`, fecha
  de alta, y botón **Quitar acceso** (solo para altas manuales).
- **"+ Agregar miembro"**: alta manual por correo, con nombre opcional, idioma del correo de acceso
  y casilla de "enviar correo". Sirve para alumnos particulares o miembros heredados que no pasan
  por Stripe. Crea (o reutiliza) la cuenta y le concede una suscripción **sin `current_period_end`**
  (acceso indefinido hasta que Emi lo quite), identificada con el id sintético `manual_<userId>`.
- **Quitar acceso** borra solo esa concesión manual. **Nunca toca Stripe**; las bajas reales van por
  el portal.

### Pestaña "Foro"
Muestra **solo las preguntas sin responder de ejercicios que están en vivo ahora**. Cada tarjeta
trae avatar, nombre, "hace X", etiqueta de idioma (ES/EN) y el ejercicio al que pertenece, con un
textarea para responder. Al responder, la tarjeta se marca ✓ y baja el contador.

---

## 6. Modelo de datos

7 migraciones en `supabase/migrations/`, todas idempotentes y pensadas para pegarse en el SQL Editor.

```
profiles                              -- extiende auth.users
  id uuid PK → auth.users             email · full_name
  preferred_lang lang ('es'|'en')     role user_role ('member'|'admin') default 'member'
  created_at

subscriptions                         -- espejo del estado de Stripe
  id uuid PK · user_id → profiles
  stripe_customer_id · stripe_subscription_id (ÚNICO)
  status text                         -- 'active', 'past_due', 'canceled'…
  tier price_tier ('founder_57'|'standard_77')
  current_period_start · current_period_end · cancel_at_period_end · updated_at

exercises                             -- TODO el contenido: semana, base y bonus
  id uuid PK
  kind content_kind ('semana'|'base'|'bonus') default 'semana'
  title_es/title_en · desc_es/desc_en · vimeo_url_es/vimeo_url_en · pdf_path_es/pdf_path_en
  week_label · publish_at · unpublish_at · created_at

questions   id · exercise_id · user_id · lang · body · author_name · created_at
answers     id · question_id · user_id (admin) · body · created_at
completions user_id · exercise_id · completed_at        ⚠️ tabla EXISTE pero NO se usa (ver §12)
```

### Funciones auxiliares (`SECURITY DEFINER`, para evitar recursión de RLS)
- `is_admin()` — ¿el usuario actual tiene `role='admin'`?
- `has_active_sub()` — ¿tiene una fila `status='active'` con `current_period_end` nulo o futuro?
- `my_lang()` — su idioma preferido.
- `handle_new_user()` — trigger en `auth.users` que **crea el profile automáticamente** al registrarse.

### La política que sostiene todo el negocio
```sql
create policy "exercises: member current" on public.exercises for select using (
  has_active_sub()
  and now() >= publish_at
  and (kind = 'bonus' or now() < unpublish_at)
);
```
La visibilidad se calcula **en vivo** comparando `now()` contra las fechas. **No hay cron**, no hay
job que "publique" nada: el contenido aparece y desaparece solo. Es frágil-proof y hay que
conservarlo tal cual en cualquier migración.

Resto de reglas: cada quien lee solo su propio profile y su propia suscripción; un miembro **no
puede auto-ascenderse a admin** (`with check (… and role = 'member')`); el admin lee y escribe todo;
las escrituras de `subscriptions` las hace el webhook con `service_role`, que ignora RLS.

### Storage
Bucket **público** `pdfs`. Lectura libre (por eso el aula usa `getPublicUrl`), **subida/edición/borrado
solo admin**.

---

## 7. Auth — cómo entra la gente hoy

Se **eliminó el enlace mágico**. Hoy es **correo + contraseña**, con tres caminos de entrada:

1. **"Contraseña al pagar"** (el camino feliz, cero correo). Stripe redirige a
   `/gracias/?session_id={CHECKOUT_SESSION_ID}` → el comprador elige su contraseña ahí mismo →
   `POST /api/claim-account` verifica contra Stripe que esa sesión está **pagada**, saca el correo
   **del propio checkout** (no del navegador), crea la cuenta, fija la contraseña y espeja la
   suscripción → el navegador hace `signInWithPassword` y entra.
   *Nota de seguridad del código: la autorización es "tener un session_id pagado", y el correo nunca
   viaja desde el cliente, así que no hay toma de cuentas conociendo el correo de otro.*
2. **"Es mi primera vez"** en `/entrar/`: se manda un **código de 8 dígitos** por correo
   (`generateLink` type `recovery` → `email_otp`), el miembro lo teclea **en la misma pantalla**
   junto con su contraseña nueva, y `verifyOtp({type:'recovery'})` la fija e inicia sesión.
3. **Enlace por correo** → `/nueva-clave/`. Sirve igual para primera vez y para recuperación.

**"Mantener sesión iniciada"**: hay un adaptador de storage propio en `src/lib/supabase.ts`. La
casilla escribe `erm_remember` en `localStorage` **antes** de iniciar sesión, y el token va a
`localStorage` (sobrevive al cierre del navegador) o a `sessionStorage` (se borra al cerrar). El
logout limpia ambos.

⚠️ **Para la integración:** la sesión vive en **storage del navegador, por origen**. Cambiar de
dominio significa que **todo el mundo tiene que volver a entrar**, y hay que añadir las nuevas URLs
a *Supabase → Authentication → URL Configuration → Redirect URLs* (estar en Site URL no basta).

---

## 8. Pagos — Stripe de punta a punta

**Flujo elegido: pago anónimo.** El visitante **no inicia sesión antes de pagar**. Stripe recolecta
el correo y el sistema crea/enlaza la cuenta después. Esto baja la fricción de la carta de ventas y
es una decisión de producto, no un accidente.

```
Carta → GET /api/checkout?lang=xx → Stripe Checkout → pago
   ├─ redirect a /gracias/?session_id=… → contraseña al pagar → aula
   └─ webhook checkout.session.completed → crea usuario + fila subscriptions + correo de bienvenida
```

- **Dos Prices**: fundador y estándar. `currentTier()` elige por fecha contra `STRIPE_FOUNDER_UNTIL`.
  La ventana de fundador **cerró el 23 jul 2026**, así que hoy todo el mundo entra por el estándar.
- **El precio se congela**: Stripe sigue cobrando el Price con el que entró el miembro mientras la
  suscripción siga activa.
- **Los Prices de Stripe son inmutables**: para cambiar el precio se crea uno nuevo y se apunta
  `STRIPE_PRICE_STANDARD` al nuevo + redeploy. El importe visible de la carta se edita aparte en
  `Landing.astro`.
- ⚠️ **Etiquetas heredadas**: el enum de la BD sigue diciendo `standard_77` aunque el precio sea
  €65. Es a propósito, para no migrar la BD. El monto real lo fija el Price de Stripe.
- Eventos escuchados: `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
  `invoice.paid`, `invoice.payment_failed`.
- Resolución del `user_id` en el webhook, en cascada: metadata → fila previa por customer → buscar o
  crear por correo. Después **guarda `supabase_user_id` en el metadata del customer** para que los
  eventos siguientes ya lo traigan.
- **Cancelación**: a fin de período (mantiene acceso hasta que termina el mes pagado). Sin
  reembolsos parciales, sin matrícula.
- ⚠️ **`PUBLIC_SITE_URL` es obligatoria y siempre con `www`.** En serverless, `request.url` puede
  resolver a `localhost` y Stripe devolvería al visitante ahí. Y el ápice pelado hace 308 a www:
  hay terceros que no siguen redirects — **esa fue la causa exacta del incidente del webhook**.
- **Adaptive Pricing**: la FAQ de la carta promete que se paga en la moneda de la tarjeta. Eso **no
  es el comportamiento por defecto**; hay que activarlo en el dashboard de Stripe. Está anotado como
  pendiente en `docs/STRIPE.md`.

---

## 9. Correos (Resend)

Un solo camino compartido (`src/lib/welcome-email.ts`) para que el correo automático del pago, el de
`/entrar` y el de `/gracias` sean **exactamente el mismo**:

- **Preferido**: Resend, con el copy bilingüe de Emi, formato carta (crema + tinta cálida, sin botón
  corporativo), `reply_to: info@emilserios.com`.
- **Respaldo**: si Resend no está configurado o falla, cae a la plantilla estándar de Supabase.
- Dos contenidos: **bienvenida con enlace** y **código de acceso de 8 dígitos**.
- **Privacidad**: los endpoints responden `{ok:true}` exista o no el correo. Nunca revelan quién es
  miembro.

---

## 10. Reglas de negocio que NO se pueden romper

Esto es lo que hay que preservar sí o sí en cualquier panel unificado:

1. **Un solo ejercicio semanal vigente, global, igual para todos.** Rota los jueves
   (00:00 baja / 00:01 sube, hora de Madrid). Al rotar, **el anterior desaparece**.
2. **No hay biblioteca histórica.** Es el mecanismo de exclusividad y retención. Emi lo dice
   explícitamente en la carta ("yo borro el contenido · por qué"). No es una limitación técnica.
3. **No hay niveles.** Se eliminaron en la migración `0004`. Emi guía inicial y avanzado **dentro
   del mismo video** ("si estás empezando, hasta aquí; si vas más adelantada, continúa").
4. **Dos foros separados por idioma, sin traducción automática** (decisión de costo).
5. **Solo Emi responde en el foro.** Sin interacción entre alumnos.
6. **Contenido y cobro son dos relojes independientes.** El contenido es un calendario global
   semanal; el cobro es mensual desde el alta de cada miembro. Uno no afecta al otro.
7. **El Bonus se acumula y no expira.** Es la única excepción a la regla de la ventana.

---

## 11. Identidad visual

Hay una **capa de diseño compartida** que unifica carta, aula, panel y login, en `public/`:

- `colors_and_type.css` — base reutilizable: escala tipográfica modular ~1.25, grid de 8 px,
  tokens de color con contraste WCAG AA. Regla de oro declarada: **ningún valor mágico fuera de los
  tokens**.
- `membresia-ui.css` — la identidad de la carta: paleta cálida monocromática
  (`--ink #17140f`, `--paper #faf7f1`, `--surface #fffdf8`, `--soft #6f6a61`, acento terracota
  `--accent #a94f2b`, `--wood #6b3f2a`), **una sola tipografía (Hanken Grotesk)**, logo caligráfico
  en vez de firma en texto, botones cuadrados, y **cursor de clave de fa** (la clave del contrabajo)
  con versión clara sobre fondos oscuros.
- `membresia-ui.js` — comportamiento: relleno de tinta que crece **desde la posición del cursor**,
  botones magnéticos, **notas musicales de colores** al pasar por encima, fundido `.reveal` al
  entrar en viewport. Un `MutationObserver` mejora los botones creados dinámicamente (tabla del
  panel, foro). Respeta `prefers-reduced-motion`. Sin dependencias.

Esta capa es **portable tal cual** si la web nueva quiere heredar el lenguaje visual de la academia,
o es exactamente lo que hay que reemplazar si emilserios.com impone su propio sistema. Ojo con el
cursor personalizado y las notas musicales: son muy característicos, decidir a conciencia si
sobreviven.

---

## 12. Estado real: qué funciona, qué es maqueta, qué debe

**Funciona en producción, con datos reales:** carta bilingüe · checkout y webhook de Stripe · aula con
las tres pestañas · foro completo (preguntas + respuestas de Emi) · panel de Emi completo (contenido,
miembros, foro) · login con contraseña por los tres caminos · correos por Resend · alta y baja manual
de miembros · tour de onboarding · deploy y dominio.

**Deuda técnica y cabos sueltos reales:**
- ⚠️ **La tabla `completions` existe con su RLS, pero no se usa.** El texto "Marcar como completado"
  está en el diccionario de `Aula.astro` pero **el botón no está en el markup** ni escribe nada. Si
  el panel unificado quiere progreso del alumno, hay que implementarlo (la BD ya está lista).
- ⚠️ **Enlace del portal de Stripe hardcodeado** en el menú del engranaje del aula. Debería salir de
  `/api/portal` como el otro.
- ⚠️ **Webhook de Stripe**: Adrián recibió un aviso de Stripe sobre problemas con el endpoint;
  funcionaba con normalidad y quedó anotado para revisar con calma. Las redes de seguridad lo
  cubren, pero sigue abierto.
- ⚠️ **Recorrido end-to-end completo** (Emi crea → alumno ve y pregunta → Emi responde → alumno lee
  la respuesta) figura como no cerrado formalmente en `docs/PROGRESO.md`.
- `docs/DEPLOY_VERCEL.md` está **desactualizado**: habla de `membresias.emilserios.com`, que se
  abandonó. El dominio real es `www.emilseriosacademy.com`.
- El enum `price_tier` (`founder_57` / `standard_77`) ya no corresponde a los importes reales.
- `docs/ARQUITECTURA.md` es el plano original (jun 2026) y varias cifras suyas ya no rigen; la
  fuente de verdad del histórico es `docs/PROGRESO.md` (1292 líneas, muy detallado).

---

## 13. Para la integración en emilserios.com — lo que hay que decidir

Esto no es un plan, es el **inventario honesto de decisiones y fricciones**. Quien diseñe el panel
unificado necesita resolver cada punto.

### 13.1 Lo que se reutiliza casi gratis
El frontend es estático y **toda la lógica de acceso vive en la BD**. Eso significa que
**cualquier frontend nuevo** —Astro, Next, lo que use emilserios.com— puede reusar el mismo proyecto
de Supabase con el mismo `anon key`, y **hereda el gating completo sin reescribir una sola regla**.
La membresía es, en la práctica, "Supabase + un frontend"; el frontend es la parte desechable.

### 13.2 La decisión grande: identidad de usuario
Hoy hay **dos mundos de usuarios que no se conocen**: los de Supabase (membresía) y los del
WordPress + Tutor LMS (cursos de Emi). "Un solo panel" obliga a elegir una fuente de identidad:
- **Supabase como fuente única** y los cursos migrados a la app nueva → lo más limpio a largo plazo,
  pero implica migrar contenido y compradores de Tutor LMS.
- **Mantener WordPress para cursos** y un panel que consulte los dos → evita la migración pero
  duplica identidad y complica el login.
- **Migración por fases**: panel unificado sobre Supabase, con los cursos entrando después.

Hay que decidir esto **antes** que cualquier otra cosa, porque condiciona todo lo demás.

### 13.3 Suscripción vs. compra única — falta el concepto de "derecho de acceso"
Hoy el acceso es una sola pregunta binaria: `has_active_sub()`. Eso sirve para **una** membresía y
para nada más. Los cursos de Emi son **compra única con acceso permanente**, que es una forma
distinta. Un panel unificado necesita un modelo de **entitlements** (algo como
`entitlements(user_id, product_id, source, granted_at, expires_at)`) y que las políticas RLS
pregunten por eso en vez de por "¿hay fila activa?".

**Recomendación concreta:** no estirar la tabla `exercises` con más valores de `kind` para meter los
cursos. Un curso tiene forma distinta (módulos, lecciones, orden, progreso, acceso permanente) y
`exercises` está optimizada para "una fila vigente a la vez con ventana temporal". Modelo aparte
(`courses` / `lessons`), entitlements comunes.

### 13.4 Fricciones técnicas concretas al mover el dominio
- **Sesiones**: viven en `localStorage` por origen → **todos vuelven a entrar**. Avisarlo.
- **Supabase → Redirect URLs**: hay que añadir las nuevas (`/entrar/`, `/nueva-clave/`, y los
  comodines de Preview). Sin esto, los enlaces de correo caen al Site URL viejo.
- **Stripe**: cambiar `PUBLIC_SITE_URL`, la URL del endpoint del webhook, y el enlace hardcodeado
  del portal en el engranaje del aula.
- **Vimeo**: la restricción por dominio hay que actualizarla o los videos se bloquean **aunque el
  embed sea correcto** (el iframe ya manda `referrerpolicy="strict-origin-when-cross-origin"`
  justamente por esto).
- **Resend**: si emilserios.com pasa a estar bajo control, verificar ese dominio y usar el buzón real
  de Emi como remitente de verdad.
- **SEO**: hoy solo la carta es indexable y todo lo privado va `noindex`, con `hreflang` entre ES y
  EN. Al fusionar, decidir si la carta de la academia sigue siendo su propia landing dentro de
  emilserios.com y qué pasa con las URLs viejas (redirects 301).

### 13.5 Lo que NO se debe "mejorar" en la fusión
La tentación evidente al unificar es dar biblioteca histórica ("ya que tenemos los cursos con acceso
permanente, dejemos también los ejercicios pasados"). **Eso rompe el producto**: la desaparición
semanal es lo que Emi vende y lo que argumenta en la carta. Los cursos son permanentes; la membresía
es efímera. En un panel único **tienen que convivir dos temporalidades distintas**, y eso hay que
comunicarlo bien en la UI para que no parezca un error.

### 13.6 Preguntas abiertas para Emi/Adrián
- ¿Los cursos de Tutor LMS se migran, se enlazan o conviven?
- ¿Quien compra un curso ve algo de la membresía, y al revés? ¿Hay bundle?
- ¿La carta de ventas de la academia sobrevive como página propia o se integra en el sitio nuevo?
- ¿Se recupera el control del DNS de emilserios.com? (destraba correo y subdominios)
- ¿Se implementa por fin el progreso del alumno (`completions`)?

---

## 14. Variables de entorno (referencia completa)

```
PUBLIC_SITE_URL              # canónico CON www — obligatorio para las URLs de retorno de Stripe
PUBLIC_SUPABASE_URL          # público
PUBLIC_SUPABASE_ANON_KEY     # público (la seguridad la da la RLS)
SUPABASE_SERVICE_ROLE_KEY    # ⚠️ solo servidor — ignora la RLS
RESEND_API_KEY               # solo servidor
RESEND_FROM                  # "Emilse Rios <info@emilseriosacademy.com>"
STRIPE_SECRET_KEY            # solo servidor
STRIPE_WEBHOOK_SECRET        # solo servidor
STRIPE_PRICE_FOUNDER         # price_… (no prod_… — confundirlos tumbó el checkout el 24 jul)
STRIPE_PRICE_STANDARD        # price_… del estándar vigente (€65)
STRIPE_FOUNDER_UNTIL         # ISO Madrid; cerró el 2026-07-23T23:59:59+02:00
GOOGLE_SITE_VERIFICATION     # opcional
PUBLIC_GA_MEASUREMENT_ID     # opcional — sin esto, GA4 no existe y el banner de cookies no se pinta
```

Las `PUBLIC_*` se **incrustan al compilar**: tienen que estar antes del primer deploy, o hay que
hacer redeploy.

---

## 15. Índice de archivos (por si hace falta leer el original)

| Archivo | Qué es |
|---|---|
| `src/components/membresia/Aula.astro` | El panel del miembro, completo (1307 líneas) |
| `src/pages/panel/index.astro` | La consola de Emi, completa (1068 líneas) |
| `src/components/membresia/Landing.astro` | La carta de ventas bilingüe (990 líneas) |
| `src/components/membresia/Login.astro` | `/entrar` con los dos modos (588 líneas) |
| `src/components/membresia/Gracias.astro` | Post-pago + contraseña al pagar (352 líneas) |
| `src/components/membresia/NuevaClave.astro` | Crear/restablecer contraseña (261 líneas) |
| `src/lib/supabase.ts` | Cliente del navegador + storage "recordarme" |
| `src/lib/supabase-admin.ts` | `service_role`, crear usuarios, generar enlaces y códigos |
| `src/lib/stripe.ts` / `stripe-sync.ts` | Tiers, precios, `siteOrigin()`, espejo de suscripciones |
| `src/lib/email.ts` / `welcome-email.ts` | Resend + copy bilingüe de Emi |
| `supabase/migrations/0001…0007` | Esquema, foro, storage, quitar niveles, cache, índice Stripe, `kind` |
| `supabase/set_admin.sql` | Lista de admins (Emi + Adrián) y alumno de prueba. Idempotente |
| `docs/PROGRESO.md` | **El histórico real**, 1292 líneas, con cada incidente y decisión |
| `docs/ARQUITECTURA.md` | El plano original (jun 2026); varias cifras ya no rigen |
| `docs/STRIPE.md` | Configuración de pagos paso a paso |
| `public/membresia-ui.css` / `.js` | La capa de diseño compartida |
