/* Escaneator — interfaz por pasos. Funciona dentro de Tauri (programa instalado) y también en un navegador para pruebas. */
'use strict';

const MM = 96 / 25.4; // píxeles CSS por milímetro
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };
const r5 = (v) => Math.round(v * 2) / 2;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const altoLinea = (tam) => Math.ceil(tam * 0.3528 * 1.15 * 2) / 2; // mm que ocupa una línea de ese tamaño de letra

const esTauri = !!(window.__TAURI__ && window.__TAURI__.core);
const invoke = esTauri ? window.__TAURI__.core.invoke : null;

/* ---------- Hojas y plantillas ---------- */
const ZC = ['#ff8a3d', '#3da9ff', '#3fbf7f', '#c86bd6', '#d9b310', '#ff6b81']; // un color por tamaño de etiqueta
const zn = (x, y, cols, filas, w, h, sepH = 0, sepV = 0) => ({ x, y, cols, filas, w, h, sepH, sepV });
const hj = (ancho, alto, mSup, mIzq, cols, filas, w, h, sepH = 0, sepV = 0) => ({ ancho, alto, zonas: [zn(mIzq, mSup, cols, filas, w, h, sepH, sepV)] });
const PLANTILLAS = [
  { g: 'Folio A4', n: '24 etiquetas', d: '70 × 37 mm', h: hj(210, 297, 0.5, 0, 3, 8, 70, 37) },
  { g: 'Folio A4', n: '21 etiquetas', d: '70 × 42,3 mm', h: hj(210, 297, 0.45, 0, 3, 7, 70, 42.3) },
  { g: 'Folio A4', n: '21 etiquetas', d: '63,5 × 38,1 mm', h: hj(210, 297, 15.15, 7.2, 3, 7, 63.5, 38.1, 2.5) },
  { g: 'Folio A4', n: '14 etiquetas', d: '99,1 × 38,1 mm', h: hj(210, 297, 15.15, 4.65, 2, 7, 99.1, 38.1, 2.5) },
  { g: 'Folio A4', n: '8 etiquetas', d: '99,1 × 67,7 mm', h: hj(210, 297, 13.1, 4.65, 2, 4, 99.1, 67.7, 2.5) },
  { g: 'Folio A4', n: '40 etiquetas', d: '52,5 × 29,7 mm', h: hj(210, 297, 0, 0, 4, 10, 52.5, 29.7) },
  { g: 'Folio A4', n: '65 etiquetas', d: '38,1 × 21,2 mm', h: hj(210, 297, 10.7, 4.75, 5, 13, 38.1, 21.2, 2.5) },
  { g: 'Folio A4', n: '4 etiquetas', d: '105 × 148,5 mm', h: hj(210, 297, 0, 0, 2, 2, 105, 148.5) },
  { g: 'Impresora de rollo', n: 'Rollo', d: '62 × 29 mm', h: hj(62, 29, 0, 0, 1, 1, 62, 29) },
  { g: 'Impresora de rollo', n: 'Rollo', d: '50 × 30 mm', h: hj(50, 30, 0, 0, 1, 1, 50, 30) },
  { g: 'Impresora de rollo', n: 'Rollo', d: '100 × 50 mm', h: hj(100, 50, 0, 0, 1, 1, 100, 50) },
  { g: 'Impresora de rollo', n: 'Rollo de envíos', d: '100 × 150 mm', h: hj(100, 150, 0, 0, 1, 1, 100, 150) },
  { g: 'Hojas con varios tamaños', n: '13 etiquetas', d: '3 tamaños distintos', h: { ancho: 110, alto: 150, zonas: [zn(3, 2, 1, 8, 33, 16, 0, 2.3), zn(39, 2, 1, 3, 66, 28, 0, 5.5), zn(39, 102, 2, 1, 34, 40, 1.5, 0)] } },
];
const HOJAS = [
  { n: 'A4', ancho: 210, alto: 297 }, { n: 'A4 tumbado', ancho: 297, alto: 210 },
  { n: 'A5', ancho: 148, alto: 210 }, { n: 'A5 tumbado', ancho: 210, alto: 148 },
  { n: 'A6', ancho: 105, alto: 148 }, { n: 'Sobre DL', ancho: 220, alto: 110 }, { n: 'Carta', ancho: 216, alto: 279 },
];
const FUENTES = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Calibri'];
const COLORES = ['#ffd9a8', '#b8e0ff', '#c9f2c7', '#f6c6ea', '#fff1a8', '#d5ccff', '#ffc9c9', '#bfeee6'];
const colorCol = (i) => COLORES[i % COLORES.length];
const PASOS = { etq: ['Hoja', 'Diseño', 'Datos', 'Imprimir'], imp: ['Hoja', 'Rellenar', 'Imprimir'] };

/* ---------- Estado ---------- */
const GEO = ['x', 'y', 'cols', 'filas', 'w', 'h', 'sepH', 'sepV'];
const geoHoja = (h) => JSON.stringify([h.ancho, h.alto, h.zonas.map((z) => GEO.map((k) => +(+z[k]).toFixed(2)))]);
const fmt = (n) => String(+(+n).toFixed(1)).replace('.', ',');
/* Pasa un diseño de una etiqueta a otra de distinta medida, encogiendo o estirando en proporción. */
function adaptarCampos(campos, de, a) {
  const fx = a.w / de.w, fy = a.h / de.h, f = Math.sqrt(fx * fy); // media de ambos: ir y volver entre plantillas no encoge la letra
  return campos.map((c) => ({ ...c, id: uid(), x: r5(c.x * fx), y: r5(c.y * fy), w: Math.max(3, r5(c.w * fx)), h: Math.max(2, r5(c.h * fy)), ...(c.tipo === 'texto' ? { tam: Math.max(5, Math.round(c.tam * f)) } : {}) }));
}
/* Crea una hoja a partir de una plantilla, conservando (adaptado) el diseño que hubiera. */
function hojaDe(p, vieja) {
  const zonas = p.zonas.map((g, i) => {
    const o = vieja && (vieja.zonas[i] || vieja.zonas[0]);
    const igual = o && Math.abs(o.w - g.w) < 0.05 && Math.abs(o.h - g.h) < 0.05;
    return { id: uid(), activo: true, ...g, campos: !o ? [] : igual ? o.campos.map((c) => ({ ...c, id: uid() })) : adaptarCampos(o.campos, o, g) };
  });
  return { ancho: p.ancho, alto: p.alto, zonas, calco: null };
}
function nuevoEtq() {
  const hoja = hojaDe(PLANTILLAS[0].h);
  hoja.zonas[0].campos = [
    { id: uid(), tipo: 'texto', texto: '{Nombre}', x: 4, y: 5, w: 62, h: 7, tam: 14, negrita: true, alin: 'left', fuente: 'Arial' },
    { id: uid(), tipo: 'texto', texto: '{Dirección}', x: 4, y: 14, w: 62, h: 9, tam: 10, negrita: false, alin: 'left', fuente: 'Arial' },
  ];
  return {
    tipo: 'etiquetas', nombre: '', hoja,
    columnas: ['Nombre', 'Dirección'], filas: [{ sel: true, copias: 1, v: ['', ''] }],
    cantidad: 1, usadas: [], borde: false, ajusteX: 0, ajusteY: 0,
  };
}
/* Acepta trabajos guardados con versiones anteriores (una sola medida de etiqueta). */
function migrarEtq(o) {
  const e = { ...nuevoEtq(), ...o }, h = e.hoja;
  if (!h.zonas) e.hoja = { ancho: h.ancho, alto: h.alto, calco: null, zonas: [{ ...zn(h.mIzq || 0, h.mSup || 0, h.cols || 1, h.filas || 1, h.etqAncho, h.etqAlto, h.sepH || 0, h.sepV || 0), campos: o.campos || [] }] };
  e.hoja.zonas.forEach((z) => { z.id = z.id || uid(); z.campos = z.campos || []; if (z.activo === undefined) z.activo = true; });
  delete e.campos;
  return e;
}
function nuevoImp() {
  return { tipo: 'impresos', nombre: '', hoja: { ancho: 210, alto: 297 }, fondo: null, opFondo: 0.85, campos: [], ajusteX: 0, ajusteY: 0, conFondo: false };
}
const st = { pantalla: 'inicio', paso: 0, etq: nuevoEtq(), imp: nuevoImp(), sel: null, edit: false, caret: null, zf: 1, z: 1, pag: 0, filaPrev: 0, escaneres: null, guardados: null, zona: null, vistaHoja: 'galeria' };
const actual = () => (st.pantalla === 'imp' ? st.imp : st.etq);
const zonaAct = () => { const zs = st.etq.hoja.zonas; return zs.find((z) => z.id === st.zona) || zs[0]; };
const cont = () => (st.pantalla === 'imp' ? st.imp : zonaAct()); // quién tiene los textos que se están editando
const todosCampos = (e) => e.hoja.zonas.flatMap((z) => z.campos);
const campoSel = () => (st.sel ? cont().campos.find((c) => c.id === st.sel) : null);

let tSesion = null;
function guardarSesion() {
  clearTimeout(tSesion);
  tSesion = setTimeout(() => {
    const datos = { etq: st.etq, imp: st.imp };
    try { localStorage.setItem('esc:sesion', JSON.stringify(datos)); }
    catch (e) { // las imágenes escaneadas pueden no caber: se guarda lo demás (se conservan al pulsar Guardar)
      try { localStorage.setItem('esc:sesion', JSON.stringify(datos, (k, v) => (k === 'calco' || k === 'fondo' ? null : v))); } catch (e2) { /* sin sitio */ }
    }
  }, 700);
}
function cargarSesion() {
  try {
    const s = JSON.parse(localStorage.getItem('esc:sesion') || 'null');
    if (s && s.etq && s.imp) { st.etq = migrarEtq(s.etq); st.imp = { ...nuevoImp(), ...s.imp }; }
  } catch (e) { /* sesión dañada: se empieza de cero */ }
}

/* ---------- Avisos y diálogos ---------- */
function aviso(texto, error = false, ms = 3500) {
  const d = document.createElement('div');
  d.className = 'aviso' + (error ? ' error' : '');
  d.textContent = texto;
  $('#avisos').append(d);
  setTimeout(() => d.remove(), ms);
  return d;
}
function dialogo(html) {
  const d = $('#dlg');
  d.onclick = null; d.oncancel = null;
  d.innerHTML = html;
  if (!d.open) d.showModal();
  return d;
}
function confirmar(texto, si = 'Aceptar') {
  return new Promise((res) => {
    const d = dialogo(`<h2>${esc(texto)}</h2><div class="pie"><button data-r="0">Cancelar</button><button class="principal" data-r="1">${esc(si)}</button></div>`);
    d.onclick = (e) => { const r = e.target.dataset.r; if (r !== undefined) { d.close(); res(r === '1'); } };
    d.oncancel = () => res(false);
  });
}
function pedirTexto(titulo, valor = '') {
  return new Promise((res) => {
    const d = dialogo(`<h2>${esc(titulo)}</h2><input type="text" id="dlgTxt" value="${esc(valor)}"><div class="pie"><button data-r="0">Cancelar</button><button class="principal" data-r="1">Aceptar</button></div>`);
    const i = $('#dlgTxt', d); i.focus(); i.select();
    const fin = (ok) => { d.close(); res(ok ? i.value.trim() : null); };
    i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); setTimeout(() => fin(true), 0); } };
    d.onclick = (e) => { const r = e.target.dataset.r; if (r !== undefined) fin(r === '1'); };
    d.oncancel = () => res(null);
  });
}

/* ---------- Textos con datos ---------- */
const indiceCol = (e, nombre) => e.columnas.findIndex((c) => c.trim().toLowerCase() === nombre.trim().toLowerCase());
function sustituir(texto, e, valores) {
  return texto.replace(/\{([^{}]+)\}/g, (todo, nombre) => { const i = indiceCol(e, nombre); return i < 0 ? todo : (valores[i] ?? ''); });
}
function usaDatos(e) {
  return e.hoja.zonas.some((z) => z.activo !== false && z.campos.some((c) => c.tipo === 'texto' && [...c.texto.matchAll(/\{([^{}]+)\}/g)].some((m) => indiceCol(e, m[1]) >= 0)));
}
function elFicha(e, i) {
  const s = document.createElement('span');
  s.className = 'ficha'; s.contentEditable = 'false'; s.dataset.col = e.columnas[i];
  s.style.background = colorCol(i); s.textContent = e.columnas[i];
  return s;
}
/* En el diseño, los datos se ven como fichas de color en lugar de {llaves}. */
function pintarConFichas(el, texto, e) {
  el.textContent = '';
  let ult = 0;
  for (const m of texto.matchAll(/\{([^{}]+)\}/g)) {
    const i = indiceCol(e, m[1]);
    if (i < 0) continue;
    if (m.index > ult) el.append(texto.slice(ult, m.index));
    el.append(elFicha(e, i));
    ult = m.index + m[0].length;
  }
  if (ult < texto.length) el.append(texto.slice(ult));
}
function serializar(el) {
  let s = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) s += n.nodeValue;
    else if (n.nodeName === 'BR') s += '\n';
    else if (n.classList && n.classList.contains('ficha')) s += `{${n.dataset.col}}`;
    else { const t = serializar(n); s += (/^(DIV|P)$/.test(n.nodeName) && s && !s.endsWith('\n') ? '\n' : '') + t; }
  });
  return s.replace(/ /g, ' ');
}

/* ---------- Representación (igual en pantalla y en papel) ---------- */
function elCampo(c, e, valores) {
  const d = document.createElement('div');
  d.className = 'campo';
  d.style.left = c.x + 'mm'; d.style.top = c.y + 'mm'; d.style.width = c.w + 'mm'; d.style.height = c.h + 'mm';
  if (c.tipo === 'imagen') { const i = document.createElement('img'); i.src = c.src; d.append(i); return d; }
  d.style.fontSize = c.tam + 'pt';
  d.style.fontWeight = c.negrita ? '700' : '400';
  d.style.textAlign = c.alin || 'left';
  d.style.fontFamily = `"${c.fuente || 'Arial'}", Arial, sans-serif`;
  const t = document.createElement('div'); t.className = 'txt';
  if (valores && e) t.textContent = sustituir(c.texto, e, valores);
  else if (e && e.columnas) pintarConFichas(t, c.texto, e);
  else t.textContent = c.texto;
  d.append(t);
  return d;
}
function elFondo(f, opacidad) {
  const i = document.createElement('img');
  i.className = 'fondoEsc'; i.src = f.src; i.draggable = false;
  i.style.left = f.x + 'mm'; i.style.top = f.y + 'mm'; i.style.width = f.w + 'mm'; i.style.height = f.h + 'mm';
  i.style.opacity = opacidad;
  return i;
}
/* Todas las etiquetas de la hoja, en orden: tamaño a tamaño, de izquierda a derecha y de arriba abajo. */
function posiciones(h) {
  const out = [];
  h.zonas.forEach((z) => { for (let f = 0; f < z.filas; f++) for (let c = 0; c < z.cols; c++) out.push({ z, x: z.x + c * (z.w + z.sepH), y: z.y + f * (z.h + z.sepV) }); });
  return out;
}
const libresHoja = (e) => Math.max(1, posiciones(e.hoja).filter((p, i) => p.z.activo !== false && !e.usadas[i]).length);
function etiquetasAImprimir(e) {
  if (!usaDatos(e)) return Array.from({ length: Math.max(1, Math.min(9999, e.cantidad | 0)) }, () => []);
  const out = [];
  e.filas.forEach((f) => { if (f.sel) for (let i = 0; i < Math.max(1, Math.min(9999, f.copias | 0)); i++) out.push(f.v); });
  return out;
}
/* Reparte las etiquetas en hojas, saltando en la primera las posiciones marcadas como usadas. */
function paginar(e) {
  const pos = posiciones(e.hoja), cola = etiquetasAImprimir(e), pags = [];
  if (!pos.some((p) => p.z.activo !== false)) return pags;
  let k = 0;
  while (k < cola.length && pags.length < 2000) {
    const pag = new Array(pos.length).fill(null);
    for (let i = 0; i < pos.length && k < cola.length; i++) {
      if (pos[i].z.activo === false || (pags.length === 0 && e.usadas[i])) continue;
      pag[i] = cola[k++];
    }
    pags.push(pag);
  }
  return pags;
}
function contenidoHoja(e, pag, guia) {
  const frag = document.createDocumentFragment();
  posiciones(e.hoja).forEach((p, i) => {
    const valores = pag ? pag[i] : null;
    if (!guia && !valores) return;
    const d = document.createElement('div');
    d.className = 'etq' + (!guia && e.borde ? ' borde' : '') + (guia && p.z.activo === false ? ' apagada' : '');
    d.style.left = p.x + 'mm'; d.style.top = p.y + 'mm'; d.style.width = p.z.w + 'mm'; d.style.height = p.z.h + 'mm';
    d.dataset.i = i;
    if (valores) p.z.campos.forEach((c) => d.append(elCampo(c, e, valores)));
    frag.append(d);
  });
  return frag;
}
function svgHoja(h) {
  const r = posiciones(h).slice(0, 500).map((p) => { const col = ZC[h.zonas.indexOf(p.z) % ZC.length]; return `<rect x="${p.x}" y="${p.y}" width="${p.z.w}" height="${p.z.h}" rx="1.2" fill="${col}22" stroke="${col}" stroke-width="0.7"/>`; }).join('');
  return `<svg viewBox="-3 -3 ${h.ancho + 6} ${h.alto + 6}"><rect width="${h.ancho}" height="${h.alto}" rx="2" fill="#fff"/>${r}</svg>`;
}

/* ---------- Papel en pantalla ---------- */
function papelEn(cont, ancho, alto, z) {
  const escd = document.createElement('div');
  escd.className = 'papelEsc';
  escd.style.width = ancho * MM * z + 'px'; escd.style.height = alto * MM * z + 'px';
  const papel = document.createElement('div');
  papel.className = 'papel';
  papel.style.width = ancho + 'mm'; papel.style.height = alto + 'mm';
  papel.style.transform = `scale(${z})`;
  escd.append(papel); cont.append(escd);
  return { papel, escd };
}
function crearPapel(ancho, alto, tope = 6, soloAncho = false) {
  const l = $('#lienzo');
  l.className = ''; l.innerHTML = '';
  const aLoAncho = (l.clientWidth - 90) / (ancho * MM);
  const fit = soloAncho ? aLoAncho : Math.min(aLoAncho, (l.clientHeight - 110) / (alto * MM));
  st.z = Math.max(0.1, Math.min(tope, fit) * st.zf);
  return papelEn(l, ancho, alto, st.z);
}

/* ---------- Editor: se escribe y se arrastra directamente sobre el papel ---------- */
function montarEditor(ancho, alto, e, opciones = {}) {
  const { papel, escd } = crearPapel(ancho, alto, opciones.tope || 6, opciones.soloAncho);
  const fichas = opciones.fichas || null, conFichas = !!fichas;
  papel.classList.add('editor');
  if (opciones.fondo) papel.append(elFondo(opciones.fondo, opciones.opFondo ?? 1));
  e.campos.forEach((c) => {
    const d = elCampo(c, fichas, null);
    d.classList.add('edit'); d.dataset.id = c.id;
    if (c.id === st.sel) {
      d.classList.add('sel');
      if (st.edit && c.tipo === 'texto') { d.classList.add('escribiendo'); $('.txt', d).contentEditable = 'plaintext-only'; $('.txt', d).spellcheck = false; }
    }
    const t = document.createElement('i'); t.className = 'tirador'; d.append(t);
    papel.append(d);
  });
  const puntoMM = (ev) => { const r = papel.getBoundingClientRect(); return { x: r5((ev.clientX - r.left) / (MM * st.z)), y: r5((ev.clientY - r.top) / (MM * st.z)) }; };

  papel.onpointerdown = (ev) => {
    if (ev.button !== 0) return;
    const d = ev.target.closest('.campo');
    const redim = ev.target.classList.contains('tirador');
    if (d && st.edit && d.dataset.id === st.sel && !redim) return; // está escribiendo: clic normal de cursor
    ev.preventDefault();
    if (!d) { // clic en un hueco: texto nuevo ahí mismo
      const p = puntoMM(ev);
      finEdicion();
      const tam = opciones.tam || 11, h = altoLinea(tam);
      const c = { id: uid(), tipo: 'texto', texto: '', x: Math.max(0, p.x - 0.5), y: Math.max(0, r5(p.y - h / 2)), w: Math.max(12, Math.min(opciones.anchoNuevo || 80, ancho - p.x - 1)), h, tam, negrita: false, alin: 'left', fuente: 'Arial' };
      e.campos.push(c); st.sel = c.id; st.edit = true; st.caret = null;
      pintarCentro();
      return;
    }
    const c = e.campos.find((x) => x.id === d.dataset.id);
    if (!c) return;
    finEdicion();
    st.sel = c.id;
    pintarCentro();
    arrastrar(ev, c, redim ? 'redim' : 'mover', true);
  };
  papel.addEventListener('input', (ev) => {
    const c = campoSel(), t = ev.target.closest('.txt');
    if (!c || !t) return;
    c.texto = serializar(t);
    ajustarAlto(c);
    colocarBarrita();
    guardarSesion();
  });
  if (conFichas) {
    const esFicha = (ev) => [...ev.dataTransfer.types].includes('application/x-ficha');
    papel.ondragover = (ev) => {
      if (!esFicha(ev)) return;
      ev.preventDefault();
      papel.querySelectorAll('.soltar').forEach((x) => x.classList.remove('soltar'));
      const d = ev.target.closest('.campo'); if (d) d.classList.add('soltar');
    };
    papel.ondrop = (ev) => {
      if (!esFicha(ev)) return;
      ev.preventDefault();
      const nombre = ev.dataTransfer.getData('application/x-ficha'), d = ev.target.closest('.campo');
      const c = d && e.campos.find((x) => x.id === d.dataset.id);
      finEdicion();
      if (c && c.tipo === 'texto') { c.texto += (c.texto && !/\s$/.test(c.texto) ? ' ' : '') + `{${nombre}}`; st.sel = c.id; }
      else { const p = puntoMM(ev); nuevoCampoDato(nombre, p.x, p.y); }
      pintarCentro(); guardarSesion();
    };
  }
  ponerBarrita(escd);
  if (st.edit) enfocarEdicion();
  e.campos.forEach(ajustarAlto);
}
function nuevoCampoDato(nombre, x, y) {
  const z = zonaAct(), tam = Math.max(6, Math.min(11, Math.round(z.h / 4))), h = altoLinea(tam);
  if (x === undefined) { x = 3; y = z.campos.reduce((m, c) => Math.max(m, c.y + c.h), 2) + 1; if (y + h > z.h) y = 2; }
  const c = { id: uid(), tipo: 'texto', texto: `{${nombre}}`, x: Math.max(0, x - 1), y: Math.max(0, r5(y - h / 2)), w: Math.max(12, Math.min(60, z.w - x - 1)), h, tam, negrita: false, alin: 'left', fuente: 'Arial' };
  z.campos.push(c); st.sel = c.id; st.edit = false;
}
const elSel = () => (st.sel ? $(`#lienzo .campo[data-id="${st.sel}"]`) : null);
function ajustarAlto(c) {
  if (c.tipo !== 'texto') return;
  const d = $(`#lienzo .campo[data-id="${c.id}"]`), t = d && $('.txt', d);
  if (!t) return;
  const hace = t.scrollHeight / MM;
  if (hace > c.h + 0.3) { c.h = Math.ceil(hace * 2) / 2; d.style.height = c.h + 'mm'; }
}
function enfocarEdicion() {
  const d = elSel(), t = d && $('.txt', d);
  if (!t) return;
  t.focus();
  let r = null;
  if (st.caret && document.caretRangeFromPoint) { r = document.caretRangeFromPoint(st.caret.x, st.caret.y); if (r && !t.contains(r.startContainer)) r = null; }
  if (!r) { r = document.createRange(); r.selectNodeContents(t); r.collapse(false); }
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  st.caret = null;
}
/* Termina de escribir; un texto que se queda vacío desaparece solo. */
function finEdicion() {
  const c = campoSel();
  if (st.edit && c && c.tipo === 'texto') {
    c.texto = c.texto.replace(/\s+$/, '');
    if (!c.texto) { const a = cont(); a.campos = a.campos.filter((x) => x.id !== c.id); st.sel = null; }
  }
  st.edit = false;
  guardarSesion();
}
function arrastrar(ev, c, modo, clicEdita) {
  const x0 = ev.clientX, y0 = ev.clientY, o = { x: c.x, y: c.y, w: c.w, h: c.h }, k = MM * st.z;
  let movido = false;
  const mover = (e2) => {
    const dx = (e2.clientX - x0) / k, dy = (e2.clientY - y0) / k;
    if (!movido && Math.abs(e2.clientX - x0) + Math.abs(e2.clientY - y0) < 4) return;
    movido = true;
    const d = elSel(), b = $('#lienzo .barrita');
    if (b) b.style.visibility = 'hidden';
    if (modo === 'redim') { c.w = Math.max(5, r5(o.w + dx)); c.h = Math.max(2, r5(o.h + dy)); }
    else { c.x = r5(o.x + dx); c.y = r5(o.y + dy); }
    if (d) { d.style.left = c.x + 'mm'; d.style.top = c.y + 'mm'; d.style.width = c.w + 'mm'; d.style.height = c.h + 'mm'; }
  };
  const fin = (e2) => {
    window.removeEventListener('pointermove', mover);
    if (!movido && clicEdita && modo === 'mover' && c.tipo === 'texto') { st.edit = true; st.caret = { x: e2.clientX, y: e2.clientY }; }
    pintarCentro(); guardarSesion();
  };
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', fin, { once: true });
}

/* Barrita flotante junto al texto seleccionado */
const ICO = {
  left: '<svg width="16" height="14" viewBox="0 0 16 14"><path d="M1 2h14M1 7h9M1 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  center: '<svg width="16" height="14" viewBox="0 0 16 14"><path d="M1 2h14M4 7h8M2 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  right: '<svg width="16" height="14" viewBox="0 0 16 14"><path d="M1 2h14M6 7h9M3 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mover: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1v14M1 8h14M8 1 5.5 3.5M8 1l2.5 2.5M8 15l-2.5-2.5M8 15l2.5-2.5M1 8l2.5-2.5M1 8l2.5 2.5M15 8l-2.5-2.5M15 8l-2.5 2.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>',
};
function ponerBarrita(escd) {
  const c = campoSel(); if (!c) return;
  const b = document.createElement('div');
  b.className = 'barrita';
  const txt = c.tipo === 'texto';
  b.innerHTML = `<button class="mover" data-b="mover" title="Arrastra para mover">${ICO.mover}</button><span class="sep"></span>` +
    (txt ? `<button data-b="menos" title="Letra más pequeña">A−</button><span class="tam">${c.tam}</span><button data-b="mas" title="Letra más grande">A+</button>
      <button data-b="negrita" class="${c.negrita ? 'on' : ''}" title="Negrita"><b>N</b></button><span class="sep"></span>
      ${['left', 'center', 'right'].map((a) => `<button data-b="alin" data-v="${a}" class="${(c.alin || 'left') === a ? 'on' : ''}" title="Alinear">${ICO[a]}</button>`).join('')}
      <select data-b="fuente" title="Tipo de letra">${FUENTES.map((f) => `<option ${f === (c.fuente || 'Arial') ? 'selected' : ''}>${f}</option>`).join('')}</select><span class="sep"></span>` : '') +
    `<button data-b="duplicar" title="Hacer una copia">Duplicar</button><button data-b="borrar" class="peligro" title="Quitar">Borrar</button>`;
  escd.append(b);
  colocarBarrita();
  b.onpointerdown = (ev) => {
    const bt = ev.target.closest('[data-b]');
    if (ev.target.tagName !== 'SELECT') ev.preventDefault(); // no quitar el cursor del texto
    if (bt && bt.dataset.b === 'mover') { const cc = campoSel(); if (cc) arrastrar(ev, cc, 'mover', false); }
  };
  b.onclick = (ev) => {
    const bt = ev.target.closest('button[data-b]'), cc = campoSel();
    if (!bt || !cc) return;
    const a = bt.dataset.b;
    if (a === 'mover') return;
    if (a === 'menos') cc.tam = Math.max(5, cc.tam - 1);
    else if (a === 'mas') cc.tam = Math.min(120, cc.tam + 1);
    else if (a === 'negrita') cc.negrita = !cc.negrita;
    else if (a === 'alin') cc.alin = bt.dataset.v;
    else if (a === 'borrar') { st.edit = false; const o = cont(); o.campos = o.campos.filter((x) => x.id !== cc.id); st.sel = null; }
    else if (a === 'duplicar') { finEdicion(); const n = { ...cc, id: uid(), y: cc.y + cc.h + 1 }; cont().campos.push(n); st.sel = n.id; }
    pintarCentro(); guardarSesion();
  };
  b.onchange = (ev) => { const cc = campoSel(); if (ev.target.dataset.b === 'fuente' && cc) { cc.fuente = ev.target.value; pintarCentro(); guardarSesion(); } };
}
function colocarBarrita() {
  const b = $('#lienzo .barrita'), c = campoSel(), escd = b && b.parentElement;
  if (!b || !c) return;
  const k = MM * st.z, arriba = c.y * k - b.offsetHeight - 10;
  b.style.top = (arriba < -70 ? (c.y + c.h) * k + 12 : arriba) + 'px';
  b.style.left = Math.max(-20, Math.min(c.x * k, escd.offsetWidth - b.offsetWidth + 20)) + 'px';
}
function insertarFicha(nombre) {
  const e = st.etq, i = indiceCol(e, nombre), d = elSel(), t = d && $('.txt', d);
  if (st.edit && t && i >= 0) {
    const s = getSelection();
    let r = s.rangeCount ? s.getRangeAt(0) : null;
    if (!r || !t.contains(r.startContainer)) { r = document.createRange(); r.selectNodeContents(t); r.collapse(false); }
    r.deleteContents();
    const f = elFicha(e, i); r.insertNode(f);
    r.setStartAfter(f); r.collapse(true); s.removeAllRanges(); s.addRange(r);
    campoSel().texto = serializar(t);
  } else { finEdicion(); nuevoCampoDato(nombre); }
  pintarCentro(); guardarSesion();
}

/* ---------- Pintado general ---------- */
function pintar() {
  const ini = st.pantalla === 'inicio', pasos = PASOS[st.pantalla] || [];
  $('#pasos').innerHTML = pasos.map((n, i) => `${i ? '<span class="raya"></span>' : ''}<button data-paso="${i}" class="${i === st.paso ? 'activo' : i < st.paso ? 'hecho' : ''}"><span class="n">${i < st.paso ? '✓' : i + 1}</span>${n}</button>`).join('');
  $('#pie').classList.toggle('oculto', ini);
  $('#der').classList.toggle('oculto', ini);
  $('#btnGuardar').classList.toggle('oculto', ini);
  $('#nombreTrabajo').textContent = ini ? '' : (actual().nombre || 'Sin guardar');
  if (!ini) {
    const ultimo = st.paso === pasos.length - 1;
    $('#btnSiguiente').textContent = ultimo ? 'Imprimir' : `Siguiente: ${pasos[st.paso + 1]} →`;
    $('#btnAtras').textContent = st.paso === 0 ? '← Inicio' : '← Atrás';
  }
  pintarTitulo(); pintarDer(); pintarCentro();
}
const TITULOS = {
  etq: [
    ['¿En qué hoja vas a imprimir?', 'Elige una que se parezca a la tuya y corrige las medidas a la derecha. Si tu hoja trae etiquetas de varios tamaños, colócalas a mano.'],
    ['Diseña una etiqueta', 'Haz clic en la etiqueta y escribe. Arrastra para mover. Lo que diseñes aquí se repite en todas.'],
    ['¿Qué pone en cada etiqueta?', ''],
    ['Revisa e imprime', 'Así saldrá la hoja. Si ya está empezada, haz clic en las etiquetas que faltan para saltarlas.'],
  ],
  imp: [
    ['Trae la hoja que quieres rellenar', 'Escanéala o abre una foto o un PDF. Servirá de guía para escribir en el sitio exacto.'],
    ['Escribe sobre la hoja', 'Haz clic donde quieras escribir y teclea. Arrastra un texto para moverlo.'],
    ['Revisa e imprime', 'Solo se imprime lo que has escrito. Pon el impreso original en la bandeja de la impresora.'],
  ],
};
function pintarTitulo() {
  const t = $('#titulo');
  if (st.pantalla === 'inicio') { t.innerHTML = ''; return; }
  let [a, b] = TITULOS[st.pantalla][st.paso];
  if (st.pantalla === 'etq' && st.paso === 2) b = usaDatos(st.etq) ? 'Cada fila es una etiqueta. Escribe, importa un Excel o pega con Ctrl+V lo copiado en Excel.' : 'Tu etiqueta no lleva datos que cambien, así que todas salen iguales.';
  t.innerHTML = `<h1>${a}</h1><p>${b}</p>` + (st.pantalla === 'etq' && st.paso === 0 ? `<div class="pestanas"><button data-vista="galeria" class="${st.vistaHoja === 'mano' ? '' : 'activa'}">Elegir una plantilla</button><button data-vista="mano" class="${st.vistaHoja === 'mano' ? 'activa' : ''}">Colocar las etiquetas a mano</button></div>` : '');
}
function pintarCentro() {
  const p = st.pantalla, n = st.paso;
  const conPapel = (p === 'etq' && (n === 1 || n === 3 || (n === 0 && st.vistaHoja === 'mano'))) || p === 'imp';
  $('#zoom').classList.toggle('oculto', !conPapel);
  if (p === 'inicio') pintarInicio();
  else if (p === 'etq') [pintarPasoHoja, pintarDiseno, pintarDatos, pintarHoja][n]();
  else [pintarImpHoja, pintarImpRellenar, pintarImpRevisar][n]();
  pintarEstado();
}
function pintarEstado() {
  const s = $('#estado');
  if (st.pantalla === 'etq') {
    const e = st.etq, total = etiquetasAImprimir(e).length, pags = paginar(e).length;
    s.textContent = `${total} etiqueta${total === 1 ? '' : 's'} · ${pags} hoja${pags === 1 ? '' : 's'}`;
  } else if (st.pantalla === 'imp') {
    const k = st.imp.campos.filter((c) => c.texto.trim()).length;
    s.textContent = `${k} texto${k === 1 ? '' : 's'} escrito${k === 1 ? '' : 's'}`;
  } else s.textContent = '';
}
function libre(html) { const l = $('#lienzo'); l.className = 'libre'; l.innerHTML = html; return l; }
const campoNum = (etq, attr, v, paso = 0.1) => `<label class="c"><span>${etq}</span><input type="number" step="${paso}" ${attr} value="${v}"></label>`;
const ajusteHTML = (o) => `<details><summary>¿Sale desplazado al imprimir?</summary>
  <div class="fila">${campoNum('Mover a la derecha (mm)', 'data-k="ajusteX"', o.ajusteX)}${campoNum('Mover hacia abajo (mm)', 'data-k="ajusteY"', o.ajusteY)}</div>
  <p class="nota">Con números negativos se mueve al lado contrario.</p></details>`;

/* ---------- Inicio ---------- */
function pintarInicio() {
  libre(`<div class="inicio">
    <h1>¿Qué quieres hacer?</h1><p>Elige una opción y Escaneator te lleva paso a paso.</p>
    <div class="tarjetas">
      <button class="tarjeta" data-ir="etq">
        <svg viewBox="0 0 300 150"><rect x="95" y="8" width="110" height="134" rx="6" fill="#f4f1ea"/>
          ${[0, 1, 2, 3].map((f) => [0, 1].map((c) => `<rect x="${103 + c * 49}" y="${16 + f * 31}" width="45" height="27" rx="3" fill="#fff" stroke="#ff8a3d" stroke-width="1.5"/><rect x="${108 + c * 49}" y="${23 + f * 31}" width="26" height="3.5" rx="1.5" fill="#39414d"/><rect x="${108 + c * 49}" y="${31 + f * 31}" width="34" height="2.5" rx="1" fill="#aab2bd"/>`).join('')).join('')}</svg>
        <strong>Imprimir etiquetas</strong><span>En folios de etiquetas adhesivas o en impresora de rollo. Todas iguales o con datos distintos en cada una.</span>
      </button>
      <button class="tarjeta" data-ir="imp">
        <svg viewBox="0 0 300 150"><rect x="95" y="8" width="110" height="134" rx="6" fill="#f4f1ea"/>
          <rect x="105" y="18" width="60" height="6" rx="2" fill="#aab2bd"/>${[0, 1, 2, 3].map((i) => `<rect x="105" y="${46 + i * 22}" width="30" height="3" rx="1" fill="#aab2bd"/><path d="M140 ${50 + i * 22}h55" stroke="#aab2bd" stroke-width="1.2"/>`).join('')}
          <text x="142" y="47" font-size="10" fill="#1d5fd1" font-family="Segoe UI, Arial">Rubén</text><text x="142" y="69" font-size="10" fill="#1d5fd1" font-family="Segoe UI, Arial">Madrid</text>
          <rect x="80" y="100" width="140" height="6" rx="3" fill="#ff8a3d"/></svg>
        <strong>Rellenar un impreso o folleto</strong><span>Escaneas la hoja, escribes encima en la pantalla y se imprime solo lo escrito, justo en su sitio.</span>
      </button>
    </div>
    <div class="guardados" id="guardados"></div></div>`);
  listarGuardados();
}
async function listarGuardados() {
  try { st.guardados = await almacen.listar(); } catch (e) { st.guardados = []; }
  const g = $('#guardados'); if (!g || !st.guardados.length) return;
  g.innerHTML = `<h2>Trabajos guardados</h2><div class="lista">${st.guardados.map((n) => `<div class="item"><span class="nom">${esc(n)}</span><button class="mini principal" data-abrir="${esc(n)}">Abrir</button><button class="mini peligro" data-borrar="${esc(n)}">Borrar</button></div>`).join('')}</div>`;
}

/* ---------- Etiquetas · paso 1: hoja ---------- */
const igualHoja = (h, p) => geoHoja(h) === geoHoja(p);
function pintarGaleria() {
  const h = st.etq.hoja; let grupo = '';
  libre(`<div class="galeria">${PLANTILLAS.map((p, i) => `${p.g !== grupo ? `<h4>${grupo = p.g}</h4>` : ''}<button class="hojaT ${igualHoja(h, p.h) ? 'activa' : ''}" data-plantilla="${i}">${svgHoja(p.h)}<b>${p.n}</b><span>${p.d}</span></button>`).join('')}</div>`);
}
function pintarPasoHoja() { if (st.vistaHoja === 'mano') pintarHojaMano(); else pintarGaleria(); }
function dibujarCeldas(papel) {
  papel.querySelectorAll('.celda').forEach((x) => x.remove());
  const h = st.etq.hoja, za = zonaAct();
  let ult = null;
  posiciones(h).forEach((p) => {
    const d = document.createElement('div'), k = h.zonas.indexOf(p.z), col = ZC[k % ZC.length];
    d.className = 'celda' + (p.z === za ? ' sel' : '');
    d.style.cssText = `left:${p.x}mm;top:${p.y}mm;width:${p.z.w}mm;height:${p.z.h}mm;border-color:${col};background:${col}38`;
    d.dataset.z = p.z.id;
    if (p.z !== ult) { ult = p.z; d.innerHTML = `<span style="background:${col}">${k + 1}</span>` + (p.z === za ? '<i class="tirador"></i>' : ''); }
    papel.append(d);
  });
}
/* La hoja en grande: cada tamaño de etiqueta se arrastra a su sitio y se le da medida tirando de la esquina. */
function pintarHojaMano() {
  const h = st.etq.hoja, { papel } = crearPapel(h.ancho, h.alto, 3);
  papel.classList.add('plano');
  if (h.calco) papel.append(elFondo(h.calco, 0.8));
  dibujarCeldas(papel);
  papel.onpointerdown = (ev) => {
    const d = ev.target.closest('.celda'); if (!d || ev.button !== 0) return;
    ev.preventDefault();
    const z = h.zonas.find((x) => x.id === d.dataset.z); if (!z) return;
    const redim = ev.target.classList.contains('tirador');
    if (st.zona !== z.id) { st.zona = z.id; dibujarCeldas(papel); pintarDer(); }
    const x0 = ev.clientX, y0 = ev.clientY, o = { x: z.x, y: z.y, w: z.w, h: z.h }, k = MM * st.z;
    let movido = false;
    const mover = (e2) => {
      if (!movido && Math.abs(e2.clientX - x0) + Math.abs(e2.clientY - y0) < 4) return;
      movido = true;
      const dx = (e2.clientX - x0) / k, dy = (e2.clientY - y0) / k;
      if (redim) { z.w = Math.max(5, r5(o.w + dx)); z.h = Math.max(4, r5(o.h + dy)); }
      else { z.x = Math.max(0, r5(o.x + dx)); z.y = Math.max(0, r5(o.y + dy)); }
      dibujarCeldas(papel);
    };
    const fin = () => {
      window.removeEventListener('pointermove', mover);
      if (!movido) return;
      if (redim) z.campos = adaptarCampos(z.campos, o, z);
      st.etq.usadas = []; pintarDer(); guardarSesion();
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', fin, { once: true });
  };
}
function derHoja() {
  const h = st.etq.hoja, za = zonaAct(), varias = h.zonas.length > 1, c = h.calco;
  const z4 = (z, k, v, paso) => `data-z="${z.id}" data-zk="${k}"` + (paso ? ' min="1"' : '');
  return `${st.vistaHoja === 'mano' ? '' : `<div class="vistaHoja" id="vistaHoja">${svgHoja(h)}</div>`}
    <h3>Hoja (mm)</h3>
    <div class="fila">${campoNum('Ancho', 'data-ha="ancho"', h.ancho)}${campoNum('Alto', 'data-ha="alto"', h.alto)}</div>
    <h3>Etiquetas (mm)</h3>
    ${h.zonas.map((z, k) => `<div class="grupo ${z === za && varias ? 'sel' : ''}" style="border-left-color:${ZC[k % ZC.length]}" data-grupo="${z.id}">
      ${varias ? `<div class="cabGrupo"><b>Tamaño ${k + 1}</b><span>${z.cols * z.filas} etiqueta${z.cols * z.filas === 1 ? '' : 's'}</span><button class="mini peligro" data-quitar-zona="${z.id}">Quitar</button></div>` : ''}
      <div class="fila">${campoNum('Columnas', z4(z, 'cols', 0, 1), z.cols, 1)}${campoNum('Filas', z4(z, 'filas', 0, 1), z.filas, 1)}</div>
      <div class="fila">${campoNum('Ancho', z4(z, 'w'), z.w)}${campoNum('Alto', z4(z, 'h'), z.h)}</div>
      <div class="fila">${campoNum('Desde la izquierda', z4(z, 'x'), z.x)}${campoNum('Desde arriba', z4(z, 'y'), z.y)}</div>
      <div class="fila">${campoNum('Hueco entre columnas', z4(z, 'sepH'), z.sepH)}${campoNum('Hueco entre filas', z4(z, 'sepV'), z.sepV)}</div></div>`).join('')}
    <div class="botones"><button id="addZona">+ Añadir otro tamaño de etiqueta</button></div>
    <div id="alertaHoja"></div>
    <h3>Calcar tu hoja</h3>
    <p class="nota">Pon debajo una foto o un escaneo de tu hoja de etiquetas y coloca los tamaños encima.</p>
    <div class="botones">${esTauri ? '<button id="btnEscanearCalco">Escanear la hoja</button>' : ''}<button id="btnCalco">Abrir una foto…</button>${c ? '<button id="quitarCalco" class="peligro">Quitar</button>' : ''}</div>
    ${c ? `<div class="fila tres">${campoNum('Izquierda', 'data-cal="x"', c.x)}${campoNum('Arriba', 'data-cal="y"', c.y)}${campoNum('Ancho', 'data-cal="w"', c.w)}</div><p class="nota">Mueve o estira la foto (en mm) hasta que coincida con la hoja.</p>` : ''}
    <div class="botones" style="margin-top:14px"><button id="deCero" class="mini">Empezar unas etiquetas de cero</button></div>`;
}
function alertaHoja() {
  const h = st.etq.hoja, a = $('#alertaHoja'); if (!a) return;
  const fuera = posiciones(h).some((p) => p.x + p.z.w > h.ancho + 0.05 || p.y + p.z.h > h.alto + 0.05);
  a.innerHTML = fuera ? '<p class="alerta">Hay etiquetas que se salen de la hoja. Revisa las medidas.</p>' : '';
}

/* ---------- Etiquetas · paso 2: diseño ---------- */
function pintarDiseno() { const z = zonaAct(); montarEditor(z.w, z.h, z, { fichas: st.etq, tam: Math.max(6, Math.min(11, Math.round(z.h / 4))), anchoNuevo: 80 }); }
const EJEMPLOS = [
  { n: 'Dirección', cols: ['Nombre', 'Dirección', 'Ciudad'], m: [['Ana García', 'Calle Mayor 12, 3.º B', '28013 Madrid'], ['Luis Pérez', 'Avenida del Puerto 5', '11006 Cádiz'], ['Marta Ruiz', 'Plaza Nueva 3', '24001 León']],
    c: [{ t: '{Nombre}', x: 0.06, y: 0.1, w: 0.88, s: 0.2, b: 1, l: 18 }, { t: '{Dirección}', x: 0.06, y: 0.42, w: 0.88, s: 0.15, l: 24 }, { t: '{Ciudad}', x: 0.06, y: 0.66, w: 0.88, s: 0.15, l: 18 }] },
  { n: 'Precio', cols: ['Producto', 'Precio'], m: [['Aceite de oliva 1 L', '8,95'], ['Miel de romero', '6,50'], ['Queso curado', '12,40']],
    c: [{ t: '{Producto}', x: 0.05, y: 0.08, w: 0.9, s: 0.17, a: 'center', l: 20 }, { t: '{Precio} €', x: 0.05, y: 0.38, w: 0.9, s: 0.42, b: 1, a: 'center', l: 7 }] },
  { n: 'Nombre grande', cols: ['Nombre'], m: [['Lucía'], ['Marta'], ['Daniel']],
    c: [{ t: '{Nombre}', x: 0.05, y: 0.28, w: 0.9, s: 0.36, b: 1, a: 'center', l: 9 }] },
  { n: 'Producto y fecha', cols: ['Producto', 'Fecha'], m: [['Tomate frito', '12/11/2026'], ['Lentejas', '03/10/2026'], ['Caldo de pollo', '28/10/2026']],
    c: [{ t: '{Producto}', x: 0.06, y: 0.14, w: 0.88, s: 0.24, b: 1, l: 16 }, { t: 'Fecha: {Fecha}', x: 0.06, y: 0.58, w: 0.88, s: 0.17, l: 18 }] },
  { n: 'Archivador', cols: ['Título', 'Año'], m: [['Facturas', '2026'], ['Nóminas', '2026'], ['Seguros', '2025']],
    c: [{ t: '{Título}', x: 0.05, y: 0.16, w: 0.9, s: 0.28, b: 1, a: 'center', l: 11 }, { t: '{Año}', x: 0.05, y: 0.58, w: 0.9, s: 0.22, a: 'center', l: 5 }] },
  { n: 'Remitente', cols: [], m: [],
    c: [{ t: 'Remite:', x: 0.06, y: 0.08, w: 0.88, s: 0.12, l: 8 }, { t: 'Tu nombre\nTu dirección\nCódigo postal y ciudad', x: 0.06, y: 0.26, w: 0.88, s: 0.17, l: 24 }] },
];
/* Convierte un ejemplo (en proporciones) en textos a la medida de la etiqueta z. */
function camposEjemplo(ej, z) {
  return ej.c.map((f) => {
    const lineas = f.t.split('\n').length;
    const porAlto = f.s * z.h / 0.3528 / 1.15, porAncho = (f.w * z.w) / (f.l * 0.195); // que quepa a lo alto y, más o menos, a lo ancho
    const tam = Math.max(5, Math.min(72, Math.round(Math.min(porAlto, porAncho))));
    return { id: uid(), tipo: 'texto', texto: f.t, x: r5(f.x * z.w), y: r5(f.y * z.h), w: r5(f.w * z.w), h: altoLinea(tam) * lineas, tam, negrita: !!f.b, alin: f.a || 'left', fuente: 'Arial' };
  });
}
async function aplicarEjemplo(i) {
  const ej = EJEMPLOS[i], e = st.etq, z = zonaAct();
  finEdicion(); st.sel = null;
  if (z.campos.length && !(await confirmar(`¿Cambiar el diseño de esta etiqueta por el ejemplo «${ej.n}»?`, 'Cambiar'))) return;
  z.campos = camposEjemplo(ej, z);
  ej.cols.forEach((n) => { if (indiceCol(e, n) < 0) { e.columnas.push(n); e.filas.forEach((f) => f.v.push('')); } });
  // Las columnas que ya no usa ningún diseño y están vacías se quitan, para no liar la tabla.
  const usada = (n) => todosCampos(e).some((c) => c.texto && c.texto.toLowerCase().includes(`{${n.toLowerCase()}}`));
  for (let k = e.columnas.length - 1; k >= 0 && e.columnas.length > 1; k--) {
    if (!usada(e.columnas[k]) && e.filas.every((f) => !String(f.v[k] ?? '').trim())) { e.columnas.splice(k, 1); e.filas.forEach((f) => f.v.splice(k, 1)); }
  }
  const sinDatos = e.filas.every((f) => f.v.every((v) => !String(v ?? '').trim()));
  if (ej.m.length && sinDatos) e.filas = ej.m.map((r) => ({ sel: true, copias: 1, v: e.columnas.map((c) => { const k = ej.cols.findIndex((x) => x.toLowerCase() === c.toLowerCase()); return k < 0 ? '' : r[k]; }) }));
  pintar(); guardarSesion();
  aviso(ej.m.length && sinDatos ? 'Ejemplo puesto, con datos de muestra. Los cambias por los tuyos en el paso Datos.' : 'Ejemplo puesto. Muévelo y cámbialo a tu gusto.', false, 5000);
}
function pintarEjemplos() {
  const z = zonaAct();
  document.querySelectorAll('#der .ej').forEach((b) => {
    const ej = EJEMPLOS[+b.dataset.ejemplo], caja = $('.mini', b);
    caja.innerHTML = '';
    const { papel } = papelEn(caja, z.w, z.h, Math.min(124 / (z.w * MM), 72 / (z.h * MM)));
    camposEjemplo(ej, z).forEach((c) => papel.append(elCampo(c, { columnas: ej.cols }, ej.m[0] || [])));
  });
}
function derDiseno() {
  const e = st.etq, zs = e.hoja.zonas, za = zonaAct();
  return (zs.length > 1 ? `<h3>¿Qué tamaño estás diseñando?</h3>
    <div class="chipsHoja">${zs.map((z, k) => `<button data-zona="${z.id}" class="${z === za ? 'activa' : ''}" style="border-left:5px solid ${ZC[k % ZC.length]}">${k + 1} · ${fmt(z.w)} × ${fmt(z.h)} mm</button>`).join('')}</div>
    <div class="botones"><button id="copiarDiseno" class="mini">Copiar este diseño a los demás tamaños</button></div>` : '') + `
    <h3>Ejemplos para empezar</h3>
    <div class="ejemplos">${EJEMPLOS.map((x, i) => `<button class="ej" data-ejemplo="${i}"><div class="mini"></div><span>${x.n}</span></button>`).join('')}</div>
    <h3>Datos que cambian en cada etiqueta</h3>
    <div class="fichas">${e.columnas.map((n, i) => `<button class="fichaBtn" draggable="true" data-ficha="${esc(n)}" style="background:${colorCol(i)}">${esc(n)}</button>`).join('')}</div>
    <div class="botones"><button id="nuevoDato" class="mini">+ Otro dato</button></div>
    <div class="pista"><b>1</b><span><strong>Arrastra una ficha</strong> a la etiqueta (o haz clic en ella). En cada etiqueta se cambiará por su dato.</span></div>
    <div class="pista"><b>2</b><span><strong>Haz clic en un hueco</strong> de la etiqueta y escribe lo que deba salir igual en todas.</span></div>
    <div class="pista"><b>3</b><span><strong>Arrastra</strong> para colocar. Con la barrita que aparece cambias el tamaño de la letra.</span></div>
    <h3>Imagen</h3>
    <div class="botones"><button id="addImagen">+ Imagen o logo</button></div>`;
}

/* ---------- Etiquetas · paso 3: datos ---------- */
const filaVacia = () => ({ sel: true, copias: 1, v: st.etq.columnas.map(() => '') });
function pintarDatos() {
  const e = st.etq;
  if (!usaDatos(e)) {
    const libres = libresHoja(e);
    libre(`<div class="cuantas"><h2>¿Cuántas etiquetas quieres?</h2><input type="number" min="1" id="cantidad" value="${e.cantidad}"><div class="botones" style="justify-content:center">
      <button data-cant="${libres}">Una hoja entera (${libres})</button><button data-cant="${libres * 2}">Dos hojas (${libres * 2})</button></div>
      <p class="nota">Si quieres un nombre o un dato distinto en cada etiqueta, vuelve a Diseño y arrastra una ficha de datos.</p></div>`);
    return;
  }
  if (st.filaPrev >= e.filas.length) st.filaPrev = 0;
  const todas = e.filas.every((f) => f.sel);
  libre(`<div class="barraDatos"><button id="dFila">+ Fila</button><button id="dImportar">Traer de Excel o CSV…</button><button id="dVaciar" class="peligro">Vaciar</button></div>
    <table class="datos"><thead><tr>
      <th class="n"><input type="checkbox" id="dTodas" ${todas ? 'checked' : ''} title="Marcar o desmarcar todas"></th><th class="cop">Copias</th>
      ${e.columnas.map((c, i) => `<th class="col" style="background:${colorCol(i)}">${esc(c)}</th>`).join('')}<th class="x"></th></tr></thead>
    <tbody>${e.filas.map((f, r) => `<tr class="${r === st.filaPrev ? 'actual' : ''}">
      <td class="n"><input type="checkbox" data-sel="${r}" ${f.sel ? 'checked' : ''} title="Imprimir esta"></td>
      <td class="cop"><input type="number" min="1" data-cop="${r}" value="${f.copias}"></td>
      ${e.columnas.map((_, i) => `<td><input type="text" data-r="${r}" data-c="${i}" value="${esc(f.v[i] ?? '')}"></td>`).join('')}
      <td class="x"><button data-qf="${r}" title="Quitar fila">×</button></td></tr>`).join('')}</tbody></table>`);
}
function derDatos() {
  const e = st.etq;
  return `<h3>Así queda</h3><div class="mini-previa" id="previa"></div>` + (usaDatos(e)
    ? `<p class="nota">Se muestra la fila en la que estás escribiendo.</p>
      <div class="pista"><b>✓</b><span>Marca la casilla de las que quieras imprimir y pon cuántas copias de cada una.</span></div>
      <h3>Columnas</h3><div class="fichas">${e.columnas.map((n, i) => `<button class="fichaBtn" data-renombrar="${i}" style="background:${colorCol(i)}" title="Cambiar el nombre">${esc(n)} ✎</button>`).join('')}</div>
      <p class="nota">Al importar un Excel, su primera fila da nombre a las columnas.</p>` : '');
}
function pintarPrevia() {
  const p = $('#previa'); if (!p) return;
  const e = st.etq, f = usaDatos(e) ? (e.filas[st.filaPrev] || e.filas[0]) : null;
  const za = zonaAct(), z = za.activo !== false ? za : (e.hoja.zonas.find((x) => x.activo !== false) || za);
  p.innerHTML = '';
  const { papel } = papelEn(p, z.w, z.h, Math.min(286 / (z.w * MM), 260 / (z.h * MM)));
  z.campos.forEach((c) => papel.append(elCampo(c, e, f ? f.v : [])));
}
function analizarCSV(txt) {
  const primera = txt.split(/\r?\n/, 1)[0];
  const sep = [';', '\t', ','].map((s) => [s, primera.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const filas = []; let fila = [], campo = '', comillas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (comillas) { if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else comillas = false; } else campo += ch; }
    else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}
function cargarTabla(m) {
  m = m.map((f) => f.map((v) => (v == null ? '' : String(v).trim()))).filter((f) => f.some((v) => v !== ''));
  if (m.length < 1) { aviso('El archivo no tiene datos.', true); return; }
  const e = st.etq, ancho = Math.max(...m.map((f) => f.length));
  const viejas = e.columnas.slice();
  e.columnas = Array.from({ length: ancho }, (_, i) => m[0][i] || `Columna ${i + 1}`);
  e.filas = m.slice(1).map((f) => ({ sel: true, copias: 1, v: Array.from({ length: ancho }, (_, i) => f[i] ?? '') }));
  if (!e.filas.length) e.filas = [filaVacia()];
  st.pag = 0; st.filaPrev = 0;
  // Las fichas de columnas que ya no existen se quitan del diseño para que no salgan impresas como {texto}.
  const perdidas = viejas.filter((v) => indiceCol(e, v) < 0 && todosCampos(e).some((c) => c.texto && c.texto.includes(`{${v}}`)));
  perdidas.forEach((v) => todosCampos(e).forEach((c) => { if (c.texto) c.texto = c.texto.split(`{${v}}`).join('').trim(); }));
  e.hoja.zonas.forEach((z) => { z.campos = z.campos.filter((c) => c.tipo !== 'texto' || c.texto !== ''); });
  pintar(); guardarSesion();
  aviso(`${m.length - 1} fila(s) traídas.` + (perdidas.length || !usaDatos(e) ? ' Las columnas han cambiado: vuelve a Diseño y coloca las fichas nuevas.' : ''), false, 7000);
  if (!usaDatos(e)) { st.paso = 1; pintar(); }
}

/* ---------- Etiquetas · paso 4: hoja ---------- */
function pintarHoja() {
  const e = st.etq, pags = paginar(e);
  if (st.pag >= pags.length) st.pag = Math.max(0, pags.length - 1);
  const { papel } = crearPapel(e.hoja.ancho, e.hoja.alto, 2.2);
  papel.classList.add('guia');
  papel.append(contenidoHoja(e, pags[st.pag] || null, true));
  if (st.pag === 0) papel.querySelectorAll('.etq').forEach((d) => { if (e.usadas[+d.dataset.i]) d.classList.add('usada'); });
  papel.onclick = (ev) => {
    const d = ev.target.closest('.etq'); if (!d) return;
    if (d.classList.contains('apagada')) { aviso('Ese tamaño está desmarcado a la derecha, así que no se imprime.'); return; }
    if (st.pag !== 0) { aviso('Las etiquetas ya usadas se marcan en la primera hoja.'); return; }
    const i = +d.dataset.i; e.usadas[i] = !e.usadas[i];
    pintarCentro(); pintarDer(); guardarSesion();
  };
}
function derImprimirEtq() {
  const e = st.etq, pags = paginar(e), total = etiquetasAImprimir(e).length, usadas = e.usadas.filter(Boolean).length;
  return `<h3>Resumen</h3><p style="font-size:17px;margin:4px 0"><b>${total}</b> etiqueta${total === 1 ? '' : 's'} en <b>${pags.length}</b> hoja${pags.length === 1 ? '' : 's'}</p>
    ${pags.length > 1 ? `<div class="botones" style="align-items:center"><button class="mini" id="pagAnt">◀</button><span>Hoja ${st.pag + 1} de ${pags.length}</span><button class="mini" id="pagSig">▶</button></div>` : ''}
    <div class="pista"><b>☝</b><span><strong>¿Hoja empezada?</strong> Haz clic en las etiquetas que ya no están y se saltarán.${usadas ? ` Ahora hay ${usadas} marcada${usadas === 1 ? '' : 's'}.` : ''}</span></div>
    ${usadas ? '<div class="botones"><button class="mini" id="limpiarUsadas">Quitar todas las marcas</button></div>' : ''}
    ${e.hoja.zonas.length > 1 ? `<h3>Tamaños que se imprimen</h3>${e.hoja.zonas.map((z, k) => `<label class="marca2"><input type="checkbox" data-activa="${z.id}" ${z.activo !== false ? 'checked' : ''}><span style="border-left:5px solid ${ZC[k % ZC.length]};padding-left:8px">Tamaño ${k + 1} · ${fmt(z.w)} × ${fmt(z.h)} mm (${z.cols * z.filas})</span></label>`).join('')}` : ''}
    <label class="marca2"><input type="checkbox" data-k="borde" ${e.borde ? 'checked' : ''}><span>Dibujar el borde de cada etiqueta (para probar antes en un folio normal)</span></label>
    ${ajusteHTML(e)}
    <button class="principal enorme" id="imprimir">Imprimir</button>
    <p class="nota">En la ventana de impresión deja los márgenes en «Ninguno» y la escala al 100 %.</p>`;
}

/* ---------- Impresos ---------- */
function papelImpreso(opFondo, marco) {
  const i = st.imp, { papel, escd } = crearPapel(i.hoja.ancho, i.hoja.alto, 3);
  if (marco) papel.classList.add('marco');
  if (i.fondo && opFondo > 0) papel.append(elFondo(i.fondo, opFondo));
  return { papel, escd };
}
function pintarImpHoja() {
  const i = st.imp, { escd } = papelImpreso(1, true);
  if (!i.fondo) {
    const s = document.createElement('div'); s.className = 'sobre';
    s.innerHTML = `<div>${esTauri ? '<button class="principal enorme" id="btnEscanear">Escanear la hoja</button>' : ''}
      <button class="${esTauri ? '' : 'principal '}enorme" id="btnFondo">Abrir una foto o un PDF</button>
      <p>${esTauri ? 'Pon la hoja boca abajo en el cristal del escáner.' : 'El escáner funciona en el programa instalado; aquí puedes abrir una imagen ya escaneada.'}</p></div>`;
    escd.append(s);
  }
}
function derImpHoja() {
  const i = st.imp, f = i.fondo;
  return `<h3>Tamaño de la hoja</h3>
    <div class="chipsHoja">${HOJAS.map((h, k) => `<button data-hoja="${k}" class="${h.ancho === i.hoja.ancho && h.alto === i.hoja.alto ? 'activa' : ''}">${h.n}</button>`).join('')}</div>
    <div class="fila">${campoNum('Ancho (mm)', 'data-ih="ancho"', i.hoja.ancho)}${campoNum('Alto (mm)', 'data-ih="alto"', i.hoja.alto)}</div>
    ${esTauri ? `<h3>Escáner</h3><div class="fila"><label class="c"><span>Aparato</span><select id="selEscaner"><option value="">Buscando…</option></select></label>
      <label class="c"><span>Calidad</span><select id="selPpp"><option value="150">Normal</option><option value="200" selected>Buena</option><option value="300">Alta</option></select></label></div>` : ''}
    ${f ? `<h3>Imagen de la hoja</h3><div class="botones">${esTauri ? '<button id="btnEscanear">Escanear otra vez</button>' : ''}<button id="btnFondo">Abrir otra</button><button id="btnGirar">Girar</button><button id="btnQuitarFondo" class="peligro">Quitar</button></div>
      <details><summary>¿La imagen no coincide con la hoja?</summary>
      <div class="fila tres">${campoNum('Izquierda', 'data-f="x"', f.x)}${campoNum('Arriba', 'data-f="y"', f.y)}${campoNum('Ancho', 'data-f="w"', f.w)}</div>
      <div class="botones"><button id="btnAjustarFondo" class="mini">Encajar la imagen en la hoja</button></div>
      <p class="nota">Medidas en milímetros. Lo normal es no tocar nada si la has escaneado desde aquí.</p></details>` : ''}
    <div class="botones" style="margin-top:18px"><button id="deCero" class="mini">Empezar un impreso de cero</button></div>`;
}
function pintarImpRellenar() { const i = st.imp; montarEditor(i.hoja.ancho, i.hoja.alto, i, { fondo: i.fondo, opFondo: i.opFondo, tam: 11, anchoNuevo: 80, tope: 1.5, soloAncho: true }); }
function derImpRellenar() {
  const i = st.imp;
  return `<div class="pista"><b>1</b><span><strong>Haz clic</strong> en el sitio de la hoja donde quieras escribir y teclea.</span></div>
    <div class="pista"><b>2</b><span><strong>Arrastra</strong> un texto para afinar su sitio. Con las flechas del teclado se mueve medio milímetro.</span></div>
    <div class="pista"><b>3</b><span>Con la <strong>barrita</strong> que aparece cambias el tamaño de la letra o lo borras.</span></div>
    ${i.fondo ? `<h3>Imagen de fondo</h3><label class="c"><span>Más clara ↔ más marcada</span><input type="range" min="0.15" max="1" step="0.05" data-k="opFondo" value="${i.opFondo}"></label>` : '<p class="alerta">No hay imagen de la hoja: escribes sobre un folio en blanco. Puedes volver al paso 1 para ponerla.</p>'}
    <p class="nota">Con los botones − y + de abajo acercas o alejas la hoja.</p>`;
}
function pintarImpRevisar() {
  const i = st.imp, { papel } = papelImpreso(i.conFondo ? 1 : 0.28, true);
  i.campos.filter((c) => c.texto.trim()).forEach((c) => papel.append(elCampo(c, null, null)));
}
function derImpRevisar() {
  const i = st.imp;
  return `<div class="pista"><b>☝</b><span>La hoja se ve atenuada porque <strong>no se imprime</strong>: solo sale el texto, encima del impreso original que pongas en la impresora.</span></div>
    <label class="marca2"><input type="checkbox" data-k="conFondo" ${i.conFondo ? 'checked' : ''}><span>Imprimir también la imagen de la hoja (para hacer una prueba en un folio en blanco)</span></label>
    ${ajusteHTML(i)}
    <button class="principal enorme" id="imprimir">Imprimir</button>
    <p class="nota">En la ventana de impresión deja los márgenes en «Ninguno» y la escala al 100 %.</p>
    <p class="nota">Consejo: imprime primero en un folio normal y míralo al trasluz sobre el impreso.</p>`;
}

/* ---------- Panel derecho ---------- */
function pintarDer() {
  const d = $('#der'), p = st.pantalla, n = st.paso;
  if (p === 'inicio') { d.innerHTML = ''; return; }
  d.innerHTML = p === 'etq' ? [derHoja, derDiseno, derDatos, derImprimirEtq][n]() : [derImpHoja, derImpRellenar, derImpRevisar][n]();
  if (p === 'etq' && n === 0) alertaHoja();
  if (p === 'etq' && n === 1) pintarEjemplos();
  if (p === 'etq' && n === 2) pintarPrevia();
  if (p === 'imp' && n === 0 && esTauri) cargarEscaneres();
}
$('#der').addEventListener('input', (ev) => {
  const t = ev.target, d = t.dataset;
  if (d.ha || d.zk) {
    const h = st.etq.hoja;
    let v = num(t.value, 0);
    if (d.ha) { if (v < 10) return; h[d.ha] = v; }
    else {
      const z = h.zonas.find((x) => x.id === d.z); if (!z) return;
      if (d.zk === 'cols' || d.zk === 'filas') v = Math.max(1, Math.min(60, Math.round(v))); else v = Math.max(0, v);
      if ((d.zk === 'w' || d.zk === 'h') && v < 2) return;
      z[d.zk] = v;
    }
    st.etq.usadas = [];
    const vista = $('#vistaHoja'); if (vista) vista.innerHTML = svgHoja(h);
    alertaHoja();
  } else if (d.cal) {
    const c = st.etq.hoja.calco; if (!c) return;
    const v = num(t.value, 0);
    if (d.cal === 'w') { if (v < 5) return; c.h = c.h * (v / c.w); c.w = v; } else c[d.cal] = v;
  } else if (d.activa) {
    const z = st.etq.hoja.zonas.find((x) => x.id === d.activa); if (z) z.activo = t.checked;
    st.pag = 0; pintar(); guardarSesion(); return;
  } else if (d.ih) { const v = num(t.value, 0); if (v < 10) return; st.imp.hoja[d.ih] = v; }
  else if (d.f) {
    const f = st.imp.fondo; if (!f) return;
    const v = num(t.value, 0);
    if (d.f === 'w') { if (v < 5) return; f.h = f.h * (v / f.w); f.w = v; } else f[d.f] = v;
  } else if (d.k) { actual()[d.k] = t.type === 'checkbox' ? t.checked : num(t.value, 0); }
  else return;
  pintarCentro(); guardarSesion();
});
$('#der').addEventListener('click', async (ev) => {
  const t = ev.target.closest('button'); if (!t) return;
  const id = t.id, d = t.dataset;
  if (d.ficha) insertarFicha(d.ficha);
  else if (d.renombrar !== undefined) {
    const e = st.etq, i = +d.renombrar, viejo = e.columnas[i];
    const nuevo = await pedirTexto('Nombre de la columna', viejo);
    if (!nuevo || nuevo === viejo) return;
    if (indiceCol(e, nuevo) >= 0) { aviso('Ya hay una columna con ese nombre.', true); return; }
    e.columnas[i] = nuevo.replace(/[{}]/g, '');
    todosCampos(e).forEach((c) => { if (c.texto) c.texto = c.texto.split(`{${viejo}}`).join(`{${e.columnas[i]}}`); });
    pintar(); guardarSesion();
  } else if (id === 'nuevoDato') {
    const e = st.etq, n = await pedirTexto('¿Cómo se llama el dato? (por ejemplo: Teléfono)');
    if (!n) return;
    const nombre = n.replace(/[{}]/g, '');
    if (indiceCol(e, nombre) >= 0) { aviso('Ese dato ya existe.', true); return; }
    e.columnas.push(nombre); e.filas.forEach((f) => f.v.push(''));
    pintarDer(); guardarSesion();
  } else if (id === 'addImagen') $('#ficheroImagen').click();
  else if (d.zona) { finEdicion(); st.sel = null; st.zona = d.zona; pintar(); }
  else if (d.quitarZona) {
    const h = st.etq.hoja; if (h.zonas.length < 2) return;
    h.zonas = h.zonas.filter((z) => z.id !== d.quitarZona); st.zona = null; st.etq.usadas = []; pintar(); guardarSesion();
  } else if (id === 'addZona') {
    const h = st.etq.hoja, b = zonaAct(), abajo = Math.max(0, ...posiciones(h).map((p) => p.y + p.z.h));
    const g = zn(5, abajo + 23 <= h.alto ? r5(abajo + 3) : 5, 1, 1, Math.min(40, h.ancho - 10), 20);
    const z = { id: uid(), activo: true, ...g, campos: adaptarCampos(b.campos, b, g) };
    h.zonas.push(z); st.zona = z.id; st.vistaHoja = 'mano'; st.etq.usadas = []; pintar(); guardarSesion();
    aviso(`Tamaño ${h.zonas.length} añadido. Arrástralo a su sitio y tira de la esquina para darle su medida.`, false, 7000);
  } else if (id === 'copiarDiseno') {
    const b = zonaAct(); finEdicion();
    st.etq.hoja.zonas.forEach((z) => { if (z !== b) z.campos = adaptarCampos(b.campos, b, z); });
    guardarSesion(); aviso('Diseño copiado a los demás tamaños, adaptado a cada medida.');
  } else if (d.ejemplo !== undefined) aplicarEjemplo(+d.ejemplo);
  else if (id === 'btnCalco') $('#ficheroCalco').click();
  else if (id === 'btnEscanearCalco') escanear('calco');
  else if (id === 'quitarCalco') { st.etq.hoja.calco = null; pintar(); guardarSesion(); }
  else if (d.hoja !== undefined) { const h = HOJAS[+d.hoja]; st.imp.hoja = { ancho: h.ancho, alto: h.alto }; if (st.imp.fondo && !st.imp.fondo.real) ajustarFondo(); pintar(); guardarSesion(); }
  else if (id === 'btnFondo') $('#ficheroFondo').click();
  else if (id === 'btnEscanear') escanear();
  else if (id === 'btnGirar') girarFondo();
  else if (id === 'btnAjustarFondo') { ajustarFondo(); pintar(); guardarSesion(); }
  else if (id === 'btnQuitarFondo') { if (await confirmar('¿Quitar la imagen de la hoja?', 'Quitar')) { st.imp.fondo = null; pintar(); guardarSesion(); } }
  else if (id === 'limpiarUsadas') { st.etq.usadas = []; pintar(); guardarSesion(); }
  else if (id === 'pagAnt') { if (st.pag > 0) st.pag--; pintar(); }
  else if (id === 'pagSig') { st.pag++; pintar(); }
  else if (id === 'imprimir') imprimir();
  else if (id === 'deCero') {
    const etq = st.pantalla === 'etq';
    if (!(await confirmar(`¿Empezar ${etq ? 'unas etiquetas' : 'un impreso'} de cero? Lo que no hayas guardado se pierde.`, 'Empezar')) ) return;
    if (etq) st.etq = nuevoEtq(); else st.imp = nuevoImp();
    st.sel = null; st.edit = false; st.pag = 0; pintar(); guardarSesion();
  }
});
$('#der').addEventListener('focusin', (ev) => { // al tocar las medidas de un tamaño, se resalta en la hoja
  const g = ev.target.closest && ev.target.closest('[data-grupo]');
  if (!g || st.zona === g.dataset.grupo || st.etq.hoja.zonas.length < 2) return;
  st.zona = g.dataset.grupo;
  document.querySelectorAll('#der .grupo').forEach((x) => x.classList.toggle('sel', x === g));
  const papel = $('#lienzo .papel.plano'); if (papel) dibujarCeldas(papel);
});
$('#titulo').addEventListener('click', (ev) => {
  const v = ev.target.dataset && ev.target.dataset.vista; if (!v || v === st.vistaHoja) return;
  st.vistaHoja = v; st.zf = 1; pintar();
});
$('#der').addEventListener('dragstart', (ev) => {
  const f = ev.target.dataset && ev.target.dataset.ficha; if (!f) return;
  ev.dataTransfer.setData('application/x-ficha', f); ev.dataTransfer.setData('text/plain', f); ev.dataTransfer.effectAllowed = 'copy';
});

/* ---------- Centro: eventos de las pantallas sin papel ---------- */
const lz = $('#lienzo');
lz.addEventListener('pointerdown', (ev) => { // clic fuera del papel: deja de escribir
  if (ev.target !== lz && !ev.target.classList.contains('papelEsc')) return;
  if (st.sel || st.edit) { finEdicion(); st.sel = null; pintarCentro(); }
});
lz.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button'); if (!t) return;
  const d = t.dataset, e = st.etq;
  if (d.ir) { st.pantalla = d.ir; st.paso = 0; st.sel = null; st.edit = false; st.zf = 1; pintar(); }
  else if (d.abrir) abrirTrabajo(d.abrir);
  else if (d.borrar) { if (await confirmar(`¿Borrar «${d.borrar}»? No se puede deshacer.`, 'Borrar')) { try { await almacen.borrar(d.borrar); } catch (x) { aviso('No se pudo borrar: ' + x, true); } pintarInicio(); } }
  else if (d.plantilla !== undefined) { e.hoja = hojaDe(PLANTILLAS[+d.plantilla].h, e.hoja); st.zona = null; e.usadas = []; st.pag = 0; pintar(); guardarSesion(); }
  else if (d.cant) { e.cantidad = +d.cant; pintar(); guardarSesion(); }
  else if (t.id === 'btnFondo') $('#ficheroFondo').click();
  else if (t.id === 'btnEscanear') escanear();
  else if (t.id === 'dFila') { e.filas.push(filaVacia()); st.filaPrev = e.filas.length - 1; pintarCentro(); pintarPrevia(); enfocarCelda(e.filas.length - 1, 0); guardarSesion(); }
  else if (t.id === 'dImportar') $('#ficheroDatos').click();
  else if (t.id === 'dVaciar') { if (await confirmar('¿Borrar todas las filas?', 'Borrar')) { e.filas = [filaVacia()]; st.filaPrev = 0; pintar(); guardarSesion(); } }
  else if (d.qf !== undefined) { e.filas.splice(+d.qf, 1); if (!e.filas.length) e.filas.push(filaVacia()); st.filaPrev = 0; pintar(); guardarSesion(); }
});
lz.addEventListener('input', (ev) => {
  if (st.pantalla !== 'etq' || st.paso !== 2) return;
  const d = ev.target.dataset, e = st.etq;
  if (ev.target.id === 'cantidad') e.cantidad = Math.max(1, Math.min(9999, Math.round(num(ev.target.value, 1))));
  else if (d.r !== undefined) e.filas[+d.r].v[+d.c] = ev.target.value;
  else if (d.cop !== undefined) e.filas[+d.cop].copias = Math.max(1, Math.round(num(ev.target.value, 1)));
  else return;
  pintarEstado(); pintarPrevia(); guardarSesion();
});
lz.addEventListener('change', (ev) => {
  if (st.pantalla !== 'etq' || st.paso !== 2) return;
  const t = ev.target, e = st.etq;
  if (t.dataset.sel !== undefined) e.filas[+t.dataset.sel].sel = t.checked;
  else if (t.id === 'dTodas') { e.filas.forEach((f) => (f.sel = t.checked)); pintarCentro(); }
  else return;
  pintarEstado(); guardarSesion();
});
lz.addEventListener('focusin', (ev) => {
  const r = ev.target.dataset && (ev.target.dataset.r ?? ev.target.dataset.cop ?? ev.target.dataset.sel);
  if (r === undefined || st.pantalla !== 'etq' || st.paso !== 2 || +r === st.filaPrev) return;
  st.filaPrev = +r;
  lz.querySelectorAll('tr.actual').forEach((x) => x.classList.remove('actual'));
  const tr = ev.target.closest('tr'); if (tr) tr.classList.add('actual');
  pintarPrevia();
});
lz.addEventListener('keydown', (ev) => {
  const d = ev.target.dataset;
  if (ev.key !== 'Enter' || d.r === undefined) return;
  const r = +d.r + 1;
  if (r >= st.etq.filas.length) { st.etq.filas.push(filaVacia()); pintarCentro(); guardarSesion(); }
  enfocarCelda(r, +d.c);
});
lz.addEventListener('paste', (ev) => {
  const d = ev.target.dataset;
  if (d.r === undefined) return;
  const txt = (ev.clipboardData || window.clipboardData).getData('text');
  if (!/[\t\n]/.test(txt.trim())) return; // pegado normal de una sola celda
  ev.preventDefault();
  const e = st.etq, m = txt.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((x) => x.split('\t'));
  m.forEach((fila, a) => {
    const r = +d.r + a;
    while (r >= e.filas.length) e.filas.push(filaVacia());
    fila.forEach((v, b) => { const c = +d.c + b; if (c < e.columnas.length) e.filas[r].v[c] = v; });
  });
  pintar(); guardarSesion(); aviso(`${m.length} fila(s) pegadas.`);
});
function enfocarCelda(r, c) { const i = $(`#lienzo input[data-r="${r}"][data-c="${c}"]`); if (i) i.focus(); }

document.addEventListener('keydown', (ev) => {
  if ($('#dlg').open) return;
  if (ev.key === 'Escape' && (st.sel || st.edit)) { finEdicion(); st.sel = null; pintarCentro(); return; }
  if (st.edit) return;
  const el = document.activeElement;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  const c = campoSel(); if (!c) return;
  const paso = ev.shiftKey ? 5 : 0.5;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { const a = cont(); a.campos = a.campos.filter((x) => x.id !== c.id); st.sel = null; }
  else if (ev.key === 'ArrowLeft') c.x = r5(c.x - paso);
  else if (ev.key === 'ArrowRight') c.x = r5(c.x + paso);
  else if (ev.key === 'ArrowUp') c.y = r5(c.y - paso);
  else if (ev.key === 'ArrowDown') c.y = r5(c.y + paso);
  else return;
  ev.preventDefault(); pintarCentro(); guardarSesion();
});

/* ---------- Archivos: datos, imágenes y hoja escaneada ---------- */
$('#ficheroDatos').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const buf = await f.arrayBuffer();
    if (/\.(csv|txt)$/i.test(f.name)) {
      let txt = new TextDecoder('utf-8').decode(buf);
      if (txt.includes('�')) txt = new TextDecoder('windows-1252').decode(buf); // CSV guardado por Excel
      cargarTabla(analizarCSV(txt.replace(/^﻿/, '')));
    } else {
      const libro = XLSX.read(buf, { type: 'array' });
      cargarTabla(XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, raw: false, defval: '' }));
    }
  } catch (e) { aviso('No se pudo leer el archivo: ' + (e.message || e), true, 6000); }
});
function leerDataURL(f) { return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(f); }); }
function cargarImg(src) { return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('imagen no válida')); i.src = src; }); }
/* Devuelve la imagen (reducida si es enorme) junto con su tamaño ORIGINAL en píxeles. */
async function reducirImagen(src, maximo, tipo = 'image/jpeg', giro = 0) {
  const i = await cargarImg(src), ancho = i.naturalWidth, alto = i.naturalHeight;
  const k = Math.min(1, maximo / Math.max(ancho, alto));
  if (k === 1 && !giro && src.length < 3_000_000) return { src, ancho, alto };
  const w = Math.round(ancho * k), h = Math.round(alto * k), cv = document.createElement('canvas');
  cv.width = giro ? h : w; cv.height = giro ? w : h;
  const g = cv.getContext('2d');
  if (tipo === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); }
  if (giro) { g.translate(cv.width, 0); g.rotate(Math.PI / 2); }
  g.drawImage(i, 0, 0, w, h);
  return { src: cv.toDataURL(tipo, 0.85), ancho: giro ? alto : ancho, alto: giro ? ancho : alto };
}
$('#ficheroImagen').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const img = await reducirImagen(await leerDataURL(f), 1200, 'image/png');
    const z = zonaAct(), alto = Math.max(5, Math.min(z.h - 4, 20));
    finEdicion();
    const c = { id: uid(), tipo: 'imagen', src: img.src, x: 2, y: 2, w: r5(alto * img.ancho / img.alto), h: r5(alto) };
    z.campos.push(c); st.sel = c.id; pintar(); guardarSesion();
  } catch (e) { aviso('No se pudo abrir la imagen.', true); }
});
/* mmAncho/mmAlto: tamaño real si se conoce (escáner o PDF); si no, se encaja en la hoja. */
async function ponerFondo(src, mmAncho, mmAlto) {
  const img = await reducirImagen(src, 2600), i = st.imp;
  i.fondo = { src: img.src, x: 0, y: 0, w: 0, h: 0, pxA: img.ancho, pxH: img.alto, real: !!(mmAncho && mmAlto) };
  if (i.fondo.real) { i.fondo.w = +mmAncho.toFixed(1); i.fondo.h = +mmAlto.toFixed(1); } else ajustarFondo();
  pintar(); guardarSesion();
}
function ajustarFondo() {
  const i = st.imp, f = i.fondo; if (!f) return;
  const prop = f.pxH / f.pxA;
  let w = i.hoja.ancho, h = w * prop;
  if (h > i.hoja.alto * 1.01) { h = i.hoja.alto; w = h / prop; }
  f.x = 0; f.y = 0; f.w = +w.toFixed(1); f.h = +h.toFixed(1); f.real = false;
}
async function girarFondo() {
  const f = st.imp.fondo; if (!f) return;
  const g = await reducirImagen(f.src, 2600, 'image/jpeg', 1);
  st.imp.fondo = { ...f, src: g.src, w: f.h, h: f.w, pxA: g.ancho, pxH: g.alto };
  pintar(); guardarSesion();
}
$('#ficheroFondo').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  const a = aviso('Abriendo…', false, 60000), esPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
  try {
    if (esPdf) {
      const pdfjs = await import('./lib/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('lib/pdf.worker.min.mjs', location.href).href;
      const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
      const pag = await doc.getPage(1), base = pag.getViewport({ scale: 1 }), vp = pag.getViewport({ scale: 200 / 72 });
      const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await pag.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      const mmA = base.width / 72 * 25.4, mmH = base.height / 72 * 25.4;
      st.imp.hoja = { ancho: Math.round(mmA), alto: Math.round(mmH) };
      await ponerFondo(cv.toDataURL('image/jpeg', 0.85), mmA, mmH);
      if (doc.numPages > 1) aviso('El PDF tiene varias páginas: se ha abierto la primera.', false, 5000);
    } else await ponerFondo(await leerDataURL(f));
  } catch (e) {
    aviso(location.protocol === 'file:' && esPdf ? 'Los PDF se abren en el programa instalado; en esta vista de prueba usa una imagen.' : 'No se pudo abrir el archivo: ' + (e.message || e), true, 7000);
  } finally { a.remove(); }
});

/* ---------- Escáner (solo en el programa instalado) ---------- */
async function cargarEscaneres(forzar) {
  if (!$('#selEscaner')) return;
  if (!st.escaneres || forzar) {
    try { const txt = await invoke('listar_escaneres'), j = txt.trim() ? JSON.parse(txt) : []; st.escaneres = Array.isArray(j) ? j : [j]; }
    catch (e) { st.escaneres = []; aviso('No se pudo consultar los escáneres: ' + e, true, 6000); }
  }
  const s = $('#selEscaner'); if (!s) return;
  s.innerHTML = st.escaneres.length ? st.escaneres.map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('') : '<option value="">Ninguno encontrado</option>';
  const ult = localStorage.getItem('esc:escaner');
  if (ult && st.escaneres.some((x) => x.id === ult)) s.value = ult;
}
/* Foto o escaneo de la hoja de etiquetas, puesta debajo para colocar los tamaños encima. */
async function ponerCalco(src, mmAncho, mmAlto) {
  const img = await reducirImagen(src, 2000), h = st.etq.hoja;
  let w = mmAncho, al = mmAlto;
  if (!(w && al)) { w = h.ancho; al = w * img.alto / img.ancho; if (al > h.alto * 1.01) { al = h.alto; w = al * img.ancho / img.alto; } }
  h.calco = { src: img.src, x: 0, y: 0, w: +w.toFixed(1), h: +al.toFixed(1) };
  st.vistaHoja = 'mano'; pintar(); guardarSesion();
}
$('#ficheroCalco').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try { await ponerCalco(await leerDataURL(f)); aviso('Foto puesta. Coloca cada tamaño de etiqueta encima de los de la foto.', false, 6000); }
  catch (e) { aviso('No se pudo abrir la foto.', true); }
});
async function escanear(destino) {
  if (!esTauri) return;
  if (!st.escaneres || !st.escaneres.length) {
    try { const txt = await invoke('listar_escaneres'), j = txt.trim() ? JSON.parse(txt) : []; st.escaneres = Array.isArray(j) ? j : [j]; }
    catch (e) { st.escaneres = []; }
    cargarEscaneres();
  }
  const sel = $('#selEscaner'), guardado = localStorage.getItem('esc:escaner');
  const id = (sel && sel.value) || (st.escaneres.find((x) => x.id === guardado) || st.escaneres[0] || {}).id;
  const ppp = destino === 'calco' ? 150 : +($('#selPpp') ? $('#selPpp').value : 200);
  if (!id) { aviso('No encuentro ningún escáner. Enciéndelo y vuelve a intentarlo.', true, 6000); return; }
  const a = aviso('Escaneando… no levantes la tapa.', false, 180000);
  try {
    localStorage.setItem('esc:escaner', id);
    const src = 'data:image/jpeg;base64,' + (await invoke('escanear', { id, ppp, color: true })).trim();
    const i = await cargarImg(src), mmA = i.naturalWidth / ppp * 25.4, mmH = i.naturalHeight / ppp * 25.4;
    if (destino === 'calco') { await ponerCalco(src, mmA, mmH); aviso('Hoja escaneada. Coloca cada tamaño de etiqueta encima.', false, 6000); }
    else { await ponerFondo(src, mmA, mmH); aviso('Hoja escaneada. Pulsa Siguiente para escribir encima.'); }
  } catch (e) { aviso('No se pudo escanear: ' + e, true, 8000); }
  finally { a.remove(); }
}

/* ---------- Imprimir ---------- */
function paginaImp(ancho, alto, ajX, ajY) {
  const p = document.createElement('div');
  p.className = 'pagImp';
  p.style.width = ancho + 'mm'; p.style.height = (alto - 0.3) + 'mm'; // 0,3 mm de holgura para que no salte una hoja en blanco
  const capa = document.createElement('div');
  capa.style.cssText = `position:absolute;left:${ajX}mm;top:${ajY}mm;width:${ancho}mm;height:${alto}mm;`;
  p.append(capa);
  return { p, capa };
}
async function imprimir() {
  finEdicion(); st.sel = null;
  const cont = $('#impresion'); cont.innerHTML = '';
  let ancho, alto;
  if (st.pantalla === 'etq') {
    const e = st.etq; ancho = e.hoja.ancho; alto = e.hoja.alto;
    if (!e.hoja.zonas.some((z) => z.activo !== false && z.campos.length)) { aviso('La etiqueta está vacía: vuelve a Diseño y escribe algo.', true); return; }
    const pags = paginar(e).filter((pg) => pg.some(Boolean));
    if (!pags.length) { aviso('No hay ninguna etiqueta marcada para imprimir. Revisa el paso Datos.', true); return; }
    pags.forEach((pg) => { const { p, capa } = paginaImp(ancho, alto, e.ajusteX, e.ajusteY); capa.append(contenidoHoja(e, pg, false)); cont.append(p); });
  } else {
    const i = st.imp; ancho = i.hoja.ancho; alto = i.hoja.alto;
    const conTexto = i.campos.filter((c) => c.texto.trim() !== '');
    if (!conTexto.length && !(i.conFondo && i.fondo)) { aviso('Todavía no has escrito nada en la hoja.', true); return; }
    const { p, capa } = paginaImp(ancho, alto, i.ajusteX, i.ajusteY);
    if (i.conFondo && i.fondo) capa.append(elFondo(i.fondo, 1));
    conTexto.forEach((c) => capa.append(elCampo(c, null, null)));
    cont.append(p);
  }
  $('#estiloPagina').textContent = `@page { size: ${ancho}mm ${alto}mm; margin: 0; }`;
  await Promise.all([...cont.querySelectorAll('img')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
  setTimeout(() => window.print(), 60);
}

/* ---------- Guardar y abrir ---------- */
const limpio = (n) => n.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
const almacen = esTauri ? {
  listar: () => invoke('listar_trabajos'),
  guardar: (n, c) => invoke('guardar_trabajo', { nombre: n, contenido: c }),
  leer: (n) => invoke('leer_trabajo', { nombre: n }),
  borrar: (n) => invoke('borrar_trabajo', { nombre: n }),
} : {
  listar: async () => Object.keys(localStorage).filter((k) => k.startsWith('esc:trabajo:')).map((k) => k.slice(12)).sort(),
  guardar: async (n, c) => localStorage.setItem('esc:trabajo:' + n, c),
  leer: async (n) => localStorage.getItem('esc:trabajo:' + n),
  borrar: async (n) => localStorage.removeItem('esc:trabajo:' + n),
};
async function guardar() {
  finEdicion();
  const a = actual();
  let n = await pedirTexto('Ponle un nombre para guardarlo', a.nombre || '');
  if (n === null) return;
  n = limpio(n);
  if (!n) { aviso('Escribe un nombre.', true); return; }
  try {
    const lista = await almacen.listar();
    if (n !== a.nombre && lista.includes(n) && !(await confirmar(`Ya existe «${n}». ¿Sustituirlo?`, 'Sustituir'))) return;
    a.nombre = n;
    await almacen.guardar(n, JSON.stringify(a));
    $('#nombreTrabajo').textContent = n;
    aviso(esTauri ? `Guardado en Documentos\\Escaneator como «${n}».` : `Guardado «${n}».`);
    guardarSesion();
  } catch (e) { aviso('No se pudo guardar: ' + (e.message || e), true, 6000); }
}
async function abrirTrabajo(n) {
  try {
    const o = JSON.parse(await almacen.leer(n));
    if (!o || !o.hoja || !(Array.isArray(o.campos) || Array.isArray(o.hoja.zonas))) throw new Error('el archivo no es de Escaneator');
    if (o.tipo === 'impresos') { st.imp = { ...nuevoImp(), ...o }; st.pantalla = 'imp'; st.paso = 1; }
    else { st.etq = migrarEtq(o); st.zona = null; st.pantalla = 'etq'; st.paso = 2; }
    st.sel = null; st.edit = false; st.pag = 0; st.zf = 1;
    pintar(); guardarSesion();
  } catch (e) { aviso('No se pudo abrir: ' + (e.message || e), true, 6000); }
}

/* ---------- Navegación ---------- */
function irPaso(n) {
  finEdicion();
  const total = PASOS[st.pantalla].length;
  if (n < 0) { st.pantalla = 'inicio'; n = 0; }
  if (n >= total) return;
  st.paso = n; st.sel = null; st.zf = 1; pintar();
}
$('#pasos').addEventListener('click', (ev) => { const b = ev.target.closest('[data-paso]'); if (b) irPaso(+b.dataset.paso); });
$('#btnAtras').onclick = () => irPaso(st.paso - 1);
$('#btnSiguiente').onclick = () => { if (st.paso === PASOS[st.pantalla].length - 1) imprimir(); else irPaso(st.paso + 1); };
$('#btnInicio').onclick = () => { finEdicion(); st.pantalla = 'inicio'; st.paso = 0; st.sel = null; pintar(); };
$('#btnGuardar').onclick = guardar;
$('#zMas').onclick = () => { st.zf = Math.min(6, st.zf * 1.25); pintarCentro(); };
$('#zMenos').onclick = () => { st.zf = Math.max(0.25, st.zf / 1.25); pintarCentro(); };
$('#zAjustar').onclick = () => { st.zf = 1; pintarCentro(); };
let tRes = null;
window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => { if (!st.edit) pintarCentro(); }, 150); });

cargarSesion();
pintar();
