"""
Wikipedia-based figure name resolution.
"""
import json
import logging
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

OPENSEARCH_URL = (
    "https://en.wikipedia.org/w/api.php"
    "?action=opensearch&limit=1&format=json&search={}"
)
SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{}"


def resolve_figure_name(figure_name, timeout=5):
    """
    Attempt to resolve figure_name via Wikipedia.

    Returns a dict:
      canonical_name  str       — Wikipedia article title, or figure_name.strip() on failure
      extract         str|None  — introductory biography extract
      page_url        str|None  — desktop Wikipedia URL
      image_url       str|None  — thumbnail image URL (for downloading)
    """
    name = figure_name.strip()
    result = {'canonical_name': name, 'extract': None, 'page_url': None, 'image_url': None}

    # Step 1: opensearch → canonical article title
    try:
        url = OPENSEARCH_URL.format(urllib.parse.quote(name))
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            data = json.loads(resp.read())
        titles = data[1]
        if not titles:
            return result
        canonical = titles[0]
    except Exception as exc:
        logger.warning("Wikipedia opensearch failed for %r: %s", name, exc)
        return result

    # Step 2: page summary → canonical title + extract + thumbnail
    try:
        url = SUMMARY_URL.format(urllib.parse.quote(canonical, safe=''))
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            summary = json.loads(resp.read())
        result['canonical_name'] = summary.get('title', canonical)
        result['extract'] = summary.get('extract') or None
        result['page_url'] = (
            summary.get('content_urls', {}).get('desktop', {}).get('page') or None
        )
        result['image_url'] = summary.get('thumbnail', {}).get('source') or None
    except Exception as exc:
        logger.warning("Wikipedia summary failed for %r: %s", canonical, exc)
        result['canonical_name'] = canonical

    return result
