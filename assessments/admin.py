from django.contrib import admin
from .models import Question, AssessmentSubmission


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'text', 'is_reversed')
    list_filter = ('is_reversed',)
    search_fields = ('text',)


@admin.register(AssessmentSubmission)
class AssessmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'best_match_figure', 'best_match_similarity')
    list_filter = ('created_at', 'best_match_figure')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'trait_scores_0_3', 'dimension_averages_0_10',
                      'heinlein_averages', 'overall', 'best_match_similarity')