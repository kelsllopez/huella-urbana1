const reportesCache = {};

const DOM = {
    form: document.getElementById('consultaForm'),
    emailInput: document.getElementById('emailInput'),
    btnConsultar: document.getElementById('btnConsultar'),
    resultadosContainer: document.getElementById('resultadosContainer'),
    resultadosList: document.getElementById('resultadosList'),
    resultsCount: document.getElementById('resultsCount'),
    modalDetalle: document.getElementById('modalDetalle'),
    modalTitulo: document.getElementById('modalTitulo'),
    modalBody: document.getElementById('modalBody'),
    btnCerrarModal: document.getElementById('btnCerrarModal')
};


document.addEventListener('DOMContentLoaded', () => {
    inicializarEventos();
});

function inicializarEventos() {
    if (DOM.form) {
        DOM.form.addEventListener('submit', consultarReportes);
    }
    
    if (DOM.btnCerrarModal) {
        DOM.btnCerrarModal.addEventListener('click', cerrarModal);
    }
    
    if (DOM.modalDetalle) {
        DOM.modalDetalle.addEventListener('click', (e) => {
            if (e.target === DOM.modalDetalle) {
                cerrarModal();
            }
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.modalDetalle?.classList.contains('visible')) {
            cerrarModal();
        }
    });
    
    if (DOM.emailInput) {
        DOM.emailInput.addEventListener('input', validarEmailInput);
    }
}


function validarEmailInput() {
    const email = DOM.emailInput.value.trim();
    const isValid = email.includes('@') && email.includes('.');
    
    if (email.length > 0) {
        DOM.emailInput.classList.toggle('error', !isValid);
    } else {
        DOM.emailInput.classList.remove('error');
    }
    
    return isValid;
}

function validarEmail(email) {
    return email.includes('@') && email.includes('.');
}


async function consultarReportes(event) {
    event.preventDefault();
    
    const email = DOM.emailInput.value.trim();
    
    if (!validarEmail(email)) {
        await Swal.fire({
            icon: 'warning',
            title: 'Email inválido',
            text: 'Por favor ingresa un correo electrónico válido',
            confirmButtonColor: '#8B5CF6'
        });
        DOM.emailInput.focus();
        return;
    }
    
    setLoadingState(true);
    
    try {
        const response = await fetch(window.URLS.consultarAjax, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarResultados(data.reportes, email);
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Ocurrió un error al consultar',
                confirmButtonColor: '#8B5CF6'
            });
        }
    } catch (error) {
        console.error('Error en consulta:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo conectar con el servidor',
            confirmButtonColor: '#8B5CF6'
        });
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    if (isLoading) {
        DOM.btnConsultar.innerHTML = '<span class="spinner-modern"></span><span>Buscando...</span>';
        DOM.btnConsultar.disabled = true;
    } else {
        DOM.btnConsultar.innerHTML = '<i class="fas fa-search"></i><span>Buscar reportes</span>';
        DOM.btnConsultar.disabled = false;
    }
}

function mostrarResultados(reportes, email) {
    if (reportes.length === 0) {
        DOM.resultadosList.innerHTML = crearEmptyState(email);
        DOM.resultsCount.textContent = '0 reportes';
    } else {
        DOM.resultadosList.innerHTML = reportes.map(crearCardReporte).join('');
        DOM.resultsCount.textContent = `${reportes.length} reporte${reportes.length > 1 ? 's' : ''}`;
    }
    
    DOM.resultadosContainer.classList.add('visible');
    DOM.resultadosContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function crearEmptyState(email) {
    return `
        <div class="empty-state-modern">
            <i class="fas fa-inbox"></i>
            <h3>No se encontraron reportes</h3>
            <p>No hay reportes asociados a <strong>${email}</strong>. ¿Reportaste de forma anónima? Los reportes anónimos no guardan el email.</p>
        </div>
    `;
}

function crearCardReporte(reporte) {
    const estadoClass = reporte.estado;
    const badgeClass = estadoClass;
    const estadoTexto = {
        'aprobado': '✓ Aprobado',
        'pendiente': '⏳ Pendiente',
        'rechazado': '✗ Rechazado'
    }[reporte.estado] || reporte.estado;
    
    const estadoIcon = {
        'aprobado': 'fa-check-circle',
        'pendiente': 'fa-clock',
        'rechazado': 'fa-times-circle'
    }[reporte.estado] || 'fa-circle';
    
    const gravedadClass = reporte.gravedad.toLowerCase().includes('leve') ? 'leve' :
                         reporte.gravedad.toLowerCase().includes('moderado') ? 'moderado' : 'grave';
    
    return `
        <div class="reporte-card-modern ${estadoClass}" data-reporte-id="${reporte.id}">
            <div class="card-header-modern">
                <div class="card-title-modern">
                    <i class="fas fa-paw"></i>
                    ${escapeHtml(reporte.titulo)}
                </div>
                <span class="status-badge-modern ${badgeClass}">
                    <i class="fas ${estadoIcon}"></i>
                    ${estadoTexto}
                </span>
            </div>
            <div class="card-meta-modern">
                <span class="meta-item-modern">
                    <i class="fas fa-calendar-alt"></i>
                    ${reporte.fecha}
                </span>
                <span class="meta-item-modern">
                    <i class="fas fa-map-marker-alt"></i>
                    ${reporte.ciudad || 'Sin ubicación'}
                </span>
                <span class="severity-tag ${gravedadClass}">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${reporte.gravedad_display || reporte.gravedad}
                </span>
            </div>
            ${reporte.motivo_rechazo ? crearMotivoRechazo(reporte.motivo_rechazo) : ''}
        </div>
    `;
}

function crearMotivoRechazo(motivo) {
    return `
        <div class="rejection-reason-modern">
            <i class="fas fa-info-circle"></i>
            <span><strong>Motivo de rechazo:</strong> ${escapeHtml(motivo)}</span>
        </div>
    `;
}


document.addEventListener('click', (e) => {
    const card = e.target.closest('.reporte-card-modern');
    if (card && card.dataset.reporteId) {
        verDetalle(card.dataset.reporteId);
    }
});

async function verDetalle(id) {
    if (reportesCache[id]) {
        mostrarModalDetalle(reportesCache[id]);
        return;
    }
    
    mostrarModalLoading();
    abrirModal();
    
    try {
        const url = window.URLS.detalleAjax.replace('0', id);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            reportesCache[id] = data.reporte;
            mostrarModalDetalle(data.reporte);
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar el reporte',
                confirmButtonColor: '#8B5CF6'
            });
            cerrarModal();
        }
    } catch (error) {
        console.error('Error al cargar detalle:', error);
        cerrarModal();
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al cargar los detalles',
            confirmButtonColor: '#8B5CF6'
        });
    }
}


function abrirModal() {
    DOM.modalDetalle.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    DOM.modalDetalle.classList.remove('visible');
    document.body.style.overflow = 'auto';
}

function mostrarModalLoading() {
    DOM.modalTitulo.textContent = 'Cargando...';
    DOM.modalBody.innerHTML = `
        <div class="loading-container">
            <div class="spinner-modern"></div>
            <p style="color: var(--gray-500);">Cargando detalles del reporte...</p>
        </div>
    `;
}

function mostrarModalDetalle(reporte) {
    DOM.modalTitulo.textContent = reporte.titulo;
    DOM.modalBody.innerHTML = crearContenidoModal(reporte);
}

function crearContenidoModal(reporte) {
    const gravedadColor = {
        'leve': '#3B82F6',
        'moderado': '#F59E0B',
        'grave': '#EF4444'
    }[reporte.gravedad] || '#6B7280';
    
    const estadoBadge = {
        'aprobado': '<span style="background: #D1FAE5; color: #065F46; padding: 4px 14px; border-radius: 30px; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Aprobado</span>',
        'pendiente': '<span style="background: #FEF3C7; color: #92400E; padding: 4px 14px; border-radius: 30px; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-clock"></i> Pendiente</span>',
        'rechazado': '<span style="background: #FEE2E2; color: #991B1B; padding: 4px 14px; border-radius: 30px; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-times-circle"></i> Rechazado</span>'
    }[reporte.estado] || '';
    
    const ubicacionCompleta = [];
    if (reporte.direccion) ubicacionCompleta.push(reporte.direccion);
    if (reporte.ciudad) ubicacionCompleta.push(reporte.ciudad);
    if (reporte.region) ubicacionCompleta.push(reporte.region);
    
    let html = `
        <div class="detail-grid-modern">
            <div class="detail-item-modern">
                <div class="detail-icon-modern"><i class="fas fa-flag"></i></div>
                <div class="detail-content-modern">
                    <div class="detail-label-modern">Estado</div>
                    <div class="detail-value-modern">${estadoBadge}</div>
                </div>
            </div>
            
            <div class="detail-item-modern">
                <div class="detail-icon-modern"><i class="fas fa-calendar"></i></div>
                <div class="detail-content-modern">
                    <div class="detail-label-modern">Fecha y hora</div>
                    <div class="detail-value-modern">
                        ${reporte.fecha} · ${reporte.hora || 'Hora no especificada'}
                    </div>
                </div>
            </div>
            
            <div class="detail-item-modern">
                <div class="detail-icon-modern"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="detail-content-modern">
                    <div class="detail-label-modern">Gravedad</div>
                    <div class="detail-value-modern">
                        <span style="background: ${gravedadColor}20; color: ${gravedadColor}; padding: 5px 14px; border-radius: 30px; font-weight: 600; font-size: 0.85rem;">
                            ${reporte.gravedad_display || reporte.gravedad}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="detail-item-modern">
                <div class="detail-icon-modern"><i class="fas fa-map-pin"></i></div>
                <div class="detail-content-modern">
                    <div class="detail-label-modern">Ubicación</div>
                    <div class="detail-value-modern">
                        ${ubicacionCompleta.length > 0 ? ubicacionCompleta.join('<br>') : 'No especificada'}
                    </div>
                </div>
            </div>
            
            <div class="detail-item-modern">
                <div class="detail-icon-modern"><i class="fas fa-align-left"></i></div>
                <div class="detail-content-modern">
                    <div class="detail-label-modern">Descripción</div>
                    <div class="detail-value-modern">${escapeHtml(reporte.descripcion) || 'Sin descripción'}</div>
                </div>
            </div>
            
            ${reporte.motivo_rechazo ? `
                <div class="detail-item-modern">
                    <div class="detail-icon-modern" style="background: #FEE2E2; color: #DC2626;"><i class="fas fa-ban"></i></div>
                    <div class="detail-content-modern">
                        <div class="detail-label-modern" style="color: #DC2626;">Motivo de rechazo</div>
                        <div class="detail-value-modern" style="color: #991B1B;">${escapeHtml(reporte.motivo_rechazo)}</div>
                    </div>
                </div>
            ` : ''}
            
            <div class="detail-item-modern">
                <div class="detail-icon-modern"><i class="fas fa-images"></i></div>
                <div class="detail-content-modern">
                    <div class="detail-label-modern">Fotografías</div>
                    <div class="detail-value-modern">
                        ${crearGaleriaFotos(reporte.fotos)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Botón de mapa según estado
    if (reporte.en_mapa) {
        html += crearBotonMapaHuella(reporte);
    } else if (reporte.latitud && reporte.longitud) {
        html += crearBotonGoogleMaps(reporte);
    }
    
    return html;
}

function crearGaleriaFotos(fotos) {
    if (!fotos || fotos.length === 0) {
        return `
            <div style="background: var(--gray-100); border-radius: 16px; padding: 1.5rem; text-align: center; color: var(--gray-500);">
                <i class="fas fa-camera" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>Sin fotografías disponibles</p>
            </div>
        `;
    }
    
    let html = '<div class="photos-grid-modern">';
    fotos.forEach(foto => {
        html += `
            <div class="photo-item-modern" onclick="window.open('${foto}', '_blank')">
                <img src="${foto}" alt="Foto del reporte" loading="lazy">
            </div>
        `;
    });
    html += '</div>';
    
    return html;
}

function crearBotonMapaHuella(reporte) {
    return `
        <a href="#" class="map-link-modern" data-action="ir-mapa" data-reporte-id="${reporte.id}" data-lat="${reporte.latitud || 0}" data-lng="${reporte.longitud || 0}">
            <i class="fas fa-map-marked-alt"></i>
            <span>Ver ubicación en el mapa de Huella Urbana</span>
            <i class="fas fa-arrow-right" style="opacity: 0.7;"></i>
        </a>
    `;
}

function crearBotonGoogleMaps(reporte) {
    return `
        <div style="margin-top: 1.5rem;">
            <p style="color: var(--gray-500); font-size: 0.85rem; margin-bottom: 10px;">
                <i class="fas fa-info-circle"></i> Este reporte aún no ha sido aprobado. Puedes ver las coordenadas en Google Maps:
            </p>
            <a href="https://www.google.com/maps?q=${reporte.latitud},${reporte.longitud}" target="_blank" class="map-link-modern map-link-google">
                <i class="fab fa-google"></i>
                <span>Ver en Google Maps</span>
                <i class="fas fa-external-link-alt" style="opacity: 0.7; font-size: 0.8rem;"></i>
            </a>
        </div>
    `;
}


document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-action="ir-mapa"]');
    if (link) {
        e.preventDefault();
        
        const reporteId = link.dataset.reporteId;
        const lat = link.dataset.lat;
        const lng = link.dataset.lng;
        
        irAlMapaConReporte(reporteId, lat, lng);
    }
});

function irAlMapaConReporte(reporteId, latitud, longitud) {
    cerrarModal();
    
    sessionStorage.setItem('reporteDestacado', reporteId);
    sessionStorage.setItem('reporteLat', latitud);
    sessionStorage.setItem('reporteLng', longitud);
    
    window.location.href = `${window.URLS.mapa}?reporte=${reporteId}`;
}


function getCSRFToken() {
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfInput ? csrfInput.value : '';
}

function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


window.consultarReportes = consultarReportes;
window.cerrarModal = cerrarModal;
window.verDetalle = verDetalle;