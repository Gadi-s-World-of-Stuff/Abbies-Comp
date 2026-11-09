import unittest

from catalog_import import reduce_symbol, validate_catalog


class CatalogTests(unittest.TestCase):
    def test_explicit_chordonomicon_notation(self):
        self.assertEqual(reduce_symbol('Csmin', 'chordonomicon')['triad'], 'C#m')
        result = reduce_symbol('A/Cs', 'chordonomicon')
        self.assertEqual(result['original'], 'A/Cs')
        self.assertEqual(result['triad'], 'A')
        self.assertEqual(len(result['changes']), 2)
        with self.assertRaises(ValueError):
            reduce_symbol('Csmin')
        with self.assertRaises(ValueError):
            reduce_symbol('Fsno3d', 'chordonomicon')

    def test_curated_excerpts_match_pinned_source_sections(self):
        import json
        import re
        from pathlib import Path
        data = Path(__file__).resolve().parents[1] / 'data'
        records = json.loads((data / 'curated-input.json').read_text())
        source = json.loads((data / 'chordonomicon-source-rows.json').read_text())
        compiled = validate_catalog(records)
        for record in compiled['songs']:
            row = next(r for r in source['rows'] if r['id'] == record['source_record_id'])
            original = re.search(r'<verse_1>\s*(.*?)(?=<|$)', row['chords']).group(1).split()
            self.assertEqual(record['original_chords'], original)
            self.assertEqual(len(record['chords']), len(original))
            self.assertEqual(record['source_revision'], source['revision'])

    def record(self):
        return {"id": "test", "title": "Synthetic fixture", "artist": "Test",
                "source_url": "https://example.com/source", "source_record_id": "1",
                "source_revision": "fixture-v1", "license": "test-only",
                "attribution": "Synthetic test; not a real song", "excerpt": "four chords",
                "title_source_url": "https://example.com/title",
                "original_chords": ["Cmaj7", "Am7", "F", "G7/B"]}

    def test_reductions_preserve_original_symbols_and_disclose_losses(self):
        song = validate_catalog([self.record()])['songs'][0]
        self.assertEqual(song['chords'], ['C', 'Am', 'F', 'G'])
        self.assertEqual(song['original_chords'], ['Cmaj7', 'Am7', 'F', 'G7/B'])
        self.assertEqual(song['reductions'][1]['pitch_classes'], [0, 4, 9])
        self.assertEqual(len(song['reductions'][-1]['changes']), 2)
        self.assertEqual(song['reductions'][2]['changes'], [])

    def test_ambiguous_and_altered_chords_reject(self):
        for symbol in ('Csus4', 'C5', 'Cdim', 'Caug', 'C7b5', 'Cm7b5', 'C9', 'N', '', None):
            with self.subTest(symbol=symbol), self.assertRaises(ValueError):
                reduce_symbol(symbol)

    def test_no_missing_provenance_duplicate_ids_or_truncation(self):
        for key in ('artist', 'license', 'source_revision', 'title_source_url'):
            record = self.record()
            del record[key]
            with self.assertRaises(ValueError):
                validate_catalog([record])
        with self.assertRaises(ValueError):
            validate_catalog([self.record(), self.record()])
        record = self.record()
        record['original_chords'] = ['C'] * 33
        with self.assertRaises(ValueError):
            validate_catalog([record])
        record = self.record()
        record['original_chords'][2] = 'Csus4'
        with self.assertRaises(ValueError):
            validate_catalog([record])
