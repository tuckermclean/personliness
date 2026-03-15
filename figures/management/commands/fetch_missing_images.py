from django.core.management.base import BaseCommand
from figures.models import HistoricalFigure
from figures.tasks import fetch_figure_image


class Command(BaseCommand):
    help = 'Enqueue Celery tasks to download missing figure images from Wikipedia (idempotent)'

    def handle(self, *args, **options):
        missing = [
            f for f in HistoricalFigure.objects.all()
            if not (f.image and f.image.storage.exists(f.image.name))
        ]
        for figure in missing:
            fetch_figure_image.delay(figure.pk)
        self.stdout.write(
            self.style.SUCCESS(
                f'Enqueued {len(missing)} task(s). Watch worker logs for progress (rate-limited to 6/min).'
            )
        )
