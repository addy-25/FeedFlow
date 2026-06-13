from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_db
from ..models import User, AutomationLog
from ..worker import run_automation

router = APIRouter(prefix="/automation", tags=["automation"])


class LogItem(BaseModel):
    id: int
    username: str
    caption: str | None
    score: int
    reason: str | None
    action: str
    created_at: str

    model_config = {"from_attributes": True}


@router.post("/trigger")
async def trigger(user: User = Depends(get_current_user)):
    task = run_automation.delay(user.id) # type: ignore
    return {"task_id": task.id, "status": "queued"}


@router.get("/logs", response_model=list[LogItem])
async def get_logs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(AutomationLog)
        .where(AutomationLog.user_id == user.id)
        .order_by(AutomationLog.created_at.desc())
        .limit(50)
    )
    return [
        LogItem(
            id=r.id,
            username=r.username,
            caption=r.caption,
            score=r.score,
            reason=r.reason,
            action=r.action,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]