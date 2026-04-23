# server/api_views.py (archivo nuevo)

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import NuevoReporte
from .serializers import ReporteSerializer, ReporteCreateSerializer

class ReporteViewSet(viewsets.ModelViewSet):
    """
    API completa para reportes:
    - GET /api/reportes/ → Lista todos los reportes aprobados
    - GET /api/reportes/5/ → Detalle del reporte #5
    - POST /api/reportes/ → Crear nuevo reporte
    """
    queryset = NuevoReporte.objects.filter(estado='aprobado')
    permission_classes = [permissions.AllowAny]  # Público
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReporteCreateSerializer
        return ReporteSerializer

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def consultar_reportes_api(request):
    """
    API para consultar reportes por email (como tu versión actual pero REST)
    POST /api/consultar/
    Body: { "email": "usuario@email.com" }
    """
    email = request.data.get('email', '').strip().lower()
    
    if not email:
        return Response(
            {'error': 'Email requerido'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    reportes = NuevoReporte.objects.filter(
        email_reportante__iexact=email,
        anonimo=False
    )
    
    serializer = ReporteSerializer(reportes, many=True)
    
    return Response({
        'total': reportes.count(),
        'reportes': serializer.data
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def estadisticas_api(request):
    """
    API para estadísticas
    GET /api/estadisticas/
    """
    from django.db.models import Count
    
    total = NuevoReporte.objects.filter(estado='aprobado').count()
    por_gravedad = NuevoReporte.objects.filter(estado='aprobado')\
        .values('gravedad').annotate(total=Count('id'))
    
    return Response({
        'total_reportes_aprobados': total,
        'por_gravedad': list(por_gravedad)
    })

@api_view(['GET'])
def reportes_cercanos_api(request):
    """
    API para reportes por ubicación
    GET /api/reportes-cercanos/?lat=-33.4489&lng=-70.6693&radio=5
    """
    from django.db.models import Q
    
    lat = request.GET.get('lat')
    lng = request.GET.get('lng')
    radio = request.GET.get('radio', 5)  # km
    
    if not lat or not lng:
        return Response(
            {'error': 'Latitud y longitud requeridas'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Filtro simple por proximidad (para producción usar GeoDjango)
    lat = float(lat)
    lng = float(lng)
    radio = float(radio)
    
    # Aproximación: 1 grado ≈ 111 km
    delta = radio / 111
    
    reportes = NuevoReporte.objects.filter(
        estado='aprobado',
        latitud__gte=lat - delta,
        latitud__lte=lat + delta,
        longitud__gte=lng - delta,
        longitud__lte=lng + delta
    )[:20]
    
    serializer = ReporteSerializer(reportes, many=True)
    return Response(serializer.data)