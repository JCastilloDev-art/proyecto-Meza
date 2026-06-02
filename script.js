/* script.js - Veterinaria */

const MODO_SIMULACION = false; // true = demo sin PHP
const API_URL = 'api/index.php';

// ── Navegación ───────────────────────────────────────────────────

function entrar() {
  document.getElementById('portada').style.display = 'none';
  document.getElementById('sistema').style.display = 'block';
}

function salir() {
  document.getElementById('sistema').style.display = 'none';
  document.getElementById('portada').style.display = 'block';
}

// Mapa: botón de menú → colección real en MongoDB
const MENU_A_COLECCION = {
  duenos:           'duenos',
  mascotas:         'mascotas',
  veterinarios:     'veterinarios',
  citas:            'citas',
  tratamientos:     'tratamientos',
  clientes:         'clientes',
  mascotas_detalle: 'mascotas_detalle',
  vets_detalle:     'veterinarios_detalle',
  trat_detalle:     'tratamientos_detalle',
  citas_detalle:    'citas_detalle',
  expedientes:      'expedientes_clinicos',
};

function ver(id) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('activa'));
  document.getElementById('sec-' + id).classList.add('activa');

  const coleccion = MENU_A_COLECCION[id];
  if (coleccion) listar(coleccion);
}

// ── Guardar ──────────────────────────────────────────────────────

function guardar(event, coleccion) {
  event.preventDefault();
  const form  = event.target;
  const datos = {};

  for (const campo of form.elements) {
    if (!campo.name || campo.value === '') continue;
    if (campo.value === 'true')  { datos[campo.name] = true;  continue; }
    if (campo.value === 'false') { datos[campo.name] = false; continue; }
    datos[campo.name] = campo.value;
  }

  const log = document.getElementById('log-' + coleccion);

  if (MODO_SIMULACION) {
    agregarLog(log, '[Demo] ' + coleccion + ': ' + JSON.stringify(datos));
    form.reset();
    return;
  }

  fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ coleccion, documento: datos })
  })
  .then(r => r.json())
  .then(json => {
    if (json.ok) {
      agregarLog(log, '✔ Guardado: ' + JSON.stringify(datos));
      form.reset();
      listar(coleccion); // refresca la tabla
    } else {
      agregarLog(log, 'Error: ' + json.error, true);
    }
  })
  .catch(e => agregarLog(log, 'Error de conexión: ' + e.message, true));
}

// ── Listar ───────────────────────────────────────────────────────

function listar(coleccion) {
  const tablaId = 'tabla-' + coleccion;
  const tabla   = document.getElementById(tablaId);
  if (!tabla) return; // sección no tiene tabla aún

  if (MODO_SIMULACION) {
    tabla.innerHTML = '<caption>Modo simulación – sin datos reales</caption>';
    return;
  }

  fetch(API_URL + '?action=listar&coleccion=' + encodeURIComponent(coleccion))
  .then(r => r.json())
  .then(json => {
    if (!json.ok) {
      tabla.innerHTML = '<caption style="color:red">Error: ' + json.error + '</caption>';
      return;
    }
    renderTabla(tabla, json.documentos);
  })
  .catch(e => {
    tabla.innerHTML = '<caption style="color:red">Error de conexión: ' + e.message + '</caption>';
  });
}

// ── Renderizar tabla dinámica ────────────────────────────────────

function renderTabla(tabla, docs) {
  if (!docs || docs.length === 0) {
    tabla.innerHTML = '<caption>Sin registros todavía</caption>';
    return;
  }

  // Columnas: todas las llaves excepto _id (la ponemos al final si se quiere omitir)
  const keys = Object.keys(docs[0]).filter(k => k !== '_id');

  let html = '<thead><tr>';
  keys.forEach(k => {
    html += '<th>' + escHtml(k) + '</th>';
  });
  html += '</tr></thead><tbody>';

  docs.forEach(doc => {
    html += '<tr>';
    keys.forEach(k => {
      const val = doc[k];
      html += '<td>' + escHtml(val === null || val === undefined ? '' : String(val)) + '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody>';
  tabla.innerHTML = html;
}

// ── Helpers ──────────────────────────────────────────────────────

function agregarLog(log, msg, esError = false) {
  const p = document.createElement('p');
  p.textContent = msg;
  if (esError) p.className = 'error';
  log.prepend(p);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}