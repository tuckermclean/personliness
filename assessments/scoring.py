import math
from .models import Question


def calculate_scores(answers):
    """
    Calculate scores based on the Personliness assessment rubric.

    Args:
        answers (dict): Mapping of question_id -> answer_value (1-5)

    Returns:
        dict: Contains trait_scores_0_3, dimension_averages_0_10, heinlein_averages, overall
    """
    # Define all traits
    core_traits = {
        "Strategic Intelligence": [],
        "Ethical / Philosophical Insight": [],
        "Creative / Innovative Thinking": [],
        "Administrative / Legislative Skill": [],
        "Compassion / Empathy": [],
        "Courage / Resilience": [],
        "Justice Orientation": [],
        "Ambition / Self-Assertion": [],
        "Moral Fallibility & Growth": [],
        "Leadership / Influence": [],
        "Institution-Building": [],
        "Impact Legacy": [],
        "Archetype Resonance": [],
        "Relatability / Cultural Embeddedness": [],
        "Physical Endurance / Skill": [],
        "Hardship Tolerance": [],
        "Joy / Play / Aesthetic Appreciation": [],
        "Mortality Acceptance": [],
        "Paradox Integration": []
    }

    heinlein_traits = {
        "Caregiving & Nurture": [],
        "Strategic Planning & Command": [],
        "Animal & Food Processing": [],
        "Navigation & Wayfinding": [],
        "Construction & Fabrication": [],
        "Artistic & Cultural Expression": [],
        "Numerical & Analytical Reasoning": [],
        "Manual Craft & Repair": [],
        "Medical Aid & Emergency Response": [],
        "Leadership & Followership": [],
        "Agricultural & Resource Management": [],
        "Culinary Skill": [],
        "Combat & Defense": [],
        "Technical & Systemic Problem-Solving": [],
        "Existential Composure": []
    }

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

            # Add weighted score to appropriate trait
            weighted_score = normalized_answer * multiplier

            if trait_name in core_traits:
                core_traits[trait_name].append((weighted_score, multiplier))
            elif trait_name in heinlein_traits:
                heinlein_traits[trait_name].append((weighted_score, multiplier))

    # Calculate trait scores (0-3)
    trait_scores_0_3 = {}

    # Calculate core trait scores
    for trait_name, weighted_scores in core_traits.items():
        if weighted_scores:
            total_weighted_score = sum(score for score, _ in weighted_scores)
            total_multiplier = sum(multiplier for _, multiplier in weighted_scores)
            if total_multiplier > 0:
                trait_score_0_1 = total_weighted_score / total_multiplier
                trait_scores_0_3[trait_name] = trait_score_0_1 * 3
            else:
                trait_scores_0_3[trait_name] = 0
        else:
            trait_scores_0_3[trait_name] = 0

    # Calculate Heinlein trait scores
    for trait_name, weighted_scores in heinlein_traits.items():
        if weighted_scores:
            total_weighted_score = sum(score for score, _ in weighted_scores)
            total_multiplier = sum(multiplier for _, multiplier in weighted_scores)
            if total_multiplier > 0:
                trait_score_0_1 = total_weighted_score / total_multiplier
                trait_scores_0_3[trait_name] = trait_score_0_1 * 3
            else:
                trait_scores_0_3[trait_name] = 0
        else:
            trait_scores_0_3[trait_name] = 0

    # Calculate dimension averages (0-10)
    cognitive_traits = [
        "Strategic Intelligence",
        "Ethical / Philosophical Insight",
        "Creative / Innovative Thinking",
        "Administrative / Legislative Skill"
    ]

    moral_affective_traits = [
        "Compassion / Empathy",
        "Courage / Resilience",
        "Justice Orientation",
        "Ambition / Self-Assertion",
        "Moral Fallibility & Growth"
    ]

    cultural_social_traits = [
        "Leadership / Influence",
        "Institution-Building",
        "Impact Legacy",
        "Archetype Resonance",
        "Relatability / Cultural Embeddedness"
    ]

    embodied_existential_traits = [
        "Physical Endurance / Skill",
        "Hardship Tolerance",
        "Joy / Play / Aesthetic Appreciation",
        "Mortality Acceptance",
        "Paradox Integration"
    ]

    def avg_trait_scores(trait_list):
        scores = [trait_scores_0_3.get(trait, 0) for trait in trait_list]
        return sum(scores) / len(scores) if scores else 0

    cognitive_avg_0_3 = avg_trait_scores(cognitive_traits)
    moral_affective_avg_0_3 = avg_trait_scores(moral_affective_traits)
    cultural_social_avg_0_3 = avg_trait_scores(cultural_social_traits)
    embodied_existential_avg_0_3 = avg_trait_scores(embodied_existential_traits)

    # Scale to 0-10
    cognitive_avg_0_10 = cognitive_avg_0_3 * (10/3)
    moral_affective_avg_0_10 = moral_affective_avg_0_3 * (10/3)
    cultural_social_avg_0_10 = cultural_social_avg_0_3 * (10/3)
    embodied_existential_avg_0_10 = embodied_existential_avg_0_3 * (10/3)

    core_4d_avg = (cognitive_avg_0_10 + moral_affective_avg_0_10 +
                   cultural_social_avg_0_10 + embodied_existential_avg_0_10) / 4

    dimension_averages_0_10 = {
        "Cognitive": cognitive_avg_0_10,
        "Moral-Affective": moral_affective_avg_0_10,
        "Cultural-Social": cultural_social_avg_0_10,
        "Embodied-Existential": embodied_existential_avg_0_10,
        "Core_4D_Avg": core_4d_avg
    }

    # Calculate Heinlein averages
    heinlein_domain_scores = []
    for trait_name in heinlein_traits.keys():
        heinlein_domain_scores.append(trait_scores_0_3.get(trait_name, 0))

    general_competency_avg_0_3 = sum(heinlein_domain_scores) / len(heinlein_domain_scores) if heinlein_domain_scores else 0
    general_competency_avg_10scale = general_competency_avg_0_3 * (10/3)

    heinlein_averages = {
        "General_Competency_Avg_0_3": general_competency_avg_0_3,
        "General_Competency_Avg_10scale": general_competency_avg_10scale
    }

    # Calculate overall
    overall_normalized_equal_avg = (core_4d_avg * 4 + general_competency_avg_10scale) / 5

    overall = {
        "Core_4D_Avg": core_4d_avg,
        "General_Competency_Avg_10scale": general_competency_avg_10scale,
        "Overall_Normalized_Equal_Avg": overall_normalized_equal_avg
    }

    return {
        "trait_scores_0_3": trait_scores_0_3,
        "dimension_averages_0_10": dimension_averages_0_10,
        "heinlein_averages": heinlein_averages,
        "overall": overall
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