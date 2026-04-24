let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    inicializarTabs();
    inicializarBotones();
    inicializarGraficos();
});

function inicializarTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            if (tabName) {
                showTab(tabName);
            }
        });
    });
}

function inicializarBotones() {
    const btnGPS = document.getElementById('btnGPSStats');
    const btnLimpiar = document.getElementById('btnLimpiarFiltro');
    
    if (btnGPS) {
        btnGPS.addEventListener('click', filtrarPorUbicacion);
    }
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltro);
    }
}


function showTab(tabName) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    actualizarGraficosVisibles();
}

function actualizarGraficosVisibles() {
    Object.values(charts).forEach(chart => {
        if (chart && chart.update) {
            chart.update();
        }
    });
}

async function filtrarPorUbicacion() {
    const btn = document.getElementById('btnGPSStats');
    
    if (!navigator.geolocation) {
        alert('❌ Tu navegador no soporta geolocalización');
        return;
    }
    
    setButtonLoading(btn, true, 'Obteniendo ubicación...');
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            setButtonLoading(btn, true, 'Detectando ciudad...');
            
            const ciudad = await obtenerCiudad(lat, lng);
            
            if (ciudad) {
                setButtonText(btn, `<i class="fas fa-check"></i> ${ciudad}`);
                setTimeout(() => {
                    window.location.href = `?ciudad=${encodeURIComponent(ciudad)}`;
                }, 600);
            } else {
                resetButton(btn);
                alert('⚠️ No se pudo determinar tu ciudad. Verifica los permisos de ubicación e inténtalo de nuevo.');
            }
        },
        (error) => {
            resetButton(btn);
            mostrarErrorGeolocalizacion(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

async function obtenerCiudad(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`,
            { headers: { 'User-Agent': 'HuellaUrbana/1.0' } }
        );
        
        const data = await response.json();
        
        if (data.address) {
            return data.address.city ||
                   data.address.town ||
                   data.address.village ||
                   data.address.municipality ||
                   data.address.suburb ||
                   data.address.county ||
                   data.address.state_district ||
                   data.address.state ||
                   null;
        }
    } catch (error) {
        console.error('Error obteniendo ciudad:', error);
    }
    return null;
}

function limpiarFiltro() {
    window.location.href = window.STATS_URLS?.limpiarFiltro || window.location.pathname;
}


function setButtonLoading(btn, isLoading, text) {
    if (!btn) return;
    
    btn.disabled = isLoading;
    if (isLoading) {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }
}

function setButtonText(btn, html) {
    if (!btn) return;
    btn.innerHTML = html;
}

function resetButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-location-arrow"></i> Filtrar por mi ubicación';
}

function mostrarErrorGeolocalizacion(error) {
    let msg = 'Error al obtener ubicación.';
    
    switch (error.code) {
        case 1:
            msg = 'Permiso de ubicación denegado. Habilita la ubicación en tu navegador.';
            break;
        case 2:
            msg = 'Ubicación no disponible. Verifica tu conexión GPS.';
            break;
        case 3:
            msg = 'Tiempo de espera agotado. Inténtalo de nuevo.';
            break;
    }
    
    alert('❌ ' + msg);
}

function inicializarGraficos() {
    const data = window.STATS_DATA || {};
    
    const ctxBarras = document.getElementById('chartBarras')?.getContext('2d');
    if (ctxBarras && data.meses && data.totalesMes) {
        charts.barras = new Chart(ctxBarras, {
            type: 'bar',
            data: {
                labels: data.meses,
                datasets: [{
                    label: 'Reportes',
                    data: data.totalesMes,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 2,
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    const ctxDona = document.getElementById('chartDona')?.getContext('2d');
    if (ctxDona) {
        charts.dona = new Chart(ctxDona, {
            type: 'doughnut',
            data: {
                labels: ['👤 Ataques a Personas', '⚠️ Graves', '🟡 Moderados', '🔵 Leves'],
                datasets: [{
                    data: [
                        data.ataques_personas || 0,
                        data.graves || 0, 
                        data.moderados || 0, 
                        data.leves || 0
                    ],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.85)',   
                        'rgba(239, 68, 68, 0.65)',  
                        'rgba(245, 158, 11, 0.8)',  
                        'rgba(96, 165, 250, 0.8)'    
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 },
                            usePointStyle: true,
                            boxWidth: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                radius: '90%'
            }
        });
    }
    
    const ctxLinea = document.getElementById('chartLinea')?.getContext('2d');
    if (ctxLinea && data.mesesTendencia && data.totalesTendencia) {
        charts.linea = new Chart(ctxLinea, {
            type: 'line',
            data: {
                labels: data.mesesTendencia,
                datasets: [{
                    label: 'Incidentes',
                    data: data.totalesTendencia,
                    borderColor: 'rgba(139, 92, 246, 1)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: 'rgba(139, 92, 246, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Incidentes: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    const ctxHoras = document.getElementById('chartHoras')?.getContext('2d');
    if (ctxHoras && data.etiquetasHoras && data.totalesHoras) {
        charts.horas = new Chart(ctxHoras, {
            type: 'bar',
            data: {
                labels: data.etiquetasHoras,
                datasets: [{
                    label: 'Incidentes',
                    data: data.totalesHoras,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 2,
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    const ctxDias = document.getElementById('chartDias')?.getContext('2d');
    if (ctxDias && data.diasOrdenados && data.totalesDias) {
        charts.dias = new Chart(ctxDias, {
            type: 'bar',
            data: {
                labels: data.diasOrdenados,
                datasets: [{
                    label: 'Incidentes',
                    data: data.totalesDias,
                    backgroundColor: 'rgba(96, 165, 250, 0.8)',
                    borderColor: 'rgba(96, 165, 250, 1)',
                    borderWidth: 2,
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}


window.showTab = showTab;
window.filtrarPorUbicacion = filtrarPorUbicacion;
window.limpiarFiltro = limpiarFiltro;