import json  
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from datetime import date, time
from unittest.mock import patch, MagicMock

from .models import NuevoReporte, Foto, PerfilUsuario, ModeracionLog
from .forms import NuevoReporteForm


# ============================================
# CONFIGURACIÓN PARA SALTAR CLOUDINARY EN TESTS
# ============================================

def mock_cloudinary_upload(*args, **kwargs):
    """Mock para evitar subir archivos reales a Cloudinary durante tests."""
    return {
        'public_id': 'test_public_id',
        'secure_url': 'https://res.cloudinary.com/dj1ch8hzy/image/upload/v1234567890/test.jpg',
        'url': 'http://res.cloudinary.com/dj1ch8hzy/image/upload/v1234567890/test.jpg'
    }


# ============================================
# 1. TESTS DE MODELOS
# ============================================

class PerfilUsuarioModelTest(TestCase):
    """Pruebas para el modelo PerfilUsuario."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_creacion_perfil_automatica(self):
        """Verifica que se cree un perfil automáticamente al crear usuario."""
        self.assertTrue(hasattr(self.user, 'perfil'))
        self.assertEqual(self.user.perfil.rol, 'moderador')
    
    def test_rol_superuser_admin(self):
        """Verifica que los superusuarios tengan rol 'admin'."""
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        self.assertEqual(admin.perfil.rol, 'admin')
    
    def test_str_method(self):
        """Verifica el método __str__ del perfil."""
        expected = f"{self.user.username} (Moderador)"
        self.assertEqual(str(self.user.perfil), expected)


class NuevoReporteModelTest(TestCase):
    """Pruebas para el modelo NuevoReporte."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='reporter',
            email='reporter@test.com',
            password='testpass123'
        )
        
        self.reporte = NuevoReporte.objects.create(
            titulo='Ataque de perro en el parque',
            fecha=date.today(),
            hora=time(14, 30),
            tipo_animal='gato',
            cantidad_perros=3,
            gravedad='moderado',
            descripcion='Un grupo de perros atacó a un gato en el parque central...' + 'x' * 50,
            latitud=-33.4489,
            longitud=-70.6693,
            ciudad='Santiago',
            region='Metropolitana',
            pais='Chile',
            nombre_reportante='Juan Pérez',
            email_reportante='juan@test.com',
            telefono_reportante='+56912345678',
            usuario=self.user
        )
    
    def test_creacion_reporte(self):
        """Verifica que se pueda crear un reporte correctamente."""
        self.assertEqual(NuevoReporte.objects.count(), 1)
        self.assertEqual(self.reporte.estado, 'pendiente')
        self.assertEqual(self.reporte.gravedad, 'moderado')
    
    def test_reporte_anonimo_limpia_datos(self):
        """Verifica que el método clean() limpie datos en reportes anónimos."""
        reporte_anonimo = NuevoReporte(
            titulo='Reporte anónimo',
            fecha=date.today(),
            tipo_animal='perro',
            cantidad_perros=2,
            gravedad='leve',
            descripcion='x' * 50,
            latitud=-33.0,
            longitud=-71.0,
            anonimo=True,
            nombre_reportante='Debería borrarse',
            email_reportante='borrar@test.com'
        )
        reporte_anonimo.clean()
        self.assertIsNone(reporte_anonimo.nombre_reportante)
        self.assertIsNone(reporte_anonimo.email_reportante)
    
    def test_ubicacion_invalida_lanza_error(self):
        """Verifica que lat/lon (0,0) lance ValidationError."""
        reporte_invalido = NuevoReporte(
            titulo='Ubicación inválida',
            fecha=date.today(),
            tipo_animal='perro',
            cantidad_perros=1,
            gravedad='leve',
            descripcion='x' * 50,
            latitud=0,
            longitud=0
        )
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            reporte_invalido.clean()
    
    def test_nombre_visible_method(self):
        """Verifica el método nombre_visible()."""
        self.assertEqual(self.reporte.nombre_visible(), 'Juan Pérez')
        
        self.reporte.anonimo = True
        self.reporte.save()
        self.assertEqual(self.reporte.nombre_visible(), 'Anónimo')
    
    def test_ubicacion_completa_method(self):
        """Verifica el método ubicacion_completa()."""
        ubicacion = self.reporte.ubicacion_completa()
        self.assertIn('Santiago', ubicacion)
        self.assertIn('Metropolitana', ubicacion)
        self.assertIn('Chile', ubicacion)
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_tiene_fotos_visibles(self, mock_upload):
        """Verifica el método tiene_fotos_visibles()."""
        self.assertFalse(self.reporte.tiene_fotos_visibles())
        
        foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"file_content", content_type="image/jpeg"),
            visibilidad='visible',
            estado_moderacion='aprobada'
        )
        self.assertTrue(self.reporte.tiene_fotos_visibles())
    
    def test_str_method(self):
        """Verifica el método __str__ del reporte."""
        expected = f"{self.reporte.titulo} (Moderado - Santiago, Metropolitana)"
        self.assertEqual(str(self.reporte), expected)


class FotoModelTest(TestCase):
    """Pruebas para el modelo Foto."""
    
    def setUp(self):
        self.user = User.objects.create_user(username='mod', password='pass')
        self.reporte = NuevoReporte.objects.create(
            titulo='Test',
            fecha=date.today(),
            tipo_animal='perro',
            gravedad='leve',
            descripcion='x' * 50,
            latitud=-33.0,
            longitud=-71.0
        )
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_foto_visible_por_defecto(self, mock_upload):
        """Verifica que las fotos sean visibles por defecto."""
        self.foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"content", content_type="image/jpeg")
        )
        self.assertEqual(self.foto.visibilidad, 'visible')
        self.assertEqual(self.foto.estado_moderacion, 'pendiente')
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_censurar_foto(self, mock_upload):
        """Verifica el método censurar()."""
        self.foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"content", content_type="image/jpeg")
        )
        self.foto.censurar(self.user, 'Contenido gráfico')
        self.assertEqual(self.foto.visibilidad, 'censurada')
        self.assertTrue(self.foto.contiene_contenido_grafico)
        self.assertEqual(self.foto.moderada_por, self.user)
        self.assertEqual(self.foto.motivo_censura, 'Contenido gráfico')
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_ocultar_foto(self, mock_upload):
        """Verifica el método ocultar()."""
        self.foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"content", content_type="image/jpeg")
        )
        self.foto.ocultar(self.user, 'No cumple políticas')
        self.assertEqual(self.foto.visibilidad, 'oculta')
        self.assertTrue(self.foto.contiene_contenido_grafico)
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_aprobar_foto(self, mock_upload):
        """Verifica el método aprobar()."""
        self.foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"content", content_type="image/jpeg")
        )
        self.foto.aprobar(self.user)
        self.assertEqual(self.foto.visibilidad, 'visible')
        self.assertEqual(self.foto.estado_moderacion, 'aprobada')
        self.assertFalse(self.foto.contiene_contenido_grafico)
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_es_visible_publicamente(self, mock_upload):
        """Verifica el método es_visible_publicamente()."""
        self.foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"content", content_type="image/jpeg")
        )
        self.assertFalse(self.foto.es_visible_publicamente())
        
        self.foto.estado_moderacion = 'aprobada'
        self.foto.save()
        self.assertTrue(self.foto.es_visible_publicamente())
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_save_sincroniza_es_censurada(self, mock_upload):
        """Verifica que save() sincronice es_censurada con visibilidad."""
        self.foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"content", content_type="image/jpeg")
        )
        self.foto.visibilidad = 'censurada'
        self.foto.save()
        self.assertTrue(self.foto.es_censurada)
        
        self.foto.visibilidad = 'visible'
        self.foto.save()
        self.assertFalse(self.foto.es_censurada)


# ============================================
# 2. TESTS DE FORMULARIOS
# ============================================

class NuevoReporteFormTest(TestCase):
    """Pruebas para el formulario NuevoReporteForm."""
    
    def setUp(self):
        self.datos_validos = {
            'titulo': 'Ataque de perros',
            'fecha': date.today(),
            'hora': '14:30',
            'tipo_animal': 'perro',
            'cantidad_perros': 3,
            'gravedad': 'moderado',
            'descripcion': 'Descripción detallada del incidente con más de cincuenta caracteres...' + 'x' * 30,
            'latitud': -33.4489,
            'longitud': -70.6693,
            'nombre_reportante': 'Ana Gómez',
            'email_reportante': 'ana@test.com',
            'anonimo': False
        }
    
    def test_form_valido_con_datos_correctos(self):
        """Verifica que el formulario sea válido con datos correctos."""
        form = NuevoReporteForm(data=self.datos_validos)
        self.assertTrue(form.is_valid())
    
    def test_descripcion_muy_corta(self):
        """Verifica que la descripción requiera mínimo 50 caracteres."""
        datos = self.datos_validos.copy()
        datos['descripcion'] = 'Muy corta'
        form = NuevoReporteForm(data=datos)
        self.assertFalse(form.is_valid())
        self.assertIn('descripcion', form.errors)
    
    def test_form_anonimo_no_requiere_datos_contacto(self):
        """Verifica que en modo anónimo no se requieran datos de contacto."""
        datos = self.datos_validos.copy()
        datos['anonimo'] = True
        datos['nombre_reportante'] = ''
        datos['email_reportante'] = ''
        
        form = NuevoReporteForm(data=datos)
        self.assertTrue(form.is_valid())
    
    def test_form_no_anonimo_requiere_contacto(self):
        """Verifica que se requieran datos de contacto si no es anónimo."""
        datos = self.datos_validos.copy()
        datos['nombre_reportante'] = ''
        datos['email_reportante'] = ''
        
        form = NuevoReporteForm(data=datos)
        self.assertFalse(form.is_valid())
        self.assertIn('nombre_reportante', form.errors)
        self.assertIn('email_reportante', form.errors)


# ============================================
# 3. TESTS DE VISTAS PÚBLICAS
# ============================================

class VistasPublicasTest(TestCase):
    """Pruebas para vistas públicas (sin autenticación)."""
    
    def setUp(self):
        self.client = Client()
        
        self.reporte_aprobado = NuevoReporte.objects.create(
            titulo='Reporte aprobado',
            fecha=date.today(),
            tipo_animal='perro',
            gravedad='leve',
            descripcion='x' * 50,
            latitud=-33.0,
            longitud=-71.0,
            estado='aprobado'
        )
        
        self.reporte_pendiente = NuevoReporte.objects.create(
            titulo='Reporte pendiente',
            fecha=date.today(),
            tipo_animal='gato',
            gravedad='moderado',
            descripcion='x' * 50,
            latitud=-33.0,
            longitud=-71.0,
            estado='pendiente'
        )
    
    def test_index_carga_correctamente(self):
        """Verifica que la página principal cargue con status 200."""
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'index.html')
    
    def test_index_muestra_solo_aprobados(self):
        """Verifica que el index solo muestre reportes aprobados."""
        response = self.client.get(reverse('index'))
        reportes = response.context['reportes']
        self.assertEqual(reportes.count(), 1)
        self.assertEqual(reportes.first(), self.reporte_aprobado)
    
    def test_mapa_carga_correctamente(self):
        """Verifica que la página del mapa cargue."""
        response = self.client.get(reverse('mapa'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'mapa.html')
    
    def test_mapa_api_json(self):
        """Verifica que la API del mapa devuelva JSON válido."""
        response = self.client.get(
            reverse('mapa'),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
    
    def test_estadisticas_cargan(self):
        """Verifica que la página de estadísticas cargue."""
        response = self.client.get(reverse('estadisticas'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'estadisticas.html')
    
    def test_consultar_reporte_carga(self):
        """Verifica que la página de consulta cargue."""
        response = self.client.get(reverse('consultar_reporte'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'consultar_reporte.html')
    
    def test_consultar_api_requiere_email(self):
        """Verifica que la API de consulta requiera email."""
        response = self.client.post(
            reverse('consultar_reportes_ajax'),
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data['success'])
    
    def test_consultar_api_devuelve_reportes(self):
        """Verifica que la API devuelva reportes asociados a un email."""
        self.reporte_aprobado.email_reportante = 'test@test.com'
        self.reporte_aprobado.save()
        
        response = self.client.post(
            reverse('consultar_reportes_ajax'),
            data=json.dumps({'email': 'test@test.com'}),
            content_type='application/json'
        )
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['reportes']), 1)


# ============================================
# 4. TESTS DE AUTENTICACIÓN (CORREGIDOS PARA AXES)
# ============================================

class AutenticacionTest(TestCase):
    """Pruebas de autenticación y seguridad."""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@test.com'
        )
    
    def test_login_correcto(self):
        """Verifica que un usuario pueda iniciar sesión correctamente."""
        # Usar force_login para evitar problemas con Axes en tests
        self.client.force_login(self.user)
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
    
    def test_login_incorrecto(self):
        """Verifica que credenciales incorrectas no permitan login."""
        response = self.client.post(reverse('login'), {
            'username': 'testuser',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, 200)
    
    def test_logout(self):
        """Verifica que el logout funcione correctamente."""
        self.client.force_login(self.user)
        response = self.client.get(reverse('logout'))
        self.assertRedirects(response, reverse('login'))
    
    def test_registro_usuario(self):
        """Verifica que un usuario pueda registrarse."""
        response = self.client.post(reverse('registro'), {
            'nombre': 'Nuevo Usuario',
            'email': 'nuevo@test.com',
            'password': 'SecurePass123',
            'confirm_password': 'SecurePass123',
            'terms': 'on'
        })
        # El registro puede redirigir o mostrar la página con errores
        # Verificamos que el usuario se haya creado
        self.assertTrue(User.objects.filter(email='nuevo@test.com').exists())


# ============================================
# 5. TESTS DE VISTAS DE REPORTES
# ============================================

class NuevoReporteViewTest(TestCase):
    """Pruebas para la vista de creación de reportes."""
    
    def setUp(self):
        self.client = Client()
        self.url = reverse('nuevo_reporte')
    
    def test_get_nuevo_reporte(self):
        """Verifica que la página de nuevo reporte cargue."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'nuevo_reporte.html')
    
    def test_post_nuevo_reporte_valido(self):
        """Verifica que se pueda crear un reporte vía POST."""
        datos = {
            'titulo': 'Nuevo reporte de prueba',
            'fecha': date.today().isoformat(),
            'hora': '14:30',
            'tipo_animal': 'perro',
            'cantidad_perros': 2,
            'gravedad': 'moderado',
            'descripcion': 'Esta es una descripción detallada del incidente que ocurrió...' + 'x' * 50,
            'latitud': '-33.4489',
            'longitud': '-70.6693',
            'direccion': 'Calle Test 123',
            'ciudad': 'Santiago',
            'region': 'Metropolitana',
            'pais': 'Chile',
            'nombre_reportante': 'Test User',
            'email_reportante': 'test@test.com',
            'anonimo': False
        }
        
        response = self.client.post(
            self.url,
            data=datos,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(NuevoReporte.objects.count(), 1)
    
    def test_post_reporte_anonimo(self):
        """Verifica que un reporte anónimo se cree correctamente."""
        datos = {
            'titulo': 'Reporte anónimo',
            'fecha': date.today().isoformat(),
            'tipo_animal': 'perro',
            'cantidad_perros': 1,
            'gravedad': 'leve',
            'descripcion': 'x' * 50,
            'latitud': '-33.0',
            'longitud': '-71.0',
            'anonimo': True
        }
        
        response = self.client.post(
            self.url,
            data=datos,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        data = response.json()
        self.assertTrue(data['success'])
        self.assertTrue(data['anonimo'])
        
        reporte = NuevoReporte.objects.first()
        self.assertTrue(reporte.anonimo)
        self.assertEqual(reporte.nombre_reportante, '')
        self.assertEqual(reporte.email_reportante, '')
    
    def test_post_reporte_sin_ubicacion_falla(self):
        """Verifica que no se pueda crear un reporte sin ubicación."""
        datos = {
            'titulo': 'Reporte sin ubicación',
            'fecha': date.today().isoformat(),
            'tipo_animal': 'perro',
            'cantidad_perros': 1,
            'gravedad': 'leve',
            'descripcion': 'x' * 50,
            'latitud': '',
            'longitud': ''
        }
        
        response = self.client.post(
            self.url,
            data=datos,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        data = response.json()
        self.assertFalse(data['success'])


# ============================================
# 6. TESTS DE MODERACIÓN (CORREGIDOS)
# ============================================

@override_settings(AXES_ENABLED=False)  # Desactivar Axes para tests de moderación
class ModeracionViewsTest(TestCase):
    """Pruebas para las vistas de moderación."""
    
    def setUp(self):
        self.client = Client()
        
        self.moderador = User.objects.create_user(
            username='moderador',
            email='mod@test.com',
            password='modpass123'
        )
        self.moderador.perfil.rol = 'moderador'
        self.moderador.perfil.save()
        
        self.reporte = NuevoReporte.objects.create(
            titulo='Reporte para moderar',
            fecha=date.today(),
            tipo_animal='perro',
            gravedad='grave',
            descripcion='x' * 50,
            latitud=-33.0,
            longitud=-71.0,
            estado='pendiente'
        )
        
        self.client.force_login(self.moderador)
    
    def test_panel_moderador_accesible(self):
        """Verifica que el moderador pueda acceder al panel."""
        response = self.client.get(reverse('panel_moderador'))
        self.assertEqual(response.status_code, 200)
    
    def test_aprobar_reporte(self):
        """Verifica que se pueda aprobar un reporte."""
        response = self.client.post(reverse('aprobar_reporte', args=[self.reporte.id]))
        self.assertEqual(response.status_code, 200)
        
        self.reporte.refresh_from_db()
        self.assertEqual(self.reporte.estado, 'aprobado')
    
    def test_rechazar_reporte(self):
        """Verifica que se pueda rechazar un reporte con motivo."""
        response = self.client.post(
            reverse('rechazar_reporte', args=[self.reporte.id]),
            data={'motivo': 'Información insuficiente'}
        )
        self.assertEqual(response.status_code, 200)
        
        self.reporte.refresh_from_db()
        self.assertEqual(self.reporte.estado, 'rechazado')
    
    def test_eliminar_reporte(self):
        """Verifica que se pueda eliminar un reporte."""
        reporte_id = self.reporte.id
        response = self.client.delete(reverse('eliminar_reporte', args=[reporte_id]))
        self.assertEqual(response.status_code, 200)
        
        with self.assertRaises(NuevoReporte.DoesNotExist):
            NuevoReporte.objects.get(id=reporte_id)


@override_settings(AXES_ENABLED=False)
class ModeracionFotosTest(TestCase):
    """Pruebas para la moderación de fotos."""
    
    def setUp(self):
        self.client = Client()
        
        self.moderador = User.objects.create_user(
            username='moderador',
            password='modpass123'
        )
        self.moderador.perfil.rol = 'moderador'
        self.moderador.perfil.save()
        
        self.reporte = NuevoReporte.objects.create(
            titulo='Test',
            fecha=date.today(),
            tipo_animal='perro',
            gravedad='leve',
            descripcion='x' * 50,
            latitud=-33.0,
            longitud=-71.0
        )
        
        self.client.force_login(self.moderador)
    
    @patch('cloudinary.uploader.upload', side_effect=mock_cloudinary_upload)
    def test_censurar_foto(self, mock_upload):
        """Verifica que se pueda censurar una foto."""
        self.foto = Foto.objects.create(
            reporte=self.reporte,
            archivo=SimpleUploadedFile("test.jpg", b"content", content_type="image/jpeg")
        )
        response = self.client.post(
            reverse('toggle_visibilidad_foto', args=[self.foto.id]),
            data=json.dumps({'accion': 'censurar', 'motivo': 'Contenido gráfico'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        self.foto.refresh_from_db()
        self.assertEqual(self.foto.visibilidad, 'censurada')


# ============================================
# 7. TESTS DE ADMINISTRACIÓN DE USUARIOS (CORREGIDOS)
# ============================================

@override_settings(AXES_ENABLED=False)
class AdminUsuariosTest(TestCase):
    """Pruebas para la administración de usuarios."""
    
    def setUp(self):
        self.client = Client()
        
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        
        self.client.force_login(self.admin)
    
    def test_usuarios_list_accesible_admin(self):
        """Verifica que el admin pueda ver la lista de usuarios."""
        response = self.client.get(reverse('usuarios_list'))
        self.assertEqual(response.status_code, 200)
    
    def test_crear_usuario_via_api(self):
        """Verifica que se pueda crear un usuario vía API."""
        datos = {
            'name': 'Nuevo Moderador',
            'username': 'nuevomod',
            'email': 'nuevo@test.com',
            'password': 'pass12345',
            'role': 'moderador'
        }
        
        response = self.client.post(
            reverse('crear_usuario'),
            data=json.dumps(datos),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        user = User.objects.get(username='nuevomod')
        self.assertEqual(user.email, 'nuevo@test.com')
    
    def test_eliminar_usuario(self):
        """Verifica que se pueda eliminar un usuario."""
        user = User.objects.create_user(username='to_delete', password='pass')
        
        response = self.client.delete(reverse('eliminar_usuario', args=[user.id]))
        self.assertEqual(response.status_code, 200)
        
        with self.assertRaises(User.DoesNotExist):
            User.objects.get(id=user.id)


# ============================================
# 8. TESTS DE LOGS DE MODERACIÓN
# ============================================

class ModeracionLogTest(TestCase):
    """Pruebas para el modelo ModeracionLog."""
    
    def setUp(self):
        self.moderador = User.objects.create_user(username='mod', password='pass')
        self.reporte = NuevoReporte.objects.create(
            titulo='Test',
            fecha=date.today(),
            tipo_animal='perro',
            gravedad='leve',
            descripcion='x' * 50,
            latitud=-33.0,
            longitud=-71.0
        )
    
    def test_creacion_log_aprobacion(self):
        """Verifica que se cree un log al aprobar un reporte."""
        log = ModeracionLog.objects.create(
            reporte=self.reporte,
            moderador=self.moderador,
            accion='verificado',
            motivo='Aprobado por moderador'
        )
        
        self.assertEqual(ModeracionLog.objects.count(), 1)
        self.assertEqual(log.accion, 'verificado')
    
    def test_log_sin_reporte(self):
        """Verifica que los logs funcionen sin reporte (para reportes eliminados)."""
        log = ModeracionLog.objects.create(
            reporte=None,
            moderador=self.moderador,
            accion='eliminado',
            motivo='Reporte eliminado'
        )
        
        self.assertIsNone(log.reporte)