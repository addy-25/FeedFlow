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