"""
Single source of truth for all 34 Personliness trait definitions.
"""

CORE_DIMENSIONS = {
    'Cognitive': [
        'Strategic Intelligence',
        'Ethical / Philosophical Insight',
        'Creative / Innovative Thinking',
        'Administrative / Legislative Skill',
    ],
    'Moral-Affective': [
        'Compassion / Empathy',
        'Courage / Resilience',
        'Justice Orientation',
        'Moral Fallibility & Growth',
    ],
    'Cultural-Social': [
        'Leadership / Influence',
        'Institution-Building',
        'Impact Legacy',
        'Archetype Resonance',
        'Relatability / Cultural Embeddedness',
    ],
    'Embodied-Existential': [
        'Physical Endurance / Skill',
        'Hardship Tolerance',
        'Joy / Play / Aesthetic Appreciation',
        'Mortality Acceptance',
        'Paradox Integration',
    ],
    'Relational': [
        'Spousal / Partner Quality',
        'Parental / Mentoring Quality',
        'Relational Range',
    ],
}

DIMENSION_NAMES = list(CORE_DIMENSIONS.keys())

CORE_TRAIT_NAMES = [
    trait
    for traits in CORE_DIMENSIONS.values()
    for trait in traits
]

HEINLEIN_TRAIT_NAMES = [
    'Caregiving & Nurture',
    'Strategic Planning & Command',
    'Animal & Food Processing',
    'Navigation & Wayfinding',
    'Construction & Fabrication',
    'Artistic & Cultural Expression',
    'Numerical & Analytical Reasoning',
    'Manual Craft & Repair',
    'Medical Aid & Emergency Response',
    'Leadership & Followership',
    'Agricultural & Resource Management',
    'Culinary Skill',
    'Combat & Defense',
    'Technical & Systemic Problem-Solving',
    'Existential Composure',
]

ALL_TRAIT_NAMES = CORE_TRAIT_NAMES + HEINLEIN_TRAIT_NAMES


def get_all_trait_paths():
    """
    Returns list of all 34 trait locations in score_json.
    Each path is a tuple of (section, dimension/None, trait_name).
    """
    paths = []
    for dimension, traits in CORE_DIMENSIONS.items():
        for trait in traits:
            paths.append(('core', dimension, trait))
    for trait in HEINLEIN_TRAIT_NAMES:
        paths.append(('heinlein_competency', None, trait))
    return paths


def calculate_averages(trait_scores_0_3):
    """
    Compute dimension averages, heinlein averages, and overall from a flat
    dict of {trait_name: score_0_3}.

    Returns:
        dict with keys: dimension_averages_0_10, heinlein_averages, overall
    """
    # Dimension averages
    dimension_averages_0_10 = {}
    for dimension, traits in CORE_DIMENSIONS.items():
        scores = [trait_scores_0_3.get(t, 0) for t in traits]
        avg_0_3 = sum(scores) / len(scores) if scores else 0
        dimension_averages_0_10[dimension] = round(avg_0_3 * (10 / 3), 2)

    core_5d_avg = round(
        sum(dimension_averages_0_10.values()) / 5, 2
    )
    dimension_averages_0_10['Core_5D_Avg'] = core_5d_avg

    # Heinlein averages
    heinlein_scores = [trait_scores_0_3.get(t, 0) for t in HEINLEIN_TRAIT_NAMES]
    general_avg_0_3 = sum(heinlein_scores) / len(heinlein_scores) if heinlein_scores else 0
    general_avg_10scale = general_avg_0_3 * (10 / 3)

    heinlein_averages = {
        'General_Competency_Avg_0_3': round(general_avg_0_3, 2),
        'General_Competency_Avg_10scale': round(general_avg_10scale, 2),
    }

    # Overall
    overall_normalized = (core_5d_avg * 5 + round(general_avg_10scale, 2)) / 6
    overall = {
        'Core_5D_Avg': core_5d_avg,
        'General_Competency_Avg_10scale': round(general_avg_10scale, 2),
        'Overall_Normalized_Equal_Avg': round(overall_normalized, 2),
    }

    return {
        'dimension_averages_0_10': dimension_averages_0_10,
        'heinlein_averages': heinlein_averages,
        'overall': overall,
    }
