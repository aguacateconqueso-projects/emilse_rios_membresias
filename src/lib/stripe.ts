import Stripe from 'stripe';

// Cliente de Stripe — SOLO servidor. Nunca importar desde el navegador.
// Las claves viven en variables de entorno de Vercel (no en el repo).
const secret = process.env.STRIPE_SECRET_KEY;

// Sin apiVersion explícita: usa la versión por defecto de la cuenta/SDK.
export const stripe = secret ? new Stripe(secret) : null;

// IDs de los dos Prices ya creados en Stripe (modo test primero).
export const PRICE_FOUNDER = process.env.STRIPE_PRICE_FOUNDER || '';
export const PRICE_STANDARD = process.env.STRIPE_PRICE_STANDARD || '';

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
