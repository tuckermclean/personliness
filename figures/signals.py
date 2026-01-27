from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import FigureIngestionRequest
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=FigureIngestionRequest)
def trigger_ingestion_queue(sender, instance, created, **kwargs):
    """Trigger the ingestion queue processor when a new request is created."""
    if created and instance.status == 'pending':
        from .tasks import process_ingestion_queue
        logger.info(f"New ingestion request for {instance.figure_name}, triggering queue processor")
        process_ingestion_queue.delay()
