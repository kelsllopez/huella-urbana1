/**
 * ========================================
 * INICIO - FUNCIONALIDAD
 * ========================================
 */

// Variables globales
let map;
let userMarker = null;

// Elementos DOM
const DOM = {
    map: document.getElementById('map'),
    lightboxOverlay: document.getElementById('lightboxOverlay'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxClose: document.getElementById('lightboxClose')
};

// Iconos por gravedad
const ICONS = {
    grave: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    }),
    moderado: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    }),
    leve: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    }),
    user: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    })
};

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    inicializarMapa();
    inicializarEventos();
    cargarReportes();
});

function inicializarEventos() {
    // Cerrar lightbox con botón
    if (DOM.lightboxClose) {
        DOM.lightboxClose.addEventListener('click', closeLightbox);
    }
    
    // Cerrar lightbox con clic en overlay
    if (DOM.lightboxOverlay) {
        DOM.lightboxOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.lightboxOverlay) {
                closeLightbox();
            }
        });
    }
    
    // Cerrar lightbox con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
        }
    });
}

// ========================================
// INICIALIZAR MAPA
// ========================================

function inicializarMapa() {
    if (!DOM.map) return;
    
    map = L.map('map').setView([-33.4489, -70.6693], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        minZoom: 2
    }).addTo(map);
    
    // Agregar control GPS
    agregarControlGPS();
}

// ========================================
// CONTROL GPS
// ========================================

function agregarControlGPS() {
    const GPSControl = L.Control.extend({
        options: { position: 'topleft' },
        
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-gps');
            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
            container.title = 'Ir a mi ubicación actual';
            
            container.addEventListener('click', manejarClickGPS);
            
            return container;
        }
    });
    
    map.addControl(new GPSControl());
}

function manejarClickGPS(event) {
    const container = event.currentTarget;
    
    if (!navigator.geolocation) {
        mostrarErrorGPS('GPS no soportado', 'Tu navegador no soporta geolocalización.');
        return;
    }
    
    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            map.setView([lat, lng], 15);
            
            if (userMarker) {
                map.removeLayer(userMarker);
            }
            
            userMarker = L.marker([lat, lng], { icon: ICONS.user })
                .addTo(map)
                .bindPopup('<strong>📍 Tu ubicación actual</strong>')
                .openPopup();
            
            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
        },
        (error) => {
            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
            
            let msg = 'No se pudo obtener tu ubicación.';
            if (error.code === 1) msg = 'Permiso de ubicación denegado.';
            else if (error.code === 2) msg = 'Ubicación no disponible.';
            else if (error.code === 3) msg = 'Tiempo de espera agotado.';
            
            mostrarErrorGPS('Error de GPS', msg);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function mostrarErrorGPS(titulo, mensaje) {
    Swal.fire({
        icon: 'error',
        title: titulo,
        text: mensaje,
        confirmButtonColor: '#8B5CF6'
    });
}

// ========================================
// CARGAR REPORTES
// ========================================

function cargarReportes() {
    const reportesData = document.getElementById('reportesData');
    if (!reportesData) return;
    
    try {
        const data = JSON.parse(reportesData.textContent);
        const reportes = data.reportes || [];
        
        const bounds = [];
        let tieneMarcadores = false;
        
        reportes.forEach(reporte => {
            const lat = parseFloat(reporte.latitud);
            const lng = parseFloat(reporte.longitud);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = crearMarcador(reporte, lat, lng);
                bounds.push(marker.getLatLng());
                tieneMarcadores = true;
            }
        });
        
        if (!tieneMarcadores) {
            agregarMarcadorEjemplo(bounds);
        }
        
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        agregarMarcadorEjemplo([]);
    }
}

function crearMarcador(reporte, lat, lng) {
    // Seleccionar icono según gravedad
    let icon = ICONS.leve;
    if (reporte.gravedad === 'grave') icon = ICONS.grave;
    else if (reporte.gravedad === 'moderado') icon = ICONS.moderado;
    
    // Crear contenido del popup
    const popupContent = crearPopupContent(reporte);
    
    // Crear y retornar marcador
    return L.marker([lat, lng], { icon: icon })
        .addTo(map)
        .bindPopup(popupContent);
}

function crearPopupContent(reporte) {
    const fotos = reporte.fotos || [];
    const totalFotos = reporte.total_fotos || 0;
    const fotosVisibles = fotos.length;
    const todasFotosOcultas = (totalFotos > 0 && fotosVisibles === 0);
    const fotoPrincipal = fotos.length > 0 ? fotos[0] : null;
    
    let html = `
        <div style="width:260px">
            <h6 style="margin-bottom:8px;">
                <strong>🐾 ${escapeHtml(reporte.titulo)}</strong>
            </h6>
    `;
    
    // CASO 1: Todas las fotos ocultas
    if (todasFotosOcultas) {
        html += crearMensajeFotosOcultas();
    }
    // CASO 2: Foto censurada
    else if (fotoPrincipal && fotoPrincipal.censurada) {
        html += crearFotoCensurada(fotoPrincipal.url);
    }
    // CASO 3: Foto normal
    else if (fotoPrincipal) {
        html += crearFotoNormal(fotoPrincipal.url);
    }
    // CASO 4: Sin fotos
    else {
        html += crearPlaceholderSinFotos();
    }
    
    html += `
            <p style="font-size:0.85rem; margin-bottom:2px;">
                <b>📍 Dirección:</b> ${escapeHtml(reporte.direccion)}<br>
                <b>🏙️ Ciudad:</b> ${escapeHtml(reporte.ciudad)}<br>
                <b>📅 Fecha:</b> ${escapeHtml(reporte.fecha)}<br>
                <b>⚠️ Gravedad:</b> ${escapeHtml(reporte.gravedad_display)}
            </p>
        </div>
    `;
    
    return html;
}

function crearMensajeFotosOcultas() {
    return `
        <div class="popup-hidden-message">
            <i class="fas fa-ban"></i>
            <p><strong>Imágenes no disponibles</strong></p>
            <p>Este reporte contiene material que ha sido retirado por nuestros moderadores.</p>
            <small><i class="fas fa-shield-alt"></i> Huella Urbana - Contenido moderado</small>
        </div>
    `;
}

function crearFotoCensurada(url) {
    return `
        <div class="popup-blur-container" data-action="ver-censurada" data-url="${url}">
            <img src="${url}" class="popup-blur-img" alt="Imagen censurada">
            <div class="popup-blur-overlay">
                <i class="fas fa-eye-slash"></i> Contenido sensible
            </div>
        </div>
    `;
}

function crearFotoNormal(url) {
    return `
        <img src="${url}" class="popup-normal-img" data-action="ver-imagen" data-url="${url}" alt="Evidencia">
    `;
}

function crearPlaceholderSinFotos() {
    return `
        <div class="popup-no-photo">
            <i class="fas fa-camera"></i>
            <p>Sin fotografías</p>
        </div>
    `;
}

function agregarMarcadorEjemplo(bounds) {
    const marker = L.marker([-33.4489, -70.6693], { icon: ICONS.leve })
        .addTo(map)
        .bindPopup(`
            <div style="width:220px">
                <h6><strong>🐾 Sin reportes aún</strong></h6>
                <p style="font-size:0.85rem;">
                    Sé el primero en reportar un incidente.
                </p>
            </div>
        `);
    
    bounds.push(marker.getLatLng());
    
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// ========================================
// DELEGACIÓN DE EVENTOS (Popup dinámico)
// ========================================

document.addEventListener('click', (e) => {
    // Ver imagen normal
    const imgElement = e.target.closest('[data-action="ver-imagen"]');
    if (imgElement) {
        const url = imgElement.dataset.url;
        if (url) {
            openLightbox(url);
        }
        return;
    }
    
    // Ver imagen censurada
    const censoredElement = e.target.closest('[data-action="ver-censurada"]');
    if (censoredElement) {
        const url = censoredElement.dataset.url;
        if (url) {
            verImagenCensurada(url);
        }
        return;
    }
});

// ========================================
// LIGHTBOX
// ========================================

function openLightbox(src) {
    DOM.lightboxImg.src = src;
    DOM.lightboxOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    DOM.lightboxOverlay.classList.remove('visible');
    document.body.style.overflow = 'auto';
}

// ========================================
// VER IMAGEN CENSURADA
// ========================================

function verImagenCensurada(src) {
    map.closePopup();
    
    setTimeout(() => {
        Swal.fire({
            title: '⚠️ Contenido Sensible',
            html: `
                <div style="text-align: center;">
                    <p style="margin-bottom: 15px;">Esta imagen ha sido marcada como contenido sensible por los moderadores.</p>
                    <p style="font-size: 0.9rem; color: #6B7280; margin-bottom: 15px;">¿Deseas verla sin censura?</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#F59E0B',
            cancelButtonColor: '#6B7280',
            confirmButtonText: '<i class="fas fa-eye"></i> Ver imagen',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                openLightbox(src);
            }
        });
    }, 100);
}

// ========================================
// UTILIDADES
// ========================================

function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// EXPORTACIÓN GLOBAL
// ========================================

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.verImagenCensurada = verImagenCensurada;