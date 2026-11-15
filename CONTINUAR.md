# Escaneator — resumen para continuar

Documento de traspaso: todo lo necesario para seguir el proyecto en otra conversación u otra herramienta.
Fecha: 15 de noviembre de 2026 · Versión actual: **0.3.0**

## Qué es

Programa de Windows para:

1. **Imprimir etiquetas**: se ponen las medidas de la hoja, se diseña la etiqueta y se imprimen todas o solo las elegidas.
2. **Rellenar impresos o folletos ya impresos**: se escanea la hoja, se escribe encima en pantalla y al imprimir sale
   solo lo escrito, colocado en su sitio sobre el original que se mete en la impresora.

## Dónde está

- Carpeta de trabajo: `C:\Proyectos\escaneator`
- Está en GitHub, **público**: `locometopa/escaneator`. El instalador de Windows se compila con **GitHub Actions**.

## Tecnología

- **Tauri 2** (Rust por dentro + interfaz web por fuera). Elegida por ser nueva frente a lo ya usado en otros
  proyectos (Python/PyQt6, Node, C#/.NET/WPF/WebView2, Android).
- Interfaz en HTML, CSS y JavaScript **sin paso de compilación** (sin frameworks ni bundler).
- Librerías incluidas en `src/lib`: SheetJS (`xlsx.mini.min.js`) para Excel y pdf.js (`pdf.min.mjs`,
  `pdf.worker.min.mjs`) para abrir PDF.
- Escáner: WIA de Windows, llamado desde Rust a través de un guion de PowerShell.

## Estructura

```
escaneator/
├─ src/                      Interfaz
│  ├─ index.html
│  ├─ estilo.css
│  ├─ app.js                 Toda la lógica de la interfaz
│  └─ lib/                   xlsx y pdf.js
├─ src-tauri/                Parte nativa
│  ├─ Cargo.toml
│  ├─ build.rs
│  ├─ tauri.conf.json        Ventana, instalador NSIS en español, dragDropEnabled: false
│  ├─ capabilities/default.json
│  ├─ icons/
│  └─ src/
│     ├─ main.rs
│     ├─ lib.rs              Comandos: listar/guardar/leer/borrar trabajos, listar_escaneres, escanear
│     └─ escaner.ps1         Guion WIA (va incrustado en el .exe)
├─ package.json              Solo trae @tauri-apps/cli
├─ compilar-github.yml       Receta de GitHub Actions (hay que copiarla a .github\workflows\compilar.yml)
├─ compilar.bat / probar.bat Para compilar o probar en el PC (necesita Node.js, Rust y Build Tools)
├─ LEEME.md
└─ CONTINUAR.md              Este documento
```

## Cómo funciona la interfaz (0.3)

Pantalla de inicio con dos tarjetas y trabajos guardados. Después, pasos guiados con «Atrás / Siguiente».

**Etiquetas**: Hoja → Diseño → Datos → Imprimir
- *Hoja*: una hoja puede tener varios tamaños de etiqueta, cada uno con sus columnas, filas, medidas y posición. Hay dos pestañas: «Elegir una plantilla» (galería con el dibujo de cada plantilla, A4 y rollo, y medidas editables en mm a la derecha; hay una de ejemplo, «Hojas con varios tamaños») y «Colocar las etiquetas a mano» (cada tamaño se arrastra a su sitio y se le da medida tirando de la esquina; botón «+ Añadir otro tamaño de etiqueta»). Se puede poner debajo una foto o un escaneo de la hoja para calcarla y colocar los tamaños encima.
- *Diseño*: clic en un hueco y se escribe ahí mismo; arrastrar para mover; barrita flotante (tamaño, negrita,
  alineación, letra, duplicar, borrar). Los datos que cambian son **fichas de color** que se arrastran a la etiqueta.
  También imágenes o logo. Se elige qué tamaño se diseña, y un botón copia el diseño a los demás tamaños (adaptado en proporción).
  Ejemplos para empezar: Dirección, Precio, Nombre grande, Producto y fecha, Archivador y Remitente. Se adaptan a la medida de la etiqueta y traen datos de muestra.
- *Datos*: tabla (a mano, importar Excel/CSV, pegar desde Excel), casilla por fila y copias. Si el diseño no usa
  fichas, solo pregunta cuántas etiquetas.
- *Imprimir*: vista de la hoja; clic en las posiciones ya usadas para saltarlas (solo primera hoja); borde de prueba;
  ajuste de impresora en mm. Se marca qué tamaños se imprimen.

**Impresos**: Hoja → Rellenar → Imprimir
- *Hoja*: escanear (solo programa instalado) o abrir foto/PDF; tamaño de hoja; girar; colocar la imagen.
- *Rellenar*: clic donde se quiera escribir; arrastrar; flechas mueven 0,5 mm.
- *Imprimir*: solo sale el texto; casilla para imprimir también la imagen (prueba en folio blanco); ajuste en mm.

**Detalles internos útiles**
- Por dentro los datos se guardan en el texto como `{Columna}`; en pantalla se pintan como fichas y al imprimir se
  sustituyen. El usuario nunca ve las llaves.
- La misma función dibuja en pantalla y en papel, en milímetros reales; se imprime con `window.print()` y
  `@page { size: ANCHO ALTO; margin: 0 }`.
- Trabajos guardados como `.json` en `Documentos\Escaneator` (en navegador, en `localStorage`).
- `app.js` detecta si corre dentro de Tauri (`window.__TAURI__`); si no, funciona en modo prueba de navegador.
- La hoja guarda sus tamaños en `hoja.zonas[]`: cada zona tiene x, y, cols, filas, w, h, sepH, sepV, campos[] y activo. Los trabajos guardados con el formato anterior se convierten solos al abrirlos.

## Estado: qué está probado y qué no

| Parte | Estado |
|---|---|
| Interfaz completa (los dos flujos) | Probada en navegador de principio a fin |
| Medidas de impresión | Comprobadas en PDF: los textos caen en su milímetro |
| Importar CSV, guardar y abrir | Probado en navegador |
| Código Rust (`lib.rs`) | Compila correctamente en GitHub Actions |
| Escáner (WIA / `escaner.ps1`) | **Sin probar** con un escáner real |
| Guardado en Documentos | **Sin probar** (depende de Rust) |
| Arrastrar fichas dentro de Tauri | Sin probar en WebView2 (por eso `dragDropEnabled: false`) |
| Impresora de rollo | Sin probar con impresora real |

Para probar hoy sin instalar nada: doble clic en `src\index.html` (no funcionan el escáner ni los PDF).

## Siguientes pasos

1. Instalar y probar con escáner e impresora reales; afinar `escaner.ps1` si el escáner no responde.
2. Probar etiquetas en un folio normal con «Dibujar el borde» y ajustar medidas de las plantillas.

## Ideas apuntadas, sin hacer

- Códigos de barras y QR en las etiquetas.
- Rellenar impresos con una lista de datos (un impreso por fila).
- Varias páginas en un impreso (ahora solo la primera del PDF).
- Actualizaciones automáticas desde GitHub.
- Deshacer (Ctrl+Z).

## Decisiones ya tomadas

- Nombre: Escaneator. Tecnología: Tauri 2.
- Escaneo: desde el programa y también abriendo imagen o PDF.
- Impresoras: de folios y de rollo.
- Datos de etiquetas: a mano y desde lista (Excel/CSV).
- Interfaz: asistente paso a paso, escribir directamente sobre la hoja, sin textos con llaves.
- Idioma de todo: español.

## Texto para pegar al empezar en otro sitio

> Sigo con mi programa Escaneator (Tauri 2, Rust + web) en `C:\Proyectos\escaneator`. Lee `CONTINUAR.md` y
> `LEEME.md` de esa carpeta para ver cómo está. La interfaz (versión 0.3) funciona en navegador. Está en GitHub y el
> instalador de Windows se compila con GitHub Actions; falta probar con escáner e impresora reales. Respóndeme en español.
