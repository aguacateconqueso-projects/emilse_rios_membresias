-- 0006_stripe_subscription_link.sql
-- Índice único para que el webhook de Stripe pueda hacer UPSERT por
-- stripe_subscription_id (onConflict). Postgres permite múltiples NULL, así que
-- las filas simuladas/manuales (sin id de Stripe) no chocan entre sí.
create unique index if not exists subscriptions_stripe_sub_uidx
  on public.subscriptions (stripe_subscription_id);

-- Refresca la cache de esquema de PostgREST por si acaso.
notify pgrst, 'reload schema';
