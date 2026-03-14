from django.contrib import admin
from .models import HistoricalFigure, FigureIngestionRequest


@admin.register(HistoricalFigure)
class HistoricalFigureAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'core_4d_avg_0_10', 'general_competency_avg_0_10',
                   'overall_normalized_equal_avg_0_10', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'slug')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(FigureIngestionRequest)
class FigureIngestionRequestAdmin(admin.ModelAdmin):
    list_display = ('figure_name', 'status', 'requested_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('figure_name', 'requested_by__username')
    readonly_fields = ('created_at', 'updated_at', 'thinking_log')