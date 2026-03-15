from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
    path('questions/', views.QuestionListView.as_view(), name='question-list'),
    path('assessments/', views.AssessmentCreateView.as_view(), name='assessment-create'),
    path('assessments/latest/', views.LatestAssessmentView.as_view(), name='latest-assessment'),
    path('assessments/history/', views.AssessmentHistoryView.as_view(), name='assessment-history'),
    path('assessments/<int:pk>/', views.AssessmentDetailView.as_view(), name='assessment-detail'),
    path('matches/latest/', views.LatestMatchesView.as_view(), name='latest-matches'),
    path('compare/<slug:slug>/', views.CompareView.as_view(), name='compare'),
    path('auth/signup/', views.SignupView.as_view(), name='signup'),
]