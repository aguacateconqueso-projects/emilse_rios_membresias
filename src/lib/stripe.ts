import Stripe from 'stripe';

// Cliente de Stripe — SOLO servidor. Nunca importar desde el navegador.
// Las claves viven en variables de entorno de Vercel (no en el repo).
const secret = process.env.STRIPE_SECRET_KEY;

// Sin apiVersion explícita: usa la versión por defecto de la cuenta/SDK.
export const stripe = secret ? new Stripe(secret) : null;

// IDs de los dos Prices ya creados en Stripe (modo test primero).
export const PRICE_FOUNDER = process.env.STRIPE_PRICE_FOUNDER || '';
export const PRICE_STANDARD = process.env.STRIPE_PRICE_STANDARD || '';

// OJO: los nombres del enum ('standard_77') son ETIQUETAS HEREDADAS: el estándar
// pasó a $90 (jul 2026) pero el valor del enum se conserva para no migrar la BD
// (columna price_tier en 0001_init.sql). El monto real lo fija el Price de Stripe,
// no este nombre; el enum es solo un bucket que mapea Price ID ↔ fila de la BD.
export type Tier = 'founder_57' | 'standard_77';

// Fin de la ventana del precio fundador. Por defecto 10 jul 2025, 23:59 (Madrid);
// configurable con STRIPE_FOUNDER_UNTIL (ISO). now <= límite → fundador; si no → estándar.
// Así Adrián controla la fecha de corte sin tocar código.
const FOUNDER_UNTIL = process.env.STRIPE_FOUNDER_UNTIL || '2025-07-10T23:59:59+02:00';

export function currentTier(now: Date = new Date()): Tier {
  const until = Date.parse(FOUNDER_UNTIL);
  if (Number.isNaN(until)) return 'standard_77';
  return now.getTime() <= until ? 'founder_57' : 'standard_77';
}

export function priceForTier(tier: Tier): string {
  return tier === 'founder_57' ? PRICE_FOUNDER : PRICE_STANDARD;
}

// Mapea un Price ID de Stripe de vuelta al enum de la BD (para el webhook).
export function tierForPrice(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null;
  if (priceId === PRICE_FOUNDER) return 'founder_57';
  if (priceId === PRICE_STANDARD) return 'standard_77';
  return null;
}

// Origen público del sitio para las URLs de retorno (success/cancel/portal).
// OJO: NO usar new URL(request.url).origin — en serverless (Vercel) a veces
// resuelve a http://localhost y Stripe devolvería al visitante a "localhost".
// Preferimos PUBLIC_SITE_URL; si no, el Host reenviado por el proxy.
export function siteOrigin(request: Request): string {
  const configured = process.env.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL;
  if (configured) return String(configured).replace(/\/+$/, '');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
