# Stripe — configuración de pagos

Integración de la suscripción mensual de "Estudiemos Juntos". Flujo acordado:
**pago anónimo** (el visitante no inicia sesión antes de pagar) y **enlace por
correo** (el webhook crea/enlaza la cuenta de Supabase con el email que Stripe
recolectó). Empieza siempre en **modo TEST**; cuando funcione, replica en LIVE.

## Qué construyó el código

- `GET /api/checkout?lang=es|en` — crea la sesión de Stripe Checkout (suscripción
  mensual) y redirige a la página de pago. Elige el precio por fecha (fundador
  $57 hasta el corte, luego el estándar vigente) y pinta la página en el idioma correcto
  con `locale`. Los botones de la carta (`Landing.astro`) apuntan aquí.
- `POST /api/stripe-webhook` — escucha los eventos de Stripe, mantiene la tabla
  `subscriptions` de Supabase como espejo, y **crea el usuario passwordless** con
  el correo del pago (el trigger de la BD crea su `profile`). Eventos:
  `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
  `invoice.paid`, `invoice.payment_failed`.
- `POST /api/portal` — portal de cliente de Stripe (tarjeta y baja) para el
  miembro ya autenticado dentro del aula.
- Migración `0006_stripe_subscription_link.sql` — índice único en
  `stripe_subscription_id` para que el webhook haga UPSERT.

## Paso a paso (una vez)

### 1. Precios (ya creados)
En el dashboard de Stripe hay **Prices** recurrentes mensuales. Copia sus IDs
(`price_...`, **no** `prod_...` — confundirlos es lo que tumbó el checkout con un
500 el 24 jul 2026).

> **Cambiar el precio.** Los Prices de Stripe son **inmutables**: no se edita el
> importe de uno existente. Se **crea un Price nuevo** sobre el mismo producto y
> se apunta `STRIPE_PRICE_STANDARD` (Vercel) al nuevo → **redeploy**. Quien ya
> estaba suscrito **sigue pagando su Price**: Stripe lo congela mientras la
> suscripción siga activa. El importe visible de la carta se edita aparte, en
> `Landing.astro` (`priceAmountStd` / `priceInBoxLeadStd`, ES y EN).
> Histórico: $57 fundador → $77 → $80 (jul 2026) → **€65 (ago 2026**, además con
> cambio de moneda de USD a EUR).

> El **nombre del producto** que Stripe muestra en el pago es un texto único (no
> lo traduce Stripe). Ponlo neutro/bilingüe, p. ej. **"Estudiemos Juntos · Let's
> Study Together"**. El resto de la página de pago sí se traduce con `locale`.

### 2. Webhook
Dashboard → **Developers → Webhooks → Add endpoint**:
- URL: `https://emilseriosacademy.com/api/stripe-webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.paid`, `invoice.payment_failed`.
- Copia el **Signing secret** (`whsec_...`).

### 3. Variables de entorno en Vercel
Project → **Settings → Environment Variables** (marca Production y Preview):

| Variable | De dónde sale |
|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | del endpoint del paso 2 (`whsec_...`) |
| `STRIPE_PRICE_FOUNDER` | Price ID del de fundador ($57) |
| `STRIPE_PRICE_STANDARD` | Price ID del estándar vigente (**€65** desde ago 2026) |
| `STRIPE_FOUNDER_UNTIL` | (opcional) fin de la ventana de fundador, ISO Madrid. Cerró el `2026-07-23T23:59:59+02:00`, así que hoy todo el mundo entra por `STRIPE_PRICE_STANDARD` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `PUBLIC_SITE_URL` | dominio canónico, p. ej. `https://emilseriosacademy.com` (URLs de retorno de Stripe) |

`PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` ya están configuradas.
Redeploy tras añadirlas.

### 4. Migración
En el SQL Editor de Supabase corre `supabase/migrations/0006_stripe_subscription_link.sql`.

## Cómo probar (modo test)
1. En la carta pulsa "Acá te unes / Join here" → llegas a Stripe Checkout.
2. Paga con la tarjeta de prueba `4242 4242 4242 4242`, fecha futura, CVC libre.
3. Vuelves a la página de agradecimiento (`/gracias/` o `/gracias/en/`). Escribe
   **el mismo correo** del pago → llega el enlace de acceso.
4. Entras al aula: si hay ejercicio en ventana, lo ves; arriba aparece
   "Suscripción" (portal). En la tabla `subscriptions` hay una fila `status=active`.

Para simular eventos sin navegador: `stripe listen --forward-to
localhost:4321/api/stripe-webhook` + `stripe trigger checkout.session.completed`.

## Notas
- El **gating** ya está atado a Stripe real: la RLS de Supabase (`has_active_sub()`)
  solo deja ver el ejercicio y el foro si hay una fila `active`; el aula además
  muestra la puerta de pago a quien no la tiene.
- El precio con el que entra el miembro **se congela**: Stripe sigue cobrando ese
  Price mientras la suscripción siga activa.
- **Adaptive Pricing (moneda local).** La FAQ de la carta promete que Stripe
  "detecta automáticamente la moneda de tu tarjeta y pagas en ella". Eso **no es
  el comportamiento por defecto**: el checkout manda un único Price en una sola
  moneda (hoy EUR). Para que sea cierto hay que **activar Adaptive Pricing en el
  dashboard** (Settings → Payments); no requiere tocar código. Sirve para
  suscripciones nuevas transfronterizas y solo con tarjeta, Link, Apple Pay y
  Google Pay; el tipo de cambio que ve el comprador incluye una comisión de
  conversión del 2–4% **que paga él**. Si no se activa, hay que suavizar esa
  respuesta de la FAQ en `Landing.astro`.
- Cambio a LIVE: repite precios/webhook/keys con las claves `live` y actualiza las
  variables en Vercel.
