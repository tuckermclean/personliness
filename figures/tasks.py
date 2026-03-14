from celery import shared_task
from django.conf import settings
import openai
import json
import logging
from .models import FigureIngestionRequest, HistoricalFigure
from django.utils.text import slugify

logger = logging.getLogger(__name__)

# Confidence level ordering for comparison
CONFIDENCE_LEVELS = {'Low': 0, 'Medium': 1, 'High': 2}


def _get_all_trait_paths():
    """
    Returns list of all 34 trait locations in score_json.
    Each path is a tuple of (section, dimension/None, trait_name).
    """
    paths = []

    # Core traits (19 total) - organized by dimension
    core_dimensions = {
        'Cognitive': [
            'Strategic Intelligence',
            'Ethical / Philosophical Insight',
            'Creative / Innovative Thinking',
            'Administrative / Legislative Skill'
        ],
        'Moral-Affective': [
            'Compassion / Empathy',
            'Courage / Resilience',
            'Justice Orientation',
            'Ambition / Self-Assertion',
            'Moral Fallibility & Growth'
        ],
        'Cultural-Social': [
            'Leadership / Influence',
            'Institution-Building',
            'Impact Legacy',
            'Archetype Resonance',
            'Relatability / Cultural Embeddedness'
        ],
        'Embodied-Existential': [
            'Physical Endurance / Skill',
            'Hardship Tolerance',
            'Joy / Play / Aesthetic Appreciation',
            'Mortality Acceptance',
            'Paradox Integration'
        ]
    }

    for dimension, traits in core_dimensions.items():
        for trait in traits:
            paths.append(('core', dimension, trait))

    # Heinlein competency traits (15 total) - flat structure
    heinlein_traits = [
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
        'Existential Composure'
    ]

    for trait in heinlein_traits:
        paths.append(('heinlein_competency', None, trait))

    return paths


def _identify_low_confidence_traits(score_json, target_confidence='High'):
    """
    Finds traits with confidence below target level.
    Returns list of (path, trait_data) tuples for traits needing refinement.
    """
    target_level = CONFIDENCE_LEVELS.get(target_confidence, 2)
    low_confidence_traits = []

    for section, dimension, trait_name in _get_all_trait_paths():
        try:
            if section == 'core':
                trait_data = score_json.get('core', {}).get(dimension, {}).get(trait_name, {})
            else:  # heinlein_competency
                trait_data = score_json.get('heinlein_competency', {}).get(trait_name, {})

            confidence = trait_data.get('confidence', 'Low')
            confidence_level = CONFIDENCE_LEVELS.get(confidence, 0)

            if confidence_level < target_level:
                low_confidence_traits.append({
                    'section': section,
                    'dimension': dimension,
                    'trait_name': trait_name,
                    'current_data': trait_data
                })
        except (TypeError, AttributeError):
            # Skip malformed traits
            continue

    return low_confidence_traits


def _build_refinement_prompt(figure_name, biography_text, low_confidence_traits):
    """
    Creates a focused prompt for refining specific traits.
    """
    traits_summary = []
    for trait_info in low_confidence_traits:
        section = trait_info['section']
        dimension = trait_info['dimension']
        trait_name = trait_info['trait_name']
        current_data = trait_info['current_data']

        location = f"{section} > {dimension} > {trait_name}" if dimension else f"{section} > {trait_name}"

        traits_summary.append(f"""
Trait: {trait_name}
Location: {location}
Current Score: {current_data.get('score_0_3', 'N/A')}
Current Justification: {current_data.get('justification', 'N/A')}
Current Confidence: {current_data.get('confidence', 'N/A')}
Current Citations: {current_data.get('citations', [])}
""")

    traits_text = "\n---\n".join(traits_summary)

    prompt = f"""You are a careful historical rater performing a REFINEMENT pass.

You previously scored {figure_name} but the following {len(low_confidence_traits)} trait(s) had Medium or Low confidence.

Your task: Re-analyze these specific traits with deeper focus to achieve High confidence if possible.

Guidelines:
- Provide more specific evidence and reasoning
- Add additional citations if available
- If High confidence truly isn't achievable due to limited historical evidence, explain why in the justification and keep Medium/Low
- Do NOT change scores arbitrarily - only adjust if deeper analysis reveals the original score was inaccurate
- Focus on finding concrete evidence that supports or refines the score

Figure: {figure_name}

Biography:
{biography_text}

---

TRAITS REQUIRING REFINEMENT:

{traits_text}

---

Return ONLY valid JSON in this exact format (no other text):

{{
  "refined_traits": {{
    "TRAIT_NAME": {{
      "score_0_3": <0-3>,
      "justification": "<1-3 sentences with specific evidence>",
      "confidence": "High|Medium|Low",
      "citations": ["<citation1>", "<citation2>"]
    }}
  }},
  "refinement_notes": "<brief summary of refinement outcomes>"
}}

Include ALL {len(low_confidence_traits)} traits listed above in your response, using the exact trait names provided.
"""
    return prompt


def _execute_refinement_pass(client, llm_model, is_reasoning_model, prompt):
    """
    Makes LLM call for refinement and returns parsed JSON or None on failure.
    """
    messages = [
        {"role": "user", "content": prompt}
    ] if is_reasoning_model else [
        {"role": "system", "content": "You are a careful historical rater performing a refinement pass."},
        {"role": "user", "content": prompt}
    ]

    request_params = {
        "model": llm_model,
        "messages": messages,
    }

    if is_reasoning_model:
        request_params["max_completion_tokens"] = 8000
    else:
        request_params["temperature"] = 0.2
        request_params["max_tokens"] = 4000

    try:
        response = client.chat.completions.create(**request_params)
        response_text = response.choices[0].message.content.strip()

        # Try to extract JSON from the response
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()
        else:
            json_str = response_text

        return json.loads(json_str)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Refinement pass failed to parse: {e}")
        return None


def _merge_refined_scores(score_json, refined_data, low_confidence_traits):
    """
    Merges refined trait data back into score_json.
    Returns count of successfully merged traits.
    """
    merged_count = 0
    refined_traits = refined_data.get('refined_traits', {})

    for trait_info in low_confidence_traits:
        trait_name = trait_info['trait_name']
        section = trait_info['section']
        dimension = trait_info['dimension']

        if trait_name not in refined_traits:
            continue

        new_data = refined_traits[trait_name]

        # Validate required fields exist
        if not all(k in new_data for k in ['score_0_3', 'justification', 'confidence']):
            logger.warning(f"Skipping incomplete refined trait: {trait_name}")
            continue

        # Validate score is in range
        if not isinstance(new_data.get('score_0_3'), (int, float)) or not 0 <= new_data['score_0_3'] <= 3:
            logger.warning(f"Skipping trait with invalid score: {trait_name}")
            continue

        # Validate confidence is valid
        if new_data.get('confidence') not in CONFIDENCE_LEVELS:
            logger.warning(f"Skipping trait with invalid confidence: {trait_name}")
            continue

        # Merge the refined data
        try:
            if section == 'core':
                score_json['core'][dimension][trait_name] = new_data
            else:  # heinlein_competency
                score_json['heinlein_competency'][trait_name] = new_data
            merged_count += 1
        except (KeyError, TypeError) as e:
            logger.warning(f"Failed to merge trait {trait_name}: {e}")
            continue

    return merged_count


def _recalculate_averages(score_json):
    """
    Recalculates all dimension and overall averages after refinement.
    """
    # Core dimension averages
    core_dimensions = ['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential']
    dimension_avgs = {}

    for dimension in core_dimensions:
        dimension_data = score_json.get('core', {}).get(dimension, {})
        scores = []
        for trait_name, trait_data in dimension_data.items():
            if isinstance(trait_data, dict) and 'score_0_3' in trait_data:
                scores.append(trait_data['score_0_3'])

        if scores:
            avg_0_3 = sum(scores) / len(scores)
            avg_0_10 = avg_0_3 * (10 / 3)
            dimension_avgs[dimension] = round(avg_0_10, 2)
        else:
            dimension_avgs[dimension] = 0

    # Core 4D average
    core_4d_avg = sum(dimension_avgs.values()) / len(dimension_avgs) if dimension_avgs else 0
    dimension_avgs['Core_4D_Avg'] = round(core_4d_avg, 2)

    # Update core dimension averages
    if 'dimension_averages_0_10' not in score_json.get('core', {}):
        score_json['core']['dimension_averages_0_10'] = {}
    score_json['core']['dimension_averages_0_10'] = dimension_avgs

    # Heinlein competency averages
    heinlein_data = score_json.get('heinlein_competency', {})
    heinlein_scores = []
    for trait_name, trait_data in heinlein_data.items():
        if isinstance(trait_data, dict) and 'score_0_3' in trait_data:
            heinlein_scores.append(trait_data['score_0_3'])

    if heinlein_scores:
        general_avg_0_3 = sum(heinlein_scores) / len(heinlein_scores)
        general_avg_10scale = general_avg_0_3 * (10 / 3)
    else:
        general_avg_0_3 = 0
        general_avg_10scale = 0

    # Update heinlein averages
    if 'averages' not in score_json.get('heinlein_competency', {}):
        score_json['heinlein_competency']['averages'] = {}
    score_json['heinlein_competency']['averages'] = {
        'General_Competency_Avg_0_3': round(general_avg_0_3, 2),
        'General_Competency_Avg_10scale': round(general_avg_10scale, 2)
    }

    # Overall averages
    overall_normalized = (core_4d_avg * 4 + general_avg_10scale) / 5

    score_json['overall'] = {
        'Core_4D_Avg': round(core_4d_avg, 2),
        'General_Competency_Avg_10scale': round(general_avg_10scale, 2),
        'Overall_Normalized_Equal_Avg': round(overall_normalized, 2)
    }

    return score_json


def _perform_confidence_refinement(score_json, figure_name, biography_text, client, llm_model, is_reasoning_model):
    """
    Orchestrates the refinement loop for improving trait confidence.
    Returns the refined score_json with metadata.
    """
    enable_refinement = getattr(settings, 'LLM_ENABLE_REFINEMENT', True)
    max_passes = getattr(settings, 'LLM_MAX_REFINEMENT_PASSES', 2)
    target_confidence = getattr(settings, 'LLM_MIN_CONFIDENCE_TARGET', 'High')

    if not enable_refinement:
        logger.info("Confidence refinement is disabled")
        return score_json

    # Initialize metadata
    refinement_metadata = {
        'enabled': True,
        'target_confidence': target_confidence,
        'max_passes': max_passes,
        'passes_executed': 0,
        'initial_low_confidence_count': 0,
        'final_low_confidence_count': 0,
        'pass_details': []
    }

    # Initial assessment
    low_confidence_traits = _identify_low_confidence_traits(score_json, target_confidence)
    initial_count = len(low_confidence_traits)
    refinement_metadata['initial_low_confidence_count'] = initial_count

    if initial_count == 0:
        logger.info("All traits have High confidence, no refinement needed")
        refinement_metadata['final_low_confidence_count'] = 0
        score_json['_refinement_metadata'] = refinement_metadata
        return score_json

    logger.info(f"Starting refinement: {initial_count} traits below {target_confidence} confidence")

    previous_count = initial_count

    for pass_num in range(1, max_passes + 1):
        logger.info(f"Refinement pass {pass_num}/{max_passes}: {len(low_confidence_traits)} traits to refine")

        pass_detail = {
            'pass_number': pass_num,
            'traits_to_refine': len(low_confidence_traits),
            'traits_refined': 0,
            'traits_remaining': 0,
            'status': 'pending'
        }

        # Build and execute refinement prompt
        prompt = _build_refinement_prompt(figure_name, biography_text, low_confidence_traits)
        refined_data = _execute_refinement_pass(client, llm_model, is_reasoning_model, prompt)

        if refined_data is None:
            logger.warning(f"Refinement pass {pass_num} failed, skipping")
            pass_detail['status'] = 'failed'
            refinement_metadata['pass_details'].append(pass_detail)
            continue

        # Merge refined scores
        merged_count = _merge_refined_scores(score_json, refined_data, low_confidence_traits)
        pass_detail['traits_refined'] = merged_count

        # Recalculate averages after merge
        score_json = _recalculate_averages(score_json)

        # Check remaining low confidence traits
        low_confidence_traits = _identify_low_confidence_traits(score_json, target_confidence)
        current_count = len(low_confidence_traits)
        pass_detail['traits_remaining'] = current_count
        pass_detail['status'] = 'completed'

        refinement_metadata['pass_details'].append(pass_detail)
        refinement_metadata['passes_executed'] = pass_num

        logger.info(f"After pass {pass_num}: {current_count} traits still below {target_confidence}")

        # Check stopping conditions
        if current_count == 0:
            logger.info("All traits now have High confidence, stopping refinement")
            break

        if current_count >= previous_count:
            logger.info("No improvement in this pass, stopping refinement (diminishing returns)")
            break

        previous_count = current_count

    refinement_metadata['final_low_confidence_count'] = len(low_confidence_traits)

    logger.info(
        f"Refinement completed: {initial_count} -> {refinement_metadata['final_low_confidence_count']} "
        f"low-confidence traits over {refinement_metadata['passes_executed']} passes"
    )

    score_json['_refinement_metadata'] = refinement_metadata
    return score_json

# LLM Rubric Prompt
RUBRIC_PROMPT = """Prompt: Compute Personliness & General Competency Scores for a Historical Figure

You are a careful historical rater.

Your job is to assign evidence‑backed scores for a single historical figure using the rubric below. Follow every instruction exactly.

Scales

Core sub-traits: score 0–3

0 = absent/negligible; 1 = weak/occasional; 2 = moderate/consistent; 3 = exceptional/defining

Convert to 0–10 only at the aggregation step.


Heinlein Competency domains: score 0–3 (same meaning as above).


Evidence & uncertainty

Each sub-trait/domain must include a short justification (1–3 sentences) referencing specific evidence (events, works, policies, campaigns, writings).

Add 1–3 citations (book/article/primary source) when possible; if none are handy, write "(no citation)" and lower confidence.

Include a confidence value for each score: High / Medium / Low.

Normalize judgments by era/role (don't penalize ancient figures for not "programming a computer"; judge "cutting‑edge tech" relative to their time).



---

RUBRIC (Definitions)

A) Core Dimensions & Sub-Traits (19 total)

1) Cognitive

1. Strategic Intelligence – Ability to foresee multiple outcomes, adapt plans, and manage uncertainty.


2. Ethical / Philosophical Insight – Depth and coherence in moral or metaphysical reasoning.


3. Creative / Innovative Thinking – Generation of novel ideas, solutions, or perspectives that change thinking or practice.


4. Administrative / Legislative Skill – Designing, organizing, and sustaining systems, policies, or laws.



2) Moral-Affective

5. Compassion / Empathy – Genuine concern for the well-being of others, expressed in tangible acts.


6. Courage / Resilience – Willingness to face danger or hardship in service of a cause.


7. Justice Orientation – Commitment to fairness, equity, and impartiality in action or policy.


8. Ambition / Self-Assertion – Drive to achieve and influence, even when morally mixed.


9. Moral Fallibility & Growth – Willingness to acknowledge mistakes and change behavior meaningfully.



3) Cultural-Social

10. Leadership / Influence – Mobilizing, inspiring, and directing groups toward shared goals.


11. Institution-Building – Creating or sustaining enduring organizations or social structures.


12. Impact Legacy – Long-term measurable effects on culture, politics, science, or society.


13. Archetype Resonance – Symbolic or mythic role with enduring cross-cultural recognition.


14. Relatability / Cultural Embeddedness – Maintaining connection to ordinary life and shared human experience despite prominence.



4) Embodied-Existential

15. Physical Endurance / Skill – Sustained physical capacity relevant to life's demands or challenges.


16. Hardship Tolerance – Functioning effectively under prolonged adversity (poverty, exile, illness).


17. Joy / Play / Aesthetic Appreciation – Engagement with beauty, leisure, humor, or art for its own sake.


18. Mortality Acceptance – Composure and intentionality in the face of aging, risk, or death.


19. Paradox Integration – Reconciling opposing traits or roles into a coherent whole.




---

B) Heinlein-Generalized Competency Domains (15 total)

1. Caregiving & Nurture – Providing emotional and physical care across the human lifespan.


2. Strategic Planning & Command – Coordinating complex operations and leading under constraints.


3. Animal & Food Processing – Handling and preparing animals and raw food resources.


4. Navigation & Wayfinding – Guiding travel across varied terrains or environments.


5. Construction & Fabrication – Designing and building durable physical structures.


6. Artistic & Cultural Expression – Creating works of art, music, literature, or performance.


7. Numerical & Analytical Reasoning – Applying mathematics and logic to practical problems.


8. Manual Craft & Repair – Making, fixing, or adapting tools, machines, or physical systems.


9. Medical Aid & Emergency Response – Treating injury, illness, or urgent health threats.


10. Leadership & Followership – Giving direction effectively and following others when appropriate.


11. Agricultural & Resource Management – Cultivating food or managing natural resources sustainably.


12. Culinary Skill – Preparing nutritious, appealing meals from available resources.


13. Combat & Defense – Protecting self and others through skill in physical conflict.


14. Technical & Systemic Problem-Solving – Operating or creating with complex tools and technologies.


15. Existential Composure – Facing mortality or crisis with dignity and self-control.


---

Output requirements

1. Score every sub-trait/domain 0–3 with justification + confidence.


2. Compute aggregates:

For each Core dimension, average its 4 sub‑traits (0–3), then scale to 0–10.

Core_4D_Avg (0–10) = average of the four Core dimensions (already scaled to 0–10).

General_Competency_Avg (0–3) = average of the Heinlein domains.

General_Competency_Avg_10scale (0–10) = General_Competency_Avg × (10/3).

Overall_Normalized_Equal_Avg (0–10) = (Core_4D_Avg * 4 + General_Competency_Avg_10scale) / 5.



3. Provide a brief Summary (<=120 words) explaining the figure's overall profile.


4. Return valid JSON matching the schema below. Do not include extra text outside JSON.



JSON schema

{
  "figure": "string",
  "core": {
    "Cognitive": {
      "Strategic Intelligence": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Ethical / Philosophical Insight": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Creative / Innovative Thinking": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Administrative / Legislative Skill": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]}
    },
    "Moral-Affective": {
      "Compassion / Empathy": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Courage / Resilience": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Justice Orientation": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Ambition / Self-Assertion": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Moral Fallibility & Growth": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]}
    },
    "Cultural-Social": {
      "Leadership / Influence": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Institution-Building": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Impact Legacy": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Archetype Resonance": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Relatability / Cultural Embeddedness": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]}
    },
    "Embodied-Existential": {
      "Physical Endurance / Skill": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Hardship Tolerance": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Joy / Play / Aesthetic Appreciation": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Mortality Acceptance": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
      "Paradox Integration": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]}
    },
    "dimension_averages_0_10": {
      "Cognitive": 0,
      "Moral-Affective": 0,
      "Cultural-Social": 0,
      "Embodied-Existential": 0,
      "Core_4D_Avg": 0
    }
  },
  "heinlein_competency": {
    "Caregiving & Nurture": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Strategic Planning & Command": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Animal & Food Processing": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Navigation & Wayfinding": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Construction & Fabrication": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Artistic & Cultural Expression": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Numerical & Analytical Reasoning": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Manual Craft & Repair": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Medical Aid & Emergency Response": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Leadership & Followership": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Agricultural & Resource Management": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Culinary Skill": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Combat & Defense": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Technical & Systemic Problem-Solving": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "Existential Composure": {"score_0_3": 0, "justification": "string", "confidence": "High|Medium|Low", "citations": ["..."]},
    "averages": {
      "General_Competency_Avg_0_3": 0,
      "General_Competency_Avg_10scale": 0
    }
  },
  "overall": {
    "Core_4D_Avg": 0,
    "General_Competency_Avg_10scale": 0,
    "Overall_Normalized_Equal_Avg": 0
  },
  "summary": "string (<=120 words)"
}



---

Procedure (the steps you should follow)

1. Read the figure's biography (career, works, campaigns, institutions, writings).


2. Score each sub-trait/domain (0–3):

Write a justification (1–3 sentences) with specific evidence.

Add citations where possible; else write "(no citation)" and set confidence to Medium/Low.

Apply era normalization.



3. Compute dimension averages:

For each Core dimension, average its four sub-traits (0–3) → scale to (0–10).

Average those four (0–10) to produce Core_4D_Avg.



4. Compute Heinlein averages:

Average the 13 domains (0–3) → General_Competency_Avg (0–3).

Convert to General_Competency_Avg_10scale = × (10/3).



5. Final overall:

Overall_Normalized_Equal_Avg (0–10) = (Core_4D_Avg * 4 + General_Competency_Avg_10scale) / 5.



6. Return valid JSON only (no prose outside JSON).




---

Mini‑Example (abbreviated; values are illustrative)

{
  "figure": "Hypothetical Person",
  "core": {
    "Cognitive": {
      "Strategic Intelligence": {"score_0_3": 2, "justification": "Planned multi-city relief operations.", "confidence": "Medium", "citations": ["Smith 2018"]},
      "Ethical / Philosophical Insight": {"score_0_3": 2, "justification": "Published moral essays on civic duty.", "confidence": "High", "citations": ["Journal of Ethics 2015"]},
      "Creative / Innovative Thinking": {"score_0_3": 3, "justification": "Introduced a novel urban sanitation model.", "confidence": "High", "citations": ["Doe 2020"]},
      "Administrative / Legislative Skill": {"score_0_3": 2, "justification": "Implemented city-wide policy.", "confidence": "Medium", "citations": ["City Records 1912"]}
    },
    "Moral-Affective": { "...": "..." },
    "Cultural-Social": { "...": "..." },
    "Embodied-Existential": { "...": "..." },
    "dimension_averages_0_10": {
      "Cognitive": 8.3,
      "Moral-Affective": 7.5,
      "Cultural-Social": 8.3,
      "Embodied-Existential": 6.7,
      "Core_4D_Avg": 7.7
    }
  },
  "heinlein_competency": {
    "Caregiving & Nurture": {"score_0_3": 2, "justification": "Hospital volunteer.", "confidence": "High", "citations": ["Hospital Annual Report"]},
    "...": "...",
    "averages": {"General_Competency_Avg_0_3": 2.1, "General_Competency_Avg_10scale": 7.0}
  },
  "overall": {
    "Core_4D_Avg": 7.7,
    "General_Competency_Avg_10scale": 7.0,
    "Overall_Normalized_Equal_Avg": 7.35
  },

  "summary": "A versatile civic reformer with high innovation and solid caregiving competence; moderate embodiment and institutional leadership."
}
"""


@shared_task
def process_ingestion_queue():
    """
    Dispatcher task that finds pending ingestion requests and spawns
    a separate Celery task for each one.

    Each figure is processed in its own task with a completely fresh
    Python context to prevent any state bleeding between figures.
    """
    pending_requests = FigureIngestionRequest.objects.filter(
        status='pending'
    ).order_by('created_at').values_list('id', flat=True)

    pending_ids = list(pending_requests)

    if not pending_ids:
        logger.info("No pending ingestion requests")
        return

    logger.info(f"Dispatching {len(pending_ids)} figure ingestion tasks")

    for request_id in pending_ids:
        process_single_figure.delay(request_id)
        logger.info(f"Dispatched process_single_figure task for request_id={request_id}")


@shared_task
def process_single_figure(request_id):
    """
    Process a single figure ingestion request by calling an LLM to generate scores.

    Each invocation runs in a fresh Celery task with its own Python context,
    ensuring complete isolation between figures and preventing state bleeding.
    """
    # Fetch the request fresh from DB
    try:
        ingestion_request = FigureIngestionRequest.objects.get(id=request_id)
    except FigureIngestionRequest.DoesNotExist:
        logger.error(f"Ingestion request {request_id} not found")
        return

    # Skip if no longer pending (another task may have picked it up)
    if ingestion_request.status != 'pending':
        logger.info(f"Ingestion request {request_id} is no longer pending (status={ingestion_request.status}), skipping")
        return

    logger.info(f"Processing figure: {ingestion_request.figure_name}")

    # Update status to running
    ingestion_request.status = 'running'
    ingestion_request.save()

    try:
        # Prepare the prompt
        biography_text = ingestion_request.biography_text
        prompt = f"{RUBRIC_PROMPT}\n\nBiography:\n{biography_text}"

        # Call the LLM
        llm_base_url = getattr(settings, 'LLM_BASE_URL', 'https://api.openai.com/v1')
        llm_api_key = getattr(settings, 'LLM_API_KEY', '')
        llm_model = getattr(settings, 'LLM_MODEL', 'gpt-4-turbo')

        # Build request parameters - reasoning models (o1, o3) don't support temperature
        # and use max_completion_tokens instead of max_tokens
        is_reasoning_model = llm_model.startswith('o1') or llm_model.startswith('o3')

        # Create fresh OpenAI client for this task
        with openai.OpenAI(
            base_url=llm_base_url,
            api_key=llm_api_key
        ) as client:
            messages = [
                {"role": "user", "content": f"You are a careful historical rater.\n\n{prompt}"}
            ] if is_reasoning_model else [
                {"role": "system", "content": "You are a careful historical rater."},
                {"role": "user", "content": prompt}
            ]

            request_params = {
                "model": llm_model,
                "messages": messages,
            }

            if is_reasoning_model:
                request_params["max_completion_tokens"] = 16000
            else:
                request_params["temperature"] = 0.3
                request_params["max_tokens"] = 4000

            response = client.chat.completions.create(**request_params)

            # Parse the response
            response_text = response.choices[0].message.content.strip()

            # Try to extract JSON from the response
            try:
                # Look for JSON between ```json and ```
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                else:
                    # Assume entire response is JSON
                    json_str = response_text

                score_json = json.loads(json_str)
            except json.JSONDecodeError:
                # If parsing fails, try with a repair prompt
                repair_prompt = f"The following response was not valid JSON. Please return ONLY valid JSON matching the schema:\n\n{response_text}"

                repair_messages = [
                    {"role": "user", "content": f"You are a careful historical rater. Return ONLY valid JSON matching the schema.\n\n{repair_prompt}"}
                ] if is_reasoning_model else [
                    {"role": "system", "content": "You are a careful historical rater. Return ONLY valid JSON matching the schema."},
                    {"role": "user", "content": repair_prompt}
                ]

                repair_params = {
                    "model": llm_model,
                    "messages": repair_messages,
                }

                if is_reasoning_model:
                    repair_params["max_completion_tokens"] = 16000
                else:
                    repair_params["temperature"] = 0.2
                    repair_params["max_tokens"] = 4000

                repair_response = client.chat.completions.create(**repair_params)

                repair_text = repair_response.choices[0].message.content.strip()

                # Try to extract JSON from repair response
                try:
                    if "```json" in repair_text:
                        json_start = repair_text.find("```json") + 7
                        json_end = repair_text.find("```", json_start)
                        json_str = repair_text[json_start:json_end].strip()
                    else:
                        json_str = repair_text

                    score_json = json.loads(json_str)
                except json.JSONDecodeError:
                    raise ValueError(f"Could not parse JSON from LLM response: {repair_text[:200]}...")

            # Validate the JSON structure (basic validation)
            if 'figure' not in score_json or 'core' not in score_json or 'heinlein_competency' not in score_json:
                raise ValueError("Invalid JSON structure from LLM")

            # Perform confidence refinement if enabled
            try:
                score_json = _perform_confidence_refinement(
                    score_json=score_json,
                    figure_name=ingestion_request.figure_name,
                    biography_text=biography_text,
                    client=client,
                    llm_model=llm_model,
                    is_reasoning_model=is_reasoning_model
                )
            except Exception as refinement_exc:
                # Refinement failure should never block ingestion - log and continue with original scores
                logger.warning(f"Confidence refinement failed, using original scores: {refinement_exc}")
                score_json['_refinement_metadata'] = {
                    'enabled': True,
                    'error': str(refinement_exc)[:200],
                    'passes_executed': 0
                }

        # Client is now closed - proceed with database operations outside the context manager

        # Create bio_short from summary (max 600 chars)
        bio_short = score_json.get('summary', '')[:600]

        # Create slug
        slug = slugify(ingestion_request.figure_name)[:50]  # Limit slug length

        # Ensure slug is unique
        original_slug = slug
        counter = 1
        while HistoricalFigure.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{counter}"
            counter += 1

        # Extract averages for sorting
        core_4d_avg_0_10 = score_json.get('core', {}).get('dimension_averages_0_10', {}).get('Core_4D_Avg', 0)
        general_competency_avg_0_10 = score_json.get('heinlein_competency', {}).get('averages', {}).get('General_Competency_Avg_10scale', 0)
        overall_normalized_equal_avg_0_10 = score_json.get('overall', {}).get('Overall_Normalized_Equal_Avg', 0)

        # Create HistoricalFigure
        figure = HistoricalFigure.objects.create(
            name=ingestion_request.figure_name,
            slug=slug,
            bio_short=bio_short,
            bio_long=biography_text,
            source_notes="Generated by LLM",
            score_json=score_json,
            core_4d_avg_0_10=core_4d_avg_0_10,
            general_competency_avg_0_10=general_competency_avg_0_10,
            overall_normalized_equal_avg_0_10=overall_normalized_equal_avg_0_10
        )

        # Update ingestion request
        ingestion_request.status = 'succeeded'
        ingestion_request.result_figure = figure
        ingestion_request.save()

        logger.info(f"Successfully processed figure: {ingestion_request.figure_name}")

    except Exception as exc:
        # Update ingestion request with error - will be retried on next queue run
        ingestion_request.status = 'pending'  # Keep as pending so it gets retried
        ingestion_request.error = str(exc)[:500]  # Limit error message length
        ingestion_request.save()

        logger.error(f"Failed to process figure {ingestion_request.figure_name}: {exc}")