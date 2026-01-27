from django.urls import path
from . import views

urlpatterns = [
    path('figures/', views.FigureListView.as_view(), name='figure-list'),
    path('figures/ingest/', views.FigureIngestView.as_view(), name='figure-ingest'),
    path('figures/ingest/<int:pk>/', views.FigureIngestStatusView.as_view(), name='figure-ingest-status'),
    path('figures/<slug:slug>/', views.FigureDetailView.as_view(), name='figure-detail'),
]