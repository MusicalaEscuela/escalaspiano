# Musicala · Escalas de piano

Aplicación web estática para estudiar las **cinco escalas mayores de primera digitación** del documento de Musicala proporcionado por el usuario (páginas 1 y 2): Do, Sol, Re, La y Mi mayor.

## Cómo abrirla

1. Descomprime el archivo ZIP.
2. Abre `index.html` en Chrome, Edge, Safari o Firefox. No necesita instalar nada ni iniciar sesión.
3. Para instalarla como aplicación y usar la caché sin conexión tras la primera visita, sírvela desde `localhost` o una web HTTPS. Ejemplo, con Python instalado:

   ```bash
   python -m http.server 8080
   ```

   Luego abre http://localhost:8080 en el navegador. También puedes publicarla en GitHub Pages, Netlify o cualquier hosting estático.

## Qué incluye

- Introducción breve a las escalas, modo mayor y modo menor natural.
- Colección **primera digitación** con Do, Sol, Re, La y Mi mayores.
- Piano virtual de dos octavas con notas, digitación por mano y sonido sintetizado sin archivos externos.
- Reproducción ascendente, descendente o ida y vuelta; tempo regulable.
- Modo de práctica de 8 notas, validación de respuestas y avance guardado localmente.
- Atajos de teclado A S D F G H J K para los ocho grados de la escala.
- Diseño adaptable a computador, tableta y celular.
- Archivos totalmente locales, sin librerías ni servicios externos.

## Alcance de esta primera versión

El PDF base solo documenta cinco escalas mayores, todas con:
- Mano derecha (ascendente): `1 2 3 1 2 3 4 5`
- Mano izquierda (ascendente): `5 4 3 2 1 3 2 1`

La aplicación conserva exactamente las notas y las digitaciones del documento. La sección menor es una **introducción teórica**, no se han añadido digitaciones de escalas menores ausentes en el material. El ejercicio reconoce únicamente las teclas del piano virtual o los atajos del computador, no un instrumento físico o audio de micrófono.

## Archivos

- `index.html`: estructura y pantallas.
- `styles.css`: diseño, teclados y estilos adaptables.
- `app.js`: escalas, sonido, reproducción, prácticas y guardado.
- `manifest.webmanifest` y `sw.js`: instalación/cache cuando se usa HTTPS o localhost.
- `assets/icon.svg` y `assets/icon-192.png`/`icon-512.png`: íconos de la aplicación.

## Para ampliar después

Agregar segundas y terceras digitaciones validadas, escalas menores, interpretación desde micrófono o MIDI, perfiles por estudiante, niveles de práctica y panel de docente.

## Identidad y claridad de uso

Logo horizontal y paleta tomados del proyecto vecino Programa Online Piano: morado `#220a63`, azul `#0c41c4`, violeta `#5729ff` y `#680dbf`, magenta `#ce0071`. El logo queda incluido localmente para funcionar sin conexión.

La página de inicio presenta tres pasos para empezar. El mapa de notas y dedos incluye una indicación del cruce de dedos según la mano. Completar el reto valida el orden de las notas en pantalla; no evalúa digitación física, postura ni precisión rítmica.

Ideas de próximas versiones: progreso separado por mano y recorrido; práctica sin pistas; metrónomo con cuenta de entrada; conexión MIDI para evaluar notas del instrumento; nuevas digitaciones revisadas con el docente.
