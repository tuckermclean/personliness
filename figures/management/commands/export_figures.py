import os
from django.core import serializers
from django.core.management.base import BaseCommand, CommandError
from figures.models import HistoricalFigure

FIXTURE_DIR = 'fixtures/figures'


class Command(BaseCommand):
    help = 'Export figure(s) to fixture files under fixtures/figures/'

    def add_arguments(self, parser):
        parser.add_argument(
            'slugs',
            nargs='*',
            help='Slug(s) of figures to export. Omit to export all figures missing a fixture file.',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Export every figure, overwriting existing fixture files.',
        )

    def handle(self, *args, **options):
        os.makedirs(FIXTURE_DIR, exist_ok=True)

        if options['slugs']:
            figures = []
            for slug in options['slugs']:
                try:
                    figures.append(HistoricalFigure.objects.get(slug=slug))
                except HistoricalFigure.DoesNotExist:
                    raise CommandError(f"No figure with slug '{slug}'")
        elif options['all']:
            figures = list(HistoricalFigure.objects.all())
        else:
            # Default: only figures that don't have a fixture file yet
            figures = [
                f for f in HistoricalFigure.objects.all()
                if not os.path.exists(os.path.join(FIXTURE_DIR, f'{f.slug}.json'))
            ]

        if not figures:
            self.stdout.write('Nothing to export.')
            return

        for figure in figures:
            path = os.path.join(FIXTURE_DIR, f'{figure.slug}.json')
            data = serializers.serialize('json', [figure], indent=2)
            with open(path, 'w') as f:
                f.write(data)
            self.stdout.write(self.style.SUCCESS(f'Exported {figure.name} → {path}'))
