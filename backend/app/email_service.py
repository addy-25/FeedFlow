import asyncio
import json
import secrets
import smtplib
import socket
import urllib.error
import urllib.request
from email.message import EmailMessage

import redis.asyncio as aioredis

from .config import settings

CODE_TTL_SECONDS = 600  # codes are valid for 10 minutes

# Purpose -> (redis key prefix, email subject, email body template).
# Keying by purpose lets the same machinery serve password resets and email
# verification without their codes colliding.
_PURPOSES = {
    "pwreset": (
        "pwreset",
        "Your FeedFlow password reset code",
        "Your FeedFlow password reset code is: {code}\n\n"
        "This code expires in 10 minutes. "
        "If you didn't request a password reset, you can ignore this email.",
    ),
    "verify": (
        "verifyemail",
        "Verify your FeedFlow email",
        "Welcome to FeedFlow!\n\n"
        "Your email verification code is: {code}\n\n"
        "This code expires in 10 minutes. "
        "If you didn't create a FeedFlow account, you can ignore this email.",
    ),
}

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _meta(purpose: str):
    return _PURPOSES.get(purpose, _PURPOSES["pwreset"])


def _key(email: str, purpose: str) -> str:
    prefix = _meta(purpose)[0]
    return f"{prefix}:{email.strip().lower()}"


async def create_code(email: str, purpose: str) -> str:
    """Generate a single-use code for this email/purpose and store it with a TTL."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    await _get_redis().set(_key(email, purpose), code, ex=CODE_TTL_SECONDS)
    return code


async def verify_code(email: str, code: str, purpose: str) -> bool:
    """True if the code matches the stored one; consumes it so it can't reuse."""
    stored = await _get_redis().get(_key(email, purpose))
    if stored is not None and secrets.compare_digest(stored, code.strip()):
        await _get_redis().delete(_key(email, purpose))
        return True
    return False


def _send_sync(to_email: str, code: str, purpose: str) -> None:
    _, subject, body = _meta(purpose)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to_email
    msg.set_content(body.format(code=code))
    # Railway containers have no IPv6 egress, but getaddrinfo may return the
    # smtp.gmail.com AAAA (IPv6) record first -> "Network is unreachable". Pin to
    # an IPv4 address, while keeping the real hostname (_host) so STARTTLS still
    # validates the certificate against smtp.gmail.com.
    ipv4 = socket.getaddrinfo(
        settings.smtp_host, settings.smtp_port, socket.AF_INET, socket.SOCK_STREAM
    )[0][4][0]
    with smtplib.SMTP(ipv4, settings.smtp_port, timeout=20) as smtp:
        smtp._host = settings.smtp_host  # cert is checked against this, not the IP
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


def _send_via_gas(to_email: str, code: str, purpose: str) -> None:
    """Send through a Google Apps Script web app that relays via the user's Gmail.

    Goes over HTTPS so it's not affected by Railway's SMTP block, and originates
    from Google so it lands in the inbox for any recipient.
    """
    _, subject, body = _meta(purpose)
    payload = {
        "secret": settings.gas_email_secret,
        "to": to_email,
        "subject": subject,
        "body": body.format(code=code),
    }
    req = urllib.request.Request(
        settings.gas_email_url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    # Apps Script answers with a 302 to googleusercontent.com; urllib follows it
    # automatically and returns the script's JSON output.
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode(errors="replace")
    if "sent" not in text:
        raise RuntimeError(f"unexpected Apps Script response: {text[:200]}")


def _send_via_brevo(to_email: str, code: str, purpose: str) -> None:
    """Send through Brevo's HTTPS transactional API (works where SMTP is blocked)."""
    _, subject, body = _meta(purpose)
    payload = {
        "sender": {"name": "FeedFlow", "email": settings.smtp_from or settings.smtp_user},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body.format(code=code),
    }
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode(),
        headers={
            "api-key": settings.brevo_api_key,
            "Content-Type": "application/json",
            "accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        resp.read()


async def send_code(to_email: str, code: str, purpose: str) -> None:
    """Email the code via Brevo (preferred) or SMTP; log it when neither is set.

    Never 500s the request on a mail failure — the error and the code are logged
    so the flow can still be completed from the server console.
    """
    if settings.gas_email_url:
        try:
            await asyncio.to_thread(_send_via_gas, to_email, code, purpose)
            return
        except Exception as e:
            print(f"[email] gas send failed for {to_email}: {type(e).__name__}: {e}")
            print(f"[email:fallback] {purpose} code for {to_email}: {code}")
            return

    if settings.brevo_api_key:
        try:
            await asyncio.to_thread(_send_via_brevo, to_email, code, purpose)
            return
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode(errors="replace")[:300]
            except Exception:
                pass
            print(f"[email] brevo HTTP {e.code} for {to_email}: {detail}")
        except Exception as e:
            print(f"[email] brevo send failed for {to_email}: {type(e).__name__}: {e}")
        print(f"[email:fallback] {purpose} code for {to_email}: {code}")
        return

    if not settings.smtp_user or not settings.smtp_password:
        print(f"[email:dev] {purpose} code for {to_email}: {code}")
        return
    try:
        await asyncio.to_thread(_send_sync, to_email, code, purpose)
    except Exception as e:
        print(f"[email] send failed for {to_email}: {type(e).__name__}: {e}")
        print(f"[email:fallback] {purpose} code for {to_email}: {code}")
