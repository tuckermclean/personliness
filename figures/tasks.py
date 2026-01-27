from celery import shared_task
from django.conf import settings
from django.core.cache import cache
import openai
import json
import logging
from .models import FigureIngestionRequest, HistoricalFigure
from django.utils.text import slugify

logger = logging.getLogger(__name__)

QUEUE_LOCK_KEY = 'figure_ingestion_queue_lock'
QUEUE_LOCK_TIMEOUT = 60 * 30  # 30 minutes max per run

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
    Process all pending figure ingestion requests.
    Uses a lock to ensure only one worker processes the queue at a time.
    """
    # Try to acquire lock - if already running, skip
    if not cache.add(QUEUE_LOCK_KEY, 'locked', QUEUE_LOCK_TIMEOUT):
        logger.info("Ingestion queue already being processed, skipping")
        return

    try:
        while True:
            # Get next pending request
            ingestion_request = FigureIngestionRequest.objects.filter(
                status='pending'
            ).order_by('created_at').first()

            if not ingestion_request:
                logger.info("No pending ingestion requests")
                break

            logger.info(f"Processing ingestion request for {ingestion_request.figure_name}")
            _process_single_request(ingestion_request)
    finally:
        cache.delete(QUEUE_LOCK_KEY)


def _process_single_request(ingestion_request):
    """
    Process a single figure ingestion request by calling an LLM to generate scores.
    """
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

        client = openai.OpenAI(
            base_url=llm_base_url,
            api_key=llm_api_key
        )

        # Build request parameters - reasoning models (o1, o3) don't support temperature
        # and use max_completion_tokens instead of max_tokens
        is_reasoning_model = llm_model.startswith('o1') or llm_model.startswith('o3')

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

        logger.info(f"Successfully processed figure ingestion for {ingestion_request.figure_name}")

    except Exception as exc:
        # Update ingestion request with error - will be retried on next queue run
        ingestion_request.status = 'pending'  # Keep as pending so it gets retried
        ingestion_request.error = str(exc)[:500]  # Limit error message length
        ingestion_request.save()

        logger.error(f"Failed to process figure ingestion for {ingestion_request.figure_name}: {exc}")