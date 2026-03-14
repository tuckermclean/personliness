import math
from .models import Question
from personliness.traits import CORE_TRAIT_NAMES, HEINLEIN_TRAIT_NAMES, ALL_TRAIT_NAMES, calculate_averages


def calculate_scores(answers):
    """
    Calculate scores based on the Personliness assessment rubric.

    Args:
        answers (dict): Mapping of question_id -> answer_value (1-5)

    Returns:
        dict: Contains trait_scores_0_3, dimension_averages_0_10, heinlein_averages, overall
    """
    all_traits = {name: [] for name in ALL_TRAIT_NAMES}

    # Process each answer
    for question_id, answer_value in answers.items():
        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            continue

        # Apply reverse scoring if needed
        if question.is_reversed:
            answer_value = 6 - answer_value

        # Convert to normalized value (0-1)
        normalized_answer = (answer_value - 1) / 4

        # Map to traits
        for trait_mapping in question.mapped_traits:
            trait_name = trait_mapping["trait"]
            multiplier = trait_mapping["multiplier"]
            weighted_score = normalized_answer * multiplier

            if trait_name in all_traits:
                all_traits[trait_name].append((weighted_score, multiplier))

    # Calculate trait scores (0-3)
    trait_scores_0_3 = {}
    for trait_name, weighted_scores in all_traits.items():
        if weighted_scores:
            total_weighted_score = sum(score for score, _ in weighted_scores)
            total_multiplier = sum(multiplier for _, multiplier in weighted_scores)
            if total_multiplier > 0:
                trait_scores_0_3[trait_name] = (total_weighted_score / total_multiplier) * 3
            else:
                trait_scores_0_3[trait_name] = 0
        else:
            trait_scores_0_3[trait_name] = 0

    averages = calculate_averages(trait_scores_0_3)

    return {
        "trait_scores_0_3": trait_scores_0_3,
        "dimension_averages_0_10": averages["dimension_averages_0_10"],
        "heinlein_averages": averages["heinlein_averages"],
        "overall": averages["overall"],
    }


def calculate_similarity(user_scores, figure_scores):
    """
    Calculate cosine similarity between user and figure scores.

    Args:
        user_scores (dict): Trait scores for user
        figure_scores (dict): Trait scores for figure (from score_json)

    Returns:
        float: Cosine similarity between 0 and 1
    """
    # Extract all trait keys
    all_traits = set(user_scores.keys()) | set(figure_scores.get('core', {}).keys())

    # For figure scores, we need to extract from the nested structure
    figure_core = figure_scores.get('core', {})
    figure_heinlein = figure_scores.get('heinlein_competency', {})

    # Flatten figure scores
    flat_figure_scores = {}

    # Extract core scores
    for dimension, traits in figure_core.items():
        if isinstance(traits, dict) and dimension != 'dimension_averages_0_10':
            for trait_name, trait_data in traits.items():
                if isinstance(trait_data, dict) and 'score_0_3' in trait_data:
                    flat_figure_scores[trait_name] = trait_data['score_0_3']

    # Extract Heinlein scores
    for trait_name, trait_data in figure_heinlein.items():
        if isinstance(trait_data, dict) and 'score_0_3' in trait_data and trait_name != 'averages':
            flat_figure_scores[trait_name] = trait_data['score_0_3']

    # Create vectors
    user_vector = []
    figure_vector = []

    for trait in all_traits:
        user_val = user_scores.get(trait, 0)
        figure_val = flat_figure_scores.get(trait, 0)

        user_vector.append(user_val)
        figure_vector.append(figure_val)

    # Calculate cosine similarity
    dot_product = sum(u * f for u, f in zip(user_vector, figure_vector))
    magnitude_user = math.sqrt(sum(u * u for u in user_vector))
    magnitude_figure = math.sqrt(sum(f * f for f in figure_vector))

    if magnitude_user == 0 or magnitude_figure == 0:
        return 0

    return dot_product / (magnitude_user * magnitude_figure)
