"""
Parse and validate Claude's scoring response into a typed model.

The raw response from Claude is a string like:
    SCORE: 72
    REASON: The caption discusses Python tooling, directly matching tech interests.

The current worker.py parsing is fragile — it splits on newlines and calls
int() with no error handling. This module replaces that with:
  1. Regex extraction (handles extra whitespace, missing fields, extra text)
  2. Pydantic range validation (score must be 0-100)
  3. One automatic retry on parse failure, then a loud exception

Import ScoreResult and parse_score_response; use them instead of the
inline parsing in worker.py.
"""

import re
import logging
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)

_SCORE_RE = re.compile(r"SCORE\s*:\s*(\d{1,3})", re.I)
_REASON_RE = re.compile(r"REASON\s*:\s*(.+)", re.I)


class ScoreResult(BaseModel):
    score: int
    reason: str = ""

    @field_validator("score")
    @classmethod
    def score_in_range(cls, v: int) -> int:
        if not (0 <= v <= 100):
            raise ValueError(f"score {v} is out of range 0-100")
        return v


def parse_score_response(raw: str) -> ScoreResult:
    """
    Parse Claude's raw response text into a ScoreResult.

    Raises ValueError if the response can't be parsed into a valid score.
    The caller should catch this and retry the AI call once before giving up.
    """
    score_match = _SCORE_RE.search(raw)
    if not score_match:
        raise ValueError(f"no SCORE field in response: {raw[:120]!r}")

    reason_match = _REASON_RE.search(raw)
    reason = reason_match.group(1).strip() if reason_match else ""

    return ScoreResult(score=int(score_match.group(1)), reason=reason)
