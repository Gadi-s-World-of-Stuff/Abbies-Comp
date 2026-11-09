import copy
import unittest

from analysis import study_data
from replay_study import verify
from tonnetz import SAMPLE_SONGS, TonnetzRecommender


class ReplayTests(unittest.TestCase):
    def setUp(self):
        import json
        self.saved = json.loads(json.dumps(study_data(TonnetzRecommender(SAMPLE_SONGS), SAMPLE_SONGS[:2])))

    def test_browser_export_timestamp_does_not_change_verification(self):
        self.saved['exported_at'] = '2026-10-12T00:00:00Z'
        result = verify(self.saved)
        self.assertTrue(result['results_match'])
        self.assertTrue(result['inputs_match'])
        self.assertTrue(result['source_matches'])

    def test_changed_calculations_and_code_are_reported_separately(self):
        changed = copy.deepcopy(self.saved)
        changed['distances'][0][1] = 100
        self.assertEqual(verify(changed)['different_fields'], ['distances'])
        changed = copy.deepcopy(self.saved)
        changed['reproducibility']['source_sha256']['tonnetz.py'] = 'changed'
        self.assertFalse(verify(changed)['source_matches'])
        self.assertTrue(verify(changed)['results_match'])

    def test_changed_inputs_and_invalid_formats_are_detected(self):
        self.saved['inputs']['transpose'] = False
        self.assertFalse(verify(self.saved)['inputs_match'])
        for invalid in ([], {}, {'schema': 'unknown'}):
            with self.assertRaises(ValueError):
                verify(invalid)
