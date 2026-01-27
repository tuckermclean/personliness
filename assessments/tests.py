import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import Question, AssessmentSubmission


@pytest.mark.django_db
class TestQuestionModel:
    def test_create_question(self):
        question = Question.objects.create(
            text="Test question?",
            is_reversed=False,
            mapped_traits=[{"trait": "Test Trait", "multiplier": 1.0}]
        )
        assert question.id is not None
        assert "Test question" in str(question)


@pytest.mark.django_db
class TestAssessmentAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_questions_list_endpoint(self):
        # Create test questions
        Question.objects.create(
            text="Question 1?",
            is_reversed=False,
            mapped_traits=[{"trait": "Test", "multiplier": 1.0}]
        )
        Question.objects.create(
            text="Question 2?",
            is_reversed=True,
            mapped_traits=[{"trait": "Test", "multiplier": 0.5}]
        )

        response = self.client.get('/api/questions/')
        assert response.status_code == 200
        assert len(response.data) == 2

    def test_signup_endpoint(self):
        response = self.client.post('/api/auth/signup/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123'
        })
        assert response.status_code == 201
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_create_assessment(self):
        # Create test question
        q1 = Question.objects.create(
            text="Test question?",
            is_reversed=False,
            mapped_traits=[
                {"trait": "Strategic Intelligence", "multiplier": 1.0},
                {"trait": "Numerical & Analytical Reasoning", "multiplier": 0.6}
            ]
        )

        # Authenticate
        self.client.force_authenticate(user=self.user)

        # Submit assessment
        response = self.client.post('/api/assessments/', {
            'answers': {str(q1.id): 5}
        })

        assert response.status_code == 201
        assert 'trait_scores_0_3' in response.data
        assert 'dimension_averages_0_10' in response.data
