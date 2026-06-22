# FeedFlow

> AI-powered Instagram feed personalization. Tell it what you care about — it handles the rest.

FeedFlow connects to your Instagram account, fetches your feed, and uses ChatGPT AI to re-rank every post based on your content preferences. High-relevance posts get boosted, low-relevance posts get pushed down. Set a schedule and it runs automatically in the background.

---

## Demo

[Download the Android APK](https://expo.dev/accounts/addy-25/projects/feedflow/builds/2c2fba32-86ad-4cb5-9e70-1cc40681c3df) — install on any Android device and try the full flow.

---

## Features

- **Email-verified sign up** — 6-digit OTP sent to your inbox, codes expire in 10 minutes
- **Secure Instagram connection** — logs in via an in-app browser using Instagram's own login page; your password never touches FeedFlow's servers
- **AI feed ranking** — ChatGPT scores every post against your interests; boosts what you want, suppresses what you don't
- **Content preferences** — toggle topics on/off (tech, photography, fitness, etc.); saved to the backend and used as AI instructions
- **Automated scheduling** — Celery Beat fires personalization on a per-user interval (15m → daily) with no user interaction needed
- **Change email / password** — full account management with verification flows
- **Delete account** — cascades cleanly across all tables

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Expo (React Native)                    │
│  Auth · Connect · Preferences · Profile · Home          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / JWT
┌──────────────────────▼──────────────────────────────────┐
│                   FastAPI (Railway)                     │
│  /auth  /instagram  /preferences  /automation  /settings│
└──────┬───────────────────────────┬───────────────────────┘
       │                           │
┌──────▼──────┐          ┌─────────▼────────┐
│ PostgreSQL  │          │      Redis       │
│             │          │                  │
│ users       │          │ • email OTP keys │
│ instagram   │          │ • Celery broker  │
│ preferences │          │ • Celery results │
│ settings    │          └──────────────────┘
│ auto_logs   │                   │
└─────────────┘          ┌────────▼─────────┐
                         │  Celery Worker   │
                         │                  │
                         │ 1. fetch feed    │
                         │    (instagrapi)  │
                         │ 2. score posts   │
                         │    (ChatGPT AI)  │
                         │ 3. write logs    │
                         └──────────────────┘
```

### How each piece fits

| Layer | Technology | Responsibility |
|---|---|---|
| Mobile | Expo / React Native | UI, JWT storage, WebView Instagram login |
| API | FastAPI + Uvicorn | REST endpoints, auth, request validation |
| Database | PostgreSQL + SQLAlchemy (async) | Persistent user data, sessions, logs |
| Cache / Queue | Redis | OTP TTL storage, Celery message broker |
| Background jobs | Celery + Celery Beat | Async personalization, per-user scheduling |
| Instagram | instagrapi | Feed fetching using stored session cookies |
| AI | ChatGPT (OpenAI-compatible API) | Post scoring against user preferences |
| Email | Google Apps Script relay | OTP delivery over HTTPS — no SMTP needed |

---

## How the AI pipeline works

1. **User triggers personalization** (manually or via schedule)
2. FastAPI drops a task onto the Celery queue in Redis
3. A Celery worker picks up the task and reads the user's Instagram session from PostgreSQL
4. `instagrapi` authenticates with Instagram using the stored `sessionid` + `ds_user_id` cookies and fetches the current feed
5. For each post, the worker builds a prompt containing:
   - Topics the user wants **more** of (boost list)
   - Topics the user wants **less** of (suppress list)
   - The post caption (hashtags stripped — they're noise)
6. ChatGPT returns a `SCORE: 0–100` and a one-sentence reason
7. Posts are ranked by score; results written to `automation_logs`
8. The Instagram account `last_sync` timestamp is updated

---

## Tech Stack

**Backend**
- Python 3.11
- FastAPI, Uvicorn
- SQLAlchemy (async) + asyncpg
- PostgreSQL
- Redis
- Celery + Celery Beat
- instagrapi
- OpenAI-compatible SDK (pointed at ChatGPT)
- Pydantic Settings
- PyJWT, bcrypt

**Mobile**
- Expo SDK 52 / React Native
- Expo Router (file-based navigation)
- react-native-webview (Instagram login)
- @react-native-cookies/cookies (session extraction)
- expo-secure-store (JWT storage)
- expo-haptics, expo-linear-gradient
- TypeScript

**Infrastructure**
- Railway (backend + PostgreSQL + Redis)
- EAS Build (Android APK)
- Google Apps Script (email relay)

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running locally
- Redis running locally

### Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql+asyncpg://localhost/feedflow
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-here

# AI — point at any OpenAI-compatible provider
OPENAI_API_KEY=your-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# Email — Google Apps Script relay (see below)
GAS_EMAIL_URL=https://script.google.com/macros/s/.../exec
GAS_EMAIL_SECRET=your-shared-secret
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Start the Celery worker (separate terminal):

```bash
celery -A app.worker.celery_app worker --loglevel=info
```

Start Celery Beat scheduler (separate terminal):

```bash
celery -A app.worker.celery_app beat --loglevel=info
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go for development. For a production APK with Instagram WebView support, use EAS Build:

```bash
npx eas build --platform android --profile preview
```

---

## Environment Variables (Production — Railway)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `OPENAI_API_KEY` | API key for the AI provider |
| `AI_BASE_URL` | Base URL of the OpenAI-compatible endpoint |
| `AI_MODEL` | Model name (e.g. `gpt-4o-mini`) |
| `GAS_EMAIL_URL` | Google Apps Script web app URL |
| `GAS_EMAIL_SECRET` | Shared secret the script validates |
| `IG_PROXY` | Optional residential proxy for Instagram (`http://user:pass@host:port`) |

> **Note on email delivery:** Railway blocks outbound SMTP (ports 587/465) at the network level. The Google Apps Script relay sends email over HTTPS (port 443) using your own Gmail account — no third-party provider, no account review, inbox delivery for any recipient.

---

## Project Structure

```
FeedFlow/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, middleware, router registration
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── config.py        # Pydantic Settings (env vars)
│   │   ├── database.py      # Async engine + session factory
│   │   ├── auth.py          # JWT helpers, get_current_user dependency
│   │   ├── email_service.py # OTP generation, Redis storage, GAS relay
│   │   ├── ai.py            # OpenAI-compatible client wrapper
│   │   ├── worker.py        # Celery app, Beat schedule, personalization task
│   │   └── routers/
│   │       ├── auth.py      # /auth — register, login, verify, password reset, delete
│   │       ├── instagram.py # /instagram — connect, status, disconnect
│   │       ├── preferences.py  # /preferences — get, update
│   │       ├── automation.py   # /automation — trigger, logs
│   │       └── settings.py     # /settings — interval preference
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
│
└── mobile/
    ├── app/
    │   ├── (tabs)/
    │   │   ├── connect.tsx      # Instagram WebView login + status
    │   │   ├── preferences.tsx  # Content interest toggles
    │   │   ├── profile.tsx      # Account settings, schedule, logout, delete
    │   │   └── index.tsx        # Home / personalization trigger
    │   ├── login.tsx
    │   ├── verify-email.tsx
    │   ├── forgot-password.tsx
    │   └── change-email.tsx / change-password.tsx
    ├── lib/
    │   ├── api.ts       # All API calls, JWT attachment, demo fallback
    │   └── auth.tsx     # AuthContext — signedIn state, login/register/logout
    ├── components/      # GlassCard, PrimaryButton, GradientBackground, etc.
    └── theme.ts         # Colors, fonts, spacing, radii
```

---

## Data Models

**User** — email, hashed password, email_verified flag, created_at

**InstagramAccount** — user_id (1:1), username, session_data (cookies), status, last_sync

**Preference** — user_id, topic, mode (`boost` | `suppress`)

**UserSettings** — user_id (1:1), automation_interval_minutes

**AutomationLog** — user_id, post_id, username, caption, score, reason, action, created_at

---

## License

MIT
