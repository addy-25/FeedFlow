import json
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
)


def get_engine():
    return create_async_engine(settings.database_url)


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
        suppress_topics = [p.topic for p in prefs if p.mode == "suppress"]

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
                image_url = str(post.thumbnail_url or post.resources[0].thumbnail_url if post.resources else "")

                prompt = f"""You are scoring an Instagram post for relevance to a user's interests.

User wants MORE of: {boost_topics}
User wants LESS of: {suppress_topics}

Post caption: {caption[:300]}

Score this post 0-100 for relevance to the boost topics (0 = completely irrelevant or matches suppress topics, 100 = perfectly matches boost topics).
Reply in this exact format:
SCORE: <number>
REASON: <one sentence>"""

                result = subprocess.run(
                    ["claude", "-p", prompt, "--model", "haiku"],
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
                response_text = result.stdout
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
                actions.append({"post": post.user.username, "score": score, "action": action, "reason": reason})

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