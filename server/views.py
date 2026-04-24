import csv
import json
from datetime import datetime, timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import Group, User
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Count, Q
from django.db.models.functions import (
    ExtractHour,
    ExtractWeekDay,
    TruncDate,
    TruncMonth,
)
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.dateformat import DateFormat
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .forms import *
from .models import *


def es_moderador(user):
    """Verifica si el usuario es moderador o admin."""
    return user.is_authenticated and (
        user.perfil.rol == 'moderador' or user.perfil.rol == 'admin'
    )


def es_admin(user):
    """Verifica si el usuario es administrador."""
    if user.is_superuser or user.is_staff:
        return True
    return hasattr(user, "perfil") and user.perfil.rol == "admin"


def es_mod_o_admin(user):
    """Verifica si el usuario es moderador o administrador."""
    if user.is_superuser or user.is_staff:
        return True
    return hasattr(user, "perfil") and user.perfil.rol in ["moderador", "admin"]

def index(request):
    """Página principal: muestra reportes verificados y estadísticas."""
    if request.user.is_authenticated and not request.session.get("bienvenida_mostrada"):
        if request.user.is_superuser:
            messages.success(request, "Bienvenido Administrador 👑")
        else:
            messages.success(request, "Bienvenido Moderador 🛡️")
        request.session["bienvenida_mostrada"] = True

    reportes = NuevoReporte.objects.filter(estado='aprobado').order_by('-fecha_creacion')

    total_reportes = NuevoReporte.objects.count()
    total_verificados = NuevoReporte.objects.filter(estado='aprobado').count()
    total_pendientes = NuevoReporte.objects.filter(estado='pendiente').count()

    hoy = timezone.now().date()
    total_mes = NuevoReporte.objects.filter(
        fecha__year=hoy.year,
        fecha__month=hoy.month
    ).count()

    contexto = {
        'reportes': reportes,
        'total_reportes': total_reportes,
        'total_verificados': total_verificados,
        'total_pendientes': total_pendientes,
        'total_mes': total_mes,
    }

    return render(request, 'index.html', contexto)


def detalle(request, id):
    """Vista detallada de un reporte individual."""
    reporte = get_object_or_404(NuevoReporte, id=id)
    fotos = reporte.fotos.all()
    return render(request, 'detalle.html', {'reporte': reporte, 'fotos': fotos})


def contacto(request):
    """Página de contacto."""
    return render(request, 'nosotros/contacto.html')


def ayuda(request):
    """Página de ayuda."""
    return render(request, 'nosotros/ayuda.html')


def acerca(request):
    """Página acerca de."""
    return render(request, 'nosotros/acerca_de.html')


def consultar_reporte(request):
    """Vista para la página de consulta pública."""
    return render(request, 'consultar_reporte.html')


@require_http_methods(["POST"])
@csrf_exempt
def consultar_reportes_ajax(request):
    """API para buscar reportes por email."""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()

        if not email:
            return JsonResponse({'success': False, 'message': 'Email requerido'})

        reportes = NuevoReporte.objects.filter(
            email_reportante__iexact=email,
            anonimo=False
        ).order_by('-fecha', '-id')

        resultados = []
        for r in reportes:
            resultados.append({
                'id': r.id,
                'titulo': r.titulo,
                'fecha': r.fecha.strftime('%d/%m/%Y'),
                'ciudad': r.ciudad or '',
                'gravedad': r.get_gravedad_display(),
                'estado': r.estado,
                'motivo_rechazo': r.comentario_moderacion if r.estado == 'rechazado' else None,
            })

        return JsonResponse({
            'success': True,
            'reportes': resultados,
            'total': len(resultados)
        })

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})


def detalle_reporte_ajax(request, reporte_id):
    """API para obtener detalles de un reporte específico."""
    try:
        reporte = NuevoReporte.objects.get(id=reporte_id)

        fotos = []
        for foto in reporte.fotos.all():
            fotos.append(foto.archivo.url)

        resultado = {
            'id': reporte.id,
            'titulo': reporte.titulo,
            'fecha': reporte.fecha.strftime('%d/%m/%Y'),
            'hora': reporte.hora.strftime('%H:%M') if reporte.hora else '',
            'gravedad': reporte.gravedad,
            'gravedad_display': reporte.get_gravedad_display(),
            'estado': reporte.estado,
            'direccion': reporte.direccion or '',
            'ciudad': reporte.ciudad or '',
            'region': reporte.region or '',
            'descripcion': reporte.descripcion or '',
            'motivo_rechazo': reporte.comentario_moderacion if reporte.estado == 'rechazado' else None,
            'fotos': fotos,
            'en_mapa': reporte.estado == 'aprobado' and reporte.latitud and reporte.longitud,
            'mapa_url': reverse('mapa') + f'?reporte={reporte.id}' if reporte.estado == 'aprobado' else None,
        }

        return JsonResponse({'success': True, 'reporte': resultado})

    except NuevoReporte.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Reporte no encontrado'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})


def login_view(request):
    """Vista de inicio de sesión."""
    if request.method == "POST":
        user_input = request.POST.get("username")
        password = request.POST.get("password")

        if not User.objects.filter(email=user_input).exists() and not User.objects.filter(username=user_input).exists():
            messages.error(request, "Este correo o usuario no existe.", extra_tags="username")
            return render(request, "auth/login.html")

        if User.objects.filter(email=user_input).exists():
            user_input = User.objects.get(email=user_input).username

        user = authenticate(request, username=user_input, password=password)

        if user:
            login(request, user)
            return redirect("index")

        messages.error(request, "La contraseña es incorrecta.", extra_tags="password")
        return render(request, "auth/login.html")

    return render(request, "auth/login.html")


def cerrar_sesion(request):
    """Permite cerrar sesión con método GET."""
    logout(request)
    return redirect('login')


def registro(request):
    """Vista de registro de nuevos usuarios."""
    if request.method == 'POST':
        usuario = request.POST.get('nombre', '').strip()
        email = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')
        terms = request.POST.get('terms')

        # Validaciones
        if not all([usuario, email, password, confirm_password]):
            messages.error(request, 'Por favor completa todos los campos obligatorios.')
            return render(request, 'auth/registro.html')

        if password != confirm_password:
            messages.error(request, 'Las contraseñas no coinciden.')
            return render(request, 'auth/registro.html')

        if len(password) < 8:
            messages.error(request, 'La contraseña debe tener al menos 8 caracteres.')
            return render(request, 'auth/registro.html')

        if not terms:
            messages.error(request, 'Debes aceptar los términos y condiciones.')
            return render(request, 'auth/registro.html')

        if User.objects.filter(username=usuario).exists():
            messages.error(request, 'Este nombre de usuario ya está en uso.')
            return render(request, 'auth/registro.html')

        if User.objects.filter(email=email).exists():
            messages.error(request, 'Este correo electrónico ya está registrado.')
            return render(request, 'auth/registro.html')

        try:
            nuevo_usuario = User.objects.create_user(
                username=usuario,
                email=email,
                password=password
            )

            perfil, created = PerfilUsuario.objects.get_or_create(
                user=nuevo_usuario,
                defaults={'rol': 'usuario'}
            )

            login(request, nuevo_usuario)
            messages.success(request, f'¡Bienvenido/a {nuevo_usuario.username}! Tu cuenta ha sido creada exitosamente.')
            return redirect('index')

        except Exception as e:
            messages.error(request, f'Error al crear la cuenta: {str(e)}')
            return render(request, 'auth/registro.html')

    return render(request, 'auth/registro.html')


def check_email(request):
    """Verifica si un email ya está registrado (para validación AJAX)."""
    email = request.GET.get("email")
    exists = User.objects.filter(email=email).exists()
    return JsonResponse({"exists": exists})

def nuevo_reporte(request):
    """Vista para crear un nuevo reporte."""
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method == 'POST':
        form = NuevoReporteForm(request.POST, request.FILES)
        fotografias = request.FILES.getlist('fotografias')

        imagen_errors = []
        if len(fotografias) > 5:
            imagen_errors.append('Máximo 5 fotografías permitidas.')
        for foto in fotografias:
            if foto.size > 5 * 1024 * 1024:
                imagen_errors.append(f'{foto.name} excede los 5MB permitidos.')
            if not foto.content_type.startswith('image/'):
                imagen_errors.append(f'{foto.name} no es una imagen válida.')

        if imagen_errors:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'Error en las imágenes', 'errors': {'imagenes': imagen_errors}})
            for error in imagen_errors:
                messages.error(request, f'⚠️ {error}')
            return render(request, 'nuevo_reporte.html', {'form': form})

        # Parsear y redondear coordenadas a 6 decimales (modelo tiene max_digits=9, decimal_places=6)
        latitud_str = request.POST.get('latitud', '').strip().replace(',', '.')
        longitud_str = request.POST.get('longitud', '').strip().replace(',', '.')

        try:
            lat_val = round(float(latitud_str), 6)
            lng_val = round(float(longitud_str), 6)
        except (ValueError, TypeError):
            lat_val, lng_val = 0.0, 0.0

        if not latitud_str or not longitud_str or (lat_val == 0.0 and lng_val == 0.0):
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'Debes seleccionar una ubicación en el mapa', 'errors': {'latitud': ['La ubicación es obligatoria']}})
            messages.error(request, '⚠️ Debes seleccionar una ubicación en el mapa.')
            return render(request, 'nuevo_reporte.html', {'form': form})

        # Inyectar coordenadas redondeadas en el POST antes de validar el form
        post_data = request.POST.copy()
        post_data['latitud'] = str(lat_val)
        post_data['longitud'] = str(lng_val)
        form = NuevoReporteForm(post_data, request.FILES)

        if form.is_valid():
            try:
                reporte = form.save(commit=False)

                if request.user.is_authenticated:
                    reporte.usuario = request.user

                if reporte.anonimo:
                    reporte.nombre_reportante = ''
                    reporte.email_reportante = ''
                    reporte.telefono_reportante = ''
                else:
                    if not reporte.nombre_reportante:
                        reporte.nombre_reportante = request.POST.get('nombre_reportante', '')
                    if not reporte.email_reportante:
                        reporte.email_reportante = request.POST.get('email_reportante', '')

                reporte.latitud = lat_val
                reporte.longitud = lng_val
                reporte.direccion = request.POST.get('direccion', '')
                reporte.ciudad = request.POST.get('ciudad', '')
                reporte.region = request.POST.get('region', '')
                reporte.pais = request.POST.get('pais', 'Chile')

                reporte.save()
                print(f"✅ Reporte guardado: ID={reporte.id}")

                for idx, foto in enumerate(fotografias[:5], start=1):
                    Foto.objects.create(reporte=reporte, archivo=foto, orden=idx)

                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': 'Reporte enviado correctamente',
                        'redirect_url': '/',
                        'reporte_id': reporte.id,
                        'anonimo': reporte.anonimo
                    })

                if reporte.anonimo:
                    messages.success(request, '✅ ¡Reporte enviado como anónimo! Gracias por tu aporte.')
                else:
                    messages.success(request, f'✅ ¡Reporte enviado exitosamente! ID: REP-{reporte.id}.')
                return redirect('index')

            except Exception as e:
                import traceback
                print(f"❌ Error al guardar: {traceback.format_exc()}")
                if is_ajax:
                    return JsonResponse({'success': False, 'message': f'Error al guardar el reporte: {str(e)}'})
                messages.error(request, f'❌ Error al guardar el reporte: {str(e)}')
                return render(request, 'nuevo_reporte.html', {'form': form})

        else:
            print(f"❌ Form inválido: {form.errors}")
            if is_ajax:
                errors_dict = {}
                for field, error_list in form.errors.items():
                    if field == '__all__':
                        errors_dict['general'] = [str(e) for e in error_list]
                    else:
                        field_label = form.fields[field].label if field in form.fields else field
                        errors_dict[field] = {'label': field_label, 'errors': [str(e) for e in error_list]}
                return JsonResponse({'success': False, 'message': 'Por favor corrige los errores en el formulario', 'errors': errors_dict})

            error_msg = '⚠️ Por favor corrige los siguientes errores:<br><ul>'
            for field, errors in form.errors.items():
                if field == '__all__':
                    for error in errors:
                        error_msg += f'<li>{error}</li>'
                else:
                    field_label = form.fields[field].label if field in form.fields else field
                    error_msg += f'<li><strong>{field_label}:</strong> {errors[0]}</li>'
            error_msg += '</ul>'
            messages.error(request, error_msg)

    else:
        initial_data = {}
        if request.user.is_authenticated:
            initial_data = {
                'nombre_reportante': request.user.get_full_name() or request.user.username,
                'email_reportante': request.user.email,
            }
        form = NuevoReporteForm(initial=initial_data)

    if is_ajax and request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

    return render(request, 'nuevo_reporte.html', {'form': form})


def mapa(request):
    """Vista del mapa con reportes geolocalizados."""
    reportes = NuevoReporte.objects.filter(
        estado='aprobado',
        latitud__isnull=False,
        longitud__isnull=False
    )

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        data = []
        for r in reportes:
            try:
                fotos_data = []
                fotos_visibles = 0

                for foto in r.fotos.all():
                    if foto.visibilidad == 'oculta':
                        continue

                    if foto.estado_moderacion == 'aprobada':
                        fotos_data.append({
                            'url': foto.archivo.url,
                            'censurada': foto.visibilidad == 'censurada',
                            'id': foto.id
                        })
                        fotos_visibles += 1
                    elif foto.visibilidad == 'censurada' and foto.estado_moderacion == 'aprobada':
                        fotos_data.append({
                            'url': foto.archivo.url,
                            'censurada': True,
                            'id': foto.id
                        })
                        fotos_visibles += 1

                total_fotos = r.fotos.count()
                fotos_ocultas = r.fotos.filter(visibilidad='oculta').count()
                todas_fotos_ocultas = (total_fotos > 0 and fotos_ocultas == total_fotos)

                foto_principal = next((f for f in fotos_data if not f['censurada']), None)
                if not foto_principal and fotos_data:
                    foto_principal = fotos_data[0]

                data.append({
                    'id': r.id,
                    'titulo': r.titulo,
                    'descripcion': r.descripcion,
                    'tipo_animal': r.tipo_animal, 
                    'tipo_animal_display': r.get_tipo_animal_display(), 
                    'cantidad_perros': r.cantidad_perros,
                    'gravedad': r.gravedad,
                    'hora': r.hora.strftime('%H:%M') if r.hora else '',
                    'fecha': r.fecha.strftime('%d/%m/%Y'),
                    'lat': float(r.latitud),
                    'lon': float(r.longitud),
                    'latitud': float(r.latitud),
                    'longitud': float(r.longitud),
                    'direccion': r.direccion or '',
                    'ciudad': r.ciudad or '',
                    'region': r.region or '',
                    'foto': foto_principal['url'] if foto_principal else '',
                    'foto_censurada': foto_principal['censurada'] if foto_principal else False,
                    'fotos': fotos_data,
                    'todas_fotos_ocultas': todas_fotos_ocultas,
                })
            except Exception as e:
                print(f"Error en reporte {r.id}: {e}")
                continue

        return JsonResponse(data, safe=False)

    total_reportes = reportes.count()
    return render(request, 'mapa.html', {'total_reportes': total_reportes})

def estadisticas(request):
    """Vista de estadísticas y análisis de datos."""
    ciudad_filtro = request.GET.get('ciudad', None)

    if ciudad_filtro:
        base_queryset = NuevoReporte.objects.filter(
            estado='aprobado',
            ciudad__icontains=ciudad_filtro
        )
        titulo_ubicacion = ciudad_filtro
        filtrando_por_ciudad = True
    else:
        base_queryset = NuevoReporte.objects.filter(estado='aprobado')
        titulo_ubicacion = "Todo Chile"
        filtrando_por_ciudad = False
    total_reportes = NuevoReporte.objects.count() if not ciudad_filtro else base_queryset.count()
    verificados = base_queryset.count()
    ataques_graves = base_queryset.filter(gravedad='grave').count()
    ataques_personas = base_queryset.filter(tipo_animal='persona').count()  
    
    # Ciudades afectadas
    ciudades_afectadas = base_queryset.exclude(
        ciudad__isnull=True
    ).exclude(
        ciudad=''
    ).values('ciudad').distinct().count()

    graves = base_queryset.filter(gravedad='grave').count()
    moderados = base_queryset.filter(gravedad='moderado').count()
    leves = base_queryset.filter(gravedad='leve').count()
    
    mes_data = (
        base_queryset
        .annotate(mes=TruncMonth('fecha'))
        .values('mes')
        .annotate(total=Count('id'))
        .order_by('mes')
    )
    
    meses = []
    totales_mes = []
    for m in mes_data:
        if m['mes']:
            meses.append(DateFormat(m['mes']).format('M'))
            totales_mes.append(m['total'])

    top_ciudades = (
        base_queryset
        .exclude(ciudad__isnull=True)
        .exclude(ciudad='')
        .values('ciudad')
        .annotate(total=Count('id'))
        .order_by('-total')[:10]
    )
    
    sectores_ranking = []
    for c in top_ciudades:
        sectores_ranking.append({
            'sector': c['ciudad'],
            'total': c['total']
        })
    
    max_sector = sectores_ranking[0]['total'] if sectores_ranking else 1

    hace_12_meses = datetime.now() - timedelta(days=365)
    
    tendencia = (
        base_queryset
        .filter(fecha__gte=hace_12_meses)
        .annotate(mes=TruncMonth('fecha'))
        .values('mes')
        .annotate(total=Count('id'))
        .order_by('mes')
    )
    
    meses_tendencia = []
    totales_tendencia = []
    for t in tendencia:
        if t['mes']:
            meses_tendencia.append(DateFormat(t['mes']).format('M'))
            totales_tendencia.append(t['total'])

    
    horas_data = (
        base_queryset
        .exclude(hora__isnull=True)
        .annotate(hora_del_dia=ExtractHour('hora'))
        .values('hora_del_dia')
        .annotate(total=Count('id'))
        .order_by('hora_del_dia')
    )
    
    rangos_horas = {
        '0-6h': 0, '6-9h': 0, '9-12h': 0, '12-15h': 0,
        '15-18h': 0, '18-21h': 0, '21-24h': 0
    }
    
    for h in horas_data:
        hora = h['hora_del_dia']
        if 0 <= hora < 6:
            rangos_horas['0-6h'] += h['total']
        elif 6 <= hora < 9:
            rangos_horas['6-9h'] += h['total']
        elif 9 <= hora < 12:
            rangos_horas['9-12h'] += h['total']
        elif 12 <= hora < 15:
            rangos_horas['12-15h'] += h['total']
        elif 15 <= hora < 18:
            rangos_horas['15-18h'] += h['total']
        elif 18 <= hora < 21:
            rangos_horas['18-21h'] += h['total']
        else:
            rangos_horas['21-24h'] += h['total']
    
    etiquetas_horas = list(rangos_horas.keys())
    totales_horas = list(rangos_horas.values())

    
    dias_data = (
        base_queryset
        .annotate(dia_semana=ExtractWeekDay('fecha'))
        .values('dia_semana')
        .annotate(total=Count('id'))
        .order_by('dia_semana')
    )
    
    dias_nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    totales_dias = [0] * 7
    
    for d in dias_data:
        if d['dia_semana']:
            totales_dias[d['dia_semana'] - 1] = d['total']
    
    totales_dias_ordenados = totales_dias[1:] + [totales_dias[0]]
    dias_ordenados = dias_nombres[1:] + [dias_nombres[0]]

    total_verificados_global = NuevoReporte.objects.filter(estado='aprobado').count()
    total_global = NuevoReporte.objects.count()
    
    tasa_aprobacion = round((total_verificados_global / total_global) * 100) if total_global > 0 else 0
    
    reportes_con_foto = base_queryset.filter(fotos__isnull=False).distinct().count()
    porcentaje_con_foto = round((reportes_con_foto / verificados) * 100) if verificados > 0 else 0

    context = {
        'total_reportes': total_reportes,
        'verificados': verificados,
        'ataques_graves': ataques_graves,
        'ataques_personas': ataques_personas,  
        'sectores_afectados': ciudades_afectadas,
        'titulo_ubicacion': titulo_ubicacion,
        'filtrando_por_ciudad': filtrando_por_ciudad,
        'meses': meses,
        'totales_mes': totales_mes,
        'graves': graves,
        'moderados': moderados,
        'leves': leves,
        'sectores_ranking': sectores_ranking,
        'max_sector': max_sector,
        'meses_tendencia': meses_tendencia,
        'totales_tendencia': totales_tendencia,
        'etiquetas_horas': etiquetas_horas,
        'totales_horas': totales_horas,
        'dias_ordenados': dias_ordenados,
        'totales_dias': totales_dias_ordenados,
        'tasa_aprobacion': tasa_aprobacion,
        'porcentaje_con_foto': porcentaje_con_foto,
    }

    return render(request, 'estadisticas.html', context)

@login_required
@user_passes_test(es_moderador)
def panel_moderador(request):
    """Panel principal de moderación."""
    estado_filtro = request.GET.get('estado', None)
    gravedad_filtro = request.GET.get('gravedad', None)
    animal_filtro = request.GET.get('animal', None)
    anonimo_filtro = request.GET.get('anonimo', None)

    reportes = NuevoReporte.objects.all().order_by('-fecha', '-id')

    if estado_filtro and estado_filtro != 'todos':
        reportes = reportes.filter(estado=estado_filtro)

    if gravedad_filtro and gravedad_filtro != 'all':
        reportes = reportes.filter(gravedad=gravedad_filtro)

    if animal_filtro and animal_filtro != 'all':
        reportes = reportes.filter(tipo_animal=animal_filtro)

    if anonimo_filtro and anonimo_filtro != 'all':
        if anonimo_filtro == 'true':
            reportes = reportes.filter(anonimo=True)
        elif anonimo_filtro == 'false':
            reportes = reportes.filter(anonimo=False)

    reportes_por_pagina = 5
    paginator = Paginator(reportes, reportes_por_pagina)

    page = request.GET.get('page', 1)

    try:
        reportes_paginados = paginator.page(page)
    except PageNotAnInteger:
        reportes_paginados = paginator.page(1)
    except EmptyPage:
        reportes_paginados = paginator.page(paginator.num_pages)

    context = {
        'reportes': reportes_paginados,
        'pendientes': NuevoReporte.objects.filter(estado='pendiente').count(),
        'aprobados': NuevoReporte.objects.filter(estado='aprobado').count(),
        'rechazados': NuevoReporte.objects.filter(estado='rechazado').count(),
        'todos': NuevoReporte.objects.count(),
        'total_filtrados': paginator.count,
    }
    return render(request, 'moderador/panel_moderador.html', context)


@login_required
@user_passes_test(es_moderador)
def aprobar_reporte(request, id):
    """Aprueba un reporte pendiente."""
    reporte = get_object_or_404(NuevoReporte, id=id)
    reporte.estado = 'aprobado'
    reporte.moderador = request.user
    reporte.fecha_moderacion = timezone.now()
    reporte.comentario_moderacion = 'Reporte aprobado y publicado.'
    reporte.save()

    ModeracionLog.objects.create(
        reporte=reporte,
        moderador=request.user,
        accion='verificado',
        motivo='Aprobado por moderador'
    )

    return JsonResponse({'status': 'ok', 'mensaje': 'Reporte aprobado correctamente.'})


@login_required
@user_passes_test(es_moderador)
def rechazar_reporte(request, id):
    """Rechaza un reporte con motivo."""
    if request.method == 'POST':
        motivo = request.POST.get('motivo', '').strip()
        if not motivo:
            return JsonResponse({'status': 'error', 'mensaje': 'Debes escribir un motivo de rechazo.'})

        reporte = get_object_or_404(NuevoReporte, id=id)
        reporte.estado = 'rechazado'
        reporte.moderador = request.user
        reporte.fecha_moderacion = timezone.now()
        reporte.comentario_moderacion = motivo
        reporte.save()

        ModeracionLog.objects.create(
            reporte=reporte,
            moderador=request.user,
            accion='rechazado',
            motivo=motivo
        )

        return JsonResponse({'status': 'ok', 'mensaje': 'Reporte rechazado correctamente.'})

    return JsonResponse({'status': 'error', 'mensaje': 'Método no permitido'})


@login_required
@user_passes_test(es_moderador)
def detalles_reporte(request, id):
    """Obtiene los detalles de un reporte para el modal de moderación."""
    reporte = get_object_or_404(NuevoReporte, id=id)

    data = {
        'titulo': reporte.titulo,
        'fecha': reporte.fecha.strftime("%d/%m/%Y"),
        'hora': reporte.hora.strftime("%H:%M") if reporte.hora else '',
        'tipo_animal': reporte.get_tipo_animal_display(),
        'cantidad_perros': reporte.cantidad_perros or 'Sin dato',
        'gravedad': reporte.get_gravedad_display(),
        'direccion': reporte.direccion or 'No indicada',
        'ciudad': reporte.ciudad or 'No especificada',
        'region': reporte.region or 'No especificada',
        'pais': reporte.pais or 'Chile',
        'nombre_reportante': reporte.nombre_visible() or '',
        'email_reportante': reporte.email_reportante or '',
        'telefono_reportante': reporte.telefono_reportante or '',
        'anonimo': reporte.anonimo,
        'usuario': reporte.usuario.username if reporte.usuario else '',
        'latitud': float(reporte.latitud) if reporte.latitud else None,
        'longitud': float(reporte.longitud) if reporte.longitud else None,
        'descripcion': reporte.descripcion or '',
    }

    return JsonResponse(data)


@login_required
@user_passes_test(es_moderador)
@require_http_methods(["DELETE", "POST"])
def eliminar_reporte(request, id):
    """Elimina permanentemente un reporte de la base de datos."""
    reporte = get_object_or_404(NuevoReporte, id=id)

    titulo = reporte.titulo

    ModeracionLog.objects.create(
        reporte=None,
        moderador=request.user,
        accion='eliminado',
        motivo=f'Reporte "{titulo}" (ID: {id}) eliminado permanentemente',
        detalles_extra={'reporte_id': id, 'titulo': titulo}
    )

    reporte.delete()

    return JsonResponse({
        'status': 'ok',
        'mensaje': f'Reporte "{titulo}" eliminado permanentemente.'
    })


@login_required
@user_passes_test(es_moderador)
def exportar_csv(request):
    """Exporta todos los reportes a formato CSV."""
    reportes = NuevoReporte.objects.all().select_related('usuario', 'moderador')

    fecha_actual = timezone.now().strftime("%Y-%m-%d_%H-%M")
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="reportes_{fecha_actual}.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'ID', 'Título', 'Descripción', 'Estado', 'Gravedad', 'Tipo Animal',
        'Cantidad Perros', 'Dirección', 'Latitud', 'Longitud',
        'Fecha', 'Hora', 'Usuario', 'Email', 'Teléfono',
        'Moderador', 'Comentario Moderación'
    ])

    for r in reportes:
        writer.writerow([
            r.id, r.titulo, r.descripcion, r.estado, r.gravedad,
            r.tipo_animal, r.cantidad_perros, r.direccion, r.latitud, r.longitud,
            r.fecha.strftime("%d-%m-%Y") if r.fecha else '',
            r.hora.strftime("%H:%M") if r.hora else '',
            r.usuario.username if r.usuario else 'Anónimo',
            r.email_reportante, r.telefono_reportante,
            r.moderador.username if r.moderador else '',
            r.comentario_moderacion or ''
        ])

    return response

@login_required
@user_passes_test(es_moderador)
@require_http_methods(["POST"])
def toggle_visibilidad_foto(request, foto_id):
    """Cambia la visibilidad de una foto (visible/censurada/oculta)."""
    foto = get_object_or_404(Foto, id=foto_id)

    data = json.loads(request.body)
    accion = data.get('accion', 'toggle')
    motivo = data.get('motivo', '')

    if accion == 'censurar':
        foto.censurar(request.user, motivo)
        mensaje = f'Foto censurada correctamente'
    elif accion == 'ocultar':
        foto.ocultar(request.user, motivo)
        mensaje = f'Foto ocultada correctamente'
    else:
        if foto.visibilidad == 'visible':
            foto.censurar(request.user, 'Contenido sensible')
            mensaje = f'Foto censurada correctamente'
        else:
            foto.aprobar(request.user)
            mensaje = f'Foto aprobada y visible públicamente'

    ModeracionLog.objects.create(
        reporte=foto.reporte,
        foto=foto,
        moderador=request.user,
        accion='foto_censurada' if foto.visibilidad != 'visible' else 'foto_aprobada',
        motivo=motivo or foto.motivo_censura
    )

    return JsonResponse({
        'status': 'ok',
        'visibilidad': foto.visibilidad,
        'mensaje': mensaje
    })


@login_required
@user_passes_test(es_moderador)
@require_http_methods(["POST"])
def aprobar_foto(request, foto_id):
    """Aprueba una foto para ser visible públicamente."""
    foto = get_object_or_404(Foto, id=foto_id)
    foto.aprobar(request.user)

    ModeracionLog.objects.create(
        reporte=foto.reporte,
        foto=foto,
        moderador=request.user,
        accion='foto_aprobada',
        motivo='Foto aprobada para visibilidad pública'
    )

    return JsonResponse({
        'status': 'ok',
        'mensaje': 'Foto aprobada y visible públicamente'
    })


@login_required
@user_passes_test(es_moderador)
@require_http_methods(["POST"])
def censurar_todas_fotos(request, reporte_id):
    """Censura todas las fotos de un reporte."""
    reporte = get_object_or_404(NuevoReporte, id=reporte_id)
    data = json.loads(request.body)
    motivo = data.get('motivo', 'Contenido sensible')

    fotos = reporte.fotos.all()
    for foto in fotos:
        foto.censurar(request.user, motivo)

    return JsonResponse({
        'status': 'ok',
        'mensaje': f'{fotos.count()} foto(s) censuradas correctamente'
    })


@login_required
@user_passes_test(es_moderador)
@require_http_methods(["POST"])
def aprobar_todas_fotos(request, reporte_id):
    """Aprueba todas las fotos de un reporte."""
    reporte = get_object_or_404(NuevoReporte, id=reporte_id)

    fotos = reporte.fotos.all()
    for foto in fotos:
        foto.aprobar(request.user)

    return JsonResponse({
        'status': 'ok',
        'mensaje': f'{fotos.count()} foto(s) aprobadas correctamente'
    })


@login_required
@user_passes_test(es_moderador)
@require_http_methods(["POST"])
def ocultar_todas_fotos(request, reporte_id):
    """Oculta todas las fotos de un reporte."""
    reporte = get_object_or_404(NuevoReporte, id=reporte_id)
    data = json.loads(request.body)
    motivo = data.get('motivo', 'Ocultadas por moderador')

    fotos = reporte.fotos.all()
    for foto in fotos:
        foto.ocultar(request.user, motivo)

    return JsonResponse({
        'status': 'ok',
        'mensaje': f'{fotos.count()} foto(s) ocultadas correctamente'
    })

@login_required
def usuarios_list(request):
    """Lista de usuarios para administración."""
    if not es_mod_o_admin(request.user):
        return redirect("index")

    usuarios = User.objects.select_related("perfil").all()

    admins_count = usuarios.filter(perfil__rol="admin").count()
    moderadores_count = usuarios.filter(perfil__rol="moderador").count()

    return render(request, "admin/usuarios.html", {
        "usuarios": usuarios,
        "admins_count": admins_count,
        "moderadores_count": moderadores_count,
    })


@login_required
@require_http_methods(["POST"])
def crear_usuario(request):
    """Crea un nuevo usuario (solo admin)."""
    if not es_admin(request.user):
        return JsonResponse({"success": False, "message": "No autorizado"})

    try:
        data = json.loads(request.body)

        name = data.get("name", "").strip()
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        role = data.get("role", "").strip()

        if "" in [name, username, email, password, role]:
            return JsonResponse({"success": False, "message": "Todos los campos son obligatorios"})

        if role not in ["moderador", "admin"]:
            return JsonResponse({"success": False, "message": "Rol inválido"})

        if User.objects.filter(username__iexact=username).exists():
            return JsonResponse({
                "success": False,
                "message": "El nombre de usuario ya está en uso"
            })

        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({
                "success": False,
                "message": "El email ya está registrado"
            })

        user = User.objects.create_user(username=username, email=email, password=password)

        partes = name.split(" ", 1)
        user.first_name = partes[0]
        user.last_name = partes[1] if len(partes) > 1 else ""
        user.save()

        perfil = user.perfil
        perfil.rol = role
        perfil.save()

        return JsonResponse({
            "success": True,
            "message": f"Usuario {username} creado correctamente"
        })

    except Exception as e:
        return JsonResponse({"success": False, "message": f"Error: {str(e)}"})


@login_required
def usuario_data(request, user_id):
    """Obtiene los datos de un usuario específico."""
    if not es_mod_o_admin(request.user):
        return JsonResponse({"success": False, "message": "No autorizado"})

    usuario = get_object_or_404(User.objects.select_related("perfil"), id=user_id)

    return JsonResponse({
        "id": usuario.id,
        "name": usuario.get_full_name() or usuario.username,
        "email": usuario.email,
        "role": usuario.perfil.rol,
        "date_joined": usuario.date_joined.strftime("%d/%m/%Y"),
        "reportes_count": usuario.reportes.count(),
        "reportes_moderados_count": usuario.reportes_moderados.count(),
    })


@login_required
@require_http_methods(["GET", "POST"])
def editar_usuario(request, user_id):
    """Edita un usuario existente (solo admin)."""
    if not es_admin(request.user):
        return JsonResponse({"success": False, "message": "No autorizado"})

    usuario = get_object_or_404(User.objects.select_related("perfil"), id=user_id)

    if request.method == "GET":
        return JsonResponse({
            "id": usuario.id,
            "name": usuario.get_full_name() or usuario.username,
            "email": usuario.email,
            "role": usuario.perfil.rol,
        })

    try:
        data = json.loads(request.body)

        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        role = data.get("role", "").strip()

        if role not in ["usuario", "moderador", "admin"]:
            return JsonResponse({"success": False, "message": "Rol inválido"})

        if User.objects.filter(email__iexact=email).exclude(id=usuario.id).exists():
            return JsonResponse({
                "success": False,
                "message": "El email ya está en uso por otro usuario"
            })

        partes = name.split(" ", 1)
        usuario.first_name = partes[0]
        usuario.last_name = partes[1] if len(partes) > 1 else ""

        usuario.email = email
        usuario.save()

        usuario.perfil.rol = role
        usuario.perfil.save()

        return JsonResponse({
            "success": True,
            "message": "Usuario actualizado correctamente"
        })

    except Exception as e:
        return JsonResponse({"success": False, "message": f"Error: {str(e)}"})


@login_required
@require_http_methods(["DELETE"])
def eliminar_usuario(request, user_id):
    """Elimina un usuario (solo admin)."""
    if not es_admin(request.user):
        return JsonResponse({"success": False, "message": "No autorizado"})

    usuario = get_object_or_404(User.objects.select_related("perfil"), id=user_id)

    if usuario == request.user:
        return JsonResponse({
            "success": False,
            "message": "No puedes eliminarte a ti mismo"
        })

    if usuario.perfil.rol == "admin":
        if User.objects.filter(perfil__rol="admin").count() <= 1:
            return JsonResponse({
                "success": False,
                "message": "No puedes eliminar al último administrador"
            })

    username = usuario.username
    usuario.delete()

    return JsonResponse({
        "success": True,
        "message": f"Usuario {username} eliminado correctamente"
    })

def privacidad(request):
    """Página de Política de Privacidad."""
    return render(request, 'legal/privacidad.html')


def terminos(request):
    """Página de Términos y Condiciones."""
    return render(request, 'legal/terminos.html')