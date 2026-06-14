"""Thin wrapper around an OpenAI-compatible chat endpoint.

Works with OpenAI itself or any compatible proxy (AIcredits, OpenRouter, etc.)
— just point AI_BASE_URL at the provider and set OPENAI_API_KEY. The client is
created lazily and reused.
"""
from openai import OpenAI
from .config import settings

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.ai_base_url,
        )
    return _client


def complete(prompt: str, max_tokens: int = 300) -> str:
    """Send a single-user-message prompt, return the text (or "" on failure)."""
    try:
        resp = get_client().chat.completions.create(
            model=settings.ai_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.4,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        print(f"[ai] completion failed: {type(e).__name__}: {e}")
        return ""
