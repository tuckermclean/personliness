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
  python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
  "
fi

# Start the application
exec gunicorn personliness.wsgi:application --bind 0.0.0.0:8000