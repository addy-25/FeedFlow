import json
import re
import asyncio
import subprocess
from datetime import datetime, timezone
from celery import Celery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from instagrapi import Client
from .config import settings

celery_app = Celery("feedflow", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    
    beat_schedule={
        "personalization-tick": {
            "task": "feedflow.run_automation_all_users",
            "schedule": 300.0,  # seconds = 5 minutes
        }
    },
)


def get_engine():
    return create_async_engine(settings.database_url)


def score_post(boost_topics, suppress_topics, caption):
    hashtags = re.findall(r'#\w+', caption)
    caption_body = re.sub(r'#\w+', '', caption).strip()

    prompt = f"""Score this Instagram post for relevance to a user's interests.

User wants MORE of: {boost_topics}
User wants LESS of: {suppress_topics}

Caption text (no hashtags): {caption_body[:300] or "(no text)"}
Hashtags present: {' '.join(hashtags[:20]) or "(none)"}

IMPORTANT: Hashtags are often spam-added for reach and do NOT reflect actual post content.
Score based on:
1. The caption text body (what the post actually says)
2. Ignore hashtags unless the caption body confirms the topic

Score 0-100. Reply exactly:
SCORE: <number>
REASON: <one sentence>"""

    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "haiku"],
        capture_output=True,
        text=True,
        timeout=120,
    )
    return result.stdout


async def run_automation_for_user(user_id: int):
    from .models import InstagramAccount, Preference, AutomationLog

    engine = get_engine()
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        account = await db.scalar(
            select(InstagramAccount).where(
                InstagramAccount.user_id == user_id,
                InstagramAccount.status == "connected",
            )
        )
        if not account or not account.session_data:
            return {"skipped": "no connected account"}

        prefs = await db.scalars(
            select(Preference).where(Preference.user_id == user_id)
        )
        prefs = list(prefs)
        if not prefs:
            return {"skipped": "no preferences set"}

        boost_topics = [p.topic for p in prefs if p.mode == "boost"]
        # The app stores "see less" topics as "reduce"; accept the legacy
        # "suppress" value too so older rows still work.
        suppress_topics = [p.topic for p in prefs if p.mode in ("reduce", "suppress")]

        cl = Client()
        cl.delay_range = [2, 5]
        cl.set_settings(json.loads(account.session_data))

        try:
            all_posts = []
            for topic in boost_topics[:3]:
                hashtag = topic.replace(" ", "").lower()
                try:
                    medias = cl.hashtag_medias_top(hashtag, amount=5)
                    all_posts.extend(medias)
                except Exception:
                    continue
            posts = all_posts[:10]
            if not posts:
                return {"skipped": "no posts found for topics"}
        except Exception as e:
            return {"error": str(e)}

        actions = []

        for post in posts[:5]:
            try:
                caption = post.caption_text or ""

                response_text = score_post(boost_topics, suppress_topics, caption)
                lines = response_text.strip().split("\n")
                score = int(lines[0].replace("SCORE:", "").strip())
                reason = lines[1].replace("REASON:", "").strip() if len(lines) > 1 else ""

                action = "none"
                if score >= 70:
                    cl.media_like(post.id)
                    action = "liked"
                elif score <= 30:
                    cl.media_seen([post.id])
                    action = "suppressed"

                log = AutomationLog(
                    user_id=user_id,
                    post_id=str(post.id),
                    username=post.user.username,
                    caption=caption[:200],
                    score=score,
                    reason=reason,
                    action=action,
                )
                db.add(log)
                actions.append({
                    "post": post.user.username,
                    "score": score,
                    "action": action,
                    "reason": reason,
                })

            except Exception as e:
                print(f"[scoring] post {post.id} failed: {type(e).__name__}: {e}")
                continue

        account.last_sync = datetime.now(timezone.utc)
        await db.commit()
        await engine.dispose()
        return {"processed": len(actions), "actions": actions}


@celery_app.task(name="feedflow.run_automation")
def run_automation(user_id: int):
    return asyncio.run(run_automation_for_user(user_id))


async def dispatch_all_connected_users():
    """Queue a personalization run for each connected account that is due.

    "Due" means more than the user's configured interval (default 60 min) has
    elapsed since their last run. We stamp last_sync at dispatch time so a run
    that finds nothing to do can't re-trigger every tick.
    """
    from .models import InstagramAccount, UserSettings

    now = datetime.now(timezone.utc)
    engine = get_engine()
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    due_ids: list[int] = []

    async with SessionLocal() as db:
        accounts = list(
            await db.scalars(
                select(InstagramAccount).where(InstagramAccount.status == "connected")
            )
        )
        for acct in accounts:
            row = await db.scalar(
                select(UserSettings).where(UserSettings.user_id == acct.user_id)
            )
            interval = row.automation_interval_minutes if row else 60

            last = acct.last_sync
            if last is not None and last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            due = last is None or (now - last).total_seconds() >= interval * 60
            if not due:
                continue

            acct.last_sync = now  # claim this slot before queuing
            due_ids.append(acct.user_id)
        await db.commit()
    await engine.dispose()

    # Hand each user off as its own task so one failure can't block the rest.
    for uid in due_ids:
        run_automation.delay(uid)
    return {"dispatched": len(due_ids)}


@celery_app.task(name="feedflow.run_automation_all_users")
def run_automation_all_users():
    return asyncio.run(dispatch_all_connected_users())
