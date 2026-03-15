from django.db import models
from django.contrib.auth.models import User
import json


class Question(models.Model):
    id = models.AutoField(primary_key=True)
    text = models.TextField()
    is_reversed = models.BooleanField(default=False)
    mapped_traits = models.JSONField()  # list of {trait, multiplier}

    def __str__(self):
        return self.text[:50] + "..."


class AssessmentSubmission(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    answers = models.JSONField()  # mapping question_id -> answer_value (Likert int)
    trait_scores_0_3 = models.JSONField()  # computed per trait, 0–3 float
    dimension_averages_0_10 = models.JSONField()
    heinlein_averages = models.JSONField()
    overall = models.JSONField()
    best_match_figure = models.ForeignKey('figures.HistoricalFigure', on_delete=models.SET_NULL, null=True, blank=True)
    best_match_similarity = models.FloatField(null=True, blank=True)
    match_results = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f"{self.user.username} - {self.created_at}"