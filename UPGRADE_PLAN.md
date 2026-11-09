# Mixtape staged upgrades

## Checked stage — obsolete analysis failures (12 October 2026)

- Extended analysis revision checks to catch/finally. An old failed request can no
  longer replace a newer status or enable Analyze while a newer analysis is pending.
- Added tests/analysis_request_test.cjs using the actual shipped handler and controlled
  promises: old failure during newer request, failure after selection revision, and
  current failure/recovery all pass. Run with node tests/analysis_request_test.cjs.
- All 31 Python tests pass. Browser fresh load completed the two curated excerpts
  through the live API with unchanged scores. Delayed failures tested in the isolated
  handler harness, not through browser network emulation.
- Next: apply equivalent ownership checks to overlapping saved-study imports; the
  old import catch/finally can still affect a newer import's message/file input.
  Catalog and print limitations from previous stages remain.

## Checked stage — preserve catalog keyboard focus (12 October 2026)

- Reproduced Space selection dropping focus to BODY because renderCatalog replaced
  the activated checkbox. Selection changes now update disabled states in place;
  catalog rebuilds remain reserved for actual catalog/import changes.
- Browser verified Space keeps focus, Tab advances to the next song, five selections
  disable the other five entries, and deselection re-enables all entries.
- Keyboard Analyze completed five songs / 20 directed comparisons through the live
  API. Subsequent deselection hid the old report and preserved checkbox focus.
  Screenshot: catalog-focus-check.jpg. All 31 tests and JS syntax check pass.
- Next: inspect delayed-request error handling against the existing revision guard;
  do not repeat completed catalog-focus work. Print pagination remains unverified;
  real-song catalog is still two attributed verse excerpts.

## Checked stage — offline report navigation (12 October 2026)

- Added a section table of contents, expandable per-input/directed-pair index,
  unique fragment targets, keyboard focus styles and Back to top. Native HTML
  navigation works offline without JavaScript; headings receive focus on arrival.
- All 31 tests pass. Live API five-song export has 32 valid fragment links,
  including every one of the 20 directed comparisons, with no duplicate IDs.
- Browser Enter activation reached Model and equations and the final comparison
  (5 → 4), moving focus to each heading at 16px from the viewport top. Back to top
  restored heading focus. Evidence: report-navigation-check.jpg.
- Next: review the main app's end-to-end 2–5-song keyboard workflow and stale-result
  handling, fixing only demonstrated issues. Offline export stages are complete;
  print pagination remains unverified and catalog breadth is still two excerpts.

## Checked stage — narrow report overflow fix (12 October 2026)

- Tested five-song HTML report at 375px with maximum-length unbroken titles.
  Found document overflow to 1442px caused by headings. Added heading wrapping.
- Rechecked: document scroll width 360px within the 375px viewport, all five SVG
  graphs retained. Saved report-narrow-check.jpg and restored browser viewport.
- All 31 engine/API/report tests pass. Restarted local app and verified live
  /api/report contains corrected CSS. No scoring or study format changes.
- Print pagination has not been verified; supported browser controls used here
  provide viewport testing but no print-media emulation/PDF output method.
  Next: improve mathematical navigation in longer reports (section links and
  per-input/pair anchors), then revisit print verification when supported.

## Checked stage — graphs in offline reports (12 October 2026)

- Embedded one self-contained SVG triad network per selected input in HTML exports.
  Uses the lab's fixed layout, all 24 vertices and 36 actual P/L/R edges; larger
  outlined nodes identify common-frame progression triads and thick edges show
  their shortest transition routes. Color is supplemented by size/line weight.
- Accessible graph titles/descriptions, illustrative-layout captions and complete
  transition tables retain the route operations and costs as selectable text.
- 31 tests pass, including SVG topology, selected-node counts and existing engine/API
  regressions. Live /api/report returned both curated graphs; browser verified
  graph labels, transition tables and the light plotting layout. Print pagination
  remains unchecked. Original scoring and JSON replay semantics are unchanged.
- Next useful stage: focused narrow-screen and print-layout verification of the
  reports, fixing concrete overflow/pagination problems if found. Catalog expansion
  still requires verified source excerpts and identity evidence.

## Checked stage — readable study report (12 October 2026)

- Added Download readable report alongside JSON export. The local /api/report
  endpoint recomputes the selected inputs and renders a self-contained HTML file
  with equations, directed pairwise scores and every alignment's routes and costs.
- Includes original/reduced chord symbols, curated attribution/license, excerpt
  scope, limitations and input/source fingerprints. Escapes user-supplied text.
  The report can be read offline or printed; JSON remains the replay artifact.
- All 30 Python tests pass, including escaped titles and provenance retention;
  lab.js syntax checked. Live HTTP report generation succeeded. Browser rendered
  the two curated excerpts' report and verified its scores, source notes and layout.
  Screenshot: readable-report-preview.jpg. Print pagination and a newly downloaded
  file were not independently verified; this is an HTML export, not a generated PDF.
- Next bounded stage: add the actual colored triad networks to the readable report
  with consistent graph labels and accessible text; preserve the current calculations.
  The catalog still contains two attributed verse excerpts, not full-song analyses.

## Checked stage — browser study import (12 October 2026)

- Added Open a saved study, accepting exported JSON up to 2 MB. The local import API
  validates the schema and inputs, compares fingerprints/results, and recalculates
  the report. Imported scores are never trusted as live calculations.
- Restores 2–5 selected entries and the transposition option. Invalid files leave the
  existing selection/report intact; curated IDs still require matching source inputs.
  Imported custom entries are session-only and do not silently alter saved catalog data.
- A revision guard prevents old analysis/import responses replacing newer selections;
  starting a new analysis also invalidates an in-flight import.
- 28 tests pass, including HTTP invalid-format rejection and correction of a deliberately
  altered saved score. Browser file chooser successfully reopened the actual 7 October
  downloaded three-song study and reported only the expected code-version difference.
  Existing input and result values matched. JavaScript syntax checked.
- Next bounded stage: presentation-friendly report export (selected inputs, equations,
  pairwise scores, chosen alignment, provenance and limitations). Do not repeat import.

## Checked stage — live curated catalog (12 October 2026)

- Added /api/catalog with two reviewed verse excerpts. Lab lists these before labeled
  examples and initially selects the two excerpts. Original recommender is unchanged.
- Source disclosures show section scope, original symbols, analyzed triads, explicit
  notation/bass reductions, citation, license, pinned revision and source links.
- Catalog IDs are resolved on the server and reject mismatched title/chord inputs.
  Studies retain full provenance and replay IDs; catalog/code fingerprints join the
  export for curated studies. Replaying provenance edits reports differences.
- 27 tests pass; JS syntax passes. Live HTTP catalog and study/replay verified.
  Browser confirmed the two-song report and expanded source disclosure, including
  A/Cs normalization and omitted bass. Screenshot capture unavailable in this run.
- Next: browser study import and presentation-friendly report export. Expand the
  catalog only with similarly verified source/identity evidence; current collection
  is two verses, not a full-song or streaming playlist integration.

## Checked stage — two attributed real-song excerpts (12 October 2026)

- Retrieved rows 2 and 3 directly from Chordonomicon CSV pinned at revision
  f3a8b678bd65639c01caa342921733f1db01be23; saved source rows and identity evidence.
- Spotify track/artist oEmbed resolved I Want To Die A Beautiful Death / Everclear,
  and Sad Exchange / Finger Eleven. This verifies the linked identities, not the
  accuracy of the dataset's track-to-chords matching (no audio validation performed).
- Extracted complete verse_1 sections (13 and 8 events), retaining all repetitions.
  Source symbols remain intact. Explicit chordonomicon notation converts s to # and
  min to m; slash bass loss is recorded. Unsupported no3d still rejects.
- `data/curated-input.json` compiles to `data/curated-catalog.json`; attribution,
  CC-BY-NC-4.0, revision, source IDs, title links and excerpt description included.
- 25 tests pass, including exact source-section extraction and notation validation.
  No browser changes this stage. These two prepared records are not yet in the UI.
- NEXT: expose the curated catalog separately from examples, show attribution and
  reduction details, carry catalog provenance into study exports and replay checks.
  Do not re-fetch or re-identify these completed entries without a concrete need.

## Checked stage — catalog preparation (12 October 2026)

- Researched the authors' Chordonomicon dataset card/table: attribution and
  noncommercial license are stated; song-title/artist-name resolution remains separate.
- Added `catalog_import.py` for curated JSON excerpts with required source URLs,
  revision, record ID, license, attribution, title source and excerpt description.
  Preserves original symbols and records seventh/slash-bass omission explicitly.
  Rejects ambiguous/altered chords and any invalid record; never silently truncates,
  drops unsupported chords or overwrites an existing output.
- 23 tests pass, including reduction pitch sets, disclosure of lost information,
  ambiguous symbol rejection, provenance validation and duplicate/length limits.
  CLI help checked. No browser behavior changed, so browser regression was not needed.
- `CATALOG_SOURCES.md` documents source findings, contract and remaining integration.
  No real-song data has been added to the live playlist yet. Next: obtain a small
  pinned source subset, verify song names, and carry provenance into UI and exports.

## Checked stage — graph keyboard navigation (12 October 2026)

- Each graph now has one Tab stop instead of 24. Arrow keys browse chromatic
  root/quality order, Home/End jump to endpoints, and P/L/R follow actual engine
  edges. Enter/Space inspects, mouse selection updates the Tab stop, and Tab exits.
- Added visible keyboard instructions associated with every vertex and stronger
  keyboard focus styling. No changes to the engine, graph coordinates or scoring.
- Browser verified C→Em→C using L twice, C→Cm with P, C→Am with R,
  End→Bm then ArrowRight→C, one Tab stop per panel, and Tab reaching the next graph.
  Screenshot capture failed after successful interaction checks; no new preview saved.
- All 20 Python tests pass and lab.js syntax passes. This is a focused keyboard
  improvement, not a comprehensive screen-reader accessibility audit.
- Next priority remains attributed real-song data/reductions, then browser study
  import/presentation export; avoid repeating this completed keyboard stage.

## Checked stage — reproducible study export (12 October 2026)

- Reports include a versioned schema, exact replay inputs, SHA-256 input/source
  fingerprints, full graph/DTW calculations and limitations. Browser JSON export
  retains these plus an export timestamp; changed unanalyzed selections cannot export.
- Added `replay_study.py`: recomputes a saved study, reports input, source and result
  matches separately, exits nonzero for mismatches or invalid formats. No file content
  is executed. Fingerprints identify code, not authorship or authenticity.
- Verified 20 tests, including unchanged scoring, JSON round trip in both key modes,
  and detection of edited inputs, calculations and source fingerprints.
- Browser export click confirmed its requested-download status. The download event
  listener had previously timed out, but the actual 7 October downloaded file
  `Downloads/tonnetz-study-20f872d2bd87.json` exists and successfully replays with
  all three checks true. A newly saved download on 12 October was not independently
  located. Screenshot: `study-export-preview.jpg`.
- Next: real-song catalog provenance/reductions, then browser study import and
  presentation-friendly export. Do not repeat the completed replay work.

## Current direction — senior mathematics / computer science project

The user's latest request supersedes the gift/music-player emphasis below. The main
workflow is now Tonnetz Lab: choose 2–5 liked songs and examine their shared harmonic
structure through triad graphs, P/L/R transformations, transposition and DTW.
Do not claim that harmonic similarity proves why somebody likes a song.

Implemented: `lab.html`, `lab.css`, `lab.js`, and `analysis.py`; `/api/analyze`
uses the original engine unchanged. Includes directed comparison matrix, shared
triads in an explicit anchor frame, inspectable 24-node/36-edge graphs, local and
cumulative DTW grids, step-by-step routes, formulas and limitations. The former
single-progression app remains available at `/explore`. Users may add named songs
with known chord sequences; these are stored in the local browser. Eight default
entries remain clearly labeled examples, not an attributed real-song dataset.

Validation: 16 engine/explanation/study/HTTP tests pass; JavaScript syntax checked.
Browser verified initial three-song report, P/L/R pitch-class inspection, advancing
DTW steps, disabling analysis below two selections and recalculating a two-song set.

Next priorities: (1) attributed real-song catalog with explicit original symbols and
validated triad reductions; (2) study save/export and reproducible presentation
examples; (3) academic visual/keyboard polish. Audio is optional secondary context.
Preserve mathematical transparency, current selection workflow and original engine
semantics. Earlier stage descriptions below are background, not the current priority.

The user authorized implementing the research recommendations in checked stages
and asked for `/loop` on 7 October 2026. Use the latest visual reference: Senior Comprehensive Talk 1-4.png, with four colored node-and-edge networks on a light plotting surface. The orb has been superseded.

## Stage 1 - Protect and explain (complete)

- Added 10 standard-library tests covering all eight original rankings, transformations,
  transposition invariance, shortest routes, explanations and HTTP validation.
- Added `explanations.py`, enriching responses without modifying `tonnetz.py` scoring.
- Show actual aligned chords, per-pair move counts, operation routes and full
  progression transitions in the match details.
- Added the Mixtape engine skill and review of the research's qualifications.
- Verification: `python -m unittest discover -s tests -v` passed all 10 tests.
  Browser verified Song B's 3/5 identical aligned pairs, two single L moves and
  complete multi-step progression routes after transposition.

## Stage 2 - Sound and playback

Sampled piano with pinned dependency and asset attribution; smooth voice leading;
volume, clear loading/failure states, robust stop; audio-clock chord highlights and
audio-driven emphasis for the chord networks. Preserve a usable audio fallback.
Check rapid play/stop/switch, volume, loaded samples and absence of console errors.

## Stage 3 - See the harmony

Add an accessible SVG Tonnetz/explanation view using the engine's actual routes.
Distinguish a 24-chord graph from the pitch-class triangle lattice; label correctly.
Highlight both trajectories on the audio clock; keyboard and reduced-motion checks.

## Stage 4 - Real songs

Create a reproducible, attributed small Chordonomicon importer/catalog with validated
IDs and explicit chord reduction rules. Preserve original chord symbols. Benchmark
against exhaustive matching before introducing any prefilter. Use official embeds
with realistic playback expectations. Do not claim samples are Abbie's favorites.

## Stage 5 - A mixtape to keep

Local Side A/B saving, editable authored notes, validated tracklist URL sharing.
Ask for her favorite songs only when needed to personalize; do not invent them.
Use device-local storage with honest limits. Check round-trip sharing and bad input.

## Stage 6 - Sharing and final checks

Measure Pyodide-in-worker startup, ranking equivalence and throughput; compare with
the existing server before choosing. Prepare a working shareable build, accessible
controls, relevant browser tests and asset notices. Publishing remains a separate
external step unless explicitly authorized. Report device checks not actually run.

## Continuation rules

Each loop run reads this file and RESEARCH_REVIEW.md, completes the next bounded
stage (or useful verified portion), records changes/checks/blockers here, and leaves
the working app available. Preserve the Python ranking semantics and the latest node-and-edge network design.
No speculative services, subscriptions, guessed credentials or unrelated tooling installs.
When all stages are done, stop/pause the recurring loop and report completion. If only
missing user data or external access remains, ask once and pause the recurrence.

## Run log

- 7 October 2026: research reviewed; Stage 1 implementation and 10 tests passed.
- Browser checked the rendered non-identical match explanations. Existing shader
  styling and recommendation results remain available in the running app.
- Active thread heartbeat: `mixtape-staged-upgrades`, every 10 minutes. Next task:
  Stage 2 (audio and playback). Pause it when all stages are complete or work needs
  user information/external access. Do not create another matching loop.

## Visual correction (7 October 2026)

Replaced the decorative orb with four actual 24-triad networks, laid out to echo the supplied senior-talk PNG. The panels show the input and top three matches in the input key. Solid edges are true P/L/R adjacencies; faint edges are two-hop relationships. Layout geometry is illustrative. Chord nodes can be heard with mouse/keyboard; audio-clock highlights mark playback. This advances Stage 3; broader paired-path visualization and audio upgrades remain.

Verification: all 11 Python tests passed, including exact graph topology. Browser
render confirmed the four colored networks; clicking Eb reported `Now playing Eb`
and highlighted Eb across the networks. Narrow screens stack the clusters vertically.
The heartbeat and engine skill now use this PNG as the current visual direction.
