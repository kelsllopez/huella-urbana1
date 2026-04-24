from django.urls import path, include  # ← Agregar include
from . import views
from django.contrib.auth import views as auth_views
from rest_framework.routers import DefaultRouter 
from .api_views import (  
    ReporteViewSet, 
    consultar_reportes_api, 
    estadisticas_api, 
    reportes_cercanos_api
)

router = DefaultRouter()
router.register(r'reportes', ReporteViewSet)

urlpatterns = [

    path('', views.index, name='index'),
    path('detalle_reporte_mapa/<int:id>/', views.detalle, name='detalle_reporte_mapa'),
    path('nuevo/', views.nuevo_reporte, name='nuevo_reporte'),
    path('estadisticas/', views.estadisticas, name='estadisticas'),
    path('mapa/', views.mapa, name='mapa'),
    path('contacto/', views.contacto, name='contacto'),
    path('ayuda/', views.ayuda, name='ayuda'),
    path('acerca/', views.acerca, name='acerca'),

    path('registro/', views.registro, name='registro'),
    path('logout/', views.cerrar_sesion, name='logout'),
    path("login/", views.login_view, name="login"),
    path("reset/", auth_views.PasswordResetView.as_view(
            template_name="auth/password_reset_form.html",
            email_template_name="registration/password_reset_email.txt", 
            html_email_template_name="registration/password_reset_email.html",
            subject_template_name="registration/password_reset_subject.txt",
        ),
        name="password_reset"
    ),
    path('reset/enviado/',auth_views.PasswordResetDoneView.as_view(template_name='auth/password_reset_done.html'),name='password_reset_done'),
    path('reset/<uidb64>/<token>/',auth_views.PasswordResetConfirmView.as_view(template_name='auth/password_reset_confirm.html',success_url='/reset/completo/'),name='password_reset_confirm'),
    path('reset/completo/',auth_views.PasswordResetCompleteView.as_view(template_name='auth/password_reset_complete.html'),name='password_reset_complete'),
    path("api/check-email/", views.check_email, name="check_email"),

    path('moderador/', views.panel_moderador, name='panel_moderador'),
    path('detalles/<int:id>/', views.detalles_reporte, name='detalles_reporte'),
    path('aprobar/<int:id>/', views.aprobar_reporte, name='aprobar_reporte'),
    path('rechazar/<int:id>/', views.rechazar_reporte, name='rechazar_reporte'),
    path('foto/<int:foto_id>/toggle-visibilidad/', views.toggle_visibilidad_foto, name='toggle_visibilidad_foto'),
    path('reporte/<int:reporte_id>/censurar-todas-fotos/', views.censurar_todas_fotos, name='censurar_todas_fotos'),
    path('reporte/<int:reporte_id>/aprobar-todas-fotos/', views.aprobar_todas_fotos, name='aprobar_todas_fotos'),
    path('reporte/<int:reporte_id>/ocultar-todas-fotos/', views.ocultar_todas_fotos, name='ocultar_todas_fotos'),
    path('foto/<int:foto_id>/aprobar/', views.aprobar_foto, name='aprobar_foto'),
    path('eliminar-reporte/<int:id>/', views.eliminar_reporte, name='eliminar_reporte'),
    path('exportar_csv/', views.exportar_csv, name='exportar_csv'),

    path('usuarios/', views.usuarios_list, name='usuarios_list'),
    path('usuarios/crear/', views.crear_usuario, name='crear_usuario'),
    path('usuarios/<int:user_id>/data/', views.usuario_data, name='usuario_data'),
    path('usuarios/<int:user_id>/editar/', views.editar_usuario, name='editar_usuario'),
    path('usuarios/<int:user_id>/eliminar/', views.eliminar_usuario, name='eliminar_usuario'),

    path('privacidad/', views.privacidad, name='privacidad'),
    path('terminos/', views.terminos, name='terminos'),

    path('consultar/', views.consultar_reporte, name='consultar_reporte'),
    path('api/consultar-reportes/', views.consultar_reportes_ajax, name='consultar_reportes_ajax'),
    path('api/reporte/<int:reporte_id>/', views.detalle_reporte_ajax, name='detalle_reporte_ajax'),

    path('api/v1/', include(router.urls)),             
    path('api/v1/consultar/', consultar_reportes_api, name='api_v1_consultar'),
    path('api/v1/estadisticas/', estadisticas_api, name='api_v1_estadisticas'),
    path('api/v1/reportes-cercanos/', reportes_cercanos_api, name='api_v1_cercanos'),
]