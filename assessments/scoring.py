from .models import Question
from figures.models import HistoricalFigure
from personliness.traits import (
    CORE_TRAIT_NAMES, HEINLEIN_TRAIT_NAMES, ALL_TRAIT_NAMES,
    CORE_DIMENSIONS, DIMENSION_NAMES, calculate_averages,
)


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


def flatten_figure_scores(score_json):
    """
    Extract a flat {trait_name: score_0_3} dict from a figure's nested score_json.
    """
    flat = {}

    core = score_json.get('core', {})
    for dimension in DIMENSION_NAMES:
        traits = core.get(dimension, {})
        if isinstance(traits, dict):
            for trait_name, trait_data in traits.items():
                if isinstance(trait_data, dict) and 'score_0_3' in trait_data:
                    flat[trait_name] = trait_data['score_0_3']

    heinlein = score_json.get('heinlein_competency', {})
    for trait_name, trait_data in heinlein.items():
        if isinstance(trait_data, dict) and 'score_0_3' in trait_data and trait_name != 'averages':
            flat[trait_name] = trait_data['score_0_3']

    return flat


def calculate_match(user_scores, figure_score_json):
    """
    Calculate a rich match breakdown between user trait scores and a figure's score_json.

    Uses normalized mean absolute difference:
      per-trait dissimilarity = |user - figure| / 3   (scores are 0-3)
      similarity = 1 - mean(dissimilarities)

    Returns dict with overall_similarity, core_similarity, heinlein_similarity,
    per-dimension similarities, signed trait deltas, shared strengths, and key differences.
    """
    figure_scores = flatten_figure_scores(figure_score_json)

    # Per-trait deltas and dissimilarities
    trait_deltas = {}
    core_dissimilarities = []
    heinlein_dissimilarities = []
    dimension_dissimilarities = {dim: [] for dim in DIMENSION_NAMES}

    for trait in CORE_TRAIT_NAMES:
        u = user_scores.get(trait, 0)
        f = figure_scores.get(trait, 0)
        delta = u - f
        trait_deltas[trait] = round(delta, 2)
        dissim = abs(delta) / 3
        core_dissimilarities.append(dissim)
        # File into dimension
        for dim, dim_traits in CORE_DIMENSIONS.items():
            if trait in dim_traits:
                dimension_dissimilarities[dim].append(dissim)
                break

    for trait in HEINLEIN_TRAIT_NAMES:
        u = user_scores.get(trait, 0)
        f = figure_scores.get(trait, 0)
        delta = u - f
        trait_deltas[trait] = round(delta, 2)
        dissim = abs(delta) / 3
        heinlein_dissimilarities.append(dissim)

    # Similarities
    core_similarity = 1 - (sum(core_dissimilarities) / len(core_dissimilarities)) if core_dissimilarities else 0
    heinlein_similarity = 1 - (sum(heinlein_dissimilarities) / len(heinlein_dissimilarities)) if heinlein_dissimilarities else 0

    # Overall: weighted 5:1 core:heinlein (matching the overall score weighting)
    overall_similarity = (core_similarity * 5 + heinlein_similarity) / 6

    # Per-dimension similarities
    dimensions = {}
    for dim, dissims in dimension_dissimilarities.items():
        if dissims:
            dimensions[dim] = round(1 - (sum(dissims) / len(dissims)), 4)
        else:
            dimensions[dim] = 0

    # Shared strengths: both score >= 2.0, sorted by average score descending
    shared_strengths = []
    for trait in ALL_TRAIT_NAMES:
        u = user_scores.get(trait, 0)
        f = figure_scores.get(trait, 0)
        if u >= 2.0 and f >= 2.0:
            shared_strengths.append({
                'trait': trait,
                'user_score': round(u, 2),
                'figure_score': round(f, 2),
                'avg': round((u + f) / 2, 2),
            })
    shared_strengths.sort(key=lambda x: x['avg'], reverse=True)

    # Key differences: |delta| >= 1.0, sorted by |delta| descending
    key_differences = []
    for trait, delta in trait_deltas.items():
        if abs(delta) >= 1.0:
            key_differences.append({
                'trait': trait,
                'delta': delta,
                'user_score': round(user_scores.get(trait, 0), 2),
                'figure_score': round(figure_scores.get(trait, 0), 2),
            })
    key_differences.sort(key=lambda x: abs(x['delta']), reverse=True)

    return {
        'overall_similarity': round(overall_similarity, 4),
        'core_similarity': round(core_similarity, 4),
        'heinlein_similarity': round(heinlein_similarity, 4),
        'dimensions': dimensions,
        'trait_deltas': trait_deltas,
        'shared_strengths': shared_strengths,
        'key_differences': key_differences,
    }


def rank_matches(user_scores, top_n=10):
    """
    Compare user scores against all historical figures and return top N matches.

    Each entry includes figure metadata alongside the full match breakdown.
    """
    figures = HistoricalFigure.objects.all()
    results = []

    for figure in figures:
        if not figure.score_json:
            continue
        match = calculate_match(user_scores, figure.score_json)
        results.append({
            'figure_id': figure.id,
            'figure_name': figure.name,
            'figure_slug': figure.slug,
            'bio_short': figure.bio_short,
            'image': figure.image.url if figure.image else None,
            **match,
        })

    results.sort(key=lambda x: x['overall_similarity'], reverse=True)
    return results[:top_n]
