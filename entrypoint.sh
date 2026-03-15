#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until pg_isready -h db -p 5432 -U $POSTGRES_USER; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

>&2 echo "PostgreSQL is up - continuing"

# If arguments are passed (e.g., celery command), run them directly
if [ $# -gt 0 ]; then
  exec "$@"
fi

# Run migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Load fixtures (skip if data already exists)
python manage.py shell -c "
from assessments.models import Question
import sys
sys.exit(0 if Question.objects.exists() else 1)
" && echo "Questions already loaded, skipping." || python manage.py loaddata questions

if ls fixtures/figures/*.json 1>/dev/null 2>&1; then
  python manage.py shell -c "
from figures.models import HistoricalFigure
import sys
sys.exit(0 if HistoricalFigure.objects.exists() else 1)
" && echo "Figures already loaded, skipping." || {
    for fixture in fixtures/figures/*.json; do
      python manage.py loaddata "$fixture" || true
    done
  }
fi
python manage.py fetch_missing_images || true

# Create superuser if needed
if [ "$CREATE_SUPERUSER" = "true" ]; then
  SU_USERNAME="${DJANGO_SUPERUSER_USERNAME:-admin}"
  SU_EMAIL="${DJANGO_SUPERUSER_EMAIL:-admin@example.com}"
  SU_PASSWORD="${DJANGO_SUPERUSER_PASSWORD:-admin}"
  python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='${SU_USERNAME}').exists():
    User.objects.create_superuser('${SU_USERNAME}', '${SU_EMAIL}', '${SU_PASSWORD}')
  "
fi

# Start the application
exec gunicorn personliness.wsgi:application --bind 0.0.0.0:8000