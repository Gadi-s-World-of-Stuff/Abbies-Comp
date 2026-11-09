import unittest
import re
import xml.etree.ElementTree as ET
from analysis import parse_study, study_data
from curated_catalog import catalog_songs
from study_report import render_report
from tonnetz import Song, SAMPLE_SONGS, TonnetzRecommender


class ReportTests(unittest.TestCase):
    def test_networks_preserve_topology_and_selected_triad_counts(self):
        study = study_data(TonnetzRecommender(SAMPLE_SONGS), SAMPLE_SONGS[:3])
        report = render_report(study)
        svgs = re.findall(r'<svg\b.*?</svg>', report)
        self.assertEqual(len(svgs), 3)
        ns = {'s': 'http://www.w3.org/2000/svg'}
        for svg, song in zip(svgs, study['songs']):
            root = ET.fromstring(svg)
            self.assertEqual(len(root.findall('s:line', ns)), 36)
            circles = root.findall('s:g/s:circle', ns)
            self.assertEqual(len(circles), 24)
            self.assertEqual(sum(c.get('r') == '12' for c in circles), len(set(song['aligned']['chords'])))
            self.assertEqual(root.get('role'), 'img')

    def test_report_escapes_input_and_contains_all_alignment_costs(self):
        study = study_data(TonnetzRecommender(SAMPLE_SONGS),
                           [Song.from_text('<script>alert(1)</script>', 'C Am'), SAMPLE_SONGS[1]])
        report = render_report(study)
        self.assertNotIn('<script>', report)
        self.assertIn('&lt;script&gt;', report)
        for pair in study['comparisons']:
            self.assertIn(f'{pair["total_cost"]}/{pair["path_length"]}', report)
        self.assertIn(study['reproducibility']['input_sha256'], report)
        self.assertIn('does not establish why', report)

    def test_report_retains_attribution_and_reduction_disclosures(self):
        inputs = {'songs': [{'catalog_id': s['id'], 'title': s['title']+' — '+s['artist'],
                             'progression': ' '.join(s['chords'])} for s in catalog_songs()]}
        songs, mode = parse_study(inputs)
        report = render_report(study_data(TonnetzRecommender(SAMPLE_SONGS), songs, mode))
        self.assertIn('CC-BY-NC-4.0', report)
        self.assertIn('slash bass C# omitted', report)
        self.assertIn('A/Cs', report)
        self.assertIn('not a full-song analysis', report)
