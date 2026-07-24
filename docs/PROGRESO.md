# Progreso — Membresía "Estudiemos Juntos"

> Bitácora para retomar el proyecto en cualquier sesión/chat. Es la fuente de
> verdad del estado. Si retomas en un chat nuevo, lee esto primero + `docs/ARQUITECTURA.md`.

## 🗓️ 24 jul 2026 — `/entrar → «Es mi primera vez»`: crear la contraseña EN LA MISMA pantalla (código de 6 dígitos)
> **Pedido de Adrián:** que en «Es mi primera vez» se pueda **crear la contraseña ahí mismo**, sin
> el ida-y-vuelta de "te mando un enlace → abrís el correo → clic → caes en otra página → creás la
> clave". Seguía con el enlace por correo → se rehízo.
>
> **Por qué no basta "solo correo + contraseña" (sin correo):** en `/entrar` no hay prueba de que
> quien teclea el correo es su dueño (a diferencia de `/gracias`, que tiene la sesión de Stripe).
> Para que fuera seguro habría que limitar el atajo a "cuentas sin contraseña aún", pero **Supabase
> no expone de forma fiable si una cuenta ya tiene contraseña**, así que no se puede acotar → sería
> un agujero permanente de robo de cuenta (cualquiera que sepa un correo resetea esa clave). Se
> descartó.
>
> **Solución (inline con código, seguro y con el copy de Emi):**
> - **Paso 1:** el miembro escribe su correo → **`POST /api/send-access-code`** genera un **código
>   de un solo uso** (`admin.generateLink({type:'recovery'})` → se toma el `email_otp`, sin enviar
>   el correo nativo) y lo manda **por Resend con el copy de Emi** (nueva plantilla
>   `accessCodeEmailContent`, muestra el código grande). Por privacidad responde igual exista o no
>   el correo.
> - **Paso 2 (misma pantalla, no navega a ningún lado):** teclea el código + su contraseña →
>   `supabase.auth.verifyOtp({ type: 'recovery' })` (verifica el código **e inicia la sesión**) →
>   `supabase.auth.updateUser({ password })` fija la clave → entra al aula por rol.
> - El código sigue probando que el buzón es suyo (seguridad intacta), pero **nunca sale de
>   `/entrar`**. Bilingüe ES/EN, casilla "mantener sesión" implícita (`erm_remember='1'`).
> - Piezas: `Login.astro` (panel «primera vez» en dos pasos + enlace «Enviar un código nuevo»),
>   `send-access-code.ts` (endpoint), `welcome-email.ts` (`sendAccessCode`), `email.ts`
>   (`accessCodeEmailContent`), `supabase-admin.ts` (`generatePasswordSetupOtp`).
> **Esto reemplaza el enlace por correo SOLO en `/entrar`;** el correo de bienvenida automático (al
> pagar, webhook) y `/gracias` no cambian. Sin BD ni variables nuevas (usa Resend + service_role
> ya existentes). ⚠️ **Requiere Resend configurado** (si falta, no sale el código). Verificado con
> `npm run build` + capturas headless de los dos pasos (ES). Rama `claude/signup-login-first-visit-zqrt3b`.
> - **Corrige la decisión del 24 jul:** antes se había "descartado" el código de 6 dígitos porque se
>   asumió que obligaba a la **plantilla nativa de Supabase**. No es así: `generateLink` devuelve el
>   `email_otp` sin enviar correo, así que el código se manda por **Resend con el copy de Emi**. Con
>   eso se resuelve la objeción y se pudo hacer inline.

## 🗓️ 24 jul 2026 — "Contraseña al pagar" en `/gracias` (cero correo para el recién pagado) ✅ MERGEADO (PR #62)
> **Problema (Adrián):** el flujo de primera vez era largo — pagar → escribir el correo →
> esperar el correo → abrir el enlace → volver a la plataforma → crear contraseña → recién
> entrar. Para "gente medio bruta" son demasiados pasos y muchos se caían en el camino.
>
> **Decisión de diseño (clave):** el correo con enlace no es solo fricción, es la **prueba de
> identidad** (que quien teclea es el dueño del buzón). Stripe contesta "¿este correo pagó?"
> pero NO "¿quién teclea es el dueño?". Si en `/entrar` dejáramos crear contraseña solo
> verificando "¿pagó?", cualquiera que sepa el correo de un miembro podría tomarle la cuenta.
> **El único punto donde se puede saltar el correo sin ese riesgo es JUSTO al pagar**, porque
> ahí Stripe nos redirige con la **sesión de checkout**, que sí prueba que *esa* persona pagó
> (nadie más tiene ese id). Adrián eligió esta vía.
>
> **Qué se hizo (solo código, sin BD ni migración):**
> 1. **`checkout.ts`:** el `success_url` ahora lleva `?session_id={CHECKOUT_SESSION_ID}`
>    (placeholder que Stripe rellena).
> 2. **Nuevo `POST /api/claim-account`** `{ session_id, password }`: pide la sesión a Stripe,
>    verifica que sea una suscripción **completada y pagada**, saca el **correo del propio
>    checkout** (no lo teclea el usuario → no hay toma de cuentas), crea/encuentra la cuenta
>    (mismo criterio que el webhook) y **fija la contraseña** con `updateUserById` (service_role).
>    Además **espeja la suscripción** en la BD por si el webhook aún no llegó, para que el aula
>    lo deje pasar de inmediato.
> 3. **`Gracias.astro` (dos modos):** si la URL trae `session_id` (el caso normal al venir de
>    Stripe), muestra un cuadro **«Crea tu contraseña → Entrar»** (sin el aviso rojo de "no
>    cierres la pestaña", ya no hay que esperar nada). Al enviar: `claim-account` fija la clave →
>    el navegador hace `signInWithPassword` con el correo del pago + esa clave → **entra directo
>    al aula**. Cero correo. Si NO hay `session_id` (o el comprador toca «¿Prefieres recibir el
>    acceso por correo?»), cae al **flujo de correo de siempre**, con el copy definitivo de Emi
>    intacto. Un script inline decide el modo antes de pintar (sin parpadeo).
> 4. Se **extrajo `findOrCreateUser`** del webhook a `supabase-admin.ts` (compartido) para que el
>    webhook y `claim-account` den de alta la cuenta con EXACTAMENTE el mismo criterio.
> Sin variables nuevas (usa `SUPABASE_SERVICE_ROLE_KEY` y las claves de Stripe que ya están).
> **Requiere redeploy** para que los nuevos checkouts salgan con el `session_id` en el
> `success_url`. Verificado con `npm run build` + capturas headless de los dos modos (contraseña
> y respaldo por correo, ES/EN). Rama `claude/signup-login-first-visit-zqrt3b`, **PR #62** (aparte
> del toggle de `/entrar`, que se mergeó antes en el PR #61).
> ⚠️ **Config al mergear:** hacer **redeploy en Vercel** para que los checkouts nuevos salgan con
> el `session_id` en el `success_url` (sin eso, `/gracias` sigue cayendo al modo correo).
> - **Copy del modo contraseña:** provisional en la voz de la marca; Adrián lo ajusta si hace falta.
> - **Cabo suelto de seguridad (menor, anotado):** la autorización de `claim-account` es "tener un
>   `session_id` de Stripe pagado". Si alguien consiguiera un `session_id` ajeno (p. ej. historial
>   de un navegador compartido), podría re-fijar esa contraseña. Exposición baja (el id vive en la
>   URL de `/gracias` de esa persona). Se puede endurecer más adelante (p. ej. permitirlo solo si
>   la cuenta aún no tiene contraseña).
> - **Código de 6 dígitos en `/entrar` — REACTIVADO y hecho (ver la entrada de arriba del 24 jul).**
>   Primero se "descartó" creyendo que obligaba a la plantilla nativa de Supabase; luego se vio que
>   `generateLink` da el `email_otp` sin enviar correo, así que el código se manda por Resend con el
>   copy de Emi. Con eso `/entrar → «Es mi primera vez»` **crea la contraseña en la misma pantalla**
>   (correo → código → clave → adentro), sin el enlace/ida-y-vuelta.

## 🗓️ 24 jul 2026 — `/entrar`: toggle «Ya tengo contraseña» / «Es mi primera vez» ✅ MERGEADO (PR #61)
> **Problema (Adrián):** la gente que paga y entra por primera vez **no crea su contraseña**.
> La cuenta se crea SIN clave al pagar, así que la primera vez hay que pedir un enlace de un
> solo uso (→ `/nueva-clave/`). Eso vivía en un **link chico al pie** («Crea o restablece tu
> contraseña») que los usuarios menos técnicos no veían: intentaban entrar con una contraseña
> que nunca fijaron y se trababan.
>
> **Fix (solo UI, sin BD ni migración):** en `Login.astro` se convirtió esa decisión en un
> **control segmentado grande arriba de la tarjeta** (estilo editorial, pista hundida sobre el
> crema + pestaña activa en papel), con dos modos:
> - **«Ya tengo contraseña»**: el formulario de siempre (correo + contraseña + «Mantener la
>   sesión» + Entrar). Debajo, «¿Olvidaste tu contraseña?» ahora **salta al otro modo** en vez
>   de disparar el correo directo.
> - **«Es mi primera vez» (modo por defecto)**: solo pide el correo + botón **«Enviarme mi
>   acceso»**, que usa el
>   MISMO camino de antes (`POST /api/send-access-email` → Resend con el copy bilingüe de Emi →
>   `/nueva-clave/`). Sirve igual para «olvidé mi contraseña».
> - El correo escrito se **copia entre los dos modos** al alternar (no hay que re-tipearlo). El
>   `h1`/subtítulo cambian por modo. Bilingüe ES/EN. Los mensajes de error de login que antes
>   decían «usa el enlace de abajo» ahora dicen «cambia a “Es mi primera vez”».
> - Deliberadamente **NO** se usó la palabra «Registrarse»: la cuenta ya existe (se creó al
>   pagar); el usuario solo **crea su contraseña**. Para la audiencia menos técnica «Es mi
>   primera vez» es más claro.
> **Default = «Es mi primera vez»** (decisión de Adrián): el que llega directo a `/entrar` casi
> siempre acaba de pagar y aún no tiene contraseña; y quien ya la tiene y marcó «Mantener la
> sesión iniciada» no vuelve a ver esta pantalla. Así el modo por defecto atiende al caso más
> común. El que ya tiene clave cambia con un clic a «Ya tengo contraseña».
> Verificado con `npm run build` + volcado del HTML (ES/EN: toggle, ambos paneles, botón) y
> **capturas headless** de los dos modos (layout y copy correctos). Rama
> `claude/signup-login-first-visit-zqrt3b`.

## 🗓️ 24 jul 2026 — RESUELTO: "Acá te unes" daba 500 — era `prod_` en vez de `price_`
> **Síntoma:** el botón **"Acá te unes"** (`/api/checkout`) devolvía un **500 genérico de Vercel**
> ("This page isn't working"). El precio sigue en **$80** (el cambio a $90 fue un typo y se revirtió).
>
> **Causa raíz (confirmada por logs):** en Vercel, **`STRIPE_PRICE_STANDARD` tenía un Product ID
> (`prod_...`) en vez de un Price ID (`price_...`)**. El log de la función lo dijo literal:
> `Error: No such price: 'prod_Uw9RfwxN3nyh8X'`. Stripe Checkout (`line_items[].price`) exige el
> **Price ID** (`price_...`), no el Product ID (`prod_...`). **NO era** test/live ni la Secret Key
> (esa ya funcionaba). Salió a la luz ahora porque ayer 23 jul cerró la ventana de fundador
> (`STRIPE_FOUNDER_UNTIL = 2026-07-23T23:59:59+02:00`) y el checkout pasó a usar `STRIPE_PRICE_STANDARD`.
>
> **Fix (solo config, sin código):** en Stripe → Products → el producto → sección **Pricing** →
> copiar el **`price_...`** de la fila del precio de $80/mes (NO el `prod_...` grande de la
> cabecera) → pegarlo en **`STRIPE_PRICE_STANDARD`** en Vercel (Production) → **Redeploy**.
> Verificado: el botón vuelve a llevar a Stripe Checkout.
>
> **Aprendizajes / trampas para la próxima:**
> 1. **`prod_...` ≠ `price_...`.** El `prod_` es el producto; el `price_` es cada precio que
>    cuelga de él. Las variables `STRIPE_PRICE_*` SIEMPRE llevan `price_...`. Stripe muestra el
>    `prod_` más visible en la cabecera → es fácil copiar el equivocado. (Revisar también
>    `STRIPE_PRICE_FOUNDER` por si tiene el mismo error.)
> 2. **El monto mostrado (carta) y el monto cobrado (Price de Stripe) son independientes.**
>    Cambiar la carta no cambia el cobro; para subir el precio real hay que crear un Price NUEVO
>    en Stripe (los precios son inmutables) y repuntar `STRIPE_PRICE_STANDARD`.
> 3. **Un 500 genérico de Vercel = excepción no capturada**; los distintos (texto plano
>    "Falta configurar el precio…") son guardas del propio código. El motivo real siempre está
>    en **Vercel → Logs** de la función.
>
> **Cambio de código de esta sesión:** `src/pages/api/checkout.ts` ahora envuelve
> `stripe.checkout.sessions.create` en **try/catch**: registra el detalle en los logs y devuelve
> el motivo de Stripe (sin secretos) en vez de un 500 pelón, para diagnosticar más rápido la
> próxima vez. (Rama `claude/por-que-apareceria-esto-wpkw8d`.)

## 🗓️ 23 jul 2026 — Precio estándar $77 → $80 + precio dinámico en la carta
> Emi subió el precio estándar (el de después del fundador) de **$77 a $80/mes** y quiere
> **cerrar la ventana de fundador hoy 23 jul a las 23:59** (hora Madrid). Cómo funciona el
> precio: el checkout lee **dos Price IDs de Stripe** desde variables de Vercel
> (`STRIPE_PRICE_FOUNDER` / `STRIPE_PRICE_STANDARD`) y una fecha de corte
> (`STRIPE_FOUNDER_UNTIL`) decide cuál cobrar.
>
> **Lo que hace Emi + Adrián (config, NO código):**
> 1. En Stripe los precios son **inmutables**: no se edita el de $77. Emi **crea un Price NUEVO
>    de $80/mes** sobre el mismo producto y pasa su `price_...`.
> 2. En Vercel: **`STRIPE_PRICE_STANDARD`** = el nuevo Price ID de $80; y
>    **`STRIPE_FOUNDER_UNTIL`** = `2026-07-23T23:59:59+02:00`. **Redeploy** para que tomen efecto.
>    (La variable ya existía, pero apuntaba al Price de $77 — por eso no bastaba con tocar Stripe.)
> Los que ya pagaron $57 **siguen en $57** (Stripe congela el precio de cada suscripción).
>
> **Lo que se hizo en código (este PR):** la carta mostraba **"$57" y "solo del 16 al 23 de
> julio"** escritos a mano → al cerrar la ventana quedaría desalineada con el cobro real. Se
> hizo el precio de la tarjeta **dinámico**: hay dos estados de copy (fundador / estándar) por
> idioma; el estado por defecto se renderiza en el build según `STRIPE_FOUNDER_UNTIL`, y un
> **script inline en el cliente** compara la hora real del visitante con esa misma fecha de corte
> y aplica el estado correcto (fundador `$57` + ventana ↔ estándar `$80` sin la línea de
> fundador). Así **cambia solo en el momento del corte, sin depender de un redeploy** y con la
> **misma fecha** que usa el checkout (fuente de verdad única). Es solo la carta (`Landing.astro`);
> no se tocó la lógica del checkout ni la BD.
> - **Etiqueta heredada:** el enum de la BD/código sigue siendo `standard_77` (columna
>   `price_tier` de `0001_init.sql`). Es solo un bucket que mapea Price ID ↔ fila; con $80 el
>   nombre queda de mentiroso pero **funciona igual**. Renombrarlo exigiría migración → se dejó
>   como limpieza opcional (comentado en `src/lib/stripe.ts`).
> Verificado con `npm run build` + volcado del HTML (ES/EN): ambas variantes de copy quedan
> embebidas para el flip y el script inline está presente.

## 🗓️ 23 jul 2026 — Login bilingüe (toggle EN/ES)
> La pantalla de **login (`/entrar`) solo existía en español**, a diferencia del resto del
> flujo (`/aula`, `/gracias`, `/nueva-clave`, la carta) que ya es bilingüe. Adrián pidió
> agregarle un **toggle EN/ES**. Se siguió el mismo patrón que las demás pantallas bilingües:
> - Se extrajo `src/pages/entrar/index.astro` a un **componente `Login.astro`** con prop
>   `lang` (`'es' | 'en'`): todos los textos del markup y los mensajes/estados del lado del
>   cliente (errores de login, "Entrando…", aviso de sesión ya iniciada, envío del correo de
>   acceso) quedan traducidos.
> - Rutas: **`/entrar/`** (es) y nueva **`/entrar/en/`** (en), thin wrappers que importan el
>   componente con su `lang` (igual que `/gracias/en/` y `/nueva-clave/en/`).
> - **Píldora EN/ES** fija arriba a la derecha (mismo vidrio esmerilado y estilo que la carta
>   de ventas), que navega entre las dos rutas.
> - El correo de «Crea o restablece tu contraseña» ahora sale en el **idioma de la página**
>   (`lang: pageLang` a `/api/send-access-email`), no siempre en español.
> - El login en inglés enruta a **`/aula/en/`** (antes solo `/aula/`).
> - La carta de ventas en EN ahora enlaza su "Log in" a `/entrar/en/` (antes siempre a `/entrar/`).
> Sin BD ni migración; solo UI. Verificado con `npm run build` + volcado del HTML renderizado
> (ES y EN: título, textos y la píldora con ambos enlaces presentes en cada página).

## 🗓️ 18 jul 2026 — PRIMER SUSCRIPTOR + incidente del webhook (308) RESUELTO
> **¡Primer suscriptor oficial de pago!** 🎉 El pago entró en Stripe pero el miembro **no
> aparecía en la plataforma**. Diagnóstico y arreglo end-to-end:
>
> **Síntoma:** en Stripe → Developers → Webhooks, **TODAS** las entregas fallaban con
> **`308 ERR`** (`checkout.session.completed`, `customer.subscription.created/updated`,
> `invoice.paid`) → "Failed, next retry in N minutes". Como el pago no dispara nada por sí solo
> (el puente es el webhook: crea el usuario en Supabase + escribe la fila de `subscriptions` +
> manda el correo de bienvenida), el comprador quedaba pagado en Stripe pero **sin cuenta**.
>
> **Causa raíz:** `308 = Permanent Redirect`. El endpoint del webhook en Stripe apuntaba al
> dominio **sin `www`** (`https://emilseriosacademy.com/api/stripe-webhook`), y en Vercel el
> canónico es **`www`**, así que Vercel respondía 308 redirigiendo a `www.…`. **Stripe NO sigue
> redirects en webhooks** → marcaba cada entrega como fallida y reintentaba contra la misma URL
> rota. No era bug de código (fallaban TODOS los tipos de evento por igual → problema de URL, no
> de lógica).
>
> **Arreglo (solo config, sin código ni deploy):** Adrián editó la URL del endpoint en Stripe a
> la versión canónica **con `www`**: `https://www.emilseriosacademy.com/api/stripe-webhook`.
> Verificado: el siguiente evento entró **`200 OK`**. Los eventos viejos en 308 se reenvían
> (**Resend**) o se auto-curan en el próximo reintento (el webhook es idempotente: upsert por
> `stripe_subscription_id` único). El primer suscriptor quedó **confirmado en Supabase y en
> `/panel → Miembros`** con suscripción activa.
>
> **Regla para el futuro:** cualquier URL que consuma un tercero que NO siga redirects (webhooks
> de Stripe, etc.) debe apuntar SIEMPRE al host **canónico `www.emilseriosacademy.com`**, nunca
> al ápice pelado. Lo mismo para los **Redirect URLs de Supabase** (`/nueva-clave/` con `www`) y
> `PUBLIC_SITE_URL` en Vercel (`https://www.emilseriosacademy.com`), para que el enlace del correo
> de bienvenida no se rechace.
>
> ⚠️ **Cabo suelto de config (no bloquea, para limpiar):** `astro.config.mjs` todavía tiene
> `site: 'https://membresias.emilserios.com'` (el dominio abandonado). No afecta el webhook
> —`siteOrigin()`/`PUBLIC_SITE_URL` resuelven el host real— pero conviene actualizarlo al
> dominio canónico `www.emilseriosacademy.com` para canonical/sitemap.

## 🗓️ Trabajo de hoy (16 jul 2026) — checklist en curso
> Un cambio por rama/PR desde `main`, según el flujo con Adrián. La marca del checklist
> viaja en el mismo PR de cada punto.
> **Ajuste suelto (18 jul, rama `claude/emi-logo-size-tggyg2`, PR #53):** el logo de Emi arriba
> a la izquierda del **`/panel`** se veía chico. **Primer intento (no funcionó):** subir la altura
> del `<img>` (`clamp(30–44px)`). Casi no se notó y Adrián avisó. **Causa real:** el PNG
> `logo_emi_alpha.png` es 2560×1440 pero el glifo real («Emilse Rios») solo ocupa una caja de
> 1631×487 **en el centro** — o sea **~34% del alto del archivo es margen transparente**. Como
> `height` fija la caja de la imagen (margen incluido), subir la altura agranda sobre todo el aire
> vacío; el glifo visible seguía chico. **Arreglo:** se generó `public/img/logo_emi_trim.png` (el
> mismo logo pero recortado al contenido, sin el margen), se apuntó la barra del panel a ese archivo
> y se puso `height: clamp(30px, 3.4vw, 38px)`. Ya recortado, la altura de la caja = altura visible
> del logo, así que a **38px** se ve claramente más grande que el original a 44px (verificado con
> captura headless comparando antes/después). Solo `src/pages/panel/index.astro` + el asset nuevo,
> override local (no toca `membresia-ui.css`), sin BD ni migración. **Pendiente opcional:** el aula,
> `/entrar` y `/gracias` siguen usando el PNG con margen — si se quiere el logo igual de grande ahí,
> conviene apuntarlos al mismo `logo_emi_trim.png`.
> **Continuación — logo parejo en toda la app (18 jul, rama `claude/logo-parejo-barras`, PR
> nuevo):** Adrián pidió que quede parejo en todos lados. Se apuntaron al `logo_emi_trim.png`
> (recortado, sin margen) las páginas que faltaban, respetando dos familias de tamaño:
> - **Barras** (`/panel` ya estaba + **`/aula`**): `height: clamp(30px, 3.4vw, 38px)` — se
>   bajó la del aula de `clamp(30–44)` a `clamp(30–38)` para que las dos barras midan igual.
> - **Encabezados centrados** (`/entrar`, `/gracias`, `/nueva-clave`): logo grande centrado.
>   En `/entrar` y `/gracias` el ancho pasó de `clamp(190–300px)` a `clamp(121–191px)` (× ~0.64)
>   para que el glifo se vea **del mismo tamaño que antes** ahora que la caja no incluye el aire
>   vacío lateral (no crecen ni encogen; solo usan el asset limpio). **`/nueva-clave`** además se
>   convirtió de logo chico en línea (heredaba el estilo de barra) a **encabezado centrado grande
>   igual que los otros dos** — antes desentonaba en el mismo flujo.
> - La **tarjeta de acceso (gate) de `/panel`** también pasó al asset recortado.
> - **`Landing.astro` (carta de ventas pública) NO se tocó** — su hero está diseñado aparte.
> Verificado con `npm run build` + capturas headless de `/entrar`, `/gracias` y `/nueva-clave`
> (los tres con el logo idéntico y centrado). Solo swaps de `src` + ajustes de tamaño; sin BD ni
> migración. Cuando este PR se mergee, `logo_emi_alpha.png` queda sin uso salvo en la carta.
> **Hechos y MERGEADOS hoy:** punto **2** (saludo sin nombre, PR #27), puntos **3 + 4 + 12
> (pestañas)** (PR #28), punto **5** (identidad visual de la carta, PR #30), punto **7**
> (ingreso con **correo + contraseña**, fuera el enlace mágico, casilla "mantener sesión",
> `/nueva-clave/`, PR #31), punto **8** (el webhook envía el correo de bienvenida al pagar,
> PR #32), **8b** (correo de bienvenida **bilingüe ES/EN** por Resend + `/nueva-clave/en/`,
> PR #33), punto **9** (página de agradecimiento bilingüe, PR #34), punto **1** — copy
> definitivo de la página de ventas: texto exacto de Adrián (PR #35) + ajustes de énfasis y
> orden — bold/itálica en varios párrafos, mover "Mucho para muchos" debajo del cuadro de
> precio con un tercer botón (PR #36) —, **8c** (arreglo del correo de acceso que no pasaba
> por Resend en `/entrar` y `/gracias`, PR #38, **confirmado funcionando en producción por
> Adrián**), un ajuste de encabezado en `/gracias` pedido después por Adrián (logo grande, aviso
> rojo con glow, título en dos líneas, PR #40) y el punto **11** (selector de destino del video
> en `/panel` — Ejercicio de la semana / Concepto Base / Bonus Material —, con lo que Concepto
> Base y Bonus Material dejan de ser maqueta en `/aula`, PR #41). Ver detalle abajo.
> **Segunda tanda del mismo día (16 jul):** ajuste de encabezado de `/entrar` (logo grande y
> centrado como en `/gracias`, PR #43), punto **6** (borrar ejercicios desde `/panel`, PR #44),
> punto **10** (botón "Publicar ahora" además de "Programar", PR #45) y un punto nuevo **13**
> (menú de engranaje en el aula con **Soporte** y **Darse de baja**, PR #47 — el PR #46 del primer
> intento en la carta se cerró sin mergear, ver punto 13). Adrián además **corrió la migración
> `0007_content_kind.sql`** en Supabase (columna `kind`), así que el punto 11 (Concepto Base /
> Bonus Material) ya tiene su respaldo en la BD.
> Pendiente el resto (ver abajo): **solo el tour/onboarding del punto 12**. Adrián pasará el flujo
> del tour cuando se trabaje.
> **Tercera tanda del mismo día (16 jul) — 4 ajustes de layout del `/aula`** (rama
> `claude/aula-layout-updates-ik7ein`), todos en `Aula.astro`, sin BD ni migración:
> 1. **Logo más grande** en la barra del aula (override local: `clamp(30–44px)` en vez de
>    `22–30px`), con "Aula" al lado en escritorio y **oculto en móvil** (≤560px). No toca la
>    capa compartida, así que panel/`/entrar`/`/gracias` quedan igual.
> 2. **Se quitó el cuadro lateral "Esta semana"** del Ejercicio de la semana (título + viñetas
>    fijas no editables + botón "Marcar como completado"). La descripción pasa a **ancho
>    completo**. Se **conserva solo el botón de PDF**, reubicado bajo la descripción; cuando el
>    ejercicio **no trae PDF**, en vez de ocultarse muestra un botón **gris deshabilitado**
>    "Sin PDF para este ejercicio / No PDF for this exercise" (decisión de Adrián). El botón de
>    completado se eliminó (su lógica JS también). El Concepto Base conserva su cuadro; solo se
>    ajustó su botón de PDF al mismo comportamiento gris.
> 3. **Se quitó el aviso "Respondo los viernes…"** del encabezado del foro (Emi responde cuando
>    entra a revisar, no un día fijo); de paso el texto pendiente por pregunta pasó de "Emilse
>    responde el viernes" a "Emilse responderá pronto / will reply soon".
> 4. **Bonus Material — lightbox de video:** el video de la tarjeta ya no se incrusta pequeño
>    dentro de la tarjeta; al hacer clic se abre en un **modal grande** (16:9, fondo oscuro con
>    blur, animación de entrada) con una **"×" arriba a la derecha**; se cierra con la X, clic en
>    el fondo o Escape (y detiene la reproducción al cerrar). Verificado con `npm run build` +
>    capturas headless (barra 44px con "Aula"/30px sin ella en móvil, y el modal).

- [x] **1. Corregir el copy de la página de ventas.** ✅ Hecho. Adrián pasó el texto exacto y
      se reemplazó frase por frase en `Landing.astro` (ES, con la traducción EN actualizada en
      paralelo para mantener paridad). No fue solo redactar: el texto nuevo trae cambios
      **estructurales** de contenido (mismo sistema visual, sin tocar CSS):
      - **Apertura** ("El problema no es que te falte tiempo **para estudiar**...").
      - **"Descubrí 3 cosas"** en vez de 2: el tercer descubrimiento absorbe lo que antes era
        el párrafo aparte sobre YouTube.
      - **3 párrafos nuevos** que no existían en el copy anterior: "Esta es una membresía para
        hacer lo justo...", "Cada jueves... yo borro el contenido anterior" y "¿Por qué haría
        eso? Porque las bibliotecas abruman..." (van en el mismo bloque de texto corrido que
        ya existía, sin nuevos componentes visuales).
      - **Lista "para ti"**: baja de 7 a 6 puntos (se quitó "quieres pertenecer a una comunidad
        con un reto semanal", que no estaba en el texto de Adrián).
      - **Párrafo nuevo de comunidad** ("Los cursos se terminan, pero esta membresía siempre
        está contigo...") entre la lista "para ti / no es para ti" y el cuadro de precio.
      - **Cuadro de precio**: bullets bajan de 5 a 4 (reescritos); **fecha del precio de
        fundador cambia de "1–10 de julio" a "16–23 de julio"** (ver ⚠️ abajo, afecta
        `STRIPE_FOUNDER_UNTIL`); el texto de facturación de abajo del cuadro se reescribió
        (ya no menciona el precio de $77 porque el texto de Adrián no lo menciona). El texto
        chico "Cancela cuando quieras" bajo el botón se dejó igual (decisión de Adrián, aunque
        repite parte de la idea del párrafo de abajo).
      - **P.D.**: se agregó la frase de cierre "Si alguna vez has sentido que no sabes por
        dónde comenzar o qué estudiar, entonces también es para ti."
      - **FAQ**: pasa de 8 a 9 preguntas (se agregó "Tengo una pregunta que no aparece acá" con
        el correo `info@emilserios.com` como link `mailto:` real — cambio mínimo de plantilla
        para soportar el link dentro de la respuesta).
      - **Mensaje final**: se amplió con "Mucho para muchos. Un regalo para el que quiera
        aprender esos conceptos técnicos..." antes de "¡Estudiemos juntos!".
      - **Se eliminó la línea de "referidos"** ("¿Conoces a alguien que necesita un
        impulso...?"): no estaba en el texto real de Emi, era una línea inventada de una sesión
        anterior (ver nota en el historial de "Rediseño carta editorial").
      - **El botón del newsletter se dejó donde estaba** (al final, antes del footer): el texto
        de Adrián no menciona el newsletter, así que no se tocó su posición ni su link.
      - **Botones**: se mantuvo la estructura de botones tal cual estaba (uno dentro del cuadro
        de precio + uno standalone después del FAQ) — decisión explícita de Adrián de no
        agregar ni quitar botones, aunque el texto pegado mostraba un botón extra antes del P.D.
      - **Erratas**: se corrigieron solo tildes/espacios evidentes del texto pegado (p. ej.
        "estés donde estés", "está disponible", "en qué horarios", "escríbeme", "por dónde
        comenzar", "qué estudiar", "has sentido" en vez de "haz sentido") — decisión explícita
        de Adrián, sin tocar ninguna palabra ni el orden del texto.
      - Verificado con `npm run build` + volcado de texto renderizado (ES y EN) comparado
        línea por línea contra el texto que pasó Adrián.
      ⚠️ **Pendiente de infraestructura (no es este PR):** el precio de fundador ahora corre
      **16–23 de julio** en el copy; hay que confirmar que `STRIPE_FOUNDER_UNTIL` en Vercel (y
      los Price IDs de Stripe) reflejen esta ventana, si no el copy y el cobro real quedarían
      desalineados.
      - **PR #36 (mismo punto, ajustes de énfasis/orden pedidos después por Adrián):** ✅
        Hecho y MERGEADO. "Y en 2016 emigré. Tuve que dejar mi país." queda en **bold** y en
        su propia línea (el resto — "Llegué a Argentina..." — pasa a la línea siguiente); los
        dos párrafos que siguen al tercer descubrimiento ("Tener una meta..." y "Esta es una
        membresía para hacer lo justo...") en **bold**; el párrafo de comunidad ("Los cursos se
        terminan...") en **itálica y centrado**; dentro del cuadro de precio, la frase "La
        membresía abre con precio de fundador..." en **bold** (el resto de la nota sigue
        normal). El mensaje final ("Mucho para muchos... ¡Estudiemos juntos!") se **movió de
        lugar**: antes iba al final después del FAQ, ahora va **justo debajo del cuadro de
        precio**, con "Mucho para muchos." solo en su línea y el resto en la siguiente; se
        agregó ahí un **tercer botón "Acá te unes"** (antes eran 2: el del cuadro + el de
        después del FAQ). El P.D., el FAQ y el botón de después del FAQ quedan donde estaban.
        Sin tocar CSS global. Verificado con build + HTML renderizado (ES/EN): 3 botones,
        `<strong>` en los 4 párrafos indicados, orden real cuadro→mensaje→botón→P.D.→FAQ→botón→
        newsletter.
        - ⚠️ **Incidente de flujo (para no repetirlo):** después de mergear el PR #35, se
          empujaron los commits de estos ajustes a la MISMA rama `claude/sales-page-update-gk8ldr`
          sin abrir PR nuevo — como esa rama ya tenía su PR cerrado/mergeado, esos commits no
          llegaban a ningún lado. Se corrigió reiniciando la rama desde `origin/main` (que ya
          incluía el PR #35), reaplicando el commit de los ajustes encima, y abriendo el PR #36
          nuevo desde ahí. Recordatorio: **siempre rama nueva + PR nuevo por cada tanda de
          cambios**, incluso dentro del mismo punto del checklist si el PR anterior ya se
          mergeó.
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
- [x] **6. Poder borrar ejercicios pasados desde `/panel`.** ✅ Hecho (PR #44, rama
      `claude/panel-delete-exercises`). Antes solo se podía cerrar un ejercicio con fecha de fin;
      ahora cada fila de la tabla de Ejercicios (las tres pestañas: Ejercicio de la semana /
      Concepto Base / Bonus Material, que comparten la tabla `exercises`) tiene un botón **"Borrar"**
      junto a "Editar". Pide confirmación antes (avisando que también se borran las preguntas y
      respuestas del foro asociadas, por el `on delete cascade` ya existente en la BD) y borra con
      la política RLS de admin ya vigente (`exercises: admin all`), sin migración nueva. Verificado
      con `npm run build`; el borrado contra datos reales queda por probar en producción (este
      entorno no tiene credenciales de Supabase).
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
      - **8c. Arreglo: seguía llegando el correo nativo de Supabase ("Reset your password")
        con `RESEND_API_KEY` ya puesta en Vercel** (sesión 16 jul, rama
        `claude/welcome-email-localization-ahs4tm`). Adrián confirmó la key configurada y
        mergeada y aun así veía la plantilla default. Causa real: **existían dos botones más**
        que pedían el enlace de acceso y **ninguno pasaba por Resend** —
        `/gracias` → «Enviarme mi acceso» (la página a la que Stripe redirige al pagar,
        `success_url`) y `/entrar` → «Crea o restablece tu contraseña» — ambos llamaban
        `supabase.auth.resetPasswordForEmail(...)` **directo desde el navegador** (cliente
        anon), que dispara SIEMPRE la plantilla nativa de Supabase sin importar si Resend está
        configurado; solo el correo automático del webhook (alta nueva al pagar) pasaba por
        Resend. Como `/gracias` es justo la página donde el comprador reclama su acceso después
        de pagar, era el camino más probable para toparse con el correo nativo. Arreglo: se
        extrajo la lógica de envío (Resend con el copy bilingüe → si falla o falta la key, cae a
        Supabase) a un helper compartido `src/lib/welcome-email.ts` (`sendAccessEmail`) y se creó
        `POST /api/send-access-email` (nuevo endpoint servidor, `{ email, lang }`, no revela si
        el correo existe). El webhook, `/entrar` y `/gracias` ahora llaman al mismo camino, así
        que las **tres vías mandan el mismo correo** con el copy de Emi por Resend. Verificado
        con `npm run build` **y en producción** (PR #38 mergeado): Adrián confirmó que ya llega
        el correo bilingüe de Emi por Resend, no el default de Supabase. ✅ **Punto 8 (con 8b y
        8c) queda cerrado end-to-end.**
- [x] **9. Rediseñar la página de agradecimiento del pago.** ✅ Hecho (CÓDIGO). Nueva **página
      dedicada y bilingüe** (componente `Gracias.astro`, rutas `/gracias/` y `/gracias/en/`) con el
      copy DEFINITIVO de Emi: eyebrow "No cierres esta pestaña", título "Gracias por unirte. Ya casi
      estamos dentro.", un campo de correo + botón **"Enviarme mi acceso"** (mismo flujo que «Crea o
      restablece tu contraseña» de `/entrar`, ahora vía `POST /api/send-access-email` — ver 8c —
      con destino `/nueva-clave/` o
      `/nueva-clave/en/`), el aviso de revisar **spam/promociones** con el asunto exacto del correo
      («Tu acceso a la membresía»), **el link a `/entrar`** como acceso directo, y el cierre pidiendo
      no cerrar la pestaña + contacto a `info@emilserios.com`. `success_url` del checkout
      (`src/pages/api/checkout.ts`) ahora apunta aquí (antes `/entrar/?pago=ok`) según el idioma en
      que se pagó. Se quitó el banner viejo de `?pago=ok` en `/entrar/index.astro` (superado por esta
      página). Verificado con `npm run build` + capturas headless de ambos idiomas.
      - **Ajuste de encabezado pedido por Adrián (PR #40, mismo día):** logo caligráfico grande y
        centrado arriba (como en la carta de ventas) con "Membership"/"Membresía" debajo; el
        aviso "No cierres esta pestaña" pasa de píldora con borde a texto rojo grande en negrita
        con resplandor (glow) pulsante, sin marco; título centrado y partido en dos líneas
        explícitas ("Thank you for joining" / "We're almost in.", e igual en ES). El resto de la
        página (subtítulo, formulario, notas) no cambió. Verificado con capturas headless de
        ambos idiomas.
- [x] **10. Botón "Publicar ahora" además de "Programar" el ejercicio de la semana.** ✅ Hecho
      (PR #45, rama `claude/panel-publish-now`). El formulario de Ejercicio de la semana / Concepto
      Base tenía solo "Guardar y programar" (fecha futura, por defecto el próximo jueves); se agregó
      un segundo botón **"Publicar ahora"** que guarda el mismo contenido con `publish_at = ahora`
      en vez de esperar. Si Emi ya puso fecha de cierre se respeta; si la dejó en blanco se calcula
      con la misma duración de siempre (7 días semana / 1 mes base) pero contada desde ahora.
      Funciona creando y editando (p. ej. adelantar un ejercicio ya programado). Oculto para Bonus
      Material (que ya se publica de inmediato). De paso se corrigió el mismo bug ya conocido de
      `[hidden]` perdiendo contra `.btn { display: inline-flex }` (`.form__actions .btn[hidden] {
      display: none; }`), necesario para que el botón se oculte de verdad en Bonus. Verificado con
      build + capturas headless del formulario en los tres destinos.
- [x] **11. Selector de destino del video en `/panel`.** ✅ Hecho (PR #41, rama
      `claude/panel-content-destination`). Se reutiliza la tabla `exercises` (ya genérica:
      título/desc/vimeo/pdf bilingües + ventana de fechas) para las tres pestañas del aula, con
      una columna nueva `kind` (`semana` / `base` / `bonus`) que dice a cuál pertenece cada fila:
      - **semana**: sin cambios, misma ventana semanal de siempre.
      - **base**: mismo mecanismo de ventana pero pensado para un rango mensual (una fila
        "vigente" a la vez, igual que la semanal).
      - **bonus**: se acumula — una vez publicada (publish_at ≤ ahora) **no expira**; la
        política RLS de miembro ignora `unpublish_at` para este tipo.
      En `/panel`, el formulario "+ Nuevo" tiene un selector de **Destino** (los mismos tres
      nombres) que ajusta las etiquetas del formulario, muestra u oculta las fechas (Bonus se
      publica de inmediato al guardar, sin fecha de cierre visible) y guarda con el `kind`
      correcto; la tabla de abajo se filtra por destino con su propia barra de pestañas. Se
      conectaron también las **dos subpáginas del aula** (ver punto 12: Concepto Base y Bonus
      Material dejan de ser maqueta).
      ✅ **Infraestructura ya corrida (16 jul):** Adrián ejecutó
      `supabase/migrations/0007_content_kind.sql` en el SQL Editor de Supabase (agrega la
      columna `kind` + el enum + reescribe la política de lectura de miembro), con resultado
      "Success. No rows returned". Ya no hay pendiente de BD para este punto — el panel puede
      guardar y leer Concepto Base y Bonus Material.
      - **Incidente de flujo (durante el desarrollo, ya corregido):** los botones nuevos del
        selector de Destino y del filtro de la tabla reusaban la clase `.tab`, la misma que usa
        el script de las pestañas superiores (Ejercicios/Miembros/Foro) con
        `document.querySelectorAll('.tab')` — al hacer clic, ese script también los capturaba y
        ocultaba TODO el panel (porque ninguno de los tres botones de sección "coincidía" con el
        clic). Se acotó ese selector a `.tab[aria-controls]` (solo las pestañas de sección, que
        sí controlan un `<section>`). También apareció el mismo problema ya conocido de
        `[hidden]` perdiendo contra `.grid2 { display: grid }`: se agregó `.grid2[hidden] {
        display: none; }` (mismo patrón que ya existía para `.form[hidden]`).
- [x] **12. Sistema de pestañas del aula + tour paso a paso.** ✅ **Pestañas con datos reales**
      (`Aula.astro`, ver punto 11): **Ejercicio de la semana** (con el **foro adentro**, no es
      pestaña aparte), **Concepto Base** (mismo patrón que la semana: título, video ES/EN con su
      propio selector de idioma, descripción, PDF) y **Bonus Material** (grilla real desde
      Supabase; el video de cada tarjeta se carga recién al hacer clic, no de entrada). Subrayado
      editorial en la pestaña activa, navegación por teclado (flechas), deep-link por hash
      (`#base`/`#bonus`). El gate de pago oculta pestañas + paneles. Mensajes de "vacío" propios
      si aún no hay Concepto Base vigente o Bonus Material publicado. Verificado con
      `npm run build` + capturas headless de la estructura (no se pudo probar el flujo con datos
      reales en este entorno por no tener credenciales de Supabase; falta probarlo en producción
      una vez corrida la migración `0007`).
      - **Tour/onboarding guiado ✅ Hecho** (sesión 17 jul, rama `claude/progreso-checklist-pendiente-3hv9no`).
        Onboarding paso a paso estilo Figma en `/aula`: oscurece la pantalla, **ilumina** la sección de
        turno con un recorte + glow y muestra un cuadro con el paso (**"X de 6"**), el mensaje de Emi
        (ES/EN, en su voz) y un botón **cuadrado sin animación** (Siguiente / Listo) + enlace "Saltar".
        **6 pasos:** (1) bienvenida al centro · (2) pestaña *Ejercicio de la semana* (video, descripción,
        PDF) · (3) baja al foro de *preguntas y respuestas* · (4) pestaña *Concepto Base* · (5) pestaña
        *Bonus Material* · (6) el **engranaje** (soporte / darse de baja). Cada paso activa la pestaña
        que toca y hace scroll a su elemento (el recorte/cuadro se realinean al hacer scroll o resize,
        sin congelar la página). Se dispara **la primera vez** que un miembro con acceso entra (flag en
        `localStorage` `erm_tour_v1`) y se puede **repetir** desde el menú del engranaje → **"Ver
        tutorial"**. Al terminar/saltar vuelve a la pestaña inicial. Todo es UI pura (sin BD ni
        migración). Copy provisional en la voz de Emi (Adrián lo ajusta después si hace falta).
        Verificado con `npm run build` + capturas headless de los 6 pasos en un harness con el CSS/JS
        reales del componente (auto-skip cuando ya se vio, y replay desde el engranaje, comprobados).
- [x] **13. Menú de cuenta (engranaje) en el aula: soporte + darse de baja.** ✅ Hecho (nuevo, lo
      pidió Adrián esta sesión; PR #47, rama `claude/aula-support-unsubscribe-menu`). Un ícono de
      engranaje ⚙ en la barra superior de **`/aula`** (entre el selector EN/ES y "Salir") que abre
      un menú con dos opciones: **Soporte** (abre el correo a `info@emilserios.com`) y **Darse de
      baja** (enlace directo al portal de facturación de Stripe,
      `billing.stripe.com/p/login/bJeaEX6V7dRDaUP8Zb73G00`). Bilingüe (ES/EN), mismo estilo de la
      barra; se cierra con clic afuera o Escape. Convive con el enlace **"Suscripción"** que ya
      existía en la misma barra (visible solo para miembros con suscripción activa, abre el portal
      de Stripe **dinámico** vía `/api/portal`): quedan dos caminos al portal (el dinámico por
      sesión y este estático). Abierto para más adelante: si Adrián prefiere, unificarlos en uno.
      - ⚠️ **Incidente de flujo (corregido en la misma sesión):** en el primer intento el menú se
        puso por error en la **carta de ventas** (`Landing.astro`, PR #46). Adrián lo detectó antes
        de mergear; se **cerró el PR #46 sin mergear** (la landing quedó intacta) y se rehízo en el
        aula (PR #47). Recordatorio: el engranaje de cuenta es para miembros que ya pagaron → va en
        el aula, no en la página pública.
- [x] **14. Agregar miembros manualmente desde `/panel`.** ✅ Hecho y **MERGEADO** (PR #50, rama
      `claude/manual-member-addition-3pyjo5`). Emi necesitaba dar de alta **alumnos** y un
      **miembro previo** de membresía sin que pasen por el checkout de Stripe. En la pestaña
      **Miembros** hay un botón **"+ Agregar miembro"** que abre un formulario: **correo**
      (obligatorio), **nombre** (opcional), **idioma del correo de acceso** (ES/EN) y una casilla
      **"Enviarle el correo de acceso ahora"** (marcada por defecto). Al enviar:
      - Llama al nuevo endpoint **`POST /api/admin/add-member`** (solo admin: valida el token del
        navegador y que el `role` sea `admin`; todo lo demás corre con **service_role**, lo único
        que puede crear la cuenta en `auth.users` — el navegador no puede).
      - **Crea o reutiliza** la cuenta por correo (mismo criterio que el webhook de Stripe:
        busca el perfil; si no existe, `admin.createUser` con `email_confirm`; el trigger de la BD
        crea el `profile`). Si mandaste nombre y el perfil no tenía uno, lo completa.
      - **Concede una suscripción MANUAL activa**: fila en `subscriptions` con `status='active'`,
        **sin id real de Stripe** (id sintético `manual_<userId>` como clave de conflicto para que
        dar de alta dos veces al mismo miembro **actualice** la misma fila, no la duplique) y
        **sin fecha de fin** (`current_period_end = null`, que `has_active_sub()` trata como
        vigente) → acceso al aula hasta que Emi lo quite. No hace falta migración: reusa la tabla
        y el índice único de `stripe_subscription_id` (0006), y la política **`subs: admin all`**.
      - Si la casilla está marcada, le envía el **correo de acceso** por el mismo camino que el
        resto (Resend con el copy bilingüe de Emi → respaldo Supabase, vía `sendAccessEmail`), con
        el enlace de un solo uso para **crear su contraseña** (→ `/nueva-clave/` o `/en/`). Si la
        deja sin marcar, el miembro puede pedir el enlace él mismo desde «Entrar».
      - En la lista de miembros, los dados de alta a mano muestran una etiqueta **"Manual"** (se
        detecta por el prefijo `manual_` del `stripe_subscription_id`).
      - **Quitar acceso (mismo punto):** en la lista de miembros, las altas manuales muestran un
        botón **"Quitar acceso"** que llama a **`POST /api/admin/remove-member`** (solo admin) y
        **borra la fila `manual_<userId>`** → deja de tener acceso al aula de inmediato. **No borra
        la cuenta** (se puede volver a agregar) y **no toca ninguna suscripción de Stripe** (solo la
        concesión hecha a mano). Las bajas de Stripe se gestionan por el portal de Stripe.
      Verificado con `npm run build` (endpoints empaquetados como funciones serverless
      `pages/api/admin/add-member` y `remove-member`; el cliente incluye ambas llamadas). El alta y
      la baja contra datos reales quedan por probar en producción (este entorno no tiene credenciales
      de Supabase).
      ⚠️ **Requiere** que `SUPABASE_SERVICE_ROLE_KEY` esté en Vercel (ya lo está, el checkout la usa).
      - **Baja por Stripe (revisado, ya correcto):** al cancelar por el portal, Stripe deja la
        suscripción `active` con `cancel_at_period_end=true` hasta el fin del mes pagado (el webhook
        lo espeja → **conserva acceso hasta que termina el mes**); al vencer, `customer.subscription
        .deleted` pone `status='canceled'` → `has_active_sub()` da falso → **pierde acceso**. Además,
        la condición `current_period_end > now()` de `has_active_sub()` corta el acceso al pasar la
        fecha aunque el webhook fallara. Única dependencia: que el endpoint del webhook reciba eventos
        (ver la nota de seguimiento del webhook). Posible endurecimiento futuro (opcional): exigir
        `current_period_end` no nulo para filas de Stripe (las manuales lo dejan nulo a propósito).

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
- **Precio:** fundador **$57/mes** (ventana controlada por `STRIPE_FOUNDER_UNTIL`) · estándar
  **$80/mes** al cerrar la ventana (antes iba a ser $77; Emi lo subió a $80 el 23 jul 2026).
  El precio de la carta es **dinámico** (ver entrada del 23 jul): cambia solo en el momento del
  corte, con la misma fecha que usa el checkout.
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
- [x] **STRIPE — CONFIG DE DASHBOARD/VERCEL.** ✅ Confirmado por Adrián (16 jul): precio de
      fundador (`STRIPE_FOUNDER_UNTIL`, ventana 16–23 jul) comprobado, y el resto de la
      configuración de dashboard/Vercel también quedó ok. Flujo elegido: **2a pago anónimo +
      enlace por email** y **1b precios ya creados**. Guía completa en `docs/STRIPE.md`.
      ⚠️ **Webhook — queda abierto, no bloquea:** Adrián recibió un correo de Stripe avisando
      de problemas con el webhook, pero **hoy le está funcionando normal** (no hay síntomas del
      bucle de pago). Lo deja para revisar con calma más adelante; ver también la nota de
      "urgente" más abajo (sigue vigente hasta que se confirme el endpoint sano).
- [ ] **Recorrido completo end-to-end**: Emi crea ejercicio → `mdza.exp` lo ve, completa y
      pregunta → Emi responde → alumno ve la respuesta. Adrián dijo (16 jul) que **están en eso**
      (probándolo con el sistema ya casi completo).
- [x] **Tour/onboarding guiado del punto 12** ✅ Hecho (sesión 17 jul, rama
      `claude/progreso-checklist-pendiente-3hv9no`). Onboarding paso a paso estilo Figma (6 pasos,
      "X de 6", cuadro con el mensaje de Emi + botón cuadrado, "Ver tutorial" en el engranaje para
      repetirlo). Ver el detalle en el punto 12 del checklist. Con esto **el checklist queda cerrado
      por completo en código**. Copy provisional (Adrián lo ajusta si hace falta).
- [ ] Anti-reentrada fina por email (después; hoy ya cubierto "gratis" por la ventana del precio
      de fundador — quien se da de baja y vuelve solo encuentra el precio estándar).
      ✅ **Favicon:** Adrián confirmó (16 jul) que **el que está está bien** — no volver a proponer
      autoalojarlo. (Antes figuraba como pendiente de limpieza; queda cerrado por decisión suya.)
      ✅ **"Favoritos"** se retiró de la lista: era una idea especulativa del documento de
      arquitectura original, nunca la pidió Emi ni Adrián. Si algún día hace falta se replantea.

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
- ~~Foro: ¿los miembros se responden entre ellos o solo responde Emi?~~ **RESUELTO** (Adrián,
  16 jul): **solo Emi responde**, no hay interacción entre alumnos. Todos ven las preguntas, pero
  cada uno hace la suya y únicamente Emi contesta. (El código ya funciona así.)
- Onboarding/tutorial la primera vez (punto 12): Adrián pasará el flujo cuando se trabaje.
- Ajustes visuales y de copy finales con Emi.

## Rama de trabajo
**Sesión 17 jul 2026 (segunda tanda) — punto 12, tour/onboarding:** rama
`claude/progreso-checklist-pendiente-3hv9no` desde `origin/main`. Se agregó el **tour guiado paso a
paso** en `/aula` (estilo Figma: oscurece la pantalla, ilumina la sección de turno, cuadro con
"X de 6" + mensaje de Emi + botón cuadrado; 6 pasos; se dispara la primera vez por flag en
`localStorage` y se repite desde el engranaje con "Ver tutorial"). Solo toca
`src/components/membresia/Aula.astro` (UI pura, sin BD ni migración). Verificado con `npm run build`
+ capturas headless de los 6 pasos. **Con esto el checklist de 14 puntos queda cerrado en código.**
Falta el **PR** (crear cuando Adrián lo pida) y probar el flujo en producción. El copy del tour es
provisional en la voz de Emi.

---

**Sesión anterior (17 jul 2026):** se cerró el punto **14** (alta y baja
manual de miembros desde `/panel`) — **PR #50 MERGEADO a `main`** (rama
`claude/manual-member-addition-3pyjo5`). Incluye los endpoints `POST /api/admin/add-member` y
`POST /api/admin/remove-member` (solo admin, service_role) + el formulario "+ Agregar miembro" y el
botón "Quitar acceso" en la pestaña Miembros, más la etiqueta "Manual". Se **revisó** además la baja
por Stripe: ya es correcta (conserva acceso hasta el fin del mes pagado, luego lo pierde), sin
cambios. Queda por **probar en producción** el alta/baja con datos reales (este entorno no tiene
credenciales de Supabase). **La próxima sesión arranca una rama nueva** desde `origin/main` (ya
incluye el PR #50).

Todo lo de la segunda tanda del 16 jul quedó **mergeado a
`main`**: **#43** (encabezado de `/entrar`), **#44** (punto 6, borrar ejercicios), **#45** (punto
10, "Publicar ahora") y **#47** (punto 13, engranaje de cuenta en el aula). El **#46** (primer
intento del punto 13 en la carta) se **cerró sin mergear**. La rama local
`claude/progreso-update-session-16jul-pt2` quedó creada desde `origin/main` al día (incluye hasta
PR #47) solo para esta actualización de bitácora — **la próxima sesión debe arrancar una rama
nueva** desde ahí para el siguiente punto.
✅ La migración `supabase/migrations/0007_content_kind.sql` **ya se corrió** en Supabase (Adrián,
16 jul): el panel ya guarda/lee Concepto Base y Bonus Material en producción.
**Único pendiente del checklist: el tour/onboarding guiado del punto 12.** Adrián pasará el flujo
paso a paso del tour cuando se trabaje (es su propio PR). Todo lo demás del checklist (puntos 1–11
y 13) está cerrado en código; queda por hacer el **recorrido end-to-end de prueba en producción**
(sección "Pendiente ⬜") cuando Adrián quiera.

Sesión **16 jul 2026** (checklist de arriba): **#27** checklist del día + punto **2** (saludo del
aula sin nombre), **#28** puntos **3+4+12**: **sistema de pestañas** del aula (Ejercicio de la
semana con el foro adentro · Concepto Base · Bonus Material; las dos últimas eran maquetas de
diseño con contenido de muestra), **#30** identidad
visual de la carta en aula/panel/entrar (punto 5), **#31** ingreso con correo + contraseña
(punto 7, `/nueva-clave/`), **#32** correo de bienvenida automático al pagar (punto 8), **#33**
correo de bienvenida bilingüe por Resend (punto 8b), **#34** página de agradecimiento bilingüe
(punto 9), **#35** copy exacto de la página de ventas (punto 1, texto de Adrián), **#36**
ajustes de énfasis y orden sobre ese mismo copy (bold/itálica, mensaje final debajo del cuadro
de precio + tercer botón — con esto el punto **1 queda cerrado**), **#38** arreglo del correo de
acceso que no pasaba por Resend en `/entrar` y `/gracias` (punto 8c) — **confirmado funcionando
en producción**, con esto el punto **8 (8b + 8c) queda cerrado end-to-end** —, **#40** ajuste de
encabezado de `/gracias` pedido por Adrián (logo grande, aviso rojo con glow, título en dos
líneas) y **#41** punto **11**: selector de destino del video en `/panel` (Ejercicio de la
semana / Concepto Base / Bonus Material), con lo que **Concepto Base y Bonus Material dejan de
ser maqueta** en `/aula` — con esto el punto **11 queda cerrado (código) y el punto 12 solo le
falta el tour**. Adrián también confirmó ese mismo día: precio de fundador y config de
dashboard/Vercel de Stripe ok (ver Pendiente ⬜); el aviso de Stripe sobre el webhook queda
abierto pero sin bloquear (le funciona normal); recorrido end-to-end y favicon se dejan para más
adelante.

**Segunda tanda del 16 jul (misma sesión, tras correr la migración 0007):** **#43** encabezado de
`/entrar` (logo grande y centrado como en `/gracias`), **#44** punto **6** (botón "Borrar" en la
tabla de ejercicios de `/panel`, con confirmación), **#45** punto **10** (botón "Publicar ahora"
además de "Guardar y programar") y **#47** punto **13** nuevo (engranaje de cuenta en la barra del
aula con **Soporte** → correo a `info@emilserios.com` y **Darse de baja** → link del portal de
Stripe). El **#46** fue un primer intento del punto 13 puesto por error en la carta de ventas;
Adrián lo detectó antes de mergear y se **cerró sin mergear** (la landing quedó intacta), rehecho
en el aula en el #47. Adrián corrió además la migración **`0007_content_kind.sql`** en Supabase
(punto 11 con respaldo real en la BD) y resolvió la decisión abierta del foro: **solo Emi
responde**, sin interacción entre alumnos. Con esto **todo el checklist queda cerrado en código
salvo el tour/onboarding del punto 12**.

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
**#34** página de agradecimiento bilingüe, **#35** copy exacto de la página de ventas, **#36**
ajustes de énfasis/orden sobre ese copy, **#38** correo de acceso vía Resend en las tres vías
(punto 8c, confirmado en producción), **#40** ajuste de encabezado de `/gracias`, **#41** selector
de destino del video en `/panel` (punto 11, Concepto Base y Bonus Material con datos reales),
**#43** encabezado de `/entrar` (logo grande centrado como en `/gracias`), **#44** borrar
ejercicios desde `/panel` (punto 6), **#45** botón "Publicar ahora" en `/panel` (punto 10) y
**#47** engranaje de cuenta en el aula con Soporte + Darse de baja (punto 13; el #46, primer
intento en la carta, se cerró sin mergear) y **#50** alta y baja manual de miembros desde `/panel`
(punto 14: `POST /api/admin/add-member` + `remove-member`, formulario "+ Agregar miembro" y botón
"Quitar acceso"; #49 fue la tercera tanda de ajustes de layout del `/aula`).

### ⚠️ Pendiente de seguimiento (ya no bloquea)
El **webhook de Stripe** tuvo un aviso de Stripe sobre posibles problemas, pero Adrián confirmó
(16 jul) que **le está funcionando normal** hoy — no hay síntomas del bucle de pago que motivó
esta nota originalmente (caso `hello@arcmediahouse.com`, resuelto por la red de seguridad del PR
#24: verificación directa con Stripe por correo, `/api/verify-subscription`). Igual conviene, sin
apuro, revisar en Stripe → Developers → Webhooks que el endpoint
`https://emilseriosacademy.com/api/stripe-webhook` esté apuntando bien y sus entregas salgan 200
(no 400 "firma inválida" ni 500), y que `STRIPE_WEBHOOK_SECRET` y `SUPABASE_SERVICE_ROLE_KEY`
estén en Vercel. Guía en `docs/STRIPE.md` (ver Pendiente ⬜).

## ⚠️ Flujo de trabajo con Adrián (IMPORTANTE)
Adrián pide **una rama nueva desde `main` + un PR nuevo por cada cambio**. Motivo: su flujo
**despliega a producción al mergear el PR a `main`**; una vez mergeado, el PR queda cerrado y
los commits que se empujen después a esa misma rama **no llegan a ningún lado** ("no funciona").
Regla práctica:
1. Antes de cada cambio: `git fetch origin main` y crear rama desde `origin/main`.
2. Un solo cambio por rama → PR nuevo (crear con la herramienta de GitHub).
3. Cuando Adrián mergea, avisa; el siguiente cambio arranca del `main` ya actualizado.
No apilar cambios nuevos sobre una rama cuyo PR ya se mergeó (reiniciar desde `main`).
