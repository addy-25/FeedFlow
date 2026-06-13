import asyncio
import subprocess

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_db
from ..models import User, Preference

router = APIRouter(prefix="/preferences", tags=["preferences"])


class PreferenceItem(BaseModel):
    topic: str
    mode: str


class PreferencesRequest(BaseModel):
    preferences: list[PreferenceItem]


class PreferencesResponse(BaseModel):
    preferences: list[PreferenceItem]


@router.get("", response_model=PreferencesResponse)
async def get_preferences(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(select(Preference).where(Preference.user_id == user.id))
    return PreferencesResponse(
        preferences=[PreferenceItem(topic=r.topic, mode=r.mode) for r in rows]
    )


@router.post("", response_model=PreferencesResponse)
async def set_preferences(
    body: PreferencesRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(delete(Preference).where(Preference.user_id == user.id))
    for item in body.preferences:
        db.add(Preference(user_id=user.id, topic=item.topic, mode=item.mode))
    await db.commit()
    return body


class SuggestRequest(BaseModel):
    topics: list[str]


class SuggestResponse(BaseModel):
    suggestions: list[str]


def _ask_claude_for_topics(topics: list[str]) -> list[str]:
    """Ask the Claude CLI for related topics. Returns [] on any failure."""
    joined = ", ".join(topics)
    prompt = (
        f"A user wants to see MORE social-media content about these topics: {joined}.\n"
        "Suggest 6 closely related topics they might also enjoy that are NOT already "
        "in their list. Reply with ONLY a comma-separated list of short topic names "
        "(1-3 words each). No numbering, no explanation."
    )
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", "haiku"],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except Exception:
        return []

    raw = result.stdout.strip()
    existing = {t.strip().lower() for t in topics}
    out: list[str] = []
    for part in raw.replace("\n", ",").split(","):
        name = part.strip().strip("-•.").strip()
        if name and name.lower() not in existing and name not in out:
            out.append(name)
    return out[:6]


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(
    body: SuggestRequest,
    user: User = Depends(get_current_user),
):
    if not body.topics:
        return SuggestResponse(suggestions=[])
    # Run the blocking CLI call off the event loop.
    suggestions = await asyncio.to_thread(_ask_claude_for_topics, body.topics)
    return SuggestResponse(suggestions=suggestions)