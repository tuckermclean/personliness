from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Question, AssessmentSubmission


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'


class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentSubmission
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'trait_scores_0_3', 'dimension_averages_0_10',
                           'heinlein_averages', 'overall', 'best_match_figure', 'best_match_similarity')