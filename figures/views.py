from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from .models import HistoricalFigure, FigureIngestionRequest
from .serializers import HistoricalFigureSerializer, FigureIngestionRequestSerializer
from django.db.models import Q
import os


class FigureListView(generics.ListAPIView):
    serializer_class = HistoricalFigureSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = HistoricalFigure.objects.all()

        # Sorting
        sort = self.request.GET.get('sort', 'overall')
        direction = self.request.GET.get('dir', 'desc')

        if sort == 'core':
            order_field = 'core_4d_avg_0_10'
        elif sort == 'heinlein':
            order_field = 'general_competency_avg_0_10'
        else:  # overall
            order_field = 'overall_normalized_equal_avg_0_10'

        if direction == 'desc':
            order_field = '-' + order_field

        queryset = queryset.order_by(order_field)

        # Search
        search = self.request.GET.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(bio_short__icontains=search) |
                Q(bio_long__icontains=search)
            )

        return queryset


class FigureDetailView(generics.RetrieveAPIView):
    queryset = HistoricalFigure.objects.all()
    serializer_class = HistoricalFigureSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


class FigureIngestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Check for admin API key
        admin_api_key = request.META.get('HTTP_X_ADMIN_API_KEY')
        required_api_key = os.environ.get('ADMIN_API_KEY')

        if not (admin_api_key and admin_api_key == required_api_key):
            # Check if user is staff
            if not request.user.is_staff:
                return Response(
                    {'detail': 'Admin API key or staff privileges required'},
                    status=status.HTTP_403_FORBIDDEN
                )

        figure_name = request.data.get('figure_name')
        biography_text = request.data.get('biography_text')

        if not figure_name or not biography_text:
            return Response(
                {'detail': 'figure_name and biography_text are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create ingestion request (signal triggers queue processor)
        ingestion_request = FigureIngestionRequest.objects.create(
            requested_by=request.user if request.user.is_authenticated else None,
            figure_name=figure_name,
            biography_text=biography_text
        )

        serializer = FigureIngestionRequestSerializer(ingestion_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FigureIngestStatusView(generics.RetrieveAPIView):
    queryset = FigureIngestionRequest.objects.all()
    serializer_class = FigureIngestionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj = super().get_object()

        # Check for admin API key
        admin_api_key = self.request.META.get('HTTP_X_ADMIN_API_KEY')
        required_api_key = os.environ.get('ADMIN_API_KEY')

        if not (admin_api_key and admin_api_key == required_api_key):
            # Check if user is staff or requester
            if not (self.request.user.is_staff or obj.requested_by == self.request.user):
                raise PermissionDenied("Admin API key, staff privileges, or requester identity required")

        return obj