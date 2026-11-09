import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app import Handler
from explanations import recommendation_data, graph_data
from tonnetz import SAMPLE_SONGS, Song, TonnetzRecommender, parse_chord, transform


class ExplanationTests(unittest.TestCase):
    def test_network_contains_exactly_the_real_plr_edges(self):
        engine = TonnetzRecommender(SAMPLE_SONGS)
        graph = graph_data(engine.graph)
        nodes = {node['id']: node for node in graph['nodes']}
        self.assertEqual(len(nodes), 24)
        self.assertEqual(len(graph['edges']), 36)
        degrees = {node: 0 for node in nodes}
        for edge in graph['edges']:
            source, target = nodes[edge['source']], nodes[edge['target']]
            self.assertEqual(transform(parse_chord(source['name']), edge['operation']).name, target['name'])
            degrees[source['id']] += 1
            degrees[target['id']] += 1
        self.assertEqual(set(degrees.values()), {3})

    def test_displayed_paths_and_costs_explain_engine_results(self):
        engine = TonnetzRecommender(SAMPLE_SONGS)
        for transpose in [False, True]:
            data = recommendation_data(engine, Song.from_text("custom", "Eb Cm Ab Bb"), transpose)
            for result in data["results"]:
                pairs = result["alignment"]
                self.assertAlmostEqual(sum(p["distance"] for p in pairs) / len(pairs), result["distance"])
                for pair in pairs:
                    chord = parse_chord(pair["from"])
                    for operation in pair["operations"]:
                        chord = transform(chord, operation)
                    self.assertEqual(chord.name, pair["to"])
                    self.assertEqual(len(pair["operations"]), pair["distance"])
            if transpose:
                self.assertEqual(data["results"][0]["aligned"]["chords"], ["Eb", "Cm", "Ab", "Bb"])
                self.assertTrue(all(p["distance"] == 0 for p in data["results"][0]["alignment"]))


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class QuietHandler(Handler):
            def log_message(self, *args):
                pass
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def post(self, data):
        return urlopen(Request(self.base + "/api/recommend", json.dumps(data).encode(),
                               {"Content-Type": "application/json"}), timeout=5)

    def test_browser_contract(self):
        with urlopen(self.base + "/api/songs", timeout=5) as response:
            self.assertEqual(len(json.load(response)), 8)
        with self.post({"progression": "C Am F G", "transpose": True}) as response:
            result = json.load(response)
            self.assertEqual(result["results"][0]["distance"], 0)
            self.assertIn("alignment", result["results"][0])

    def test_multi_song_http_contract(self):
        payload = {"songs": [{"title": "One", "progression": "C Am F G"},
                             {"title": "Two", "progression": "F Dm Bb C"}]}
        with urlopen(Request(self.base + "/api/analyze", json.dumps(payload).encode(),
                             {"Content-Type": "application/json"}), timeout=5) as response:
            result = json.load(response)
            self.assertEqual(result["distances"][0][1], 0)
            self.assertEqual(len(result["comparisons"]), 2)
        with urlopen(self.base, timeout=5) as response:
            self.assertIn(b"Tonnetz Lab", response.read())
        with self.assertRaises(HTTPError) as raised:
            urlopen(Request(self.base + "/api/analyze", b'{"songs":[]}',
                            {"Content-Type": "application/json"}), timeout=5)
        self.assertEqual(raised.exception.code, 400)

    def test_import_recalculates_instead_of_trusting_saved_scores(self):
        from analysis import study_data
        saved = study_data(TonnetzRecommender(SAMPLE_SONGS), SAMPLE_SONGS[:2])
        saved['distances'][0][1] = 999
        with urlopen(Request(self.base + '/api/import-study', json.dumps(saved).encode(),
                             {'Content-Type': 'application/json'}), timeout=5) as response:
            result = json.load(response)
        self.assertFalse(result['verification']['results_match'])
        self.assertEqual(result['study']['distances'][0][1], 0.4)
        with self.assertRaises(HTTPError) as raised:
            urlopen(Request(self.base + '/api/import-study', b'{}',
                            {'Content-Type': 'application/json'}), timeout=5)
        self.assertEqual(raised.exception.code, 400)

    def test_invalid_inputs_return_actionable_errors(self):
        for payload in [[], {"progression": ""}, {"progression": "Csus4"},
                        {"progression": 4}, {"progression": "C " * 33},
                        {"progression": "C", "transpose": "false"}]:
            with self.subTest(payload=payload), self.assertRaises(HTTPError) as raised:
                self.post(payload)
            self.assertEqual(raised.exception.code, 400)
            self.assertTrue(json.load(raised.exception)["error"])


if __name__ == "__main__":
    unittest.main()
