/**
 * MapaApp - Objeto principal para la gestión del mapa interactivo
 * Versión: 1.0.0
 * Dependencias: Leaflet 1.9.4, SweetAlert2
 */

const MapaApp = {
    // ========================= PROPIEDADES =========================
    map: null,
    markers: [],
    reportesData: [],
    filtros: {
        tiempo: "all",
        gravedad: "all-severity",
        victima: "all-victim"
    },
    sidebarVisible: true,

    // ========================= INICIALIZACIÓN =========================
    init() {
        this.totalIncidentesElement = document.getElementById("totalIncidentes");
        
        // Ocultar loader después de cargar
        setTimeout(() => {
            document.getElementById("loader").style.display = "none";
            this.initMap();
        }, 800);

        this.setupEventListeners();
    },

    setupEventListeners() {
        // Filtros
        document.querySelectorAll(".filter-chip").forEach(chip => {
            chip.addEventListener("click", (e) => {
                e.preventDefault();
                this.handleFilterClick(chip);
            });
        });

        // Tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeLightbox();
                this.closeModal();
            }
        });
    },

    // ========================= MAPA =========================
    initMap() {
        this.map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([-33.4489, -70.6693], 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 2
        }).addTo(this.map);

        this.cargarReportes();
    },

    cargarReportes() {
        console.log("Cargando reportes desde:", window.MAPA_CONFIG.apiUrl);
        
        fetch(window.MAPA_CONFIG.apiUrl, {
            headers: { "x-requested-with": "XMLHttpRequest" }
        })
        .then(r => r.json())
        .then(data => {
            console.log("Datos recibidos:", data.length, "reportes");
            this.reportesData = data;
            document.getElementById("totalIncidentes").textContent = data.length;
            this.renderMarkers(data);
            this.destacarReporteSiExiste();
        })
        .catch(err => console.error("Error cargando datos:", err));
    },

    // ========================= GPS =========================
    irAMiUbicacion() {
        const btn = document.getElementById('gpsBtn');
        
        if (!navigator.geolocation) {
            Swal.fire({
                icon: 'error',
                title: 'GPS no soportado',
                text: 'Tu navegador no soporta geolocalización.'
            });
            return;
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo...';
        btn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                this.map.setView([lat, lng], 15);
                btn.innerHTML = '<i class="fas fa-location-arrow"></i> Usar mi ubicación actual';
                btn.disabled = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Ubicación encontrada',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            (error) => {
                btn.innerHTML = '<i class="fas fa-location-arrow"></i> Usar mi ubicación actual';
                btn.disabled = false;
                let msg = 'No se pudo obtener tu ubicación.';
                if (error.code === 1) msg = 'Permiso de ubicación denegado.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error de GPS',
                    text: msg
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    },

    // ========================= MARCADORES =========================
    renderMarkers(data) {
        console.log("Renderizando marcadores:", data.length);
        
        // Eliminar marcadores existentes
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
        
        if (data.length === 0) {
            L.popup()
                .setLatLng([-33.4489, -70.6693])
                .setContent(`
                    <div style="text-align:center;padding:10px;">
                        <i class="fas fa-info-circle"></i>
                        No hay incidentes con los filtros seleccionados.
                    </div>
                `)
                .openOn(this.map);
            return;
        }
        
        data.forEach(rep => this.addMarker(rep));
    },

    addMarker(rep) {
        const color = rep.gravedad === "grave" ? "red" :
                     rep.gravedad === "moderado" ? "orange" : "blue";
        
        const icon = L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41]
        });

        const popupContent = this.createPopupContent(rep);
        
        const marker = L.marker([rep.lat, rep.lon], { icon })
            .bindPopup(popupContent)
            .addTo(this.map);
        
        this.markers.push(marker);
    },

    createPopupContent(rep) {
        // Icono según tipo de víctima
        const victimIcons = {
            'persona': '👤',
            'perro': '🐕',
            'gato': '🐈',
            'otro': '🐾'
        };
        const victimIcon = victimIcons[rep.tipo_animal] || '🐾';
        const victimDisplay = rep.tipo_animal_display || rep.tipo_animal || 'No especificado';
        
        let content = `<strong>${victimIcon} ${rep.titulo}</strong>`;
        
        // Caso 1: Todas las fotos ocultas
        if (rep.todas_fotos_ocultas) {
            content += `
                <div class="popup-hidden-message">
                    <i class="fas fa-ban"></i>
                    <p><strong>Imágenes no disponibles</strong></p>
                    <p>Este reporte contiene material que ha sido retirado por nuestros moderadores.</p>
                    <small><i class="fas fa-shield-alt"></i> Huella Urbana - Contenido moderado</small>
                </div>
            `;
        }
        // Caso 2: Foto censurada
        else if (rep.foto && rep.foto_censurada) {
            content += `
                <div class="popup-blur-container" onclick="MapaApp.verImagenCensurada('${rep.foto}')">
                    <img src="${rep.foto}" class="popup-blur-img" alt="Imagen censurada">
                    <div class="popup-blur-overlay">
                        <i class="fas fa-eye-slash"></i> Contenido sensible
                    </div>
                </div>
            `;
        }
        // Caso 3: Foto normal
        else if (rep.foto) {
            content += `
                <div style="cursor: pointer;" onclick="MapaApp.openLightbox('${rep.foto}')">
                    <img src="${rep.foto}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin: 8px 0;" alt="Foto del reporte">
                </div>
            `;
        }
        // Caso 4: Sin fotos
        else {
            content += `
                <div style="background: #F3F4F6; border-radius: 8px; padding: 12px; margin: 8px 0; text-align: center;">
                    <i class="fas fa-camera" style="font-size: 1.5rem; color: #9CA3AF; margin-bottom: 5px;"></i>
                    <p style="color: #6B7280; font-size: 0.85rem; margin: 0;">Este reporte no contiene fotografías</p>
                </div>
            `;
        }
        
        content += `
            <b>📅 Fecha:</b> ${rep.fecha}<br>
            <b>🎯 Víctima:</b> ${victimDisplay}<br><br>
            <button onclick="MapaApp.openModal(${rep.id}); MapaApp.map.closePopup();"
                    style="background:#8B5CF6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; width:100%;">
                Ver Detalles
            </button>
        `;
        
        return content;
    },

    // ========================= DESTACAR REPORTE =========================
    destacarReporteSiExiste() {
        const urlParams = new URLSearchParams(window.location.search);
        const reporteId = urlParams.get('reporte');
        const reporteDestacado = sessionStorage.getItem('reporteDestacado');
        const reporteLat = sessionStorage.getItem('reporteLat');
        const reporteLng = sessionStorage.getItem('reporteLng');
        
        const idParaDestacar = reporteId || reporteDestacado;
        
        if (idParaDestacar) {
            setTimeout(() => {
                const reporte = this.reportesData.find(r => r.id == idParaDestacar);
                
                if (reporte) {
                    this.map.setView([reporte.lat, reporte.lon], 16);
                    
                    this.markers.forEach(marker => {
                        const markerPos = marker.getLatLng();
                        if (Math.abs(markerPos.lat - reporte.lat) < 0.001 &&
                            Math.abs(markerPos.lng - reporte.lon) < 0.001) {
                            marker.openPopup();
                        }
                    });
                    
                    Swal.fire({
                        icon: 'success',
                        title: '📍 Reporte encontrado',
                        text: `"${reporte.titulo}"`,
                        timer: 2500,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end'
                    });
                    
                } else if (reporteLat && reporteLng) {
                    const lat = parseFloat(reporteLat);
                    const lng = parseFloat(reporteLng);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        this.map.setView([lat, lng], 16);
                        
                        Swal.fire({
                            icon: 'info',
                            title: '📍 Ubicación del reporte',
                            text: 'Este reporte aún no ha sido aprobado, por lo que no aparece en el mapa público.',
                            confirmButtonColor: '#8B5CF6'
                        });
                    }
                }
                
                sessionStorage.removeItem('reporteDestacado');
                sessionStorage.removeItem('reporteLat');
                sessionStorage.removeItem('reporteLng');
                
            }, 500);
        }
    },

    // ========================= IMÁGENES CENSURADAS =========================
    verImagenCensurada(src) {
        this.map.closePopup();
        
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
                    this.openLightbox(src);
                }
            });
        }, 100);
    },

    verImagenCensuradaDesdeModal(src) {
        this.closeModal();
        
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
                    this.openLightbox(src);
                }
            });
        }, 150);
    },

    // ========================= MODAL =========================
    openModal(id) {
        const rep = this.reportesData.find(r => r.id === id);
        if (!rep) return;

        document.getElementById("modal-titulo-header").textContent = rep.titulo || "Detalles del Reporte";
        document.getElementById("modal-fecha-header").textContent = rep.fecha || "";
        document.getElementById("modal-tipo-animal").textContent = rep.tipo_animal_display || rep.tipo_animal || "No especificado";
        document.getElementById("modal-cantidad-perros").textContent = rep.cantidad_perros || "No especificado";
        
        const gravedadTexto = {
            'leve': 'Leve',
            'moderado': 'Moderado',
            'grave': 'Grave'
        };
        document.getElementById("modal-gravedad").innerHTML = `
            <span class="severity-badge severity-${rep.gravedad}">
                ${gravedadTexto[rep.gravedad] || "Leve"}
            </span>
        `;
        
        document.getElementById("modal-direccion").textContent = rep.direccion || "No especificada";
        document.getElementById("modal-ciudad-region").textContent = 
            rep.ciudad && rep.region ? `${rep.ciudad}, ${rep.region}` : 
            (rep.ciudad || rep.region || "No especificado");
        document.getElementById("modal-coordenadas").textContent = 
            rep.lat && rep.lon ? `${rep.lat}, ${rep.lon}` : "No disponibles";
        document.getElementById("modal-map-link").href = `https://www.google.com/maps?q=${rep.lat},${rep.lon}`;
        document.getElementById("modal-descripcion").textContent = rep.descripcion || "Sin descripción.";

        this.cargarFotosModal(rep);
        document.getElementById("modalOverlay").style.display = "block";
        document.body.style.overflow = "hidden";
        this.switchModalTabAuto('tab-incidente');
    },

    cargarFotosModal(reporte) {
        const container = document.getElementById("modal-fotos-container");
        
        if (reporte.todas_fotos_ocultas) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border-radius: 16px; border: 2px solid #FCA5A5;">
                    <i class="fas fa-ban" style="font-size: 3.5rem; color: #DC2626; margin-bottom: 15px; opacity: 0.8;"></i>
                    <h4 style="color: #991B1B; margin-bottom: 10px; font-weight: 700;">Imágenes no disponibles</h4>
                    <p style="color: #7F1D1D; margin-bottom: 5px;">Este reporte contiene material que ha sido retirado por nuestros moderadores.</p>
                    <p style="color: #7F1D1D; font-size: 0.85rem;">Las imágenes no cumplen con nuestras políticas de contenido.</p>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #FCA5A5;">
                        <small style="color: #991B1B;"><i class="fas fa-shield-alt"></i> Huella Urbana - Contenido moderado</small>
                    </div>
                </div>
            `;
            return;
        }
        
        if (!reporte.fotos || reporte.fotos.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6B7280;">
                    <i class="fas fa-camera" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No hay fotografías disponibles para este reporte.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        reporte.fotos.forEach((foto) => {
            if (foto.censurada) {
                html += `
                    <div class="modal-photo-item censurada" onclick="MapaApp.verImagenCensuradaDesdeModal('${foto.url}')">
                        <img src="${foto.url}" class="modal-photo-img blur" alt="Imagen censurada">
                        <div class="censored-overlay">
                            <i class="fas fa-eye-slash"></i>
                            <span>Contenido Sensible</span>
                            <small>Click para ver</small>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="modal-photo-item" onclick="MapaApp.openLightbox('${foto.url}')">
                        <img src="${foto.url}" class="modal-photo-img" alt="Foto del reporte">
                        <div class="photo-hover-overlay">
                            <i class="fas fa-search-plus"></i>
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
    },

    switchModalTab(event, tabId) {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        event.currentTarget.classList.add("active");
        document.querySelectorAll(".tab-content-modal").forEach(c => c.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
    },

    switchModalTabAuto(tabId) {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content-modal").forEach(c => c.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
        
        // Activar el botón correspondiente
        const btn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
        if (btn) btn.classList.add("active");
    },

    closeModal() {
        document.getElementById("modalOverlay").style.display = "none";
        document.body.style.overflow = "auto";
    },

    // ========================= LIGHTBOX =========================
    openLightbox(src) {
        document.getElementById("lightboxImg").src = src;
        document.getElementById("lightboxOverlay").style.display = "flex";
        document.body.style.overflow = "hidden";
    },

    closeLightbox() {
        document.getElementById("lightboxOverlay").style.display = "none";
        document.body.style.overflow = "auto";
    },

    // ========================= FILTROS =========================
    handleFilterClick(chip) {
        const grupo = chip.closest(".filter-section");
        if (grupo) {
            grupo.querySelectorAll(".filter-chip").forEach(x => x.classList.remove("active"));
        }
        chip.classList.add("active");

        const f = chip.dataset.filter;
        console.log("Filtro seleccionado:", f);
        
        if (['all', '7d', '30d', '3m', '6m', 'year'].includes(f)) {
            this.filtros.tiempo = f;
        }
        if (['leve', 'moderado', 'grave', 'all-severity'].includes(f)) {
            this.filtros.gravedad = f;
        }
        if (['persona', 'perro', 'gato', 'otro', 'all-victim'].includes(f)) {
            this.filtros.victima = f;
        }

        this.aplicarFiltros();
    },

    aplicarFiltros() {
        console.log("Aplicando filtros:", this.filtros);
        let lista = [...this.reportesData];

        // Filtro por gravedad
        if (this.filtros.gravedad !== 'all-severity') {
            lista = lista.filter(r => r.gravedad === this.filtros.gravedad);
        }

        // Filtro por tipo de víctima
        if (this.filtros.victima !== 'all-victim') {
            lista = lista.filter(r => r.tipo_animal === this.filtros.victima);
        }

        // Filtro por tiempo
        if (this.filtros.tiempo !== 'all') {
            const ahora = new Date();
            lista = lista.filter(r => {
                const partes = r.fecha.split('/');
                const fecha = new Date(partes[2], partes[1] - 1, partes[0]);
                const diff = ahora - fecha;
                const dias = diff / (1000 * 60 * 60 * 24);
                
                switch (this.filtros.tiempo) {
                    case '7d': return dias <= 7;
                    case '30d': return dias <= 30;
                    case '3m': return dias <= 90;
                    case '6m': return dias <= 180;
                    case 'year': return fecha.getFullYear() === ahora.getFullYear();
                    default: return true;
                }
            });
        }

        console.log("Total después de filtros:", lista.length);
        
        // Actualizar contador con efecto visual
        if (this.totalIncidentesElement) {
            this.totalIncidentesElement.textContent = lista.length;
            this.totalIncidentesElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                this.totalIncidentesElement.style.transform = 'scale(1)';
            }, 200);
        }
        
        this.renderMarkers(lista);
    },

    // ========================= SIDEBAR =========================
    toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        const btn = document.getElementById("toggleBtn");
        const icon = document.getElementById("toggleIcon");

        if (this.sidebarVisible) {
            sidebar.style.transform = "translateX(-380px)";
            btn.style.left = "20px";
            icon.className = "fas fa-chevron-right";
        } else {
            sidebar.style.transform = "translateX(0)";
            btn.style.left = "380px";
            icon.className = "fas fa-chevron-left";
        }
        
        this.sidebarVisible = !this.sidebarVisible;
        setTimeout(() => this.map.invalidateSize(), 300);
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    MapaApp.init();
});