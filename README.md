# Estudiemos Juntos — Membresía de Emilse Ríos

Plataforma de membresía (Astro + Supabase + Stripe) que vive en
**membresias.emilserios.com**. Es un proyecto **independiente** de la web
principal de Emilse (`emilserios.com`).

## Estructura
- `/` — landing de la membresía (ES) · `/en/` (EN)
- `/aula/` — el aula con el ejercicio vigente y el foro · `/aula/en/`
- `/entrar/` — login por enlace mágico (Supabase)
- `/panel/` — panel de Emi (solo `role = admin`)
- `/salir/` — logout
- `src/components/membresia/` — `Landing.astro`, `Aula.astro`
- `src/lib/` — `supabase.ts`, `auth.ts`
- `supabase/` — migraciones y seed
- `docs/` — arquitectura, progreso y guía de despliegue

## Desarrollo local
1. `npm install`
2. Crear `.env` (ver `.env.example`) con `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`
3. `npm run dev` → http://localhost:4321/

## Despliegue
Ver `docs/DEPLOY_VERCEL.md`. Resumen: Vercel importa este repo, se configuran las
variables de entorno y se apunta el dominio `membresias.emilserios.com`.
