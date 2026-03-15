from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
import openai
import json
import logging
import os as _os
import urllib.request
from .models import FigureIngestionRequest, HistoricalFigure
from .llm_utils import extract_json_from_response, build_llm_request_params, call_llm_for_json, get_active_llm_config, call_anthropic_extended_thinking, call_anthropic_with_tool, FIGURE_ASSESSMENT_TOOL
from .wikipedia_utils import resolve_figure_name
from personliness.traits import get_all_trait_paths, CORE_DIMENSIONS, HEINLEIN_TRAIT_NAMES, calculate_averages
from django.utils.text import slugify

logger = logging.getLogger(__name__)

# Confidence level ordering for comparison
CONFIDENCE_LEVELS = {'Low': 0, 'Medium': 1, 'High': 2}


def _identify_low_confidence_traits(score_json, target_confidence='High'):
    """
    Finds traits with confidence below target level.
    Returns list of (path, trait_data) tuples for traits needing refinement.
    """
    target_level = CONFIDENCE_LEVELS.get(target_confidence, 2)
    low_confidence_traits = []

    for section, dimension, trait_name in get_all_trait_paths():
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


def _execute_refinement_pass(client, llm_model, is_reasoning_model, prompt,
                             extended_thinking=False, llm_api_key=None,
                             thinking_budget=8000, thinking_log=None, pass_label=None):
    """
    Makes LLM call for refinement and returns parsed JSON or None on failure.
    When extended_thinking is True, uses Anthropic SDK and appends to thinking_log.
    """
    SYSTEM = "You are a careful historical rater performing a refinement pass."
    if extended_thinking:
        try:
            text, thinking = call_anthropic_extended_thinking(
                llm_api_key, llm_model, prompt, SYSTEM)
            if thinking_log is not None and pass_label:
                thinking_log.append({"pass": pass_label, "thinking": thinking})
            return extract_json_from_response(text)
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Extended-thinking refinement pass failed: {e}")
            return None
    else:
        return call_llm_for_json(
            client, llm_model, is_reasoning_model, prompt,
            system_message=SYSTEM,
            max_completion_tokens=8000,
            temperature=0.2,
        )


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


def _validate_score_json_schema(score_json, figure_name):
    """
    Raises ValueError if score_json deviates from the canonical schema.
    Checks that all 15 Heinlein trait names are present with correct keys.
    """
    heinlein = score_json.get('heinlein_competency', {})
    missing = [t for t in HEINLEIN_TRAIT_NAMES if t not in heinlein]
    invented = [k for k in heinlein if k not in HEINLEIN_TRAIT_NAMES and k != 'averages']
    errors = []
    if missing:
        errors.append(f"Missing Heinlein traits: {missing}")
    if invented:
        errors.append(f"Non-canonical Heinlein keys (LLM invented names): {invented}")
    if errors:
        raise ValueError(
            f"LLM schema deviation for '{figure_name}': {'; '.join(errors)}. "
            "Re-run ingestion to get a compliant response."
        )


def _recalculate_averages(score_json):
    """
    Recalculates all dimension and overall averages after refinement.
    """
    # Flatten scores from the nested score_json structure
    trait_scores_0_3 = {}

    for section, dimension, trait_name in get_all_trait_paths():
        try:
            if section == 'core':
                trait_data = score_json.get('core', {}).get(dimension, {}).get(trait_name, {})
            else:
                trait_data = score_json.get('heinlein_competency', {}).get(trait_name, {})

            if isinstance(trait_data, dict) and 'score_0_3' in trait_data:
                trait_scores_0_3[trait_name] = trait_data['score_0_3']
        except (TypeError, AttributeError):
            continue

    averages = calculate_averages(trait_scores_0_3)

    # Write results back into score_json
    score_json['core']['dimension_averages_0_10'] = averages['dimension_averages_0_10']
    score_json['heinlein_competency']['averages'] = averages['heinlein_averages']
    score_json['overall'] = averages['overall']

    return score_json


def _perform_confidence_refinement(score_json, figure_name, biography_text, client, llm_model, is_reasoning_model,
                                   extended_thinking=False, llm_api_key=None,
                                   thinking_budget=8000, thinking_log=None):
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
        refined_data = _execute_refinement_pass(
            client, llm_model, is_reasoning_model, prompt,
            extended_thinking=extended_thinking, llm_api_key=llm_api_key,
            thinking_budget=thinking_budget, thinking_log=thinking_log,
            pass_label=f"refinement_{pass_num}",
        )

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

# LLM Rubric Prompt — loaded at runtime from RUBRIC.md
_RUBRIC_PATH = _os.path.join(_os.path.dirname(__file__), '..', 'RUBRIC.md')
with open(_RUBRIC_PATH) as _f:
    RUBRIC_PROMPT = _f.read()


@shared_task
def process_ingestion_queue():
    """
    Dispatcher task that finds pending ingestion requests and spawns
    a separate Celery task for each one.

    Each figure is processed in its own task with a completely fresh
    Python context to prevent any state bleeding between figures.
    """
    from django.conf import settings

    concurrency = getattr(settings, 'INGESTION_CONCURRENCY', 3)
    in_flight = FigureIngestionRequest.objects.filter(
        status__in=['queued', 'running']
    ).count()
    slots = max(0, concurrency - in_flight)

    if slots == 0:
        logger.info(f"Ingestion concurrency limit reached ({concurrency} in-flight), deferring")
        return

    # Optimistic-lock claim: the status='pending' WHERE condition ensures two concurrent
    # dispatchers can't claim the same record — only one UPDATE will match each row.
    candidates = list(
        FigureIngestionRequest.objects.filter(status='pending')
        .order_by('created_at')
        .values_list('id', flat=True)[:slots]
    )
    if not candidates:
        logger.info("No pending ingestion requests")
        return

    claimed = FigureIngestionRequest.objects.filter(
        id__in=candidates, status='pending'
    ).update(status='queued')

    if claimed == 0:
        logger.info("All candidates already claimed by another dispatcher, skipping")
        return

    # Dispatch only the rows we actually claimed
    claimed_ids = list(
        FigureIngestionRequest.objects.filter(
            id__in=candidates, status='queued'
        ).values_list('id', flat=True)
    )
    logger.info(
        f"Dispatching {len(claimed_ids)} figure ingestion tasks "
        f"({in_flight} already in-flight, limit={concurrency})"
    )
    for request_id in claimed_ids:
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

    # Atomically transition queued → running; guards against double-dispatch races
    updated = FigureIngestionRequest.objects.filter(
        id=request_id, status='queued'
    ).update(status='running')
    if not updated:
        logger.info(
            f"Ingestion request {request_id} not in 'queued' state "
            f"(status={ingestion_request.status}), skipping"
        )
        return
    ingestion_request.status = 'running'

    logger.info(f"Processing figure: {ingestion_request.figure_name}")

    # If a previous result figure exists (re-run scenario), delete it before proceeding
    if ingestion_request.result_figure_id:
        old_figure = ingestion_request.result_figure
        ingestion_request.result_figure = None
        ingestion_request.save(update_fields=['result_figure'])
        old_figure.delete()
        logger.info(f"Deleted stale result figure for re-run of request {request_id}")

    # Clear any previous thinking log
    ingestion_request.thinking_log = None
    ingestion_request.save(update_fields=['thinking_log'])

    thinking_log = []

    try:
        # Resolve canonical name, bio, image URL from Wikipedia
        wiki = resolve_figure_name(ingestion_request.figure_name)
        figure_name = wiki['canonical_name']

        # Download image bytes now (before any LLM calls), so we have them for figure creation
        image_content = None
        if wiki['image_url']:
            try:
                from .wikipedia_utils import USER_AGENT
                req = urllib.request.Request(wiki['image_url'], headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    image_bytes = resp.read()
                image_filename = wiki['image_url'].split('/')[-1].split('?')[0] or 'figure.jpg'
                image_content = ContentFile(image_bytes, name=image_filename)
            except Exception as exc:
                logger.warning("Failed to download Wikipedia image for %r: %s", figure_name, exc)

        # Persist canonical name back to the request if it changed
        if figure_name != ingestion_request.figure_name:
            ingestion_request.figure_name = figure_name
            ingestion_request.save(update_fields=['figure_name'])

        # Wikipedia extract takes priority; fall back to pasted biography
        biography_text = wiki['extract'] or ingestion_request.biography_text.strip() or ''
        if not biography_text:
            ingestion_request.status = 'failed'
            ingestion_request.error = (
                'No biography available: none was pasted and Wikipedia returned no extract.'
            )
            ingestion_request.save(update_fields=['status', 'error'])
            return

        prompt = f"{RUBRIC_PROMPT}\n\nFigure: {figure_name}\n\nBiography:\n{biography_text}"

        # Call the LLM
        llm_cfg = get_active_llm_config()
        llm_base_url        = llm_cfg['base_url']
        llm_api_key         = llm_cfg['api_key']
        llm_model           = llm_cfg['model']
        is_reasoning_model  = llm_cfg['is_reasoning']
        extended_thinking   = llm_cfg['extended_thinking']
        thinking_budget     = llm_cfg['thinking_budget_tokens']

        SYSTEM = "You are a careful historical rater."

        if extended_thinking:
            # --- Anthropic extended-thinking path (tool use enforces schema) ---
            score_json, thinking = call_anthropic_with_tool(
                llm_api_key, llm_model, prompt, SYSTEM, FIGURE_ASSESSMENT_TOOL)
            thinking_log.append({"pass": "initial", "thinking": thinking})

            # Sanity-check the structure (tool use makes this very unlikely to fail)
            if 'figure' not in score_json or 'core' not in score_json or 'heinlein_competency' not in score_json:
                keys_found = list(score_json.keys()) if isinstance(score_json, dict) else type(score_json).__name__
                logger.error("Invalid JSON structure from LLM tool response. Keys found: %s", keys_found)
                raise ValueError(f"Invalid JSON structure from LLM tool response (keys found: {keys_found})")

            # Validate canonical trait names
            _validate_score_json_schema(score_json, ingestion_request.figure_name)

            # Perform confidence refinement if enabled
            try:
                score_json = _perform_confidence_refinement(
                    score_json=score_json,
                    figure_name=ingestion_request.figure_name,
                    biography_text=biography_text,
                    client=None,
                    llm_model=llm_model,
                    is_reasoning_model=is_reasoning_model,
                    extended_thinking=True,
                    llm_api_key=llm_api_key,
                    thinking_budget=thinking_budget,
                    thinking_log=thinking_log,
                )
            except Exception as refinement_exc:
                logger.warning(f"Confidence refinement failed, using original scores: {refinement_exc}")
                score_json['_refinement_metadata'] = {
                    'enabled': True,
                    'error': str(refinement_exc)[:200],
                    'passes_executed': 0
                }

        else:
            # --- OpenAI / standard path ---
            with openai.OpenAI(
                base_url=llm_base_url,
                api_key=llm_api_key
            ) as client:
                # Initial LLM call
                request_params = build_llm_request_params(
                    llm_model, is_reasoning_model, prompt,
                    temperature=0.3,
                )
                response = client.chat.completions.create(**request_params)
                response_text = response.choices[0].message.content.strip()

                # Try to extract JSON from the response
                try:
                    score_json = extract_json_from_response(response_text)
                except json.JSONDecodeError:
                    repair_prompt = f"The following response was not valid JSON. Please return ONLY valid JSON matching the schema:\n\n{response_text}"
                    score_json = call_llm_for_json(
                        client, llm_model, is_reasoning_model, repair_prompt,
                        system_message="You are a careful historical rater. Return ONLY valid JSON matching the schema.",
                        temperature=0.2,
                    )
                    if score_json is None:
                        raise ValueError(f"Could not parse JSON from LLM response: {response_text[:200]}...")

                # Validate the JSON structure (basic validation)
                if 'figure' not in score_json or 'core' not in score_json or 'heinlein_competency' not in score_json:
                    raise ValueError("Invalid JSON structure from LLM")

                # Validate canonical trait names
                _validate_score_json_schema(score_json, ingestion_request.figure_name)

                # Perform confidence refinement if enabled
                try:
                    score_json = _perform_confidence_refinement(
                        score_json=score_json,
                        figure_name=ingestion_request.figure_name,
                        biography_text=biography_text,
                        client=client,
                        llm_model=llm_model,
                        is_reasoning_model=is_reasoning_model,
                    )
                except Exception as refinement_exc:
                    logger.warning(f"Confidence refinement failed, using original scores: {refinement_exc}")
                    score_json['_refinement_metadata'] = {
                        'enabled': True,
                        'error': str(refinement_exc)[:200],
                        'passes_executed': 0
                    }

        # Ensure averages are always present regardless of refinement path
        score_json = _recalculate_averages(score_json)

        # Proceed with database operations

        # Create bio_short from summary (max 600 chars)
        bio_short = score_json.get('summary', '')[:600]

        # Create slug
        slug = slugify(figure_name)[:50]  # Limit slug length

        # Ensure slug is unique
        original_slug = slug
        counter = 1
        while HistoricalFigure.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{counter}"
            counter += 1

        # Extract averages for sorting
        core_4d_avg_0_10 = score_json.get('core', {}).get('dimension_averages_0_10', {}).get('Core_5D_Avg', 0)
        general_competency_avg_0_10 = score_json.get('heinlein_competency', {}).get('averages', {}).get('General_Competency_Avg_10scale', 0)
        overall_normalized_equal_avg_0_10 = score_json.get('overall', {}).get('Overall_Normalized_Equal_Avg', 0)

        # Create HistoricalFigure
        figure = HistoricalFigure.objects.create(
            name=figure_name,
            slug=slug,
            bio_short=bio_short,
            bio_long=biography_text,
            source_notes=wiki['page_url'] or "Generated by LLM",
            score_json=score_json,
            core_4d_avg_0_10=core_4d_avg_0_10,
            general_competency_avg_0_10=general_competency_avg_0_10,
            overall_normalized_equal_avg_0_10=overall_normalized_equal_avg_0_10
        )
        if image_content:
            figure.image.save(image_content.name, image_content, save=True)

        # Update ingestion request
        ingestion_request.status = 'succeeded'
        ingestion_request.result_figure = figure
        ingestion_request.thinking_log = thinking_log if thinking_log else None
        ingestion_request.save()
        process_ingestion_queue.delay()

        logger.info(f"Successfully processed figure: {ingestion_request.figure_name}")

    except Exception as exc:
        ingestion_request.status = 'failed'
        ingestion_request.error = str(exc)[:500]
        ingestion_request.thinking_log = thinking_log if thinking_log else None
        ingestion_request.save(update_fields=['status', 'error', 'thinking_log'])
        process_ingestion_queue.delay()

        logger.error(f"Failed to process figure {ingestion_request.figure_name}: {exc}")
