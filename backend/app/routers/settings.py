from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from ..auth import get_current_user
from ..database import get_db
from ..models import User, UserSettings

router = APIRouter(prefix="/settings", tags=["settings"])

# Allowed automation cadences (minutes). Mirrors the picker in the app.
ALLOWED_INTERVALS = {15, 30, 60, 180, 360, 720, 1440}


class SettingsResponse(BaseModel):
    automation_interval_minutes: int


class UpdateSettingsRequest(BaseModel):
    automation_interval_minutes: int = Field(ge=15, le=1440)


async def get_or_create_settings(user_id: int, db: AsyncSession) -> UserSettings:
    row = await db.scalar(select(UserSettings).where(UserSettings.user_id == user_id))
    if row is None:
        row = UserSettings(user_id=user_id, automation_interval_minutes=60)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


@router.get("", response_model=SettingsResponse)
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await get_or_create_settings(user.id, db)
    return SettingsResponse(automation_interval_minutes=row.automation_interval_minutes)


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    body: UpdateSettingsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.automation_interval_minutes not in ALLOWED_INTERVALS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported interval")
    row = await get_or_create_settings(user.id, db)
    row.automation_interval_minutes = body.automation_interval_minutes
    await db.commit()
    await db.refresh(row)
    return SettingsResponse(automation_interval_minutes=row.automation_interval_minutes)
