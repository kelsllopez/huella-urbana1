"""
Modelos de la base de datos.
Organizados por categorías:
1. Modelo: PerfilUsuario
2. Modelo: NuevoReporte
3. Modelo: Foto
4. Modelo: ModeracionLog
"""


from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from cloudinary.models import CloudinaryField


class PerfilUsuario(models.Model):
    """Perfil extendido para usuarios del sistema."""

    ROLES = [
        ('moderador', 'Moderador'),
        ('admin', 'Administrador'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil',
        verbose_name='Usuario'
    )

    rol = models.CharField(
        max_length=20,
        choices=ROLES,
        default='moderador',
        verbose_name='Rol'
    )

    class Meta:
        verbose_name = 'Perfil de usuario'
        verbose_name_plural = 'Perfiles de usuarios'

    def __str__(self):
        return f"{self.user.username} ({self.get_rol_display()})"




class NuevoReporte(models.Model):
    """Modelo principal para reportes de ataques de perros."""

    TIPO_ANIMAL_CHOICES = [
        ('persona', 'Persona (humano)'),
        ('perro', 'Perro doméstico'),
        ('gato', 'Gato'),
        ('otro', 'Otro animal'),
    ]

    GRAVEDAD_CHOICES = [
        ('leve', 'Leve'),
        ('moderado', 'Moderado'),
        ('grave', 'Grave'),
    ]

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    titulo = models.CharField(
        max_length=200,
        verbose_name='Título'
    )

    fecha = models.DateField(
        verbose_name='Fecha del incidente'
    )

    hora = models.TimeField(
        null=True,
        blank=True,
        verbose_name='Hora aproximada'
    )

    tipo_animal = models.CharField(
        max_length=20,
        choices=TIPO_ANIMAL_CHOICES,
        verbose_name='Tipo de animal víctima'
    )

    cantidad_perros = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        verbose_name='Cantidad de perros agresores'
    )

    gravedad = models.CharField(
        max_length=20,
        choices=GRAVEDAD_CHOICES,
        verbose_name='Gravedad del ataque'
    )

    descripcion = models.TextField(
        verbose_name='Descripción detallada'
    )

    contiene_contenido_sensible = models.BooleanField(
        default=False,
        verbose_name='¿Contiene contenido sensible?',
        help_text='Marcar si el reporte contiene imágenes de sangre, heridas o violencia'
    )

    latitud = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
        verbose_name='Latitud'
    )

    longitud = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)],
        verbose_name='Longitud'
    )

    direccion = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Dirección'
    )

    ciudad = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Ciudad'
    )

    region = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Región'
    )

    pais = models.CharField(
        max_length=50,
        default='Chile',
        blank=True,
        verbose_name='País'
    )

    nombre_reportante = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name='Nombre del reportante'
    )

    email_reportante = models.EmailField(
        null=True,
        blank=True,
        verbose_name='Email del reportante'
    )

    telefono_reportante = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='Teléfono'
    )

    anonimo = models.BooleanField(
        default=False,
        verbose_name='¿Reporte anónimo?'
    )

    usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reportes',
        verbose_name='Usuario registrado'
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        verbose_name='Estado de moderación'
    )

    moderador = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reportes_moderados',
        verbose_name='Moderador asignado'
    )

    fecha_moderacion = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de moderación'
    )

    comentario_moderacion = models.TextField(
        null=True,
        blank=True,
        verbose_name='Comentario del moderador'
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de creación'
    )

    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name='Última actualización'
    )

    class Meta:
        verbose_name = 'Reporte'
        verbose_name_plural = 'Reportes'
        ordering = ['-fecha_creacion']

    def __str__(self):
        ubicacion = f"{self.ciudad}, {self.region}" if self.ciudad else "Ubicación GPS"
        return f"{self.titulo} ({self.get_gravedad_display()} - {ubicacion})"

    def clean(self):
        """Validaciones personalizadas del modelo."""
        if self.anonimo:
            self.nombre_reportante = None
            self.email_reportante = None
            self.telefono_reportante = None

        # Validar ubicación válida
        if self.latitud == 0 and self.longitud == 0:
            raise ValidationError("Debes seleccionar una ubicación válida en el mapa.")

    def nombre_visible(self):
        """Retorna el nombre visible del reportante."""
        if self.anonimo:
            return "Anónimo"
        return self.nombre_reportante or "Anónimo"

    def ubicacion_completa(self):
        """Retorna la ubicación formateada para mostrar en templates."""
        partes = []
        if self.direccion:
            partes.append(self.direccion)
        if self.ciudad:
            partes.append(self.ciudad)
        if self.region:
            partes.append(self.region)
        if self.pais:
            partes.append(self.pais)
        return ", ".join(partes) if partes else "Ubicación no especificada"

    def tiene_fotos_visibles(self):
        """Verifica si el reporte tiene al menos una foto visible públicamente."""
        return self.fotos.filter(
            visibilidad='visible',
            estado_moderacion='aprobada'
        ).exists()

    def get_foto_principal(self):
        """Retorna la primera foto visible o None."""
        return self.fotos.filter(
            visibilidad='visible',
            estado_moderacion='aprobada'
        ).first()


class Foto(models.Model):
    """Modelo para fotografías asociadas a reportes."""

    ESTADOS_MODERACION = [
        ('pendiente', 'Pendiente de revisión'),
        ('aprobada', 'Aprobada - Visible públicamente'),
        ('rechazada', 'Rechazada - No visible'),
    ]

    ESTADOS_VISIBILIDAD = [
        ('visible', 'Visible al público'),
        ('censurada', 'Censurada (contenido sensible)'),
        ('oculta', 'Oculta completamente'),
        ('pendiente', 'Pendiente de revisión'),
    ]

    reporte = models.ForeignKey(
        NuevoReporte,
        related_name='fotos',
        on_delete=models.CASCADE,
        verbose_name='Reporte asociado'
    )

    archivo = CloudinaryField(
        'imagen'
    )

    subida_en = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de subida'
    )

    orden = models.IntegerField(
        default=0,
        verbose_name='Orden de visualización'
    )

    contiene_contenido_grafico = models.BooleanField(
        default=False,
        verbose_name='¿Contiene contenido gráfico/sensible?'
    )

    visibilidad = models.CharField(
        max_length=20,
        choices=ESTADOS_VISIBILIDAD,
        default='visible',
        verbose_name='Visibilidad pública'
    )

    estado_moderacion = models.CharField(
        max_length=20,
        choices=ESTADOS_MODERACION,
        default='pendiente',
        verbose_name='Estado de moderación'
    )

    moderada_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fotos_moderadas',
        verbose_name='Moderada por'
    )

    fecha_moderacion = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de moderación'
    )

    motivo_censura = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Motivo de censura/ocultamiento'
    )

    es_censurada = models.BooleanField(
        default=False,
        verbose_name='¿Censurada?',
        help_text='Campo legacy - Usar visibilidad en su lugar'
    )

    class Meta:
        verbose_name = 'Fotografía'
        verbose_name_plural = 'Fotografías'
        ordering = ['orden', '-subida_en']

    def __str__(self):
        estado = f"[{self.get_visibilidad_display()}]" if self.visibilidad != 'visible' else ""
        return f"Foto {self.id} - {self.reporte.titulo} {estado}"

    def es_visible_publicamente(self):
        """Determina si la foto debe mostrarse al público."""
        return self.visibilidad == 'visible' and self.estado_moderacion == 'aprobada'

    def necesita_revision(self):
        """Determina si la foto necesita revisión del moderador."""
        return self.visibilidad == 'pendiente' or self.estado_moderacion == 'pendiente'

    def censurar(self, moderador, motivo=""):
        """Marca la foto como censurada."""
        self.visibilidad = 'censurada'
        self.contiene_contenido_grafico = True
        self.es_censurada = True
        self.moderada_por = moderador
        self.fecha_moderacion = timezone.now()
        self.motivo_censura = motivo or 'Contenido sensible'
        self.save()

    def ocultar(self, moderador, motivo=""):
        """Oculta la foto completamente."""
        self.visibilidad = 'oculta'
        self.contiene_contenido_grafico = True
        self.es_censurada = True
        self.moderada_por = moderador
        self.fecha_moderacion = timezone.now()
        self.motivo_censura = motivo or 'Ocultada por moderador'
        self.save()

    def aprobar(self, moderador):
        """Aprueba la foto para ser visible públicamente."""
        self.visibilidad = 'visible'
        self.estado_moderacion = 'aprobada'
        self.contiene_contenido_grafico = False
        self.es_censurada = False
        self.moderada_por = moderador
        self.fecha_moderacion = timezone.now()
        self.motivo_censura = ''
        self.save()

    def rechazar(self, moderador, motivo=""):
        """Rechaza la foto (no será visible)."""
        self.estado_moderacion = 'rechazada'
        self.visibilidad = 'oculta'
        self.moderada_por = moderador
        self.fecha_moderacion = timezone.now()
        self.motivo_censura = motivo or 'Rechazada por moderador'
        self.save()

    def save(self, *args, **kwargs):
        """Sincroniza es_censurada con visibilidad para compatibilidad."""
        self.es_censurada = self.visibilidad in ['censurada', 'oculta']
        super().save(*args, **kwargs)



class ModeracionLog(models.Model):
    """Registro de auditoría para acciones de moderación."""

    ACCIONES = [
        ('verificado', 'Verificado'),
        ('rechazado', 'Rechazado'),
        ('eliminado', 'Eliminado permanentemente'),
        ('comentario', 'Comentario interno'),
        ('foto_censurada', 'Foto censurada'),
        ('foto_aprobada', 'Foto aprobada'),
        ('foto_oculta', 'Foto oculta'),
    ]

    reporte = models.ForeignKey(
        NuevoReporte,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs',
        verbose_name='Reporte'
    )

    foto = models.ForeignKey(
        Foto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs',
        verbose_name='Foto relacionada'
    )

    moderador = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Moderador'
    )

    accion = models.CharField(
        max_length=50,
        choices=ACCIONES,
        verbose_name='Acción realizada'
    )

    motivo = models.TextField(
        blank=True,
        null=True,
        verbose_name='Motivo o Comentario'
    )

    fecha = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de la acción'
    )

    detalles_extra = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Detalles adicionales'
    )

    class Meta:
        verbose_name = 'Registro de moderación'
        verbose_name_plural = 'Registros de moderación'
        ordering = ['-fecha']

    def __str__(self):
        if self.reporte:
            return f"{self.moderador} → {self.get_accion_display()} (Reporte: {self.reporte.titulo})"
        return f"{self.moderador} → {self.get_accion_display()} (Reporte eliminado)"



@receiver(post_save, sender=User)
def crear_perfil_usuario(sender, instance, created, **kwargs):

    if created:
        rol = 'admin' if instance.is_superuser else 'moderador'
        PerfilUsuario.objects.get_or_create(
            user=instance,
            defaults={'rol': rol}
        )


@receiver(post_save, sender=Foto)
def sincronizar_censura(sender, instance, **kwargs):

    if instance.visibilidad in ['censurada', 'oculta'] and not instance.es_censurada:
        instance.es_censurada = True
        instance.save(update_fields=['es_censurada'])
    elif instance.visibilidad == 'visible' and instance.es_censurada:
        instance.es_censurada = False
        instance.save(update_fields=['es_censurada'])