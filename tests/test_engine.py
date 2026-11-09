"""Regression fixtures reviewed against the original Downloads prototype."""
import unittest

from tonnetz import (Chord, SAMPLE_SONGS, TonnetzChordGraph, TonnetzRecommender,
                     dtw_distance, parse_chord, transform, transpose_progression,
                     transposition_invariant_distance)


class EngineTests(unittest.TestCase):
    def setUp(self):
        self.graph = TonnetzChordGraph()

    def test_known_transformations(self):
        for operation, expected in [("P", "Cm"), ("L", "Em"), ("R", "Am")]:
            with self.subTest(operation=operation):
                self.assertEqual(transform(parse_chord("C"), operation), parse_chord(expected))
                self.assertEqual(self.graph.distance(parse_chord("C"), parse_chord(expected)), 1)

    def test_transformations_are_involutions_and_keep_two_notes(self):
        self.assertEqual(len(self.graph.nodes), 24)
        for chord in self.graph.nodes:
            for operation in "PLR":
                neighbor = transform(chord, operation)
                self.assertEqual(transform(neighbor, operation), chord)
                self.assertEqual(len(chord.pcs & neighbor.pcs), 2)

    def test_shortest_routes_reach_every_chord(self):
        start = parse_chord("C")
        for goal in self.graph.nodes:
            route = self.graph.shortest_path(start, goal)
            self.assertEqual(route[0], (start, None))
            self.assertEqual(route[-1][0], goal)
            self.assertEqual(len(route) - 1, self.graph.distance(start, goal))
            for (previous, _), (chord, operation) in zip(route, route[1:]):
                self.assertEqual(transform(previous, operation), chord)

    def test_dtw_hand_checked_cost_and_repeated_chords(self):
        c, am = parse_chord("C"), parse_chord("Am")
        self.assertEqual(dtw_distance(self.graph, [c], [am]), (1.0, [(0, 0)]))
        self.assertEqual(dtw_distance(self.graph, [c], [c, c]), (0.0, [(0, 0), (0, 1)]))
        with self.assertRaises(ValueError):
            dtw_distance(self.graph, [], [c])

    def test_transposition_preserves_equivalence(self):
        original = SAMPLE_SONGS[0].chords
        for shift in range(12):
            distance, winning_shift, path = transposition_invariant_distance(
                self.graph, original, transpose_progression(original, shift))
            self.assertEqual(distance, 0)
            self.assertEqual(winning_shift, (-shift) % 12)
            self.assertEqual(path, [(0, 0), (1, 1), (2, 2), (3, 3)])

    def test_supported_spelling_and_rejected_extensions(self):
        self.assertEqual(parse_chord("D#m"), Chord(3, "minor"))
        self.assertEqual(parse_chord("Db major"), Chord(1, "major"))
        for symbol in ["", "C7", "Csus4", "C/G", "H"]:
            with self.subTest(symbol=symbol), self.assertRaises(ValueError):
                parse_chord(symbol)

    def test_all_sample_rankings_and_transpositions(self):
        # Each tuple is (ranked title suffixes, distances, best semitone shifts).
        fixtures = [
            ("CDEHBFG", [0, 0, 0, 0, .4, .6, 1.2], [7, 6, 5, 9, 0, 0, 0]),
            ("ACDEHFG", [.4, .4, .4, .4, .4, 1, 1.2], [0, 7, 6, 5, 9, 0, 0]),
            ("ADEHBFG", [0, 0, 0, 0, .4, .6, 1.2], [5, 11, 10, 2, 5, 5, 5]),
            ("ACEHBFG", [0, 0, 0, 0, .4, .6, 1.2], [6, 1, 11, 3, 6, 6, 6]),
            ("ACDHBFG", [0, 0, 0, 0, .4, .6, 1.2], [7, 2, 1, 4, 7, 7, 0]),
            ("ACDEHBG", [.6, .6, .6, .6, .6, 1, 1.2], [0, 7, 6, 5, 9, 0, 5]),
            ("ABCDEFH", [1.2] * 7, [0, 0, 2, 1, 0, 7, 4]),
            ("ACDEBFG", [0, 0, 0, 0, .4, .6, 1.2], [3, 10, 9, 8, 3, 3, 3]),
        ]
        recommender = TonnetzRecommender(SAMPLE_SONGS)
        for song, (titles, distances, shifts) in zip(SAMPLE_SONGS, fixtures):
            with self.subTest(song=song.title):
                results = recommender.recommend(song, top_k=7)
                self.assertEqual([r["song"].title for r in results], ["Song " + t for t in titles])
                self.assertEqual([r["shift"] for r in results], shifts)
                for result, distance in zip(results, distances):
                    self.assertAlmostEqual(result["distance"], distance)
                    self.assertAlmostEqual(result["similarity"], 1 / (1 + distance))


if __name__ == "__main__":
    unittest.main()
