"""A multi-song study built on the original Tonnetz/DTW implementation."""
from itertools import combinations
from statistics import mean
from hashlib import sha256
from pathlib import Path
import json
from curated_catalog import catalog_entry

from tonnetz import Song, dtw_distance, transposition_invariant_distance, transpose_progression
from explanations import graph_data, song_data, progression_routes, route_data


def parse_study(data):
    if not isinstance(data, dict):
        raise ValueError("Send a study containing 2 to 5 songs.")
    entries = data.get("songs")
    if not isinstance(entries, list) or not 2 <= len(entries) <= 5:
        raise ValueError("Select between 2 and 5 songs for a study.")
    transpose = data.get("transpose", True)
    if not isinstance(transpose, bool):
        raise ValueError("The transposition option must be true or false.")
    songs, seen = [], set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Each song needs a title and chord progression.")
        title, progression = entry.get("title"), entry.get("progression")
        provenance = None
        if "catalog_id" in entry:
            provenance = catalog_entry(entry['catalog_id'])
            expected_title = provenance['title'] + ' — ' + provenance['artist']
            expected_progression = ' '.join(provenance['chords'])
            if title != expected_title or progression != expected_progression:
                raise ValueError('Curated excerpt inputs differ from their source record.')
        if not isinstance(title, str) or not title.strip() or len(title) > 100:
            raise ValueError("Each song needs a title of 1 to 100 characters.")
        if not isinstance(progression, str) or len(progression) > 300:
            raise ValueError("Enter each progression as text, up to 300 characters.")
        song = Song.from_text(title.strip(), progression)
        if provenance is not None:
            song.provenance = provenance
        if not 1 <= len(song.chords) <= 32:
            raise ValueError("Each song must contain between 1 and 32 chords.")
        key = (song.title, tuple(song.chords))
        if key in seen:
            raise ValueError("Select each song only once.")
        seen.add(key)
        songs.append(song)
    return songs, transpose


class DistanceTable:
    """Memoize the 24 x 24 graph distances; no scoring changes."""
    def __init__(self, graph):
        self.costs = {(a, b): graph.distance(a, b) for a in graph.nodes for b in graph.nodes}

    def distance(self, a, b):
        return self.costs[a, b]


def study_data(engine, songs, transpose=True):
    graph, table = engine.graph, DistanceTable(engine.graph)
    n = len(songs)
    distances = [[0.0] * n for _ in songs]
    comparisons = []
    for i, a in enumerate(songs):
        for j, b in enumerate(songs):
            if i == j:
                continue
            if transpose:
                distance, shift, path = transposition_invariant_distance(table, a.chords, b.chords)
            else:
                distance, path = dtw_distance(table, a.chords, b.chords)
                shift = 0
            shifted = transpose_progression(b.chords, shift)
            costs = [[table.distance(x, y) for y in shifted] for x in a.chords]
            cumulative = [[0] * len(shifted) for _ in a.chords]
            for row in range(len(a.chords)):
                for col in range(len(shifted)):
                    prior = [cumulative[row-1][col] if row else float('inf'),
                             cumulative[row][col-1] if col else float('inf'),
                             cumulative[row-1][col-1] if row and col else float('inf')]
                    cumulative[row][col] = costs[row][col] + (0 if row == col == 0 else min(prior))
            alignment = [{"i": row, "j": col, **route_data(graph, a.chords[row], shifted[col])}
                         for row, col in path]
            distances[i][j] = distance
            comparisons.append({"reference": i, "candidate": j, "distance": distance,
                                "shift": shift, "reference_chords": [c.name for c in a.chords],
                                "candidate_chords": [c.name for c in shifted],
                                "costs": costs, "cumulative": cumulative,
                                "path": path, "alignment": alignment,
                                "total_cost": sum(costs[row][col] for row, col in path),
                                "path_length": len(path), "similarity": 1 / (1 + distance)})
    # Align each song to the first selected song to create one explicit common frame.
    aligned, shifts = [songs[0]], [0]
    for j, song in enumerate(songs[1:], 1):
        pair = next(p for p in comparisons if p['reference'] == 0 and p['candidate'] == j)
        shifts.append(pair['shift'])
        aligned.append(Song(song.title, transpose_progression(song.chords, pair['shift'])))
    shared = set(aligned[0].chords).intersection(*(set(s.chords) for s in aligned[1:]))
    shared_names = sorted(c.name for c in shared)
    song_reports = []
    for original, normalized, shift in zip(songs, aligned, shifts):
        routes = progression_routes(graph, normalized.chords)
        song_reports.append({**song_data(original), "aligned": song_data(normalized), "shift": shift,
                             "transitions": routes,
                             "movement": sum(r['distance'] for r in routes),
                             "mean_movement": mean([r['distance'] for r in routes]) if routes else 0,
                             "pitch_classes": sorted(set().union(*(c.pcs for c in normalized.chords))),
                             "minor_fraction": sum(c.quality == 'minor' for c in original.chords) / len(original.chords)})
        if hasattr(original, 'provenance'):
            song_reports[-1]['provenance'] = original.provenance
    exact_pairs = sum(distances[i][j] == 0 and distances[j][i] == 0 for i, j in combinations(range(n), 2))
    closest = min(comparisons, key=lambda p: p['distance'])
    inputs = {"songs": [{"title": s.title, "progression": " ".join(c.name for c in s.chords)}
                        for s in songs], "transpose": transpose}
    for song, entry in zip(songs, inputs['songs']):
        if hasattr(song, 'provenance'):
            entry['catalog_id'] = song.provenance['id']
    source_files = ("tonnetz.py", "explanations.py", "analysis.py")
    source_hashes = {name: sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                     for name in source_files}
    if any(hasattr(s, 'provenance') for s in songs):
        for name in ('curated_catalog.py', 'catalog_import.py', 'data/curated-input.json'):
            source_hashes[name] = sha256((Path(__file__).parent / name).read_bytes()).hexdigest()
    canonical_inputs = json.dumps(inputs, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return {"schema": "tonnetz-lab-study/v1", "inputs": inputs,
            "reproducibility": {"input_sha256": sha256(canonical_inputs.encode()).hexdigest(),
                                "source_sha256": source_hashes,
                                "method": "Minimum-total-cost P/L/R DTW, normalized by selected path length",
                                "replay": "POST the inputs object to /api/analyze; compare source hashes before comparing results."},
            "songs": song_reports, "graph": graph_data(graph), "distances": distances,
            "comparisons": comparisons, "transpose": transpose,
            "summary": {"mean_distance": mean(p['distance'] for p in comparisons),
                        "shared_chords": shared_names, "exact_pairs": exact_pairs,
                        "pair_count": n * (n - 1) // 2,
                        "closest": [closest['reference'], closest['candidate']],
                        "anchor": songs[0].title},
            "limitations": [
                "This describes shared harmonic structure among the songs you selected. It does not establish why you like them.",
                "The model uses major/minor triads and chord order. Melody, rhythm, lyrics, timbre, and context are not modeled.",
                "DTW minimizes total path cost, then normalizes by that path's length. Tied paths can yield direction-dependent scores; this is not asserted to be a metric on songs.",
                "A zero cost can also arise from repeated chords stretched by DTW. It does not prove the original songs are identical.",
                "Network positions are fixed illustrative coordinates. Edge counts, not Euclidean distances or cluster shapes, define graph distance.",
                "Transition routes are one shortest P/L/R route; shortest routes need not be unique."]}
