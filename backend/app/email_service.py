"""Password-reset verification codes.

Generates a 6-digit code, stashes it in Redis with a short TTL, and emails it
via SMTP (Gmail by default). When SMTP credentials aren't configured the flow
still works for development — the code is printed to the backend console.
"""
import asyncio
import secrets
import smtplib
from email.message import EmailMessage

import redis.asyncio as aioredis

from .config import settings

CODE_TTL_SECONDS = 600  # codes are valid for 10 minutes

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _key(email: str) -> str:
    return f"pwreset:{email.strip().lower()}"


async def create_reset_code(email: str) -> str:
    """Generate a single-use code for this email and store it with a TTL."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    await _get_redis().set(_key(email), code, ex=CODE_TTL_SECONDS)
    return code


async def verify_reset_code(email: str, code: str) -> bool:
    """True if the code matches the stored one; consumes it so it can't reuse."""
    stored = await _get_redis().get(_key(email))
    if stored is not None and secrets.compare_digest(stored, code.strip()):
        await _get_redis().delete(_key(email))
        return True
    return False


def _send_sync(to_email: str, code: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Your FeedFlow password reset code"
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to_email
    msg.set_content(
        f"Your FeedFlow password reset code is: {code}\n\n"
        "This code expires in 10 minutes. "
        "If you didn't request a password reset, you can ignore this email."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


async def send_reset_code(to_email: str, code: str) -> None:
    """Email the code, or log it (dev mode) when SMTP isn't configured."""
    if not settings.smtp_user or not settings.smtp_password:
        print(f"[email:dev] password reset code for {to_email}: {code}")
        return
    try:
        await asyncio.to_thread(_send_sync, to_email, code)
    except Exception as e:
        # Never 500 the request on a mail failure — log it (and the code, so a
        # dev can still complete the flow) and move on.
        print(f"[email] send failed for {to_email}: {type(e).__name__}: {e}")
        print(f"[email:fallback] password reset code for {to_email}: {code}")
