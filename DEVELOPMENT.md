# Development Guide

## Quick Start

### Using Docker (Recommended)

1. Run the start script:
```bash
./start.sh
```

2. Access the application:
   - API: http://localhost:8000
   - Admin: http://localhost:8000/admin

### Manual Setup (Without Docker)

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL and Redis locally

4. Create and configure `.env` file:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Load fixtures:
```bash
python manage.py loaddata fixtures/questions.json
python manage.py loaddata fixtures/sample_figures.json
```

7. Create superuser:
```bash
python manage.py createsuperuser
```

8. Run development server:
```bash
python manage.py runserver
```

9. In another terminal, start Celery worker:
```bash
celery -A personliness worker -l info
```

## Testing

Run tests with pytest:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=assessments --cov=figures
```

## API Testing

### Get JWT Token
```bash
curl -X POST http://localhost:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "testpass123"}'
```

### List Questions
```bash
curl http://localhost:8000/api/questions/
```

### Submit Assessment
```bash
curl -X POST http://localhost:8000/api/assessments/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"answers": {"1": 5, "2": 4, "3": 3}}'
```

### Get Matches
```bash
curl http://localhost:8000/api/matches/latest/?top=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Figures
```bash
curl "http://localhost:8000/api/figures/?sort=overall&dir=desc"
```

### Search Figures
```bash
curl "http://localhost:8000/api/figures/?search=einstein"
```

## Database Management

### Apply Migrations
```bash
python manage.py migrate
```

### Create New Migration
```bash
python manage.py makemigrations
```

### Access Django Shell
```bash
python manage.py shell
```

### Access Database Shell
```bash
python manage.py dbshell
```

## Adding New Historical Figures

### Via API (Requires Admin Key)
```bash
curl -X POST http://localhost:8000/api/figures/ingest/ \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: YOUR_ADMIN_API_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "figure_name": "Albert Einstein",
    "biography_text": "Albert Einstein was a German-born theoretical physicist..."
  }'
```

### Check Ingestion Status
```bash
curl http://localhost:8000/api/figures/ingest/1/ \
  -H "X-Admin-API-Key: YOUR_ADMIN_API_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Via Django Admin
1. Go to http://localhost:8000/admin
2. Login with admin credentials
3. Navigate to "Historical figures" > "Add"
4. Fill in the details and save

### Via Management Command
```bash
python manage.py shell
```
```python
from figures.models import HistoricalFigure

figure = HistoricalFigure.objects.create(
    name="Isaac Newton",
    slug="isaac-newton",
    bio_short="English mathematician and physicist...",
    bio_long="Full biography here...",
    source_notes="Wikipedia, Britannica",
    score_json={...},  # Your score data
    core_4d_avg_0_10=7.5,
    general_competency_avg_0_10=8.2,
    overall_normalized_equal_avg_0_10=7.8
)
```

## Project Structure

```
personliness/
├── assessments/              # Assessment app
│   ├── models.py            # Question, AssessmentSubmission models
│   ├── views.py             # API views
│   ├── serializers.py       # DRF serializers
│   ├── scoring.py           # Scoring algorithm
│   ├── urls.py              # URL routing
│   ├── admin.py             # Admin configuration
│   └── tests.py             # Unit tests
├── figures/                 # Historical figures app
│   ├── models.py            # HistoricalFigure, FigureIngestionRequest models
│   ├── views.py             # API views
│   ├── tasks.py             # Celery tasks
│   ├── serializers.py       # DRF serializers
│   ├── urls.py              # URL routing
│   ├── admin.py             # Admin configuration
│   └── tests.py             # Unit tests
├── personliness/            # Main project
│   ├── settings.py          # Django settings
│   ├── urls.py              # Main URL configuration
│   ├── celery.py            # Celery configuration
│   └── wsgi.py              # WSGI application
├── fixtures/                # Initial data
│   ├── questions.json       # Assessment questions
│   ├── historical_figures.json  # Historical figure data
│   └── sample_figures.json  # Sample figures
├── static/                  # Static files
├── templates/               # Django templates
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Docker image
├── entrypoint.sh            # Container entrypoint
├── requirements.txt         # Python dependencies
├── pytest.ini               # Pytest configuration
├── .env.example             # Environment variables template
└── .gitignore              # Git ignore rules
```

## Environment Variables

Key environment variables (see `.env.example`):

- `DJANGO_SECRET_KEY`: Django secret key (generate a secure one for production)
- `DEBUG`: Debug mode (True/False)
- `DJANGO_ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `POSTGRES_*`: PostgreSQL connection settings
- `CELERY_*`: Celery broker and backend URLs
- `OPENAI_API_KEY`: OpenAI API key for LLM-based figure scoring
- `ADMIN_API_KEY`: Admin API key for protected endpoints
- `CREATE_SUPERUSER`: Auto-create superuser on startup (Docker only)

## Troubleshooting

### Port Already in Use
If port 8000 is already in use:
```bash
docker-compose down
# Or change the port in docker-compose.yml
```

### Database Connection Issues
Check PostgreSQL is running:
```bash
docker-compose ps
```

Reset database:
```bash
docker-compose down -v
docker-compose up --build
```

### Static Files Not Loading
Collect static files:
```bash
python manage.py collectstatic --noinput
```

### Celery Tasks Not Running
Check worker is running:
```bash
docker-compose logs worker
```

Restart worker:
```bash
docker-compose restart worker
```

## Code Style

Follow PEP 8 guidelines. Use tools like:
- `black` for formatting
- `flake8` for linting
- `isort` for import sorting

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Run tests: `pytest`
5. Submit a pull request
