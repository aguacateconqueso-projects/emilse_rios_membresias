import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { tierForPrice } from './stripe';

// Lógica compartida entre el webhook y el endpoint de verificación: espejar una
// suscripción de Stripe en la tabla `subscriptions` de Supabase. Se aísla aquí
// para que ambos caminos (evento del webhook / verificación bajo demanda)
// escriban EXACTAMENTE la misma fila y no se desincronicen.

// ¿El estado de la suscripción de Stripe da acceso al aula? Solo cuenta lo que
// implica un pago vigente. `past_due`, `canceled`, `unpaid`, etc. no dan acceso.
export function subGrantsAccess(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

// Escribe/actualiza la fila de `subscriptions` para un user_id CONOCIDO a partir
// de una suscripción de Stripe. Idempotente (UPSERT por stripe_subscription_id).
export async function writeSubscriptionRow(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
  userId: string
) {
  const customerId = sub.customer as string;
  const item = sub.items.data[0] as any;
  const priceId = item?.price?.id ?? null;
  const tier = tierForPrice(priceId) || (sub.metadata?.tier as any) || null;
  // El período vive en el item (API nueva "basil") o en el nivel superior (previa).
  const periodStart = item?.current_period_start ?? (sub as any).current_period_start ?? null;
  const periodEnd = item?.current_period_end ?? (sub as any).current_period_end ?? null;

  const row = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    tier,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' });
  if (error) console.error('[stripe-sync] upsert error', error);
  return { error };
}
