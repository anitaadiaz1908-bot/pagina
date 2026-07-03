/* =========================================================
   Gestión Académica de Estudiantes
   ---------------------------------------------------------
   Toda la información se maneja en memoria mediante un
   arreglo de objetos JavaScript (sin bases de datos ni
   frameworks), tal como exige la actividad.
   ========================================================= */

/* ---------------------------------------------------------
   1. ESTADO DE LA APLICACIÓN
   --------------------------------------------------------- */

/**
 * Arreglo principal de estudiantes.
 * Cada estudiante es un objeto con la forma:
 * {
 *   documento: string,
 *   nombre: string,
 *   programa: string,
 *   nota1: number,
 *   nota2: number,
 *   nota3: number
 * }
 */
let estudiantes = [];

// Documento del estudiante que se está editando (null = modo registro)
let documentoEnEdicion = null;

// Texto actual del buscador (filtra por documento)
let filtroBusqueda = "";

/* ---------------------------------------------------------
   2. REFERENCIAS AL DOM
   --------------------------------------------------------- */

const form = document.getElementById("studentForm");
const inputDocumento = document.getElementById("documento");
const inputNombre = document.getElementById("nombre");
const inputPrograma = document.getElementById("programa");
const inputNota1 = document.getElementById("nota1");
const inputNota2 = document.getElementById("nota2");
const inputNota3 = document.getElementById("nota3");
const inputEditingDocumento = document.getElementById("editingDocumento");

const formTitle = document.getElementById("formTitle");
const formMode = document.getElementById("formMode");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const previewLine = document.getElementById("previewLine");
const previewNota = document.getElementById("previewNota");
const previewEstado = document.getElementById("previewEstado");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");

const tableBody = document.getElementById("tableBody");
const emptyState = document.getElementById("emptyState");
const noResultsState = document.getElementById("noResultsState");

const statTotal = document.getElementById("statTotal");
const statAprobados = document.getElementById("statAprobados");
const statReprobados = document.getElementById("statReprobados");

const toast = document.getElementById("toast");

/* ---------------------------------------------------------
   3. UTILIDADES DE VALIDACIÓN
   --------------------------------------------------------- */

/** Verifica que un texto no esté vacío (quitando espacios). */
function esVacio(valor) {
  return valor === undefined || valor === null || valor.trim() === "";
}

/**
 * Verifica que un valor sea numérico válido (acepta punto o coma decimal).
 * No usamos parseFloat directo para evitar aceptar cosas como "3abc".
 */
function esNumerico(valor) {
  if (esVacio(valor)) return false;
  const normalizado = valor.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(normalizado);
}

/** Convierte un texto de nota a número (soporta coma decimal). */
function aNumero(valor) {
  return parseFloat(valor.trim().replace(",", "."));
}

/** Verifica que una nota esté en el rango permitido [0, 5]. */
function notaEnRango(numero) {
  return numero >= 0 && numero <= 5;
}

/**
 * Valida todo el formulario.
 * Devuelve un objeto { valido: boolean, errores: {campo: mensaje} }
 */
function validarFormulario(datos, documentoOriginal) {
  const errores = {};

  // Documento
  if (esVacio(datos.documento)) {
    errores.documento = "El documento es obligatorio.";
  } else if (!/^\d+$/.test(datos.documento.trim())) {
    errores.documento = "El documento solo debe contener números.";
  } else {
    const yaExiste = estudiantes.some(
      (e) =>
        e.documento === datos.documento.trim() &&
        e.documento !== documentoOriginal
    );
    if (yaExiste) {
      errores.documento = "Ya existe un estudiante con este documento.";
    }
  }

  // Nombre
  if (esVacio(datos.nombre)) {
    errores.nombre = "El nombre completo es obligatorio.";
  } else if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(datos.nombre.trim())) {
    errores.nombre = "El nombre solo debe contener letras.";
  }

  // Programa
  if (esVacio(datos.programa)) {
    errores.programa = "El programa académico es obligatorio.";
  }

  // Notas
  ["nota1", "nota2", "nota3"].forEach((campo, idx) => {
    const valor = datos[campo];
    if (esVacio(valor)) {
      errores[campo] = "La nota es obligatoria.";
    } else if (!esNumerico(valor)) {
      errores[campo] = "Solo se aceptan números.";
    } else if (!notaEnRango(aNumero(valor))) {
      errores[campo] = "La nota debe estar entre 0 y 5.";
    }
  });

  return { valido: Object.keys(errores).length === 0, errores };
}

/** Pinta los mensajes de error en el formulario y resalta campos inválidos. */
function mostrarErrores(errores) {
  const campos = ["documento", "nombre", "programa", "nota1", "nota2", "nota3"];
  campos.forEach((campo) => {
    const input = document.getElementById(campo);
    const spanError = document.getElementById("err-" + campo);
    if (errores[campo]) {
      input.classList.add("invalid");
      spanError.textContent = errores[campo];
    } else {
      input.classList.remove("invalid");
      spanError.textContent = "";
    }
  });
}

/* ---------------------------------------------------------
   4. LÓGICA DE NEGOCIO (cálculos)
   --------------------------------------------------------- */

/** Calcula la nota definitiva (promedio) de un estudiante. */
function calcularNotaDefinitiva(estudiante) {
  const suma = estudiante.nota1 + estudiante.nota2 + estudiante.nota3;
  return Math.round((suma / 3) * 100) / 100; // 2 decimales
}

/** Determina el estado del estudiante según su nota definitiva. */
function calcularEstado(notaDefinitiva) {
  return notaDefinitiva >= 3 ? "Aprobado" : "Reprobado";
}

/* ---------------------------------------------------------
   5. RENDERIZADO
   --------------------------------------------------------- */

function renderTabla() {
  const termino = filtroBusqueda.trim();
  const listaFiltrada = termino
    ? estudiantes.filter((e) => e.documento.includes(termino))
    : estudiantes;

  tableBody.innerHTML = "";

  // Estados vacíos
  emptyState.hidden = estudiantes.length !== 0;
  noResultsState.hidden = !(estudiantes.length > 0 && listaFiltrada.length === 0);

  listaFiltrada.forEach((estudiante) => {
    const notaDefinitiva = calcularNotaDefinitiva(estudiante);
    const estado = calcularEstado(notaDefinitiva);
    const esAprobado = estado === "Aprobado";

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="cell-doc">${escapeHtml(estudiante.documento)}</td>
      <td class="cell-nombre">${escapeHtml(estudiante.nombre)}</td>
      <td class="cell-programa">${escapeHtml(estudiante.programa)}</td>
      <td class="cell-promedio">${notaDefinitiva.toFixed(2)}</td>
      <td><span class="badge ${esAprobado ? "badge-aprobado" : "badge-reprobado"}">${estado}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-action="editar" data-doc="${escapeHtml(estudiante.documento)}">Editar</button>
          <button class="icon-btn danger" data-action="eliminar" data-doc="${escapeHtml(estudiante.documento)}">Eliminar</button>
        </div>
      </td>
    `;
    tableBody.appendChild(fila);
  });

  renderEstadisticas();
}

function renderEstadisticas() {
  const total = estudiantes.length;
  const aprobados = estudiantes.filter(
    (e) => calcularEstado(calcularNotaDefinitiva(e)) === "Aprobado"
  ).length;
  const reprobados = total - aprobados;

  statTotal.textContent = total;
  statAprobados.textContent = aprobados;
  statReprobados.textContent = reprobados;
}

/** Escapa texto para insertarlo de forma segura en el HTML. */
function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

/** Actualiza la vista previa de nota definitiva/estado mientras se escribe. */
function actualizarPreview() {
  const n1 = inputNota1.value.trim();
  const n2 = inputNota2.value.trim();
  const n3 = inputNota3.value.trim();

  if (esNumerico(n1) && esNumerico(n2) && esNumerico(n3)) {
    const promedio =
      Math.round(((aNumero(n1) + aNumero(n2) + aNumero(n3)) / 3) * 100) / 100;
    const estado = calcularEstado(promedio);
    previewLine.hidden = false;
    previewNota.textContent = promedio.toFixed(2);
    previewEstado.textContent = estado;
    previewEstado.className = "badge " + (estado === "Aprobado" ? "badge-aprobado" : "badge-reprobado");
  } else {
    previewLine.hidden = true;
  }
}

/* ---------------------------------------------------------
   6. MODOS DE FORMULARIO (registro / edición)
   --------------------------------------------------------- */

function entrarModoEdicion(documento) {
  const estudiante = estudiantes.find((e) => e.documento === documento);
  if (!estudiante) return;

  documentoEnEdicion = documento;
  inputEditingDocumento.value = documento;

  inputDocumento.value = estudiante.documento;
  inputNombre.value = estudiante.nombre;
  inputPrograma.value = estudiante.programa;
  inputNota1.value = estudiante.nota1;
  inputNota2.value = estudiante.nota2;
  inputNota3.value = estudiante.nota3;

  // El documento no se puede modificar en edición (según requisitos)
  inputDocumento.disabled = true;

  formTitle.textContent = "Editar estudiante";
  formMode.textContent = "MODO · EDICIÓN";
  submitBtn.textContent = "Guardar cambios";
  cancelEditBtn.hidden = false;

  mostrarErrores({});
  actualizarPreview();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function salirModoEdicion() {
  documentoEnEdicion = null;
  inputEditingDocumento.value = "";
  inputDocumento.disabled = false;

  form.reset();
  formTitle.textContent = "Nuevo estudiante";
  formMode.textContent = "MODO · REGISTRO";
  submitBtn.textContent = "Guardar estudiante";
  cancelEditBtn.hidden = true;
  previewLine.hidden = true;

  mostrarErrores({});
}

/* ---------------------------------------------------------
   7. NOTIFICACIONES (toast)
   --------------------------------------------------------- */

let toastTimeout = null;
function mostrarToast(mensaje, tipo = "success") {
  clearTimeout(toastTimeout);
  toast.textContent = mensaje;
  toast.className = "toast show " + tipo;
  toastTimeout = setTimeout(() => {
    toast.className = "toast";
  }, 2600);
}

/* ---------------------------------------------------------
   8. MANEJADORES DE EVENTOS
   --------------------------------------------------------- */

// Envío del formulario (crear o actualizar)
form.addEventListener("submit", function (evento) {
  evento.preventDefault();

  const datos = {
    documento: inputDocumento.value,
    nombre: inputNombre.value,
    programa: inputPrograma.value,
    nota1: inputNota1.value,
    nota2: inputNota2.value,
    nota3: inputNota3.value,
  };

  const { valido, errores } = validarFormulario(datos, documentoEnEdicion);
  mostrarErrores(errores);

  if (!valido) {
    mostrarToast("Revisa los campos marcados en rojo.", "error");
    return;
  }

  const estudianteProcesado = {
    documento: datos.documento.trim(),
    nombre: datos.nombre.trim(),
    programa: datos.programa.trim(),
    nota1: aNumero(datos.nota1),
    nota2: aNumero(datos.nota2),
    nota3: aNumero(datos.nota3),
  };

  if (documentoEnEdicion) {
    // Actualizar estudiante existente
    const indice = estudiantes.findIndex((e) => e.documento === documentoEnEdicion);
    if (indice !== -1) {
      estudiantes[indice] = estudianteProcesado;
      mostrarToast("Estudiante actualizado correctamente.");
    }
  } else {
    // Registrar nuevo estudiante
    estudiantes.push(estudianteProcesado);
    mostrarToast("Estudiante registrado correctamente.");
  }

  salirModoEdicion();
  renderTabla();
});

// Cancelar edición
cancelEditBtn.addEventListener("click", salirModoEdicion);

// Vista previa en vivo de nota definitiva
[inputNota1, inputNota2, inputNota3].forEach((input) => {
  input.addEventListener("input", actualizarPreview);
});

// Delegación de eventos para botones Editar / Eliminar en la tabla
tableBody.addEventListener("click", function (evento) {
  const boton = evento.target.closest("button[data-action]");
  if (!boton) return;

  const documento = boton.dataset.doc;
  const accion = boton.dataset.action;

  if (accion === "editar") {
    entrarModoEdicion(documento);
  } else if (accion === "eliminar") {
    const estudiante = estudiantes.find((e) => e.documento === documento);
    const confirmado = confirm(
      `¿Eliminar el registro de "${estudiante ? estudiante.nombre : documento}"? Esta acción no se puede deshacer.`
    );
    if (confirmado) {
      estudiantes = estudiantes.filter((e) => e.documento !== documento);
      if (documentoEnEdicion === documento) salirModoEdicion();
      renderTabla();
      mostrarToast("Estudiante eliminado.", "success");
    }
  }
});

// Búsqueda por documento
searchInput.addEventListener("input", function () {
  filtroBusqueda = searchInput.value;
  renderTabla();
});

clearSearchBtn.addEventListener("click", function () {
  searchInput.value = "";
  filtroBusqueda = "";
  renderTabla();
});

/* ---------------------------------------------------------
   9. DATOS DE EJEMPLO (opcional, facilita la demostración)
   --------------------------------------------------------- */

function cargarDatosDeEjemplo() {
  estudiantes = [
    {
      documento: "1020304050",
      nombre: "Laura Gómez Pérez",
      programa: "Ingeniería de Software",
      nota1: 4.5,
      nota2: 3.8,
      nota3: 4.0,
    },
    {
      documento: "1030405060",
      nombre: "Carlos Ramírez Silva",
      programa: "Administración de Empresas",
      nota1: 2.5,
      nota2: 2.9,
      nota3: 3.1,
    },
  ];
}

/* ---------------------------------------------------------
   10. INICIALIZACIÓN
   --------------------------------------------------------- */

cargarDatosDeEjemplo();
renderTabla();
