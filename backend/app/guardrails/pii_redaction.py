"""
PII scrubber for caption text before it is written to logs or the database.

Applied AFTER scoring (the model needs the real content to score accurately)
but BEFORE anything gets persisted to automation_logs or emitted to Grafana/
any observability stack. This prevents email addresses and phone numbers in
Instagram captions from ending up in your database or dashboards.
"""

import re

_RULES: list[tuple[str, re.Pattern, str]] = [
    ("email",   re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"), "[email]"),
    ("phone_intl", re.compile(r"\+?1?\s*[\(\-\.]?\d{3}[\)\-\.\s]\s*\d{3}[\-\.\s]\d{4}"), "[phone]"),
    ("phone_plain", re.compile(r"\b\d{10}\b"), "[phone]"),
    ("ssn",     re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b"), "[ssn]"),
]


def scrub_pii(text: str) -> str:
    """Replace PII patterns with placeholder tokens. Safe to call on None/empty."""
    if not text:
        return text
    for _, pattern, replacement in _RULES:
        text = pattern.sub(replacement, text)
    return text
