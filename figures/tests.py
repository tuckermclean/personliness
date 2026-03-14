from django.test import TestCase
from personliness.traits import ALL_TRAIT_NAMES
from .tasks import RUBRIC_PROMPT


class TraitSyncTest(TestCase):
    def test_all_traits_in_rubric_prompt(self):
        """Verify all 36 trait names from the canonical list appear in RUBRIC_PROMPT."""
        self.assertEqual(len(ALL_TRAIT_NAMES), 36)
        missing = [name for name in ALL_TRAIT_NAMES if name not in RUBRIC_PROMPT]
        self.assertEqual(
            missing, [],
            f"Traits missing from RUBRIC_PROMPT: {missing}"
        )
