/* Escaneator — interfaz. Funciona dentro de Tauri (programa instalado) y también en un navegador para pruebas. */
'use strict';

const MM = 96 / 25.4; // píxeles CSS por milímetro
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };
const r5 = (v) => Math.round(v * 2) / 2;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const esTauri = !!(window.__TAURI__ && window.__TAURI__.core);
const invoke = esTauri ? window.__TAURI__.core.invoke : null;

/* ---------- Plantillas ---------- */
const PLANTILLAS = [
  { n: 'A4 · 24 etiquetas (3×8) de 70×37 mm', h: { ancho: 210, alto: 297, mSup: 0.5, mIzq: 0, cols: 3, filas: 8, etqAncho: 70, etqAlto: 37, sepH: 0, sepV: 0 } },
  { n: 'A4 · 21 etiquetas (3×7) de 70×42,3 mm', h: { ancho: 210, alto: 297, mSup: 0.45, mIzq: 0, cols: 3, filas: 7, etqAncho: 70, etqAlto: 42.3, sepH: 0, sepV: 0 } },
  { n: 'A4 · 21 etiquetas (3×7) de 63,5×38,1 mm', h: { ancho: 210, alto: 297, mSup: 15.15, mIzq: 7.2, cols: 3, filas: 7, etqAncho: 63.5, etqAlto: 38.1, sepH: 2.5, sepV: 0 } },
  { n: 'A4 · 14 etiquetas (2×7) de 99,1×38,1 mm', h: { ancho: 210, alto: 297, mSup: 15.15, mIzq: 4.65, cols: 2, filas: 7, etqAncho: 99.1, etqAlto: 38.1, sepH: 2.5, sepV: 0 } },
  { n: 'A4 · 8 etiquetas (2×4) de 99,1×67,7 mm', h: { ancho: 210, alto: 297, mSup: 13.1, mIzq: 4.65, cols: 2, filas: 4, etqAncho: 99.1, etqAlto: 67.7, sepH: 2.5, sepV: 0 } },
  { n: 'A4 · 40 etiquetas (4×10) de 52,5×29,7 mm', h: { ancho: 210, alto: 297, mSup: 0, mIzq: 0, cols: 4, filas: 10, etqAncho: 52.5, etqAlto: 29.7, sepH: 0, sepV: 0 } },
  { n: 'A4 · 65 etiquetas (5×13) de 38,1×21,2 mm', h: { ancho: 210, alto: 297, mSup: 10.7, mIzq: 4.75, cols: 5, filas: 13, etqAncho: 38.1, etqAlto: 21.2, sepH: 2.5, sepV: 0 } },
  { n: 'A4 · 4 etiquetas (2×2) de 105×148,5 mm', h: { ancho: 210, alto: 297, mSup: 0, mIzq: 0, cols: 2, filas: 2, etqAncho: 105, etqAlto: 148.5, sepH: 0, sepV: 0 } },
  { n: 'Rollo · etiqueta de 62×29 mm', h: { ancho: 62, alto: 29, mSup: 0, mIzq: 0, cols: 1, filas: 1, etqAncho: 62, etqAlto: 29, sepH: 0, sepV: 0 } },
  { n: 'Rollo · etiqueta de 50×30 mm', h: { ancho: 50, alto: 30, mSup: 0, mIzq: 0, cols: 1, filas: 1, etqAncho: 50, etqAlto: 30, sepH: 0, sepV: 0 } },
  { n: 'Rollo · etiqueta de 100×50 mm', h: { ancho: 100, alto: 50, mSup: 0, mIzq: 0, cols: 1, filas: 1, etqAncho: 100, etqAlto: 50, sepH: 0, sepV: 0 } },
  { n: 'Rollo · etiqueta de envío 100×150 mm', h: { ancho: 100, alto: 150, mSup: 0, mIzq: 0, cols: 1, filas: 1, etqAncho: 100, etqAlto: 150, sepH: 0, sepV: 0 } },
];
const HOJAS = [
  { n: 'A4 (210×297)', ancho: 210, alto: 297 },
  { n: 'A4 apaisado (297×210)', ancho: 297, alto: 210 },
  { n: 'A5 (148×210)', ancho: 148, alto: 210 },
  { n: 'A5 apaisado (210×148)', ancho: 210, alto: 148 },
  { n: 'A6 (105×148)', ancho: 105, alto: 148 },
  { n: 'Sobre DL (220×110)', ancho: 220, alto: 110 },
  { n: 'Carta (216×279)', ancho: 216, alto: 279 },
];
const FUENTES = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Calibri'];

/* ---------- Estado ---------- */
function nuevoEtq() {
  return {
    tipo: 'etiquetas', nombre: '',
    hoja: { ...PLANTILLAS[0].h },
    campos: [
      { id: uid(), tipo: 'texto', texto: '{Nombre}', x: 4, y: 5, w: 62, h: 8, tam: 14, negrita: true, alin: 'left', fuente: 'Arial' },
      { id: uid(), tipo: 'texto', texto: '{Dirección}', x: 4, y: 15, w: 62, h: 17, tam: 10, negrita: false, alin: 'left', fuente: 'Arial' },
    ],
    columnas: ['Nombre', 'Dirección'],
    filas: [{ sel: true, copias: 1, v: ['', ''] }],
    usadas: [], borde: false, ajusteX: 0, ajusteY: 0,
  };
}
function nuevoImp() {
  return { tipo: 'impresos', nombre: '', hoja: { ancho: 210, alto: 297 }, fondo: null, opFondo: 0.85, campos: [], ajusteX: 0, ajusteY: 0, conFondo: false };
}
const st = { modo: 'etiquetas', vista: 'diseno', etq: nuevoEtq(), imp: nuevoImp(), sel: null, zf: 1, pag: 0, escaneres: null };
const actual = () => (st.modo === 'etiquetas' ? st.etq : st.imp);

let tSesion = null;
function guardarSesion() {
  clearTimeout(tSesion);
  tSesion = setTimeout(() => {
    try { localStorage.setItem('esc:sesion', JSON.stringify({ modo: st.modo, etq: st.etq, imp: st.imp })); }
    catch (e) { /* la imagen escaneada puede no caber; no pasa nada, se guarda con "Guardar" */ }
  }, 700);
}
function cargarSesion() {
  try {
    const s = JSON.parse(localStorage.getItem('esc:sesion') || 'null');
    if (s && s.etq && s.imp) { st.modo = s.modo || 'etiquetas'; st.etq = s.etq; st.imp = s.imp; }
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

/* ---------- Representación de campos (igual en pantalla y en papel) ---------- */
function sustituir(texto, e, valores) {
  if (!valores) return texto;
  return texto.replace(/\{([^{}]+)\}/g, (todo, nombre) => {
    const i = e.columnas.findIndex((c) => c.trim().toLowerCase() === nombre.trim().toLowerCase());
    return i < 0 ? todo : (valores[i] ?? '');
  });
}
function elCampo(c, e, valores) {
  const d = document.createElement('div');
  d.className = 'campo';
  d.style.left = c.x + 'mm'; d.style.top = c.y + 'mm'; d.style.width = c.w + 'mm'; d.style.height = c.h + 'mm';
  if (c.tipo === 'imagen') {
    const i = document.createElement('img'); i.src = c.src; d.append(i);
  } else {
    d.style.fontSize = c.tam + 'pt';
    d.style.fontWeight = c.negrita ? '700' : '400';
    d.style.textAlign = c.alin || 'left';
    d.style.fontFamily = `"${c.fuente || 'Arial'}", Arial, sans-serif`;
    d.textContent = e ? sustituir(c.texto, e, valores) : c.texto;
  }
  return d;
}
function posEtq(h, i) {
  const col = i % h.cols, fila = Math.floor(i / h.cols);
  return { x: h.mIzq + col * (h.etqAncho + h.sepH), y: h.mSup + fila * (h.etqAlto + h.sepV) };
}
function etiquetasAImprimir(e) {
  const out = [];
  e.filas.forEach((f) => { if (f.sel) for (let i = 0; i < Math.max(1, Math.min(9999, f.copias | 0)); i++) out.push(f.v); });
  return out;
}
/* Reparte las etiquetas en hojas, saltando en la primera las posiciones marcadas como usadas. */
function paginar(e) {
  const n = Math.max(1, e.hoja.cols * e.hoja.filas);
  const cola = etiquetasAImprimir(e);
  const pags = [];
  let k = 0;
  while (k < cola.length && pags.length < 2000) {
    const pag = new Array(n).fill(null);
    for (let i = 0; i < n && k < cola.length; i++) {
      if (pags.length === 0 && e.usadas[i]) continue;
      pag[i] = cola[k++];
    }
    pags.push(pag);
  }
  return pags;
}
function contenidoHoja(e, pag, guia) {
  const frag = document.createDocumentFragment();
  const n = e.hoja.cols * e.hoja.filas;
  for (let i = 0; i < n; i++) {
    const valores = pag ? pag[i] : null;
    if (!guia && !valores) continue;
    const p = posEtq(e.hoja, i);
    const d = document.createElement('div');
    d.className = 'etq' + (!guia && e.borde ? ' borde' : '');
    d.style.left = p.x + 'mm'; d.style.top = p.y + 'mm'; d.style.width = e.hoja.etqAncho + 'mm'; d.style.height = e.hoja.etqAlto + 'mm';
    d.dataset.i = i;
    if (valores) e.campos.forEach((c) => d.append(elCampo(c, e, valores)));
    frag.append(d);
  }
  return frag;
}

/* ---------- Lienzo ---------- */
function crearPapel(l, ancho, alto, tope = 6) {
  l.className = ''; l.innerHTML = '';
  const fit = Math.min((l.clientWidth - 56) / (ancho * MM), (l.clientHeight - 56) / (alto * MM));
  const z = Math.max(0.1, Math.min(tope, fit) * st.zf);
  const escd = document.createElement('div');
  escd.className = 'papelEsc';
  escd.style.width = ancho * MM * z + 'px'; escd.style.height = alto * MM * z + 'px';
  const papel = document.createElement('div');
  papel.className = 'papel';
  papel.style.width = ancho + 'mm'; papel.style.height = alto + 'mm';
  papel.style.transform = `scale(${z})`;
  escd.append(papel); l.append(escd);
  return { papel, z };
}
function montarEditor(l, ancho, alto, campos, opciones = {}) {
  const { papel, z } = crearPapel(l, ancho, alto);
  if (opciones.fondo) papel.append(elFondo(opciones.fondo, opciones.opFondo ?? 1));
  campos.forEach((c) => {
    const d = elCampo(c, null, null);
    d.classList.add('edit');
    if (c.id === st.sel) d.classList.add('sel');
    d.dataset.id = c.id;
    const t = document.createElement('i'); t.className = 'tirador'; d.append(t);
    papel.append(d);
  });
  papel.onpointerdown = (ev) => {
    const d = ev.target.closest('.campo');
    if (!d) { if (st.sel) { st.sel = null; papel.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); pintarDer(); } return; }
    const c = campos.find((x) => x.id === d.dataset.id);
    if (!c) return;
    ev.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (st.sel !== c.id) {
      st.sel = c.id;
      papel.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel'));
      d.classList.add('sel'); pintarDer();
    }
    const redim = ev.target.classList.contains('tirador');
    const x0 = ev.clientX, y0 = ev.clientY, o = { x: c.x, y: c.y, w: c.w, h: c.h }, k = MM * z;
    let movido = false;
    const mover = (e2) => {
      const dx = (e2.clientX - x0) / k, dy = (e2.clientY - y0) / k;
      if (Math.abs(dx) + Math.abs(dy) < 0.3 && !movido) return;
      movido = true;
      if (redim) { c.w = Math.max(3, r5(o.w + dx)); c.h = Math.max(2, r5(o.h + dy)); }
      else { c.x = r5(o.x + dx); c.y = r5(o.y + dy); }
      d.style.left = c.x + 'mm'; d.style.top = c.y + 'mm'; d.style.width = c.w + 'mm'; d.style.height = c.h + 'mm';
    };
    const fin = () => {
      window.removeEventListener('pointermove', mover);
      if (movido) { pintarDer(); guardarSesion(); }
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', fin, { once: true });
  };
  papel.ondblclick = (ev) => {
    if (ev.target.closest('.campo')) { const t = $('#pTexto'); if (t) { t.focus(); t.select(); } return; }
    if (!opciones.alDobleClic) return;
    const r = papel.getBoundingClientRect();
    opciones.alDobleClic(r5((ev.clientX - r.left) / (MM * z)), r5((ev.clientY - r.top) / (MM * z)));
  };
}
function elFondo(f, opacidad) {
  const i = document.createElement('img');
  i.className = 'fondoEsc'; i.src = f.src; i.draggable = false;
  i.style.left = f.x + 'mm'; i.style.top = f.y + 'mm'; i.style.width = f.w + 'mm'; i.style.height = f.h + 'mm';
  i.style.opacity = opacidad;
  return i;
}

/* ---------- Pintado general ---------- */
function pintarTodo() {
  document.querySelectorAll('#modos button').forEach((b) => b.classList.toggle('activo', b.dataset.modo === st.modo));
  const sub = $('#subtabs');
  if (st.modo === 'etiquetas') {
    const v = [['diseno', '1 · Diseño de la etiqueta'], ['datos', '2 · Datos'], ['hoja', '3 · Hoja y posiciones']];
    sub.innerHTML = v.map(([k, t]) => `<button data-v="${k}" class="${st.vista === k ? 'activo' : ''}">${t}</button>`).join('');
  } else {
    sub.innerHTML = '<button class="activo">Hoja escaneada</button>';
  }
  $('#nombreTrabajo').textContent = actual().nombre || 'Sin guardar';
  pintarIzq(); pintarCentro(); pintarDer();
}
function pintarCentro() {
  const l = $('#lienzo');
  const hayLienzo = !(st.modo === 'etiquetas' && st.vista === 'datos');
  document.querySelector('.zoom').style.visibility = hayLienzo ? 'visible' : 'hidden';
  if (st.modo === 'impresos') pintarImpreso(l);
  else if (st.vista === 'diseno') { const e = st.etq; montarEditor(l, e.hoja.etqAncho, e.hoja.etqAlto, e.campos); }
  else if (st.vista === 'hoja') pintarHoja(l);
  else pintarDatos(l);
  pintarEstado();
}
function pintarEstado() {
  const s = $('#estado');
  if (st.modo === 'impresos') {
    const i = st.imp;
    s.textContent = `${i.campos.length} texto(s) · hoja de ${i.hoja.ancho}×${i.hoja.alto} mm` + (i.fondo ? '' : ' · sin imagen escaneada todavía');
    return;
  }
  const e = st.etq, pags = paginar(e), total = etiquetasAImprimir(e).length;
  let t = `${total} etiqueta(s) para imprimir · ${pags.length} hoja(s) · ${e.hoja.cols * e.hoja.filas} por hoja`;
  const usadas = e.usadas.filter(Boolean).length;
  if (usadas) t += ` · ${usadas} posición(es) usadas en la primera hoja`;
  s.innerHTML = esc(t) + (st.vista === 'hoja' && pags.length > 1
    ? ` &nbsp; <button class="mini" id="pagAnt">◀</button> Hoja ${st.pag + 1} de ${pags.length} <button class="mini" id="pagSig">▶</button>` : '');
}

/* ---------- Panel izquierdo ---------- */
const campoNum = (etq, attr, v, paso = 0.1) => `<label class="c"><span>${etq}</span><input type="number" step="${paso}" ${attr} value="${v}"></label>`;

function pintarIzq() {
  const p = $('#panelIzq');
  if (st.modo === 'etiquetas') {
    const e = st.etq, h = e.hoja;
    p.innerHTML = `
      <h3>Plantilla</h3>
      <div class="fila una"><select id="selPlantilla"><option value="">Elegir una medida habitual…</option>${PLANTILLAS.map((x, i) => `<option value="${i}">${esc(x.n)}</option>`).join('')}</select></div>
      <p class="nota">Las plantillas son orientativas: mide tu hoja y corrige los números si hace falta.</p>
      <h3>Hoja (mm)</h3>
      <div class="fila">${campoNum('Ancho', 'data-h="ancho"', h.ancho)}${campoNum('Alto', 'data-h="alto"', h.alto)}</div>
      <div class="fila">${campoNum('Margen superior', 'data-h="mSup"', h.mSup)}${campoNum('Margen izquierdo', 'data-h="mIzq"', h.mIzq)}</div>
      <h3>Etiquetas (mm)</h3>
      <div class="fila">${campoNum('Columnas', 'data-h="cols" min="1"', h.cols, 1)}${campoNum('Filas', 'data-h="filas" min="1"', h.filas, 1)}</div>
      <div class="fila">${campoNum('Ancho etiqueta', 'data-h="etqAncho"', h.etqAncho)}${campoNum('Alto etiqueta', 'data-h="etqAlto"', h.etqAlto)}</div>
      <div class="fila">${campoNum('Separación horiz.', 'data-h="sepH"', h.sepH)}${campoNum('Separación vert.', 'data-h="sepV"', h.sepV)}</div>
      <div id="alertaHoja"></div>
      <h3>Contenido</h3>
      <div class="botones"><button id="addTexto">+ Texto</button><button id="addImagen">+ Imagen / logo</button></div>
      <h3>Ajuste de la impresora (mm)</h3>
      <div class="fila">${campoNum('Mover a la derecha', 'data-k="ajusteX"', e.ajusteX)}${campoNum('Mover hacia abajo', 'data-k="ajusteY"', e.ajusteY)}</div>
      <p class="nota">Si todo sale desplazado, corrígelo aquí (valores negativos mueven al lado contrario).</p>
      <label class="marca2"><input type="checkbox" data-k="borde" ${e.borde ? 'checked' : ''}> Imprimir el borde de cada etiqueta (para probar en un folio normal)</label>`;
    alertaHoja();
  } else {
    const i = st.imp, f = i.fondo;
    p.innerHTML = `
      <h3>Hoja (mm)</h3>
      <div class="fila una"><select id="selHoja"><option value="">Tamaños habituales…</option>${HOJAS.map((x, k) => `<option value="${k}">${esc(x.n)}</option>`).join('')}</select></div>
      <div class="fila">${campoNum('Ancho', 'data-ih="ancho"', i.hoja.ancho)}${campoNum('Alto', 'data-ih="alto"', i.hoja.alto)}</div>
      <h3>Imagen de la hoja</h3>
      ${esTauri ? `<div class="fila una"><label class="c"><span>Escáner</span><select id="selEscaner"><option value="">Buscando escáneres…</option></select></label></div>
      <div class="fila"><label class="c"><span>Calidad</span><select id="selPpp"><option value="150">Normal (150)</option><option value="200" selected>Buena (200)</option><option value="300">Alta (300)</option></select></label>
      <label class="c"><span>&nbsp;</span><button id="btnEscanear" class="principal" style="width:100%">Escanear</button></label></div>`
      : '<p class="nota">El escáner se maneja desde el programa instalado. En esta vista de prueba puedes abrir una imagen ya escaneada.</p>'}
      <div class="botones"><button id="btnFondo">Abrir imagen o PDF…</button>${f ? '<button id="btnGirar">Girar 90°</button><button id="btnQuitarFondo" class="peligro">Quitar</button>' : ''}</div>
      ${f ? `<div class="fila tres">${campoNum('Izquierda', 'data-f="x"', f.x)}${campoNum('Arriba', 'data-f="y"', f.y)}${campoNum('Ancho', 'data-f="w"', f.w)}</div>
      <div class="botones"><button id="btnAjustarFondo" class="mini">Ajustar la imagen a la hoja</button></div>
      <label class="c"><span>Transparencia de la imagen en pantalla</span><input type="range" min="0.15" max="1" step="0.05" data-k="opFondo" value="${i.opFondo}"></label>` : ''}
      <h3>Rellenar</h3>
      <div class="botones"><button id="addTexto">+ Texto</button></div>
      <p class="nota">También puedes hacer doble clic sobre la hoja, justo donde quieras escribir.</p>
      <h3>Ajuste de la impresora (mm)</h3>
      <div class="fila">${campoNum('Mover a la derecha', 'data-k="ajusteX"', i.ajusteX)}${campoNum('Mover hacia abajo', 'data-k="ajusteY"', i.ajusteY)}</div>
      <label class="marca2"><input type="checkbox" data-k="conFondo" ${i.conFondo ? 'checked' : ''}> Imprimir también la imagen escaneada (prueba en un folio en blanco)</label>
      <p class="nota">Sin marcar, solo se imprime lo que has escrito: coloca el impreso original en la impresora.</p>`;
    if (esTauri) cargarEscaneres();
  }
}
function alertaHoja() {
  const h = st.etq.hoja, a = $('#alertaHoja');
  if (!a) return;
  const anchoTotal = h.mIzq + h.cols * h.etqAncho + (h.cols - 1) * h.sepH;
  const altoTotal = h.mSup + h.filas * h.etqAlto + (h.filas - 1) * h.sepV;
  const m = [];
  if (anchoTotal > h.ancho + 0.05) m.push(`A lo ancho ocupan ${anchoTotal.toFixed(1)} mm y la hoja mide ${h.ancho}.`);
  if (altoTotal > h.alto + 0.05) m.push(`A lo alto ocupan ${altoTotal.toFixed(1)} mm y la hoja mide ${h.alto}.`);
  a.innerHTML = m.length ? `<p class="alerta">Las etiquetas se salen de la hoja. ${m.join(' ')}</p>` : '';
}

$('#panelIzq').addEventListener('input', (ev) => {
  const t = ev.target, d = t.dataset;
  if (d.h) {
    const entero = d.h === 'cols' || d.h === 'filas';
    let v = num(t.value, 0); if (entero) v = Math.max(1, Math.min(60, Math.round(v))); else v = Math.max(0, v);
    if ((d.h.startsWith('etq') || d.h === 'ancho' || d.h === 'alto') && v < 1) return;
    st.etq.hoja[d.h] = v; alertaHoja();
  } else if (d.ih) {
    const v = num(t.value, 0); if (v < 10) return; st.imp.hoja[d.ih] = v;
  } else if (d.f) {
    const f = st.imp.fondo; if (!f) return;
    const v = num(t.value, 0);
    if (d.f === 'w') { if (v < 5) return; f.h = f.h * (v / f.w); f.w = v; } else f[d.f] = v;
  } else if (d.k) {
    actual()[d.k] = t.type === 'checkbox' ? t.checked : num(t.value, 0);
  } else return;
  pintarCentro(); guardarSesion();
});
$('#panelIzq').addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'selPlantilla' && t.value !== '') {
    Object.assign(st.etq.hoja, PLANTILLAS[+t.value].h); st.etq.usadas = []; st.pag = 0;
    pintarIzq(); pintarCentro(); guardarSesion();
  }
  if (t.id === 'selHoja' && t.value !== '') {
    const h = HOJAS[+t.value]; st.imp.hoja = { ancho: h.ancho, alto: h.alto };
    pintarIzq(); pintarCentro(); guardarSesion();
  }
});
$('#panelIzq').addEventListener('click', async (ev) => {
  const id = ev.target.id;
  if (id === 'addTexto') {
    if (st.modo === 'etiquetas') { st.vista = 'diseno'; anadirCampo(st.etq.campos, { x: 3, y: 3, w: Math.max(10, st.etq.hoja.etqAncho - 6), h: 7, tam: 11, texto: 'Texto' }); }
    else anadirCampo(st.imp.campos, { x: 20, y: 20, w: 70, h: 6, tam: 11, texto: '' });
  } else if (id === 'addImagen') $('#ficheroImagen').click();
  else if (id === 'btnFondo') $('#ficheroFondo').click();
  else if (id === 'btnQuitarFondo') { if (await confirmar('¿Quitar la imagen escaneada?', 'Quitar')) { st.imp.fondo = null; pintarTodo(); guardarSesion(); } }
  else if (id === 'btnAjustarFondo') { ajustarFondo(); pintarTodo(); guardarSesion(); }
  else if (id === 'btnGirar') girarFondo();
  else if (id === 'btnEscanear') escanear();
});
function anadirCampo(lista, base) {
  const c = { id: uid(), tipo: 'texto', negrita: false, alin: 'left', fuente: 'Arial', ...base };
  lista.push(c); st.sel = c.id;
  pintarTodo(); guardarSesion();
  const t = $('#pTexto'); if (t) { t.focus(); t.select(); }
}

/* ---------- Panel derecho (propiedades del campo) ---------- */
function campoSel() { return st.sel ? actual().campos.find((c) => c.id === st.sel) : null; }
function pintarDer() {
  const p = $('#panelDer'), c = campoSel();
  if (st.modo === 'etiquetas' && st.vista !== 'diseno') {
    p.innerHTML = st.vista === 'datos'
      ? `<h3>Datos</h3><p class="nota">Cada fila es una etiqueta. Marca las que quieras imprimir y pon cuántas copias de cada una.</p><p class="nota">Puedes escribirlas a mano, importar un Excel o CSV, o copiar las celdas en Excel y pegarlas aquí con Ctrl+V.</p><p class="nota">En el diseño, un texto como <b>{Nombre}</b> se cambia por el dato de esa columna.</p>`
      : `<h3>Posiciones</h3><p class="nota">Si la hoja ya está empezada, haz clic en las etiquetas que ya no están para marcarlas como <b>usadas</b>: Escaneator las salta y sigue por las libres.</p><p class="nota">Solo afecta a la primera hoja; las siguientes se imprimen completas.</p><div class="botones"><button id="limpiarUsadas">Todas libres</button></div>`;
    return;
  }
  if (!c) {
    p.innerHTML = `<p class="vacio">Selecciona un texto para cambiarlo.<br><br>Arrástralo para moverlo y tira de la esquina naranja para cambiar su tamaño.<br><br>Con las flechas del teclado lo mueves medio milímetro.</p>`;
    return;
  }
  const esImg = c.tipo === 'imagen';
  const chips = st.modo === 'etiquetas' && !esImg
    ? `<div class="chips">${st.etq.columnas.map((n) => `<button data-ins="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : '';
  p.innerHTML = `
    <h3>${esImg ? 'Imagen' : 'Texto'}</h3>
    ${esImg ? '' : `<textarea id="pTexto" data-p="texto" placeholder="Escribe aquí…">${esc(c.texto)}</textarea>${chips}
    <div class="fila">${campoNum('Tamaño de letra', 'data-p="tam" min="4"', c.tam, 0.5)}
      <label class="c"><span>Alineación</span><select data-p="alin"><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label></div>
    <div class="fila"><label class="c"><span>Letra</span><select data-p="fuente">${FUENTES.map((f) => `<option>${f}</option>`).join('')}</select></label>
      <label class="marca2" style="margin-top:20px"><input type="checkbox" data-p="negrita" ${c.negrita ? 'checked' : ''}> Negrita</label></div>`}
    <h3>Posición y tamaño (mm)</h3>
    <div class="fila">${campoNum('Desde la izquierda', 'data-p="x"', c.x)}${campoNum('Desde arriba', 'data-p="y"', c.y)}</div>
    <div class="fila">${campoNum('Ancho', 'data-p="w" min="1"', c.w)}${campoNum('Alto', 'data-p="h" min="1"', c.h)}</div>
    <div class="botones"><button id="pDuplicar">Duplicar</button><button id="pEliminar" class="peligro">Eliminar</button></div>`;
  if (!esImg) { $('[data-p="alin"]', p).value = c.alin || 'left'; $('[data-p="fuente"]', p).value = c.fuente || 'Arial'; }
}
$('#panelDer').addEventListener('input', (ev) => {
  const c = campoSel(), k = ev.target.dataset.p;
  if (!c || !k) return;
  const t = ev.target;
  if (t.type === 'checkbox') c[k] = t.checked;
  else if (t.type === 'number') { const v = num(t.value, NaN); if (!isFinite(v)) return; if ((k === 'w' || k === 'h' || k === 'tam') && v < 1) return; c[k] = v; }
  else c[k] = t.value;
  pintarCentro(); guardarSesion();
});
$('#panelDer').addEventListener('focusin', (ev) => { if (ev.target.id === 'pTexto') ev.target.dataset.tocado = '1'; });
$('#panelDer').addEventListener('click', (ev) => {
  const t = ev.target, c = campoSel();
  if (t.id === 'limpiarUsadas') { st.etq.usadas = []; pintarCentro(); guardarSesion(); return; }
  if (!c) return;
  if (t.dataset.ins) {
    const a = $('#pTexto'), ins = `{${t.dataset.ins}}`, pos = a.dataset.tocado ? (a.selectionStart ?? a.value.length) : a.value.length;
    a.value = a.value.slice(0, pos) + ins + a.value.slice(a.dataset.tocado ? (a.selectionEnd ?? pos) : pos);
    a.dataset.tocado = '1';
    c.texto = a.value; a.focus(); a.selectionStart = a.selectionEnd = pos + ins.length;
    pintarCentro(); guardarSesion();
  } else if (t.id === 'pEliminar') eliminarSel();
  else if (t.id === 'pDuplicar') {
    const n = { ...c, id: uid(), x: c.x + 3, y: c.y + 3 };
    actual().campos.push(n); st.sel = n.id; pintarCentro(); pintarDer(); guardarSesion();
  }
});
function eliminarSel() {
  const a = actual(); a.campos = a.campos.filter((c) => c.id !== st.sel); st.sel = null;
  pintarCentro(); pintarDer(); guardarSesion();
}
document.addEventListener('keydown', (ev) => {
  if ($('#dlg').open) return;
  const el = document.activeElement;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  const c = campoSel(); if (!c) return;
  const paso = ev.shiftKey ? 5 : 0.5;
  if (ev.key === 'Delete') eliminarSel();
  else if (ev.key === 'ArrowLeft') c.x = r5(c.x - paso);
  else if (ev.key === 'ArrowRight') c.x = r5(c.x + paso);
  else if (ev.key === 'ArrowUp') c.y = r5(c.y - paso);
  else if (ev.key === 'ArrowDown') c.y = r5(c.y + paso);
  else return;
  ev.preventDefault();
  if (ev.key !== 'Delete') { pintarCentro(); pintarDer(); guardarSesion(); }
});

/* ---------- Etiquetas: vista de hoja ---------- */
function pintarHoja(l) {
  const e = st.etq, pags = paginar(e);
  if (st.pag >= pags.length) st.pag = Math.max(0, pags.length - 1);
  const { papel } = crearPapel(l, e.hoja.ancho, e.hoja.alto, 2.2);
  papel.classList.add('guia');
  papel.append(contenidoHoja(e, pags[st.pag] || null, true));
  if (st.pag === 0) papel.querySelectorAll('.etq').forEach((d) => { if (e.usadas[+d.dataset.i]) d.classList.add('usada'); });
  papel.onclick = (ev) => {
    const d = ev.target.closest('.etq'); if (!d) return;
    if (st.pag !== 0) { aviso('Las posiciones usadas se marcan en la primera hoja.'); return; }
    const i = +d.dataset.i; e.usadas[i] = !e.usadas[i];
    pintarCentro(); guardarSesion();
  };
}
$('#estado').addEventListener('click', (ev) => {
  if (ev.target.id === 'pagAnt' && st.pag > 0) { st.pag--; pintarCentro(); }
  if (ev.target.id === 'pagSig') { st.pag++; pintarCentro(); }
});

/* ---------- Etiquetas: datos ---------- */
function pintarDatos(l) {
  const e = st.etq;
  l.className = 'datos';
  const todas = e.filas.length > 0 && e.filas.every((f) => f.sel);
  l.innerHTML = `
    <div class="barraDatos">
      <button id="dFila">+ Fila</button><button id="dCol">+ Columna</button>
      <button id="dImportar">Importar Excel o CSV…</button>
      <button id="dLlenar" title="Pone en la primera fila marcada tantas copias como etiquetas libres tiene la hoja">Llenar la hoja con la primera</button>
      <button id="dVaciar" class="peligro">Vaciar</button>
    </div>
    <table class="datos"><thead><tr>
      <th class="n"><input type="checkbox" id="dTodas" ${todas ? 'checked' : ''} title="Marcar o desmarcar todas"></th><th class="cop">Copias</th>
      ${e.columnas.map((c, i) => `<th><div class="cab"><input type="text" data-col="${i}" value="${esc(c)}" title="Nombre de la columna"><button class="quitarCol" data-qc="${i}" title="Quitar columna">×</button></div></th>`).join('')}
      <th class="x"></th></tr></thead>
    <tbody>${e.filas.map((f, r) => `<tr>
      <td class="n"><input type="checkbox" data-sel="${r}" ${f.sel ? 'checked' : ''}></td>
      <td class="cop"><input type="number" min="1" data-cop="${r}" value="${f.copias}"></td>
      ${e.columnas.map((_, i) => `<td><input type="text" data-r="${r}" data-c="${i}" value="${esc(f.v[i] ?? '')}"></td>`).join('')}
      <td class="x"><button data-qf="${r}" title="Quitar fila">×</button></td></tr>`).join('')}</tbody></table>`;
}
const filaVacia = () => ({ sel: true, copias: 1, v: st.etq.columnas.map(() => '') });
const lz = $('#lienzo');
lz.addEventListener('input', (ev) => {
  if (st.modo !== 'etiquetas' || st.vista !== 'datos') return;
  const d = ev.target.dataset, e = st.etq;
  if (d.r !== undefined) e.filas[+d.r].v[+d.c] = ev.target.value;
  else if (d.cop !== undefined) e.filas[+d.cop].copias = Math.max(1, Math.round(num(ev.target.value, 1)));
  else return;
  pintarEstado(); guardarSesion();
});
lz.addEventListener('change', (ev) => {
  if (st.modo !== 'etiquetas' || st.vista !== 'datos') return;
  const t = ev.target, d = t.dataset, e = st.etq;
  if (d.sel !== undefined) { e.filas[+d.sel].sel = t.checked; pintarCentro(); }
  else if (t.id === 'dTodas') { e.filas.forEach((f) => (f.sel = t.checked)); pintarCentro(); }
  else if (d.col !== undefined) {
    const i = +d.col, viejo = e.columnas[i], nuevo = t.value.trim() || `Columna ${i + 1}`;
    e.columnas[i] = nuevo;
    e.campos.forEach((c) => { if (c.texto) c.texto = c.texto.split(`{${viejo}}`).join(`{${nuevo}}`); });
    t.value = nuevo;
  } else return;
  guardarSesion();
});
lz.addEventListener('click', async (ev) => {
  if (st.modo !== 'etiquetas' || st.vista !== 'datos') return;
  const t = ev.target, d = t.dataset, e = st.etq;
  if (t.id === 'dFila') { e.filas.push(filaVacia()); pintarCentro(); enfocarCelda(e.filas.length - 1, 0); }
  else if (t.id === 'dCol') { e.columnas.push(`Columna ${e.columnas.length + 1}`); e.filas.forEach((f) => f.v.push('')); pintarCentro(); }
  else if (t.id === 'dImportar') $('#ficheroDatos').click();
  else if (t.id === 'dLlenar') {
    const f = e.filas.find((x) => x.sel);
    if (!f) { aviso('Marca primero una fila.'); return; }
    f.copias = Math.max(1, e.hoja.cols * e.hoja.filas - e.usadas.filter(Boolean).length);
    pintarCentro();
  } else if (t.id === 'dVaciar') {
    if (!(await confirmar('¿Borrar todas las filas de datos?', 'Borrar'))) return;
    e.filas = [filaVacia()]; pintarCentro();
  } else if (d.qf !== undefined) { e.filas.splice(+d.qf, 1); if (!e.filas.length) e.filas.push(filaVacia()); pintarCentro(); }
  else if (d.qc !== undefined) {
    if (e.columnas.length <= 1) { aviso('Tiene que quedar al menos una columna.'); return; }
    const i = +d.qc; e.columnas.splice(i, 1); e.filas.forEach((f) => f.v.splice(i, 1)); pintarCentro();
  } else return;
  guardarSesion();
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
  pintarCentro(); guardarSesion(); aviso(`${m.length} fila(s) pegadas.`);
});
function enfocarCelda(r, c) { const i = $(`#lienzo input[data-r="${r}"][data-c="${c}"]`); if (i) i.focus(); }

function analizarCSV(txt) {
  const primera = txt.split(/\r?\n/, 1)[0];
  const sep = [';', '\t', ','].map((s) => [s, primera.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const filas = []; let fila = [], campo = '', comillas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (comillas) {
      if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else comillas = false; } else campo += ch;
    } else if (ch === '"') comillas = true;
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
  const ancho = Math.max(...m.map((f) => f.length));
  const e = st.etq;
  e.columnas = Array.from({ length: ancho }, (_, i) => m[0][i] || `Columna ${i + 1}`);
  e.filas = m.slice(1).map((f) => ({ sel: true, copias: 1, v: Array.from({ length: ancho }, (_, i) => f[i] ?? '') }));
  if (!e.filas.length) e.filas = [filaVacia()];
  st.pag = 0;
  pintarTodo(); guardarSesion();
  aviso(`${m.length - 1} fila(s) importadas. La primera línea del archivo se usa como nombres de columna.`, false, 5000);
}
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
$('#ficheroImagen').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const img = await reducirImagen(await leerDataURL(f), 1200, 'image/png');
    const e = st.etq, alto = Math.min(e.hoja.etqAlto - 4, 20);
    st.vista = 'diseno';
    const c = { id: uid(), tipo: 'imagen', src: img.src, x: 2, y: 2, w: r5(alto * img.ancho / img.alto), h: r5(alto) };
    e.campos.push(c); st.sel = c.id; pintarTodo(); guardarSesion();
  } catch (e) { aviso('No se pudo abrir la imagen.', true); }
});

/* ---------- Impresos ---------- */
function pintarImpreso(l) {
  const i = st.imp;
  montarEditor(l, i.hoja.ancho, i.hoja.alto, i.campos, {
    fondo: i.fondo, opFondo: i.opFondo,
    alDobleClic: (x, y) => anadirCampo(i.campos, { x, y: Math.max(0, y - 3), w: Math.max(20, Math.min(70, i.hoja.ancho - x - 5)), h: 6, tam: 11, texto: '' }),
  });
}
function leerDataURL(f) {
  return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(f); });
}
function cargarImg(src) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('imagen no válida')); i.src = src; });
}
/* Devuelve la imagen (reducida si es enorme) junto con su tamaño ORIGINAL en píxeles. */
async function reducirImagen(src, maximo, tipo = 'image/jpeg', giro = 0) {
  const i = await cargarImg(src);
  const ancho = i.naturalWidth, alto = i.naturalHeight;
  const k = Math.min(1, maximo / Math.max(ancho, alto));
  if (k === 1 && !giro && src.length < 3_000_000) return { src, ancho, alto };
  const w = Math.round(ancho * k), h = Math.round(alto * k);
  const cv = document.createElement('canvas');
  cv.width = giro ? h : w; cv.height = giro ? w : h;
  const g = cv.getContext('2d');
  if (tipo === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); }
  if (giro) { g.translate(cv.width, 0); g.rotate(Math.PI / 2); }
  g.drawImage(i, 0, 0, w, h);
  return { src: cv.toDataURL(tipo, 0.85), ancho: giro ? alto : ancho, alto: giro ? ancho : alto };
}
/* mmAncho/mmAlto: tamaño real si se conoce (escáner o PDF); si no, se ajusta a la hoja. */
async function ponerFondo(src, mmAncho, mmAlto) {
  const img = await reducirImagen(src, 2600);
  const i = st.imp;
  i.fondo = { src: img.src, x: 0, y: 0, w: 0, h: 0, pxA: img.ancho, pxH: img.alto };
  if (mmAncho && mmAlto) { i.fondo.w = +mmAncho.toFixed(1); i.fondo.h = +mmAlto.toFixed(1); }
  else ajustarFondo();
  pintarTodo(); guardarSesion();
}
function ajustarFondo() {
  const i = st.imp, f = i.fondo; if (!f) return;
  const prop = f.pxH / f.pxA;
  let w = i.hoja.ancho, h = w * prop;
  if (h > i.hoja.alto * 1.01) { h = i.hoja.alto; w = h / prop; }
  f.x = 0; f.y = 0; f.w = +w.toFixed(1); f.h = +h.toFixed(1);
}
async function girarFondo() {
  const f = st.imp.fondo; if (!f) return;
  const g = await reducirImagen(f.src, 2600, 'image/jpeg', 1);
  st.imp.fondo = { src: g.src, x: f.x, y: f.y, w: f.h, h: f.w, pxA: g.ancho, pxH: g.alto };
  pintarTodo(); guardarSesion();
}
$('#ficheroFondo').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  const a = aviso('Abriendo…', false, 60000);
  try {
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
      const pdfjs = await import('./lib/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('lib/pdf.worker.min.mjs', location.href).href;
      const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
      const pag = await doc.getPage(1);
      const base = pag.getViewport({ scale: 1 }); // en puntos (1/72 de pulgada)
      const vp = pag.getViewport({ scale: 200 / 72 });
      const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await pag.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      const mmA = base.width / 72 * 25.4, mmH = base.height / 72 * 25.4;
      st.imp.hoja = { ancho: Math.round(mmA), alto: Math.round(mmH) };
      await ponerFondo(cv.toDataURL('image/jpeg', 0.85), mmA, mmH);
      if (doc.numPages > 1) aviso('El PDF tiene varias páginas: se ha abierto la primera.', false, 5000);
    } else {
      await ponerFondo(await leerDataURL(f));
    }
  } catch (e) {
    aviso(location.protocol === 'file:' && /\.pdf$/i.test(f.name)
      ? 'Los PDF se abren en el programa instalado; en esta vista de prueba usa una imagen.'
      : 'No se pudo abrir el archivo: ' + (e.message || e), true, 7000);
  } finally { a.remove(); }
});

/* ---------- Escáner (solo en el programa instalado) ---------- */
async function cargarEscaneres(forzar) {
  const s = $('#selEscaner'); if (!s) return;
  if (!st.escaneres || forzar) {
    try {
      const txt = await invoke('listar_escaneres');
      const j = txt.trim() ? JSON.parse(txt) : [];
      st.escaneres = Array.isArray(j) ? j : [j];
    } catch (e) { st.escaneres = []; aviso('No se pudo consultar los escáneres: ' + e, true, 6000); }
  }
  const s2 = $('#selEscaner'); if (!s2) return;
  s2.innerHTML = st.escaneres.length
    ? st.escaneres.map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('')
    : '<option value="">No se ha encontrado ningún escáner</option>';
  const ult = localStorage.getItem('esc:escaner');
  if (ult && st.escaneres.some((x) => x.id === ult)) s2.value = ult;
}
async function escanear() {
  const id = $('#selEscaner').value, ppp = +$('#selPpp').value;
  if (!id) { await cargarEscaneres(true); if (!$('#selEscaner').value) { aviso('No hay ningún escáner conectado. Enciéndelo y vuelve a pulsar Escanear.', true, 6000); return; } }
  const b = $('#btnEscanear'); b.disabled = true;
  const a = aviso('Escaneando… coloca la hoja boca abajo en el cristal.', false, 180000);
  try {
    localStorage.setItem('esc:escaner', $('#selEscaner').value);
    const b64 = await invoke('escanear', { id: $('#selEscaner').value, ppp, color: true });
    const src = 'data:image/jpeg;base64,' + b64.trim();
    const i = await cargarImg(src);
    await ponerFondo(src, i.naturalWidth / ppp * 25.4, i.naturalHeight / ppp * 25.4);
    aviso('Hoja escaneada. Haz doble clic donde quieras escribir.');
  } catch (e) { aviso('No se pudo escanear: ' + e, true, 8000); }
  finally { a.remove(); const b2 = $('#btnEscanear'); if (b2) b2.disabled = false; }
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
  const cont = $('#impresion'); cont.innerHTML = '';
  let ancho, alto;
  if (st.modo === 'etiquetas') {
    const e = st.etq; ancho = e.hoja.ancho; alto = e.hoja.alto;
    const pags = paginar(e).filter((pg) => pg.some(Boolean));
    if (!pags.length) { aviso('No hay ninguna etiqueta marcada para imprimir. Revisa la pestaña Datos.', true); return; }
    if (!e.campos.length) { aviso('La etiqueta está vacía: añade algún texto en Diseño.', true); return; }
    pags.forEach((pg) => { const { p, capa } = paginaImp(ancho, alto, e.ajusteX, e.ajusteY); capa.append(contenidoHoja(e, pg, false)); cont.append(p); });
  } else {
    const i = st.imp; ancho = i.hoja.ancho; alto = i.hoja.alto;
    const conTexto = i.campos.filter((c) => (c.texto || '').trim() !== '');
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

/* ---------- Guardar y abrir trabajos ---------- */
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
  const a = actual();
  let n = await pedirTexto('Nombre para guardar este trabajo', a.nombre || '');
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
async function abrir() {
  let lista = [];
  try { lista = await almacen.listar(); } catch (e) { aviso('No se pudo leer la lista: ' + e, true); return; }
  const d = dialogo(`<h2>Abrir un trabajo guardado</h2>
    ${lista.length ? `<div class="lista">${lista.map((n) => `<div class="item"><span class="nom">${esc(n)}</span><button class="mini" data-abrir="${esc(n)}">Abrir</button><button class="mini peligro" data-borrar="${esc(n)}">Borrar</button></div>`).join('')}</div>`
    : '<p class="nota">Todavía no has guardado ningún trabajo.</p>'}
    <div class="pie"><button data-cerrar="1">Cerrar</button></div>`);
  d.onclick = async (ev) => {
    const t = ev.target.dataset;
    if (t.cerrar) d.close();
    else if (t.abrir) {
      try {
        const o = JSON.parse(await almacen.leer(t.abrir));
        if (!o || !o.hoja || !Array.isArray(o.campos)) throw new Error('el archivo no es de Escaneator');
        if (o.tipo === 'impresos') { st.imp = { ...nuevoImp(), ...o }; st.modo = 'impresos'; }
        else { st.etq = { ...nuevoEtq(), ...o }; st.modo = 'etiquetas'; st.vista = 'diseno'; }
        st.sel = null; st.pag = 0; st.zf = 1;
        d.close(); pintarTodo(); guardarSesion();
      } catch (e) { aviso('No se pudo abrir: ' + (e.message || e), true, 6000); }
    } else if (t.borrar) {
      const n = t.borrar;
      if (await confirmar(`¿Borrar «${n}»? No se puede deshacer.`, 'Borrar')) { try { await almacen.borrar(n); } catch (e) { aviso('No se pudo borrar: ' + e, true); } }
      abrir();
    }
  };
}

/* ---------- Cabecera ---------- */
$('#modos').addEventListener('click', (ev) => {
  const m = ev.target.dataset.modo; if (!m || m === st.modo) return;
  st.modo = m; st.sel = null; st.zf = 1; pintarTodo(); guardarSesion();
});
$('#subtabs').addEventListener('click', (ev) => {
  const v = ev.target.dataset.v; if (!v) return;
  st.vista = v; st.sel = null; st.zf = 1; pintarTodo();
});
$('#btnImprimir').onclick = imprimir;
$('#btnGuardar').onclick = guardar;
$('#btnAbrir').onclick = abrir;
$('#btnNuevo').onclick = async () => {
  const que = st.modo === 'etiquetas' ? 'unas etiquetas nuevas' : 'un impreso nuevo';
  if (!(await confirmar(`¿Empezar ${que}? Lo que no hayas guardado se pierde.`, 'Empezar'))) return;
  if (st.modo === 'etiquetas') { st.etq = nuevoEtq(); st.vista = 'diseno'; } else st.imp = nuevoImp();
  st.sel = null; st.pag = 0; st.zf = 1; pintarTodo(); guardarSesion();
};
$('#zMas').onclick = () => { st.zf = Math.min(6, st.zf * 1.25); pintarCentro(); };
$('#zMenos').onclick = () => { st.zf = Math.max(0.25, st.zf / 1.25); pintarCentro(); };
$('#zAjustar').onclick = () => { st.zf = 1; pintarCentro(); };
let tRes = null;
window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(pintarCentro, 120); });

cargarSesion();
pintarTodo();
