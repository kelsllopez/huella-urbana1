// panel_moderador.js - Funcionalidad completa del panel de moderación

document.addEventListener('DOMContentLoaded', function() {
    inicializarFiltros();
    inicializarEventListeners();
    inicializarFiltrosDesdeURL();
});

// ========================================
// VARIABLES GLOBALES
// ========================================

let currentFilters = {
    status: 'pendiente',
    severity: 'all',
    animal: 'all',
    anonymous: 'all'
};

const filterLabels = {
    status: {
        'pendiente': { label: 'Pendientes', icon: 'fa-clock' },
        'aprobado': { label: 'Aprobados', icon: 'fa-check-circle' },
        'rechazado': { label: 'Rechazados', icon: 'fa-times-circle' },
        'all': { label: 'Todos los estados', icon: 'fa-list' }
    },
    severity: {
        'grave': { label: 'Graves', icon: 'fa-exclamation-triangle' },
        'moderado': { label: 'Moderados', icon: 'fa-exclamation-circle' },
        'leve': { label: 'Leves', icon: 'fa-info-circle' },
        'all': { label: 'Todas las gravedades', icon: 'fa-list' }
    },
    animal: {
        'perro': { label: 'Perros', icon: 'fa-dog' },
        'gato': { label: 'Gatos', icon: 'fa-cat' },
        'otro': { label: 'Otros', icon: 'fa-paw' },
        'all': { label: 'Todos los animales', icon: 'fa-list' }
    },
    anonymous: {
        'true': { label: 'Sí (Anónimo)', icon: 'fa-user-secret' },
        'false': { label: 'No (Con datos)', icon: 'fa-user' },
        'all': { label: 'Todos', icon: 'fa-list' }
    }
};

// ========================================
// INICIALIZACIÓN
// ========================================

function inicializarFiltros() {
    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));
        }
    });

    // Configurar botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.closest('.filter-dropdown');
            const wasOpen = dropdown.classList.contains('open');
            
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));
            
            if (!wasOpen) {
                dropdown.classList.add('open');
            }
        });
    });

    // Configurar opciones de filtro
    document.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const filterType = this.dataset.status || this.dataset.severity || this.dataset.animal || this.dataset.anonymous;
            const filterValue = this.dataset.status || this.dataset.severity || this.dataset.animal || this.dataset.anonymous;
            const label = this.dataset.label;
            const icon = this.dataset.icon;
            
            let type;
            if (this.dataset.status !== undefined) type = 'status';
            else if (this.dataset.severity !== undefined) type = 'severity';
            else if (this.dataset.animal !== undefined) type = 'animal';
            else if (this.dataset.anonymous !== undefined) type = 'anonymous';
            
            selectFilter(type, filterValue, label, icon);
        });
    });
}

function inicializarFiltrosDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const estado = urlParams.get('estado');
    const gravedad = urlParams.get('gravedad');
    const animal = urlParams.get('animal');
    const anonimo = urlParams.get('anonimo');
    
    if (estado) currentFilters.status = estado;
    if (gravedad) currentFilters.severity = gravedad;
    if (animal) currentFilters.animal = animal;
    if (anonimo) currentFilters.anonymous = anonimo;
    
    updateFilterUI();
}

function inicializarEventListeners() {
    // Event listeners para botones de acción en reportes (delegación de eventos)
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;
        
        const action = target.dataset.action;
        const reporteId = target.dataset.reporteId;
        
        if (!action || !reporteId) return;
        
        switch(action) {
            case 'aprobar':
                aprobar(reporteId);
                break;
            case 'rechazar':
                rechazar(reporteId);
                break;
            case 'ver-detalles':
                verDetalles(reporteId);
                break;
            case 'eliminar':
                const titulo = target.dataset.reporteTitulo || 'Sin título';
                eliminarReporte(reporteId, titulo);
                break;
            case 'censurar-todas':
                censurarTodasFotos(reporteId);
                break;
            case 'aprobar-todas':
                aprobarTodasFotos(reporteId);
                break;
            case 'ocultar-todas':
                ocultarTodasFotos(reporteId);
                break;
        }
    });
    
    // Event listeners para tabs en el modal
    document.addEventListener('click', function(e) {
        const tabButton = e.target.closest('.tab-button');
        if (tabButton && tabButton.dataset.tab) {
            switchTab(tabButton, tabButton.dataset.tab);
        }
    });
    
    // Event listeners para fotos
    document.addEventListener('click', function(e) {
        const photoCard = e.target.closest('.photo-card');
        if (photoCard) {
            const url = photoCard.dataset.fotoUrl;
            const esCensurada = photoCard.dataset.fotoCensurada === 'true';
            const visibilidad = photoCard.dataset.fotoVisibilidad;
            
            if (url) {
                showImageModal(url, esCensurada, visibilidad);
            }
        }
    });
}

// ========================================
// FUNCIONES DE FILTROS
// ========================================

function updateFilterUI() {
    updateDropdownUI('statusFilter', 'status', currentFilters.status);
    updateDropdownUI('severityFilter', 'severity', currentFilters.severity);
    updateDropdownUI('animalFilter', 'animal', currentFilters.animal);
    updateDropdownUI('anonymousFilter', 'anonymous', currentFilters.anonymous);
}

function updateDropdownUI(dropdownId, filterType, value) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const button = dropdown.querySelector('.filter-btn');
    const config = filterLabels[filterType][value];
    
    if (config) {
        button.querySelector('.filter-btn-content').innerHTML = `
            <i class="fas ${config.icon}"></i>
            ${config.label}
        `;
        
        if (value !== 'all') {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
    
    dropdown.querySelectorAll('.filter-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    let dataAttr;
    if (filterType === 'status') dataAttr = 'data-status';
    else if (filterType === 'severity') dataAttr = 'data-severity';
    else if (filterType === 'animal') dataAttr = 'data-animal';
    else if (filterType === 'anonymous') dataAttr = 'data-anonymous';
    
    const selectedOption = dropdown.querySelector(`[${dataAttr}="${value}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

function selectFilter(type, value, label, icon) {
    currentFilters[type] = value;
    
    const dropdown = document.getElementById(type + 'Filter');
    if (!dropdown) return;
    
    const button = dropdown.querySelector('.filter-btn');
    
    button.querySelector('.filter-btn-content').innerHTML = `
        <i class="fas ${icon}"></i>
        ${label}
    `;
    
    if (value !== 'all') {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
    
    dropdown.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('selected'));
    
    let dataAttr;
    if (type === 'status') dataAttr = 'data-status';
    else if (type === 'severity') dataAttr = 'data-severity';
    else if (type === 'animal') dataAttr = 'data-animal';
    else if (type === 'anonymous') dataAttr = 'data-anonymous';
    
    const selectedOption = dropdown.querySelector(`[${dataAttr}="${value}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    dropdown.classList.remove('open');
    
    applyFilters();
}

function applyFilters() {
    const params = new URLSearchParams();
    
    if (currentFilters.status !== 'all') {
        params.set('estado', currentFilters.status);
    }
    
    if (currentFilters.severity !== 'all') {
        params.set('gravedad', currentFilters.severity);
    }
    
    if (currentFilters.animal !== 'all') {
        params.set('animal', currentFilters.animal);
    }
    
    if (currentFilters.anonymous !== 'all') {
        params.set('anonimo', currentFilters.anonymous);
    }
    
    window.location.search = params.toString();
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function getCSRFToken() {
    return getCookie('csrftoken');
}

// ========================================
// FUNCIONES DE ACCIONES DE REPORTES
// ========================================

function aprobar(id) {
    Swal.fire({
        title: "¿Aprobar este reporte?",
        text: "El reporte será publicado en el mapa público.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10B981",
        cancelButtonColor: "#6B7280",
        confirmButtonText: '<i class="fas fa-check"></i> Sí, aprobar',
        cancelButtonText: 'Cancelar'
    }).then(result => {
        if (result.isConfirmed) {
            fetch(`/aprobar/${id}/`)
                .then(res => res.json())
                .then(data => {
                    Swal.fire({
                        title: "¡Aprobado!",
                        text: data.mensaje,
                        icon: "success",
                        confirmButtonColor: "#8B5CF6"
                    }).then(() => location.reload());
                })
                .catch(error => {
                    Swal.fire({
                        title: "Error",
                        text: "Ocurrió un error al aprobar el reporte",
                        icon: "error",
                        confirmButtonColor: "#8B5CF6"
                    });
                });
        }
    });
}

function rechazar(id) {
    Swal.fire({
        title: "¿Rechazar este reporte?",
        input: "textarea",
        inputLabel: "Motivo del rechazo (obligatorio)",
        inputPlaceholder: "Escribe el motivo...",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        cancelButtonColor: "#6B7280",
        confirmButtonText: '<i class="fas fa-times"></i> Rechazar',
        cancelButtonText: 'Cancelar',
        inputValidator: v => !v && "Debes ingresar un motivo"
    }).then(result => {
        if (result.isConfirmed) {
            fetch(`/rechazar/${id}/`, {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCSRFToken(),
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({motivo: result.value})
            })
                .then(res => res.json())
                .then(data => {
                    Swal.fire({
                        title: "Rechazado",
                        text: data.mensaje,
                        icon: "info",
                        confirmButtonColor: "#8B5CF6"
                    }).then(() => location.reload());
                })
                .catch(error => {
                    Swal.fire({
                        title: "Error",
                        text: "Ocurrió un error al rechazar el reporte",
                        icon: "error",
                        confirmButtonColor: "#8B5CF6"
                    });
                });
        }
    });
}

function eliminarReporte(id, titulo) {
    Swal.fire({
        title: '⚠️ ¿Eliminar Reporte Permanentemente?',
        html: `
            <div style="text-align: left; padding: 10px;">
                <p style="margin-bottom: 15px;"><strong>Reporte:</strong> ${titulo}</p>
                <p style="color: #DC2626; font-weight: 600; margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Esta acción NO se puede deshacer
                </p>
                <p style="font-size: 0.9rem; color: #6B7280;">
                    El reporte y todas sus fotos serán eliminados permanentemente.
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '<i class="fas fa-trash-alt"></i> Sí, Eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/eliminar-reporte/${id}/`, {
                method: 'POST',
                headers: {'X-CSRFToken': getCSRFToken()}
            })
            .then(res => res.json())
            .then(data => {
                Swal.fire({
                    title: '✅ Reporte Eliminado',
                    text: data.mensaje,
                    icon: 'success',
                    confirmButtonColor: '#8B5CF6'
                }).then(() => location.reload());
            })
            .catch(error => {
                Swal.fire({
                    title: "Error",
                    text: "Ocurrió un error al eliminar el reporte",
                    icon: "error",
                    confirmButtonColor: "#8B5CF6"
                });
            });
        }
    });
}

// ========================================
// FUNCIONES DE FOTOS
// ========================================

function censurarTodasFotos(reporteId) {
    Swal.fire({
        title: '🔒 ¿Censurar TODAS las fotos?',
        text: `Todas las fotos de este reporte serán marcadas como contenido sensible y ocultadas del público.`,
        input: 'text',
        inputLabel: 'Motivo (opcional)',
        inputPlaceholder: 'Ej: Contiene imágenes sensibles',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#F59E0B',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '<i class="fas fa-eye-slash"></i> Sí, Censurar TODAS',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/reporte/${reporteId}/censurar-todas-fotos/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    motivo: result.value || 'Contenido sensible'
                })
            })
            .then(res => res.json())
            .then(data => {
                Swal.fire({
                    title: '✅ Fotos Censuradas',
                    text: data.mensaje,
                    icon: 'success',
                    confirmButtonColor: '#8B5CF6',
                    timer: 1500
                }).then(() => location.reload());
            })
            .catch(error => {
                Swal.fire({
                    title: "Error",
                    text: "Ocurrió un error al censurar las fotos",
                    icon: "error",
                    confirmButtonColor: "#8B5CF6"
                });
            });
        }
    });
}

function aprobarTodasFotos(reporteId) {
    Swal.fire({
        title: '👁️ ¿Aprobar TODAS las fotos?',
        text: `Todas las fotos de este reporte serán visibles públicamente.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '<i class="fas fa-eye"></i> Sí, Aprobar TODAS',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/reporte/${reporteId}/aprobar-todas-fotos/`, {
                method: 'POST',
                headers: {'X-CSRFToken': getCSRFToken()}
            })
            .then(res => res.json())
            .then(data => {
                Swal.fire({
                    title: '✅ Fotos Aprobadas',
                    text: data.mensaje,
                    icon: 'success',
                    confirmButtonColor: '#8B5CF6',
                    timer: 1500
                }).then(() => location.reload());
            })
            .catch(error => {
                Swal.fire({
                    title: "Error",
                    text: "Ocurrió un error al aprobar las fotos",
                    icon: "error",
                    confirmButtonColor: "#8B5CF6"
                });
            });
        }
    });
}

function ocultarTodasFotos(reporteId) {
    Swal.fire({
        title: '🚫 ¿Ocultar TODAS las fotos?',
        text: `Todas las fotos de este reporte serán completamente ocultadas.`,
        input: 'text',
        inputLabel: 'Motivo (opcional)',
        inputPlaceholder: 'Ej: Imágenes inapropiadas',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '<i class="fas fa-ban"></i> Sí, Ocultar TODAS',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/reporte/${reporteId}/ocultar-todas-fotos/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    motivo: result.value || 'Ocultadas por moderador'
                })
            })
            .then(res => res.json())
            .then(data => {
                Swal.fire({
                    title: '✅ Fotos Ocultadas',
                    text: data.mensaje,
                    icon: 'success',
                    confirmButtonColor: '#8B5CF6',
                    timer: 1500
                }).then(() => location.reload());
            })
            .catch(error => {
                Swal.fire({
                    title: "Error",
                    text: "Ocurrió un error al ocultar las fotos",
                    icon: "error",
                    confirmButtonColor: "#8B5CF6"
                });
            });
        }
    });
}

function showImageModal(src, esCensurada = false, visibilidad = 'visible') {
    const esCensuradaEfectiva = esCensurada || visibilidad === 'censurada' || visibilidad === 'oculta';
    
    if (esCensuradaEfectiva) {
        Swal.fire({
            title: '⚠️ Imagen Censurada/Oculta',
            text: 'Esta imagen ha sido marcada como contenido sensible u ocultada.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#F59E0B',
            cancelButtonColor: '#6B7280',
            confirmButtonText: '<i class="fas fa-eye"></i> Ver de todas formas',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                mostrarImagen(src);
            }
        });
    } else {
        mostrarImagen(src);
    }
}

function mostrarImagen(src) {
    Swal.fire({
        imageUrl: src,
        imageAlt: 'Evidencia fotográfica',
        showConfirmButton: false,
        showCloseButton: true,
        width: "900px",
        background: '#000',
        backdrop: 'rgba(0,0,0,0.9)',
        customClass: {
            popup: 'swal-image-popup'
        }
    });
}

// ========================================
// FUNCIONES DEL MODAL DE DETALLES
// ========================================

function switchTab(button, tabId) {
    // Remover clase active de todos los botones
    const tabContainer = button.closest('.tabs-container');
    if (tabContainer) {
        tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    } else {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    }
    
    button.classList.add('active');
    
    // Remover clase active de todos los contenidos
    const modalContent = button.closest('.modal-premium');
    if (modalContent) {
        modalContent.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const targetTab = modalContent.querySelector(`#${tabId}`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }
}

function verDetalles(id) {
    fetch(`/detalles/${id}/`)
        .then(res => res.json())
        .then(data => {
            const template = document.getElementById('modalDetallesTemplate');
            const modalHTML = template.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = modalHTML;

            // Llenar datos básicos
            tempDiv.querySelector('#modal-titulo').textContent = data.titulo || 'Sin título';
            tempDiv.querySelector('#modal-fecha').textContent = `${data.fecha} ${data.hora ? '- ' + data.hora : ''}`;

            // Tab Incidente
            tempDiv.querySelector('#modal-tipo-animal').textContent = data.tipo_animal || "No especificado";
            tempDiv.querySelector('#modal-cantidad-perros').textContent = data.cantidad_perros || "Sin dato";
            tempDiv.querySelector('#modal-gravedad').textContent = data.gravedad || "Sin dato";
            tempDiv.querySelector('#modal-direccion').textContent = data.direccion || "No indicada";

            // Tab Reportante
            tempDiv.querySelector('#modal-nombre').textContent = 
                data.nombre_reportante && data.nombre_reportante.trim() !== "" ? data.nombre_reportante : "Anónimo";
            tempDiv.querySelector('#modal-email').textContent = 
                data.email_reportante && data.email_reportante.trim() !== "" ? data.email_reportante : "No proporcionado";
            tempDiv.querySelector('#modal-telefono').textContent = 
                data.telefono_reportante && data.telefono_reportante.trim() !== "" ? data.telefono_reportante : "No proporcionado";
            tempDiv.querySelector('#modal-anonimo').textContent = data.anonimo ? "Sí" : "No";
            tempDiv.querySelector('#modal-usuario').textContent = data.usuario ? data.usuario : "No asociado";

            // Tab Ubicación
            tempDiv.querySelector('#modal-ciudad').textContent = data.ciudad || "No especificada";
            tempDiv.querySelector('#modal-direccion-ubicacion').textContent = data.direccion || "No indicada";
            tempDiv.querySelector('#modal-pais').textContent = data.pais || "Chile";
            tempDiv.querySelector('#modal-coordenadas').textContent = 
                data.latitud && data.longitud ? `${data.latitud}, ${data.longitud}` : "Sin coordenadas";
            
            const mapLink = tempDiv.querySelector('#modal-map-link');
            mapLink.href = data.latitud && data.longitud ? 
                `https://www.google.com/maps?q=${data.latitud},${data.longitud}` : "#";

            // Tab Descripción
            tempDiv.querySelector('#modal-descripcion').textContent = 
                data.descripcion && data.descripcion.trim() !== "" ? data.descripcion : "Sin descripción proporcionada";

            Swal.fire({
                html: tempDiv.innerHTML,
                showConfirmButton: true,
                confirmButtonText: '<i class="fas fa-times"></i> Cerrar',
                confirmButtonColor: "#8B5CF6",
                showCloseButton: true,
                width: "90%",
                padding: "0",
                customClass: {
                    popup: "swal-detalles"
                },
                didOpen: () => {
                    // Inicializar tabs en el modal abierto
                    document.querySelectorAll('.swal-detalles .tab-button').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const tabId = this.dataset.tab;
                            if (tabId) {
                                const modalContent = this.closest('.modal-premium');
                                if (modalContent) {
                                    modalContent.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                                    this.classList.add('active');
                                    
                                    modalContent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                                    const targetTab = modalContent.querySelector(`#${tabId}`);
                                    if (targetTab) targetTab.classList.add('active');
                                }
                            }
                        });
                    });
                }
            });
        })
        .catch(error => {
            Swal.fire({
                title: "Error",
                text: "No se pudieron cargar los detalles del reporte",
                icon: "error",
                confirmButtonColor: "#8B5CF6"
            });
        });
}