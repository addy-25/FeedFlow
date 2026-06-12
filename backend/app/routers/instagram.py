from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_db
from ..models import User, InstagramAccount
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, BadPassword, ChallengeRequired
import json
from datetime import datetime, timezone

router = APIRouter(prefix="/instagram", tags=["instagram"])


class ConnectRequest(BaseModel):
    username: str
    password: str


class StatusResponse(BaseModel):
    status: str
    username: str | None
    last_sync: str | None


@router.post("/connect")
async def connect(
    body: ConnectRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await db.scalar(
        select(InstagramAccount).where(InstagramAccount.user_id == user.id)
    )

    cl = Client()
    cl.delay_range = [1, 3]

    try:
        cl.login(body.username, body.password)
    except BadPassword:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong Instagram password")
    except ChallengeRequired:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Instagram requires verification — open the app and verify, then retry")
    except LoginRequired:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Instagram login failed")
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Login error: {str(e)}")

    session_json = json.dumps(cl.get_settings())

    if account:
        account.username = body.username
        account.session_data = session_json
        account.status = "connected"
        account.last_sync = datetime.now(timezone.utc)
    else:
        account = InstagramAccount(
            user_id=user.id,
            username=body.username,
            session_data=session_json,
            status="connected",
            last_sync=datetime.now(timezone.utc),
        )
        db.add(account)

    await db.commit()
    return {"status": "connected", "username": body.username}


@router.get("/status", response_model=StatusResponse)
async def get_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await db.scalar(
        select(InstagramAccount).where(InstagramAccount.user_id == user.id)
    )
    if not account:
        return StatusResponse(status="disconnected", username=None, last_sync=None)
    return StatusResponse(
        status=account.status,
        username=account.username,
        last_sync=account.last_sync.isoformat() if account.last_sync else None,
    )