from django.db import models
from django.contrib.auth.models import User


class HistoricalFigure(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    bio_short = models.CharField(max_length=600)  # <= 600 chars
    bio_long = models.TextField()
    source_notes = models.TextField()  # citations, links, provenance
    image = models.ImageField(upload_to='figures/', null=True, blank=True)
    score_json = models.JSONField()  # must match the schema used by the LLM output

    # Derived numeric fields for sorting (denormalize)
    core_4d_avg_0_10 = models.FloatField()
    general_competency_avg_0_10 = models.FloatField()
    overall_normalized_equal_avg_0_10 = models.FloatField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class FigureIngestionRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]

    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    figure_name = models.CharField(max_length=200)
    biography_text = models.TextField(blank=True)  # pasted bio; the LLM uses this
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error = models.TextField(null=True, blank=True)
    result_figure = models.ForeignKey(HistoricalFigure, on_delete=models.SET_NULL, null=True, blank=True)
    thinking_log = models.JSONField(null=True, blank=True)
    # Stores list of {"pass": str, "thinking": str} dicts from extended-thinking LLM calls
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.figure_name} - {self.status}"