"""Explain the engine's chosen paths without changing its scoring."""
from tonnetz import Song, transpose_progression

OPERATION_NAMES = {"P": "parallel", "L": "leading-tone exchange", "R": "relative"}


def route_data(graph, start, goal):
    path = graph.shortest_path(start, goal)
    return {"from": start.name, "to": goal.name, "distance": len(path) - 1,
            "chords": [chord.name for chord, _ in path],
            "operations": [op for _, op in path[1:]]}


def progression_routes(graph, chords):
    return [route_data(graph, a, b) for a, b in zip(chords, chords[1:])]


def song_data(song):
    return {"title": song.title, "chords": [c.name for c in song.chords],
            "notes": [sorted(c.pcs) for c in song.chords]}


def graph_data(graph):
    """One vertex per triad; each undirected P/L/R edge appears once."""
    indices = {chord: index for index, chord in enumerate(graph.nodes)}
    return {
        "nodes": [{"id": indices[chord], "name": chord.name,
                   "quality": chord.quality, "notes": sorted(chord.pcs)} for chord in graph.nodes],
        "edges": [{"source": indices[chord], "target": indices[neighbor],
                   "operation": operation}
                  for chord in graph.nodes
                  for neighbor, operation in graph.adjacency[chord].items()
                  if indices[chord] < indices[neighbor]],
    }


def recommendation_data(engine, target, transpose=True):
    results = []
    for result in engine.recommend(target, top_k=8, transpose_invariant=transpose):
        song = result["song"]
        aligned = Song(song.title, transpose_progression(song.chords, result["shift"]))
        pairs = [{"target_index": i, "candidate_index": j,
                  **route_data(engine.graph, target.chords[i], aligned.chords[j])}
                 for i, j in result["path"]]
        zero = sum(pair["distance"] == 0 for pair in pairs)
        explanation = ("Every aligned chord matches in your key." if zero == len(pairs)
                       else f"{zero} of {len(pairs)} aligned chord pairs match exactly; "
                            "the remaining pairs are connected by P/L/R moves.")
        results.append({**song_data(song), "similarity": result["similarity"],
                        "distance": result["distance"], "shift": result["shift"],
                        "aligned": song_data(aligned), "path": result["path"],
                        "alignment": pairs, "explanation": explanation,
                        "transitions": progression_routes(engine.graph, aligned.chords)})
    return {"target": {**song_data(target),
                       "transitions": progression_routes(engine.graph, target.chords)},
            "results": results, "graph": graph_data(engine.graph),
            "operation_names": OPERATION_NAMES,
            "scoring": "Average P/L/R cost along the minimum-total-cost DTW alignment; "
                       "similarity = 1 / (1 + distance). This is not a probability."}
