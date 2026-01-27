from rest_framework import serializers
from .models import HistoricalFigure, FigureIngestionRequest


class HistoricalFigureSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricalFigure
        fields = '__all__'


class FigureIngestionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FigureIngestionRequest
        fields = '__all__'
        read_only_fields = ('status', 'error', 'result_figure', 'created_at', 'updated_at')