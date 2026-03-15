# Development Guide

## Quick Start (Docker — Recommended)

```bash
cp .env.example .env
# Set at minimum: LLM_OPENAI_API_KEY (or another LLM provider — see README)
docker compose up --build
```

| Service | URL |
|---|---|
| React SPA (Vite dev server) | http://localhost:3000 |
| Django API | http://localhost:8000 |
| Django admin | http://localhost:8000/admin (user: `admin`, pass: `admin`) |

The entrypoint automatically runs migrations, loads fixtures, and creates the `admin` superuser on first boot.

---

## Running Without Docker

Requires: Python 3.11+, PostgreSQL 15, Redis 7, Node 18+

```bash
# Python backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set POSTGRES_HOST=localhost, REDIS host, LLM key

python manage.py migrate
python manage.py loaddata questions
for f in fixtures/figures/*.json; do python manage.py loaddata "$f"; done
python manage.py createsuperuser
python manage.py runserver          # :8000

# In a second terminal
celery -A personliness worker -l info

# Frontend
cd frontend
npm install
npm run dev                         # :3000
```

---

## Testing

```bash
# Via Docker (preferred)
docker compose run --rm web python manage.py test

# With coverage (local venv)
pytest --cov=assessments --cov=figures
```

---

## Common Tasks

### Migrations

```bash
docker compose run --rm web python manage.py makemigrations
docker compose run --rm web python manage.py migrate
```

### Django Shell

```bash
docker compose run --rm web python manage.py shell
```

### Watch Celery Logs

```bash
docker compose logs -f worker
```

### Reset Everything (wipe volumes)

```bash
docker compose down -v
docker compose up --build
```

---

## API Testing Examples

### Sign Up & Get Token

```bash
curl -X POST http://localhost:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "testpass123"}'
# Returns: {"access": "...", "refresh": "..."}

TOKEN="<access token from above>"
```

### List Questions

```bash
curl http://localhost:8000/api/questions/
# Returns array of 62 questions
```

### Submit Assessment

Answers are `question_id → value (0–3)`:

```bash
curl -X POST http://localhost:8000/api/assessments/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"answers": {"1": 2, "2": 3, "3": 1}}'
```

### Get Top Matches

```bash
curl http://localhost:8000/api/matches/latest/ \
  -H "Authorization: Bearer $TOKEN"
```

### Compare with a Figure

```bash
curl http://localhost:8000/api/compare/ada-lovelace/ \
  -H "Authorization: Bearer $TOKEN"
```

### List / Search Figures

```bash
curl "http://localhost:8000/api/figures/"
curl "http://localhost:8000/api/figures/?search=einstein"
```

### Ingest a Figure (Admin)

```bash
curl -X POST http://localhost:8000/api/figures/ingest/ \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: your-admin-api-key-here" \
  -d '{
    "figure_name": "Albert Einstein",
    "biography_text": "Albert Einstein was a German-born theoretical physicist..."
  }'
# Returns: {"id": 1, "status": "pending", ...}

# Poll status
curl http://localhost:8000/api/figures/ingest/1/ \
  -H "X-Admin-API-Key: your-admin-api-key-here"
# status: pending → processing → complete
```

---

## Adding Figures via Shell

```bash
docker compose run --rm web python manage.py shell
```

```python
from figures.models import HistoricalFigure

figure = HistoricalFigure.objects.create(
    name="Isaac Newton",
    slug="isaac-newton",
    bio_short="English mathematician and physicist, 1643–1727.",
    bio_long="Full biography...",
    source_notes="Wikipedia, Britannica",
    score_json={
        "core": {
            "Cognitive": {
                "Strategic Intelligence": {"score_0_3": 2.8, "justification": "...", "confidence": "High"},
                # ... other traits
            },
            # ... other dimensions
        },
        "heinlein_competency": {
            "Numerical & Analytical Reasoning": {"score_0_3": 3.0, "justification": "...", "confidence": "High"},
            # ... other Heinlein traits
        }
    }
)
```

See `personliness/traits.py` for the full list of dimensions and trait names.

---

## Contributing Figures

Each historical figure lives in its own fixture file under `fixtures/figures/<slug>.json`.
To add a new figure and commit it for others:

1. **Ingest via the Admin API** (requires a running stack with an LLM key and `ADMIN_API_KEY`):
   ```bash
   curl -X POST http://localhost:8000/api/figures/ingest/ \
     -H "Content-Type: application/json" \
     -H "X-Admin-API-Key: your-admin-api-key-here" \
     -d '{"figure_name": "Your Figure Name", "biography_text": "..."}'
   # Returns: {"id": <n>, "status": "pending", ...}
   ```

2. **Poll until complete:**
   ```bash
   curl http://localhost:8000/api/figures/ingest/<n>/ \
     -H "X-Admin-API-Key: your-admin-api-key-here"
   # status: pending → processing → complete
   ```

3. **Export the figure to its fixture file:**
   ```bash
   docker compose -f docker-compose.prod.yml exec web python manage.py export_figures
   # Exports any figures not yet on disk. Or target one specifically:
   docker compose -f docker-compose.prod.yml exec web python manage.py export_figures your-figure-slug
   ```
   Files appear directly in `fixtures/figures/` on the host (bind-mounted).

4. **Commit and open a PR:**
   ```bash
   git add fixtures/figures/your-figure-slug.json
   git commit -m "feat: add <Figure Name> fixture"
   ```

---

## Environment Variables (Development)

Development defaults are hardcoded in `docker-compose.yml` and require no `.env` for basic use. Set these in `.env` to override:

| Variable | What to set |
|---|---|
| `LLM_OPENAI_API_KEY` | Required for figure ingestion with OpenAI |
| `LLM_ANTHROPIC_API_KEY` | Required for figure ingestion with Anthropic |
| `LLM_ACTIVE_CONFIG` | `openai-o3` (default), `openai-gpt4`, `anthropic`, `ollama` |
| `ADMIN_API_KEY` | Default is `your-admin-api-key-here` in dev compose |

See `README.md` for the full configuration reference.

---

## Project Structure

```
personliness/
├── assessments/              # Assessment app
│   ├── models.py             # Question, AssessmentSubmission
│   ├── views.py              # API views
│   ├── serializers.py
│   ├── scoring.py            # calculate_scores(), calculate_match(), rank_matches()
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
├── figures/                  # Historical figures app
│   ├── models.py             # HistoricalFigure, FigureIngestionRequest
│   ├── views.py
│   ├── tasks.py              # Celery: LLM scoring task
│   ├── serializers.py
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
├── personliness/             # Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── traits.py             # Canonical 36-trait definitions (21 core + 15 Heinlein)
│   ├── celery.py
│   └── wsgi.py
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── pages/            # Home, Assessment, Results, Figures, FigureDetail,
│   │   │                     #   Compare, Login, Signup, Layout
│   │   ├── components/
│   │   ├── context/          # Auth context (JWT)
│   │   └── api.js            # Axios client
│   └── Dockerfile            # dev target (Vite :3000) + prod target (Nginx :80)
├── fixtures/
│   ├── questions.json        # 62 assessment questions
│   └── figures/              # one JSON file per figure (e.g. ada-lovelace.json)
├── docker-compose.yml        # Dev stack
├── docker-compose.prod.yml   # Prod stack (Nginx on :80, DB/Redis not exposed)
├── Dockerfile                # Django/Gunicorn image
├── entrypoint.sh             # migrate → collectstatic → loaddata → superuser → gunicorn
├── nginx.prod.conf           # Nginx: serve SPA, proxy /api/ and /admin/
├── requirements.txt
└── .env.example
```

---

## Troubleshooting

**Port conflict on 3000 or 8000**
```bash
docker compose down
# change ports in docker-compose.yml if needed
```

**Database connection refused**
```bash
docker compose ps          # check db container is healthy
docker compose logs db
```

**Fixtures not loaded / missing questions**
```bash
docker compose run --rm web python manage.py loaddata questions
for f in fixtures/figures/*.json; do
  docker compose run --rm web python manage.py loaddata "$f"
done
```

**Celery not processing ingestion tasks**
```bash
docker compose logs worker
docker compose restart worker
```

**Frontend not reflecting code changes**

Vite HMR should update automatically. If not:
```bash
docker compose restart frontend
```
