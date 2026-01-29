from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Question, AssessmentSubmission
from .serializers import QuestionSerializer, AssessmentSerializer, UserSerializer
from .scoring import calculate_scores, calculate_similarity
from figures.models import HistoricalFigure
import json


class QuestionListView(generics.ListAPIView):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [AllowAny]


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssessmentCreateView(APIView):
    def post(self, request):
        user = request.user
        answers = request.data.get('answers', {})

        # Calculate scores
        scores = calculate_scores(answers)

        # Find best match
        best_match_figure = None
        best_match_similarity = None

        if scores.get('trait_scores_0_3'):
            # Get all historical figures
            figures = HistoricalFigure.objects.all()
            if figures.exists():
                similarities = []
                for figure in figures:
                    if figure.score_json:
                        similarity = calculate_similarity(scores['trait_scores_0_3'], figure.score_json)
                        similarities.append((figure, similarity))

                if similarities:
                    best_match_figure, best_match_similarity = max(similarities, key=lambda x: x[1])

        # Create assessment submission
        assessment = AssessmentSubmission.objects.create(
            user=user,
            answers=answers,
            trait_scores_0_3=scores['trait_scores_0_3'],
            dimension_averages_0_10=scores['dimension_averages_0_10'],
            heinlein_averages=scores['heinlein_averages'],
            overall=scores['overall'],
            best_match_figure=best_match_figure,
            best_match_similarity=best_match_similarity
        )

        serializer = AssessmentSerializer(assessment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LatestAssessmentView(APIView):
    def get(self, request):
        try:
            assessment = AssessmentSubmission.objects.filter(user=request.user).latest('created_at')
            serializer = AssessmentSerializer(assessment)
            return Response(serializer.data)
        except AssessmentSubmission.DoesNotExist:
            return Response({'detail': 'No assessments found'}, status=status.HTTP_404_NOT_FOUND)


class AssessmentDetailView(generics.RetrieveAPIView):
    queryset = AssessmentSubmission.objects.all()
    serializer_class = AssessmentSerializer


class LatestMatchesView(APIView):
    def get(self, request):
        top_n = int(request.GET.get('top', 10))

        try:
            assessment = AssessmentSubmission.objects.filter(user=request.user).latest('created_at')

            # Get all historical figures
            figures = HistoricalFigure.objects.all()
            similarities = []

            for figure in figures:
                if figure.score_json:
                    similarity = calculate_similarity(assessment.trait_scores_0_3, figure.score_json)
                    similarities.append({
                        'figure': figure.name,
                        'slug': figure.slug,
                        'similarity': similarity,
                        'bio_short': figure.bio_short
                    })

            # Sort by similarity and get top N
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            top_matches = similarities[:top_n]

            return Response({
                'top_matches': top_matches,
                'user_assessment_id': assessment.id
            })
        except AssessmentSubmission.DoesNotExist:
            return Response({'detail': 'No assessments found'}, status=status.HTTP_404_NOT_FOUND)