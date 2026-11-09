"""Validate attributed, curated song excerpts before adding them to Tonnetz Lab."""
import argparse
import json
from pathlib import Path
import re
from urllib.parse import urlparse

from tonnetz import parse_chord

SYMBOL = re.compile(r"([A-G](?:#|b)?)(maj7|m7|7|maj|min|m)?(?:/([A-G](?:#|b)?))?\Z")


def reduce_symbol(symbol, notation="standard"):
    """Conservative vocabulary; reject rather than guess unsupported harmony."""
    if not isinstance(symbol, str):
        raise ValueError("Chord symbols must be strings.")
    original = symbol
    notation_changes = []
    if notation == "chordonomicon":
        symbol = re.sub(r"(^|/)([A-G])s", r"\1\2#", symbol)
        symbol = re.sub(r"min(?=7?(?:/|$))", "m", symbol)
        if symbol != original:
            notation_changes.append(f"source notation normalized to {symbol} (s = sharp, min = minor)")
    elif notation != "standard":
        raise ValueError("Unknown chord notation.")
    match = SYMBOL.fullmatch(symbol)
    if not match:
        raise ValueError(f"Unsupported chord {symbol!r}; supply a reviewed major/minor triad excerpt.")
    root, quality, bass = match.groups()
    minor = quality in ("m", "min", "m7")
    chord = parse_chord(root + ("m" if minor else ""))
    changes = notation_changes
    if quality in ("7", "maj7", "m7"):
        changes.append("seventh omitted; underlying triad retained")
    if bass:
        parse_chord(bass)
        changes.append(f"slash bass {bass} omitted; voicing/bass is not modeled")
    return {"original": original, "triad": chord.name,
            "changes": changes, "pitch_classes": sorted(chord.pcs)}


def validate_catalog(records):
    if not isinstance(records, list) or not 1 <= len(records) <= 100:
        raise ValueError("Provide a list of 1–100 curated excerpts.")
    result, seen = [], set()
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("Each excerpt must be an object.")
        required = ("id", "title", "artist", "source_url", "source_record_id",
                    "source_revision", "license", "attribution", "excerpt", "title_source_url")
        for key in required:
            value = record.get(key)
            if not isinstance(value, str) or not value.strip() or len(value) > 1000:
                raise ValueError(f"Missing or invalid {key}.")
        for key in ("source_url", "title_source_url"):
            url = urlparse(record[key])
            if url.scheme not in ("http", "https") or not url.netloc:
                raise ValueError(f"{key} must be an HTTP(S) source URL.")
        if record['id'] in seen:
            raise ValueError(f"Duplicate catalog id: {record['id']}")
        seen.add(record['id'])
        symbols = record.get('original_chords')
        if not isinstance(symbols, list) or not 1 <= len(symbols) <= 32:
            raise ValueError("Each excerpt must contain 1–32 original chords; no automatic truncation.")
        notation = record.get('notation', 'standard')
        reductions = [reduce_symbol(symbol, notation) for symbol in symbols]
        result.append({**{key: record[key] for key in required},
                       "notation": notation, "original_chords": symbols, "chords": [r['triad'] for r in reductions],
                       "reductions": reductions})
    return {"schema": "tonnetz-curated-catalog/v1", "songs": result,
            "policy": "Excerpts only. Seventh tones and slash bass may be omitted explicitly. Unsupported symbols reject the whole import. Attribution is recorded, not independently verified by this tool."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    try:
        if args.source.stat().st_size > 1_000_000:
            raise ValueError('Input exceeds 1 MB.')
        catalog = validate_catalog(json.loads(args.source.read_text(encoding='utf-8-sig')))
        # Never overwrite an existing curated artifact.
        with args.output.open('x', encoding='utf-8') as output:
            json.dump(catalog, output, ensure_ascii=False, indent=2)
            output.write('\n')
    except (OSError, ValueError) as error:
        parser.exit(2, f'Catalog not imported: {error}\n')
    print(f"Validated {len(catalog['songs'])} excerpts. Review attribution before UI integration.")


if __name__ == '__main__':
    main()
