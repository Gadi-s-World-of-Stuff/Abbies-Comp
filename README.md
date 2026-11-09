# Abbies Comp

A local music app for comparing chord progressions with the Tonnetz P/L/R graph
and dynamic time warping. The explorer uses a glass interface and an interactive
hexagonal chord map with synthesized audio previews.

Requires Python 3. No third-party Python packages are needed.

```powershell
python app.py --explore
```

Open the explorer at http://127.0.0.1:8765/explore. On Windows, you can also
double-click **Open Tonnetz Explorer.cmd**. Keep the server running while using it.

## Tonnetz Lab

For the redesigned single-progression UI, visit http://127.0.0.1:8765/explore
while the server is running, or double-click **Open Tonnetz Explorer.cmd** to
start it. It includes custom chord entry, eight examples, the real 24-triad
P/L/R graph, five ranked harmonic matches, complete alignment details, and
synthesized triad previews. No external fonts, assets, or packages are needed.
The study lab remains at `/`.

Run `python app.py` or `Open Mixtape.cmd`, then visit http://127.0.0.1:8765.
Select 2–5 example progressions or add titled songs with known major/minor chord sequences.
The report shows shared triads, real P/L/R graph paths, directed pairwise DTW costs,
local/cumulative alignment grids and the underlying formulas. The original Python
engine is unchanged; the previous single-progression interface is at `/explore`.
User-added catalog entries are saved only in this browser’s local storage.
The app does not extract chords from audio or connect to a streaming playlist.

Run `python -m unittest discover -s tests -v` to verify the engine and APIs.

---

# Mixtape for Abbie

Double-click **Open Mixtape.cmd** to start the app and open Chrome. Keep the server window open while using it. Python 3 is required; no additional packages are needed.

Pick a sample progression or enter major/minor chords such as `C Am F G`. Listen to synthesized chord previews and explore harmonic matches. The sample database contains eight example progressions, not recorded songs. Similarity describes chord structure, not overall musical taste.

The original engine is preserved in `tonnetz.py`; the original Downloads file is unchanged. The web interface also corrects the display of transposed alignments by showing chords in the target key.

The current visualization follows the supplied Senior Comprehensive Talk PNG: four colored chord networks on a light plotting surface. Larger nodes mark progression chords. Solid edges are P/L/R moves; faint edges connect chords two moves apart. Shape is illustrative, not a distance scale. Click or keyboard-activate a node to hear it. Playback highlights follow the audio clock; reduced-motion preferences are respected.

Expand **See chord connections** on a match to inspect exact aligned chords, distances and P/L/R routes. These are computed by the engine, including multi-step transitions. Similarity is a mathematical score, not a probability of liking a song.

Run `python -m unittest discover -s tests -v` to verify the original engine rankings and the explanation/API behavior. See `UPGRADE_PLAN.md` for staged work and `RESEARCH_REVIEW.md` for the research assessment.


## Save and verify a study

Use **Download study JSON** in a completed report. It includes the selected titles,
chord sequences, key-comparison option, all calculations, limitations, and code/input
fingerprints. Keep the corresponding project source files with academic submissions.

From this project directory run:

```powershell
python replay_study.py "C:/path/to/tonnetz-study-file.json"
```

Exit 0 means inputs, source fingerprints and recomputed report match. Exit 1 means
one or more differ; exit 2 means the file cannot be validated. An export timestamp
is ignored in comparisons. Fingerprints do not prove authorship or authenticity.
Use **Open a saved study** in the sidebar to select an exported JSON file (up to 2 MB).
The local server validates inputs and recalculates the report, showing any differences
in saved results or source fingerprints. Invalid files leave your selection intact.
Imported custom entries remain in the current session; keep the JSON file to reopen them.


Graph keyboard controls: Tab enters/leaves a panel; arrows browse triads; Home/End
jump to endpoints. P, L and R follow the corresponding graph edge. Enter or Space
inspects the current vertex. Each panel remembers its current Tab stop.


The playlist now includes two attributed Chordonomicon verse excerpts alongside
examples. Open Song sources & simplifications for original symbols, reductions,
license and source links. Curated study exports include this provenance and can be
verified by replay_study.py. These excerpts are not full-song/audio analyses.


Use **Download readable report** for an offline HTML companion to the study JSON.
It includes the selected chords, equations, directed comparison scores, complete
alignment routes, source attribution and limitations. Open it in Chrome to read
or print it. Keep the JSON and project sources for independent replay; the HTML
is a presentation of the calculations, not the replay input.

Readable reports also embed each input’s colored triad graph and a text table of
its shortest transition routes. Graph coordinates are illustrative; path costs
count P/L/R edges. No network connection is needed to render these SVG figures.
