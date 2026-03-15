from rest_framework import serializers
from .models import HistoricalFigure, FigureIngestionRequest


class HistoricalFigureListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()
    bio_intro = serializers.SerializerMethodField()

    def get_image(self, obj):
        if obj.image:
            return obj.image.url  # relative: /media/figures/...
        return None

    def get_summary(self, obj):
        if obj.score_json:
            return obj.score_json.get('summary') or None
        return None

    def get_bio_intro(self, obj):
        if obj.bio_long:
            return obj.bio_long.split('\n\n')[0]
        return obj.bio_short or None

    class Meta:
        model = HistoricalFigure
        fields = [
            'id', 'name', 'slug', 'bio_short', 'summary', 'bio_intro', 'image',
            'overall_normalized_equal_avg_0_10',
            'core_4d_avg_0_10',
            'general_competency_avg_0_10',
        ]


class HistoricalFigureDetailSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        if obj.image:
            return obj.image.url  # relative: /media/figures/...
        return None

    class Meta:
        model = HistoricalFigure
        fields = '__all__'


class FigureIngestionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FigureIngestionRequest
        fields = '__all__'
        read_only_fields = ('status', 'error', 'result_figure', 'created_at', 'updated_at')
