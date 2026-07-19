from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import create_token, get_current_user, hash_password, verify_password
from ..database import get_db
from ..email_service import create_code, send_code, verify_code
from ..models import (
    AutomationLog,
    InstagramAccount,
    Preference,
    User,
    UserSettings,
)
from ..schemas import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
    VerifyEmailRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        
        if not existing.email_verified:
            existing.hashed_password = hash_password(body.password)
            await db.commit()
            code = await create_code(body.email, "verify")
            await send_code(body.email, code, "verify")
            return RegisterResponse(status="verification_required", email=existing.email)
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    code = await create_code(user.email, "verify")
    await send_code(user.email, code, "verify")
    return RegisterResponse(status="verification_required", email=user.email)


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    if not await verify_code(body.email, body.code, "verify"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired code")
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account with that email")
    user.email_verified = True
    await db.commit()
    # Verifying doubles as signing in, so return a token.
    return TokenResponse(access_token=create_token(user.id))


@router.post("/resend-verification")
async def resend_verification(
    body: ResendVerificationRequest, db: AsyncSession = Depends(get_db)
):
    """Email a fresh verification code if the account exists and is unverified.

    Always responds 200 so it can't be used to probe which emails are registered.
    """
    user = await db.scalar(select(User).where(User.email == body.email))
    if user and not user.email_verified:
        code = await create_code(body.email, "verify")
        await send_code(body.email, code, "verify")
    return {"status": "sent"}


@router.post("/login", response_model=TokenResponse)
async def login(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    if not user.email_verified:
        # Bounce them to verification with a fresh code rather than logging in.
        code = await create_code(user.email, "verify")
        await send_code(user.email, code, "verify")
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified")
    return TokenResponse(access_token=create_token(user.id))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the signed-in user and everything tied to them.

    The foreign keys don't declare ON DELETE CASCADE, so child rows must be
    removed first or Postgres rejects the user delete with a constraint error.
    """
    uid = user.id
    await db.execute(delete(AutomationLog).where(AutomationLog.user_id == uid))
    await db.execute(delete(Preference).where(Preference.user_id == uid))
    await db.execute(delete(UserSettings).where(UserSettings.user_id == uid))
    await db.execute(delete(InstagramAccount).where(InstagramAccount.user_id == uid))
    await db.delete(user)
    await db.commit()


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
        code = await create_code(body.email, "pwreset")
        await send_code(body.email, code, "pwreset")
    return {"status": "sent"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Ownership is proven by the emailed code; reject if it's wrong or expired.
    if not await verify_code(body.email, body.code, "pwreset"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired code")
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account with that email")
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return {"status": "reset"}