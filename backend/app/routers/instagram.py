from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..auth import get_current_user
from ..config import settings
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

class ConnectWebViewRequest(BaseModel):
    session_id: str
    ds_user_id: str


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
    # Route through a residential/mobile proxy when configured so Instagram
    # doesn't reject the login as datacenter traffic (see config.ig_proxy).
    if settings.ig_proxy:
        cl.set_proxy(settings.ig_proxy)

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


@router.post("/connect-webview")
async def connect_webview(
    body: ConnectWebViewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cl = Client()
    cl.delay_range = [1, 3]
    if settings.ig_proxy:
        cl.set_proxy(settings.ig_proxy)

    try:
        cl.login_by_sessionid(body.session_id)
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Session login failed: {str(e)}")

    ig_username = cl.username or f"user_{body.ds_user_id}"
    session_json = json.dumps(cl.get_settings())

    account = await db.scalar(
        select(InstagramAccount).where(InstagramAccount.user_id == user.id)
    )
    if account:
        account.username = ig_username
        account.session_data = session_json
        account.status = "connected"
        account.last_sync = datetime.now(timezone.utc)
    else:
        account = InstagramAccount(
            user_id=user.id,
            username=ig_username,
            session_data=session_json,
            status="connected",
            last_sync=datetime.now(timezone.utc),
        )
        db.add(account)

    await db.commit()
    return {"status": "connected", "username": ig_username}


@router.post("/disconnect")
async def disconnect(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await db.scalar(
        select(InstagramAccount).where(InstagramAccount.user_id == user.id)
    )
    if not account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No connected account")
    account.status = "disconnected"
    account.session_data = None
    await db.commit()
    return {"status": "disconnected"}


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