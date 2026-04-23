from django import forms
from django.core.exceptions import ValidationError
from .models import NuevoReporte, Foto

class NuevoReporteForm(forms.ModelForm):
    """📝 Formulario para crear reportes con validación"""

    class Meta:
        model = NuevoReporte
        fields = [
            'titulo', 'fecha', 'hora', 'tipo_animal', 'cantidad_perros',
            'gravedad', 'descripcion', 'direccion', 'ciudad', 'region', 'pais',
            'latitud', 'longitud', 'nombre_reportante', 'email_reportante',
            'telefono_reportante', 'anonimo', 'contiene_contenido_sensible'
        ]
        widgets = {
            'titulo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ej: Ataque de perro en la calle',
                'required': 'required'
            }),
            'fecha': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
                'required': 'required'
            }),
            'hora': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),
            'tipo_animal': forms.Select(attrs={
                'class': 'form-select',
                'required': 'required'
            }),
            'cantidad_perros': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1',
                'value': '1'
            }),
            'gravedad': forms.Select(attrs={
                'class': 'form-select',
                'required': 'required'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': '5',
                'placeholder': 'Describe lo sucedido con el mayor detalle posible...',
                'required': 'required'
            }),
            'direccion': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Se rellenará automáticamente con el GPS'
            }),
            'ciudad': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Se rellenará automáticamente'
            }),
            'region': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Se rellenará automáticamente'
            }),
            'pais': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Chile'
            }),
            'latitud': forms.HiddenInput(),
            'longitud': forms.HiddenInput(),
            'nombre_reportante': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Juan Pérez'
            }),
            'email_reportante': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'correo@ejemplo.com'
            }),
            'telefono_reportante': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '+56 9 1234 5678'
            }),
            'anonimo': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'contiene_contenido_sensible': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }

    def clean_descripcion(self):
        descripcion = self.cleaned_data.get('descripcion', '')
        if len(descripcion.strip()) < 50:
            raise ValidationError('La descripción debe tener al menos 50 caracteres.')
        return descripcion

    def clean(self):
        cleaned_data = super().clean()
        anonimo = cleaned_data.get('anonimo', False)
        
        if not anonimo:
            nombre = cleaned_data.get('nombre_reportante')
            email = cleaned_data.get('email_reportante')
            
            if not nombre or not nombre.strip():
                self.add_error('nombre_reportante', 'El nombre es obligatorio si no es anónimo.')
            
            if not email or not email.strip():
                self.add_error('email_reportante', 'El email es obligatorio si no es anónimo.')
        
        return cleaned_data