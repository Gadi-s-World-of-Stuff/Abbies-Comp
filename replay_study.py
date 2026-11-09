"""Verify a saved Tonnetz study without executing anything from the file."""
import argparse
import json
from pathlib import Path

from analysis import parse_study, study_data
from tonnetz import SAMPLE_SONGS, TonnetzRecommender


def verify(saved):
    if not isinstance(saved, dict) or saved.get("schema") != "tonnetz-lab-study/v1":
        raise ValueError("Unsupported study format; expected tonnetz-lab-study/v1.")
    songs, transpose = parse_study(saved.get("inputs"))
    current = study_data(TonnetzRecommender(SAMPLE_SONGS), songs, transpose)
    # JSON normalizes engine tuples into the same lists as a browser download.
    current = json.loads(json.dumps(current))
    metadata = saved.get("reproducibility")
    if not isinstance(metadata, dict):
        raise ValueError("Study is missing reproducibility metadata.")
    mismatches = [key for key in current if key != "reproducibility"
                  and saved.get(key) != current[key]]
    return {
        "inputs_match": metadata.get("input_sha256") == current["reproducibility"]["input_sha256"],
        "source_matches": metadata.get("source_sha256") == current["reproducibility"]["source_sha256"],
        "results_match": not mismatches,
        "different_fields": mismatches,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("study", type=Path, help="Downloaded study JSON file")
    args = parser.parse_args()
    try:
        if args.study.stat().st_size > 10_000_000:
            raise ValueError("Study file exceeds the 10 MB limit.")
        result = verify(json.loads(args.study.read_text(encoding="utf-8-sig")))
    except (OSError, ValueError, TypeError, KeyError) as error:
        parser.exit(2, f"Cannot verify study: {error}\n")
    print(json.dumps(result, indent=2))
    return 0 if all(result[key] for key in ("inputs_match", "source_matches", "results_match")) else 1


if __name__ == "__main__":
    raise SystemExit(main())
