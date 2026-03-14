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

# Load fixtures
python manage.py loaddata questions historical_figures || true

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