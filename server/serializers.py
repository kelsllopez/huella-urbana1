# server/serializers.py (archivo nuevo)

from rest_framework import serializers
from .models import NuevoReporte, Foto

class FotoSerializer(serializers.ModelSerializer):
    """Convierte el modelo Foto a JSON"""
    class Meta:
        model = Foto
        fields = ['id', 'archivo', 'visibilidad', 'orden']

class ReporteSerializer(serializers.ModelSerializer):
    """Convierte el modelo NuevoReporte a JSON"""
    fotos = FotoSerializer(many=True, read_only=True)
    
    class Meta:
        model = NuevoReporte
        fields = [
            'id', 'titulo', 'descripcion', 'fecha', 'hora',
            'tipo_animal', 'gravedad', 'estado',
            'latitud', 'longitud', 'direccion', 'ciudad', 'region',
            'fotos', 'fecha_creacion'
        ]

class ReporteCreateSerializer(serializers.ModelSerializer):
    """Para CREAR reportes (diferente del de lectura)"""
    class Meta:
        model = NuevoReporte
        fields = [
            'titulo', 'descripcion', 'fecha', 'hora',
            'tipo_animal', 'cantidad_perros', 'gravedad',
            'latitud', 'longitud', 'direccion', 'ciudad', 'region',
            'nombre_reportante', 'email_reportante', 'anonimo'
        ]