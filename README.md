# Abbies Comp

A local chord explorer with a glass interface, interactive hexagonal Tonnetz map,
ranked harmonic matches, and synthesized chord previews.

## Run

Requires Python 3. No additional packages are needed.

```powershell
python app.py
```

Open http://127.0.0.1:8765. The previous `/explore` address also works.
On Windows, double-click **Open Tonnetz Explorer.cmd** or **Open Mixtape.cmd**.
Keep the server running while using the app.

Enter 1–32 major/minor triads (for example `C Em F G`) or choose an example.
Compare across keys, play the progression, and expand **Details** to inspect
aligned chords and shortest P/L/R routes. The map repeats boundary chords;
uppercase names are major and lowercase names are minor. Every line is a real
P/L/R transformation. Screen spacing is not musical distance.

Examples are chord sequences, not recordings. The score describes harmonic
structure rather than personal taste, lyrics, timbre, rhythm, or production.
The mathematical ranking, transposition selection, and DTW tie order are preserved.
DTW minimizes total cost, then divides by its chosen alignment length.

## Performance

The graph is built once and updated in place. Alignment details render when opened.
Playback wakes at chord boundaries and suspends its audio context when idle.
Repeated comparisons use bounded caches; outdated requests are cancelled.
Static files use conditional HTTP caching and still refresh after edits.
The glass background is stationary to avoid continuous repainting.

## Checks

```powershell
python -m unittest discover -s tests -v
node tests/explorer_request_test.cjs
```

The app has one explorer interface. Historical research notes and attributed
catalog-import tools remain in the repository; the Study UI, exports, and endpoints
have been removed.
