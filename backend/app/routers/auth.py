from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import create_token, get_current_user, hash_password, verify_password
from ..database import get_db
from ..email_service import create_reset_code, send_reset_code, verify_reset_code
from ..models import User
from ..schemas import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return TokenResponse(access_token=create_token(user.id))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/email", response_model=UserOut)
async def change_email(
    body: ChangeEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing and existing.id != user.id:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
    user.email = body.email
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/password")
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password is incorrect")
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return {"status": "updated"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Email a single-use verification code if the address has an account.

    Always responds 200 regardless of whether the email is registered, so the
    endpoint can't be used to discover which emails have accounts.
    """
    user = await db.scalar(select(User).where(User.email == body.email))
    if user:
        code = await create_reset_code(body.email)
        await send_reset_code(body.email, code)
    return {"status": "sent"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Ownership is proven by the emailed code; reject if it's wrong or expired.
    if not await verify_reset_code(body.email, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired code")
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account with that email")
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return {"status": "reset"}