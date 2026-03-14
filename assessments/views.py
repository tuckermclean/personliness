from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Question, AssessmentSubmission
from .serializers import QuestionSerializer, AssessmentSerializer, UserSerializer
from .scoring import calculate_scores, calculate_match, rank_matches, flatten_figure_scores
from figures.models import HistoricalFigure
from personliness.traits import calculate_averages


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

        # Rank matches against all historical figures
        match_results = None
        best_match_figure = None
        best_match_similarity = None

        if scores.get('trait_scores_0_3'):
            match_results = rank_matches(scores['trait_scores_0_3'])
            if match_results:
                top = match_results[0]
                try:
                    best_match_figure = HistoricalFigure.objects.get(id=top['figure_id'])
                except HistoricalFigure.DoesNotExist:
                    pass
                best_match_similarity = top['overall_similarity']

        # Create assessment submission
        assessment = AssessmentSubmission.objects.create(
            user=user,
            answers=answers,
            trait_scores_0_3=scores['trait_scores_0_3'],
            dimension_averages_0_10=scores['dimension_averages_0_10'],
            heinlein_averages=scores['heinlein_averages'],
            overall=scores['overall'],
            best_match_figure=best_match_figure,
            best_match_similarity=best_match_similarity,
            match_results=match_results,
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

            # Read stored match_results if available; fall back to recalculation
            if assessment.match_results:
                top_matches = assessment.match_results[:top_n]
            else:
                top_matches = rank_matches(assessment.trait_scores_0_3, top_n=top_n)

            return Response({
                'top_matches': top_matches,
                'user_assessment_id': assessment.id
            })
        except AssessmentSubmission.DoesNotExist:
            return Response({'detail': 'No assessments found'}, status=status.HTTP_404_NOT_FOUND)


class CompareView(APIView):
    def get(self, request, slug):
        # Get user's latest assessment
        try:
            assessment = AssessmentSubmission.objects.filter(user=request.user).latest('created_at')
        except AssessmentSubmission.DoesNotExist:
            return Response({'detail': 'No assessments found'}, status=status.HTTP_404_NOT_FOUND)

        # Get the requested figure
        try:
            figure = HistoricalFigure.objects.get(slug=slug)
        except HistoricalFigure.DoesNotExist:
            return Response({'detail': 'Figure not found'}, status=status.HTTP_404_NOT_FOUND)

        if not figure.score_json:
            return Response({'detail': 'Figure has no scores'}, status=status.HTTP_404_NOT_FOUND)

        # Calculate fresh comparison
        user_scores = assessment.trait_scores_0_3
        match = calculate_match(user_scores, figure.score_json)

        # Build user averages
        user_averages = calculate_averages(user_scores)

        # Build figure flat scores
        figure_flat = flatten_figure_scores(figure.score_json)
        figure_averages = calculate_averages(figure_flat)

        return Response({
            'figure': {
                'name': figure.name,
                'slug': figure.slug,
                'bio_short': figure.bio_short,
                'trait_scores_0_3': figure_flat,
                'dimension_averages_0_10': figure_averages['dimension_averages_0_10'],
                'overall': figure_averages['overall'],
            },
            'user': {
                'trait_scores_0_3': user_scores,
                'dimension_averages_0_10': user_averages['dimension_averages_0_10'],
                'overall': user_averages['overall'],
            },
            'match': match,
        })
