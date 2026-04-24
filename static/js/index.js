// Variables globales
let map;
let userMarker;

// Función para abrir lightbox
function openLightbox(src) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightboxOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Función para cerrar lightbox
function closeLightbox() {
    document.getElementById('lightboxOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Función para ver imagen censurada (con advertencia)
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

// Función para crear contenido del popup
function createPopupContent(reporte) {
    const fotosVisibles = reporte.fotos;
    const totalFotos = reporte.total_fotos;
    const todasFotosOcultas = (totalFotos > 0 && fotosVisibles.length === 0);
    const fotoPrincipal = fotosVisibles.length > 0 ? fotosVisibles[0] : null;
    
    let popupContent = `
        <div style="width:260px">
            <h6 style="margin-bottom:8px;">
                <strong>🐾 ${reporte.titulo}</strong>
            </h6>
    `;
    
    // CASO 1: TODAS LAS FOTOS FUERON OCULTADAS
    if (todasFotosOcultas) {
        popupContent += `
            <div class="popup-hidden-message">
                <i class="fas fa-ban"></i>
                <p><strong>Imágenes no disponibles</strong></p>
                <p>Este reporte contiene material que ha sido retirado por nuestros moderadores.</p>
                <small><i class="fas fa-shield-alt"></i> Huella Urbana - Contenido moderado</small>
            </div>
        `;
    }
    // CASO 2: HAY FOTO PERO ESTÁ CENSURADA
    else if (fotoPrincipal && fotoPrincipal.censurada) {
        popupContent += `
            <div class="popup-blur-container" onclick="verImagenCensurada('${fotoPrincipal.url}')">
                <img src="${fotoPrincipal.url}" class="popup-blur-img" alt="Imagen censurada">
                <div class="popup-blur-overlay">
                    <i class="fas fa-eye-slash"></i> Contenido sensible
                </div>
            </div>
        `;
    }
    // CASO 3: HAY FOTO Y NO ESTÁ CENSURADA
    else if (fotoPrincipal) {
        popupContent += `
            <img src="${fotoPrincipal.url}" class="popup-normal-img" onclick="openLightbox('${fotoPrincipal.url}')" alt="Imagen del reporte">
        `;
    }
    // CASO 4: NO HAY FOTOS
    else {
        popupContent += `
            <div style="background: #F3F4F6; border-radius: 8px; padding: 10px; margin: 8px 0; text-align: center;">
                <i class="fas fa-camera" style="font-size: 1.2rem; color: #9CA3AF;"></i>
                <p style="color: #6B7280; font-size: 0.8rem; margin: 5px 0 0;">Sin fotografías</p>
            </div>
        `;
    }
    
    popupContent += `
            <p style="font-size:0.85rem; margin-bottom:2px;">
                <b>📍 Dirección:</b> ${reporte.direccion}<br>
                <b>🏙️ Ciudad:</b> ${reporte.ciudad}<br>
                <b>📅 Fecha:</b> ${reporte.fecha}<br>
                <b>⚠️ Gravedad:</b> ${reporte.gravedad_display}
            </p>
        </div>
    `;
    
    return popupContent;
}

// Función para inicializar el mapa
function initMap() {
    // Inicializar mapa
    map = L.map("map").setView([-33.4489, -70.6693], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        minZoom: 2
    }).addTo(map);

    // Iconos por gravedad
    const icons = {
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
        })
    };

    let tieneMarcadores = false;
    const bounds = [];

    // Agregar marcadores de reportes
    if (window.reportesData && window.reportesData.length > 0) {
        window.reportesData.forEach(reporte => {
            const lat = reporte.latitud;
            const lng = reporte.longitud;

            if (!isNaN(lat) && !isNaN(lng)) {
                let icon = icons.leve;
                if (reporte.gravedad === 'grave') icon = icons.grave;
                else if (reporte.gravedad === 'moderado') icon = icons.moderado;
                
                const popupContent = createPopupContent(reporte);
                
                const marker = L.marker([lat, lng], { icon: icon })
                    .addTo(map)
                    .bindPopup(popupContent);

                bounds.push(marker.getLatLng());
                tieneMarcadores = true;
            }
        });
    }

    // Si no hay reportes, mostrar marcador de ejemplo
    if (!tieneMarcadores) {
        const marker = L.marker([-33.4489, -70.6693], { icon: icons.leve })
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
    }

    // Ajustar vista a los marcadores
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Agregar control GPS
    addGPSControl();
}

// Función para agregar control GPS
function addGPSControl() {
    var gpsControl = L.Control.extend({
        options: { position: 'topleft' },
        
        onAdd: function(map) {
            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-gps');
            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
            container.title = 'Ir a mi ubicación actual';
            
            container.onclick = function() {
                if (navigator.geolocation) {
                    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            var lat = position.coords.latitude;
                            var lng = position.coords.longitude;
                            
                            map.setView([lat, lng], 15);
                            
                            if (userMarker) map.removeLayer(userMarker);
                            
                            var userIcon = L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41]
                            });
                            
                            userMarker = L.marker([lat, lng], {icon: userIcon})
                                .addTo(map)
                                .bindPopup('<strong>📍 Tu ubicación actual</strong>')
                                .openPopup();
                            
                            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
                        },
                        function(error) {
                            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
                            let msg = 'No se pudo obtener tu ubicación.';
                            if (error.code === 1) msg = 'Permiso de ubicación denegado.';
                            Swal.fire({ icon: 'error', title: 'Error de GPS', text: msg });
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                } else {
                    Swal.fire({ icon: 'error', title: 'GPS no soportado', text: 'Tu navegador no soporta geolocalización.' });
                }
            };
            
            return container;
        }
    });
    
    map.addControl(new gpsControl());
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initMap();
});