/**
 * ========================================
 * NUEVO REPORTE - FUNCIONALIDAD COMPLETA
 * ========================================
 */

(function () {
    'use strict';

    // ========================================
    // ELEMENTOS DEL DOM
    // ========================================
    const form = document.getElementById('reportForm');
    const steps = document.querySelectorAll('.step');
    const stepContents = document.querySelectorAll('.step-content');
    const btnNext = document.getElementById('btnNext');
    const btnPrev = document.getElementById('btnPrev');
    const btnSubmit = document.getElementById('btnSubmit');

    const fechaInput = document.querySelector('input[name="fecha"]');
    const descripcionInput = document.querySelector('textarea[name="descripcion"]');
    const charCount = document.getElementById('charCount');
    const descProgress = document.getElementById('descProgress');
    const anonimoCheck = document.querySelector('input[name="anonimo"]');
    const contactFields = document.getElementById('contactFields');
    const nombreRequired = document.getElementById('nombreRequired');
    const emailRequired = document.getElementById('emailRequired');
    const nombreInput = document.querySelector('input[name="nombre_reportante"]');
    const emailInput = document.querySelector('input[name="email_reportante"]');
    const tituloInput = document.querySelector('input[name="titulo"]');
    const tipoAnimalSelect = document.querySelector('select[name="tipo_animal"]');
    const gravedadSelect = document.querySelector('select[name="gravedad"]');
    const severityOptions = document.querySelectorAll('.severity-option');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const fileCountSpan = document.getElementById('fileCount');
    const latInput = document.getElementById('id_latitud');
    const lngInput = document.getElementById('id_longitud');
    const btnGPS = document.getElementById('btnObtenerUbicacion');

    // ========================================
    // VARIABLES GLOBALES
    // ========================================
    let map, marker;
    let currentStep = 1;
    const totalSteps = 3;
    let selectedFiles = [];
    let mapInitialized = false;
    const DEFAULT_LAT = -33.4489;
    const DEFAULT_LNG = -70.6693;

    // ========================================
    // UTILIDADES DE ERROR
    // ========================================
    function clearAllErrors() {
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    }

    function showFieldError(fieldName, message) {
        const errorDiv = document.getElementById('error-' + fieldName);
        const field = document.querySelector('[name="' + fieldName + '"]');
        if (errorDiv) errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + message;
        if (field) field.classList.add('input-error');
    }

    // ========================================
    // VALIDACIÓN DE FECHA
    // ========================================
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.setAttribute('max', today);
        fechaInput.addEventListener('change', function () {
            const selected = new Date(this.value);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const warning = document.getElementById('dateWarning');
            if (selected > now) {
                this.value = today;
                if (warning) { 
                    warning.style.display = 'block'; 
                    setTimeout(() => warning.style.display = 'none', 3000); 
                }
            }
        });
    }

    // ========================================
    // CONTADOR DE DESCRIPCIÓN
    // ========================================
    if (descripcionInput) {
        descripcionInput.addEventListener('input', function () {
            const length = this.value.length;
            if (charCount) charCount.textContent = `Mínimo 50 caracteres (${length}/50)`;
            const progress = Math.min((length / 50) * 100, 100);
            if (descProgress) descProgress.style.width = progress + '%';
            if (length >= 50) {
                charCount && charCount.classList.replace('invalid', 'valid');
                if (descProgress) descProgress.style.background = 'linear-gradient(90deg, #10B981, #34D399)';
            } else {
                charCount && charCount.classList.replace('valid', 'invalid');
                if (descProgress) descProgress.style.background = 'linear-gradient(90deg, #8B5CF6, #A78BFA)';
            }
        });
        descripcionInput.dispatchEvent(new Event('input'));
    }

    // ========================================
    // TOGGLE ANÓNIMO
    // ========================================
    function toggleContactFields() {
        if (!anonimoCheck || !contactFields) return;
        const isAnonimo = anonimoCheck.checked;
        contactFields.style.opacity = isAnonimo ? '0.5' : '1';
        contactFields.style.pointerEvents = isAnonimo ? 'none' : 'auto';
        if (nombreRequired) nombreRequired.style.display = isAnonimo ? 'none' : 'inline';
        if (emailRequired) emailRequired.style.display = isAnonimo ? 'none' : 'inline';
    }
    
    if (anonimoCheck) {
        anonimoCheck.addEventListener('change', toggleContactFields);
        toggleContactFields();
    }

    // ========================================
    // SEVERIDAD VISUAL
    // ========================================
    severityOptions.forEach(option => {
        option.addEventListener('click', function () {
            if (gravedadSelect) gravedadSelect.value = this.dataset.value;
            severityOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    if (gravedadSelect && gravedadSelect.value) {
        const sel = document.querySelector(`.severity-option[data-value="${gravedadSelect.value}"]`);
        if (sel) sel.classList.add('selected');
    }

    // ========================================
    // MANEJO DE FOTOS
    // ========================================
    function addFiles(newFiles) {
        newFiles.forEach(file => {
            if (selectedFiles.length >= 5) {
                Swal.fire({ icon: 'warning', title: 'Límite 5 imágenes', confirmButtonColor: '#8B5CF6' });
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({ icon: 'warning', title: 'Máximo 5MB por imagen', confirmButtonColor: '#8B5CF6' });
                return;
            }
            if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
            }
        });
        renderPreviews();
    }

    function renderPreviews() {
        if (!imagePreview) return;
        imagePreview.innerHTML = '';
        selectedFiles.forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `<img src="${e.target.result}"><button type="button" class="remove-btn" data-index="${i}"><i class="fas fa-times"></i></button>`;
                imagePreview.appendChild(div);
                div.querySelector('.remove-btn').addEventListener('click', () => {
                    selectedFiles.splice(i, 1);
                    renderPreviews();
                });
            };
            reader.readAsDataURL(file);
        });
        if (fileCountSpan) fileCountSpan.textContent = selectedFiles.length;
    }

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
            uploadArea.classList.add('dragover'); 
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
        });
        fileInput.addEventListener('change', (e) => addFiles(Array.from(e.target.files)));
    }

    // ========================================
    // MAPA LEAFLET
    // ========================================
    function initMap() {
        if (mapInitialized) return;

        const lat = (latInput && latInput.value) ? parseFloat(latInput.value) || DEFAULT_LAT : DEFAULT_LAT;
        const lng = (lngInput && lngInput.value) ? parseFloat(lngInput.value) || DEFAULT_LNG : DEFAULT_LNG;

        map = L.map('map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd', 
            maxZoom: 20
        }).addTo(map);

        const svgIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.163 0 0 7.163 0 16C0 26 16 42 16 42C16 42 32 26 32 16C32 7.163 24.837 0 16 0Z" fill="#8B5CF6" stroke="white" stroke-width="2.5"/><circle cx="16" cy="16" r="7" fill="white"/></svg>',
            iconSize: [32, 42], 
            iconAnchor: [16, 42], 
            popupAnchor: [0, -42]
        });

        marker = L.marker([lat, lng], { draggable: true, icon: svgIcon }).addTo(map);
        marker.bindPopup('<b>📍 Ubicación seleccionada</b><br>Arrastra el pin para ajustar').openPopup();

        if (latInput) latInput.value = lat;
        if (lngInput) lngInput.value = lng;
        obtenerDireccion(lat, lng);

        map.on('click', (e) => {
            marker.setLatLng([e.latlng.lat, e.latlng.lng]);
            if (latInput) latInput.value = e.latlng.lat;
            if (lngInput) lngInput.value = e.latlng.lng;
            obtenerDireccion(e.latlng.lat, e.latlng.lng);
        });

        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            if (latInput) latInput.value = pos.lat;
            if (lngInput) lngInput.value = pos.lng;
            obtenerDireccion(pos.lat, pos.lng);
        });

        mapInitialized = true;
        setTimeout(() => map.invalidateSize(), 100);
    }

    async function obtenerDireccion(lat, lng) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`);
            const data = await res.json();
            if (data.address) {
                const dirEl = document.getElementById('id_direccion');
                const ciudadEl = document.getElementById('id_ciudad');
                const regionEl = document.getElementById('id_region');
                if (dirEl) dirEl.value = data.display_name || '';
                if (ciudadEl) ciudadEl.value = data.address.city || data.address.town || data.address.village || '';
                if (regionEl) regionEl.value = data.address.state || '';
            }
        } catch (e) { 
            console.warn('Geocodificación falló:', e); 
        }
    }

    function obtenerGPS() {
        if (!navigator.geolocation) {
            Swal.fire({ icon: 'error', title: 'GPS no soportado', confirmButtonColor: '#8B5CF6' });
            return;
        }
        if (btnGPS) { 
            btnGPS.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo...'; 
            btnGPS.disabled = true; 
        }
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            if (!mapInitialized) initMap();
            map.setView([lat, lng], 16);
            marker.setLatLng([lat, lng]);
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;
            obtenerDireccion(lat, lng);
            if (btnGPS) { 
                btnGPS.innerHTML = '<i class="fas fa-check"></i> ¡Listo!'; 
                setTimeout(() => { 
                    btnGPS.innerHTML = '<i class="fas fa-location-arrow"></i> Usar mi ubicación actual'; 
                    btnGPS.disabled = false; 
                }, 2000); 
            }
        }, () => {
            if (btnGPS) { 
                btnGPS.innerHTML = '<i class="fas fa-location-arrow"></i> Usar mi ubicación actual'; 
                btnGPS.disabled = false; 
            }
            Swal.fire({ icon: 'error', title: 'Error de GPS', text: 'No se pudo obtener la ubicación', confirmButtonColor: '#8B5CF6' });
        });
    }
    
    if (btnGPS) btnGPS.addEventListener('click', obtenerGPS);

    // ========================================
    // VALIDACIÓN POR PASOS
    // ========================================
    function validateStep(step) {
        clearAllErrors();
        let isValid = true;
        
        if (step === 1) {
            if (!tituloInput || !tituloInput.value.trim()) { 
                showFieldError('titulo', 'El título es obligatorio'); 
                isValid = false; 
            }
            if (!fechaInput || !fechaInput.value) { 
                showFieldError('fecha', 'La fecha es obligatoria'); 
                isValid = false; 
            }
            if (!tipoAnimalSelect || !tipoAnimalSelect.value) { 
                showFieldError('tipo_animal', 'El tipo de animal es obligatorio'); 
                isValid = false; 
            }
            if (!gravedadSelect || !gravedadSelect.value) { 
                showFieldError('gravedad', 'La gravedad es obligatoria'); 
                isValid = false; 
            }
            if (!descripcionInput || descripcionInput.value.trim().length < 50) { 
                showFieldError('descripcion', 'La descripción debe tener al menos 50 caracteres'); 
                isValid = false; 
            }
        }
        
        if (step === 2) {
            const lat = latInput ? parseFloat(latInput.value) : 0;
            const lng = lngInput ? parseFloat(lngInput.value) : 0;
            if (!lat && !lng) {
                const errorDiv = document.getElementById('error-ubicacion');
                if (errorDiv) errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Debes seleccionar una ubicación en el mapa';
                isValid = false;
            }
        }
        
        if (step === 3) {
            const isAnonimo = anonimoCheck && anonimoCheck.checked;
            if (!isAnonimo) {
                if (!nombreInput || !nombreInput.value.trim()) { 
                    showFieldError('nombre_reportante', 'Tu nombre es obligatorio'); 
                    isValid = false; 
                }
                if (!emailInput || !emailInput.value.trim()) { 
                    showFieldError('email_reportante', 'El email es obligatorio'); 
                    isValid = false; 
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) { 
                    showFieldError('email_reportante', 'Ingresa un correo válido'); 
                    isValid = false; 
                }
            }
        }
        
        return isValid;
    }

    // ========================================
    // NAVEGACIÓN POR PASOS
    // ========================================
    function updateSteps() {
        steps.forEach((s, i) => {
            s.classList.remove('active', 'completed');
            if (i + 1 === currentStep) s.classList.add('active');
            else if (i + 1 < currentStep) s.classList.add('completed');
        });
        
        stepContents.forEach(c => {
            c.classList.remove('active');
            if (parseInt(c.dataset.step) === currentStep) c.classList.add('active');
        });
        
        if (btnPrev) btnPrev.style.display = currentStep === 1 ? 'none' : 'inline-flex';
        
        if (currentStep === totalSteps) {
            if (btnNext) btnNext.style.display = 'none';
            if (btnSubmit) btnSubmit.style.display = 'inline-flex';
        } else {
            if (btnNext) btnNext.style.display = 'inline-flex';
            if (btnSubmit) btnSubmit.style.display = 'none';
        }
        
        if (currentStep === 2) setTimeout(initMap, 100);
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (validateStep(currentStep) && currentStep < totalSteps) {
                currentStep++;
                updateSteps();
                clearAllErrors();
            }
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentStep > 1) { 
                currentStep--; 
                updateSteps(); 
                clearAllErrors(); 
            }
        });
    }

    // ========================================
    // ENVÍO DEL FORMULARIO
    // ========================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateStep(currentStep)) return;

        Swal.fire({ 
            title: 'Enviando reporte...', 
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        try {
            const formData = new FormData();

            const fields = ['titulo', 'fecha', 'hora', 'tipo_animal', 'cantidad_perros',
                'gravedad', 'descripcion', 'nombre_reportante', 'email_reportante',
                'telefono_reportante', 'direccion', 'ciudad', 'region', 'pais'];

            fields.forEach(name => {
                const el = form.querySelector(`[name="${name}"]`);
                if (el) formData.append(name, el.value || '');
            });

            const anonimoEl = form.querySelector('[name="anonimo"]');
            if (anonimoEl && anonimoEl.checked) formData.append('anonimo', 'on');

            const sensibleEl = form.querySelector('[name="contiene_contenido_sensible"]');
            if (sensibleEl && sensibleEl.checked) formData.append('contiene_contenido_sensible', 'on');

            const lat = latInput ? latInput.value : '';
            const lng = lngInput ? lngInput.value : '';
            formData.append('latitud', lat);
            formData.append('longitud', lng);

            const dirEl = document.getElementById('id_direccion');
            const ciudadEl = document.getElementById('id_ciudad');
            const regionEl = document.getElementById('id_region');
            const paisEl = document.getElementById('id_pais');
            formData.set('direccion', dirEl ? dirEl.value : '');
            formData.set('ciudad', ciudadEl ? ciudadEl.value : '');
            formData.set('region', regionEl ? regionEl.value : '');
            formData.set('pais', paisEl ? paisEl.value : 'Chile');

            const csrfEl = form.querySelector('[name="csrfmiddlewaretoken"]');
            if (csrfEl) formData.append('csrfmiddlewaretoken', csrfEl.value);

            selectedFiles.forEach(f => formData.append('fotografias', f));

            const res = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            let data = {};
            try { 
                data = await res.json(); 
            } catch(err) { 
                console.error('No se pudo parsear JSON', err); 
            }

            if (data.success) {
                const isAnonimo = anonimoEl && anonimoEl.checked;
                const email = emailInput ? emailInput.value.trim() : '';
                
                if (isAnonimo) {
                    Swal.fire({
                        icon: 'success', 
                        title: '¡Reporte anónimo enviado!',
                        html: '<p>Tu reporte ha sido registrado de forma <strong>anónima</strong>.</p>',
                        confirmButtonColor: '#8B5CF6'
                    }).then(() => window.location.href = '/');
                } else {
                    Swal.fire({
                        icon: 'success', 
                        title: '¡Reporte enviado con éxito!',
                        html: `<p>Tu reporte ha sido registrado.</p><p><strong>Email:</strong> ${email}</p><p><a href="/consultar/" style="background:#8B5CF6;color:white;padding:10px 20px;border-radius:10px;text-decoration:none;">Consultar estado</a></p>`,
                        confirmButtonColor: '#8B5CF6', 
                        confirmButtonText: 'Ir al inicio',
                        showCancelButton: true, 
                        cancelButtonText: 'Consultar ahora', 
                        cancelButtonColor: '#10B981'
                    }).then((result) => {
                        if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                            window.location.href = '/consultar/';
                        } else {
                            window.location.href = '/';
                        }
                    });
                }
            } else {
                const msg = data.message || 'No se pudo enviar el reporte';
                let detail = '';
                if (data.errors) {
                    detail = '<ul style="text-align:left;margin-top:10px;">';
                    for (const [key, val] of Object.entries(data.errors)) {
                        const errors = val.errors || val;
                        const label = val.label || key;
                        if (Array.isArray(errors)) {
                            errors.forEach(e => { detail += `<li><b>${label}:</b> ${e}</li>`; });
                        }
                    }
                    detail += '</ul>';
                }
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Error al enviar', 
                    html: msg + detail, 
                    confirmButtonColor: '#8B5CF6' 
                });
            }
        } catch (err) {
            console.error('Error de red:', err);
            Swal.fire({ 
                icon: 'error', 
                title: 'Error de conexión', 
                text: 'Verifica tu conexión e intenta de nuevo.', 
                confirmButtonColor: '#8B5CF6' 
            });
        }
    });

    // ========================================
    // INICIALIZACIÓN
    // ========================================
    updateSteps();
})();