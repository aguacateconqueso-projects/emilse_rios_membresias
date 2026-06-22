# Desplegar la membresía en Vercel

Este repo (`emilserios_membresias`) es **solo la membresía** y se despliega en
**membresias.emilserios.com**, separado de la web principal de Emilse. Usa el
adaptador `@astrojs/vercel` en modo híbrido (páginas estáticas + servidor listo
para los endpoints de Stripe). Estos pasos se hacen en los paneles de Vercel y
Supabase (Claude no tiene acceso a ellos).

## 1. Importar el repo en Vercel
1. [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Importa el repo `aguacateconqueso-projects/emilserios_membresias`.
3. Framework preset: **Astro** (lo detecta solo). Build/output: por defecto.
4. **Production Branch**: `main`.

> Importante: este es un proyecto de Vercel **distinto** al de la web. No reuses
> el de `emilserios-web`.

## 2. Variables de entorno (Settings → Environment Variables)
En **Production** y **Preview**. Son las del `.env` local (mismo Supabase que ya usamos):

| Nombre | Valor |
|---|---|
| `PUBLIC_SUPABASE_URL` | `https://zjcdnhylhmyntwmvsskm.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | (anon key del dashboard de Supabase) |

> Las `PUBLIC_*` se incrustan al compilar: deben estar **antes** del primer deploy.
> Si las añades después, haz *Redeploy*.
>
> Más adelante (Stripe): `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
> `STRIPE_WEBHOOK_SECRET` — solo servidor, nunca `PUBLIC_`.

## 3. Permitir el login desde la nueva URL (¡importante!)
El enlace mágico redirige a `window.location.origin + /entrar/`. En Supabase →
**Authentication → URL Configuration**:
- **Site URL**: la URL de producción (al inicio la de Vercel, luego el dominio).
- **Redirect URLs**: añade
  - `https://TU-PROYECTO.vercel.app/entrar/`
  - (luego) `https://membresias.emilserios.com/entrar/`

Sin esto el enlace mágico falla en el sitio desplegado aunque en local funcione.

## 4. Deploy
**Deploy**. Cada push a `main` re-despliega; cada PR genera una *Preview* con URL
propia (ideal para que Emi pruebe antes de mergear).

## 5. Dominio `membresias.emilserios.com`
1. Vercel → proyecto → **Settings → Domains** → añade `membresias.emilserios.com`.
2. En **Hostinger** (DNS de emilserios.com) crea el **CNAME** `membresias` →
   `cname.vercel-dns.com`.
3. Cuando propague, actualiza Site URL / Redirect URLs en Supabase (paso 3) con el
   dominio final.

## Pasos de BD (una vez)
Usamos el **mismo** proyecto de Supabase que ya teníamos. Si aún no se aplicó:
- `supabase/migrations/0002_forum.sql` en el SQL Editor (el foro).
- (Para PDFs) crear el bucket público `pdfs` + política de subida para admins.
