# Escaneator

Programa para imprimir **etiquetas** y para **rellenar impresos o folletos ya impresos**: se escanea la hoja,
se escribe encima en pantalla y al imprimir solo sale lo escrito, colocado en su sitio sobre el original.

Versión 0.2.0 · Hecho con **Tauri 2** (Rust por dentro, interfaz web por fuera).

## Cómo se maneja

Pantalla de inicio con dos opciones y, a partir de ahí, pasos guiados (Hoja → Diseño → Datos → Imprimir).
Se escribe haciendo clic directamente sobre la etiqueta o la hoja, y se coloca arrastrando.
Los datos que cambian en cada etiqueta son fichas de color que se arrastran al diseño.

## Qué hace

**Etiquetas**
- Medidas de la hoja y de las etiquetas en milímetros, con plantillas habituales (A4 y rollo).
- Diseño de la etiqueta con textos e imágenes; `{Nombre}` se sustituye por el dato de esa columna.
- Datos a mano, importados de Excel/CSV o pegados desde Excel. Casilla para elegir cuáles se imprimen y copias de cada una.
- Hojas empezadas: se marcan las posiciones ya usadas y se saltan.

**Impresos y folletos**
- Escanear desde el programa (escáner de Windows, WIA) o abrir una imagen o un PDF.
- Doble clic sobre la hoja para escribir; se arrastra y se ajusta al milímetro.
- Al imprimir sale solo el texto. Hay una casilla para imprimir también la imagen y probar en un folio en blanco.
- Ajuste de la impresora en milímetros por si todo sale desplazado.

Los trabajos se guardan en `Documentos\Escaneator`.

## Carpetas

- `src/` — la interfaz (HTML, CSS y JavaScript, sin pasos de compilación).
- `src-tauri/` — la parte nativa en Rust: guardar trabajos y manejar el escáner (`src/escaner.ps1`).
- `compilar-github.yml` — receta para compilar el instalador de Windows en GitHub. Para activarla hay que copiarla a `.github\workflows\compilar.yml`.

## Probar sin instalar nada

Abre `src\index.html` con doble clic. Funciona todo menos el escáner y los PDF (eso necesita el programa instalado).

## Compilar

- **En GitHub**: subir el proyecto y lanzar la acción «Compilar Escaneator». El instalador queda como descarga de la acción;
  si se sube una etiqueta `v0.1.0`, se publica además como versión.
- **En el PC**: con Node.js, Rust y las «Build Tools» de Visual Studio instalados, `compilar.bat`.

## Al imprimir

En la ventana de impresión: márgenes **Ninguno** y escala **100 %** (tamaño real). El tamaño de papel lo propone el programa.
En impresoras de rollo, el tamaño de la etiqueta tiene que existir también en el controlador de la impresora.
