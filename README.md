# Estudiemos Juntos — Membresía de Emilse Ríos

Plataforma de membresía (Astro + Supabase + Stripe) que vive en
**www.emilseriosacademy.com** (dominio propio; `www` es el canónico en Vercel).
Es un proyecto **independiente** de la web principal de Emilse (`emilserios.com`).

## Estructura
- `/` — landing de la membresía (ES) · `/en/` (EN)
- `/aula/` — el aula con el ejercicio vigente y el foro · `/aula/en/`
- `/entrar/` — login por enlace mágico (Supabase)
- `/panel/` — panel de Emi (solo `role = admin`)
- `/salir/` — logout
- `src/components/membresia/` — `Landing.astro`, `Aula.astro`
- `src/lib/` — `supabase.ts`, `auth.ts`
- `supabase/` — migraciones y seed
- `docs/` — arquitectura, progreso, despliegue y registro en Google
- `public/robots.txt` + `src/pages/sitemap.xml.ts` — indexación (ver `docs/GOOGLE.md`)

## Desarrollo local
1. `npm install`
2. Crear `.env` (ver `.env.example`) con `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`
3. `npm run dev` → http://localhost:4321/

## Despliegue
Ver `docs/DEPLOY_VERCEL.md`. Resumen: Vercel importa este repo, se configuran las
variables de entorno y se apunta el dominio `www.emilseriosacademy.com`.

Para que Google encuentre e indexe la carta de ventas, ver `docs/GOOGLE.md`
(alta en Search Console, verificación de propiedad y envío del sitemap).
