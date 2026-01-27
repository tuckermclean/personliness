# Personliness

A comprehensive web application for personality assessment and historical figure matching based on multi-dimensional trait analysis.

## Overview

Personliness is a Django-based web application that allows users to:
- Take a comprehensive personality assessment based on multiple trait dimensions
- Receive detailed scoring across cognitive, emotional, and competency dimensions
- Match with historical figures who have similar trait profiles
- Browse and search through a database of scored historical figures
- Ingest new historical figures using LLM-based scoring

## Features

### Assessment System
- **Multi-dimensional trait assessment**: 40+ questions covering various personality dimensions
- **Sophisticated scoring algorithm**: Calculates scores across:
  - Core 4D traits (Openness, Conscientiousness, Extraversion, Emotional Stability)
  - Heinlein's General Competency traits (practical, creative, physical, social skills)
  - Overall normalized scores
- **Historical figure matching**: Find the closest matches to your personality profile

### Figure Database
- **Searchable database** of historical figures with detailed biographies
- **Multiple sorting options**: Sort by core traits, competency, or overall scores
- **LLM-powered ingestion**: Add new figures with automated trait scoring via OpenAI API

### API Endpoints
- RESTful API with JWT authentication
- Comprehensive endpoints for assessments, figures, and user management
- Admin-level endpoints for figure ingestion and management

## Tech Stack

- **Backend**: Django 6.0, Django REST Framework
- **Database**: PostgreSQL 15
- **Task Queue**: Celery with Redis
- **Authentication**: JWT (SimpleJWT)
- **Containerization**: Docker, Docker Compose
- **Web Server**: Gunicorn
- **LLM Integration**: OpenAI API

## Getting Started

### Prerequisites

- Docker and Docker Compose
- OpenAI API key (for figure ingestion feature)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd personliness
```

2. Copy the example environment file and configure it:
```bash
cp .env.example .env
```

3. Edit `.env` and set your configuration:
   - Generate a secure `DJANGO_SECRET_KEY`
   - Set your `OPENAI_API_KEY` for figure ingestion
   - Set a secure `ADMIN_API_KEY`
   - Configure superuser credentials

4. Build and start the containers:
```bash
docker-compose up --build
```

5. The application will be available at:
   - API: http://localhost:8000
   - Admin: http://localhost:8000/admin

### Loading Initial Data

Load the question fixtures and sample historical figures:
```bash
docker-compose exec web python manage.py loaddata fixtures/questions.json
docker-compose exec web python manage.py loaddata fixtures/sample_figures.json
```

## API Endpoints

### Authentication
- `POST /api/auth/token/` - Obtain JWT token
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `POST /api/auth/signup/` - Register new user

### Assessments
- `GET /api/questions/` - List all assessment questions
- `POST /api/assessments/` - Submit assessment answers
- `GET /api/assessments/latest/` - Get user's latest assessment
- `GET /api/assessments/<id>/` - Get specific assessment
- `GET /api/matches/latest/` - Get top matching figures for user's latest assessment

### Historical Figures
- `GET /api/figures/` - List figures (supports sorting and search)
- `GET /api/figures/<slug>/` - Get figure details
- `POST /api/figures/ingest/` - Ingest new figure (requires admin)
- `GET /api/figures/ingest/<id>/` - Check ingestion status

## Project Structure

```
personliness/
├── assessments/          # Assessment app
│   ├── models.py        # Question and AssessmentSubmission models
│   ├── views.py         # API views for assessments
│   ├── serializers.py   # DRF serializers
│   ├── scoring.py       # Scoring algorithm implementation
│   └── urls.py          # URL routing
├── figures/             # Historical figures app
│   ├── models.py        # HistoricalFigure and FigureIngestionRequest models
│   ├── views.py         # API views for figures
│   ├── tasks.py         # Celery tasks for LLM-based scoring
│   ├── serializers.py   # DRF serializers
│   └── urls.py          # URL routing
├── personliness/        # Main project settings
│   ├── settings.py      # Django settings
│   ├── urls.py          # Main URL routing
│   ├── celery.py        # Celery configuration
│   └── wsgi.py          # WSGI application
├── fixtures/            # Initial data fixtures
│   ├── questions.json   # Assessment questions
│   └── sample_figures.json  # Sample historical figures
├── static/              # Static files
├── templates/           # Django templates
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker image definition
├── entrypoint.sh        # Container entrypoint script
└── requirements.txt     # Python dependencies
```

## Scoring System

The assessment scoring follows a multi-tiered approach:

1. **Raw Trait Scores (0-3 scale)**: Each question maps to one or more traits with multipliers
2. **Dimension Averages (0-10 scale)**: Traits are grouped into dimensions and averaged
3. **Category Averages**: Dimensions are grouped into Core 4D and Heinlein categories
4. **Overall Score**: Equal-weighted average of all normalized scores

### Similarity Calculation

Historical figure matching uses cosine similarity between trait vectors, considering:
- Core 4D dimensions
- Heinlein competency dimensions
- Overall trait profile alignment

## Development

### Running Locally Without Docker

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL and Redis locally, then configure `.env`

4. Run migrations:
```bash
python manage.py migrate
```

5. Load fixtures:
```bash
python manage.py loaddata fixtures/questions.json
python manage.py loaddata fixtures/sample_figures.json
```

6. Create a superuser:
```bash
python manage.py createsuperuser
```

7. Run the development server:
```bash
python manage.py runserver
```

8. In another terminal, start Celery worker:
```bash
celery -A personliness worker -l info
```

### Running Tests

```bash
pytest
```

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Your license here]

## Acknowledgments

- Assessment framework inspired by multi-trait personality research
- Historical figure data sourced from publicly available biographies
- LLM scoring powered by OpenAI's GPT models
