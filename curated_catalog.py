"""Local, reviewed excerpts; no network calls during study analysis."""
import json
from pathlib import Path
from catalog_import import validate_catalog


def catalog_songs():
    source = Path(__file__).with_name('data') / 'curated-input.json'
    return validate_catalog(json.loads(source.read_text(encoding='utf-8')))['songs']


def catalog_entry(identifier):
    for entry in catalog_songs():
        if entry['id'] == identifier:
            return entry
    raise ValueError('Unknown curated excerpt. Refresh the catalog and select again.')
