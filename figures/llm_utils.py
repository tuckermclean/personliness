"""
Shared LLM utilities for JSON extraction and request building.
"""

import json
import logging
import os

logger = logging.getLogger(__name__)


def extract_json_from_response(text):
    """
    Parse JSON from LLM output, handling ```json fences.
    Returns the parsed dict/list, or raises json.JSONDecodeError.
    """
    if "```json" in text:
        json_start = text.find("```json") + 7
        json_end = text.find("```", json_start)
        json_str = text[json_start:json_end].strip()
    else:
        json_str = text

    return json.loads(json_str)


def build_llm_request_params(model, is_reasoning, prompt, *,
                             system_message="You are a careful historical rater.",
                             max_completion_tokens=16000,
                             temperature=0.3,
                             max_tokens=4000):
    """
    Build the request params dict with reasoning-model vs standard-model logic.
    Returns a dict suitable for client.chat.completions.create(**params).
    """
    if is_reasoning:
        messages = [
            {"role": "user", "content": f"{system_message}\n\n{prompt}"}
        ]
    else:
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]

    request_params = {
        "model": model,
        "messages": messages,
    }

    if is_reasoning:
        request_params["max_completion_tokens"] = max_completion_tokens
    else:
        request_params["temperature"] = temperature
        request_params["max_tokens"] = max_tokens

    return request_params


def get_active_llm_config():
    """
    Resolve the active LLM profile from Django settings to concrete values.
    Returns dict with: base_url, api_key, model, is_reasoning (bool)
    """
    from django.conf import settings
    profile_name = settings.LLM_ACTIVE_CONFIG
    profiles = settings.LLM_CONFIGS
    if profile_name not in profiles:
        raise ValueError(f"LLM_ACTIVE_CONFIG '{profile_name}' not found in LLM_CONFIGS")
    profile = profiles[profile_name]

    if profile.get('api_key_env'):
        api_key = os.environ.get(profile['api_key_env'], '')
    else:
        api_key = profile.get('api_key', '')

    is_reasoning = profile.get('is_reasoning')
    if is_reasoning is None:
        model = profile['model']
        is_reasoning = model.startswith('o1') or model.startswith('o3')

    return {
        'base_url': profile['base_url'],
        'api_key': api_key,
        'model': profile['model'],
        'is_reasoning': is_reasoning,
        'extended_thinking': profile.get('extended_thinking', False),
        'thinking_budget_tokens': profile.get('thinking_budget_tokens', 8000),
    }


def call_anthropic_extended_thinking(api_key, model, prompt, system_message,
                                     budget_tokens=8000):
    """
    Call Anthropic SDK with extended thinking enabled.
    Returns (text_content, thinking_content) tuple.
    thinking_content is the raw thinking text (for admin logging only).
    """
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=budget_tokens + 4000,
        thinking={"type": "enabled", "budget_tokens": budget_tokens},
        system=system_message,
        messages=[{"role": "user", "content": prompt}],
    )
    text = "\n".join(b.text for b in response.content if b.type == "text")
    thinking = "\n".join(b.thinking for b in response.content if b.type == "thinking")
    return text, thinking


def call_llm_for_json(client, model, is_reasoning, prompt, **kwargs):
    """
    Make an LLM call and parse the response as JSON.
    Returns parsed JSON dict, or None on failure.
    kwargs are forwarded to build_llm_request_params.
    """
    request_params = build_llm_request_params(model, is_reasoning, prompt, **kwargs)

    try:
        response = client.chat.completions.create(**request_params)
        response_text = response.choices[0].message.content.strip()
        return extract_json_from_response(response_text)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"LLM JSON call failed: {e}")
        return None
