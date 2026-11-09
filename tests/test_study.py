import unittest
import json
from analysis import parse_study, study_data
from tonnetz import SAMPLE_SONGS, TonnetzRecommender, Song, transposition_invariant_distance


class StudyTests(unittest.TestCase):
    def test_export_json_round_trip_reproduces_results(self):
        for transpose in (False, True):
            original = study_data(TonnetzRecommender(SAMPLE_SONGS), SAMPLE_SONGS[:3], transpose)
            saved = json.loads(json.dumps(original))
            songs, mode = parse_study(saved['inputs'])
            replay = json.loads(json.dumps(study_data(TonnetzRecommender(SAMPLE_SONGS), songs, mode)))
            self.assertEqual(saved, replay)
            self.assertEqual(saved['schema'], 'tonnetz-lab-study/v1')
            self.assertEqual(set(saved['reproducibility']['source_sha256']),
                             {'tonnetz.py', 'explanations.py', 'analysis.py'})
            changed = study_data(TonnetzRecommender(SAMPLE_SONGS), songs, not mode)
            self.assertNotEqual(saved['reproducibility']['input_sha256'],
                                changed['reproducibility']['input_sha256'])

    def setUp(self):
        self.engine = TonnetzRecommender(SAMPLE_SONGS)

    def test_transposed_equivalent_songs_have_zero_cost(self):
        data = study_data(self.engine, [SAMPLE_SONGS[0], SAMPLE_SONGS[2]])
        self.assertEqual(data['distances'], [[0, 0], [0, 0]])
        self.assertEqual(data['songs'][1]['shift'], 7)
        self.assertEqual(data['summary']['shared_chords'], ['Am', 'C', 'F', 'G'])
        self.assertEqual(data['summary']['exact_pairs'], 1)

    def test_full_pairwise_study_matches_original_engine_and_equations(self):
        selected = SAMPLE_SONGS[:5]
        data = study_data(self.engine, selected)
        self.assertEqual(len(data['comparisons']), 20)
        self.assertEqual(data['summary']['pair_count'], 10)
        for pair in data['comparisons']:
            a, b = selected[pair['reference']], selected[pair['candidate']]
            distance, shift, path = transposition_invariant_distance(self.engine.graph, a.chords, b.chords)
            self.assertEqual((pair['distance'], pair['shift'], pair['path']), (distance, shift, path))
            self.assertEqual(pair['cumulative'][-1][-1], pair['total_cost'])
            self.assertEqual(pair['total_cost']/pair['path_length'], distance)

    def test_same_key_and_unequal_lengths(self):
        songs = [Song.from_text('A', 'C C Am'), Song.from_text('B', 'Am')]
        data = study_data(self.engine, songs, False)
        pair = data['comparisons'][0]
        self.assertEqual(pair['shift'], 0)
        self.assertEqual(pair['total_cost'], 2)
        self.assertAlmostEqual(pair['distance'], 2/3)
        self.assertEqual(pair['path_length'], 3)

    def test_selection_validation(self):
        good = {'title': 'A', 'progression': 'C Am'}
        other = {'title': 'B', 'progression': 'F Dm'}
        for bad in [[], {}, {'songs':[good]}, {'songs':[good]*6},
                    {'songs':[good,good]}, {'songs':[good, {'title':'B','progression':'Csus4'}]},
                    {'songs':[good,other], 'transpose':'true'}]:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                parse_study(bad)
        songs, transpose = parse_study({'songs':[good,other]})
        self.assertEqual(len(songs),2)
        self.assertTrue(transpose)
