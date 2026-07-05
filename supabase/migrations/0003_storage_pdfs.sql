-- =============================================================================
-- Storage: bucket público "pdfs" para los PDF de los ejercicios
-- Ejecutar en Supabase → SQL Editor (una sola vez).
--
-- El panel sube a pdfs/<nivel>/<timestamp>_<azar>.pdf (solo admins) y el aula
-- lee por URL pública (bucket público ⇒ la lectura no necesita política).
-- =============================================================================

-- Bucket público. Si ya existía, solo asegura que sea público.
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do update set public = true;

-- Subida: solo admins (el panel usa upsert:false, así que basta con insert).
drop policy if exists "pdfs: admin insert" on storage.objects;
create policy "pdfs: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pdfs' and public.is_admin());

-- Reemplazo y borrado futuros (limpieza desde el panel): también solo admins.
drop policy if exists "pdfs: admin update" on storage.objects;
create policy "pdfs: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'pdfs' and public.is_admin())
  with check (bucket_id = 'pdfs' and public.is_admin());

drop policy if exists "pdfs: admin delete" on storage.objects;
create policy "pdfs: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pdfs' and public.is_admin());
