# Imágenes de la página de ventas

Carpeta para los recursos gráficos de la carta editorial. Todo lo que esté en
`public/` se sirve desde la raíz del sitio, así que un archivo aquí se referencia
en el código como `/img/NOMBRE`.

## Qué subir aquí

Emi/Adrián: dejen los archivos con estos nombres exactos para que el código los
tome sin cambios (o avísenme el nombre que usaron y yo lo enlazo):

- **`logo`** — el logotipo de Emilse Rios. Formatos preferidos, en orden:
  `logo.svg` (ideal, escala sin perder nitidez) · `logo.png` (fondo transparente)
  · `logo.jpg`.
- **`foto`** — la foto de Emi para la apertura de la carta (la del contrabajo en la
  ciudad, o la nueva que quieras). `foto.jpg` o `foto.webp`. Se muestra pequeña
  (~230 px de ancho), así que con ~600–800 px de lado basta y sobra.

## Notas

- La foto que está hoy en la carta es `public/emi-city.jpg` (referenciada como
  `/emi-city.jpg`). Cuando suban la nueva aquí, actualizo la referencia en
  `src/components/membresia/Landing.astro`.
- Para el logo aún no hay un lugar en el diseño (la carta usa el nombre "Emilse
  Rios" en texto, no clicable). Cuando definamos dónde va, lo enlazo.
