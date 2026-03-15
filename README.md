# Personliness

A personality assessment app that matches users to historical figures based on multi-dimensional trait profiles.

Users answer 62 Likert-scale questions, receive scores across 36 traits in 5 core dimensions plus Heinlein competencies, and are matched to the historical figures whose scored profiles most closely resemble theirs.

**Features**

- 62-question assessment across 36 traits
- 5 core personality dimensions + 15 Heinlein competency traits
- LLM-powered historical figure scoring (OpenAI, Anthropic, or Ollama)
- Mean absolute difference matching with per-dimension breakdown
- React SPA with radar charts and side-by-side figure comparison
- JWT authentication, Django admin, Celery async ingestion

---

## Architecture

```
 Browser
    │
    ▼
┌─────────────────────────────────┐
│  Nginx (port 80 in prod)        │  ← serves React SPA
│  React SPA (port 3000 in dev)   │     proxies /api/ → Django
└───────────────┬─────────────────┘
                │ /api/
                ▼
        ┌──────────────┐
        │  Django /    │◄──── Celery Worker
        │  Gunicorn    │           │
        │  :8000       │           │
        └──────┬───────┘           │
               │                   │
       ┌───────┴───────┐    ┌──────┴──────┐
       │ PostgreSQL 15 │    │  Redis 7    │
       └───────────────┘    └─────────────┘
                                          │
                                    LLM API
                             (OpenAI / Anthropic / Ollama)
```

---

## Quick Start (Development)

```bash
git clone <repo-url>
cd personliness
cp .env.example .env
# Edit .env: set LLM_OPENAI_API_KEY (or another provider — see LLM section)
docker compose up --build
```

- React dev server: http://localhost:3000 (hot reload)
- Django API: http://localhost:8000
- Django admin: http://localhost:8000/admin

The entrypoint automatically runs migrations, loads the `questions` and `historical_figures` fixtures, and creates a superuser (`admin` / `admin` by default in dev).

---

## Production Deployment

### Prerequisites

- Docker Engine + Docker Compose v2
- Ports 80 (and 443 if you terminate TLS on the host) accessible
- A domain name for `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`

### Environment Setup

Create a `.env` file from `.env.example` and set production values:

```bash
# Django core
DJANGO_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(50))">
DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
POSTGRES_DB=personliness
POSTGRES_USER=personliness
POSTGRES_PASSWORD=<strong password>

# Redis/Celery (defaults work as-is in Docker)
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# API security
ADMIN_API_KEY=<strong random key>
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Superuser bootstrap
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=<strong password>

# LLM provider (see LLM section below)
LLM_ACTIVE_CONFIG=openai-o3
LLM_OPENAI_API_KEY=sk-...

# Refinement passes
LLM_ENABLE_REFINEMENT=True
LLM_MAX_REFINEMENT_PASSES=2
LLM_MIN_CONFIDENCE_TARGET=High
```

> Note: `CORS_ALLOWED_ORIGINS` and `CREATE_SUPERUSER` are set directly in `docker-compose.prod.yml`. Override them in `.env` if needed.

### Build & Launch

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

**What the entrypoint does automatically on first boot:**

1. Waits for PostgreSQL to accept connections
2. Runs `manage.py migrate`
3. Runs `manage.py collectstatic`
4. Loads `questions` and `historical_figures` fixtures
5. Creates a superuser if `CREATE_SUPERUSER=true`
6. Starts Gunicorn on `:8000`

The Nginx container serves the pre-built React SPA on port 80 and proxies `/api/`, `/admin/`, and `/static/` to Gunicorn.

### TLS / HTTPS

The prod stack exposes port 80. For HTTPS, terminate TLS upstream with Caddy, Traefik, a host-level Nginx, or Cloudflare Tunnel. Then set `CORS_ALLOWED_ORIGINS=https://yourdomain.com`.

### Verify Deployment

```bash
# API responds
curl http://yourdomain.com/api/figures/

# Admin login page
open http://yourdomain.com/admin/

# React SPA
open http://yourdomain.com/
```

---

## Configuration Reference

### Django Core

| Variable | Default (dev) | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | insecure dev key | Django secret key — **change in production** |
| `DEBUG` | `True` | Set `False` in production |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |

### Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `personliness` | Database name |
| `POSTGRES_USER` | `personliness` | Database user |
| `POSTGRES_PASSWORD` | `personliness` | Database password — **change in production** |
| `POSTGRES_HOST` | `db` | Service name (Docker) or hostname |
| `POSTGRES_PORT` | `5432` | Port |

### Redis / Celery

| Variable | Default | Description |
|---|---|---|
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Celery message broker |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/0` | Celery result store |

### API Security

| Variable | Description |
|---|---|
| `ADMIN_API_KEY` | Bearer token required for figure ingestion endpoints |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins allowed by CORS (e.g. `https://yourdomain.com`) |

### Superuser Bootstrap

| Variable | Default | Description |
|---|---|---|
| `CREATE_SUPERUSER` | `true` | Create superuser on first boot if not exists |
| `DJANGO_SUPERUSER_USERNAME` | `admin` | Superuser username |
| `DJANGO_SUPERUSER_EMAIL` | `admin@example.com` | Superuser email |
| `DJANGO_SUPERUSER_PASSWORD` | `admin` (dev) | Superuser password — **change in production** |

### LLM Provider

| Variable | Description |
|---|---|
| `LLM_ACTIVE_CONFIG` | Active profile: `openai-o3`, `openai-gpt4`, `anthropic`, `ollama` |
| `LLM_OPENAI_API_KEY` | OpenAI API key |
| `LLM_ANTHROPIC_API_KEY` | Anthropic API key |
| `LLM_OLLAMA_BASE_URL` | Ollama base URL (e.g. `http://ollama:11434/v1`) |
| `LLM_OLLAMA_MODEL` | Ollama model name (e.g. `llama3`) |
| `LLM_OPENAI_MODEL` | Override model for `openai-o3` profile |
| `LLM_OPENAI_GPT4_MODEL` | Override model for `openai-gpt4` profile |
| `LLM_ANTHROPIC_MODEL` | Override model for `anthropic` profile |
| `LLM_ENABLE_REFINEMENT` | `True` — enable multi-pass refinement |
| `LLM_MAX_REFINEMENT_PASSES` | `2` — max refinement iterations |
| `LLM_MIN_CONFIDENCE_TARGET` | `High` — target confidence level before stopping |

---

## LLM Provider Selection

Set `LLM_ACTIVE_CONFIG` to one of these profiles:

| Profile | Required Key | Best For |
|---|---|---|
| `openai-o3` (default) | `LLM_OPENAI_API_KEY` | Highest accuracy, reasoning tasks |
| `openai-gpt4` | `LLM_OPENAI_API_KEY` | Faster, lower cost |
| `anthropic` | `LLM_ANTHROPIC_API_KEY` | Extended thinking, long context |
| `ollama` | `LLM_OLLAMA_BASE_URL` + `LLM_OLLAMA_MODEL` | Local / air-gapped / private |

**Refinement passes** (`LLM_ENABLE_REFINEMENT=True`): After the initial scoring, the worker re-prompts the LLM for any traits below `LLM_MIN_CONFIDENCE_TARGET`, up to `LLM_MAX_REFINEMENT_PASSES` times. This improves accuracy at the cost of additional API calls.

---

## Adding Historical Figures

### Via Admin API (LLM-scored, async)

```bash
# Submit for ingestion
curl -X POST http://yourdomain.com/api/figures/ingest/ \
  -H "X-Admin-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "figure_name": "Ada Lovelace",
    "biography_text": "Augusta Ada King, Countess of Lovelace..."
  }'
# Returns: {"id": 42, "status": "pending", ...}

# Poll for completion
curl http://yourdomain.com/api/figures/ingest/42/ \
  -H "X-Admin-API-Key: $ADMIN_API_KEY"
# status: pending → processing → complete (or failed)
```

The Celery worker picks up the task and scores the figure across all 36 traits using the configured LLM.

### Via Fixture (manual)

```bash
docker compose exec web python manage.py loaddata fixtures/sample_figures.json
```

---

## Scoring System

### Assessment

- **62 questions**, Likert scale 0–3
- Each question maps to one or more traits with a multiplier weight
- Some questions are reverse-scored
- Trait scores are weighted averages normalized to the 0–3 scale

### Traits

- **21 core traits** across 5 dimensions:
  - **Cognitive**: Strategic Intelligence, Ethical/Philosophical Insight, Creative/Innovative Thinking, Administrative/Legislative Skill
  - **Moral-Affective**: Compassion/Empathy, Courage/Resilience, Justice Orientation, Moral Fallibility & Growth
  - **Cultural-Social**: Leadership/Influence, Institution-Building, Impact Legacy, Archetype Resonance, Relatability/Cultural Embeddedness
  - **Embodied-Existential**: Physical Endurance/Skill, Hardship Tolerance, Joy/Play/Aesthetic Appreciation, Mortality Acceptance, Paradox Integration
  - **Relational**: Spousal/Partner Quality, Parental/Mentoring Quality, Relational Range
- **15 Heinlein competency traits**: Caregiving & Nurture, Strategic Planning & Command, Animal & Food Processing, Navigation & Wayfinding, Construction & Fabrication, Artistic & Cultural Expression, Numerical & Analytical Reasoning, Manual Craft & Repair, Medical Aid & Emergency Response, Leadership & Followership, Agricultural & Resource Management, Culinary Skill, Combat & Defense, Technical & Systemic Problem-Solving, Existential Composure

### Figure Matching

Similarity is computed as **mean absolute difference** (not cosine):

```
per-trait dissimilarity = |user_score - figure_score| / 3
similarity = 1 - mean(dissimilarities)
```

- `core_similarity`: average over 21 core traits
- `heinlein_similarity`: average over 15 Heinlein traits
- `overall_similarity`: weighted `(core × 5 + heinlein × 1) / 6`

Top 10 matches are stored on the assessment at submission time (not recalculated on load).

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup/` | Register new user |
| `POST` | `/api/auth/token/` | Obtain JWT access + refresh tokens |
| `POST` | `/api/auth/token/refresh/` | Refresh JWT access token |

### Assessments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/questions/` | — | List all 62 questions |
| `POST` | `/api/assessments/` | JWT | Submit answers, compute scores + matches |
| `GET` | `/api/assessments/latest/` | JWT | Most recent assessment |
| `GET` | `/api/assessments/<id>/` | JWT | Specific assessment by ID |
| `GET` | `/api/assessments/history/` | JWT | All user assessments |
| `GET` | `/api/matches/latest/` | JWT | Top 10 figure matches for latest assessment |
| `GET` | `/api/compare/<slug>/` | JWT | Detailed trait-by-trait comparison with a figure |

### Historical Figures

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/figures/` | — | List all figures |
| `GET` | `/api/figures/<slug>/` | — | Figure detail with full score breakdown |
| `POST` | `/api/figures/ingest/` | Admin key | Queue figure for LLM scoring |
| `GET` | `/api/figures/ingest/<id>/` | Admin key | Check ingestion status |

Admin key is passed as `X-Admin-API-Key: <ADMIN_API_KEY>` header.

---

## Development Workflow

```bash
# Run backend tests
docker compose run --rm web python manage.py test

# Make and apply migrations
docker compose run --rm web python manage.py makemigrations
docker compose run --rm web python manage.py migrate

# Open Django shell
docker compose run --rm web python manage.py shell

# Watch Celery worker logs
docker compose logs -f worker
```

Frontend dev server runs on port 3000 with Vite hot module reload. API calls proxy to Django on port 8000.

---

## Project Structure

```
personliness/
├── assessments/              # Assessment app
│   ├── models.py             # Question, AssessmentSubmission
│   ├── views.py              # API views
│   ├── serializers.py        # DRF serializers
│   ├── scoring.py            # calculate_scores(), calculate_match(), rank_matches()
│   └── urls.py
├── figures/                  # Historical figures app
│   ├── models.py             # HistoricalFigure, FigureIngestionRequest
│   ├── views.py              # API views (list, detail, ingest)
│   ├── tasks.py              # Celery task: LLM scoring
│   ├── serializers.py
│   └── urls.py
├── personliness/             # Django project config
│   ├── settings.py
│   ├── urls.py               # Root URL routing
│   ├── traits.py             # Canonical trait/dimension definitions (36 traits)
│   ├── celery.py
│   └── wsgi.py
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── pages/            # Home, Assessment, Results, Figures, FigureDetail,
│   │   │                     #   Compare, Login, Signup, Layout
│   │   ├── components/       # Shared UI components
│   │   ├── context/          # Auth context
│   │   └── api.js            # Axios API client
│   └── Dockerfile            # Multi-stage: dev (Vite) + prod (Nginx)
├── fixtures/
│   ├── questions.json        # 62 assessment questions
│   ├── historical_figures.json
│   └── sample_figures.json
├── docker-compose.yml        # Development stack
├── docker-compose.prod.yml   # Production stack (Nginx on :80, no exposed DB/Redis)
├── Dockerfile                # Django/Gunicorn image
├── entrypoint.sh             # Migrate → collectstatic → loaddata → superuser → gunicorn
├── nginx.prod.conf           # Nginx config: serve SPA, proxy /api/
└── requirements.txt
```
