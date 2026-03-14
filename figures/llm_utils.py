"""
Shared LLM utilities for JSON extraction and request building.
"""

import json
import logging

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
