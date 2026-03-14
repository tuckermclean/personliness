from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import FigureIngestionRequest
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=FigureIngestionRequest)
def trigger_ingestion_queue(sender, instance, created, **kwargs):
    """Trigger the ingestion queue processor when a request is pending."""
    update_fields = kwargs.get('update_fields')
    if update_fields is not None and 'status' not in update_fields:
        return
    if instance.status == 'pending':
        figure_name = instance.figure_name
        def dispatch():
            from .tasks import process_ingestion_queue
            logger.info(f"Ingestion request for {figure_name} is pending, triggering queue processor")
            process_ingestion_queue.delay()
        transaction.on_commit(dispatch)
